import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy } from "lucide-react";

export default function SecretaryOnboarding() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{
    secretaryLink: string;
    adminLink: string;
    businessName: string;
    artistSlug: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.businessName.trim() || !formData.email.trim()) {
      setError("Please enter your business name and email.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/public/secretary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to create your inquire link");
      }
      
      setResult({
        secretaryLink: data.secretaryLink,
        adminLink: `https://beauvette.app/admin/${data.artistSlug}`,
        businessName: formData.businessName,
        artistSlug: data.artistSlug,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  if (success && result) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto px-8 py-16 text-center">
          <div className="mb-12">
            <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mb-3">success</p>
            <h1 className="text-4xl italic text-white/90 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {result.businessName}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed" style={{ fontFamily: "'Libre Baskerville', serif" }}>
              Your Inquire Link is ready. Share it with clients to start receiving inquiries.
            </p>
          </div>

          <div className="space-y-6 mb-12">
            <div className="p-6 border border-gray-800 group relative">
              <p className="text-xs tracking-[0.2em] uppercase text-gray-500 mb-3">Your Client Inquiry Link</p>
              <p className="text-white/90 break-all" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {result.secretaryLink}
              </p>
              <button 
                onClick={() => copyToClipboard(result.secretaryLink)}
                className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="button-copy-inquiry-link"
              >
                <Copy size={16} className="text-gray-500 hover:text-white" />
              </button>
            </div>

            <div className="p-6 border border-gray-800 group relative">
              <p className="text-xs tracking-[0.2em] uppercase text-gray-500 mb-3">Your Admin Dashboard</p>
              <p className="text-white/90 break-all" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                {result.adminLink}
              </p>
              <button 
                onClick={() => copyToClipboard(result.adminLink)}
                className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="button-copy-admin-link"
              >
                <Copy size={16} className="text-gray-500 hover:text-white" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <a 
              href={`/setup/${result.artistSlug}/square`}
              className="block w-full border border-white/30 py-5 text-sm tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all duration-500"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="button-go-to-dashboard"
            >
              Continue Setup
            </a>
            <a 
              href={result.secretaryLink}
              className="block w-full border border-gray-700 py-5 text-sm tracking-[0.15em] uppercase text-gray-400 hover:border-gray-500 hover:text-white transition-all duration-500"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="button-preview-form"
            >
              Preview Inquiry Form
            </a>
          </div>

          <div className="mt-12">
            <p className="text-xs text-gray-500">Bookmark your admin dashboard to manage inquiries</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto px-8 py-16">
        <div className="mb-12 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mb-3">custom secretary</p>
          <h1 className="text-4xl italic text-white/90 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Create Your Inquire Link
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed" style={{ fontFamily: "'Libre Baskerville', serif" }}>
            Generate a branded inquiry link for your clients. Simple, elegant, yours.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="text-lg text-white/80 block mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Business Name
            </label>
            <input 
              type="text" 
              name="business_name" 
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-transparent border border-gray-800 p-4 text-white/80 focus:border-gray-600 focus:outline-none transition"
              style={{ fontFamily: "'Libre Baskerville', serif" }}
              placeholder="Your Business Name"
              data-testid="input-business-name"
            />
            <p className="text-xs text-gray-500 mt-2">
              This becomes your unique link: /inquire/your-business-name
            </p>
          </div>

          <div>
            <label className="text-lg text-white/80 block mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Email Address
            </label>
            <input 
              type="email" 
              name="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-transparent border border-gray-800 p-4 text-white/80 focus:border-gray-600 focus:outline-none transition"
              style={{ fontFamily: "'Libre Baskerville', serif" }}
              placeholder="hello@yourbusiness.com"
              data-testid="input-email"
            />
            <p className="text-xs text-gray-500 mt-2">
              Inquiry notifications will be sent here
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full border border-white/30 py-5 text-sm tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all duration-500 disabled:opacity-50"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="button-create-link"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create My Inquire Link"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
