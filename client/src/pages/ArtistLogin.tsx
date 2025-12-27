import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, Mail } from "lucide-react";

export default function ArtistLogin() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const requestLink = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/artists/resend-settings-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      setError("");
    },
    onError: () => {
      setError("Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      requestLink.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-[#3d1a22] flex items-center justify-center p-4 relative">
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
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
              <h1 className="font-serif text-2xl md:text-3xl text-[#3d1a22] mb-3">Check Your Email</h1>
              <p className="text-[#3d1a22]/60 text-sm leading-relaxed mb-6">
                If this email is registered, you'll receive your private dashboard link shortly. Check your inbox (and spam folder just in case).
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-[#3d1a22] underline text-sm hover:text-[#3d1a22]/70"
                data-testid="button-try-different-email"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-[#3d1a22]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-[#3d1a22]" />
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-[#3d1a22] mb-2 tracking-tight">Artist Login</h1>
                <p className="text-sm text-[#3d1a22]/60">Enter your email to receive your dashboard link</p>
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
                    data-testid="input-artist-email"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={requestLink.isPending || !email.trim()}
                  className="w-full bg-[#3d1a22] text-[#f5f3ef] py-3 text-sm uppercase tracking-wide hover:bg-[#2d1018] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-link"
                >
                  {requestLink.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send My Dashboard Link"
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#3d1a22]/10 text-center">
                <p className="text-xs text-[#3d1a22]/50">
                  New to Beauvette?{" "}
                  <a href="/secretary" className="underline hover:text-[#3d1a22]/70">
                    Sign up here
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
