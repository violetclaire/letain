import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, DollarSign, Heart, MessageSquare, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientIntake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    eventType: "",
    eventDate: "",
    eventLocation: "",
    partySize: "",
    budget: "",
    preferredStyles: [] as string[],
    specialRequirements: "",
    howHeard: "",
    cdiConsent: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/intakes/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          eventDate: data.eventDate ? new Date(data.eventDate) : null,
          partySize: data.partySize ? parseInt(data.partySize) : null,
          preferredStyles: data.preferredStyles.length > 0 ? data.preferredStyles : null,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit intake");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome to Beauvette!", description: "Your profile has been created." });
      setLocation("/client");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const eventTypes = ["Wedding", "Engagement", "Corporate Event", "Birthday", "Photoshoot", "Other"];
  const budgetRanges = ["Under $500", "$500-$1,000", "$1,000-$2,500", "$2,500-$5,000", "$5,000+"];
  const styleOptions = ["Natural/Minimal", "Glam", "Romantic", "Bohemian", "Classic/Timeless", "Editorial/Avant-garde"];
  const howHeardOptions = ["Social Media", "Friend/Family", "Wedding Planner", "Search Engine", "Other"];

  const toggleStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      preferredStyles: prev.preferredStyles.includes(style)
        ? prev.preferredStyles.filter(s => s !== style)
        : [...prev.preferredStyles, style]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
              Bonjour
            </h1>
            <p className="text-sm text-black/60">
              Tell us about your special day so we can find the perfect vendors for you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Type */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Heart size={14} /> Event Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

            {/* Event Date */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Calendar size={14} /> Event Date
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

            {/* Event Location */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <MapPin size={14} /> Event Location
              </label>
              <input
                type="text"
                value={formData.eventLocation}
                onChange={e => setFormData(prev => ({ ...prev, eventLocation: e.target.value }))}
                placeholder="City, venue, or zip code"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-event-location"
              />
            </div>

            {/* Party Size */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <Users size={14} /> How many people need beauty services?
              </label>
              <input
                type="number"
                value={formData.partySize}
                onChange={e => setFormData(prev => ({ ...prev, partySize: e.target.value }))}
                placeholder="e.g., 5"
                min="1"
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                data-testid="input-party-size"
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <DollarSign size={14} /> Budget Range
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {budgetRanges.map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, budget: range }))}
                    className={`p-2 text-xs rounded border transition-colors ${
                      formData.budget === range
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-budget-${range.replace(/[^a-z0-9]/gi, '')}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Styles */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70">
                Preferred Styles (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {styleOptions.map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={`p-2 text-xs rounded border transition-colors flex items-center gap-2 ${
                      formData.preferredStyles.includes(style)
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-style-${style.toLowerCase().replace(/[^a-z]/g, '')}`}
                  >
                    {formData.preferredStyles.includes(style) && <Check size={12} />}
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Requirements */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70 flex items-center gap-2">
                <MessageSquare size={14} /> Special Requirements or Notes
              </label>
              <textarea
                value={formData.specialRequirements}
                onChange={e => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                placeholder="Any allergies, accessibility needs, or special requests..."
                rows={3}
                className="w-full border border-black/20 bg-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
                data-testid="input-special-requirements"
              />
            </div>

            {/* How Did You Hear About Us */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-black/70">
                How did you hear about Beauvette?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {howHeardOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, howHeard: option }))}
                    className={`p-2 text-xs rounded border transition-colors ${
                      formData.howHeard === option
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black"
                    }`}
                    data-testid={`button-heard-${option.toLowerCase().replace(/[^a-z]/g, '')}`}
                  >
                    {option}
                  </button>
                ))}
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
