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
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#5A1F2B] mx-auto mb-4" />
          <p className="text-[#666]">Loading your chat invite...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-1 border border-[#2C2C2C] max-w-md w-full"
        >
          <div className="border border-[#2C2C2C] p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Invite Not Found</h2>
            <p className="text-[#666] mb-6">
              This chat invite may have expired or is no longer valid.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-3 bg-[#5A1F2B] text-white hover:bg-[#4a1923] transition-colors"
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
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-[#2C2C2C] flex items-center justify-center">
        <h1 className="font-script text-2xl text-[#2C2C2C]">Your Private Secretary</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-1 border border-[#2C2C2C]"
        >
          <div className="border border-[#2C2C2C] p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FAF9F7] border border-[#2C2C2C] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#5A1F2B]" />
              </div>
              <h2 className="font-header text-xl text-[#2C2C2C] mb-1">
                Chat with {inviteData.vendorName}
              </h2>
              <p className="text-sm text-[#666]">
                Hi {inviteData.clientName}! Send a message about your upcoming event.
              </p>
              {inviteData.eventDate && (
                <p className="text-xs text-[#888] mt-2">
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
                <label className="block text-sm font-medium text-[#2C2C2C] mb-1">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A1F2B] bg-[#FAF9F7] text-[#2C2C2C] resize-none"
                  data-testid="input-chat-message"
                />
              </div>

              <button
                type="submit"
                disabled={sendMessage.isPending || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#5A1F2B] text-white hover:bg-[#4a1923] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="mt-4 p-3 bg-green-50 border border-green-200 rounded flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">
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
