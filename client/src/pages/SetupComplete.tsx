import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check } from "lucide-react";

export default function SetupComplete() {
  const [, params] = useRoute("/setup/:artistSlug/complete");
  const artistSlug = params?.artistSlug || "";

  const { data: artist, isLoading } = useQuery({
    queryKey: ["/api/public/artists", artistSlug, "setup"],
    queryFn: async () => {
      const res = await fetch(`/api/public/artists/${artistSlug}`);
      if (!res.ok) throw new Error("Artist not found");
      return res.json();
    },
    enabled: !!artistSlug
  });

  const secretaryLink = `https://beauvette.app/inquire/${artistSlug}`;

  if (isLoading) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <main className="max-w-lg mx-auto px-8 py-12 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-green-500 flex items-center justify-center mx-auto mb-6">
          <Check className="h-10 w-10 text-green-500" />
        </div>
        
        <h2 className="text-3xl italic mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          You're All Set!
        </h2>
        <p className="text-gray-400 mb-8">
          You can now send contracts and collect payments directly from your conversation threads.
        </p>
        
        <div className="space-y-4">
          <a 
            href={`/admin/${artistSlug}`}
            className="block w-full border border-white py-4 text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
          </a>
          <p className="text-gray-500 text-xs">
            Your inquire link: {secretaryLink}
          </p>
        </div>
      </main>
    </div>
  );
}
