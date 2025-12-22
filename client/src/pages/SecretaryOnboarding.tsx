import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy } from "lucide-react";

export default function SecretaryOnboarding() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<{
    adminLink: string;
    businessName: string;
    artistSlug: string;
    embedCode: string;
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
        throw new Error(data.error || "Failed to create your secretary link");
      }
      
      const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const successMessage = "Thank you! We'll be in touch soon.";
      const embedCode = `<!-- ${escapeHtml(formData.businessName)} Inquiry Form -->
<form id="inquiry-form">
  <input type="text" name="clientName" placeholder="Your Name" required />
  <input type="email" name="clientEmail" placeholder="Your Email" required />
  <input type="date" name="eventDate" required />
  <textarea name="message" placeholder="Tell us about your event"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>
<div id="form-success" style="display:none;">${escapeHtml(successMessage)}</div>
<script>
document.getElementById('inquiry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    const res = await fetch('https://beauvette.app/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistSlug: '${data.artistSlug}',
        source: 'website',
        clientName: form.clientName.value,
        clientEmail: form.clientEmail.value,
        eventDate: form.eventDate.value,
        message: form.message.value
      })
    });
    if (res.ok) {
      form.style.display = 'none';
      document.getElementById('form-success').style.display = 'block';
    } else { throw new Error('Failed'); }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Submit Inquiry';
    alert('Something went wrong. Please try again.');
  }
});
<\/script>`;
      
      setResult({
        adminLink: `https://beauvette.app/admin/${data.artistSlug}`,
        businessName: formData.businessName,
        artistSlug: data.artistSlug,
        embedCode,
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
      title: "Copied",
      description: "Link copied to clipboard",
    });
  };

  if (success && result) {
    return (
      <div className="bg-[#F9F8F6] text-[#2D2D2D] min-h-screen flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-lg w-full mx-auto px-8 md:px-16 py-20 text-center">
          <div className="mb-16">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#2D2D2D]/40 mb-4">ready</p>
            <h1 className="text-3xl text-[#2D2D2D] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              {result.businessName}
            </h1>
            <p className="text-sm text-[#2D2D2D]/60 leading-relaxed">
              Your secretary is ready. Add this code to your website's contact page.
            </p>
          </div>

          <div className="space-y-8 mb-16">
            <div className="p-6 border border-[#2D2D2D]/10 group relative text-left">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40">Embed Code for Your Website</p>
                <button 
                  onClick={() => copyToClipboard(result.embedCode)}
                  className="flex items-center gap-2 text-xs text-[#2D2D2D]/50 hover:text-[#2D2D2D] transition-colors"
                  data-testid="button-copy-embed-code"
                >
                  <Copy size={14} />
                  Copy
                </button>
              </div>
              <pre className="text-[#2D2D2D] text-xs bg-[#2D2D2D]/5 p-4 overflow-x-auto max-h-48 overflow-y-auto rounded">
                {result.embedCode}
              </pre>
              <p className="text-[10px] text-[#2D2D2D]/40 mt-4">
                Paste this on your website's contact page. Clients fill out the form on YOUR site. They never see Beauvette.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <a 
              href={`/setup/${result.artistSlug}/square`}
              className="block w-full border border-[#2D2D2D] py-5 text-xs tracking-[0.2em] uppercase hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500"
              data-testid="button-go-to-dashboard"
            >
              Continue Setup
            </a>
          </div>

          <div className="mt-16">
            <p className="text-[10px] text-[#2D2D2D]/40">Bookmark your dashboard to manage inquiries</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F8F6] text-[#2D2D2D] min-h-screen flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg w-full mx-auto px-8 md:px-16 py-20">
        <div className="mb-16 text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#2D2D2D]/40 mb-4">beauvette</p>
          <h1 className="text-3xl text-[#2D2D2D] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            The Secretary
          </h1>
          <p className="text-sm text-[#2D2D2D]/60 leading-relaxed">
            Create your inquiry link. Simple, elegant, yours.
          </p>
        </div>

        {error && (
          <div className="mb-10 p-5 border border-red-200 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
              Business Name
            </label>
            <input 
              type="text" 
              name="business_name" 
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
              placeholder="Your Business Name"
              data-testid="input-business-name"
            />
            <p className="text-[10px] text-[#2D2D2D]/40 mt-3">
              This becomes your unique link
            </p>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
              Email Address
            </label>
            <input 
              type="email" 
              name="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
              placeholder="hello@yourbusiness.com"
              data-testid="input-email"
            />
            <p className="text-[10px] text-[#2D2D2D]/40 mt-3">
              Inquiry notifications will be sent here
            </p>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full border border-[#2D2D2D] py-5 text-xs tracking-[0.2em] uppercase hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500 disabled:opacity-50"
              data-testid="button-create-link"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create My Secretary"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
