import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Clock, Briefcase, MapPin, DollarSign, Instagram, Globe, Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ArtistIntake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    businessName: "",
    yearsExperience: "",
    servicesDescription: "",
    serviceAreas: [] as string[],
    priceRange: "",
    portfolioUrl: "",
    instagramHandle: "",
    websiteUrl: "",
    insuranceInfo: "",
    cdiConsent: false,
  });

  const [customServiceArea, setCustomServiceArea] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intakes/artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          yearsExperience: data.yearsExperience ? parseInt(data.yearsExperience) : null,
          serviceTypes: data.servicesDescription ? [data.servicesDescription] : null,
          serviceAreas: data.serviceAreas.length > 0 ? data.serviceAreas : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit intake");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome to Beauvette!", description: "Your vendor profile has been created." });
      setLocation("/artist");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const addServiceArea = () => {
    if (customServiceArea.trim() && !formData.serviceAreas.includes(customServiceArea.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, customServiceArea.trim()]
      }));
      setCustomServiceArea("");
    }
  };

  const removeServiceArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(a => a !== area)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName) {
      toast({ title: "Required", description: "Please enter your business name.", variant: "destructive" });
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-powder-blue py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-cream p-6 rounded-sm shadow-lg border border-black/20">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-black/60 hover:text-black mb-4 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-8">
            <h1 className="font-script text-4xl text-black mb-2">
              Join as a Vendor
            </h1>
            <p className="text-sm text-black/60">
              Tell us about your business to start connecting with clients
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Building2 size={14} /> Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Your business or professional name"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-business-name"
                required
              />
            </div>

            {/* Years Experience */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Clock size={14} /> Years of Experience
              </label>
              <input
                type="number"
                value={formData.yearsExperience}
                onChange={e => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
                placeholder="e.g., 5"
                min="0"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-years-experience"
              />
            </div>

            {/* Services Description */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Briefcase size={14} /> What Services Do You Offer?
              </label>
              <textarea
                value={formData.servicesDescription}
                onChange={e => setFormData(prev => ({ ...prev, servicesDescription: e.target.value }))}
                placeholder="Describe the services you provide (e.g., bridal makeup, hair styling, photography, event planning, catering, etc.)"
                rows={3}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                data-testid="input-services-description"
              />
            </div>

            {/* Service Areas */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <MapPin size={14} /> Service Areas
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customServiceArea}
                  onChange={e => setCustomServiceArea(e.target.value)}
                  placeholder="City or region (e.g., Los Angeles, CA)"
                  className="flex-1 border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                  data-testid="input-service-area"
                />
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                  data-testid="button-add-area"
                >
                  Add
                </button>
              </div>
              {formData.serviceAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.serviceAreas.map(area => (
                    <span
                      key={area}
                      className="bg-black/10 px-3 py-1 rounded-full text-xs flex items-center gap-1"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => removeServiceArea(area)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <DollarSign size={14} /> Price Range
              </label>
              <input
                type="text"
                value={formData.priceRange}
                onChange={e => setFormData(prev => ({ ...prev, priceRange: e.target.value }))}
                placeholder="e.g., $100-300 per service, or hourly rates"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-price-range"
              />
            </div>

            {/* Social/Web Links */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                  <Instagram size={14} /> Instagram Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 text-sm">@</span>
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={e => setFormData(prev => ({ ...prev, instagramHandle: e.target.value.replace('@', '') }))}
                    placeholder="yourusername"
                    className="w-full border border-black/20 bg-white rounded pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                    data-testid="input-instagram"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                  <Globe size={14} /> Website URL
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={e => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  data-testid="input-website"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                  <Globe size={14} /> Portfolio URL
                </label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={e => setFormData(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                  placeholder="Link to your portfolio"
                  className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  data-testid="input-portfolio"
                />
              </div>
            </div>

            {/* Insurance */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Shield size={14} /> Insurance Information (optional)
              </label>
              <textarea
                value={formData.insuranceInfo}
                onChange={e => setFormData(prev => ({ ...prev, insuranceInfo: e.target.value }))}
                placeholder="Details about your business insurance coverage..."
                rows={2}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                data-testid="input-insurance"
              />
            </div>

            {/* Service Quality Consent */}
            <div className="border-t border-black/10 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.cdiConsent}
                  onChange={e => setFormData(prev => ({ ...prev, cdiConsent: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-black/20 text-black focus:ring-black"
                  data-testid="checkbox-consent"
                />
                <span className="text-xs text-black/60">
                  I consent to Beauvette using automated service quality monitoring to ensure the best experience. 
                  This helps us detect and resolve any issues proactively. You can opt out anytime in your profile settings.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-black text-white py-3 rounded text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
              data-testid="button-submit-intake"
            >
              {submitMutation.isPending ? "Creating your profile..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
