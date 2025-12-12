import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Paperclip, X, Image as ImageIcon, Bot, User, Loader2, UserPlus, Calendar, FileText, Eye, Check, DollarSign, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import VoiceDictation from "./VoiceDictation";
import ChatCalendar from "./ChatCalendar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; url: string; name: string }[];
  timestamp: Date;
  showCalendar?: boolean;
  calendarPrompt?: string;
}

interface PendingProposal {
  clientName: string;
  clientEmail?: string | null;
  packageDetails: string;
  totalAmount: number;
  depositAmount?: number;
  bookingId?: string | null;
  eventDate?: string | null;
  location?: string | null;
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPrompt, setCalendarPrompt] = useState("Select a date");
  const [activeCalendarMessageId, setActiveCalendarMessageId] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const detectDateQuestion = (text: string): string | null => {
    const questionIndicators = [
      /what\s+(?:is\s+(?:the|your)\s+)?(?:event\s+)?date\??/i,
      /which\s+date[s]?\s+(?:would|do|should|are)/i,
      /when\s+(?:is|would|will|are)\s+(?:the|your|you)/i,
      /(?:please\s+)?(?:pick|choose|select)\s+(?:a\s+|the\s+)?date/i,
      /what\s+date[s]?\s+(?:would|do|should|are)/i,
      /could\s+you\s+(?:please\s+)?(?:provide|tell|share|give)/i,
      /would\s+you\s+like\s+to\s+(?:block|schedule|book)/i,
      /which\s+date[s]?\s+(?:do\s+you\s+want|should\s+I|would\s+you)/i,
    ];
    
    const hasQuestion = text.includes("?") || questionIndicators.some(p => p.test(text));
    if (!hasQuestion) return null;
    
    if (/(?:block|unavailable|availability)/i.test(text)) {
      return "Select dates to block";
    }
    if (/(?:wedding|event)\s+date/i.test(text)) {
      return "Select event date";
    }
    if (/(?:booking|appointment|schedule)\s+(?:date|for)/i.test(text)) {
      return "Select booking date";
    }
    if (/date/i.test(text)) {
      return "Select a date";
    }
    
    return null;
  };

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

      const msgId = (Date.now() + 1).toString();
      const datePrompt = detectDateQuestion(data.response);
      
      const assistantMessage: Message = {
        id: msgId,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        showCalendar: !!datePrompt,
        calendarPrompt: datePrompt || undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (datePrompt) {
        setShowCalendar(true);
        setCalendarPrompt(datePrompt);
        setActiveCalendarMessageId(msgId);
      }

      // Handle pending proposal - show preview modal
      if (data.pendingProposal) {
        setPendingProposal(data.pendingProposal);
      }

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

  const handleCalendarDatesSelected = (dates: Date[]) => {
    const formattedDates = dates.map(d => format(d, "MMMM d, yyyy"));
    let dateMessage: string;
    
    if (dates.length === 1) {
      dateMessage = formattedDates[0];
    } else if (dates.length === 2) {
      dateMessage = `${formattedDates[0]} and ${formattedDates[1]}`;
    } else {
      dateMessage = formattedDates.slice(0, -1).join(", ") + ", and " + formattedDates[formattedDates.length - 1];
    }
    
    setShowCalendar(false);
    setActiveCalendarMessageId(null);
    setInput(dateMessage);
    
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const handleCalendarCancel = () => {
    setShowCalendar(false);
    setActiveCalendarMessageId(null);
  };

  const toggleCalendar = () => {
    if (showCalendar) {
      setShowCalendar(false);
      setActiveCalendarMessageId(null);
    } else {
      setShowCalendar(true);
      setCalendarPrompt("Select dates");
      setActiveCalendarMessageId(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const handleConfirmProposal = async () => {
    if (!pendingProposal) return;
    
    setIsSendingProposal(true);
    try {
      const response = await fetch("/api/ai/confirm-proposal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingProposal)
      });

      if (!response.ok) throw new Error("Failed to send proposal");

      const data = await response.json();
      
      // Add confirmation message to chat
      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Proposal sent successfully to ${pendingProposal.clientName}! They'll receive an email with the details.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
      
      toast({ title: "Proposal sent!" });
      setPendingProposal(null);
    } catch (error) {
      console.error("Send proposal error:", error);
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleCancelProposal = () => {
    setPendingProposal(null);
    const cancelMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Proposal cancelled. Let me know if you'd like to make changes.",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMsg]);
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
        
        {showCalendar && (
          <div className="flex gap-2">
            <div className="p-1.5 rounded-full bg-pink h-fit">
              <Calendar size={12} className="text-white" />
            </div>
            <ChatCalendar
              prompt={calendarPrompt}
              onDatesSelected={handleCalendarDatesSelected}
              onCancel={handleCalendarCancel}
              multiSelect={true}
            />
          </div>
        )}
        
        {pendingProposal && (
          <div className="flex gap-2">
            <div className="p-1.5 rounded-full bg-pink h-fit">
              <FileText size={12} className="text-white" />
            </div>
            <div className="bg-cream border border-pink/30 rounded-lg shadow-lg overflow-hidden max-w-[320px] w-full" data-testid="proposal-preview-modal">
              <div className="bg-gradient-to-r from-pink/20 to-powder/30 px-4 py-3 border-b border-pink/20">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-pink" />
                  <span className="text-sm font-header text-forest">Proposal Preview</span>
                </div>
              </div>
              
              <div className="p-4 bg-cream space-y-3">
                <div>
                  <div className="flex items-center gap-1 text-xs text-gold mb-1">
                    <User size={12} />
                    <span>Client</span>
                  </div>
                  <p className="text-sm font-medium text-forest">{pendingProposal.clientName}</p>
                  {pendingProposal.clientEmail && (
                    <p className="text-xs text-gold">{pendingProposal.clientEmail}</p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-1 text-xs text-gold mb-1">
                    <FileText size={12} />
                    <span>Package Details</span>
                  </div>
                  <p className="text-xs text-forest whitespace-pre-wrap">{pendingProposal.packageDetails}</p>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gold mb-1">
                      <DollarSign size={12} />
                      <span>Total</span>
                    </div>
                    <p className="text-sm font-medium text-forest">{formatCurrency(pendingProposal.totalAmount)}</p>
                  </div>
                  <div>
                    <div className="text-xs text-gold mb-1">Deposit</div>
                    <p className="text-sm font-medium text-forest">{formatCurrency(pendingProposal.depositAmount || Math.round(pendingProposal.totalAmount * 0.5))}</p>
                  </div>
                </div>
                
                {pendingProposal.location && (
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gold mb-1">
                      <MapPin size={12} />
                      <span>Location</span>
                    </div>
                    <p className="text-xs text-forest">{pendingProposal.location}</p>
                  </div>
                )}
              </div>
              
              <div className="px-4 py-3 bg-powder/50 border-t border-pink/20 flex gap-2">
                <button
                  onClick={handleCancelProposal}
                  disabled={isSendingProposal}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm text-forest border border-forest/20 rounded-lg hover:bg-forest/5 transition-colors disabled:opacity-50"
                  data-testid="button-cancel-proposal"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={handleConfirmProposal}
                  disabled={isSendingProposal}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm bg-pink text-white rounded-lg hover:bg-pink/90 disabled:opacity-50 transition-colors"
                  data-testid="button-send-proposal"
                >
                  {isSendingProposal ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send
                </button>
              </div>
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
          
          <button
            onClick={toggleCalendar}
            className={`p-2 rounded-full transition-colors ${showCalendar ? "bg-pink text-white" : "text-gray-500 hover:text-black hover:bg-gray-100"}`}
            title="Pick dates from calendar"
            data-testid="button-toggle-calendar"
          >
            <Calendar size={18} />
          </button>
          
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
          Try: "Block Dec 15-20" or tap the calendar icon to pick dates
        </p>
      </div>
    </div>
  );
}
