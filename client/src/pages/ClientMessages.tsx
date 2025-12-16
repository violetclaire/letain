import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, ArrowLeft, User, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ClientChat {
  id: string;
  inviteeEmail: string;
  clientName: string;
  status: string;
  eventDate: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  chatInviteId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function ClientMessages() {
  const [selectedChat, setSelectedChat] = useState<ClientChat | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chats, isLoading } = useQuery<ClientChat[]>({
    queryKey: ["/api/client-chats"],
    queryFn: async () => {
      const res = await fetch("/api/client-chats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chats");
      return res.json();
    },
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/client-chats", selectedChat?.id, "messages"],
    queryFn: async () => {
      if (!selectedChat) return [];
      const res = await fetch(`/api/client-chats/${selectedChat.id}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!selectedChat,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/client-chats/${selectedChat?.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/client-chats", selectedChat?.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-chats"] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the client.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A1F2B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="font-header text-3xl text-[#2C2C2C] mb-2">Client Messages</h1>
          <p className="text-[#666]">Chat with your clients and send contracts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chat List */}
          <div className="md:col-span-1">
            <Card className="p-4">
              <h2 className="font-medium text-[#2C2C2C] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversations
              </h2>
              
              {(!chats || chats.length === 0) ? (
                <p className="text-[#888] text-sm text-center py-8">No client conversations yet</p>
              ) : (
                <div className="space-y-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      data-testid={`chat-item-${chat.id}`}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedChat?.id === chat.id
                          ? "bg-[#5A1F2B] text-white"
                          : "bg-[#FAF9F7] hover:bg-[#F0EBE6]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium truncate">{chat.clientName}</span>
                      </div>
                      <p className={`text-xs truncate ${selectedChat?.id === chat.id ? "text-white/70" : "text-[#888]"}`}>
                        {chat.inviteeEmail}
                      </p>
                      {chat.eventDate && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${selectedChat?.id === chat.id ? "text-white/70" : "text-[#888]"}`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(chat.eventDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Chat Messages */}
          <div className="md:col-span-2">
            <Card className="p-4 min-h-[500px] flex flex-col">
              {!selectedChat ? (
                <div className="flex-1 flex items-center justify-center text-[#888]">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-[#E5E5E5] mb-4">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="md:hidden p-2 hover:bg-[#F0EBE6] rounded"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="font-medium text-[#2C2C2C]">{selectedChat.clientName}</h3>
                      <p className="text-sm text-[#888]">{selectedChat.inviteeEmail}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5A1F2B]" />
                      </div>
                    ) : (!messages || messages.length === 0) ? (
                      <p className="text-center text-[#888] py-8">No messages yet. Send one to start the conversation.</p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          data-testid={`message-${msg.id}`}
                          className={`flex ${msg.senderType === "artist" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.senderType === "artist"
                                ? "bg-[#5A1F2B] text-white"
                                : msg.senderType === "ai"
                                ? "bg-[#C9A961] text-white"
                                : "bg-[#F0EBE6] text-[#2C2C2C]"
                            }`}
                          >
                            <p className="text-xs font-medium mb-1 opacity-75">
                              {msg.senderName} {msg.senderType === "ai" && "(AI)"}
                            </p>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs mt-1 opacity-50">
                              {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-[#E5E5E5] pt-4">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="mb-2 min-h-[80px]"
                      data-testid="message-input"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sendMessage.isPending}
                        className="bg-[#5A1F2B] hover:bg-[#4A1521] text-white"
                        data-testid="send-message-btn"
                      >
                        {sendMessage.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send Message
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
