import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function readServerFile(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("setupAuth initializes session middleware and Passport before registering OIDC routes", () => {
  const source = readServerFile("./replitAuth.ts");

  assert.match(source, /export async function setupAuth\(app: Express\)/);
  assert.ok(source.includes('app.set("trust proxy", 1);'));
  assert.ok(source.includes("app.use(getSession());"));
  assert.ok(source.includes("app.use(passport.initialize());"));
  assert.ok(source.includes("app.use(passport.session());"));
  assert.ok(source.includes("const config = await getOidcConfig();"));
  assert.ok(source.includes("passport.serializeUser((user: Express.User, cb) => cb(null, user));"));
  assert.ok(source.includes("passport.deserializeUser((user: Express.User, cb) => cb(null, user));"));
});

test("Replit OIDC assumptions remain explicit in the current auth provider", () => {
  const source = readServerFile("./replitAuth.ts");

  assert.ok(source.includes('new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc")'));
  assert.ok(source.includes("process.env.REPL_ID!"));
  assert.ok(source.includes("const registeredStrategies = new Set<string>();"));
  assert.ok(source.includes("const strategyName = `replitauth:${domain}`;"));
  assert.ok(source.includes("if (!registeredStrategies.has(strategyName))"));
  assert.ok(source.includes('scope: "openid email profile offline_access"'));
  assert.ok(source.includes("callbackURL: `https://${domain}/api/callback`"));
  assert.ok(source.includes("passport.use(strategy);"));
  assert.ok(source.includes("registeredStrategies.add(strategyName);"));
});

test("/api/login keeps current role capture and Replit OIDC redirect behavior", () => {
  const source = readServerFile("./replitAuth.ts");

  assert.match(source, /app\.get\("\/api\/login", \(req, res, next\) =>/);
  assert.ok(source.includes("const intendedRole = req.query.role as string;"));
  assert.ok(source.includes("['client', 'artist', 'planner'].includes(intendedRole)"));
  assert.ok(source.includes("(req.session as any).intendedRole = intendedRole;"));
  assert.ok(source.includes("ensureStrategy(req.hostname);"));
  assert.ok(source.includes("passport.authenticate(`replitauth:${req.hostname}`, {"));
  assert.ok(source.includes('prompt: "login consent"'));
  assert.ok(source.includes('scope: ["openid", "email", "profile", "offline_access"]'));
});

test("/api/callback keeps current login fallback and role redirect behavior", () => {
  const source = readServerFile("./replitAuth.ts");

  assert.match(source, /app\.get\("\/api\/callback", \(req, res, next\) =>/);
  assert.ok(source.includes("ensureStrategy(req.hostname);"));
  assert.ok(source.includes("passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) =>"));
  assert.ok(source.includes('return res.redirect("/api/login");'));
  assert.ok(source.includes("req.logIn(user, async (loginErr) =>"));
  assert.ok(source.includes("const intendedRole = (req.session as any).intendedRole;"));
  assert.ok(source.includes("delete (req.session as any).intendedRole;"));
  assert.ok(source.includes("const dbUser = await storage.getUser(userId);"));
  assert.ok(source.includes('return res.redirect("/client");'));
  assert.ok(source.includes("const isDateInquiry = req.hostname.includes('dateinquiry');"));
  assert.ok(source.includes("const artistProfile = await storage.getArtistProfile(userId);"));
  assert.ok(source.includes("return res.redirect(`/admin/${artistProfile.artistSlug}`);"));
  assert.ok(source.includes('return res.redirect("/artist");'));
  assert.ok(source.includes('return res.redirect("/planner");'));
  assert.ok(source.includes('return res.redirect("/admin");'));
  assert.ok(source.includes('return res.redirect("/intake/client");'));
  assert.ok(source.includes('return res.redirect("/intake/artist");'));
  assert.ok(source.includes('return res.redirect("/intake/planner");'));
  assert.ok(source.includes('return res.redirect("/register");'));
});

test("/api/logout keeps current Replit end-session redirect behavior", () => {
  const source = readServerFile("./replitAuth.ts");

  assert.match(source, /app\.get\("\/api\/logout", \(req, res\) =>/);
  assert.ok(source.includes("req.logout(() =>"));
  assert.ok(source.includes("client.buildEndSessionUrl(config, {"));
  assert.ok(source.includes("client_id: process.env.REPL_ID!"));
  assert.ok(source.includes("post_logout_redirect_uri: `${req.protocol}://${req.hostname}`"));
});

test("email/password session routes remain separate from Replit OIDC routes", () => {
  const routesSource = readServerFile("./routes.ts");
  const guardsSource = readServerFile("./auth/guards.ts");
  const identitySource = readServerFile("./auth/identity.ts");

  assert.ok(routesSource.includes("app.post('/api/auth/login', authLimiter"));
  assert.ok(routesSource.includes("req.session.userId = user.id;"));
  assert.ok(routesSource.includes("req.session.save((err) =>"));
  assert.ok(routesSource.includes("app.post('/api/auth/logout', (req, res) =>"));
  assert.ok(routesSource.includes("req.session.destroy((err) =>"));

  assert.ok(guardsSource.includes("if ((req.session as any)?.userId)"));
  assert.ok(guardsSource.includes("return next();"));
  assert.ok(identitySource.includes("if (req.session?.userId)"));
  assert.ok(identitySource.includes("return req.session.userId;"));
  assert.ok(identitySource.includes("if (req.user?.claims?.sub)"));
  assert.ok(identitySource.includes("return req.user.claims.sub;"));
});

test("session store and cookie defaults remain unchanged", () => {
  const source = readServerFile("./auth/session.ts");

  assert.ok(source.includes("const sessionTtl = 7 * 24 * 60 * 60 * 1000;"));
  assert.ok(source.includes("const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;"));
  assert.ok(source.includes("createTableIfMissing: false"));
  assert.ok(source.includes("ttl: sessionTtl"));
  assert.ok(source.includes('tableName: "sessions"'));
  assert.ok(source.includes("const isProduction = process.env.NODE_ENV === 'production';"));
  assert.ok(source.includes("secret: process.env.SESSION_SECRET!"));
  assert.ok(source.includes("resave: false"));
  assert.ok(source.includes("saveUninitialized: false"));
  assert.ok(source.includes("httpOnly: true"));
  assert.ok(source.includes("secure: isProduction"));
  assert.ok(source.includes('sameSite: "lax"'));
  assert.ok(source.includes("maxAge: sessionTtl"));
});
