import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useSearch } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Loader2, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DirectChatMessage {
  id: string;
  directChatId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface DirectChat {
  id: string;
  artistId: string;
  participantName: string;
  participantEmail: string;
  participantRole: string;
  subject?: string;
  createdAt: string;
}

interface ChatData {
  chat: DirectChat;
  messages: DirectChatMessage[];
}

export default function ArtistQuickChat() {
  const [, params] = useRoute("/quick-chat/:chatToken");
  const chatToken = params?.chatToken;
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const authToken = urlParams.get('token');
  
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery<ChatData>({
    queryKey: ["/api/artist/direct-chat", chatToken, authToken],
    queryFn: async () => {
      const endpoint = authToken 
        ? `/api/public/direct-chat/${chatToken}?token=${encodeURIComponent(authToken)}`
        : `/api/artist/direct-chat/${chatToken}`;
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error("Chat not found");
      return res.json();
    },
    enabled: !!chatToken,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = authToken 
        ? `/api/public/direct-chat/${chatToken}/messages?token=${encodeURIComponent(authToken)}`
        : `/api/artist/direct-chat/${chatToken}/messages`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/artist/direct-chat", chatToken, authToken] });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C4A35A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Chat Not Found</h1>
          <p className="text-sm text-[#1A1A1A]/60">This chat may not exist or you don't have access.</p>
        </div>
      </div>
    );
  }

  const { chat, messages } = data;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex flex-col">
      <header className="border-b border-[#E8E2D9] p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-[#F5F0E8]/5 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{chat.participantName}</h1>
            <p className="text-xs text-[#1A1A1A]/50 capitalize">{chat.participantRole}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-[#1A1A1A]/20 mx-auto mb-4" />
              <p className="text-sm text-[#1A1A1A]/40">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === "artist" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.senderType === "artist"
                      ? "bg-[#C4A35A] text-[#1A1A1A]"
                      : "bg-[#F5F2ED] border border-[#E8E2D9]"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p className={`text-xs mb-1 ${msg.senderType === "artist" ? "text-[#1A1A1A]/60" : "text-[#1A1A1A]/50"}`}>
                    {msg.senderName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 ${msg.senderType === "artist" ? "text-[#1A1A1A]/40" : "text-[#1A1A1A]/30"}`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-[#E8E2D9] p-4">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) {
                sendMessage.mutate(message.trim());
              }
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#999]"
              data-testid="input-artist-chat-message"
            />
            <button
              type="submit"
              disabled={sendMessage.isPending || !message.trim()}
              className="px-6 py-3 bg-[#C4A35A] text-[#1A1A1A] rounded hover:bg-[#C4A35A]/90 disabled:opacity-50 flex items-center gap-2"
              data-testid="button-send-artist-message"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
