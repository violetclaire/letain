import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
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
      
      if (data.user?.role) {
        switch (data.user.role) {
          case "client":
            setLocation("/client");
            break;
          case "artist":
            setLocation("/artist");
            break;
          case "planner":
            setLocation("/planner");
            break;
          case "admin":
            setLocation("/admin");
            break;
          default:
            setLocation("/register");
        }
      } else {
        setLocation("/register");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#3d1a22] flex items-center justify-center p-4 relative">
      {/* Pinstripe fabric texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage: 'url(/attached_assets/u4728191363_seamless_repeating_pinstripe_suiting_fabric_textu__1766382482762.png)',
          backgroundRepeat: 'repeat',
          backgroundSize: '500px'
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#f5f3ef] p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl text-[#3d1a22] mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-[#3d1a22]/60">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[#3d1a22]/60">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full border border-[#3d1a22]/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3d1a22]/40 text-[#3d1a22]"
                data-testid="input-login-email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-[#3d1a22]/60">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-[#3d1a22]/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3d1a22]/40 pr-12 text-[#3d1a22]"
                  data-testid="input-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d1a22]/40 hover:text-[#3d1a22]/70"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-700 text-sm text-center bg-red-50 p-3 border border-red-200" data-testid="text-login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3d1a22] text-[#f5f3ef] text-sm uppercase tracking-widest py-3.5 hover:bg-[#2d1219] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-login-submit"
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

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={() => setLocation("/forgot-password")}
              className="text-sm text-[#3d1a22]/70 underline hover:text-[#3d1a22] transition-colors"
              data-testid="link-forgot-password"
            >
              Forgot your password?
            </button>
            <p className="text-sm text-[#3d1a22]/60">
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/signup")}
                className="text-[#3d1a22] underline hover:text-[#3d1a22]/80 transition-colors font-medium"
                data-testid="link-to-signup"
              >
                Create one
              </button>
            </p>
          </div>

          <button
            onClick={() => setLocation("/")}
            className="mt-6 w-full text-center text-xs text-[#3d1a22]/40 hover:text-[#3d1a22]/60 transition-colors uppercase tracking-wide"
            data-testid="button-back-home"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
