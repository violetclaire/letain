import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle, Search } from "lucide-react";

export default function RecoverAccess() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/inquiry/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      setSuccess(true);
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
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Check Your Email</h1>
              <p className="text-sm text-[#F5F0E8]/60 mb-6">
                If we found any inquiry threads associated with <strong className="text-[#F5F0E8]">{email}</strong>, 
                we've sent you links to access them.
              </p>
              <p className="text-xs text-[#F5F0E8]/40 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="w-full border border-[#F5F0E8]/30 text-[#F5F0E8] text-sm uppercase tracking-widest py-3 rounded hover:border-[#F5F0E8] transition-colors"
              >
                Try Another Email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-[#F5F0E8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-[#F5F0E8]/60" />
                </div>
                <h1 className="text-3xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Find Your Thread</h1>
                <p className="text-sm text-[#F5F0E8]/60">
                  Enter your email and we'll send you links to your inquiry conversations
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-[#F5F0E8]/40">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full border border-[#F5F0E8]/20 bg-transparent rounded px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 pl-10 placeholder:text-[#F5F0E8]/30"
                      data-testid="input-recover-email"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F0E8]/40" />
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 p-3 rounded" data-testid="text-recover-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#F5F0E8] text-[#1A1A1A] text-sm uppercase tracking-widest py-3 rounded hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-recover-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Send Thread Links"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-[#F5F0E8]/40">
                This is for clients who have submitted inquiries. If you're an artist,{" "}
                <a href="/artist-login" className="underline hover:text-[#F5F0E8]/60">
                  sign in here
                </a>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
