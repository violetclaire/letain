import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Paperclip, X, Image as ImageIcon, Bot, User, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VoiceDictation from "./VoiceDictation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; url: string; name: string }[];
  timestamp: Date;
}

interface AIChatPanelProps {
  userId: string;
  userName?: string;
  onAvailabilityUpdate?: (dates: string[], isAvailable: boolean) => void;
  onInviteClick?: () => void;
}

export default function AIChatPanel({ userId, userName, onAvailabilityUpdate, onInviteClick }: AIChatPanelProps) {
  const { toast } = useToast();
  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content: `Hi ${userName || "there"}! I'm your Beauvette assistant. I can help you manage your availability, upload inspiration photos, and answer questions about your bookings. Just type, speak, or attach photos!`,
    timestamp: new Date()
  };
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/ai/chat/history", {
          credentials: "include"
        });
        if (response.ok) {
          const history = await response.json();
          if (history.length > 0) {
            const loadedMessages: Message[] = history.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              attachments: msg.attachments,
              timestamp: new Date(msg.createdAt)
            }));
            setMessages([welcomeMessage, ...loadedMessages]);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const compressImage = (file: File, maxSize: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      img.onload = () => {
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error("Failed to load image"));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const MAX_PHOTOS = 3;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Photo limit reached",
        description: `You can only attach up to ${MAX_PHOTOS} photos at a time. Send these first, then add more.`,
        variant: "destructive"
      });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: "Some photos skipped",
        description: `Only adding ${remainingSlots} photo(s). Limit is ${MAX_PHOTOS} at a time.`,
      });
    }

    setIsCompressing(true);
    const newAttachments = [...attachments];
    const newPreviews = [...attachmentPreviews];

    for (const file of filesToProcess) {
      if (file.type.startsWith("image/")) {
        try {
          const compressedPreview = await compressImage(file);
          newAttachments.push(file);
          newPreviews.push(compressedPreview);
          setAttachmentPreviews([...newPreviews]);
        } catch (err) {
          console.error("Image compression failed:", err);
          toast({
            title: "Image error",
            description: "Failed to process image. Please try a different photo.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload image files only",
          variant: "destructive"
        });
      }
    }

    setAttachments(newAttachments);
    setIsCompressing(false);
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviews = attachmentPreviews.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    setAttachmentPreviews(newPreviews);
  };

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: attachmentPreviews.map((url, i) => ({
        type: "image",
        url,
        name: attachments[i]?.name || `Image ${i + 1}`
      })),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const imageData: { mimeType: string; data: string }[] = [];
      for (const preview of attachmentPreviews) {
        const base64Match = preview.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          imageData.push({
            mimeType: base64Match[1],
            data: base64Match[2]
          });
        }
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          attachments: imageData
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.availabilityUpdates && onAvailabilityUpdate) {
        onAvailabilityUpdate(data.availabilityUpdates.dates, data.availabilityUpdates.isAvailable);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setAttachments([]);
      setAttachmentPreviews([]);
    }
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
    <div className="flex flex-col h-full bg-white rounded-lg border border-[#c5ccd8] overflow-hidden">
      <div className="bg-gradient-to-r from-pink/20 to-powder/30 px-4 py-3 border-b border-[#c5ccd8]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink rounded-full">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <h3 className="font-header text-sm ink-main">Beauvette Assistant</h3>
              <p className="text-[0.65rem] ink-soft">Voice, text, or upload photos</p>
            </div>
          </div>
          {onInviteClick && (
            <button 
              onClick={onInviteClick}
              className="text-xs px-2 py-1 bg-pink/10 text-pink border border-pink/30 rounded hover:bg-pink/20 transition-colors flex items-center gap-1 whitespace-nowrap"
              title="Invite your clients to chat"
            >
              <UserPlus size={12} />
              Invite
            </button>
          )}
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`p-1.5 rounded-full h-fit ${msg.role === "user" ? "bg-black" : "bg-pink"}`}>
              {msg.role === "user" ? (
                <User size={12} className="text-white" />
              ) : (
                <Bot size={12} className="text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.attachments.map((att, i) => (
                    <img
                      key={i}
                      src={att.url}
                      alt={att.name}
                      className="w-16 h-16 object-cover rounded border border-white/20"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
              <span className={`text-[0.6rem] mt-1 block ${msg.role === "user" ? "text-white/60" : "text-gray-400"}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="p-1.5 rounded-full bg-pink h-fit">
              <Bot size={12} className="text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <Loader2 size={14} className="animate-spin text-gray-500" />
            </div>
          </div>
        )}
      </div>

      {attachmentPreviews.length > 0 && (
        <div className="px-4 py-2 border-t border-[#c5ccd8] bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {attachmentPreviews.map((preview, i) => (
              <div key={i} className="relative">
                <img
                  src={preview}
                  alt={`Attachment ${i + 1}`}
                  className="w-12 h-12 object-cover rounded border border-[#c5ccd8]"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[#c5ccd8] p-3 bg-[#fbfcff]">
        <div className="flex gap-2 items-end">
          <div className="relative">
            <label
              className={`p-2 rounded-full transition-colors cursor-pointer inline-flex items-center justify-center ${isCompressing || attachments.length >= MAX_PHOTOS ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "text-gray-500 hover:text-black hover:bg-gray-100"}`}
              title={isCompressing ? "Processing photos..." : attachments.length >= MAX_PHOTOS ? "Photo limit reached (3 max)" : `Attach photos (${attachments.length}/${MAX_PHOTOS})`}
              data-testid="button-attach-photo"
            >
              {isCompressing ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                disabled={isCompressing || attachments.length >= MAX_PHOTOS}
                className="sr-only"
              />
            </label>
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink text-white text-[0.6rem] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {attachments.length}
              </span>
            )}
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message or use voice..."
              rows={1}
              className="w-full px-3 py-2 pr-10 text-sm border border-[#c5ccd8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-black resize-none"
              data-testid="input-chat-message"
            />
          </div>

          <VoiceDictation onTranscript={handleVoiceTranscript} size="md" />

          <button
            onClick={sendMessage}
            disabled={isLoading || isCompressing || (!input.trim() && attachments.length === 0)}
            className="p-2 bg-pink text-white rounded-full hover:bg-pink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="button-send-message"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[0.6rem] text-gray-400 mt-2 text-center">
          Try: "Block Dec 15-20" or upload up to 3 photos at a time
        </p>
      </div>
    </div>
  );
}
