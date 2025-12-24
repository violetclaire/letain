import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function RecoverAccess() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

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
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      requestLink.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-[#6B4A55] hover:underline mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {sent ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-serif text-[#2D2D2D] mb-3">Check your email</h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              If this email is registered, you'll receive your private settings link shortly. 
              Check your inbox (and spam folder just in case).
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => { setSent(false); setEmail(""); }}
              data-testid="button-try-again"
            >
              Send to a different email
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#6B4A55]/10 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#6B4A55]" />
              </div>
              <div>
                <h1 className="text-xl font-serif text-[#2D2D2D]">Lost your link?</h1>
                <p className="text-gray-500 text-sm">No worries, we'll send it to you</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-700 block mb-2">Your email address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full"
                  data-testid="input-email"
                />
              </div>

              <Button
                type="submit"
                disabled={requestLink.isPending || !email.trim()}
                className="w-full bg-[#6B4A55] hover:bg-[#5A3D47] text-white"
                data-testid="button-send-link"
              >
                {requestLink.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send my settings link"
                )}
              </Button>
            </form>

            <p className="text-xs text-gray-500 mt-6 text-center">
              This is for artists who have already signed up. Need to create an account?{" "}
              <Link href="/signup" className="text-[#6B4A55] underline">
                Sign up here
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
