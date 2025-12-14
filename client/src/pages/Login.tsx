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
    <div className="min-h-screen bg-[#FCF9F4] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="border border-[#5A1F2B] p-1">
          <div className="border border-[#FCF9F4] p-1">
            <div className="border border-[#5A1F2B] p-8 bg-[#FCF9F4]">
              <div className="text-center mb-8">
                <h1 className="font-script text-4xl text-[#5A1F2B] mb-2">Welcome Back</h1>
                <p className="text-sm text-[#5A1F2B]/60">Sign in to your Beauvette account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-[#5A1F2B]/60">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full border border-[#5A1F2B]/30 bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A1F2B]/30 text-[#5A1F2B]"
                    data-testid="input-login-email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-[#5A1F2B]/60">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full border border-[#5A1F2B]/30 bg-white rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A1F2B]/30 pr-12 text-[#5A1F2B]"
                      data-testid="input-login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A1F2B]/40 hover:text-[#5A1F2B]/70"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded" data-testid="text-login-error">
                    {error}
                  </div>
                )}

                <div className="w-full bg-[#5A1F2B] p-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#5A1F2B] text-[#FCF9F4] text-sm uppercase tracking-widest py-3 border border-[#FCF9F4]/40 hover:bg-[#4a1923] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                </div>
              </form>

              <div className="mt-6 text-center space-y-3">
                <button
                  onClick={() => setLocation("/forgot-password")}
                  className="text-sm text-[#5A8BA3] underline hover:text-[#4A7A92] transition-colors"
                  data-testid="link-forgot-password"
                >
                  Forgot your password?
                </button>
                <p className="text-sm text-[#5A1F2B]/60">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setLocation("/signup")}
                    className="text-[#5A8BA3] underline hover:text-[#4A7A92] transition-colors"
                    data-testid="link-to-signup"
                  >
                    Create one
                  </button>
                </p>
              </div>

              <button
                onClick={() => setLocation("/")}
                className="mt-4 w-full text-center text-xs text-[#5A1F2B]/40 hover:text-[#5A1F2B]/60 transition-colors"
                data-testid="button-back-home"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
