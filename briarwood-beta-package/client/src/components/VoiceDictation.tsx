import { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function VoiceDictation({ onTranscript, className = "", size = "sm" }: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice dictation is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript.trim());
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Microphone access denied. Please enable microphone permissions.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isSupported) {
    return null;
  }

  const iconSize = size === "sm" ? 12 : 16;
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      type="button"
      onClick={startListening}
      disabled={isListening}
      className={`${padding} rounded-full transition-all ${
        isListening 
          ? "bg-red-500 text-white animate-pulse" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black"
      } ${className}`}
      title={isListening ? "Listening..." : "Click to speak"}
      data-testid="button-voice-dictation"
    >
      {isListening ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
    </button>
  );
}
