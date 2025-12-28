import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowLeft, Check, Sparkles, Camera, Video, Flower2, Music, UtensilsCrossed, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceLabels: Record<string, { label: string; icon: any }> = {
  beauty: { label: "Beauty & Hair", icon: Sparkles },
  photography: { label: "Photography", icon: Camera },
  video: { label: "Videography", icon: Video },
  florals: { label: "Florals", icon: Flower2 },
  planner: { label: "Wedding Planner", icon: ClipboardList },
  dj: { label: "DJ & Music", icon: Music },
  catering: { label: "Catering", icon: UtensilsCrossed },
  venue: { label: "Venue", icon: MapPin },
};

export default function ClientDetails() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const serviceType = new URLSearchParams(search).get("service") || "beauty";
  const ServiceIcon = serviceLabels[serviceType]?.icon || Sparkles;

  const [formData, setFormData] = useState({
    serviceType: serviceType,
    eventType: "",
    eventDate: "",
    eventLocation: "",
    cdiConsent: false,
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, serviceType }));
  }, [serviceType]);

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intakes/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          eventDate: data.eventDate ? new Date(data.eventDate) : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit intake");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome!", description: "Let's find you the perfect vendor." });
      setLocation(`/search?service=${serviceType}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const eventTypes = ["Wedding", "Engagement", "Corporate Event", "Birthday", "Photoshoot", "Other"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-powder-blue py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        <div className="bg-cream p-6 rounded-sm shadow-lg border border-black/20">
          <button
            onClick={() => setLocation("/intake/client")}
            className="flex items-center gap-2 text-sm text-black/60 hover:text-black mb-4 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-xs uppercase tracking-wide mb-3">
              <ServiceIcon size={14} />
              {serviceLabels[serviceType]?.label || "Service"}
            </div>
            <h1 className="font-script text-3xl text-black mb-2">
              Almost there!
            </h1>
            <p className="text-sm text-black/60">
              Just a few quick details to help us find the right match
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70">
                What's the occasion?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {eventTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, eventType: type }))}
                    className={`p-2 text-xs rounded border transition-colors ${
                      formData.eventType === type
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-event-${type.toLowerCase()}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Calendar size={14} /> When is your event?
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={e => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-event-date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <MapPin size={14} /> Where is your event?
              </label>
              <input
                type="text"
                value={formData.eventLocation}
                onChange={e => setFormData(prev => ({ ...prev, eventLocation: e.target.value }))}
                placeholder="City or zip code"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-event-location"
              />
            </div>

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
                  Help us improve by allowing service quality monitoring. You can opt out anytime.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitMutation.isPending || !formData.eventType || !formData.eventLocation}
              className="w-full bg-black text-white py-3 rounded text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-find-vendors"
            >
              {submitMutation.isPending ? (
                "Finding vendors..."
              ) : (
                <>
                  <Check size={16} /> Find Vendors
                </>
              )}
            </button>
            {(!formData.eventType || !formData.eventLocation) && (
              <p className="text-xs text-center text-black/50 mt-2">
                Please select an occasion and enter your location
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
