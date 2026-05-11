import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CreditCard, Check, ArrowRight } from "lucide-react";

export default function SetupSquare() {
  const [, params] = useRoute("/setup/:artistSlug/square");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  
  // Check if square=success in URL (just connected)
  const urlParams = new URLSearchParams(window.location.search);
  const justConnected = urlParams.get('square') === 'success';

  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ["/api/public/artists", artistSlug, "setup"],
    queryFn: async () => {
      const res = await fetch(`/api/public/artists/${artistSlug}`);
      if (!res.ok) throw new Error("Artist not found");
      return res.json();
    },
    enabled: !!artistSlug
  });

  const { data: squareStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/square/connect/status", artistSlug],
    queryFn: async () => {
      const res = await fetch(`/api/square/connect/status/${artistSlug}`);
      if (!res.ok) return { connected: false };
      return res.json();
    },
    enabled: !!artistSlug
  });

  const isLoading = artistLoading || statusLoading;
  const isConnected = squareStatus?.connected || justConnected;

  const handleConnect = () => {
    // Redirect to Square OAuth via our backend
    window.location.href = `/api/square/connect/start/${artistSlug}`;
  };

  const handleContinue = () => {
    setLocation(`/setup/${artistSlug}/contract`);
  };

  const handleSkip = () => {
    setLocation(`/setup/${artistSlug}/contract`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(36 12% 88%)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(0 0% 30%)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(36 12% 88%)", color: "hsl(0 0% 8%)", fontFamily: "'Inter', sans-serif" }}>
      <div className="estate-pinstripe" />
      
      <header className="px-8 py-6 border-b" style={{ borderColor: "hsl(36 8% 75%)" }}>
        <h1 className="text-sm tracking-[0.3em] font-light lowercase text-center" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          {artist?.businessName || artist?.name || artistSlug}
        </h1>
      </header>

      <main className="max-w-lg mx-auto px-8 py-12">
        <div className="mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(38 35% 45%)" }}>Step 1 of 3</p>
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Connect Square
          </h2>
          <p className="text-sm" style={{ color: "hsl(0 0% 30%)" }}>Accept payments from your clients securely</p>
        </div>

        {isConnected ? (
          <div className="space-y-6">
            <div className="p-6 border flex items-center gap-4" style={{ borderColor: "hsl(142 76% 36%)", background: "hsl(142 76% 96%)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(142 76% 36%)" }}>
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-medium" style={{ color: "hsl(142 76% 26%)" }}>Square Connected</p>
                <p className="text-sm" style={{ color: "hsl(142 50% 30%)" }}>You can now accept payments from clients</p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-4 flex items-center justify-center gap-2 text-sm tracking-wider"
              style={{ 
                background: "hsl(0 0% 8%)", 
                color: "hsl(36 10% 92%)"
              }}
              data-testid="button-continue"
            >
              Continue to Contract
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-5 border flex items-start gap-4" style={{ borderColor: "hsl(36 8% 75%)", background: "hsl(36 10% 85%)" }}>
              <CreditCard size={20} style={{ color: "hsl(38 35% 45%)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm mb-1">Connect your Square account to accept payments</p>
                <p className="text-xs" style={{ color: "hsl(0 0% 35%)" }}>
                  You'll be redirected to Square to log in and authorize access
                </p>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="w-full py-4 text-sm tracking-wider"
              style={{ 
                background: "hsl(0 0% 8%)", 
                color: "hsl(36 10% 92%)"
              }}
              data-testid="button-connect-square"
            >
              Connect with Square
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 text-sm underline"
              style={{ color: "hsl(0 0% 35%)" }}
              data-testid="button-skip"
            >
              Skip for now
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
