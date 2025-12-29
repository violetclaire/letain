import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, X, Check, Plus, Trash2, Eye } from "lucide-react";

interface ServiceItem {
  clientType: string;
  service: string;
  qty: number;
  price: number;
}

const CLIENT_TYPES = ["Bride", "Bridesmaid", "Mother of Bride", "Mother of Groom", "Flower Girl", "Guest", "Other"];

const defaultServiceItem: ServiceItem = { clientType: "Bride", service: "", qty: 1, price: 0 };

interface Inquiry {
  id: string;
  threadToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate: string;
  eventType?: string;
  eventLocation?: string;
  message?: string;
  status: string;
  createdAt?: string;
  depositPaidAt?: string;
}

interface ArtistProfile {
  id: string;
  userId: string;
  businessName: string;
  artistSlug?: string;
  squareAccessToken?: string;
  contractTemplate?: string;
  prettyLinks?: Record<string, string>;
  onboardingCompleted?: boolean;
  infoSheetContent?: string;
  pricingInfo?: string;
  politeDeclineTemplate?: string;
  referralListTemplate?: string;
}

interface ThreadMessage {
  id: string;
  type: string;
  content: string;
  sentAt: string;
  sentBy: string;
}

type ModalType = "accept" | "refer" | "decline" | null;

export default function InquiryThread() {
  const [, params] = useRoute("/inquiry/:threadToken");
  const queryClient = useQueryClient();
  const threadToken = params?.threadToken;

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showContractReview, setShowContractReview] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([{ ...defaultServiceItem }]);
  const [contractData, setContractData] = useState({
    depositAmount: "",
    eventLocation: "",
    travelFee: "",
  });
  
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
  const [invoiceData, setInvoiceData] = useState({
    type: "deposit",
    amount: "",
    description: "",
  });

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
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/message`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setReplyMessage("");
    },
  });

  const contractMutation = useMutation({
    mutationFn: async () => {
      // Filter out empty service lines
      const validItems = serviceItems.filter(item => item.service.trim());
      
      // Build packageDetails string for backward compatibility
      const packageDetails = validItems
        .map(item => `${item.clientType}: ${item.service} (x${item.qty}) - $${(item.qty * item.price).toFixed(2)}`)
        .join('\n');
      
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
      };
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/create-contract`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      // Reset all form state
      setShowContractForm(false);
      setShowContractReview(false);
      setServiceItems([{ ...defaultServiceItem }]);
      setContractData({ depositAmount: "", eventLocation: "", travelFee: "" });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (data: typeof invoiceData) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/create-invoice`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setShowInvoiceForm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F5F0E8]/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#F5F0E8]/50">Inquiry not found</p>
        </div>
      </div>
    );
  }

  const { inquiry, artist, messages = [], isArtist = false }: { inquiry: Inquiry; artist: ArtistProfile; messages: ThreadMessage[]; isArtist: boolean } = data;
  const slug = artist?.artistSlug;
  const onboardingComplete = artist?.onboardingCompleted;

  const isPending = inquiry.status.toLowerCase() === "pending";
  const isAccepted = ["accepted", "auto_responded"].includes(inquiry.status.toLowerCase());
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
  const velocityColor = velocityHours < 48 ? "text-emerald-400" : "text-[#F5F0E8]/50";

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return { text: "PENDING", color: "bg-amber-500/20 text-amber-400" };
    if (s === "accepted" || s === "auto_responded") return { text: "ACCEPTED", color: "bg-emerald-500/20 text-emerald-400" };
    if (s === "deposit_paid") return { text: "DEPOSIT PAID", color: "bg-emerald-500/30 text-emerald-300" };
    if (s === "referred") return { text: "REFERRED", color: "bg-blue-500/20 text-blue-400" };
    if (s === "declined") return { text: "DECLINED", color: "bg-[#F5F0E8]/10 text-[#F5F0E8]/50" };
    return { text: status.toUpperCase(), color: "bg-[#F5F0E8]/10 text-[#F5F0E8]/50" };
  };

  const statusBadge = getStatusBadge(inquiry.status);

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 1. HEADER */}
      <header className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-[#F5F0E8]/10">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-1">
            {isArtist ? 'Inquiry Thread' : 'Your Inquiry'}
          </p>
          <h1 className="text-sm tracking-[0.15em] text-[#F5F0E8]/80" style={{ fontFamily: "'Playfair Display', serif" }}>
            {artist?.businessName || "Artist"}
          </h1>
        </div>
        {isArtist && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40">Velocity</p>
              <p className={`text-sm font-medium ${velocityColor}`}>{getVelocity()}</p>
            </div>
            <a 
              href={`/admin/${slug}`}
              className="text-xs text-[#F5F0E8]/50 hover:text-[#F5F0E8] underline"
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
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-2">inquiry from</p>
                  <h2 className="text-2xl text-[#F5F0E8] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {inquiry.clientName}
                  </h2>
                  <p className="text-sm text-[#F5F0E8]/50">{inquiry.clientEmail}</p>
                  {inquiry.clientPhone && (
                    <p className="text-sm text-[#F5F0E8]/50">{inquiry.clientPhone}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-2">hello</p>
                  <h2 className="text-2xl text-[#F5F0E8] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {inquiry.clientName}
                  </h2>
                  <p className="text-sm text-[#F5F0E8]/50">Thank you for your inquiry</p>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-2">event date</p>
              <p className="text-lg text-[#F5F0E8]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {format(new Date(inquiry.eventDate), "MMM d, yyyy")}
              </p>
              {isArtist && (
                <span className={`inline-block mt-2 px-3 py-1 text-[10px] tracking-[0.15em] uppercase rounded ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
              )}
            </div>
          </div>

          {isArtist && inquiry.message && (
            <div className="bg-[#F5F0E8]/5 border border-[#F5F0E8]/10 p-5 rounded">
              <p className="text-sm text-[#F5F0E8]/70 leading-relaxed whitespace-pre-wrap">
                {inquiry.message}
              </p>
            </div>
          )}

        </section>

        {/* 3. CONVERSATION THREAD - Moved above actions for context */}
        <section className="mb-10">
          <h3 className="text-sm font-medium text-[#F5F0E8]/80 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Thread Conversation</h3>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-[#F5F0E8]/30 italic py-4">No messages yet</p>
            ) : (
              messages.map((msg) => {
                const isArtist = msg.sentBy === "artist" || msg.sentBy === artist?.businessName;
                return (
                  <div key={msg.id} className={`flex ${isArtist ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-4 rounded ${isArtist ? "bg-[#F5F0E8]/10" : "bg-[#F5F0E8]/5 border border-[#F5F0E8]/10"}`}>
                      <p className="text-sm text-[#F5F0E8]/80 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[10px] text-[#F5F0E8]/30 mt-2">
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
                className="py-5 bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white transition-all text-center rounded disabled:opacity-50"
                data-testid="button-accept"
              >
                <p className="text-sm font-medium">Accept</p>
                <p className="text-[10px] opacity-60 mt-1">Send info sheet</p>
              </button>
              <button
                onClick={() => setActiveModal("refer")}
                disabled={actionMutation.isPending}
                className="py-5 border border-[#F5F0E8]/30 hover:border-[#F5F0E8] transition-all text-center rounded disabled:opacity-50"
                data-testid="button-refer"
              >
                <p className="text-sm">Refer</p>
                <p className="text-[10px] text-[#F5F0E8]/50 mt-1">I'm unavailable</p>
              </button>
              <button
                onClick={() => setActiveModal("decline")}
                disabled={actionMutation.isPending}
                className="py-5 border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 transition-all text-center rounded disabled:opacity-50"
                data-testid="button-decline"
              >
                <p className="text-sm text-[#F5F0E8]/70">Decline</p>
                <p className="text-[10px] text-[#F5F0E8]/40 mt-1">Politely pass</p>
              </button>
            </div>
          </section>
        )}

        {/* 4. BOOKING ACTIONS (Only shows when status = ACCEPTED and viewer is artist) */}
        {isArtist && isAccepted && (
          <section className="mb-10">
            <h3 className="text-sm font-medium text-[#F5F0E8]/80 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Next Steps</h3>
            <div className="space-y-3">
                <button
                  onClick={() => setShowContractForm(!showContractForm)}
                  className="w-full py-4 border border-[#F5F0E8] hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all text-center rounded"
                  data-testid="button-send-contract"
                >
                  <p className="text-sm">Send Contract</p>
                  <p className="text-[10px] opacity-50 mt-1">Create & send for signing</p>
                </button>

                {showContractForm && !showContractReview && (
                  <div className="border border-[#F5F0E8]/10 rounded p-6">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40">Services</label>
                        <button
                          type="button"
                          onClick={addServiceItem}
                          className="flex items-center gap-1 text-xs text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
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
                              className="col-span-3 bg-[#1A1A1A] border border-[#F5F0E8]/20 rounded text-xs text-[#F5F0E8] px-2 py-2"
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
                              className="col-span-4 bg-transparent border border-[#F5F0E8]/20 rounded text-xs text-[#F5F0E8] px-2 py-2"
                            />
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateServiceItem(index, 'qty', e.target.value)}
                              min="1"
                              className="col-span-1 bg-transparent border border-[#F5F0E8]/20 rounded text-xs text-[#F5F0E8] px-2 py-2 text-center"
                            />
                            <div className="col-span-3 flex items-center gap-1">
                              <span className="text-[#F5F0E8]/40 text-xs">$</span>
                              <input
                                type="number"
                                value={item.price || ''}
                                onChange={(e) => updateServiceItem(index, 'price', e.target.value)}
                                placeholder="0"
                                step="0.01"
                                className="flex-1 bg-transparent border border-[#F5F0E8]/20 rounded text-xs text-[#F5F0E8] px-2 py-2"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeServiceItem(index)}
                              className="col-span-1 text-[#F5F0E8]/30 hover:text-red-400 transition-colors"
                              disabled={serviceItems.length === 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-[#F5F0E8]/10 pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#F5F0E8]/60">Services Total</span>
                          <span className="text-[#F5F0E8]">${servicesTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#F5F0E8]/60 text-sm">Travel Fee</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[#F5F0E8]/40 text-xs">$</span>
                            <input
                              type="number"
                              value={contractData.travelFee}
                              onChange={(e) => setContractData({ ...contractData, travelFee: e.target.value })}
                              step="0.01"
                              className="w-24 bg-transparent border border-[#F5F0E8]/20 rounded text-xs text-[#F5F0E8] px-2 py-1 text-right"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t border-[#F5F0E8]/10 pt-3">
                          <span className="text-[#F5F0E8]">Grand Total</span>
                          <span className="text-[#F5F0E8]">${grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 block mb-2">Deposit Amount ($)</label>
                          <input
                            type="number"
                            value={contractData.depositAmount}
                            onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                            step="0.01"
                            className="w-full bg-transparent border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-3 py-2"
                            placeholder="500.00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 block mb-2">Event Location</label>
                          <input
                            type="text"
                            value={contractData.eventLocation}
                            onChange={(e) => setContractData({ ...contractData, eventLocation: e.target.value })}
                            className="w-full bg-transparent border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-3 py-2"
                            placeholder="Hotel name, address..."
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowContractReview(true)}
                        disabled={serviceItems.every(i => !i.service)}
                        className="w-full py-3 bg-[#F5F0E8] text-[#1A1A1A] text-sm rounded hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Eye size={16} /> Review Contract
                      </button>
                    </div>
                  </div>
                )}
                
                {showContractReview && (
                  <div className="border border-[#F5F0E8]/10 rounded p-6">
                    <h4 className="text-sm font-medium text-[#F5F0E8] mb-4">Contract Review</h4>
                    
                    <div className="bg-[#222] rounded p-4 mb-4 text-sm">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#F5F0E8]/40 text-left">
                            <th className="pb-2">Client</th>
                            <th className="pb-2">Service</th>
                            <th className="pb-2 text-center">Qty</th>
                            <th className="pb-2 text-right">Price</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#F5F0E8]">
                          {serviceItems.filter(i => i.service).map((item, i) => (
                            <tr key={i} className="border-t border-[#F5F0E8]/10">
                              <td className="py-2">{item.clientType}</td>
                              <td className="py-2">{item.service}</td>
                              <td className="py-2 text-center">{item.qty}</td>
                              <td className="py-2 text-right">${item.price.toFixed(2)}</td>
                              <td className="py-2 text-right">${(item.qty * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                          {travelFee > 0 && (
                            <tr className="border-t border-[#F5F0E8]/10">
                              <td className="py-2" colSpan={4}>Travel Fee</td>
                              <td className="py-2 text-right">${travelFee.toFixed(2)}</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[#F5F0E8]/30 font-medium">
                            <td className="pt-2" colSpan={4}>Grand Total</td>
                            <td className="pt-2 text-right">${grandTotal.toFixed(2)}</td>
                          </tr>
                          <tr className="text-[#F5F0E8]/60">
                            <td colSpan={4}>Deposit Due</td>
                            <td className="text-right">${parseFloat(contractData.depositAmount || '0').toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      
                      {contractData.eventLocation && (
                        <p className="mt-4 text-xs text-[#F5F0E8]/60">
                          Location: {contractData.eventLocation}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowContractReview(false)}
                        className="flex-1 py-3 border border-[#F5F0E8]/30 text-[#F5F0E8] text-sm rounded hover:border-[#F5F0E8] transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => contractMutation.mutate()}
                        disabled={contractMutation.isPending}
                        className="flex-1 py-3 bg-[#F5F0E8] text-[#1A1A1A] text-sm rounded hover:bg-white transition-all disabled:opacity-50"
                      >
                        {contractMutation.isPending ? "Sending..." : "Send Contract"}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                  className="w-full py-4 border border-[#F5F0E8]/50 hover:border-[#F5F0E8] transition-all text-center rounded"
                  data-testid="button-send-invoice"
                >
                  <p className="text-sm">Send Invoice</p>
                  <p className="text-[10px] text-[#F5F0E8]/50 mt-1">Collect deposit or balance</p>
                </button>

                {showInvoiceForm && (
                  <div className="border border-[#F5F0E8]/10 rounded p-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        invoiceMutation.mutate(invoiceData);
                      }}
                      className="space-y-5"
                    >
                      <div>
                        <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 block mb-2">Invoice Type</label>
                        <select
                          value={invoiceData.type}
                          onChange={(e) => setInvoiceData({ ...invoiceData, type: e.target.value })}
                          className="w-full bg-[#1A1A1A] border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-3 py-2"
                        >
                          <option value="deposit">Deposit / Retainer</option>
                          <option value="balance">Final Balance</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 block mb-2">Amount ($)</label>
                        <input
                          type="number"
                          value={invoiceData.amount}
                          onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                          step="0.01"
                          className="w-full bg-transparent border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-3 py-2"
                          placeholder="500.00"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 block mb-2">Description</label>
                        <textarea
                          value={invoiceData.description}
                          onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                          rows={2}
                          className="w-full bg-transparent border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-3 py-2 resize-none"
                          placeholder="Deposit for bridal services"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={invoiceMutation.isPending}
                        className="w-full py-3 bg-[#F5F0E8] text-[#1A1A1A] text-sm rounded hover:bg-white transition-all disabled:opacity-50"
                      >
                        {invoiceMutation.isPending ? "Sending..." : "Create & Send Invoice"}
                      </button>
                    </form>
                  </div>
                )}

                <button
                  onClick={() => actionMutation.mutate({ action: "deposit" })}
                  disabled={actionMutation.isPending}
                  className="w-full py-4 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-600/30 transition-all text-center rounded disabled:opacity-50"
                  data-testid="button-deposit-paid"
                >
                  <p className="text-sm">Mark Deposit Paid</p>
                  <p className="text-[10px] opacity-70 mt-1">Stops Velocity Clock</p>
                </button>
              </div>
          </section>
        )}

        {/* Terminal status messages - Artist only for internal statuses */}
        {inquiry.status.toLowerCase() === "deposit_paid" && (
          <section className="mb-10 text-center py-6">
            <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-emerald-400 font-medium">{isArtist ? 'Deposit Received' : 'Booking Confirmed'}</p>
            <p className="text-xs text-[#F5F0E8]/40 mt-1">{isArtist ? 'Booking confirmed' : 'Thank you for your payment'}</p>
          </section>
        )}

        {isArtist && inquiry.status.toLowerCase() === "referred" && (
          <section className="mb-10 text-center py-6">
            <p className="text-sm text-[#F5F0E8]/50">This inquiry has been referred to your trusted circle.</p>
          </section>
        )}

        {isArtist && inquiry.status.toLowerCase() === "declined" && (
          <section className="mb-10 text-center py-6">
            <p className="text-sm text-[#F5F0E8]/50">This inquiry has been politely declined.</p>
          </section>
        )}

        {/* 5. QUICK TEMPLATES + REPLY FORM (Artist only) */}
        {isArtist && !isTerminal && (
          <section className="border-t border-[#F5F0E8]/10 pt-8">
            <div className="flex gap-3 mb-4 flex-wrap">
              <button
                onClick={() => setReplyMessage(artist?.infoSheetContent || "Here's my info sheet with pricing and services...")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 rounded transition-all"
                data-testid="button-template-info"
              >
                Info Sheet
              </button>
              <button
                onClick={() => setReplyMessage(artist?.referralListTemplate || "I'm not available but here are some amazing artists I trust...")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 rounded transition-all"
                data-testid="button-template-referral"
              >
                Referral List
              </button>
              <button
                onClick={() => setReplyMessage(artist?.politeDeclineTemplate || "Thank you for reaching out. Unfortunately, I'm not available for your date.")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 rounded transition-all"
                data-testid="button-template-decline"
              >
                Polite Decline
              </button>
            </div>

            <div className="relative">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response..."
                rows={4}
                className="w-full bg-transparent border border-[#F5F0E8]/20 rounded text-sm text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-4 py-3 resize-none"
                data-testid="input-reply"
              />
              <button
                onClick={() => sendMessageMutation.mutate(replyMessage)}
                disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                className="absolute bottom-3 right-3 px-4 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-xs rounded hover:bg-white disabled:opacity-30 transition-all flex items-center gap-2"
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
          </section>
        )}
        
        {/* Client view - Simple status message */}
        {!isArtist && !isTerminal && (
          <section className="border-t border-[#F5F0E8]/10 pt-8 text-center">
            <p className="text-sm text-[#F5F0E8]/60">
              {artist?.businessName || 'Your artist'} will be in touch with you soon.
            </p>
            <p className="text-xs text-[#F5F0E8]/40 mt-2">
              Check your email for updates.
            </p>
          </section>
        )}
      </main>

      {/* MODALS (Artist only) */}
      {isArtist && activeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50" onClick={() => setActiveModal(null)}>
          <div className="bg-[#1A1A1A] border border-[#F5F0E8]/20 max-w-md w-full rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
            {activeModal === "accept" && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-sm font-medium">Send Info Sheet</h3>
                  <button onClick={() => setActiveModal(null)} className="text-[#F5F0E8]/40 hover:text-[#F5F0E8]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-[#F5F0E8]/5 border border-[#F5F0E8]/10 rounded p-4 mb-6 max-h-40 overflow-y-auto">
                  <p className="text-xs text-[#F5F0E8]/60 leading-relaxed whitespace-pre-wrap">
                    {artist?.infoSheetContent || "Your info sheet content will be sent to the client."}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#F5F0E8]/30 rounded text-sm hover:border-[#F5F0E8] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "accept-client" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#F5F0E8] text-[#1A1A1A] rounded text-sm hover:bg-white transition-all disabled:opacity-50"
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
                  <button onClick={() => setActiveModal(null)} className="text-[#F5F0E8]/40 hover:text-[#F5F0E8]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-[#F5F0E8]/70 mb-6">
                  This will let {inquiry.clientName} know you're unavailable and share your Trusted Circle referrals.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#F5F0E8]/30 rounded text-sm hover:border-[#F5F0E8] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "refer" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#F5F0E8] text-[#1A1A1A] rounded text-sm hover:bg-white transition-all disabled:opacity-50"
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
                  <button onClick={() => setActiveModal(null)} className="text-[#F5F0E8]/40 hover:text-[#F5F0E8]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-[#F5F0E8]/70 mb-6">
                  This will send a polite decline message to {inquiry.clientName}.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-[#F5F0E8]/30 rounded text-sm hover:border-[#F5F0E8] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => actionMutation.mutate({ action: "decline" })}
                    disabled={actionMutation.isPending}
                    className="flex-1 py-3 bg-[#F5F0E8] text-[#1A1A1A] rounded text-sm hover:bg-white transition-all disabled:opacity-50"
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
    </div>
  );
}
