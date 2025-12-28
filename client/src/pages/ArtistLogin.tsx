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
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: "hsl(36 12% 88%)" }}>
      <div className="estate-pinstripe" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="p-8 md:p-10 border" style={{ background: "hsl(36 18% 93%)", borderColor: "hsl(36 8% 75%)" }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl mb-2 tracking-tight" style={{ fontFamily: "'Fraunces', Georgia, serif", color: "hsl(0 0% 10%)" }}>
              Artist Login
            </h1>
            <p className="text-sm" style={{ color: "hsl(0 0% 35%)" }}>
              Sign in to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide" style={{ color: "hsl(0 0% 35%)" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border px-4 py-3 text-sm focus:outline-none focus:ring-1"
                style={{ 
                  borderColor: "hsl(36 8% 75%)", 
                  background: "white",
                  color: "hsl(0 0% 10%)"
                }}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide" style={{ color: "hsl(0 0% 35%)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border px-4 py-3 text-sm focus:outline-none focus:ring-1 pr-12"
                  style={{ 
                    borderColor: "hsl(36 8% 75%)", 
                    background: "white",
                    color: "hsl(0 0% 10%)"
                  }}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "hsl(0 0% 35%)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full py-3 text-sm uppercase tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ 
                background: "hsl(0 0% 10%)", 
                color: "hsl(36 10% 92%)"
              }}
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

          <div className="mt-6 pt-4 border-t text-center space-y-3" style={{ borderColor: "hsl(36 8% 80%)" }}>
            <p className="text-xs" style={{ color: "hsl(0 0% 45%)" }}>
              <a href="/forgot-password" className="underline hover:opacity-70">
                Forgot your password?
              </a>
            </p>
            <p className="text-xs" style={{ color: "hsl(0 0% 45%)" }}>
              New here?{" "}
              <a href="/secretary" className="underline hover:opacity-70">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
