import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, X, Check, ArrowRight, Send } from "lucide-react";

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
  infoSheetSentAt?: string;
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
  plannerInfoSheet?: string;
  plannerPricing?: string;
}

interface ThreadMessage {
  id: string;
  type: string;
  content: string;
  sentAt: string;
  sentBy: string;
}

type ConfirmAction = "accept-client" | "accept-planner" | "refer" | "decline" | null;

export default function InquiryThread() {
  const [, params] = useRoute("/inquiry/:threadToken");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const threadToken = params?.threadToken;

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [contractData, setContractData] = useState({
    packageDetails: "",
    totalAmount: "",
    depositAmount: "",
    eventLocation: "",
  });
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
    mutationFn: async ({ action, message }: { action: string; message?: string }) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/action/${action}`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setConfirmAction(null);
      setCustomMessage("");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/message`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setCustomMessage("");
    },
  });

  const contractMutation = useMutation({
    mutationFn: async (data: typeof contractData) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/create-contract`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setShowContractForm(false);
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
          <p className="text-sm text-[#F5F0E8]/50 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Inquiry not found
          </p>
          <a href="/" className="text-xs underline text-[#F5F0E8]/40 hover:text-[#F5F0E8]">
            Return home
          </a>
        </div>
      </div>
    );
  }

  const { inquiry, artist, messages = [] }: { inquiry: Inquiry; artist: ArtistProfile; messages: ThreadMessage[] } = data;
  const onboardingComplete = artist?.onboardingCompleted;
  const slug = artist?.artistSlug;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "text-[#F5F0E8]/60";
      case "accepted": return "text-[#F5F0E8]";
      case "auto_responded": return "text-[#F5F0E8]";
      case "deposit_paid": return "text-emerald-400";
      case "referred": return "text-[#F5F0E8]/50";
      case "declined": return "text-[#F5F0E8]/40";
      default: return "text-[#F5F0E8]/50";
    }
  };

  const getVelocity = () => {
    if (!inquiry.createdAt) return { text: "Active", color: "text-[#F5F0E8]/40" };
    if (inquiry.depositPaidAt) {
      const start = new Date(inquiry.createdAt);
      const end = new Date(inquiry.depositPaidAt);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return {
        text: `${hours}h`,
        color: hours < 48 ? "text-emerald-400 font-bold" : "text-[#F5F0E8]/60"
      };
    }
    return { text: "Active", color: "text-[#F5F0E8]/40" };
  };

  const velocity = getVelocity();

  const getConfirmDetails = (action: ConfirmAction) => {
    switch (action) {
      case "accept-client":
        return {
          title: "Send Info Sheet",
          preview: artist?.infoSheetContent || "Your info sheet content will be sent to the client.",
          buttonText: "Confirm & Send",
        };
      case "accept-planner":
        return {
          title: "Send Planner Pricing",
          preview: artist?.plannerPricing || artist?.pricingInfo || "Your planner pricing will be sent.",
          buttonText: "Confirm & Send",
        };
      case "refer":
        return {
          title: "Send Referral List",
          preview: artist?.referralListTemplate || "Your trusted circle referrals will be sent.",
          buttonText: "Confirm & Refer",
        };
      case "decline":
        return {
          title: "Send Polite Decline",
          preview: artist?.politeDeclineTemplate || "Thank you for reaching out. Unfortunately, I'm not available for your date. I wish you all the best for your special day!",
          buttonText: "Confirm & Decline",
        };
      default:
        return null;
    }
  };

  const confirmDetails = confirmAction ? getConfirmDetails(confirmAction) : null;
  const isTerminal = ["referred", "declined", "deposit_paid"].includes(inquiry.status.toLowerCase());
  const isPending = inquiry.status.toLowerCase() === "pending";
  const isAccepted = ["accepted", "auto_responded"].includes(inquiry.status.toLowerCase());

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="flex justify-between items-center px-8 md:px-16 py-8 border-b border-[#F5F0E8]/10">
        <a href="/">
          <h1 className="text-sm tracking-[0.2em] text-[#F5F0E8]/70" style={{ fontFamily: "'Playfair Display', serif" }}>
            {artist?.businessName || "Artist"}
          </h1>
        </a>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/30">Velocity</p>
            <p className={`text-sm ${velocity.color}`}>{velocity.text}</p>
          </div>
          <span className={`text-[10px] tracking-[0.3em] uppercase ${getStatusStyle(inquiry.status)}`}>
            {inquiry.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-8 md:px-16 py-16 md:py-24">
        <div className="mb-16 pb-12 border-b border-[#F5F0E8]/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 mb-3">from</p>
              <h2 className="text-2xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {inquiry.clientName}
              </h2>
              <p className="text-sm text-[#F5F0E8]/50">{inquiry.clientEmail}</p>
              {inquiry.clientPhone && (
                <p className="text-sm text-[#F5F0E8]/50 mt-1">{inquiry.clientPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 mb-3">event</p>
              <p className="text-lg text-[#F5F0E8]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {format(new Date(inquiry.eventDate), "MMM d, yyyy")}
              </p>
              {inquiry.eventLocation && (
                <p className="text-sm text-[#F5F0E8]/50 mt-2">{inquiry.eventLocation}</p>
              )}
              {inquiry.eventType && (
                <p className="text-xs text-[#F5F0E8]/40 mt-1">{inquiry.eventType}</p>
              )}
            </div>
          </div>

          {inquiry.message && (
            <div className="mt-10 pl-6 border-l border-[#F5F0E8]/10">
              <p className="text-sm text-[#F5F0E8]/70 leading-relaxed italic">
                "{inquiry.message}"
              </p>
            </div>
          )}
        </div>

        {isPending && (
          <div className="space-y-6 mb-12">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConfirmAction("accept-client")}
                disabled={actionMutation.isPending}
                className="py-6 border border-[#F5F0E8] hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-accept"
              >
                <p className="text-xs tracking-[0.2em] uppercase">Accept</p>
                <p className="text-[10px] text-[#F5F0E8]/50 mt-1">Send Info Sheet</p>
              </button>
              <button
                onClick={() => setConfirmAction("accept-planner")}
                disabled={actionMutation.isPending}
                className="py-6 border border-[#F5F0E8]/70 hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-accept-planner"
              >
                <p className="text-xs tracking-[0.2em] uppercase">Accept</p>
                <p className="text-[10px] text-[#F5F0E8]/50 mt-1">Planner Pricing</p>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConfirmAction("refer")}
                disabled={actionMutation.isPending}
                className="group py-6 border border-[#F5F0E8]/30 hover:border-[#F5F0E8] hover:bg-[#F5F0E8] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-refer"
              >
                <p className="text-xs tracking-[0.2em] uppercase text-[#F5F0E8]/70 group-hover:text-[#1A1A1A]">Refer</p>
                <p className="text-[10px] text-[#F5F0E8]/40 mt-1 group-hover:text-[#1A1A1A]/60">Send Trusted Circle</p>
              </button>
              <button
                onClick={() => setConfirmAction("decline")}
                disabled={actionMutation.isPending}
                className="group py-6 border border-[#F5F0E8]/20 hover:border-[#F5F0E8] hover:bg-[#F5F0E8] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-decline"
              >
                <p className="text-xs tracking-[0.2em] uppercase text-[#F5F0E8]/50 group-hover:text-[#1A1A1A]">Decline</p>
                <p className="text-[10px] text-[#F5F0E8]/30 mt-1 group-hover:text-[#1A1A1A]/60">Polite message</p>
              </button>
            </div>
          </div>
        )}

        {isAccepted && (
          <div className="space-y-8 mb-12">
            <button
              onClick={() => actionMutation.mutate({ action: "deposit" })}
              disabled={actionMutation.isPending}
              className="w-full py-5 bg-emerald-600 text-white hover:bg-emerald-500 transition-all duration-500 text-center disabled:opacity-50"
              data-testid="button-deposit-paid"
            >
              <p className="text-xs tracking-[0.2em] uppercase">Mark Deposit Paid</p>
              <p className="text-[10px] opacity-70 mt-1">Stops velocity clock</p>
            </button>

            {!onboardingComplete ? (
              <div className="p-8 border border-[#F5F0E8]/10">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 mb-6">Complete Setup</p>
                
                <div className="space-y-4">
                  <a
                    href={`/setup/${slug}/square`}
                    className={`flex items-center gap-4 p-5 border ${artist?.squareAccessToken ? "border-[#F5F0E8]/30" : "border-[#F5F0E8]/10 hover:border-[#F5F0E8]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.squareAccessToken ? "bg-[#F5F0E8] text-[#1A1A1A]" : "border border-[#F5F0E8]/20"} flex items-center justify-center text-xs`}>
                      {artist?.squareAccessToken ? "✓" : "1"}
                    </div>
                    <div>
                      <p className="text-sm text-[#F5F0E8]">Connect Square</p>
                      <p className="text-[10px] text-[#F5F0E8]/40 mt-1">{artist?.squareAccessToken ? "Connected" : "Accept payments"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/contract`}
                    className={`flex items-center gap-4 p-5 border ${artist?.contractTemplate ? "border-[#F5F0E8]/30" : "border-[#F5F0E8]/10 hover:border-[#F5F0E8]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.contractTemplate ? "bg-[#F5F0E8] text-[#1A1A1A]" : "border border-[#F5F0E8]/20"} flex items-center justify-center text-xs`}>
                      {artist?.contractTemplate ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="text-sm text-[#F5F0E8]">Contract Template</p>
                      <p className="text-[10px] text-[#F5F0E8]/40 mt-1">{artist?.contractTemplate ? "Template saved" : "Your service agreement"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/links`}
                    className={`flex items-center gap-4 p-5 border ${artist?.prettyLinks ? "border-[#F5F0E8]/30" : "border-[#F5F0E8]/10 hover:border-[#F5F0E8]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.prettyLinks ? "bg-[#F5F0E8] text-[#1A1A1A]" : "border border-[#F5F0E8]/20"} flex items-center justify-center text-xs`}>
                      {artist?.prettyLinks ? "✓" : "3"}
                    </div>
                    <div>
                      <p className="text-sm text-[#F5F0E8]">Your Links</p>
                      <p className="text-[10px] text-[#F5F0E8]/40 mt-1">{artist?.prettyLinks ? "Links added" : "Instagram, website, etc."}</p>
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowContractForm(!showContractForm)}
                  className="w-full py-5 border border-[#F5F0E8] hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all duration-500 text-center"
                >
                  <p className="text-xs tracking-[0.2em] uppercase">Send Contract</p>
                </button>

                {showContractForm && (
                  <div className="p-8 border border-[#F5F0E8]/10">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        contractMutation.mutate(contractData);
                      }}
                      className="space-y-8"
                    >
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                          Package Description
                        </label>
                        <textarea
                          value={contractData.packageDetails}
                          onChange={(e) => setContractData({ ...contractData, packageDetails: e.target.value })}
                          rows={3}
                          className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm resize-none"
                          placeholder="Bridal hair & makeup, bridesmaids..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                            Total ($)
                          </label>
                          <input
                            type="number"
                            value={contractData.totalAmount}
                            onChange={(e) => setContractData({ ...contractData, totalAmount: e.target.value })}
                            step="0.01"
                            required
                            className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm"
                            placeholder="1500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                            Deposit ($)
                          </label>
                          <input
                            type="number"
                            value={contractData.depositAmount}
                            onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                            step="0.01"
                            required
                            className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm"
                            placeholder="500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                          Location
                        </label>
                        <input
                          type="text"
                          value={contractData.eventLocation}
                          onChange={(e) => setContractData({ ...contractData, eventLocation: e.target.value })}
                          className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm"
                          placeholder="Venue name, address..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={contractMutation.isPending}
                        className="w-full border border-[#F5F0E8] py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all duration-500 disabled:opacity-50"
                      >
                        {contractMutation.isPending ? "Sending..." : "Create & Send"}
                      </button>
                    </form>
                  </div>
                )}

                <button
                  onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                  className="group w-full py-5 border border-[#F5F0E8]/30 hover:border-[#F5F0E8] hover:bg-[#F5F0E8] transition-all duration-500 text-center"
                >
                  <p className="text-xs tracking-[0.2em] uppercase text-[#F5F0E8]/70 group-hover:text-[#1A1A1A]">Send Invoice</p>
                </button>

                {showInvoiceForm && (
                  <div className="p-8 border border-[#F5F0E8]/10">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        invoiceMutation.mutate(invoiceData);
                      }}
                      className="space-y-8"
                    >
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                          Type
                        </label>
                        <select
                          value={invoiceData.type}
                          onChange={(e) => setInvoiceData({ ...invoiceData, type: e.target.value })}
                          className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm"
                        >
                          <option value="deposit" className="bg-[#1A1A1A]">Deposit</option>
                          <option value="balance" className="bg-[#1A1A1A]">Final Balance</option>
                          <option value="custom" className="bg-[#1A1A1A]">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          value={invoiceData.amount}
                          onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                          step="0.01"
                          required
                          className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 block mb-4">
                          Description
                        </label>
                        <textarea
                          value={invoiceData.description}
                          onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                          rows={2}
                          className="w-full bg-transparent border-0 border-b border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-0 py-3 text-sm resize-none"
                          placeholder="Deposit for bridal services..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={invoiceMutation.isPending}
                        className="w-full border border-[#F5F0E8] py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#F5F0E8] hover:text-[#1A1A1A] transition-all duration-500 disabled:opacity-50"
                      >
                        {invoiceMutation.isPending ? "Sending..." : "Send Invoice"}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <div className="mb-12 pt-8 border-t border-[#F5F0E8]/10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 mb-6">Thread</p>
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="pl-6 border-l border-[#F5F0E8]/10">
                  <p className="text-[10px] text-[#F5F0E8]/30 mb-2">
                    {msg.sentBy} · {format(new Date(msg.sentAt), "MMM d, h:mm a")}
                  </p>
                  <p className="text-sm text-[#F5F0E8]/70 leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isTerminal && (
          <div className="pt-8 border-t border-[#F5F0E8]/10">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 mb-6">Quick Templates</p>
            <div className="flex gap-3 mb-6 flex-wrap">
              <button
                onClick={() => setCustomMessage(artist?.infoSheetContent || "Hi! Here's my info sheet with pricing and services...")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 transition-all"
                data-testid="button-template-info"
              >
                Info Sheet
              </button>
              <button
                onClick={() => setCustomMessage(artist?.pricingInfo || "Here's my current pricing...")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 transition-all"
                data-testid="button-template-pricing"
              >
                Pricing
              </button>
              <button
                onClick={() => setCustomMessage(artist?.referralListTemplate || "I'm not available but here are some amazing artists I trust...")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 transition-all"
                data-testid="button-template-referral"
              >
                Referral List
              </button>
              <button
                onClick={() => setCustomMessage(artist?.politeDeclineTemplate || "Thank you for reaching out. Unfortunately, I'm not available for your date.")}
                className="px-4 py-2 text-xs border border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40 transition-all"
                data-testid="button-template-decline"
              >
                Polite Decline
              </button>
            </div>

            <div className="relative">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Write a custom reply..."
                rows={4}
                className="w-full bg-transparent border border-[#F5F0E8]/20 text-[#F5F0E8] focus:border-[#F5F0E8]/50 focus:outline-none px-4 py-4 text-sm resize-none"
                data-testid="input-custom-message"
              />
              <button
                onClick={() => sendMessageMutation.mutate(customMessage)}
                disabled={!customMessage.trim() || sendMessageMutation.isPending}
                className="absolute bottom-4 right-4 p-2 bg-[#F5F0E8] text-[#1A1A1A] hover:bg-white disabled:opacity-30 transition-all"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {inquiry.status.toLowerCase() === "referred" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#F5F0E8]/50 italic">This inquiry has been referred.</p>
          </div>
        )}

        {inquiry.status.toLowerCase() === "declined" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#F5F0E8]/50 italic">This inquiry has been declined.</p>
          </div>
        )}

        {inquiry.status.toLowerCase() === "deposit_paid" && (
          <div className="text-center py-8">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
            <p className="text-sm text-emerald-400 font-medium">Deposit Received</p>
            <p className="text-xs text-[#F5F0E8]/40 mt-2">
              Velocity: {velocity.text}
            </p>
          </div>
        )}
      </main>

      {confirmAction && confirmDetails && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50" onClick={() => setConfirmAction(null)}>
          <div className="bg-[#1A1A1A] border border-[#F5F0E8]/20 max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-sm tracking-[0.2em] uppercase text-[#F5F0E8]">{confirmDetails.title}</h3>
              <button onClick={() => setConfirmAction(null)} className="text-[#F5F0E8]/40 hover:text-[#F5F0E8]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-8 p-6 bg-[#F5F0E8]/5 border border-[#F5F0E8]/10">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-4">Preview</p>
              <p className="text-sm text-[#F5F0E8]/70 leading-relaxed whitespace-pre-wrap">
                {confirmDetails.preview.substring(0, 300)}{confirmDetails.preview.length > 300 ? "..." : ""}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-4 border border-[#F5F0E8]/30 text-xs tracking-[0.2em] uppercase hover:border-[#F5F0E8] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => actionMutation.mutate({ action: confirmAction })}
                disabled={actionMutation.isPending}
                className="flex-1 py-4 bg-[#F5F0E8] text-[#1A1A1A] text-xs tracking-[0.2em] uppercase hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-action"
              >
                {actionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {confirmDetails.buttonText}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
