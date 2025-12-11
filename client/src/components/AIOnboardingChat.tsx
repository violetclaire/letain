import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User, Loader2, FileText, X, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceDictation from "./VoiceDictation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; name: string }[];
  timestamp: Date;
}

interface AIOnboardingChatProps {
  onDatesMentioned?: (dates: Date[]) => void;
}

export default function AIOnboardingChat({ onDatesMentioned }: AIOnboardingChatProps) {
  const { toast } = useToast();
  
  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content: "Welcome to Beauvette! I'm here to help you find the perfect beauty artist for your special day.\n\nTell me about your event - when is it, and what services are you looking for?",
    timestamp: new Date()
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(f => 
      f.type === "application/pdf" || 
      f.type.startsWith("image/")
    );

    if (validFiles.length < files.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF and image files are supported",
      });
    }

    setAttachments(prev => [...prev, ...validFiles].slice(0, 3));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: attachments.map(f => ({
        type: f.type.startsWith("image/") ? "image" : "pdf",
        name: f.name
      })),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/onboarding-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          hasAttachments: attachments.length > 0
        })
      });

      if (!response.ok) {
        const simulatedResponse = generateSimulatedResponse(input);
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: simulatedResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const data = await response.json();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (data.detectedDates && onDatesMentioned) {
          onDatesMentioned(data.detectedDates.map((d: string) => new Date(d)));
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const simulatedResponse = generateSimulatedResponse(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: simulatedResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      setAttachments([]);
    }
  };

  const generateSimulatedResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes("wedding") || lowerInput.includes("bride")) {
      return "How exciting! Weddings are our specialty. What date is your wedding? You can tap dates on the calendar to mark when you need services, or just tell me the date.";
    }
    
    if (lowerInput.includes("makeup") || lowerInput.includes("hair")) {
      return "We have amazing makeup and hair artists available! When is your event? You can select dates on the calendar or type them here.";
    }
    
    if (/\d{1,2}\/\d{1,2}|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december/i.test(userInput)) {
      return "I've noted that date! You can tap it on the calendar to mark it as booked. What services are you looking for? Hair, makeup, or both?";
    }
    
    return "That's wonderful! To help you find the perfect artist, please tell me:\n\n1. What type of event is it?\n2. When is it happening?\n3. What services do you need?\n\nYou can also tap dates on the calendar to mark when you need availability.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInput(prev => prev + (prev ? " " : "") + transcript);
  };

  return (
    <div 
      className="flex flex-col h-full rounded-xl overflow-hidden shadow-lg border-2"
      style={{ 
        backgroundColor: '#FFF9F0',
        borderColor: '#D4A574',
        fontFamily: 'Georgia, Garamond, serif'
      }}
      data-testid="onboarding-chat"
    >
      <div 
        className="px-4 py-3 border-b-2"
        style={{ 
          backgroundColor: '#F5EDE0',
          borderColor: '#D4A574'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-full"
            style={{ backgroundColor: '#C85A54' }}
          >
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 
              className="font-semibold text-sm"
              style={{ color: '#5D4037' }}
            >
              Beauvette Assistant
            </h3>
            <p 
              className="text-xs"
              style={{ color: '#8B7355' }}
            >
              Ask me anything about availability
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: '300px', maxHeight: '400px' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div 
              className="p-1.5 rounded-full h-fit"
              style={{ 
                backgroundColor: msg.role === "user" ? '#5D4037' : '#C85A54'
              }}
            >
              {msg.role === "user" ? (
                <User size={14} className="text-white" />
              ) : (
                <Bot size={14} className="text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user" ? "" : ""
              }`}
              style={{
                backgroundColor: msg.role === "user" ? '#5D4037' : '#F5EDE0',
                color: msg.role === "user" ? '#FFFFFF' : '#5D4037'
              }}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: msg.role === "user" ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                      }}
                    >
                      <FileText size={12} />
                      {att.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <span 
                className="text-xs mt-2 block opacity-60"
              >
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div 
              className="p-1.5 rounded-full h-fit"
              style={{ backgroundColor: '#C85A54' }}
            >
              <Bot size={14} className="text-white" />
            </div>
            <div 
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: '#F5EDE0' }}
            >
              <div className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#8B7355', animationDelay: '0ms' }}
                />
                <span 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#8B7355', animationDelay: '150ms' }}
                />
                <span 
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#8B7355', animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div 
          className="px-4 py-2 border-t"
          style={{ 
            backgroundColor: '#F5EDE0',
            borderColor: '#E8DFD0'
          }}
        >
          <div className="flex gap-2 flex-wrap">
            {attachments.map((file, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: '#FFF9F0', color: '#5D4037' }}
              >
                <FileText size={12} />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="p-0.5 rounded-full hover:opacity-70"
                  style={{ color: '#C85A54' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        className="border-t-2 p-3"
        style={{ 
          backgroundColor: '#F5EDE0',
          borderColor: '#D4A574'
        }}
      >
        <div className="flex gap-2 items-end">
          <label
            className="p-2.5 rounded-full cursor-pointer transition-colors touch-manipulation"
            style={{ 
              backgroundColor: '#FFF9F0',
              color: '#8B4513'
            }}
            title="Attach PDF or image"
            data-testid="button-attach-file"
          >
            <Paperclip size={18} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="application/pdf,image/*"
              multiple
              className="sr-only"
            />
          </label>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me about your event..."
              rows={1}
              className="w-full px-4 py-2.5 text-sm rounded-xl resize-none focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#D4A574',
                border: '1px solid #D4A574',
                color: '#5D4037'
              }}
              data-testid="input-chat-message"
            />
          </div>

          <VoiceDictation onTranscript={handleVoiceTranscript} size="md" />

          <button
            onClick={sendMessage}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="p-2.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            style={{ 
              backgroundColor: '#C85A54',
              color: '#FFFFFF'
            }}
            data-testid="button-send-message"
          >
            <Send size={18} />
          </button>
        </div>
        
        <p 
          className="text-xs mt-2 text-center italic"
          style={{ color: '#A89F8F' }}
        >
          Ask about availability, services, or upload inspiration photos
        </p>
      </div>
    </div>
  );
}
