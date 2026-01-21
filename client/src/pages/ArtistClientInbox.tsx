import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, MessageSquare, ChevronDown, ChevronUp, Search, User, Calendar, Phone } from "lucide-react";
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
  createdAt: string;
  threadToken?: string;
};

const STATUS_ORDER = ['pending', 'responded', 'accepted', 'contract sent', 'referred', 'declined', 'completed'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  responded: 'Responded',
  accepted: 'Accepted',
  'contract sent': 'Contract Sent',
  referred: 'Referred',
  declined: 'Declined',
  completed: 'Completed',
  'auto responded': 'Auto Responded',
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-[#FAF8F5] text-[#1A1A1A]';
    case 'responded': return 'bg-[#E8E2D9] text-[#1A1A1A]';
    case 'accepted': return 'bg-green-100 text-green-800';
    case 'contract sent': return 'bg-blue-100 text-blue-800';
    case 'referred': return 'bg-purple-100 text-purple-800';
    case 'declined': return 'bg-red-100 text-red-800';
    default: return 'bg-[#E8E2D9] text-[#666]';
  }
}

export default function ArtistClientInbox() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['completed', 'declined', 'referred', 'responded', 'contract sent', 'auto responded', 'chat']));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: inquiries = [], isLoading: inquiriesLoading } = useQuery<Inquiry[]>({
    queryKey: ["/api/artist/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/artist/inquiries", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: directChats = [], isLoading: chatsLoading } = useQuery<DirectChat[]>({
    queryKey: ["/api/artist/direct-chats"],
    queryFn: async () => {
      const res = await fetch("/api/artist/direct-chats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
    enabled: isAuthenticated,
  });

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

  // Combine clients
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
    })),
    ...directChats.map((chat) => ({
      type: 'chat' as const,
      id: chat.id,
      name: chat.participantName,
      email: chat.participantEmail,
      createdAt: chat.createdAt,
      threadToken: chat.threadToken,
      status: 'chat',
    })),
  ];

  // Filter by search and status
  const filteredClients = allClients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by status
  const groupedClients = filteredClients.reduce((acc, client) => {
    const status = client.status || 'other';
    if (!acc[status]) acc[status] = [];
    acc[status].push(client);
    return acc;
  }, {} as Record<string, ClientItem[]>);

  // Sort within groups by createdAt
  Object.keys(groupedClients).forEach(status => {
    groupedClients[status].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // Get status counts
  const statusCounts = allClients.reduce((acc, c) => {
    const status = c.status || 'other';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

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

  // Order of sections to display
  const orderedStatuses = [...STATUS_ORDER, 'chat', 'auto responded', 'other'].filter(s => groupedClients[s]?.length);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex">
      {/* Left: Compact Client Folder */}
      <div className="w-56 border-r border-[#E8E2D9] bg-white flex flex-col h-screen">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#E8E2D9] flex items-center justify-between">
          <h1 className="text-base font-medium text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Clients</h1>
          <span className="text-xs text-[#999]">{allClients.length}</span>
        </div>

        {/* Search */}
        <div className="px-2 py-1.5 border-b border-[#E8E2D9]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#999]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs border border-[#E8E2D9] rounded bg-[#FAF8F5] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="px-2 py-1.5 border-b border-[#E8E2D9] flex gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${statusFilter === 'all' ? 'bg-[#FAF8F5] text-[#1A1A1A]' : 'bg-[#F5F0E8] text-[#666] hover:bg-[#E8E2D9]'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${statusFilter === 'pending' ? 'bg-[#FAF8F5] text-[#1A1A1A]' : 'bg-[#F5F0E8] text-[#666] hover:bg-[#E8E2D9]'}`}
          >
            New
          </button>
          <button
            onClick={() => setStatusFilter('accepted')}
            className={`px-1.5 py-0.5 text-[10px] rounded ${statusFilter === 'accepted' ? 'bg-[#FAF8F5] text-[#1A1A1A]' : 'bg-[#F5F0E8] text-[#666] hover:bg-[#E8E2D9]'}`}
          >
            Booked
          </button>
        </div>

        {/* Client List - Grouped */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-[#999]" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-[#999]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No clients found</p>
            </div>
          ) : (
            orderedStatuses.map(status => (
              <div key={status}>
                {/* Folder Header */}
                <button
                  onClick={() => toggleSection(status)}
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#F5F0E8] text-[10px] font-medium text-[#666] uppercase tracking-wide hover:bg-[#E8E2D9]"
                >
                  <span>{STATUS_LABELS[status] || status} ({groupedClients[status].length})</span>
                  {collapsedSections.has(status) ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                </button>
                
                {/* Compact single-line client rows */}
                {!collapsedSections.has(status) && groupedClients[status].map((client) => (
                  <button
                    key={`${client.type}-${client.id}`}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left px-2 py-1 border-b border-[#F5F0E8] hover:bg-[#FAF8F5] transition-colors ${
                      selectedClient?.id === client.id ? 'bg-[#F5F0E8]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-[#1A1A1A] truncate flex-1">{client.name}</span>
                      {client.eventDate && (
                        <span className="text-[9px] text-[#999] flex-shrink-0">
                          {new Date(client.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Pane */}
      <div className="flex-1 flex flex-col bg-[#FAF8F5] h-screen">
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
                  {selectedClient.status && selectedClient.type === 'inquiry' && (
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedClient.status)}`}>
                      {STATUS_LABELS[selectedClient.status] || selectedClient.status}
                    </span>
                  )}
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
                            ? 'bg-[#FAF8F5] text-[#1A1A1A]'
                            : 'bg-white border border-[#E8E2D9] text-[#1A1A1A]'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-2 ${msg.isArtist ? 'text-[#1A1A1A]/60' : 'text-[#999]'}`}>
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
                  className="px-6 py-3 bg-[#FAF8F5] text-[#1A1A1A] rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  );
}
