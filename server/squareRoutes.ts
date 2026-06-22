import { Express, Request, Response } from "express";
import { getSquare, getSquareOAuthClient, getMerchantSquare, getSquareApplicationId, getSquareApplicationSecret, isSquareConfigured, isSquareOAuthConfigured } from "./squareClient";
import { storage } from "./storage";
import { isLocalPreviewBackgroundJobsDisabled } from "./backgroundJobs";
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
if (!isLocalPreviewBackgroundJobsDisabled()) {
  setInterval(async () => {
    try {
      await storage.cleanupExpiredOAuthStates();
    } catch (error) {
      console.error("[Square OAuth] Failed to cleanup expired states:", error);
    }
  }, 60000);
}

export function registerSquareRoutes(app: Express, isAuthenticated: any, getAuthUserId: (req: any) => string | null) {
  // Public OAuth flow for artist setup (uses artist slug instead of session)
  // Accepts optional returnUrl query param to redirect back after connection
  app.get("/api/square/connect/start/:artistSlug", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      const { returnUrl } = req.query;
      
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      if (!isSquareOAuthConfigured()) {
        return res.status(500).json({ error: "Square OAuth not configured" });
      }

      const applicationId = getSquareApplicationId();
      // Custom return URL - SECURITY: Only allow relative paths starting with / to prevent open redirect
      let customReturnUrl: string | undefined = undefined;
      if (returnUrl && typeof returnUrl === 'string') {
        // Only allow relative paths (must start with /, must not contain ://)
        if (returnUrl.startsWith('/') && !returnUrl.includes('://') && !returnUrl.startsWith('//')) {
          customReturnUrl = returnUrl;
        } else {
          console.log(`[Square OAuth] Rejected invalid returnUrl: ${returnUrl}`);
        }
      }
      
      // Use the callback URL registered in Square (must match exactly)
      const callbackBaseUrl = 'https://dateinquiry.com';
      const callbackUrl = `${callbackBaseUrl}/api/square/connect/callback`;
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in database for cross-environment persistence (including exact callback URL)
      // returnBaseUrl is only set if a valid relative path is provided; undefined means use default setup flow
      await storage.createOAuthState({
        state,
        userId: profile.userId,
        artistSlug,
        returnBaseUrl: customReturnUrl,
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
    const errorRedirect = 'https://dateinquiry.com/artist?square=error&message=';
    
    try {
      const { code, state, error: oauthError } = req.query;
      
      console.log(`[Square OAuth] Callback received - code: ${code ? 'YES' : 'NO'}, state: ${state ? 'YES' : 'NO'}, error: ${oauthError || 'none'}`);
      
      if (oauthError) {
        console.log(`[Square OAuth] Error from Square: ${oauthError}`);
        return res.redirect(`${errorRedirect}${encodeURIComponent(String(oauthError))}`);
      }
      
      if (!code) {
        console.log('[Square OAuth] No authorization code received');
        return res.redirect(`${errorRedirect}No authorization code received`);
      }

      if (!state || typeof state !== 'string') {
        console.log('[Square OAuth] Invalid state parameter');
        return res.redirect(`${errorRedirect}Invalid state parameter`);
      }

      // Look up state from database (works across environments)
      console.log(`[Square OAuth] Looking up state from database`);
      
      const stateData = await storage.getOAuthState(state);
      
      if (!stateData) {
        console.log('[Square OAuth] State not found in database - may have expired');
        return res.redirect(`${errorRedirect}Session expired - please try connecting again`);
      }
      
      if (stateData.expiresAt < new Date()) {
        await storage.deleteOAuthState(state);
        return res.redirect(`${errorRedirect}Authorization expired, please try again`);
      }
      
      // Delete state after use (one-time use)
      await storage.deleteOAuthState(state);
      
      const userId = stateData.userId;
      const artistSlug = stateData.artistSlug;
      const returnBaseUrl = stateData.returnBaseUrl;
      // CRITICAL: Must use exact same redirect_uri as authorization - always use production URL
      const callbackUrl = 'https://dateinquiry.com/api/square/connect/callback';

      const square = getSquareOAuthClient();
      const applicationId = getSquareApplicationId();
      
      let applicationSecret: string;
      try {
        applicationSecret = getSquareApplicationSecret();
      } catch (e) {
        console.error("Square OAuth: Missing SQUARE_APPLICATION_SECRET");
        return res.redirect(`${errorRedirect}Server configuration error - contact support`);
      }

      console.log(`[Square OAuth] Exchanging code for token...`);
      console.log(`[Square OAuth] Square application credentials present: ${applicationId ? 'yes' : 'no'}`);
      console.log(`[Square OAuth] redirectUri: ${callbackUrl}`);
      
      const tokenRequestBody = {
        client_id: applicationId,
        client_secret: applicationSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      };
      
      console.log(`[Square OAuth] Making direct HTTP request to Square...`);
      
      const tokenFetchResponse = await fetch('https://connect.squareup.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify(tokenRequestBody),
      });
      
      const tokenResponseJson = await tokenFetchResponse.json();
      
      if (!tokenFetchResponse.ok) {
        console.error(`[Square OAuth] Token exchange FAILED - Status: ${tokenFetchResponse.status}`);
        console.error(`[Square OAuth] Error response received from Square (body redacted)`);
        return res.redirect(`${errorRedirect}${encodeURIComponent(tokenResponseJson.message || tokenResponseJson.error || 'Token exchange failed')}`);
      }
      
      console.log(`[Square OAuth] Token exchange succeeded`);
      const tokenResponse = tokenResponseJson;
      
      if (!tokenResponse.access_token || !tokenResponse.merchant_id) {
        console.error("Square OAuth: Token response missing required fields");
        return res.redirect(`${errorRedirect}Failed to obtain access token`);
      }

      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token;
      const expiresAt = tokenResponse.expires_at;
      const merchantId = tokenResponse.merchant_id;
      const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`[Square OAuth] User ${userId} not found`);
        return res.redirect(`${errorRedirect}User not found`);
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
      
      // Handle redirect based on stored returnBaseUrl
      const productionDomain = 'https://dateinquiry.com';
      
      // returnBaseUrl is always a relative path (validated at start) or undefined
      if (returnBaseUrl && returnBaseUrl.startsWith('/')) {
        // Relative path like /inquiry/xxx?tab=payment - prepend production domain
        const separator = returnBaseUrl.includes('?') ? '&' : '?';
        const fullUrl = `${productionDomain}${returnBaseUrl}${separator}square=success`;
        console.log(`[Square OAuth] Redirecting to custom return path: ${fullUrl}`);
        res.redirect(fullUrl);
      } else if (artistSlug) {
        // Default setup flow - go to contract step
        res.redirect(`${productionDomain}/setup/${artistSlug}/contract?square=success`);
      } else {
        // Fallback for authenticated flow
        const redirectPath = user.role === 'artist' ? '/artist' : '/planner';
        res.redirect(`${productionDomain}${redirectPath}?square=success&merchantId=${merchantId}`);
      }
    } catch (error: any) {
      console.error("Square OAuth callback error:", error);
      res.redirect(`https://dateinquiry.com/artist?square=error&message=${encodeURIComponent(error.message || 'OAuth failed')}`);
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

  // Fetch invoices from Square for an artist (requires edit token for auth)
  app.get("/api/square/invoices/:artistSlug", async (req: Request, res: Response) => {
    try {
      const { artistSlug } = req.params;
      const token = req.query.token as string;
      
      // Validate authentication - require edit token
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const tokenProfile = await storage.getArtistProfileByEditToken(token);
      if (!tokenProfile || tokenProfile.artistSlug !== artistSlug) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const profile = tokenProfile;
      
      if (!profile.squareAccessToken) {
        return res.status(400).json({ error: "Square not connected", connected: false });
      }

      const square = getMerchantSquare(profile.squareAccessToken);
      const locationId = profile.squareLocationId || process.env.SQUARE_LOCATION_ID;
      
      if (!locationId) {
        return res.status(400).json({ error: "Square location not configured" });
      }

      // Fetch invoices from Square
      const invoicesResponse = await square.invoices.list({
        locationId,
        limit: 100,
      });

      const invoices = (invoicesResponse as any).invoices || [];
      
      // Transform invoices to a simpler format
      const formattedInvoices = invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        title: inv.title,
        status: inv.status,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        scheduledAt: inv.scheduledAt,
        publicUrl: inv.publicUrl,
        orderId: inv.orderId,
        primaryRecipient: inv.primaryRecipient?.emailAddress,
        paymentRequests: inv.paymentRequests?.map((pr: any) => ({
          requestType: pr.requestType,
          dueDate: pr.dueDate,
          totalMoney: pr.computedAmountMoney ? {
            amount: Number(pr.computedAmountMoney.amount) / 100,
            currency: pr.computedAmountMoney.currency,
          } : null,
          tippingEnabled: pr.tippingEnabled,
        })),
        totalMoney: inv.paymentRequests?.[0]?.computedAmountMoney ? {
          amount: Number(inv.paymentRequests[0].computedAmountMoney.amount) / 100,
          currency: inv.paymentRequests[0].computedAmountMoney.currency,
        } : null,
      }));

      res.json({
        connected: true,
        invoices: formattedInvoices,
        count: formattedInvoices.length,
      });
    } catch (error: any) {
      console.error("[Square Invoices] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch invoices" });
    }
  });

  // Fetch payments from Square for an artist (requires edit token for auth)
  app.get("/api/square/payments/:artistSlug", async (req: Request, res: Response) => {
    try {
      const { artistSlug } = req.params;
      const token = req.query.token as string;
      
      // Validate authentication - require edit token
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const tokenProfile = await storage.getArtistProfileByEditToken(token);
      if (!tokenProfile || tokenProfile.artistSlug !== artistSlug) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const profile = tokenProfile;
      
      if (!profile.squareAccessToken) {
        return res.status(400).json({ error: "Square not connected", connected: false });
      }

      const square = getMerchantSquare(profile.squareAccessToken);
      const locationId = profile.squareLocationId || process.env.SQUARE_LOCATION_ID;
      
      if (!locationId) {
        return res.status(400).json({ error: "Square location not configured" });
      }

      // Fetch payments from Square (last 60 days)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      
      const paymentsResponse = await square.payments.list({
        locationId,
        beginTime: sixtyDaysAgo,
        sortOrder: 'DESC',
      });

      const payments = (paymentsResponse as any).payments || [];
      
      // Transform payments to a simpler format
      const formattedPayments = payments.map((pmt: any) => ({
        id: pmt.id,
        status: pmt.status,
        createdAt: pmt.createdAt,
        updatedAt: pmt.updatedAt,
        orderId: pmt.orderId,
        receiptUrl: pmt.receiptUrl,
        sourceType: pmt.sourceType,
        cardBrand: pmt.cardDetails?.card?.cardBrand,
        last4: pmt.cardDetails?.card?.last4,
        amountMoney: pmt.amountMoney ? {
          amount: Number(pmt.amountMoney.amount) / 100,
          currency: pmt.amountMoney.currency,
        } : null,
        tipMoney: pmt.tipMoney ? {
          amount: Number(pmt.tipMoney.amount) / 100,
          currency: pmt.tipMoney.currency,
        } : null,
        totalMoney: pmt.totalMoney ? {
          amount: Number(pmt.totalMoney.amount) / 100,
          currency: pmt.totalMoney.currency,
        } : null,
        processingFee: pmt.processingFee?.[0] ? {
          amount: Number(pmt.processingFee[0].amountMoney.amount) / 100,
          currency: pmt.processingFee[0].amountMoney.currency,
        } : null,
      }));

      // Calculate totals
      const totalRevenue = formattedPayments
        .filter((p: any) => p.status === 'COMPLETED')
        .reduce((sum: number, p: any) => sum + (p.amountMoney?.amount || 0), 0);
      
      const totalFees = formattedPayments
        .filter((p: any) => p.status === 'COMPLETED')
        .reduce((sum: number, p: any) => sum + (p.processingFee?.amount || 0), 0);

      res.json({
        connected: true,
        payments: formattedPayments,
        count: formattedPayments.length,
        summary: {
          totalRevenue,
          totalFees,
          netRevenue: totalRevenue - totalFees,
          completedCount: formattedPayments.filter((p: any) => p.status === 'COMPLETED').length,
        },
      });
    } catch (error: any) {
      console.error("[Square Payments] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch payments" });
    }
  });

  // Combined revenue summary endpoint (requires edit token for auth)
  app.get("/api/square/revenue/:artistSlug", async (req: Request, res: Response) => {
    try {
      const { artistSlug } = req.params;
      const token = req.query.token as string;
      
      // Validate authentication - require edit token
      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const tokenProfile = await storage.getArtistProfileByEditToken(token);
      if (!tokenProfile || tokenProfile.artistSlug !== artistSlug) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const profile = tokenProfile;
      
      if (!profile.squareAccessToken) {
        return res.json({ 
          connected: false, 
          invoices: [],
          payments: [],
          summary: {
            totalInvoiced: 0,
            totalPaid: 0,
            totalPending: 0,
            invoiceCount: 0,
            paidCount: 0,
            pendingCount: 0,
          }
        });
      }

      const square = getMerchantSquare(profile.squareAccessToken);
      const locationId = profile.squareLocationId || process.env.SQUARE_LOCATION_ID;
      
      if (!locationId) {
        return res.status(400).json({ error: "Square location not configured" });
      }

      // Fetch invoices
      let invoices: any[] = [];
      try {
        const invoicesResponse = await square.invoices.list({
          locationId,
          limit: 100,
        });
        invoices = (invoicesResponse as any).invoices || [];
      } catch (e) {
        console.error("[Square Revenue] Failed to fetch invoices:", e);
      }

      // Fetch payments (last 60 days)
      let payments: any[] = [];
      try {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const paymentsResponse = await square.payments.list({
          locationId,
          beginTime: sixtyDaysAgo,
          sortOrder: 'DESC',
        });
        payments = (paymentsResponse as any).payments || [];
      } catch (e) {
        console.error("[Square Revenue] Failed to fetch payments:", e);
      }

      // Process invoices
      const formattedInvoices = invoices.map((inv: any) => {
        const amount = inv.paymentRequests?.[0]?.computedAmountMoney?.amount;
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          title: inv.title,
          status: inv.status,
          createdAt: inv.createdAt,
          dueDate: inv.paymentRequests?.[0]?.dueDate,
          publicUrl: inv.publicUrl,
          clientEmail: inv.primaryRecipient?.emailAddress,
          amount: amount ? Number(amount) / 100 : 0,
        };
      });

      // Process payments
      const formattedPayments = payments.map((pmt: any) => ({
        id: pmt.id,
        status: pmt.status,
        createdAt: pmt.createdAt,
        receiptUrl: pmt.receiptUrl,
        cardBrand: pmt.cardDetails?.card?.cardBrand,
        last4: pmt.cardDetails?.card?.last4,
        amount: pmt.amountMoney ? Number(pmt.amountMoney.amount) / 100 : 0,
        tip: pmt.tipMoney ? Number(pmt.tipMoney.amount) / 100 : 0,
        processingFee: pmt.processingFee?.[0] ? Number(pmt.processingFee[0].amountMoney.amount) / 100 : 0,
      }));

      // Calculate summary
      const totalInvoiced = formattedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidInvoices = formattedInvoices.filter(inv => inv.status === 'PAID');
      const pendingInvoices = formattedInvoices.filter(inv => ['UNPAID', 'SCHEDULED', 'PARTIALLY_PAID'].includes(inv.status));
      
      const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

      const completedPayments = formattedPayments.filter(p => p.status === 'COMPLETED');
      const paymentRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = completedPayments.reduce((sum, p) => sum + p.processingFee, 0);

      res.json({
        connected: true,
        invoices: formattedInvoices,
        payments: formattedPayments,
        summary: {
          totalInvoiced,
          totalPaid,
          totalPending,
          invoiceCount: formattedInvoices.length,
          paidCount: paidInvoices.length,
          pendingCount: pendingInvoices.length,
          paymentRevenue,
          totalFees,
          netRevenue: paymentRevenue - totalFees,
        },
      });
    } catch (error: any) {
      console.error("[Square Revenue] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch revenue data" });
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
                
                // Send payment receipt to client
                try {
                  const inquiry = await storage.getInquiry(booking.inquiryId);
                  const artist = await storage.getUser(booking.artistId);
                  const artistProfile = await storage.getArtistProfile(booking.artistId);
                  const artistName = artistProfile?.businessName || artist?.firstName || "Artist";
                  
                  if (inquiry?.clientEmail) {
                    const { sendPaymentReceiptToClient } = await import("./emailService");
                    await sendPaymentReceiptToClient({
                      toEmail: inquiry.clientEmail,
                      clientName: inquiry.clientFirstName || "Client",
                      artistName,
                      amount: Number(payment.amountMoney?.amount) || 0,
                      description: booking.description || "Payment",
                      paymentDate: new Date().toISOString(),
                      paymentMethod: "Square",
                    });
                    console.log(`[Square Webhook] Payment receipt sent to ${inquiry.clientEmail}`);
                  }
                } catch (emailErr) {
                  console.error(`[Square Webhook] Failed to send payment receipt:`, emailErr);
                }
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
              
              // Send payment receipt to client
              try {
                const inquiry = await storage.getInquiry(booking.inquiryId);
                const artist = await storage.getUser(booking.artistId);
                const artistProfile = await storage.getArtistProfile(booking.artistId);
                const artistName = artistProfile?.businessName || artist?.firstName || "Artist";
                
                if (inquiry?.clientEmail) {
                  const { sendPaymentReceiptToClient } = await import("./emailService");
                  await sendPaymentReceiptToClient({
                    toEmail: inquiry.clientEmail,
                    clientName: inquiry.clientFirstName || "Client",
                    artistName,
                    amount: Number(invoice.paymentRequests?.[0]?.computedAmountMoney?.amount) || 0,
                    description: invoice.title || "Invoice Payment",
                    paymentDate: new Date().toISOString(),
                    paymentMethod: "Square",
                  });
                  console.log(`[Square Webhook] Payment receipt sent to ${inquiry.clientEmail}`);
                }
              } catch (emailErr) {
                console.error(`[Square Webhook] Failed to send payment receipt:`, emailErr);
              }
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
