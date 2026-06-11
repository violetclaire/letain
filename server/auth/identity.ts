import type { Request } from "express";

// Helper to get authenticated user ID from either email/password session or OAuth.
export function getAuthUserId(req: Request): string | null {
  // Check email/password session first
  if (req.session?.userId) {
    return req.session.userId;
  }

  // Fall back to OAuth
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }

  return null;
}
