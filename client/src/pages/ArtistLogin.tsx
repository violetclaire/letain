import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function ArtistLogin() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

      await refetch();
      
      // Redirect artists to their admin dashboard on dateinquiry.com
      if (data.user?.role === "artist" && data.artistSlug) {
        // Use window.location for cross-domain redirect
        window.location.href = `https://dateinquiry.com/admin/${data.artistSlug}`;
      } else if (data.user?.role === "artist") {
        setLocation("/artist");
      } else {
        setError("This login is for artists only");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              Artist Login
            </h1>
            <p className="text-sm text-[#F5F0E8]/60">
              Sign in to your dashboard
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
            <p className="text-xs text-[#F5F0E8]/50">
              <a href="/forgot-password" className="underline hover:text-[#F5F0E8]">
                Forgot your password?
              </a>
            </p>
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
