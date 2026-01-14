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

// Cleanup expired OAuth states from database every minute
setInterval(async () => {
  try {
    await storage.cleanupExpiredOAuthStates();
  } catch (error) {
    console.error("[Square OAuth] Failed to cleanup expired states:", error);
  }
}, 60000);

export function registerSquareRoutes(app: Express, isAuthenticated: any) {
  
  // Public OAuth flow for artist setup (uses artist slug instead of session)
  app.get("/api/square/connect/start/:artistSlug", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      if (!isSquareOAuthConfigured()) {
        return res.status(500).json({ error: "Square OAuth not configured" });
      }

      const applicationId = getSquareApplicationId();
      // Use dateinquiry.com as the return URL for artist setup flow
      const returnBaseUrl = 'https://dateinquiry.com';
      // Use the callback URL registered in Square (must match exactly)
      const callbackBaseUrl = 'https://dateinquiry.com';
      const callbackUrl = `${callbackBaseUrl}/api/square/connect/callback`;
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in database for cross-environment persistence (including exact callback URL)
      await storage.createOAuthState({
        state,
        userId: profile.userId,
        artistSlug,
        returnBaseUrl,
        callbackUrl, // Store exact callback URL for token exchange
        provider: 'square',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
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

      // Use the exact same callback URL for authorization
      const redirectUri = encodeURIComponent(callbackUrl);
      const authUrl = `${SQUARE_OAUTH_BASE}/oauth2/authorize?` +
        `client_id=${applicationId}&` +
        `scope=${scope}&` +
        `session=false&` +
        `state=${state}&` +
        `redirect_uri=${redirectUri}`;

      // Redirect directly to Square
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("[Square OAuth Public] Error:", error);
      res.status(500).json({ error: error.message || "Failed to start Square connection" });
    }
  });
  
  // Public status check by artist slug
  app.get("/api/square/connect/status/:artistSlug", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      const connected = !!(profile.squareAccessToken && profile.squareMerchantId);
      
      res.json({
        connected,
        merchantId: connected ? profile.squareMerchantId : null,
      });
    } catch (error: any) {
      console.error("[Square Status] Error:", error);
      res.status(500).json({ error: error.message || "Failed to check status" });
    }
  });
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
      // Always use production callback URL for consistency
      const callbackUrl = 'https://dateinquiry.com/api/square/connect/callback';
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in database for cross-environment persistence
      await storage.createOAuthState({
        state,
        userId,
        callbackUrl, // Store exact callback URL for token exchange
        provider: 'square',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
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

      const redirectUri = encodeURIComponent(callbackUrl);
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

      // Look up state from database (works across environments)
      console.log(`[Square OAuth] Looking up state from database`);
      
      const stateData = await storage.getOAuthState(state);
      
      if (!stateData) {
        console.log('[Square OAuth] State not found in database - may have expired');
        return res.redirect(`/artist?square=error&message=Session expired - please try connecting again`);
      }
      
      if (stateData.expiresAt < new Date()) {
        await storage.deleteOAuthState(state);
        return res.redirect(`/artist?square=error&message=Authorization expired, please try again`);
      }
      
      // Delete state after use (one-time use)
      await storage.deleteOAuthState(state);
      
      const userId = stateData.userId;
      const artistSlug = stateData.artistSlug;
      const returnBaseUrl = stateData.returnBaseUrl;
      const callbackUrl = stateData.callbackUrl || `https://${req.get('host')}/api/square/connect/callback`;

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
        redirectUri: callbackUrl, // Use exact same URL as authorization
      });

      const tokenResponse = response as any;
      
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

      console.log(`[Square OAuth] OAuth complete for user ${userId}, merchant ${merchantId}, slug: ${artistSlug || 'none'}, returnUrl: ${returnBaseUrl || 'none'}`);
      
      // If came from setup flow (has artistSlug), redirect to next setup step on dateinquiry.com
      if (artistSlug && returnBaseUrl) {
        res.redirect(`${returnBaseUrl}/setup/${artistSlug}/contract?square=success`);
      } else if (artistSlug) {
        res.redirect(`https://dateinquiry.com/setup/${artistSlug}/contract?square=success`);
      } else {
        const redirectPath = user.role === 'artist' ? '/artist' : '/planner';
        res.redirect(`${redirectPath}?square=success&merchantId=${merchantId}`);
      }
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
