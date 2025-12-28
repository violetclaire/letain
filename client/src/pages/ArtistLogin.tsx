import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";

export default function ArtistLogin() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/artist/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setLinkSent(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (linkSent) {
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
              Click the link in your email to access your dashboard.
            </p>
            <button
              onClick={() => {
                setLinkSent(false);
                setEmail("");
              }}
              className="mt-6 text-sm text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
              data-testid="button-different-email"
            >
              Use a different email
            </button>
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
              Enter your email and we'll send you a login link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                "Send me a login link"
              )}
            </button>
          </form>

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
