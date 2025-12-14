import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const SERVICE_OPTIONS = [
  { id: "hair", label: "Hair" },
  { id: "makeup", label: "Makeup" },
  { id: "both", label: "Both" },
  { id: "other", label: "Other" },
];

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [servicesNeeded, setServicesNeeded] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const joinWaitlist = useMutation({
    mutationFn: async (data: {
      email: string;
      eventDate?: string;
      location?: string;
      servicesNeeded?: string[];
      notes?: string;
    }) => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join waitlist");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Oops!",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleServiceToggle = (serviceId: string) => {
    setServicesNeeded((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    joinWaitlist.mutate({
      email,
      eventDate: eventDate || undefined,
      location: location || undefined,
      servicesNeeded: servicesNeeded.length > 0 ? servicesNeeded : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "#FAF9F7" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full mx-auto"
      >
        <div className="text-center mb-8">
          <h1
            className="font-script text-4xl md:text-5xl mb-4"
            style={{ color: "#2C2C2C" }}
            data-testid="text-waitlist-title"
          >
            Join the Client Waitlist
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "#666" }}
            data-testid="text-waitlist-description"
          >
            Client access opens as verified artists come online. Share your event details and we'll reach out when matching begins.
          </p>
        </div>

        {!submitted ? (
          <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
            <div className="border border-[#2C2C2C] p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#2C2C2C]">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 border-[#2C2C2C]/30 focus:border-[#2C2C2C] bg-white"
                    data-testid="input-waitlist-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="text-sm font-medium text-[#2C2C2C]">
                    Event Date
                  </Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-11 border-[#2C2C2C]/30 focus:border-[#2C2C2C] bg-white"
                    data-testid="input-waitlist-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-[#2C2C2C]">
                    Location (City, State)
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="e.g., Austin, TX"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-11 border-[#2C2C2C]/30 focus:border-[#2C2C2C] bg-white"
                    data-testid="input-waitlist-location"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-[#2C2C2C]">
                    Services Needed
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {SERVICE_OPTIONS.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={servicesNeeded.includes(service.id)}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                          data-testid={`checkbox-service-${service.id}`}
                        />
                        <span className="text-sm text-[#2C2C2C]">{service.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-[#2C2C2C]">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details about your event..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px] border-[#2C2C2C]/30 focus:border-[#2C2C2C] bg-white resize-none"
                    data-testid="input-waitlist-notes"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={joinWaitlist.isPending || !email}
                  className="w-full h-12 text-base font-medium bg-[#2C2C2C] text-white hover:bg-[#1a1a1a]"
                  data-testid="button-join-waitlist"
                >
                  {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-8 text-center">
              <CheckCircle
                className="w-12 h-12 mx-auto mb-4"
                style={{ color: "#2C2C2C" }}
              />
              <h2
                className="font-script text-2xl mb-3"
                style={{ color: "#2C2C2C" }}
                data-testid="text-waitlist-success"
              >
                You're on the list!
              </h2>
              <p className="text-sm" style={{ color: "#666" }}>
                We'll email you as soon as artists are available in your area.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
