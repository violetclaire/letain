import { Express, Request, Response } from "express";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { storage } from "./storage";
import { getAuthUserId } from "./routes";

// Platform fee: 1% (Beauvette's cut)
const PLATFORM_FEE_PERCENT = 1;

export function registerStripeRoutes(app: Express, isAuthenticated: any) {
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Create checkout session for booking payment
  // Supports: Card (Apple Pay/Google Pay auto-enabled), Klarna, PayPal
  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      
      const { 
        bookingId, 
        amount, // Amount in cents
        description,
        vendorStripeAccountId, // For Connect payouts
        customerEmail 
      } = req.body;

      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      // Calculate platform fee (1%)
      const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

      // Build success/cancel URLs
      const baseUrl = `https://${req.get('host')}`;
      const successUrl = `${baseUrl}/client?payment=success&bookingId=${bookingId || 'new'}`;
      const cancelUrl = `${baseUrl}/client?payment=cancelled`;

      // Payment methods to enable:
      // - 'card' automatically enables Apple Pay and Google Pay on compatible devices
      // - 'link' for Stripe's fast checkout (saves payment info across merchants)
      // - 'klarna' for buy now, pay later
      // - 'paypal' for PayPal (EU/UK/CH only - won't show in US)
      const paymentMethodTypes: any[] = ['card', 'link', 'klarna'];
      
      // PayPal only works in EU/UK/CH - add it anyway, Stripe will hide if not available
      paymentMethodTypes.push('paypal');

      const sessionConfig: any = {
        mode: 'payment',
        payment_method_types: paymentMethodTypes,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Beauty Services',
              description: bookingId ? `Booking #${bookingId}` : 'Beauvette Services',
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          bookingId: bookingId || '',
          userId: userId || '',
          platformFee: platformFee.toString(),
        },
      };

      // Add customer email if provided
      if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }

      // If vendor has Stripe Connect account, use destination charges
      if (vendorStripeAccountId) {
        sessionConfig.payment_intent_data = {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: vendorStripeAccountId,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      res.json({ 
        url: session.url,
        sessionId: session.id 
      });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Public payment from schedule page (no auth required - for clients viewing schedules)
  app.post("/api/payments/schedule-checkout", async (req: Request, res: Response) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { shareToken, amount, eventName } = req.body;
      
      if (!shareToken || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Get the schedule to validate it exists
      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Build URLs
      const baseUrl = `https://${req.get('host')}`;
      
      // Create Stripe Checkout session with Apple Pay/Google Pay enabled
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'link'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: eventName || 'Beauty Services Payment',
              description: `Event: ${schedule.eventName}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `${baseUrl}/schedule/${shareToken}?payment=success`,
        cancel_url: `${baseUrl}/schedule/${shareToken}?payment=cancelled`,
        metadata: {
          scheduleId: schedule.id,
          shareToken: shareToken,
        },
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Schedule checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Create payment intent for embedded checkout (Payment Element)
  app.post("/api/stripe/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      
      const { amount, bookingId, vendorStripeAccountId } = req.body;

      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

      const paymentIntentConfig: any = {
        amount,
        currency: 'usd',
        // Enable automatic payment methods - Stripe will show available options
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId: bookingId || '',
          userId: userId || '',
          platformFee: platformFee.toString(),
        },
      };

      // If vendor has Stripe Connect, set up for split payment
      if (vendorStripeAccountId) {
        paymentIntentConfig.application_fee_amount = platformFee;
        paymentIntentConfig.transfer_data = {
          destination: vendorStripeAccountId,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Payment intent error:", error);
      res.status(500).json({ error: error.message || "Failed to create payment intent" });
    }
  });

  // Create Stripe Connect onboarding link for vendors and planners
  app.post("/api/stripe/connect/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can set up Stripe Connect" });
      }

      const baseUrl = `https://${req.get('host')}`;
      const dashboardPath = user.role === 'planner' ? '/planner' : '/artist';
      
      if (!user.email) {
        return res.status(400).json({ error: "Email address required for Stripe setup" });
      }

      // Check if user already has a Stripe account (artists have profile, planners store directly on user)
      let accountId: string | null = null;
      
      if (user.role === 'artist') {
        const profile = await storage.getArtistProfile(userId);
        accountId = profile?.stripeAccountId || null;
      } else {
        // For planners, check user record directly
        accountId = user.stripeAccountId || null;
      }

      if (!accountId) {
        // Create new Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            userId: userId,
            role: user.role,
          },
        });
        accountId = account.id;

        // Save account ID to appropriate location
        if (user.role === 'artist') {
          await storage.updateArtistProfile(userId, {
            stripeAccountId: accountId,
          });
        } else {
          // Store on user record for planners
          await storage.updateUser(userId, {
            stripeAccountId: accountId,
          });
        }
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}${dashboardPath}?stripe=refresh`,
        return_url: `${baseUrl}${dashboardPath}?stripe=success`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe Connect error:", error);
      res.status(500).json({ error: error.message || "Failed to create onboarding link" });
    }
  });

  // Check vendor's or planner's Stripe Connect status
  app.get("/api/stripe/connect/status", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      let accountId: string | null = null;
      
      if (user?.role === 'artist') {
        const profile = await storage.getArtistProfile(userId);
        accountId = profile?.stripeAccountId || null;
      } else if (user?.role === 'planner') {
        accountId = user.stripeAccountId || null;
      }
      
      if (!accountId) {
        return res.json({ 
          connected: false, 
          chargesEnabled: false,
          payoutsEnabled: false 
        });
      }

      const account = await stripe.accounts.retrieve(accountId);

      res.json({
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        accountId: account.id,
      });
    } catch (error: any) {
      console.error("Stripe status error:", error);
      res.status(500).json({ error: error.message || "Failed to get Stripe status" });
    }
  });

  // Create Stripe Connect dashboard link for vendors and planners
  app.get("/api/stripe/connect/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      let accountId: string | null = null;
      
      if (user?.role === 'artist') {
        const profile = await storage.getArtistProfile(userId);
        accountId = profile?.stripeAccountId || null;
      } else if (user?.role === 'planner') {
        accountId = user.stripeAccountId || null;
      }
      
      if (!accountId) {
        return res.status(400).json({ error: "Stripe account not connected" });
      }

      const loginLink = await stripe.accounts.createLoginLink(accountId);
      
      res.json({ url: loginLink.url });
    } catch (error: any) {
      console.error("Stripe dashboard error:", error);
      res.status(500).json({ error: error.message || "Failed to create dashboard link" });
    }
  });

  // Create payment link (for planners and artists to get paid)
  app.post("/api/stripe/payment-link", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can create payment links" });
      }

      const { amount, description, clientName } = req.body;

      if (!amount || amount < 1) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      // Get the user's Stripe account ID
      let accountId: string | null = null;
      if (user.role === 'artist') {
        const profile = await storage.getArtistProfile(userId);
        accountId = profile?.stripeAccountId || null;
      } else {
        accountId = user.stripeAccountId || null;
      }

      if (!accountId) {
        return res.status(400).json({ error: "Please connect your Stripe account first" });
      }

      const baseUrl = `https://${req.get('host')}`;
      const amountInCents = Math.round(amount * 100);
      
      // Calculate platform fee (1%)
      const platformFee = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));

      // Create a product for this payment
      const product = await stripe.products.create({
        name: description || 'Services',
        description: `Payment for ${clientName || 'Client'}`,
      });

      // Create a price for the product
      const price = await stripe.prices.create({
        unit_amount: amountInCents,
        currency: 'usd',
        product: product.id,
      });

      // Create payment link with Connect destination
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        application_fee_amount: platformFee,
        transfer_data: {
          destination: accountId,
        },
        metadata: {
          vendorId: userId,
          clientName: clientName || '',
          description: description || '',
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${baseUrl}/payment-success`,
          },
        },
      });

      res.json({ url: paymentLink.url });
    } catch (error: any) {
      console.error("Payment link error:", error);
      res.status(500).json({ error: error.message || "Failed to create payment link" });
    }
  });

  // Generate a payment link for a booking (vendor invoicing clients)
  app.post("/api/stripe/create-invoice-link", isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ error: "User not found" });
      }
      // Allow any authenticated user to create invoice links for now

      const { bookingId, amount, description, clientEmail, clientName } = req.body;

      if (!amount || amount < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      const profile = await storage.getArtistProfile(userId);
      const baseUrl = `https://${req.get('host')}`;
      
      // Calculate platform fee (1%)
      const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

      // Create a product for this invoice
      const product = await stripe.products.create({
        name: description || 'Beauty Services',
        description: `Invoice for ${clientName || 'Client'}`,
      });

      // Create a price for the product
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency: 'usd',
        product: product.id,
      });

      // Payment link configuration
      const paymentLinkConfig: any = {
        line_items: [{
          price: price.id,
          quantity: 1,
        }],
        metadata: {
          bookingId: bookingId || '',
          vendorId: userId,
          clientEmail: clientEmail || '',
          platformFee: platformFee.toString(),
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${baseUrl}/payment-success?bookingId=${bookingId || 'invoice'}`,
          },
        },
      };

      // If vendor has Stripe Connect, route payment to their account
      if (profile?.stripeAccountId) {
        paymentLinkConfig.application_fee_percent = PLATFORM_FEE_PERCENT;
        paymentLinkConfig.transfer_data = {
          destination: profile.stripeAccountId,
        };
      }

      const paymentLink = await stripe.paymentLinks.create(paymentLinkConfig);

      // Update booking with payment link if bookingId provided
      if (bookingId) {
        await storage.updateBooking(bookingId, {
          stripePaymentLinkId: paymentLink.id,
          stripePaymentLinkUrl: paymentLink.url,
        });
      }

      res.json({
        paymentLink: paymentLink.url,
        paymentLinkId: paymentLink.id,
        amount: amount,
        platformFee: platformFee,
        vendorReceives: amount - platformFee,
      });
    } catch (error: any) {
      console.error("Invoice link error:", {
        message: error.message,
        type: error.type,
        code: error.code,
        requestId: error.requestId,
        full: error
      });
      res.status(500).json({ 
        error: error.message || "Failed to create invoice link",
        type: error.type,
        code: error.code 
      });
    }
  });
}
