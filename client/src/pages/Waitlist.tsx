import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle, Upload, X, Image as ImageIcon } from "lucide-react";

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
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (inspirationImages.length >= 5) {
      toast({
        title: "Limit reached",
        description: "You can upload up to 5 inspiration images",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        if (inspirationImages.length >= 5) break;
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "waitlist-inspiration");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        setInspirationImages((prev) => [...prev, data.url]);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setInspirationImages((prev) => prev.filter((_, i) => i !== index));
  };

  const joinWaitlist = useMutation({
    mutationFn: async (data: {
      email: string;
      eventDate?: string;
      location?: string;
      servicesNeeded?: string[];
      notes?: string;
      inspirationImages?: string[];
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
      inspirationImages: inspirationImages.length > 0 ? inspirationImages : undefined,
    });
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-[#FCF9F4]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full mx-auto"
      >
        <div className="text-center mb-8">
          <h1
            className="font-script text-4xl md:text-5xl mb-4 text-[#5A1F2B]"
            data-testid="text-waitlist-title"
          >
            Join the Client Waitlist
          </h1>
          <p
            className="text-base leading-relaxed text-[#5A1F2B]/60"
            data-testid="text-waitlist-description"
          >
            Client access opens as verified artists come online. Share your event details and we'll reach out when matching begins.
          </p>
        </div>

        {!submitted ? (
          <div className="bg-[#E8F4F8] p-1 border border-[#B8D4E3]">
            <div className="border border-[#5A1F2B] p-1">
              <div className="border border-[#E8F4F8] p-1">
                <div className="border border-[#5A1F2B] p-6 bg-[#E8F4F8]">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-[#5A1F2B]">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 border-[#5A1F2B]/30 focus:border-[#5A1F2B] bg-white text-[#5A1F2B]"
                        data-testid="input-waitlist-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventDate" className="text-sm font-medium text-[#5A1F2B]">
                        Event Date
                      </Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-11 border-[#5A1F2B]/30 focus:border-[#5A1F2B] bg-white text-[#5A1F2B]"
                        data-testid="input-waitlist-date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium text-[#5A1F2B]">
                        Location (City, State)
                      </Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="e.g., Austin, TX"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-11 border-[#5A1F2B]/30 focus:border-[#5A1F2B] bg-white text-[#5A1F2B]"
                        data-testid="input-waitlist-location"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-[#5A1F2B]">
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
                            <span className="text-sm text-[#5A1F2B]">{service.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium text-[#5A1F2B]">
                        Notes (optional)
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional details about your event..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="min-h-[80px] border-[#5A1F2B]/30 focus:border-[#5A1F2B] bg-white resize-none text-[#5A1F2B]"
                        data-testid="input-waitlist-notes"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-[#5A1F2B]">
                        Your Desired Aesthetic (optional)
                      </Label>
                      <p className="text-xs text-[#5A1F2B]/60">
                        Share inspiration photos so we can better match you with artists who fit your style
                      </p>
                      
                      {inspirationImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {inspirationImages.map((img, index) => (
                            <div key={index} className="relative aspect-square">
                              <img
                                src={img}
                                alt={`Inspiration ${index + 1}`}
                                className="w-full h-full object-cover rounded border border-[#5A1F2B]/20"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-[#5A1F2B] text-white rounded-full flex items-center justify-center hover:bg-[#4a1923]"
                                data-testid={`button-remove-image-${index}`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {inspirationImages.length < 5 && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-[#5A1F2B]/30 rounded-lg p-4 text-center cursor-pointer hover:border-[#5A1F2B]/50 transition-colors bg-white"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            data-testid="input-inspiration-images"
                          />
                          {uploadingImage ? (
                            <div className="flex items-center justify-center gap-2 text-[#5A1F2B]/60">
                              <div className="w-4 h-4 border-2 border-[#5A1F2B]/30 border-t-[#5A1F2B] rounded-full animate-spin" />
                              <span className="text-sm">Uploading...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#5A1F2B]/60">
                              <ImageIcon size={24} />
                              <span className="text-sm">Tap to add inspiration photos</span>
                              <span className="text-xs">(Up to 5 images)</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="w-full bg-[#5A1F2B] p-1">
                      <Button
                        type="submit"
                        disabled={joinWaitlist.isPending || !email}
                        className="w-full h-12 text-base font-medium bg-[#5A1F2B] text-[#FCF9F4] border border-[#FCF9F4]/40 hover:bg-[#4a1923]"
                        data-testid="button-join-waitlist"
                      >
                        {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="border border-[#5A1F2B] p-1"
          >
            <div className="border border-[#FCF9F4] p-1">
              <div className="border border-[#5A1F2B] p-8 text-center bg-[#FCF9F4]">
                <CheckCircle
                  className="w-12 h-12 mx-auto mb-4 text-[#5A1F2B]"
                />
                <h2
                  className="font-script text-2xl mb-3 text-[#5A1F2B]"
                  data-testid="text-waitlist-success"
                >
                  You're on the list!
                </h2>
                <p className="text-sm text-[#5A1F2B]/60">
                  We'll email you as soon as artists are available in your area.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
