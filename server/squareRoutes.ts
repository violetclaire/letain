import { Express, Request, Response } from "express";
import { getSquare, getMerchantSquare, getSquareApplicationId, getSquareApplicationSecret, isSquareConfigured, isSquareOAuthConfigured } from "./squareClient";
import { storage } from "./storage";
import { getAuthUserId } from "./routes";
import crypto from "crypto";

async function getMerchantAccessToken(userId: string): Promise<string | null> {
  const user = await storage.getUser(userId);
  if (!user) return null;
  
  if (user.role === 'artist') {
    const profile = await storage.getArtistProfile(userId);
    return profile?.squareAccessToken || null;
  } else if (user.role === 'planner') {
    return (user as any).squareAccessToken || null;
  }
  return null;
}

const PLATFORM_FEE_PERCENT = 1.5;
// Always use production Square URLs since we're using production credentials
const SQUARE_OAUTH_BASE = 'https://connect.squareup.com';

const oauthStates = new Map<string, { userId: string; expires: number }>();

function cleanupExpiredStates() {
  const now = Date.now();
  const entries = Array.from(oauthStates.entries());
  for (const [state, data] of entries) {
    if (data.expires < now) {
      oauthStates.delete(state);
    }
  }
}

setInterval(cleanupExpiredStates, 60000);

export function registerSquareRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/square/config", async (req, res) => {
    try {
      if (!isSquareConfigured()) {
        return res.json({ configured: false });
      }
      const applicationId = getSquareApplicationId();
      res.json({ 
        configured: true, 
        applicationId,
        environment: 'production'
      });
    } catch (error: any) {
      console.error("Error getting Square config:", error);
      res.status(500).json({ error: "Square not configured" });
    }
  });

  app.get("/api/square/connect/authorize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can connect Square" });
      }

      const applicationId = getSquareApplicationId();
      const baseUrl = `https://${req.get('host')}`;
      const state = crypto.randomBytes(32).toString('hex');
      
      oauthStates.set(state, {
        userId,
        expires: Date.now() + 10 * 60 * 1000
      });
      
      const scope = [
        'MERCHANT_PROFILE_READ',
        'PAYMENTS_READ',
        'PAYMENTS_WRITE',
        'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS',
        'INVOICES_READ',
        'INVOICES_WRITE',
        'ORDERS_READ',
        'ORDERS_WRITE',
      ].join('+');

      const redirectUri = encodeURIComponent(`${baseUrl}/api/square/connect/callback`);
      const authUrl = `${SQUARE_OAUTH_BASE}/oauth2/authorize?` +
        `client_id=${applicationId}&` +
        `scope=${scope}&` +
        `session=false&` +
        `state=${state}&` +
        `redirect_uri=${redirectUri}`;

      res.json({ url: authUrl, state });
    } catch (error: any) {
      console.error("Square OAuth error:", error);
      res.status(500).json({ error: error.message || "Failed to create authorization URL" });
    }
  });

  app.get("/api/square/connect/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error: oauthError } = req.query;
      const baseUrl = `https://${req.get('host')}`;
      
      console.log(`[Square OAuth] Callback received - code: ${code ? 'YES' : 'NO'}, state: ${state ? 'YES' : 'NO'}, error: ${oauthError || 'none'}`);
      
      if (oauthError) {
        console.log(`[Square OAuth] Error from Square: ${oauthError}`);
        return res.redirect(`/artist?square=error&message=${encodeURIComponent(String(oauthError))}`);
      }
      
      if (!code) {
        console.log('[Square OAuth] No authorization code received');
        return res.redirect(`/artist?square=error&message=No authorization code received`);
      }

      if (!state || typeof state !== 'string') {
        console.log('[Square OAuth] Invalid state parameter');
        return res.redirect(`/artist?square=error&message=Invalid state parameter`);
      }

      console.log(`[Square OAuth] Looking up state. Active states: ${oauthStates.size}`);
      const stateData = oauthStates.get(state);
      if (!stateData) {
        console.log('[Square OAuth] State not found in memory - may have expired or app restarted');
        return res.redirect(`/artist?square=error&message=Session expired - please try connecting again`);
      }

      if (stateData.expires < Date.now()) {
        oauthStates.delete(state);
        return res.redirect(`/artist?square=error&message=Authorization expired, please try again`);
      }

      oauthStates.delete(state);
      const userId = stateData.userId;

      const square = getSquare();
      const applicationId = getSquareApplicationId();
      
      let applicationSecret: string;
      try {
        applicationSecret = getSquareApplicationSecret();
      } catch (e) {
        console.error("Square OAuth: Missing SQUARE_APPLICATION_SECRET");
        return res.redirect(`/artist?square=error&message=Server configuration error - contact support`);
      }

      const response = await square.oAuth.obtainToken({
        clientId: applicationId,
        clientSecret: applicationSecret,
        code: String(code),
        grantType: 'authorization_code',
        redirectUri: `${baseUrl}/api/square/connect/callback`,
      });

      const tokenResponse = response as any;
      console.log(`[Square OAuth] Token response received:`, JSON.stringify({
        hasAccessToken: !!tokenResponse.accessToken,
        hasMerchantId: !!tokenResponse.merchantId,
        hasRefreshToken: !!tokenResponse.refreshToken,
        expiresAt: tokenResponse.expiresAt,
      }));
      
      if (!tokenResponse.accessToken || !tokenResponse.merchantId) {
        console.error("Square OAuth: Failed to obtain tokens", tokenResponse);
        return res.redirect(`/artist?square=error&message=Failed to obtain access token`);
      }

      const { accessToken, refreshToken, expiresAt, merchantId } = tokenResponse;
      const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`[Square OAuth] User ${userId} not found`);
        return res.redirect(`/artist?square=error&message=User not found`);
      }

      console.log(`[Square OAuth] Saving tokens for user ${userId} (role: ${user.role}), merchant: ${merchantId}`);

      if (user.role === 'artist') {
        const result = await storage.updateArtistProfile(userId, {
          squareMerchantId: merchantId,
          squareAccessToken: accessToken,
          squareRefreshToken: refreshToken || null,
          squareTokenExpiresAt: expiresAtDate,
        });
        console.log(`[Square OAuth] Artist profile update result:`, result ? 'SUCCESS' : 'FAILED');
      } else if (user.role === 'planner') {
        const result = await storage.updateUser(userId, {
          squareMerchantId: merchantId,
          squareAccessToken: accessToken,
          squareRefreshToken: refreshToken || null,
          squareTokenExpiresAt: expiresAtDate,
        } as any);
        console.log(`[Square OAuth] Planner update result:`, result ? 'SUCCESS' : 'FAILED');
      }

      console.log(`[Square OAuth] OAuth complete for user ${userId}, merchant ${merchantId}`);
      
      const redirectPath = user.role === 'artist' ? '/artist' : '/planner';
      res.redirect(`${redirectPath}?square=success&merchantId=${merchantId}`);
    } catch (error: any) {
      console.error("Square OAuth callback error:", error);
      res.redirect(`/artist?square=error&message=${encodeURIComponent(error.message || 'OAuth failed')}`);
    }
  });

  app.get("/api/square/connect/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      let merchantId: string | null = null;
      let hasValidToken = false;
      
      if (user?.role === 'artist') {
        const profile = await storage.getArtistProfile(userId);
        merchantId = profile?.squareMerchantId || null;
        hasValidToken = !!(profile?.squareAccessToken);
      } else if (user?.role === 'planner') {
        merchantId = (user as any).squareMerchantId || null;
        hasValidToken = !!((user as any).squareAccessToken);
      }
      
      if (!merchantId || !hasValidToken) {
        return res.json({ 
          connected: false,
          paymentsEnabled: false,
        });
      }

      res.json({
        connected: true,
        paymentsEnabled: true,
        merchantId,
      });
    } catch (error: any) {
      console.error("Square status error:", error);
      res.status(500).json({ error: error.message || "Failed to get Square status" });
    }
  });

  app.post("/api/square/create-payment-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can create payment links" });
      }

      const { bookingId, amount, description, clientName, clientEmail } = req.body;

      const amountInCents = typeof amount === 'number' && amount < 100 
        ? Math.round(amount * 100) 
        : Math.round(amount);

      if (!amountInCents || amountInCents < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!locationId) {
        return res.status(500).json({ error: "Square location not configured. Please add SQUARE_LOCATION_ID to secrets." });
      }

      const merchantToken = await getMerchantAccessToken(userId);
      if (!merchantToken) {
        return res.status(400).json({ error: "Please connect your Square account first" });
      }

      const square = getMerchantSquare(merchantToken);
      const baseUrl = `https://${req.get('host')}`;
      
      const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));
      const idempotencyKey = crypto.randomUUID();

      const metadata: Record<string, string> = {
        vendorId: userId,
        platformFee: platformFee.toString(),
      };
      if (bookingId) metadata.bookingId = bookingId;
      if (clientEmail) metadata.clientEmail = clientEmail;

      const orderResponse = await square.orders.create({
        order: {
          locationId,
          lineItems: [{
            name: description || 'Beauty Services',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(amountInCents),
              currency: 'USD',
            },
            note: clientName ? `Payment for ${clientName}` : undefined,
          }],
          metadata,
        },
        idempotencyKey,
      });

      const orderResult = orderResponse as any;
      if (!orderResult.order?.id) {
        throw new Error('Failed to create Square order');
      }

      const orderId = orderResult.order.id;

      const checkoutResponse = await (square.checkout as any).paymentLinks.create({
        idempotencyKey: crypto.randomUUID(),
        quickPay: {
          name: description || 'Beauty Services',
          priceMoney: {
            amount: BigInt(amountInCents),
            currency: 'USD',
          },
          locationId,
        },
        checkoutOptions: {
          redirectUrl: `${baseUrl}/payment-success?bookingId=${bookingId || 'invoice'}`,
          askForShippingAddress: false,
          appFeeMoney: {
            amount: BigInt(platformFee),
            currency: 'USD',
          },
        },
      });

      const checkoutResult = checkoutResponse as any;
      if (!checkoutResult.paymentLink?.url) {
        throw new Error('Failed to create Square payment link');
      }

      const paymentLinkUrl = checkoutResult.paymentLink.url;
      const paymentLinkId = checkoutResult.paymentLink.id;

      if (bookingId) {
        await storage.updateBooking(bookingId, {
          squarePaymentLinkUrl: paymentLinkUrl,
          squareOrderId: orderId,
        });
      }

      res.json({
        paymentLink: paymentLinkUrl,
        paymentLinkId,
        orderId,
        amount: amountInCents,
        platformFee,
      });
    } catch (error: any) {
      console.error("Square payment link error:", error);
      res.status(500).json({ error: error.message || "Failed to create payment link" });
    }
  });

  app.post("/api/square/create-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { bookingId, amount, description, clientEmail, clientName, dueDate } = req.body;

      const amountInCents = typeof amount === 'number' && amount < 100 
        ? Math.round(amount * 100) 
        : Math.round(amount);

      if (!amountInCents || amountInCents < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      if (!clientEmail) {
        return res.status(400).json({ error: "Client email is required for invoices" });
      }

      const locationId = process.env.SQUARE_LOCATION_ID;
      if (!locationId) {
        return res.status(500).json({ error: "Square location not configured. Please add SQUARE_LOCATION_ID to secrets." });
      }

      const merchantToken = await getMerchantAccessToken(userId);
      if (!merchantToken) {
        return res.status(400).json({ error: "Please connect your Square account first" });
      }

      const square = getMerchantSquare(merchantToken);
      const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));

      const orderResponse = await square.orders.create({
        order: {
          locationId,
          lineItems: [{
            name: description || 'Beauty Services',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(amountInCents),
              currency: 'USD',
            },
          }],
          metadata: {
            bookingId: bookingId || '',
            vendorId: userId,
            platformFee: platformFee.toString(),
          },
        },
        idempotencyKey: crypto.randomUUID(),
      });

      const orderResult = orderResponse as any;
      if (!orderResult.order?.id) {
        throw new Error('Failed to create order');
      }

      const dueDateValue = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invoiceResponse = await square.invoices.create({
        invoice: {
          orderId: orderResult.order.id,
          locationId,
          primaryRecipient: {
            emailAddress: clientEmail,
          },
          paymentRequests: [{
            requestType: 'BALANCE',
            dueDate: dueDateValue.toISOString().split('T')[0],
            automaticPaymentSource: 'NONE',
          }],
          deliveryMethod: 'EMAIL',
          title: description || 'Beauty Services Invoice',
        },
        idempotencyKey: crypto.randomUUID(),
      });

      const invoiceResult = invoiceResponse as any;
      if (!invoiceResult.invoice?.id) {
        throw new Error('Failed to create invoice');
      }

      const invoiceId = invoiceResult.invoice.id;

      await square.invoices.publish({
        invoiceId,
        idempotencyKey: crypto.randomUUID(),
        version: invoiceResult.invoice.version || 0,
      });

      if (bookingId) {
        await storage.updateBooking(bookingId, {
          squareInvoiceId: invoiceId,
          squareOrderId: orderResult.order.id,
        });
      }

      res.json({
        invoiceId,
        orderId: orderResult.order.id,
        amount: amountInCents,
        platformFee,
        status: 'sent',
      });
    } catch (error: any) {
      console.error("Square invoice error:", error);
      res.status(500).json({ error: error.message || "Failed to create invoice" });
    }
  });

  app.post("/api/square/webhooks", async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-square-hmacsha256-signature'] as string;
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      
      if (webhookSignatureKey && signature) {
        const body = JSON.stringify(req.body);
        const notificationUrl = `https://${req.get('host')}/api/square/webhooks`;
        const stringToSign = notificationUrl + body;
        const expectedSignature = crypto
          .createHmac('sha256', webhookSignatureKey)
          .update(stringToSign)
          .digest('base64');
        
        if (signature !== expectedSignature) {
          console.error('Square webhook signature verification failed');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } else {
        console.warn('Square webhook received without signature verification');
      }

      const eventType = req.body?.type;
      const data = req.body?.data?.object;

      console.log(`[Square Webhook] Received: ${eventType}`);

      switch (eventType) {
        case 'payment.completed':
          if (data?.payment) {
            const payment = data.payment;
            console.log(`[Square Webhook] Payment completed: ${payment.id}, order: ${payment.orderId}`);
            
            if (payment.orderId) {
              const booking = await storage.getBookingBySquareOrderId?.(payment.orderId);
              if (booking) {
                await storage.updateBooking(booking.id, {
                  paymentStatus: 'paid',
                });
                console.log(`[Square Webhook] Updated booking ${booking.id} to paid`);
              }
            }
          }
          break;
          
        case 'invoice.payment_made':
          if (data?.invoice) {
            const invoice = data.invoice;
            console.log(`[Square Webhook] Invoice payment: ${invoice.id}`);
            
            const booking = await storage.getBookingBySquareInvoiceId?.(invoice.id);
            if (booking) {
              await storage.updateBooking(booking.id, {
                paymentStatus: 'paid',
              });
              console.log(`[Square Webhook] Updated booking ${booking.id} to paid`);
            }
          }
          break;
          
        default:
          console.log(`[Square Webhook] Unhandled event: ${eventType}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Square webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
