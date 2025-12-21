import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SetupSquare() {
  const [, params] = useRoute("/setup/:artistSlug/square");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    accessToken: "",
    locationId: "",
    environment: "sandbox",
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
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <header className="px-8 py-6 border-b border-gray-900">
        <h1 className="text-sm tracking-[0.3em] font-light lowercase text-center">
          {artist?.businessName || artist?.name || artistSlug}
        </h1>
      </header>

      <main className="max-w-lg mx-auto px-8 py-12">
        <div className="mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400 mb-2">Step 1 of 3</p>
          <h2 className="text-3xl italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Connect Square
          </h2>
          <p className="text-gray-400 text-sm">Accept payments from clients with Square</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Square Access Token</label>
            <input 
              type="text" 
              name="access_token" 
              required
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              className="w-full bg-transparent border border-gray-700 p-4 text-sm focus:border-white focus:outline-none"
              placeholder="sq0atp-xxxxxxxxxxxxx"
              data-testid="input-square-token"
            />
            <p className="text-[10px] text-gray-500 mt-2">
              Find this in your{" "}
              <a 
                href="https://developer.squareup.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-400 underline"
              >
                Square Developer Dashboard
              </a>
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Location ID</label>
            <input 
              type="text" 
              name="location_id" 
              required
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full bg-transparent border border-gray-700 p-4 text-sm focus:border-white focus:outline-none"
              placeholder="LXXXXXXXXXXXXXXXXXX"
              data-testid="input-location-id"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Environment</label>
            <select 
              name="environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              className="w-full bg-black border border-gray-700 p-4 text-sm focus:border-white focus:outline-none"
              data-testid="select-environment"
            >
              <option value="production">Production (Live Payments)</option>
              <option value="sandbox">Sandbox (Testing)</option>
            </select>
          </div>

          <button 
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full border border-white py-4 text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
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
            className="block text-center text-gray-500 text-xs hover:text-white transition"
            data-testid="link-skip"
          >
            Skip for now
          </a>
        </form>
      </main>
    </div>
  );
}
