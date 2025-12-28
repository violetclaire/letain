import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScheduleChatMessage {
  id: string;
  scheduleId: string;
  senderName: string;
  senderType: 'guest' | 'ai' | 'artist';
  content: string;
  metadata?: {
    aiAction?: string;
    appointmentId?: string;
    changeDescription?: string;
  };
  createdAt: string;
}

interface ScheduleChatProps {
  shareToken: string;
  guestName?: string;
}

export default function ScheduleChat({ shareToken, guestName }: ScheduleChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState(guestName || "");
  const [showNameInput, setShowNameInput] = useState(!guestName);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ScheduleChatMessage[]>({
    queryKey: ["schedule-chat", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/chat`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: isOpen ? 10000 : false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, senderName }: { content: string; senderName: string }) => {
      const res = await fetch(`/api/event-schedules/share/${shareToken}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, senderName }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-chat", shareToken] });
      queryClient.invalidateQueries({ queryKey: ["public-schedule", shareToken] });
      setMessage("");
    },
  });

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!message.trim() || !userName.trim()) return;
    setShowNameInput(false);
    sendMessageMutation.mutate({ content: message.trim(), senderName: userName.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-[#6B4A55] text-white p-4 rounded-full shadow-lg hover:bg-[#8a6270] transition-all z-50 flex items-center gap-2"
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="hidden sm:inline font-medium">Chat with AI</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[500px]">
          <div className="flex items-center justify-between p-4 border-b bg-[#6B4A55] text-white rounded-t-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F2] min-h-[200px]">
            {isLoading ? (
              <p className="text-center text-gray-500 text-sm">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#6B4A55]" />
                <p className="font-medium text-[#6B4A55]">Hi there!</p>
                <p>Ask me anything about the schedule or leave a note for your stylist.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === 'guest' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.senderType === 'ai'
                        ? 'bg-white border border-[#6B4A55]/20 text-gray-800'
                        : msg.senderType === 'artist'
                        ? 'bg-[#C9A961]/20 text-gray-800'
                        : 'bg-[#6B4A55] text-white'
                    }`}
                    data-testid={`chat-message-${msg.id}`}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.senderType === 'ai' ? 'AI Assistant' : msg.senderName}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.metadata?.changeDescription && (
                      <p className="text-xs mt-1 opacity-70 italic">
                        {msg.metadata.changeDescription}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {showNameInput && !userName ? (
            <div className="p-3 border-t bg-white">
              <p className="text-sm text-gray-600 mb-2">What's your name?</p>
              <div className="flex gap-2">
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1"
                  data-testid="input-chat-name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && userName.trim()) {
                      setShowNameInput(false);
                    }
                  }}
                />
                <Button
                  onClick={() => userName.trim() && setShowNameInput(false)}
                  disabled={!userName.trim()}
                  className="bg-[#6B4A55] hover:bg-[#8a6270]"
                  data-testid="button-set-name"
                >
                  Start
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t bg-white rounded-b-xl">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question or leave a note..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-[#6B4A55] hover:bg-[#8a6270]"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Chatting as <span className="font-medium">{userName}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
