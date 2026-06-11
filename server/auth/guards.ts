import type { RequestHandler } from "express";

type OidcSessionUser = {
  expires_at?: number;
  refresh_token?: string;
  [key: string]: unknown;
};

type RefreshExpiredOidcSession = (user: OidcSessionUser) => Promise<boolean>;

export function createIsAuthenticated(refreshExpiredOidcSession: RefreshExpiredOidcSession): RequestHandler {
  return async (req, res, next) => {
    // Check for email/password session first
    if ((req.session as any)?.userId) {
      return next();
    }

    // Fall back to OAuth-backed Passport session
    const user = req.user as OidcSessionUser;

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
      const refreshed = await refreshExpiredOidcSession(user);
      if (refreshed) {
        return next();
      }
    } catch (error) {
      // Preserve current auth behavior: refresh failures become 401s.
    }

    res.status(401).json({ message: "Unauthorized" });
    return;
  };
}
