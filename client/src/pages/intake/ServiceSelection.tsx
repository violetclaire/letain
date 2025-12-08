import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Camera, Video, Flower2, Music, UtensilsCrossed, MapPin, ClipboardList, Mic } from "lucide-react";

const serviceCategories = [
  { id: "beauty", label: "Beauty & Hair", icon: Sparkles, description: "Makeup, hair styling, nails" },
  { id: "photography", label: "Photography", icon: Camera, description: "Wedding & event photos" },
  { id: "video", label: "Videography", icon: Video, description: "Cinematic wedding films" },
  { id: "florals", label: "Florals", icon: Flower2, description: "Bouquets & arrangements" },
  { id: "planner", label: "Wedding Planner", icon: ClipboardList, description: "Full planning & coordination" },
  { id: "dj", label: "DJ & Music", icon: Music, description: "Entertainment & sound" },
  { id: "catering", label: "Catering", icon: UtensilsCrossed, description: "Food & beverages" },
  { id: "venue", label: "Venue", icon: MapPin, description: "Event spaces & locations" },
];

export default function ServiceSelection() {
  const [, setLocation] = useLocation();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  const handleContinue = () => {
    if (selectedService) {
      setLocation(`/intake/client/details?service=${selectedService}`);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setVoiceText(transcript);
      
      const matchedService = serviceCategories.find(cat => 
        transcript.includes(cat.id) || 
        transcript.includes(cat.label.toLowerCase()) ||
        cat.description.toLowerCase().split(' ').some(word => transcript.includes(word))
      );
      
      if (matchedService) {
        setSelectedService(matchedService.id);
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-powder-blue py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="bg-cream p-6 md:p-8 rounded-sm shadow-lg border border-black/20">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-sm text-black/60 hover:text-black mb-6 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-8">
            <h1 className="font-script text-4xl text-black mb-3">
              What are you looking for?
            </h1>
            <p className="text-sm text-black/60 max-w-md mx-auto">
              Select a service type or tell us what you need
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handleVoiceInput}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                isListening 
                  ? "bg-pink border-pink text-white animate-pulse" 
                  : "border-black/20 hover:border-black bg-white"
              }`}
              data-testid="button-voice-input"
            >
              <Mic size={16} />
              <span className="text-sm">
                {isListening ? "Listening..." : "Tell us what you need"}
              </span>
            </button>
          </div>

          {voiceText && (
            <div className="text-center mb-6 text-sm text-black/60 italic">
              "{voiceText}"
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {serviceCategories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedService === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleServiceSelect(category.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white hover:border-black/30"
                  }`}
                  data-testid={`button-service-${category.id}`}
                >
                  <Icon 
                    size={28} 
                    className={`mx-auto mb-2 ${isSelected ? "text-white" : "text-black/70"}`} 
                  />
                  <div className={`text-sm font-medium ${isSelected ? "text-white" : "text-black"}`}>
                    {category.label}
                  </div>
                  <div className={`text-xs mt-1 ${isSelected ? "text-white/70" : "text-black/50"}`}>
                    {category.description}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={!selectedService}
              className="flex-1 bg-black text-white py-3 rounded text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              data-testid="button-continue"
            >
              Continue
            </button>
            <button
              onClick={() => setLocation("/search")}
              className="px-6 py-3 rounded border border-black/20 text-sm uppercase tracking-widest hover:border-black transition-colors"
              data-testid="button-browse-all"
            >
              Browse All
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
