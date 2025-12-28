import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function ArtistLogin() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"choose" | "password" | "magic">("choose");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

      // Redirect artists to their dashboard
      if (data.user?.role === "artist") {
        const isDateInquiry = window.location.hostname.includes('dateinquiry');
        
        if (isDateInquiry) {
          // On dateinquiry.com - use slug from login response
          if (data.artistSlug) {
            window.location.href = `/admin/${data.artistSlug}`;
            return;
          }
          // Fallback: try fetching from /api/auth/user
          const userRes = await fetch('/api/auth/user', { credentials: 'include' });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData?.artistSlug) {
              window.location.href = `/admin/${userData.artistSlug}`;
              return;
            }
          }
          // Final fallback - show error
          setError("Could not find your artist profile. Please contact support.");
        } else {
          // On beauvette.app - go to full dashboard
          await refetch();
          setLocation("/artist");
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

  // Magic link sent confirmation
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
            <p className="text-xs text-[#F5F0E8]/40">
              Click the link in your email to access your dashboard. The link will expire in 24 hours.
            </p>
            <button
              onClick={() => {
                setMagicLinkSent(false);
                setMode("choose");
                setEmail("");
              }}
              className="mt-6 text-sm text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
            >
              Use a different email
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Choose login method
  if (mode === "choose") {
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
                Welcome back
              </h1>
              <p className="text-sm text-[#F5F0E8]/60">
                How would you like to sign in?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setMode("magic")}
                className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-4 text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-3 rounded hover:bg-white"
                data-testid="button-magic-link"
              >
                <Mail className="w-4 h-4" />
                Email me a login link
              </button>
              
              <button
                onClick={() => setMode("password")}
                className="w-full border border-[#F5F0E8]/20 text-[#F5F0E8] py-4 text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-3 rounded hover:bg-[#F5F0E8]/5"
                data-testid="button-password-login"
              >
                Sign in with password
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center">
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

  // Magic link form
  if (mode === "magic") {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
            <button
              onClick={() => setMode("choose")}
              className="flex items-center gap-2 text-sm text-[#F5F0E8]/50 hover:text-[#F5F0E8] mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
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
          </div>
        </motion.div>
      </div>
    );
  }

  // Password login form
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="p-8 md:p-10 border border-[#F5F0E8]/20 rounded">
          <button
            onClick={() => setMode("choose")}
            className="flex items-center gap-2 text-sm text-[#F5F0E8]/50 hover:text-[#F5F0E8] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl mb-2 tracking-tight text-[#F5F0E8]" style={{ fontFamily: "'Fraunces', serif" }}>
              Sign in
            </h1>
            <p className="text-sm text-[#F5F0E8]/60">
              Enter your email and password
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

          <div className="mt-6 pt-4 border-t border-[#F5F0E8]/10 text-center">
            <p className="text-xs text-[#F5F0E8]/50">
              <a href="/forgot-password" className="underline hover:text-[#F5F0E8]">
                Forgot your password?
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
