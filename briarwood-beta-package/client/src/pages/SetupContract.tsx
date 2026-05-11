import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Check } from "lucide-react";

export default function SetupContract() {
  const [, params] = useRoute("/setup/:artistSlug/contract");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  
  const [contractChoice, setContractChoice] = useState<"upload" | "template" | null>(null);
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
      if (contractChoice === "upload") {
        // For upload choice, just mark that they want to use their own contract
        // They'll upload it from the dashboard
        const res = await fetch(`/api/public/setup/${artistSlug}/contract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractTemplate: "[CUSTOM_CONTRACT_UPLOAD]" }),
        });
        if (!res.ok) throw new Error("Failed to save preference");
        return res.json();
      } else {
        const res = await fetch(`/api/public/setup/${artistSlug}/contract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractTemplate }),
        });
        if (!res.ok) throw new Error("Failed to save contract template");
        return res.json();
      }
    },
    onSuccess: () => {
      if (contractChoice === "upload") {
        toast({ title: "Got it!", description: "You can upload your contract from your dashboard." });
      } else {
        toast({ title: "Saved!", description: "Contract template saved successfully." });
      }
      setLocation(`/setup/${artistSlug}/links`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractChoice) {
      toast({ title: "Please select an option", description: "Choose to upload your contract or use a template.", variant: "destructive" });
      return;
    }
    if (contractChoice === "template" && !contractTemplate.trim()) {
      toast({ title: "Template empty", description: "Please enter your contract terms.", variant: "destructive" });
      return;
    }
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
          <p className="text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(38 35% 45%)" }}>Step 2 of 3</p>
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Your Contract
          </h2>
          <p className="text-sm" style={{ color: "hsl(0 0% 30%)" }}>How would you like to set up your service agreement?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setContractChoice("upload")}
              className={`w-full p-6 border text-left transition-all ${
                contractChoice === "upload" 
                  ? "border-2" 
                  : "hover:border-opacity-60"
              }`}
              style={{ 
                borderColor: contractChoice === "upload" ? "hsl(0 0% 8%)" : "hsl(36 8% 75%)",
                background: contractChoice === "upload" ? "hsl(36 10% 85%)" : "transparent"
              }}
              data-testid="button-choice-upload"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded" style={{ background: "hsl(36 8% 82%)" }}>
                  <Upload size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Upload My Contract</p>
                    {contractChoice === "upload" && <Check size={18} style={{ color: "hsl(38 35% 45%)" }} />}
                  </div>
                  <p className="text-xs mt-1" style={{ color: "hsl(0 0% 30%)" }}>
                    I have my own contract ready as a PDF
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setContractChoice("template")}
              className={`w-full p-6 border text-left transition-all ${
                contractChoice === "template" 
                  ? "border-2" 
                  : "hover:border-opacity-60"
              }`}
              style={{ 
                borderColor: contractChoice === "template" ? "hsl(0 0% 8%)" : "hsl(36 8% 75%)",
                background: contractChoice === "template" ? "hsl(36 10% 85%)" : "transparent"
              }}
              data-testid="button-choice-template"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded" style={{ background: "hsl(36 8% 82%)" }}>
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Use a Template</p>
                    {contractChoice === "template" && <Check size={18} style={{ color: "hsl(38 35% 45%)" }} />}
                  </div>
                  <p className="text-xs mt-1" style={{ color: "hsl(0 0% 30%)" }}>
                    Start with our professional template and customize it
                  </p>
                </div>
              </div>
            </button>
          </div>

          {contractChoice === "upload" && (
            <div className="p-6 border" style={{ borderColor: "hsl(36 8% 75%)", background: "hsl(36 10% 85%)" }}>
              <div className="flex items-start gap-4">
                <FileText size={20} style={{ color: "hsl(38 35% 45%)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-sm mb-2">Perfect! You can upload your contract PDF from your dashboard after completing setup.</p>
                  <p className="text-xs" style={{ color: "hsl(0 0% 35%)" }}>
                    Go to Dashboard → Settings → Contract to upload your file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {contractChoice === "template" && (
            <div>
              <label className="text-xs block mb-2" style={{ color: "hsl(0 0% 30%)" }}>Your Contract Terms</label>
              <textarea 
                name="contract_template" 
                rows={12} 
                value={contractTemplate}
                onChange={(e) => setContractTemplate(e.target.value)}
                className="w-full border p-4 text-sm focus:outline-none resize-none"
                style={{ 
                  background: "hsl(36 10% 85%)", 
                  borderColor: "hsl(36 8% 75%)",
                  color: "hsl(0 0% 8%)"
                }}
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
              <p className="text-[10px] mt-2" style={{ color: "hsl(0 0% 35%)" }}>
                Tip: Use ALL CAPS for section headers. They'll be styled automatically.
              </p>
            </div>
          )}

          <button 
            type="submit"
            disabled={saveMutation.isPending || !contractChoice}
            className="w-full border py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            style={{ 
              borderColor: "hsl(0 0% 8%)",
              background: contractChoice ? "hsl(0 0% 8%)" : "transparent",
              color: contractChoice ? "hsl(36 12% 88%)" : "hsl(0 0% 8%)"
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
            href={`/setup/${artistSlug}/links`}
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
