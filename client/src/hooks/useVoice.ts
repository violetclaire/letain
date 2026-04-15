import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseVoiceOptions {
  onTranscript?: (transcript: string) => void;
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Voice features are not supported in this browser. Please try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = options.interimResults ?? false;
    recognition.lang = options.lang ?? "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please enable microphone permissions in your browser settings.",
          variant: "destructive",
        });
      }
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      if (options.interimResults) {
        currentTranscript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
      } else {
        currentTranscript = event.results[0][0].transcript;
      }
      
      setTranscript(currentTranscript);
      if (options.onTranscript) {
        options.onTranscript(currentTranscript);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [options, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  };
}
