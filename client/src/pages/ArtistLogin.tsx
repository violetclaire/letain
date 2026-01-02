import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Mail, Eye, EyeOff, Link2 } from "lucide-react";

export default function ArtistLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showLinkProfile, setShowLinkProfile] = useState(false);
  const [artistSlug, setArtistSlug] = useState("");
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password");
        return;
      }

      if (data.user?.role === "artist") {
        if (data.artistSlug) {
          window.location.href = `/admin/${data.artistSlug}`;
        } else {
          const userRes = await fetch('/api/auth/user', { credentials: 'include' });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData?.artistSlug) {
              window.location.href = `/admin/${userData.artistSlug}`;
              return;
            }
          }
          // Show debug info to help diagnose the issue
          const debugInfo = data.artistProfileDebug || "Unknown reason";
          setError(`Could not find your artist profile. Debug: ${debugInfo}`);
        }
      } else {
        setError("This login is for artists only");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use resend-access endpoint which uses existing editToken (more reliable)
      const response = await fetch("/api/public/artist/resend-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/artist-set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          password: newPassword,
          artistSlug: artistSlug || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      // Success - use direct login URL if provided (bypasses cookie issues)
      if (data.directLoginUrl) {
        window.location.href = data.directLoginUrl;
      } else if (data.artistSlug) {
        window.location.href = `/admin/${data.artistSlug}`;
      } else {
        setError("Password set! Now try signing in.");
        setShowSetPassword(false);
        setPassword(newPassword);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkProfile = async (e: React.FormEvent, confirmLink = false) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setNeedsConfirmation(false);

    try {
      const response = await fetch("/api/public/artist/link-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          artistSlug: artistSlug.toLowerCase().trim(),
          confirmLink
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsConfirmation) {
          setNeedsConfirmation(true);
          setError(data.message);
        } else {
          setError(data.error || "Something went wrong");
        }
        return;
      }

      setLinkSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F5F0E8]/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-[#F5F0E8]" />
            </div>
            <h1 className="text-2xl md:text-3xl mb-3 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
              Check your inbox
            </h1>
            <p className="text-sm text-[#F5F0E8]/60 mb-6">
              We sent a login link to <span className="text-[#F5F0E8]">{email}</span>
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setShowMagicLink(false);
                setEmail("");
              }}
              className="text-sm text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              data-testid="button-different-email"
            >
              Use a different email
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (linkSuccess) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl md:text-3xl mb-3 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
              Profile Linked!
            </h1>
            <p className="text-sm text-[#F5F0E8]/60 mb-6">
              Your profile has been connected to your account. You can now sign in.
            </p>
            <button
              onClick={() => {
                setLinkSuccess(false);
                setShowLinkProfile(false);
                setArtistSlug("");
              }}
              className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-widest transition-colors rounded hover:bg-white"
              data-testid="button-back-to-login"
            >
              Back to Sign In
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showLinkProfile) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl mb-2 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
                Link Your Profile
              </h1>
              <p className="text-sm text-[#F5F0E8]/60">
                Connect your existing artist profile to your account
              </p>
            </div>

            <form onSubmit={(e) => handleLinkProfile(e, false)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  Your Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-email-link"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  Your Profile URL Slug
                </label>
                <input
                  type="text"
                  value={artistSlug}
                  onChange={(e) => setArtistSlug(e.target.value)}
                  placeholder="e.g. themakeupdolls"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-artist-slug"
                />
                <p className="text-xs text-[#F5F0E8]/40">
                  This is the part after dateinquiry.com/ in your profile URL
                </p>
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded">
                  {error}
                  {needsConfirmation && (
                    <button
                      type="button"
                      onClick={(e) => handleLinkProfile(e as any, true)}
                      className="block w-full mt-3 bg-red-500/20 border border-red-500/40 py-2 rounded text-red-300 hover:bg-red-500/30"
                    >
                      Yes, link it to my account
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !artistSlug.trim()}
                className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded hover:bg-white"
                data-testid="button-link-profile"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link Profile"
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center">
              <button
                onClick={() => {
                  setShowLinkProfile(false);
                  setError("");
                  setNeedsConfirmation(false);
                }}
                className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showSetPassword) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl mb-2 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
                Set Your Password
              </h1>
              <p className="text-sm text-[#F5F0E8]/60">
                Create a password to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-email-set"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-confirm-password"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !newPassword.trim() || !confirmPassword.trim()}
                className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded hover:bg-white"
                data-testid="button-set-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  "Set Password & Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center">
              <button
                onClick={() => {
                  setShowSetPassword(false);
                  setError("");
                }}
                className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showMagicLink) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl mb-2 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
                Get a login link
              </h1>
              <p className="text-sm text-[#F5F0E8]/60">
                We'll email you a link to access your dashboard
              </p>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-email-magic"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded hover:bg-white"
                data-testid="button-send-link"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Login Link"
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center">
              <button
                onClick={() => setShowMagicLink(false)}
                className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              >
                Back to password login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl mb-2 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
              Sign in
            </h1>
            <p className="text-sm text-[#F5F0E8]/60">
              Access your dashboard
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 pr-12 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F0E8]/40 hover:text-[#F5F0E8]/70"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded hover:bg-white"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center space-y-3">
            <button
              onClick={() => setShowSetPassword(true)}
              className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              data-testid="button-set-password-link"
            >
              Need to set or reset your password?
            </button>
            <button
              onClick={() => setShowMagicLink(true)}
              className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
            >
              Get a login link instead
            </button>
            <p className="text-xs text-[#F5F0E8]/50">
              New here?{" "}
              <a href="/secretary" className="underline hover:text-[#F5F0E8]">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
