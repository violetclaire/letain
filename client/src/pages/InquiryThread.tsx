import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useSearch } from "wouter";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, X, Check, Plus, Trash2, Eye, Pencil, UserPlus, Copy, FileText, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Inquiry, ArtistProfile } from "@shared/schema";
import type { ServiceItem, ThreadMessageUI as ThreadMessage } from "@shared/types";

const CLIENT_TYPES = ["Bride", "Bridesmaid", "Mother of Bride", "Mother of Groom", "Flower Girl", "Guest", "Other"];

const defaultServiceItem: ServiceItem = { clientType: "Bride", service: "", qty: 1, price: 0 };

// Helper to convert URLs in text to clickable links
function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6B4A55] underline hover:text-[#8B6A75] break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

type ModalType = "accept" | "refer" | "decline" | null;

export default function InquiryThread() {
  const [, params] = useRoute("/inquiry/:threadToken");
  const queryClient = useQueryClient();
  const threadToken = params?.threadToken;
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabParam = urlParams.get('tab');

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showContractReview, setShowContractReview] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([{ ...defaultServiceItem }]);
  const [contractData, setContractData] = useState({
    depositAmount: "",
    eventLocation: "",
    travelFee: "",
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareNotes, setPrepareNotes] = useState<string | null>(null);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);
  
  // Calculate totals from service items
  const servicesTotal = serviceItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const travelFee = parseFloat(contractData.travelFee) || 0;
  const grandTotal = servicesTotal + travelFee;
  
  // Service item management
  const addServiceItem = () => setServiceItems([...serviceItems, { ...defaultServiceItem }]);
  const removeServiceItem = (index: number) => {
    if (serviceItems.length > 1) {
      setServiceItems(serviceItems.filter((_, i) => i !== index));
    }
  };
  const updateServiceItem = (index: number, field: keyof ServiceItem, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: field === 'qty' || field === 'price' ? Number(value) : value };
    setServiceItems(updated);
  };
  const prepareContract = async () => {
    if (!threadToken) return;
    setIsPreparing(true);
    setPrepareNotes(null);
    setAvailabilityWarning(null);
    try {
      const res = await apiRequest("POST", `/api/public/inquiry/${threadToken}/prepare-contract`, {});
      const result = await res.json();
      if (result.success && result.draft) {
        const items: ServiceItem[] = (result.draft.serviceItems || []).map((item: any) => ({
          clientType: CLIENT_TYPES.includes(item.clientType) ? item.clientType : "Other",
          service: item.service || "",
          qty: item.qty || 1,
          price: item.price || 0,
        }));
        if (items.length > 0) {
          setServiceItems(items);
        }
        setContractData({
          depositAmount: result.draft.depositAmount ? String(result.draft.depositAmount) : "",
          eventLocation: result.draft.eventLocation || "",
          travelFee: result.draft.travelFee ? String(result.draft.travelFee) : "",
        });
        if (result.draft.notes) {
          setPrepareNotes(result.draft.notes);
        }
        if (!result.availability?.available) {
          setAvailabilityWarning(result.availability?.conflictReason || "Calendar conflict detected");
        }
        setShowContractForm(true);
        toast({ title: "Contract prepared", description: "Review the details below and adjust anything before sending." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to prepare contract", variant: "destructive" });
    } finally {
      setIsPreparing(false);
    }
  };

  const [invoiceData, setInvoiceData] = useState({
    type: "deposit",
    amount: "",
    description: "",
  });
  
  // Client info editing state
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientData, setEditClientData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });
  
  // Invite participant state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    name: "",
    role: "planner" as "planner" | "client" | "other",
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle Square OAuth success callback
  const squareSuccess = urlParams.get('square') === 'success';
  
  // Auto-open forms based on URL tab parameter
  useEffect(() => {
    if (tabParam === 'payment') {
      setShowInvoiceForm(true);
    } else if (tabParam === 'contract') {
      setShowContractForm(true);
    }
    
    // Show success message and refetch data if just connected Square
    if (squareSuccess) {
      toast({ title: "Square connected!", description: "You can now send invoices" });
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      // Clean up URL
      const newUrl = window.location.pathname + (tabParam ? `?tab=${tabParam}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [tabParam, squareSuccess, toast, queryClient, threadToken]);

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/inquiry/${threadToken}`],
    queryFn: async () => {
      const res = await fetch(`/api/public/inquiry/${threadToken}`);
      if (!res.ok) throw new Error("Inquiry not found");
      return res.json();
    },
    enabled: !!threadToken,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/action/${action}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setActiveModal(null);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, cc }: { message: string; cc?: string[] }) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/message`, { message, cc });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setReplyMessage("");
      setCcEmails("");
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data: { clientName?: string; clientEmail?: string; clientPhone?: string }) => {
      return apiRequest("PATCH", `/api/inquiries/${threadToken}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setIsEditingClient(false);
    },
  });

  const inviteParticipantMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; role: string }) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/invite-participant`, data);
    },
    onSuccess: (result: any) => {
      toast({ title: "Invite sent!", description: `Email sent to ${inviteData.email}` });
      if (result.chatLink) {
        setInviteLink(result.chatLink);
      }
      setInviteData({ email: "", name: "", role: "planner" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    },
  });

  const contractMutation = useMutation({
    mutationFn: async () => {
      // Filter out empty service lines
      const validItems = serviceItems.filter(item => item.service.trim());
      
      if (validItems.length === 0) {
        throw new Error("Please add at least one service item");
      }
      
      // Build packageDetails string for backward compatibility
      const packageDetails = validItems
        .map(item => `${item.clientType}: ${item.service} (x${item.qty}) - $${(item.qty * item.price).toFixed(2)}`)
        .join('\n');
      
      const depositAmountNum = parseFloat(contractData.depositAmount) || 0;
      
      const payload = {
        // New format with service items
        serviceItems: validItems.map(item => ({
          clientType: item.clientType,
          service: item.service,
          qty: item.qty,
          price: Math.round(item.price * 100), // Convert to cents
          total: Math.round(item.qty * item.price * 100),
        })),
        // Legacy fields for backward compatibility
        packageDetails,
        totalAmount: grandTotal.toFixed(2), // String for legacy
        depositAmount: contractData.depositAmount || "0",
        eventLocation: contractData.eventLocation,
        travelFee: Math.round(travelFee * 100),
        // Flag to also send retainer invoice
        sendRetainerInvoice: depositAmountNum > 0,
      };
      const confirmedPayload = { ...payload, confirmSend: true };
      console.log("[Contract] Sending contract + retainer request:", confirmedPayload);
      const res = await apiRequest("POST", `/api/public/inquiry/${threadToken}/create-contract`, confirmedPayload);
      console.log("[Contract] Response received:", res);
      return res;
    },
    onSuccess: (result: any) => {
      console.log("[Contract] Success!", result);
      
      // Show appropriate message based on what was sent
      if (result.retainerError) {
        toast({ 
          title: "Contract Sent", 
          description: "Contract sent, but retainer invoice failed. Please check Square connection.",
          variant: "destructive"
        });
      } else if (result.retainerInvoiceSent) {
        toast({ title: "Sent!", description: "Contract and retainer invoice sent to client" });
      } else {
        toast({ title: "Sent!", description: "Contract sent to client for signing" });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      // Reset all form state
      setShowContractForm(false);
      setShowContractReview(false);
      setServiceItems([{ ...defaultServiceItem }]);
      setContractData({ depositAmount: "", eventLocation: "", travelFee: "" });
    },
    onError: (error: Error) => {
      console.error("[Contract] Error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (data: typeof invoiceData) => {
      console.log("[Invoice] Sending invoice request:", data);
      const res = await apiRequest("POST", `/api/public/inquiry/${threadToken}/create-invoice`, data);
      console.log("[Invoice] Response received");
      return res;
    },
    onSuccess: () => {
      console.log("[Invoice] Success!");
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setShowInvoiceForm(false);
    },
    onError: (error: Error) => {
      console.error("[Invoice] Error:", error);
      alert("Invoice error: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B4A55]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#666]">Inquiry not found</p>
        </div>
      </div>
    );
  }

  const { inquiry, artist, messages = [], isArtist = false }: { inquiry: Inquiry; artist: ArtistProfile; messages: ThreadMessage[]; isArtist: boolean } = data;
  const slug = artist?.artistSlug;
  const onboardingComplete = artist?.onboardingCompleted;

  const isPending = inquiry.status.toLowerCase() === "pending";
  const isAccepted = ["accepted", "auto_responded"].includes(inquiry.status.toLowerCase());
  const showBookingActions = isAccepted || tabParam === 'contract' || tabParam === 'payment';
  
  // Debug logging
  console.log("[InquiryThread] isArtist:", isArtist, "showBookingActions:", showBookingActions, "tabParam:", tabParam, "status:", inquiry.status);
  const isTerminal = ["referred", "declined", "deposit_paid"].includes(inquiry.status.toLowerCase());

  const getVelocity = () => {
    if (!inquiry.createdAt) return "Starting";
    if (inquiry.depositPaidAt) {
      const start = new Date(inquiry.createdAt);
      const end = new Date(inquiry.depositPaidAt);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      return `${hours}h`;
    }
    const start = new Date(inquiry.createdAt);
    const now = new Date();
    const hours = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    return `${hours}h`;
  };

  const velocityHours = inquiry.createdAt 
    ? Math.round((new Date().getTime() - new Date(inquiry.createdAt).getTime()) / (1000 * 60 * 60))
    : 0;
  const velocityColor = velocityHours < 48 ? "text-emerald-600" : "text-[#888]";

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return { text: "PENDING", color: "bg-amber-500/20 text-amber-600" };
    if (s === "accepted" || s === "auto_responded") return { text: "ACCEPTED", color: "bg-emerald-500/20 text-emerald-600" };
    if (s === "deposit_paid") return { text: "DEPOSIT PAID", color: "bg-emerald-500/30 text-emerald-700" };
    if (s === "referred") return { text: "REFERRED", color: "bg-blue-500/20 text-blue-600" };
    if (s === "declined") return { text: "DECLINED", color: "bg-[#F5F2ED] text-[#888]" };
    return { text: status.toUpperCase(), color: "bg-[#F5F2ED] text-[#888]" };
  };

  const statusBadge = getStatusBadge(inquiry.status);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 1. HEADER */}
      <header className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-[#E8E2D9]">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-1">
            {isArtist ? 'Inquiry Thread' : 'Your Inquiry'}
          </p>
          <h1 className="text-sm tracking-[0.15em] text-[#333]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {artist?.businessName || "Artist"}
          </h1>
        </div>
        {isArtist && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#666]">Velocity</p>
              <p className={`text-sm font-medium ${velocityColor}`}>{getVelocity()}</p>
            </div>
            <a 
              href={`/admin/${slug}`}
              className="text-xs text-[#888] hover:text-[#1A1A1A] underline"
              data-testid="link-dashboard"
            >
              Dashboard
            </a>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 py-10">
        {/* 2. CLIENT/INQUIRY INFO SECTION */}
        <section className="mb-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              {isArtist ? (
                <>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-2">inquiry from</p>
                  {isEditingClient ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editClientData.clientName}
                        onChange={(e) => setEditClientData({ ...editClientData, clientName: e.target.value })}
                        placeholder="Client name"
                        className="w-full bg-[#F5F2ED] border border-[#E8E2D9] rounded px-3 py-2 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#C4A35A]"
                        data-testid="input-client-name"
                      />
                      <input
                        type="email"
                        value={editClientData.clientEmail}
                        onChange={(e) => setEditClientData({ ...editClientData, clientEmail: e.target.value })}
                        placeholder="Email"
                        className="w-full bg-[#F5F2ED] border border-[#E8E2D9] rounded px-3 py-2 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#C4A35A]"
                        data-testid="input-client-email"
                      />
                      <input
                        type="tel"
                        value={editClientData.clientPhone}
                        onChange={(e) => setEditClientData({ ...editClientData, clientPhone: e.target.value })}
                        placeholder="Phone (optional)"
                        className="w-full bg-[#F5F2ED] border border-[#E8E2D9] rounded px-3 py-2 text-[#1A1A1A] text-sm focus:outline-none focus:border-[#C4A35A]"
                        data-testid="input-client-phone"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            updateClientMutation.mutate({
                              clientName: editClientData.clientName,
                              clientEmail: editClientData.clientEmail,
                              clientPhone: editClientData.clientPhone || undefined,
                            });
                          }}
                          disabled={updateClientMutation.isPending}
                          className="px-3 py-1.5 bg-[#C4A35A] text-[#1A1A1A] text-xs rounded hover:bg-[#C4A35A]/90 disabled:opacity-50"
                          data-testid="button-save-client"
                        >
                          {updateClientMutation.isPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setIsEditingClient(false)}
                          className="px-3 py-1.5 border border-[#E8E2D9] text-[#555] text-xs rounded hover:border-[#999]"
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <h2 className="text-2xl text-[#1A1A1A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {inquiry.clientName}
                      </h2>
                      <p className="text-sm text-[#888]">{inquiry.clientEmail}</p>
                      {inquiry.clientPhone && (
                        <p className="text-sm text-[#888]">{inquiry.clientPhone}</p>
                      )}
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => {
                            setEditClientData({
                              clientName: inquiry.clientName,
                              clientEmail: inquiry.clientEmail,
                              clientPhone: inquiry.clientPhone || "",
                            });
                            setIsEditingClient(true);
                          }}
                          className="text-xs text-[#C4A35A] hover:text-[#C4A35A]/80 flex items-center gap-1"
                          data-testid="button-edit-client"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="text-xs text-[#C4A35A] hover:text-[#C4A35A]/80 flex items-center gap-1"
                          data-testid="button-invite-participant"
                        >
                          <UserPlus className="w-3 h-3" />
                          Invite Planner/Client
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-2">hello</p>
                  <h2 className="text-2xl text-[#1A1A1A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {inquiry.clientName}
                  </h2>
                  <p className="text-sm text-[#888]">Thank you for your inquiry</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-2">event date</p>
              <p className="text-lg text-[#1A1A1A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {(() => {
                  const dateStr = inquiry.eventDate.split('T')[0];
                  const [year, month, day] = dateStr.split('-').map(Number);
                  return format(new Date(year, month - 1, day), "MMM d, yyyy");
                })()}
              </p>
              {isArtist && (
                <span className={`inline-block mt-2 px-3 py-1 text-[10px] tracking-[0.15em] uppercase rounded ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
              )}
            </div>
          </div>

          {isArtist && inquiry.message && (
            <div className="bg-white border border-[#E8E2D9] p-5 rounded">
              <p className="text-sm text-[#555] leading-relaxed whitespace-pre-wrap">
                {inquiry.message}
              </p>
            </div>
          )}

        </section>

        {/* 3. CONVERSATION THREAD - Moved above actions for context */}
        <section className="mb-10">
          <h3 className="text-sm font-medium text-[#333] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Thread Conversation</h3>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-[#888] italic py-4">No messages yet</p>
            ) : (
              messages.map((msg) => {
                const isArtistMsg = msg.sentBy === "artist" || msg.sentBy === artist?.businessName;
                const msgAttachments = (msg as any).attachments || [];
                return (
                  <div key={msg.id} className={`flex ${isArtistMsg ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-4 rounded ${isArtistMsg ? "bg-[#F5F2ED]" : "bg-white border border-[#E8E2D9]"}`}>
                      <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{linkifyText(msg.content)}</p>
                      {msgAttachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msgAttachments.map((url: string, idx: number) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={url}
                                alt={`Inspiration photo ${idx + 1}`}
                                className="h-20 w-20 object-cover rounded border border-[#E8E2D9] hover:border-[#999] transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-[#888] mt-2">
                        {format(new Date(msg.sentAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 4. TOOL BELT (Only shows when status = PENDING and viewer is artist) */}
        {isArtist && isPending && (
          <section className="mb-10">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setActiveModal("accept")}
                disabled={actionMutation.isPending}
                className="py-5 bg-[#1A1A1A] text-white hover:bg-[#333] transition-all text-center rounded disabled:opacity-50"
                data-testid="button-accept"
              >
                <p className="text-sm font-medium">Accept</p>
                <p className="text-[10px] opacity-60 mt-1">Send info sheet</p>
              </button>
              <button
                onClick={() => setActiveModal("refer")}
                disabled={actionMutation.isPending}
                className="py-5 border border-[#E8E2D9] hover:border-[#999] transition-all text-center rounded disabled:opacity-50"
                data-testid="button-refer"
              >
                <p className="text-sm">Refer</p>
                <p className="text-[10px] text-[#888] mt-1">I'm unavailable</p>
              </button>
              <button
                onClick={() => setActiveModal("decline")}
                disabled={actionMutation.isPending}
                className="py-5 border border-[#E8E2D9] hover:border-[#999] transition-all text-center rounded disabled:opacity-50"
                data-testid="button-decline"
              >
                <p className="text-sm text-[#555]">Decline</p>
                <p className="text-[10px] text-[#666] mt-1">Politely pass</p>
              </button>
            </div>
          </section>
        )}

        {/* 4. BOOKING ACTIONS (Shows when accepted OR when navigating from dashboard with tab param) */}
        {isArtist && showBookingActions && (
          <section className="mb-10">
            <h3 className="text-sm font-medium text-[#333] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Next Steps</h3>
            <div className="space-y-3">
                <Link
                  href={`/artist/schedule-builder?inquiryId=${inquiry?.id}&clientName=${encodeURIComponent(inquiry?.clientName || '')}&eventDate=${encodeURIComponent(inquiry?.eventDate || '')}`}
                  className="w-full py-4 border border-[#E8E2D9] hover:bg-[#F5F2ED] transition-all text-center rounded flex items-center justify-center gap-2"
                  data-testid="button-create-schedule"
                >
                  <Calendar size={16} className="text-[#666]" />
                  <div>
                    <p className="text-sm">Create Schedule</p>
                    <p className="text-[10px] opacity-50 mt-1">Day-of timeline for client</p>
                  </div>
                </Link>

                <button
                  onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                  className="w-full py-4 border border-[#E8E2D9] hover:bg-[#F5F2ED] transition-all text-center rounded"
                  data-testid="button-create-invoice"
                >
                  <p className="text-sm">Create Invoice</p>
                  <p className="text-[10px] opacity-50 mt-1">For trials, balance, or extras</p>
                </button>

                {showInvoiceForm && (
                  <div className="border border-[#E8E2D9] rounded p-6">
                    {!artist?.squareAccessToken ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-[#555] mb-4">Connect Square to send invoices</p>
                        <button
                          type="button"
                          onClick={() => {
                            const currentUrl = window.location.pathname + window.location.search;
                            window.location.href = `/api/square/connect/start/${artist?.artistSlug}?returnUrl=${encodeURIComponent(currentUrl)}`;
                          }}
                          className="w-full py-3 bg-[#1A1A1A] text-white text-sm rounded hover:bg-[#333] transition-all"
                          data-testid="button-connect-square-invoice"
                        >
                          Connect Square
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          invoiceMutation.mutate(invoiceData);
                        }}
                        className="space-y-5"
                      >
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#666] block mb-2">Invoice Type</label>
                          <select
                            value={invoiceData.type}
                            onChange={(e) => setInvoiceData({ ...invoiceData, type: e.target.value })}
                            className="w-full bg-white border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-3 py-2"
                          >
                            <option value="deposit">Retainer</option>
                            <option value="balance">Final Balance</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#666] block mb-2">Amount ($)</label>
                          <input
                            type="number"
                            value={invoiceData.amount}
                            onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                            step="0.01"
                            className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-3 py-2"
                            placeholder="500.00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#666] block mb-2">Description</label>
                          <textarea
                            value={invoiceData.description}
                            onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                            rows={2}
                            className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-3 py-2 resize-none"
                            placeholder="Retainer for bridal services"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            invoiceMutation.mutate(invoiceData);
                          }}
                          disabled={invoiceMutation.isPending}
                          className="w-full py-3 bg-[#1A1A1A] text-white text-sm rounded hover:bg-[#333] transition-all disabled:opacity-50"
                        >
                          {invoiceMutation.isPending ? "Sending..." : "Create & Send Invoice"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={prepareContract}
                    disabled={isPreparing}
                    className="w-full py-4 bg-[#1A1A1A] text-white hover:bg-[#333] transition-all text-center rounded disabled:opacity-50"
                    data-testid="button-prepare-contract"
                  >
                    {isPreparing ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <p className="text-sm">Reading conversation...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">Prepare Contract</p>
                        <p className="text-[10px] opacity-70 mt-1">Secretary reads the conversation and drafts it for you</p>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowContractForm(!showContractForm); setAvailabilityWarning(null); setPrepareNotes(null); }}
                    className="w-full py-2 text-[#666] text-xs underline hover:text-[#1A1A1A] transition-all text-center"
                    data-testid="button-manual-contract"
                  >
                    or fill in manually
                  </button>
                </div>

                {availabilityWarning && showContractForm && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    <strong>Calendar conflict:</strong> {availabilityWarning}
                  </div>
                )}
                
                {prepareNotes && showContractForm && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    <strong>Notes:</strong> {prepareNotes}
                  </div>
                )}

                {showContractForm && !showContractReview && (
                  <div className="border border-[#E8E2D9] rounded p-6">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] tracking-[0.15em] uppercase text-[#666]">Services</label>
                        <button
                          type="button"
                          onClick={addServiceItem}
                          className="flex items-center gap-1 text-xs text-[#666] hover:text-[#1A1A1A] transition-colors"
                        >
                          <Plus size={14} /> Add Service
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {serviceItems.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <select
                              value={item.clientType}
                              onChange={(e) => updateServiceItem(index, 'clientType', e.target.value)}
                              className="col-span-3 bg-white border border-[#E8E2D9] rounded text-xs text-[#1A1A1A] px-2 py-2"
                            >
                              {CLIENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.service}
                              onChange={(e) => updateServiceItem(index, 'service', e.target.value)}
                              placeholder="Hair & Makeup"
                              className="col-span-4 bg-transparent border border-[#E8E2D9] rounded text-xs text-[#1A1A1A] px-2 py-2"
                            />
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateServiceItem(index, 'qty', e.target.value)}
                              min="1"
                              className="col-span-1 bg-transparent border border-[#E8E2D9] rounded text-xs text-[#1A1A1A] px-2 py-2 text-center"
                            />
                            <div className="col-span-3 flex items-center gap-1">
                              <span className="text-[#666] text-xs">$</span>
                              <input
                                type="number"
                                value={item.price || ''}
                                onChange={(e) => updateServiceItem(index, 'price', e.target.value)}
                                placeholder="0"
                                step="0.01"
                                className="flex-1 bg-transparent border border-[#E8E2D9] rounded text-xs text-[#1A1A1A] px-2 py-2"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeServiceItem(index)}
                              className="col-span-1 text-[#888] hover:text-red-400 transition-colors"
                              disabled={serviceItems.length === 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-[#E8E2D9] pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#666]">Services Total</span>
                          <span className="text-[#1A1A1A]">${servicesTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#666] text-sm">Travel Fee</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[#666] text-xs">$</span>
                            <input
                              type="number"
                              value={contractData.travelFee}
                              onChange={(e) => setContractData({ ...contractData, travelFee: e.target.value })}
                              step="0.01"
                              className="w-24 bg-transparent border border-[#E8E2D9] rounded text-xs text-[#1A1A1A] px-2 py-1 text-right"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t border-[#E8E2D9] pt-3">
                          <span className="text-[#1A1A1A]">Grand Total</span>
                          <span className="text-[#1A1A1A]">${grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#666] block mb-2">Retainer Amount ($)</label>
                          <input
                            type="number"
                            value={contractData.depositAmount}
                            onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                            step="0.01"
                            className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-3 py-2"
                            placeholder="500.00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#666] block mb-2">Event Location</label>
                          <input
                            type="text"
                            value={contractData.eventLocation}
                            onChange={(e) => setContractData({ ...contractData, eventLocation: e.target.value })}
                            className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-3 py-2"
                            placeholder="Hotel name, address..."
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowContractReview(true)}
                        disabled={serviceItems.every(i => !i.service)}
                        className="w-full py-3 bg-[#1A1A1A] text-white text-sm rounded hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Eye size={16} /> Review Contract
                      </button>
                    </div>
                  </div>
                )}
                
                {showContractReview && (
                  <div className="border border-[#E8E2D9] rounded p-6">
                    <h4 className="text-sm font-medium text-[#1A1A1A] mb-4">Contract Review</h4>
                    
                    <div className="bg-[#F5F2ED] rounded p-4 mb-4 text-sm">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#666] text-left">
                            <th className="pb-2">Client</th>
                            <th className="pb-2">Service</th>
                            <th className="pb-2 text-center">Qty</th>
                            <th className="pb-2 text-right">Price</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#1A1A1A]">
                          {serviceItems.filter(i => i.service).map((item, i) => (
                            <tr key={i} className="border-t border-[#E8E2D9]">
                              <td className="py-2">{item.clientType}</td>
                              <td className="py-2">{item.service}</td>
                              <td className="py-2 text-center">{item.qty}</td>
                              <td className="py-2 text-right">${item.price.toFixed(2)}</td>
                              <td className="py-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                          {travelFee > 0 && (
                            <tr className="border-t border-[#E8E2D9]">
                              <td className="py-2" colSpan={4}>Travel Fee</td>
                              <td className="py-2 text-right">${travelFee.toFixed(2)}</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[#E8E2D9] font-medium">
                            <td className="pt-2" colSpan={4}>Grand Total</td>
                            <td className="pt-2 text-right">${grandTotal.toFixed(2)}</td>
                          </tr>
                          <tr className="text-[#666]">
                            <td colSpan={4}>Retainer Due</td>
                            <td className="text-right">${parseFloat(contractData.depositAmount || '0').toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      
                      {contractData.eventLocation && (
                        <p className="mt-4 text-xs text-[#666]">
                          Location: {contractData.eventLocation}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowContractReview(false)}
                        className="flex-1 py-3 border border-[#E8E2D9] text-[#1A1A1A] text-sm rounded hover:border-[#999] transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSendConfirmation(true)}
                        className="flex-1 py-3 bg-[#1A1A1A] text-white text-sm rounded hover:bg-[#333] transition-all"
                      >
                        Send Contract & Retainer
                      </button>
                    </div>

                    {showSendConfirmation && (
                      <div className="mt-4 border-2 border-amber-400 bg-amber-50 rounded-lg p-5">
                        <p className="text-sm font-medium text-[#1A1A1A] mb-2">Confirm before sending</p>
                        <p className="text-xs text-[#666] mb-1">
                          This will email the contract and retainer invoice to:
                        </p>
                        <p className="text-sm font-medium text-[#1A1A1A] mb-4">
                          {inquiry.clientName} ({inquiry.clientEmail})
                        </p>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setShowSendConfirmation(false)}
                            className="flex-1 py-3 border border-[#E8E2D9] text-[#1A1A1A] text-sm rounded hover:border-[#999] transition-all"
                            data-testid="button-cancel-send-contract"
                          >
                            Go Back
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              console.log("[Contract] Send confirmed, calling mutation...");
                              setShowSendConfirmation(false);
                              contractMutation.mutate();
                            }}
                            disabled={contractMutation.isPending}
                            className="flex-1 py-3 bg-emerald-700 text-white text-sm rounded hover:bg-emerald-800 transition-all disabled:opacity-50"
                            data-testid="button-confirm-send-contract"
                          >
                            {contractMutation.isPending ? "Sending..." : "Yes, Send to Client"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => actionMutation.mutate({ action: "deposit" })}
                  disabled={actionMutation.isPending}
                  className="w-full py-4 bg-emerald-600/20 border border-emerald-500/50 text-emerald-600 hover:bg-emerald-600/30 transition-all text-center rounded disabled:opacity-50"
                  data-testid="button-deposit-paid"
                >
                  <p className="text-sm">Mark Retainer Paid</p>
                  <p className="text-[10px] opacity-70 mt-1">Stops Velocity Clock</p>
                </button>
              </div>
          </section>
        )}

        {/* Terminal status messages - Artist only for internal statuses */}
        {inquiry.status.toLowerCase() === "deposit_paid" && (
          <section className="mb-10 text-center py-6">
            <Check className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-emerald-600 font-medium">{isArtist ? 'Retainer Received' : 'Booking Confirmed'}</p>
            <p className="text-xs text-[#666] mt-1">{isArtist ? 'Booking confirmed' : 'Thank you for your payment'}</p>
          </section>
        )}

        {isArtist && inquiry.status.toLowerCase() === "referred" && (
          <section className="mb-10 text-center py-6">
            <p className="text-sm text-[#888]">This inquiry has been referred to your trusted circle.</p>
          </section>
        )}

        {isArtist && inquiry.status.toLowerCase() === "declined" && (
          <section className="mb-10 text-center py-6">
            <p className="text-sm text-[#888]">This inquiry has been politely declined.</p>
          </section>
        )}

        {/* 5. QUICK TEMPLATES + REPLY FORM (Artist only) */}
        {isArtist && !isTerminal && (
          <section className="border-t border-[#E8E2D9] pt-8">
            <div className="flex gap-3 mb-4 flex-wrap">
              <button
                onClick={() => setReplyMessage(artist?.infoSheetContent || "Here's my info sheet with pricing and services...")}
                className="px-4 py-2 text-xs border border-[#E8E2D9] hover:border-[#999] rounded transition-all"
                data-testid="button-template-info"
              >
                Info Sheet
              </button>
              <button
                onClick={() => setReplyMessage(artist?.referralListTemplate || "Thank you so much for reaching out! Unfortunately I am not available. Please contact my trusted colleague for availability. Thank you!")}
                className="px-4 py-2 text-xs border border-[#E8E2D9] hover:border-[#999] rounded transition-all"
                data-testid="button-template-referral"
              >
                Referral List
              </button>
              <button
                onClick={() => setReplyMessage(artist?.politeDeclineTemplate || "Thank you for reaching out. Unfortunately, I'm not available for your date.")}
                className="px-4 py-2 text-xs border border-[#E8E2D9] hover:border-[#999] rounded transition-all"
                data-testid="button-template-decline"
              >
                Polite Decline
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#666] mb-1">CC (optional)</label>
                <input
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  placeholder="tessa@example.com, amy@example.com"
                  className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-4 py-2"
                  data-testid="input-cc"
                />
                <p className="text-xs text-[#666] mt-1">Separate multiple emails with commas</p>
              </div>
              <div className="relative">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response..."
                  rows={4}
                  className="w-full bg-transparent border border-[#E8E2D9] rounded text-sm text-[#1A1A1A] focus:border-[#999] focus:outline-none px-4 py-3 resize-none"
                  data-testid="input-reply"
                />
                <button
                  onClick={() => {
                    const ccList = ccEmails.split(',').map(e => e.trim()).filter(e => e);
                    sendMessageMutation.mutate({ message: replyMessage, cc: ccList.length > 0 ? ccList : undefined });
                  }}
                  disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                  className="absolute bottom-3 right-3 px-4 py-2 bg-[#1A1A1A] text-white text-xs rounded hover:bg-[#333] disabled:opacity-30 transition-all flex items-center gap-2"
                  data-testid="button-send-response"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Send Response
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}
        
        {/* Client view - Simple status message */}
        {!isArtist && !isTerminal && (
          <section className="border-t border-[#E8E2D9] pt-8 text-center">
            <p className="text-sm text-[#666]">
              {artist?.businessName || 'Your artist'} will be in touch with you soon.
            </p>
            <p className="text-xs text-[#666] mt-2">
              Check your email for updates.
            </p>
          </section>
        )}
      </main>

      {/* MODALS (Artist only) */}
      {isArtist && activeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-white border border-[#E8E2D9] max-w-md w-full rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
            {activeModal === "accept" && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium">Send Info Sheet</h3>
                  <button onClick={() => setActiveModal(null)} className="text-[#666] hover:text-[#1A1A1A]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-white border border-[#E8E2D9] rounded p-4 mb-6 max-h-40 overflow-y-auto">
                  {artist?.infoSheetPdfUrl ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#666]" />
                      <a href={artist.infoSheetPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#666] underline">
                        View your info sheet PDF
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-[#666] leading-relaxed whitespace-pre-wrap">
                      {artist?.infoSheetContent || "Your info sheet content will be sent to the client."}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#E8E2D9] rounded text-sm hover:border-[#999] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "accept-client" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333] transition-all disabled:opacity-50"
                    data-testid="button-confirm-accept"
                  >
                    {actionMutation.isPending ? "Sending..." : "Confirm & Send"}
                  </button>
                </div>
              </>
            )}

            {activeModal === "refer" && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium">Send Referrals</h3>
                  <button onClick={() => setActiveModal(null)} className="text-[#666] hover:text-[#1A1A1A]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-[#555] mb-6">
                  This will let {inquiry.clientName} know you're unavailable and share your Trusted Circle referrals.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#E8E2D9] rounded text-sm hover:border-[#999] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "refer" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333] transition-all disabled:opacity-50"
                    data-testid="button-confirm-refer"
                  >
                    {actionMutation.isPending ? "Sending..." : "Send Referrals"}
                  </button>
                </div>
              </>
            )}

            {activeModal === "decline" && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium">Decline Inquiry</h3>
                  <button onClick={() => setActiveModal(null)} className="text-[#666] hover:text-[#1A1A1A]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-[#555] mb-6">
                  This will send a polite decline message to {inquiry.clientName}.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#E8E2D9] rounded text-sm hover:border-[#999] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "decline" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#1A1A1A] text-white rounded text-sm hover:bg-[#333] transition-all disabled:opacity-50"
                    data-testid="button-confirm-decline"
                  >
                    {actionMutation.isPending ? "Sending..." : "Decline"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invite Participant Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E8E2D9] rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Invite to Conversation</h3>
                <p className="text-xs text-[#888] mt-1">Add the client and/or planner to this thread</p>
              </div>
              <button 
                onClick={() => { setShowInviteModal(false); setInviteLink(null); }} 
                className="text-[#666] hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteLink ? (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded">
                  <p className="text-xs text-green-400 mb-2">Invite sent! Share this link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-[#F5F2ED] border border-[#E8E2D9] rounded text-xs text-[#333]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast({ title: "Link copied!" });
                      }}
                      className="px-3 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-xs hover:bg-[#C4A35A]/90 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setInviteLink(null)}
                    className="flex-1 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-sm hover:bg-[#C4A35A]/90 flex items-center justify-center gap-2"
                    data-testid="button-add-another"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Another Person
                  </button>
                  <button
                    onClick={() => { setShowInviteModal(false); setInviteLink(null); }}
                    className="flex-1 py-2 border border-[#E8E2D9] rounded text-sm hover:bg-[#333]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#666] mb-1">Who are you inviting?</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#6B4A55]"
                    data-testid="select-invite-role"
                  >
                    <option value="planner">Wedding Planner</option>
                    <option value="client">Client</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#666] mb-1">Their Name</label>
                  <input
                    type="text"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                    placeholder={inviteData.role === 'planner' ? "Planner's name" : "Their name"}
                    className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#6B4A55]"
                    data-testid="input-invite-name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666] mb-1">Their Email *</label>
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="planner@example.com"
                    className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E8E2D9] rounded text-sm focus:outline-none focus:border-[#6B4A55]"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2 border border-[#E8E2D9] rounded text-sm hover:bg-[#333]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => inviteParticipantMutation.mutate(inviteData)}
                    disabled={inviteParticipantMutation.isPending || !inviteData.email}
                    className="flex-1 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-sm hover:bg-[#C4A35A]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-send-invite"
                  >
                    {inviteParticipantMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Invite
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
