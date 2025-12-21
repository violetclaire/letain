import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Copy, Instagram, Mail, Building2, Sparkles, ArrowRight } from "lucide-react";

export default function SecretaryOnboarding() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [secretaryLink, setSecretaryLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    instagram: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName.trim() || !formData.email.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your business name and email.",
        variant: "destructive",
      });
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
      
      setSecretaryLink(data.secretaryLink);
      setBusinessName(formData.businessName);
      setSuccess(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(secretaryLink);
    toast({
      title: "Link Copied!",
      description: "Your secretary link has been copied to clipboard.",
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Welcome, {businessName}!
            </h1>
            <p className="text-gray-600 mb-6">
              Your custom secretary link is ready. Share this with clients so they can book with you.
            </p>
            
            <div className="bg-[#5A1F2B]/5 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">Your Secretary Link</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={secretaryLink}
                  readOnly
                  className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-medium text-[#5A1F2B]"
                  data-testid="input-secretary-link"
                />
                <Button
                  onClick={copyLink}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  data-testid="button-copy-link"
                >
                  <Copy size={14} /> Copy
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 text-left bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-sm text-gray-900">What's Next?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <ArrowRight size={14} className="mt-1 text-[#5A1F2B]" />
                  <span>Share your link on Instagram, your website, or directly with clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight size={14} className="mt-1 text-[#5A1F2B]" />
                  <span>Clients can submit inquiries through your custom page</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight size={14} className="mt-1 text-[#5A1F2B]" />
                  <span>Log in to your dashboard to manage bookings and contracts</span>
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.href = "/login"}
                variant="outline"
                className="flex-1"
                data-testid="button-login"
              >
                Log In
              </Button>
              <Button
                onClick={() => window.location.href = secretaryLink}
                className="flex-1 bg-[#5A1F2B] hover:bg-[#4a1925]"
                data-testid="button-view-page"
              >
                View Your Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#5A1F2B]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-[#5A1F2B]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Create Your Secretary Link
            </h1>
            <p className="text-gray-600">
              Get a custom booking page where clients can inquire about your services
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="businessName" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Building2 size={14} /> Business Name
              </Label>
              <Input
                id="businessName"
                type="text"
                placeholder="e.g., The Makeup Dolls"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="bg-white"
                data-testid="input-business-name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to create your unique link
              </p>
            </div>
            
            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Mail size={14} /> Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white"
                data-testid="input-email"
              />
            </div>
            
            <div>
              <Label htmlFor="instagram" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Instagram size={14} /> Instagram Handle <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="instagram"
                type="text"
                placeholder="@yourbusiness"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="bg-white"
                data-testid="input-instagram"
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5A1F2B] hover:bg-[#4a1925] h-12 text-base"
              data-testid="button-create-link"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Your Link...
                </>
              ) : (
                "Create My Secretary Link"
              )}
            </Button>
          </form>
          
          <p className="text-center text-xs text-gray-500 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-[#5A1F2B] underline">
              Log in here
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
