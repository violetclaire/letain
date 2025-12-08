import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

export default function GooglePlacesInput({
  value,
  onChange,
  placeholder = "Enter location",
  className = "",
  "data-testid": testId,
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasApiKey = !!apiKey && apiKey.length > 0;

  useEffect(() => {
    if (!hasApiKey) {
      return;
    }

    const loadGoogleMapsScript = () => {
      if (window.google?.maps?.places) {
        setIsLoaded(true);
        return;
      }

      const existingScript = document.getElementById("google-maps-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => setIsLoaded(true));
        return;
      }

      window.initGooglePlaces = () => {
        setIsLoaded(true);
      };

      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [hasApiKey]);

  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  const searchPlaces = (query: string) => {
    if (!autocompleteRef.current || !query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    autocompleteRef.current.getPlacePredictions(
      {
        input: query,
        sessionToken: sessionTokenRef.current,
        types: ["establishment", "geocode"],
      },
      (predictions: any[], status: string) => {
        setIsSearching(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(
            predictions.map((p) => ({
              description: p.description,
              place_id: p.place_id,
            }))
          );
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: { description: string; place_id: string }) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  if (!hasApiKey) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-9 ${className}`}
          data-testid={testId}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`pl-9 ${className}`}
          data-testid={testId}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-start gap-2"
              data-testid={`suggestion-${suggestion.place_id}`}
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{suggestion.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
