import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Calendar, Bell, Settings, Check, X, Send, MessageCircle, Copy, DollarSign, Clock, MapPin, ChevronRight, Plus, Search, Loader2, ExternalLink } from "lucide-react";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate: string;
  location?: string;
  serviceType?: string;
  status: string;
  totalAmount?: number;
}

interface Message {
  id: string;
  contactName: string;
  contactPhoto?: string;
  lastMessage: string;
  unread: boolean;
  timestamp: string;
  conversationType: string;
}

interface Request {
  id: string;
  clientName: string;
  clientEmail?: string;
  eventDate: string;
  serviceType?: string;
  amount?: number;
  status: string;
  createdAt: string;
}

export default function ArtistDashboardNew() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(0);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [scheduleLink, setScheduleLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: "",
    service: "",
    amount: "",
    dueDate: "",
    sendVia: "email" as "email" | "sms",
  });
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, inquiriesRes, profileRes] = await Promise.all([
        fetch(`/api/bookings/artist/${user?.id}`, { credentials: "include" }),
        fetch(`/api/inquiries?artistId=${user?.id}`, { credentials: "include" }),
        fetch(`/api/artist-profiles/${user?.id}`, { credentials: "include" }),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }

      if (inquiriesRes.ok) {
        const data = await inquiriesRes.json();
        setRequests(data.filter((i: any) => i.status === "pending" || i.status === "inquiry"));
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        setArtistProfile(data);
        setScheduleLink(`${window.location.origin}/book/${data?.slug || user?.id}`);
      }

      await fetchMessages();
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    try {
      const [clientMsgsRes, businessMsgsRes] = await Promise.all([
        fetch(`/api/client-messages/artist/${user?.id}`, { credentials: "include" }),
        fetch(`/api/business-chat/artist/${user?.id}`, { credentials: "include" }),
      ]);

      const allMessages: Message[] = [];

      if (clientMsgsRes.ok) {
        const data = await clientMsgsRes.json();
        const grouped = groupMessagesByContact(data, "client");
        allMessages.push(...grouped);
      }

      if (businessMsgsRes.ok) {
        const data = await businessMsgsRes.json();
        const grouped = groupMessagesByContact(data, "business");
        allMessages.push(...grouped);
      }

      allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMessages(allMessages);
      setNotifications(allMessages.filter(m => m.unread).length);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const groupMessagesByContact = (messages: any[], type: string): Message[] => {
    const grouped: Record<string, Message> = {};
    messages.forEach((msg: any) => {
      const contactId = msg.clientContactId || msg.senderId || msg.id;
      const contactName = msg.senderName || msg.clientName || "Unknown";
      if (!grouped[contactId] || new Date(msg.createdAt) > new Date(grouped[contactId].timestamp)) {
        grouped[contactId] = {
          id: contactId,
          contactName,
          contactPhoto: msg.senderPhoto,
          lastMessage: msg.content || msg.message || "",
          unread: !msg.isRead,
          timestamp: msg.createdAt,
          conversationType: type,
        };
      }
    });
    return Object.values(grouped);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/inquiries/${requestId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Request Accepted", description: "Client has been notified." });
        setRequests(prev => prev.filter(r => r.id !== requestId));
        fetchDashboardData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to accept request", variant: "destructive" });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/inquiries/${requestId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Request Declined" });
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to decline request", variant: "destructive" });
    }
  };

  const copyScheduleLink = () => {
    navigator.clipboard.writeText(scheduleLink);
    setCopiedLink(true);
    toast({ title: "Link Copied!", description: "Your schedule link is ready to share." });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientName || !invoiceForm.amount) {
      toast({ title: "Missing Info", description: "Please fill in client name and amount", variant: "destructive" });
      return;
    }
    setSendingInvoice(true);
    try {
      toast({ title: "Invoice Sent!", description: `Invoice for $${invoiceForm.amount} sent to ${invoiceForm.clientName}` });
      setShowInvoiceModal(false);
      setInvoiceForm({ clientName: "", service: "", amount: "", dueDate: "", sendVia: "email" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" });
    }
    setSendingInvoice(false);
  };

  const openChat = async (message: Message) => {
    setSelectedChat(message.id);
    setChatMessages([{ from: "them", text: message.lastMessage, timestamp: message.timestamp }]);
  };

  const sendChatMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;
    setSendingMessage(true);
    setChatMessages(prev => [...prev, { from: "me", text: messageInput, timestamp: new Date().toISOString() }]);
    setMessageInput("");
    setSendingMessage(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-[#5A1F2B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235A1F2B' fill-opacity='0.03'%3E%3Cpath d='M0 0h20v20H0zM20 20h20v20H20z'/%3E%3C/g%3E%3C/svg%3E\")" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#5A1F2B]/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-[#5A1F2B]" data-testid="link-home">
            Beauvette
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#262329]">{user?.firstName || "Artist"}</span>
            {user?.profileImageUrl && (
              <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button className="relative p-2 hover:bg-[#5A1F2B]/5 rounded-full" data-testid="button-notifications">
              <Bell size={20} className="text-[#5A1F2B]" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
            <Link href="/artist/settings" className="p-2 hover:bg-[#5A1F2B]/5 rounded-full" data-testid="link-settings">
              <Settings size={20} className="text-[#5A1F2B]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* 4-Quadrant Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          
          {/* Quadrant 1: Calendar (Top Left - Largest) */}
          <div className="md:row-span-2 bg-white rounded-xl shadow-sm border border-[#5A1F2B]/10 p-4" data-testid="quadrant-calendar">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#5A1F2B]">Calendar</h2>
              <Link href="/artist/calendar" className="text-xs text-[#5A1F2B] hover:underline flex items-center gap-1">
                View Full <ChevronRight size={12} />
              </Link>
            </div>
            <AvailabilityCalendar 
              userId={user?.id || ""}
            />
          </div>

          {/* Quadrant 2: Requests (Top Right) */}
          <div className="bg-white rounded-xl shadow-sm border border-[#5A1F2B]/10 p-4" data-testid="quadrant-requests">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#5A1F2B]">
                Requests
                {requests.length > 0 && (
                  <span className="ml-2 bg-[#5A1F2B] text-white text-xs px-2 py-0.5 rounded-full">
                    {requests.length}
                  </span>
                )}
              </h2>
            </div>
            
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {requests.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No pending requests</p>
              ) : (
                requests.slice(0, 5).map((req) => (
                  <div key={req.id} className="p-3 bg-[#FAF8F5] rounded-lg" data-testid={`request-${req.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{req.clientName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(req.eventDate).toLocaleDateString()} • {req.serviceType || "Service"}
                        </p>
                        {req.amount && (
                          <p className="text-xs font-medium text-[#5A1F2B] mt-1">${(req.amount / 100).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          data-testid={`button-accept-${req.id}`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          data-testid={`button-decline-${req.id}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quadrant 3: Messages (Bottom Left) */}
          <div className="bg-white rounded-xl shadow-sm border border-[#5A1F2B]/10 p-4" data-testid="quadrant-messages">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-[#5A1F2B]">
                Messages
                {notifications > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {notifications}
                  </span>
                )}
              </h2>
            </div>
            
            <div className="mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                  data-testid="input-search-messages"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No messages yet</p>
              ) : (
                messages.slice(0, 5).map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => openChat(msg)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      msg.unread ? "bg-[#5A1F2B]/5" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#5A1F2B]/10 flex items-center justify-center text-xs font-medium text-[#5A1F2B]">
                        {msg.contactName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${msg.unread ? "font-semibold" : ""}`}>
                            {msg.contactName}
                          </p>
                          {msg.unread && <span className="w-2 h-2 bg-[#5A1F2B] rounded-full" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{msg.lastMessage}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Quadrant 4: Quick Actions (Bottom Right) */}
          <div className="bg-white rounded-xl shadow-sm border border-[#5A1F2B]/10 p-4" data-testid="quadrant-actions">
            <h2 className="font-serif text-lg text-[#5A1F2B] mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-full py-3 bg-[#5A1F2B] text-white rounded-lg font-medium hover:bg-[#5A1F2B]/90 transition-colors flex items-center justify-center gap-2"
                data-testid="button-create-invoice"
              >
                <DollarSign size={18} />
                Create Invoice
              </button>
              
              <button
                onClick={copyScheduleLink}
                className="w-full py-2.5 border border-[#5A1F2B] text-[#5A1F2B] rounded-lg text-sm hover:bg-[#5A1F2B]/5 transition-colors flex items-center justify-center gap-2"
                data-testid="button-copy-schedule"
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                {copiedLink ? "Copied!" : "My Schedule Link"}
              </button>
              
              <div className="flex items-center justify-between p-3 bg-[#FAF8F5] rounded-lg">
                <span className="text-sm">Availability</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" data-testid="toggle-availability" />
                  <div className="w-9 h-5 bg-gray-300 peer-checked:bg-green-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
              
              <Link
                href="/artist/settings#payments"
                className="block w-full py-2.5 text-center text-sm text-[#5A1F2B] hover:underline"
                data-testid="link-payment-settings"
              >
                Payment Settings →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Slide Panel */}
      {selectedChat && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-[#5A1F2B] text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <span className="font-medium">{messages.find(m => m.id === selectedChat)?.contactName}</span>
            </div>
            <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-white/10 rounded">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  msg.from === "me" 
                    ? "bg-[#5A1F2B] text-white" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                data-testid="input-chat-message"
              />
              <button
                onClick={sendChatMessage}
                disabled={sendingMessage || !messageInput.trim()}
                className="p-2 bg-[#5A1F2B] text-white rounded-lg disabled:opacity-50"
                data-testid="button-send-message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-[#5A1F2B]">Create Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={invoiceForm.clientName}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                  placeholder="Enter client name"
                  data-testid="input-invoice-client"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Service</label>
                <select
                  value={invoiceForm.service}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                  data-testid="select-invoice-service"
                >
                  <option value="">Select service...</option>
                  <option value="bridal">Bridal Makeup</option>
                  <option value="bridesmaids">Bridesmaids</option>
                  <option value="trial">Trial Session</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                  placeholder="0.00"
                  data-testid="input-invoice-amount"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                  data-testid="input-invoice-due-date"
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-600 mb-2">Send Via</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendVia"
                      value="email"
                      checked={invoiceForm.sendVia === "email"}
                      onChange={() => setInvoiceForm(prev => ({ ...prev, sendVia: "email" }))}
                      className="text-[#5A1F2B]"
                    />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sendVia"
                      value="sms"
                      checked={invoiceForm.sendVia === "sms"}
                      onChange={() => setInvoiceForm(prev => ({ ...prev, sendVia: "sms" }))}
                      className="text-[#5A1F2B]"
                    />
                    <span className="text-sm">Text</span>
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleCreateInvoice}
              disabled={sendingInvoice || !invoiceForm.clientName || !invoiceForm.amount}
              className="w-full mt-6 py-3 bg-[#5A1F2B] text-white rounded-lg font-medium hover:bg-[#5A1F2B]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-send-invoice"
            >
              {sendingInvoice ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Send Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
