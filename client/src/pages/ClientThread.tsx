import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, Image, X } from "lucide-react";

interface Inquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventType?: string;
  eventLocation?: string;
  status: string;
}

interface ArtistProfile {
  businessName: string;
}

interface ThreadMessage {
  id: string;
  type: string;
  content: string;
  sentAt: string;
  sentBy: string;
  attachments?: string[];
}

// Helper to convert URLs in text to clickable links
function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6B4A55] underline hover:text-[#8B6A75] break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function ClientThread() {
  const [, params] = useRoute("/thread/:clientToken");
  const queryClient = useQueryClient();
  const clientToken = params?.clientToken;
  const [replyMessage, setReplyMessage] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/inquiry/client/${clientToken}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/inquiry/client/${clientToken}`);
      if (!res.ok) throw new Error("Inquiry not found");
      return res.json();
    },
    enabled: !!clientToken,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachments }: { message: string; attachments: string[] }) => {
      return apiRequest("POST", `/api/public/inquiry/client/${clientToken}/message`, { 
        message, 
        attachments 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/client/${clientToken}`] });
      setReplyMessage("");
      setPendingPhotos([]);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be under 10MB');
        continue;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch(`/api/public/inquiry/client/${clientToken}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileContent: base64,
            fileName: file.name,
            mimeType: file.type
          })
        });

        if (response.ok) {
          const data = await response.json();
          setPendingPhotos(prev => [...prev, data.url]);
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to upload photo');
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload photo');
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C4A35A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#1A1A1A] mb-4">Thread Not Found</h1>
          <p className="text-[#888]">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const { inquiry, artist, messages } = data as {
    inquiry: Inquiry;
    artist: ArtistProfile | null;
    messages: ThreadMessage[];
  };

  const eventDate = inquiry.eventDate
    ? (() => {
        const dateStr = inquiry.eventDate.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        return format(localDate, "MMMM d, yyyy");
      })()
    : "Date TBD";

  const handleSendReply = () => {
    if (replyMessage.trim() || pendingPhotos.length > 0) {
      sendMessageMutation.mutate({ 
        message: replyMessage, 
        attachments: pendingPhotos 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="text-center mb-8 pb-6 border-b border-[#E8E2D9]">
          <h1 className="text-2xl font-serif text-[#1A1A1A] mb-2">
            {artist?.businessName || "Your Artist"}
          </h1>
          <p className="text-[#888] text-sm">
            {eventDate} {inquiry.eventType ? `• ${inquiry.eventType}` : ""}
          </p>
        </header>

        <div className="space-y-4 mb-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#888]">No messages yet. Start the conversation below.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded ${
                  msg.sentBy === "client"
                    ? "bg-[#333] ml-8"
                    : "bg-[#F5F2ED] border-l-2 border-[#C4A35A] mr-8"
                }`}
                data-testid={`message-${msg.id}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-[#C4A35A] uppercase tracking-wide">
                    {msg.sentBy === "client" ? "You" : artist?.businessName || "Artist"}
                  </span>
                  <span className="text-xs text-[#666]">
                    {msg.sentAt ? format(new Date(msg.sentAt), "MMM d, h:mm a") : ""}
                  </span>
                </div>
                <p className="text-[#1A1A1A] whitespace-pre-wrap">{linkifyText(msg.content)}</p>
                
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Inspiration photo ${idx + 1}`}
                          className="h-24 w-24 object-cover rounded border border-[#444] hover:border-[#C4A35A] transition-colors"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sticky bottom-0 bg-[#FAF8F5] pt-4 pb-6 border-t border-[#E8E2D9]">
          {pendingPhotos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingPhotos.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Pending upload ${idx + 1}`}
                    className="h-16 w-16 object-cover rounded border border-[#C4A35A]"
                  />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                    data-testid={`button-remove-photo-${idx}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="self-end bg-[#E8E2D9] text-[#1A1A1A] px-4 py-3 rounded hover:bg-[#C4A35A] transition-colors disabled:opacity-50"
              title="Add inspiration photos"
              data-testid="button-add-photo"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Image className="h-5 w-5" />
              )}
            </button>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your message or add inspiration photos..."
              className="flex-1 bg-[#F5F2ED] border border-[#E8E2D9] text-[#1A1A1A] placeholder-[#999] p-3 rounded resize-none focus:outline-none focus:border-[#C4A35A]"
              rows={3}
              data-testid="input-reply-message"
            />
            <button
              onClick={handleSendReply}
              disabled={(!replyMessage.trim() && pendingPhotos.length === 0) || sendMessageMutation.isPending}
              className="self-end bg-[#F5F0E8] text-[#1A1A1A] px-6 py-3 rounded disabled:opacity-50 hover:bg-[#C4A35A] transition-colors"
              data-testid="button-send-reply"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          {sendMessageMutation.isError && (
            <p className="text-red-400 text-sm mt-2">Failed to send message. Please try again.</p>
          )}
        </div>

        <footer className="text-center mt-8 pt-6 border-t border-[#E8E2D9]">
          <p className="text-[#666] text-xs">
            This is a private conversation thread for your inquiry.
          </p>
        </footer>
      </div>
    </div>
  );
}
