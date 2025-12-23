import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";

export default function SetupSquare() {
  const [, params] = useRoute("/setup/:artistSlug/square");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    accessToken: "",
    locationId: "",
    environment: "production",
  });

  const { data: artist, isLoading } = useQuery({
    queryKey: ["/api/public/artists", artistSlug, "setup"],
    queryFn: async () => {
      const res = await fetch(`/api/public/artists/${artistSlug}`);
      if (!res.ok) throw new Error("Artist not found");
      return res.json();
    },
    enabled: !!artistSlug
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/setup/${artistSlug}/square`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save Square settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved!", description: "Square settings saved successfully." });
      setLocation(`/setup/${artistSlug}/contract`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
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

        <div className="p-5 border mb-8 flex items-start gap-4" style={{ borderColor: "hsl(36 8% 75%)", background: "hsl(36 10% 85%)" }}>
          <CreditCard size={20} style={{ color: "hsl(38 35% 45%)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm mb-2">You'll need your Square credentials to accept payments.</p>
            <a 
              href="https://developer.squareup.com/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline"
              style={{ color: "hsl(38 35% 45%)" }}
            >
              Open Square Developer Dashboard
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs block mb-2" style={{ color: "hsl(0 0% 30%)" }}>Square Access Token</label>
            <input 
              type="text" 
              name="access_token" 
              required
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              className="w-full border p-4 text-sm focus:outline-none"
              style={{ 
                background: "hsl(36 10% 85%)", 
                borderColor: "hsl(36 8% 75%)",
                color: "hsl(0 0% 8%)"
              }}
              placeholder="sq0atp-xxxxxxxxxxxxx"
              data-testid="input-square-token"
            />
            <p className="text-[10px] mt-2" style={{ color: "hsl(0 0% 35%)" }}>
              Found under Credentials in your Square app
            </p>
          </div>

          <div>
            <label className="text-xs block mb-2" style={{ color: "hsl(0 0% 30%)" }}>Location ID</label>
            <input 
              type="text" 
              name="location_id" 
              required
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full border p-4 text-sm focus:outline-none"
              style={{ 
                background: "hsl(36 10% 85%)", 
                borderColor: "hsl(36 8% 75%)",
                color: "hsl(0 0% 8%)"
              }}
              placeholder="LXXXXXXXXXXXXXXXXXX"
              data-testid="input-location-id"
            />
          </div>

          <div>
            <label className="text-xs block mb-2" style={{ color: "hsl(0 0% 30%)" }}>Environment</label>
            <select 
              name="environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              className="w-full border p-4 text-sm focus:outline-none"
              style={{ 
                background: "hsl(36 10% 85%)", 
                borderColor: "hsl(36 8% 75%)",
                color: "hsl(0 0% 8%)"
              }}
              data-testid="select-environment"
            >
              <option value="production">Production (Live Payments)</option>
              <option value="sandbox">Sandbox (Testing)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full border py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            style={{ 
              borderColor: "hsl(0 0% 8%)",
              background: "hsl(0 0% 8%)",
              color: "hsl(36 12% 88%)"
            }}
            data-testid="button-save-continue"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save & Continue"
            )}
          </button>
          
          <a 
            href={`/setup/${artistSlug}/contract`}
            className="block text-center text-xs transition underline"
            style={{ color: "hsl(0 0% 35%)" }}
            data-testid="link-skip"
          >
            Skip for now
          </a>
        </form>
      </main>
    </div>
  );
}
