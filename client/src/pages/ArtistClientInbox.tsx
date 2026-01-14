import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageSquare, Clock, Mail, ChevronRight, Search, User, Calendar, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Inquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate: string;
  serviceType: string;
  message?: string;
  status: string;
  createdAt: string;
  threadToken?: string;
}

interface DirectChat {
  id: string;
  artistId: string;
  participantName: string;
  participantEmail: string;
  threadToken: string;
  createdAt: string;
}

interface DirectChatMessage {
  id: string;
  directChatId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ThreadMessage {
  id: string;
  threadId: string;
  actorType: string;
  body: string;
  createdAt: string;
}

type ClientItem = {
  type: 'inquiry' | 'chat';
  id: string;
  name: string;
  email: string;
  phone?: string;
  eventDate?: string;
  status?: string;
  lastMessage?: string;
  createdAt: string;
  threadToken?: string;
  isNew?: boolean;
};

export default function ArtistClientInbox() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch inquiries
  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/artist/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/artist/inquiries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch direct chats
  const { data: directChats = [], isLoading: chatsLoading } = useQuery<DirectChat[]>({
    queryKey: ["/api/artist/direct-chats"],
    queryFn: async () => {
      const res = await fetch("/api/artist/direct-chats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch messages for selected inquiry thread
  const { data: threadMessages = [] } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/threads", selectedClient?.threadToken, "messages"],
    queryFn: async () => {
      if (!selectedClient?.threadToken) return [];
      const res = await fetch(`/api/threads/${selectedClient.threadToken}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedClient?.threadToken && selectedClient?.type === 'inquiry',
    refetchInterval: 5000,
  });

  // Fetch messages for selected direct chat
  const { data: chatData } = useQuery<{ chat: DirectChat; messages: DirectChatMessage[] }>({
    queryKey: ["/api/artist/direct-chat", selectedClient?.threadToken],
    queryFn: async () => {
      if (!selectedClient?.threadToken) return null;
      const res = await fetch(`/api/artist/direct-chat/${selectedClient.threadToken}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedClient?.threadToken && selectedClient?.type === 'chat',
    refetchInterval: 5000,
  });

  // Send message to inquiry thread
  const sendThreadMessage = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/threads/${selectedClient?.threadToken}/artist-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/threads", selectedClient?.threadToken, "messages"] });
    },
  });

  // Send message to direct chat
  const sendChatMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/artist/direct-chat/${selectedClient?.threadToken}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/artist/direct-chat", selectedClient?.threadToken] });
    },
  });

  // Combine and sort clients
  const allClients: ClientItem[] = [
    ...inquiries.map((inq) => ({
      type: 'inquiry' as const,
      id: inq.id,
      name: inq.clientName,
      email: inq.clientEmail,
      phone: inq.clientPhone,
      eventDate: inq.eventDate,
      status: inq.status,
      createdAt: inq.createdAt,
      threadToken: inq.threadToken,
      isNew: inq.status === 'pending',
    })),
    ...directChats.map((chat) => ({
      type: 'chat' as const,
      id: chat.id,
      name: chat.participantName,
      email: chat.participantEmail,
      createdAt: chat.createdAt,
      threadToken: chat.threadToken,
      isNew: false,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter by search
  const filteredClients = allClients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // New inquiries (pending status)
  const newInquiries = filteredClients.filter((c) => c.type === 'inquiry' && c.isNew);

  // All other clients
  const otherClients = filteredClients.filter((c) => !(c.type === 'inquiry' && c.isNew));

  // Get current messages
  const currentMessages = selectedClient?.type === 'inquiry' 
    ? threadMessages.map(m => ({ 
        id: m.id, 
        sender: m.actorType === 'artist' ? 'You' : selectedClient.name,
        isArtist: m.actorType === 'artist',
        content: m.body, 
        createdAt: m.createdAt 
      }))
    : (chatData?.messages || []).map(m => ({
        id: m.id,
        sender: m.senderType === 'artist' ? 'You' : m.senderName,
        isArtist: m.senderType === 'artist',
        content: m.content,
        createdAt: m.createdAt,
      }));

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  const handleSend = () => {
    if (!message.trim() || !selectedClient) return;
    if (selectedClient.type === 'inquiry') {
      sendThreadMessage.mutate(message.trim());
    } else {
      sendChatMessage.mutate(message.trim());
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <p className="text-[#1A1A1A]">Please log in to access your inbox.</p>
      </div>
    );
  }

  const isLoading = inquiriesLoading || chatsLoading;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* New Inquiries Strip */}
      {newInquiries.length > 0 && (
        <div className="bg-[#F5F0E8] border-b border-[#E8E2D9] px-6 py-4">
          <h2 className="text-sm font-medium text-[#666] uppercase tracking-wide mb-3">New Inquiries</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {newInquiries.slice(0, 5).map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`flex-shrink-0 bg-white border rounded-lg p-4 text-left hover:border-[#1A1A1A] transition-colors min-w-[200px] ${
                  selectedClient?.id === client.id ? 'border-[#1A1A1A] ring-1 ring-[#1A1A1A]' : 'border-[#E8E2D9]'
                }`}
              >
                <p className="font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{client.name}</p>
                {client.eventDate && (
                  <p className="text-sm text-[#666] mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(client.eventDate).toLocaleDateString()}
                  </p>
                )}
                <p className="text-xs text-[#999] mt-2">
                  {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Split Pane */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left: Client List */}
        <div className="w-80 border-r border-[#E8E2D9] bg-white flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-[#E8E2D9]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E8E2D9] rounded-lg bg-[#FAF8F5] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-[#999]" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-[#999]">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No clients yet</p>
              </div>
            ) : (
              <div>
                {filteredClients.map((client) => (
                  <button
                    key={`${client.type}-${client.id}`}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-4 border-b border-[#E8E2D9] hover:bg-[#FAF8F5] transition-colors ${
                      selectedClient?.id === client.id ? 'bg-[#F5F0E8]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#1A1A1A] truncate">{client.name}</p>
                          {client.isNew && (
                            <span className="px-2 py-0.5 text-xs bg-[#1A1A1A] text-[#F5F0E8] rounded">New</span>
                          )}
                        </div>
                        <p className="text-sm text-[#666] truncate">{client.email}</p>
                        {client.eventDate && (
                          <p className="text-xs text-[#999] mt-1">
                            Event: {new Date(client.eventDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#999] flex-shrink-0" />
                    </div>
                    <p className="text-xs text-[#999] mt-2">
                      {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Chat Pane */}
        <div className="flex-1 flex flex-col bg-[#FAF8F5]">
          {selectedClient ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-[#E8E2D9] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                      {selectedClient.name}
                    </h2>
                    <p className="text-sm text-[#666]">{selectedClient.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#666]">
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedClient.phone}
                      </span>
                    )}
                    {selectedClient.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedClient.eventDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-12 text-[#999]">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {currentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isArtist ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-3 ${
                            msg.isArtist
                              ? 'bg-[#1A1A1A] text-[#F5F0E8]'
                              : 'bg-white border border-[#E8E2D9] text-[#1A1A1A]'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-2 ${msg.isArtist ? 'text-[#F5F0E8]/60' : 'text-[#999]'}`}>
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-[#E8E2D9] p-4">
                <div className="flex gap-3 max-w-2xl mx-auto">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-[#E8E2D9] rounded-lg bg-[#FAF8F5] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sendThreadMessage.isPending || sendChatMessage.isPending}
                    className="px-6 py-3 bg-[#1A1A1A] text-[#F5F0E8] rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendThreadMessage.isPending || sendChatMessage.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#999]">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a client to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
