import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, Clock, Briefcase, MapPin, DollarSign, Users, Instagram, Globe, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlannerIntake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    companyName: "",
    yearsExperience: "",
    specializationType: "",
    serviceAreas: [] as string[],
    typicalBudgetRange: "",
    vendorNetworkSize: "",
    instagramHandle: "",
    websiteUrl: "",
    cdiConsent: false,
  });

  const [customServiceArea, setCustomServiceArea] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intakes/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          yearsExperience: data.yearsExperience ? parseInt(data.yearsExperience) : null,
          vendorNetworkSize: data.vendorNetworkSize ? parseInt(data.vendorNetworkSize) : null,
          serviceAreas: data.serviceAreas.length > 0 ? data.serviceAreas : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit intake");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome to Beauvette!", description: "Your planner profile has been created." });
      setLocation("/planner");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const specializationTypes = [
    "Full-Service Wedding Planning",
    "Partial Planning",
    "Month-Of Coordination",
    "Day-Of Coordination",
    "Destination Weddings",
    "Corporate Events",
  ];

  const budgetRanges = [
    "Under $25,000",
    "$25,000 - $50,000",
    "$50,000 - $100,000",
    "$100,000 - $250,000",
    "$250,000+",
  ];

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
    if (!formData.companyName) {
      toast({ title: "Required", description: "Please enter your company name.", variant: "destructive" });
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
              Join as a Planner
            </h1>
            <p className="text-sm text-black/60">
              Tell us about your planning business to connect with vendors and clients
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Building2 size={14} /> Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Your planning company name"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-company-name"
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
                placeholder="e.g., 8"
                min="0"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-years-experience"
              />
            </div>

            {/* Specialization Type */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Briefcase size={14} /> Specialization
              </label>
              <div className="grid grid-cols-2 gap-2">
                {specializationTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, specializationType: type }))}
                    className={`p-2 text-xs rounded border transition-colors ${
                      formData.specializationType === type
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-spec-${type.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
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
                  placeholder="City or region (e.g., New York, NY)"
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

            {/* Typical Budget Range */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <DollarSign size={14} /> Typical Client Budget Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                {budgetRanges.map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, typicalBudgetRange: range }))}
                    className={`p-2 text-xs rounded border transition-colors ${
                      formData.typicalBudgetRange === range
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-budget-${range.replace(/[^a-z0-9]/gi, '').slice(0, 10)}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor Network Size */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Users size={14} /> Preferred Vendor Network Size
              </label>
              <input
                type="number"
                value={formData.vendorNetworkSize}
                onChange={e => setFormData(prev => ({ ...prev, vendorNetworkSize: e.target.value }))}
                placeholder="Approximate number of vendors you work with"
                min="0"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-network-size"
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
