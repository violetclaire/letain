import { useState, useEffect } from "react";
import { useLocation, useSearch, useParams } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useParams<{ token?: string }>();
  const token = params.token || new URLSearchParams(search).get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      return;
    }
    // Token validation happens on submit, so just mark as valid if we have a token
    setIsValidToken(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      setSuccess(true);
      
      if (data.artistSlug) {
        setTimeout(() => {
          setLocation(`/admin/${data.artistSlug}`);
        }, 1500);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5F0E8]/40" />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1A1A1A] p-8 rounded border border-[#F5F0E8]/20 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Invalid Link</h1>
            <p className="text-sm text-[#F5F0E8]/60 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              onClick={() => setLocation("/forgot-password")}
              className="w-full bg-[#F5F0E8] text-[#1A1A1A] text-sm uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
              data-testid="button-request-new"
            >
              Request New Link
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
        <div className="bg-[#1A1A1A] p-8 rounded border border-[#F5F0E8]/20">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Password Reset!</h1>
              <p className="text-sm text-[#F5F0E8]/60 mb-6">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => setLocation("/artist-login")}
                className="w-full bg-[#F5F0E8] text-[#1A1A1A] text-sm uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
                data-testid="button-go-to-login"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Reset Password</h1>
                <p className="text-sm text-[#F5F0E8]/60">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full border border-[#F5F0E8]/20 bg-transparent rounded px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 pr-12 placeholder:text-[#F5F0E8]/30"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F5F0E8]/40 hover:text-[#F5F0E8]/70"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-[#F5F0E8]/40">
                    At least 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full border border-[#F5F0E8]/20 bg-transparent rounded px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30"
                    data-testid="input-confirm-password"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded" data-testid="text-reset-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#F5F0E8] text-[#1A1A1A] text-sm uppercase tracking-widest py-3 rounded hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-reset-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
