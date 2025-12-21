import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SetupContract() {
  const [, params] = useRoute("/setup/:artistSlug/contract");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  
  const [contractTemplate, setContractTemplate] = useState("");

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
      const res = await fetch(`/api/public/setup/${artistSlug}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractTemplate }),
      });
      if (!res.ok) throw new Error("Failed to save contract template");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved!", description: "Contract template saved successfully." });
      setLocation(`/setup/${artistSlug}/links`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save contract template.", variant: "destructive" });
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
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400 mb-2">Step 2 of 3</p>
          <h2 className="text-3xl italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Contract Template
          </h2>
          <p className="text-gray-400 text-sm">This will be your default service agreement for clients</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Your Contract Template</label>
            <textarea 
              name="contract_template" 
              rows={12} 
              required
              value={contractTemplate}
              onChange={(e) => setContractTemplate(e.target.value)}
              className="w-full bg-transparent border border-gray-700 p-4 text-sm focus:border-white focus:outline-none resize-none"
              placeholder={`SERVICES
Bridal Makeup & Hair: $1,000
Single Service: $750

BOOKING TERMS
- 50% retainer to secure date
- Balance due 2 weeks before event
- Non-refundable retainer

CANCELLATION
- 30+ days: Retainer forfeited
- Less than 30 days: Full balance due`}
              data-testid="input-contract-template"
            />
            <p className="text-[10px] text-gray-500 mt-2">
              Tip: Use ALL CAPS for section headers. They'll be styled automatically.
            </p>
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
            href={`/setup/${artistSlug}/links`}
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
