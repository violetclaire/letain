import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

let cachedSessionMiddleware: RequestHandler | null = null;

export function getSession(): RequestHandler {
  if (cachedSessionMiddleware) {
    return cachedSessionMiddleware;
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  // Use production database URL in production, otherwise development
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = (isProduction && process.env.PRODUCTION_DATABASE_URL) 
    ? process.env.PRODUCTION_DATABASE_URL 
    : process.env.DATABASE_URL;
  
  console.log(`[Session] Using ${isProduction ? 'production' : 'development'} database for sessions`);
  
  const sessionStore = new pgStore({
    conString: dbUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Don't hardcode cookie domain - let browser derive it from request host
  // This fixes issues where www.dateinquiry.com vs dateinquiry.com mismatch causes cookie rejection
  cachedSessionMiddleware = session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
      // No domain specified - browser will use request host automatically
    },
  });
  
  return cachedSessionMiddleware;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Save the intended role in session before redirecting to OAuth
    const intendedRole = req.query.role as string;
    if (intendedRole && ['client', 'artist', 'planner'].includes(intendedRole)) {
      (req.session as any).intendedRole = intendedRole;
    }
    
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }
      
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }
        
        // Get the intended role from session (if user selected one)
        const intendedRole = (req.session as any).intendedRole;
        delete (req.session as any).intendedRole; // Clear it after use
        
        // Check if user has a role set in database
        const userId = user.claims?.sub;
        if (userId) {
          const dbUser = await storage.getUser(userId);
          
          // If user already has a role, go to their dashboard
          if (dbUser?.role) {
            switch (dbUser.role) {
              case 'client':
                return res.redirect("/client");
              case 'artist':
                // Check if on dateinquiry domain - use simplified admin
                const isDateInquiry = req.hostname.includes('dateinquiry');
                if (isDateInquiry) {
                  const artistProfile = await storage.getArtistProfile(userId);
                  if (artistProfile?.artistSlug) {
                    return res.redirect(`/admin/${artistProfile.artistSlug}`);
                  }
                }
                // Beauvette or no slug - use full dashboard
                return res.redirect("/artist");
              case 'planner':
                return res.redirect("/planner");
              case 'admin':
                return res.redirect("/admin");
            }
          }
          
          // User doesn't have a role yet - check if they selected one
          if (intendedRole) {
            // Go to the intake form for their selected role
            switch (intendedRole) {
              case 'client':
                return res.redirect("/intake/client");
              case 'artist':
                return res.redirect("/intake/artist");
              case 'planner':
                return res.redirect("/intake/planner");
            }
          }
        }
        
        // No role set and none selected - redirect to register to choose role
        return res.redirect("/register");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for email/password session first
  if ((req.session as any)?.userId) {
    return next();
  }

  // Fall back to Replit OAuth
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
