import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Mic, MicOff, X, Loader2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  shareUrl?: string;
  quoteCreated?: boolean;
  timestamp: Date;
}

interface SecretaryChatboxProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SecretaryChatbox({ isOpen, onToggle }: SecretaryChatboxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your Secretary. I can help you create quotes, schedules, timelines, and contracts. Just describe what you need or paste a client request. You can also use the microphone for voice input.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");
        setInputValue(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Could not access microphone. Please try again.",
          variant: "destructive",
        });
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input. Try Chrome or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          attachments: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I processed your request.",
        shareUrl: data.shareUrl,
        quoteCreated: data.quoteCreated,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-[var(--surface)] border border-[var(--hairline)] rounded-lg shadow-lg overflow-hidden z-50"
            style={{ maxHeight: "70vh" }}
            data-testid="secretary-chatbox"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--ink)] text-[var(--bg)]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium font-serif">Your Secretary</span>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-white/10 rounded"
                data-testid="close-chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="flex flex-col h-[400px] overflow-y-auto p-4 space-y-3"
              data-testid="chat-messages"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-[var(--ink)] text-[var(--bg)]"
                        : "bg-[var(--surface-2)] text-[var(--ink)]"
                    }`}
                    data-testid={`message-${msg.role}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.shareUrl && (
                      <div className="mt-2 pt-2 border-t border-[var(--hairline)] flex items-center gap-2">
                        <a
                          href={msg.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--brass)] underline flex items-center gap-1"
                          data-testid="share-link"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Quote
                        </a>
                        <button
                          onClick={() => copyToClipboard(msg.shareUrl!)}
                          className="text-xs text-[var(--muted-ink)] hover:text-[var(--ink)] flex items-center gap-1"
                          data-testid="copy-link"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface-2)] rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--muted-ink)]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[var(--hairline)] p-3">
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you need..."
                  className="min-h-[60px] max-h-[120px] resize-none text-sm bg-[var(--bg)] border-[var(--hairline)]"
                  disabled={isLoading}
                  data-testid="chat-input"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={toggleListening}
                    variant={isListening ? "default" : "outline"}
                    className={`p-2 ${isListening ? "bg-[var(--oxblood)] hover:bg-[var(--oxblood)]" : ""}`}
                    data-testid="voice-button"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-[var(--ink)] hover:bg-[var(--muted-ink)]"
                    data-testid="send-button"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-[var(--faint-ink)] mt-2">
                Try: "Create a quote for bride hair+makeup, 3 bridesmaids at Carmel Valley"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className="fixed bottom-4 right-4 w-14 h-14 bg-[var(--ink)] text-[var(--bg)] rounded-full shadow-lg flex items-center justify-center z-50"
        data-testid="secretary-toggle"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </>
  );
}
