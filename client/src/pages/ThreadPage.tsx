import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, CheckCircle, XCircle, Users } from "lucide-react";

interface Thread {
  id: string;
  threadPublicToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate?: string;
  eventType?: string;
  serviceType?: string;
  message?: string;
  status: string;
  createdAt: string;
}

interface ThreadMessage {
  id: string;
  actorType: string;
  body: string;
  createdAt: string;
}

interface ArtistBrand {
  businessName: string;
  logoUrl?: string;
}

export default function ThreadPage() {
  const [, params] = useRoute("/t/:token");
  const token = params?.token || "";
  const queryClient = useQueryClient();
  const [replyMessage, setReplyMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["thread", token],
    queryFn: async () => {
      const res = await fetch(`/api/threads/${token}`);
      if (!res.ok) throw new Error("Thread not found");
      return res.json();
    },
    enabled: !!token,
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/threads/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, actorType: "client" }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["thread", token] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyMessage.trim()) {
      sendMessage.mutate(replyMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#2D2D2D]/50 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            This link is no longer active.
          </p>
        </div>
      </div>
    );
  }

  const { thread, messages, artist }: { thread: Thread; messages: ThreadMessage[]; artist: ArtistBrand } = data;

  const statusLabels: Record<string, { label: string; color: string }> = {
    inquiry: { label: "Pending Review", color: "text-amber-600" },
    proceeding: { label: "Confirmed", color: "text-green-600" },
    referred: { label: "Referred", color: "text-blue-600" },
    declined: { label: "Unavailable", color: "text-red-600" },
    closed: { label: "Completed", color: "text-gray-600" },
  };

  const status = statusLabels[thread.status] || statusLabels.inquiry;

  return (
    <div className="min-h-screen bg-[#F9F8F6]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          {artist.logoUrl && (
            <img 
              src={artist.logoUrl} 
              alt={artist.businessName}
              className="h-12 mx-auto mb-6 object-contain"
            />
          )}
          <h1 
            className="text-2xl text-[#2D2D2D] mb-2" 
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="text-artist-name"
          >
            {artist.businessName}
          </h1>
          <p className="text-xs text-[#2D2D2D]/40 uppercase tracking-widest">
            Private Coordination
          </p>
        </header>

        <div className="bg-white border border-[#2D2D2D]/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/40 mb-1">Your Inquiry</p>
              <p className="text-sm font-medium text-[#2D2D2D]" data-testid="text-client-name">
                {thread.clientName}
              </p>
            </div>
            <span className={`text-xs font-medium ${status.color}`} data-testid="text-thread-status">
              {status.label}
            </span>
          </div>

          {thread.eventDate && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/40 mb-1">Event Date</p>
              <p className="text-sm text-[#2D2D2D]">
                {new Date(thread.eventDate).toLocaleDateString('en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
            </div>
          )}

          {thread.message && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/40 mb-1">Message</p>
              <p className="text-sm text-[#2D2D2D]/80 whitespace-pre-wrap">{thread.message}</p>
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-widest text-[#2D2D2D]/40 mb-4">Conversation</p>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 ${
                    msg.actorType === "client"
                      ? "bg-[#2D2D2D]/5 ml-8"
                      : msg.actorType === "system"
                      ? "bg-amber-50 border border-amber-100"
                      : "bg-white border border-[#2D2D2D]/10 mr-8"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p className="text-xs text-[#2D2D2D]/40 mb-2">
                    {msg.actorType === "artist" ? artist.businessName : 
                     msg.actorType === "system" ? "System" : "You"}
                  </p>
                  <p className="text-sm text-[#2D2D2D]/80 whitespace-pre-wrap">{msg.body}</p>
                  <p className="text-[10px] text-[#2D2D2D]/30 mt-2">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {thread.status === "inquiry" || thread.status === "proceeding" ? (
          <form onSubmit={handleSubmit} className="bg-white border border-[#2D2D2D]/10 p-4">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Send a message..."
              className="w-full border-0 bg-transparent resize-none focus:outline-none text-sm text-[#2D2D2D] placeholder-[#2D2D2D]/30"
              rows={3}
              data-testid="input-message"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!replyMessage.trim() || sendMessage.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D2D2D] text-white text-xs uppercase tracking-wider disabled:opacity-50"
                data-testid="button-send-message"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#2D2D2D]/50">
              This thread is now {thread.status}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
