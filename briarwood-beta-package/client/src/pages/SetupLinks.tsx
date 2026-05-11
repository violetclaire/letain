import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

interface LinkItem {
  label: string;
  url: string;
}

export default function SetupLinks() {
  const [, params] = useRoute("/setup/:artistSlug/links");
  const [, setLocation] = useLocation();
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  
  const [links, setLinks] = useState<LinkItem[]>([
    { label: "", url: "" },
    { label: "", url: "" },
    { label: "", url: "" },
  ]);

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
      const validLinks = links.filter(l => l.label.trim() && l.url.trim());
      const prettyLinks: Record<string, string> = {};
      validLinks.forEach(l => {
        prettyLinks[l.label] = l.url;
      });
      
      const res = await fetch(`/api/public/setup/${artistSlug}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prettyLinks }),
      });
      if (!res.ok) throw new Error("Failed to save links");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Setup Complete!", description: "Your profile is ready." });
      setLocation(`/setup/${artistSlug}/complete`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save links.", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const addLink = () => {
    setLinks([...links, { label: "", url: "" }]);
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
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
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400 mb-2">Step 3 of 3</p>
          <h2 className="text-3xl italic mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your Links
          </h2>
          <p className="text-gray-400 text-sm">Add links to share with clients (like Linktree)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={index} className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder={index === 0 ? "Instagram" : index === 1 ? "Website" : index === 2 ? "Portfolio" : "Label"}
                  value={link.label}
                  onChange={(e) => updateLink(index, 'label', e.target.value)}
                  className="bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                  data-testid={`input-link-label-${index}`}
                />
                <input 
                  type="url" 
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => updateLink(index, 'url', e.target.value)}
                  className="bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                  data-testid={`input-link-url-${index}`}
                />
              </div>
            ))}
          </div>
          
          <button 
            type="button" 
            onClick={addLink}
            className="w-full border border-gray-700 py-3 text-xs tracking-widest uppercase text-gray-400 hover:border-white hover:text-white transition flex items-center justify-center gap-2"
            data-testid="button-add-link"
          >
            <Plus size={14} /> Add Another Link
          </button>

          <button 
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full border border-white py-4 text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
            data-testid="button-complete-setup"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Complete Setup"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
