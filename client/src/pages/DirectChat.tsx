import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DirectChatUI as DirectChat, DirectChatMessageUI as DirectChatMessage } from "@shared/types";

interface ChatData {
  chat: DirectChat;
  messages: DirectChatMessage[];
  artist: {
    name: string;
    slug?: string;
  };
}

export default function DirectChat() {
  const [, params] = useRoute("/chat/:token");
  const token = params?.token;
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ChatData>({
    queryKey: ["/api/public/chat", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/chat/${token}`);
      if (!res.ok) throw new Error("Chat not found");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/public/chat/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/public/chat", token] });
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
          <p className="text-sm text-[#1A1A1A]/60">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const { chat, messages, artist } = data;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex flex-col">
      <header className="border-b border-[#E8E2D9] p-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-[#1A1A1A]/40 mb-1">Conversation with</p>
          <h1 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>{artist.name}</h1>
          {chat.subject && (
            <p className="text-sm text-[#1A1A1A]/60 mt-1">{chat.subject}</p>
          )}
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
                className={`flex ${msg.senderType === "participant" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.senderType === "participant"
                      ? "bg-[#C4A35A] text-[#1A1A1A]"
                      : "bg-[#F5F2ED] border border-[#E8E2D9]"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p className={`text-xs mb-1 ${msg.senderType === "participant" ? "text-[#1A1A1A]/60" : "text-[#1A1A1A]/50"}`}>
                    {msg.senderName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 ${msg.senderType === "participant" ? "text-[#1A1A1A]/40" : "text-[#1A1A1A]/30"}`}>
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
              data-testid="input-chat-message"
            />
            <button
              type="submit"
              disabled={sendMessage.isPending || !message.trim()}
              className="px-6 py-3 bg-[#C4A35A] text-[#1A1A1A] rounded hover:bg-[#C4A35A]/90 disabled:opacity-50 flex items-center gap-2"
              data-testid="button-send-message"
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
