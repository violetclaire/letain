import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInviteData {
  id: string;
  vendorName: string;
  clientName: string;
  clientEmail: string;
  eventDate?: string;
  serviceType?: string;
  status: string;
  artistSlug?: string;
}

export default function ChatInvite() {
  const [, params] = useRoute("/chat-invite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = params?.token || "";

  const [message, setMessage] = useState("");

  const { data: inviteData, isLoading, error } = useQuery<ChatInviteData>({
    queryKey: ["/api/chat-invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/chat-invite/${token}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Invalid or expired invite");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const res = await fetch(`/api/chat-invite/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been delivered to the artist.",
      });
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate(message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#F5F0E8] mx-auto mb-4" />
          <p className="text-[#F5F0E8]/60">Loading your chat invite...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="border border-[#F5F0E8]/20 rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-[#F5F0E8] mb-2">Invite Not Found</h2>
            <p className="text-[#F5F0E8]/60 mb-6">
              This chat invite may have expired or is no longer valid.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-3 bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white transition-colors rounded font-medium"
              data-testid="button-go-home"
            >
              Go Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="border border-[#F5F0E8]/20 rounded-lg p-6 bg-[#1A1A1A]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#F5F0E8]/10 border border-[#F5F0E8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#F5F0E8]" />
              </div>
              <h2 className="font-serif text-xl text-[#F5F0E8] mb-1">
                Chat with {inviteData.vendorName}
              </h2>
              <p className="text-sm text-[#F5F0E8]/60">
                Hi {inviteData.clientName}! Send a message about your upcoming event.
              </p>
              {inviteData.eventDate && (
                <p className="text-xs text-[#F5F0E8]/40 mt-2">
                  Event Date: {new Date(inviteData.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#F5F0E8]/70 mb-1">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#F5F0E8]/20 focus:outline-none focus:border-[#F5F0E8]/40 bg-[#222] text-[#F5F0E8] placeholder:text-[#F5F0E8]/30 rounded resize-none"
                  data-testid="input-chat-message"
                />
              </div>

              <button
                type="submit"
                disabled={sendMessage.isPending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded font-medium"
                data-testid="button-send-message"
              >
                {sendMessage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </button>
            </form>

            {sendMessage.isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-[#F5F0E8]/10 border border-[#F5F0E8]/20 rounded flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-[#F5F0E8]" />
                <span className="text-sm text-[#F5F0E8]">
                  Message sent! {inviteData.vendorName} will reply soon.
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
