import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send } from "lucide-react";

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
}

export default function ClientThread() {
  const [, params] = useRoute("/thread/:clientToken");
  const queryClient = useQueryClient();
  const clientToken = params?.clientToken;
  const [replyMessage, setReplyMessage] = useState("");

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
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/public/inquiry/client/${clientToken}/message`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/client/${clientToken}`] });
      setReplyMessage("");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C4A35A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#F5F0E8] mb-4">Thread Not Found</h1>
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

  // Parse date as local date to avoid timezone shift (e.g., May 2 UTC becoming May 1 in US timezones)
  const eventDate = inquiry.eventDate
    ? (() => {
        const dateStr = inquiry.eventDate.split('T')[0]; // "2026-05-02"
        const [year, month, day] = dateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day); // Creates local date
        return format(localDate, "MMMM d, yyyy");
      })()
    : "Date TBD";

  const handleSendReply = () => {
    if (replyMessage.trim()) {
      sendMessageMutation.mutate(replyMessage);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="text-center mb-8 pb-6 border-b border-[#333]">
          <h1 className="text-2xl font-serif text-[#F5F0E8] mb-2">
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
                    : "bg-[#222] border-l-2 border-[#C4A35A] mr-8"
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
                <p className="text-[#F5F0E8] whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="sticky bottom-0 bg-[#1A1A1A] pt-4 pb-6 border-t border-[#333]">
          <div className="flex gap-3">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-[#222] border border-[#333] text-[#F5F0E8] placeholder-[#666] p-3 rounded resize-none focus:outline-none focus:border-[#C4A35A]"
              rows={3}
              data-testid="input-reply-message"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyMessage.trim() || sendMessageMutation.isPending}
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

        <footer className="text-center mt-8 pt-6 border-t border-[#333]">
          <p className="text-[#666] text-xs">
            This is a private conversation thread for your inquiry.
          </p>
        </footer>
      </div>
    </div>
  );
}
