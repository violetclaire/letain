import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

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
}

export default function InquiryThread() {
  const [, params] = useRoute("/inquiry/:threadToken");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const threadToken = params?.threadToken;

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
    mutationFn: async ({ action }: { action: string }) => {
      return apiRequest("POST", `/api/public/inquiry/${threadToken}/action/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
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
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#2D2D2D]/50 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Inquiry not found
          </p>
          <a href="/" className="text-xs underline text-[#2D2D2D]/40 hover:text-[#2D2D2D]">
            Return home
          </a>
        </div>
      </div>
    );
  }

  const { inquiry, artist }: { inquiry: Inquiry; artist: ArtistProfile } = data;
  const onboardingComplete = artist?.onboardingCompleted;
  const slug = artist?.artistSlug;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "text-[#2D2D2D]/60";
      case "accepted": return "text-[#2D2D2D]";
      case "referred": return "text-[#2D2D2D]/50";
      case "declined": return "text-[#2D2D2D]/40";
      default: return "text-[#2D2D2D]/50";
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="flex justify-between items-center px-8 md:px-16 py-8 border-b border-[#2D2D2D]/10">
        <a href="/">
          <h1 className="text-sm tracking-[0.2em] text-[#2D2D2D]/70" style={{ fontFamily: "'Playfair Display', serif" }}>
            {artist?.businessName || "Artist"}
          </h1>
        </a>
        <span className={`text-[10px] tracking-[0.3em] uppercase ${getStatusStyle(inquiry.status)}`}>
          {inquiry.status}
        </span>
      </header>

      <main className="max-w-xl mx-auto px-8 md:px-16 py-16 md:py-24">
        <div className="mb-16 pb-12 border-b border-[#2D2D2D]/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 mb-3">from</p>
              <h2 className="text-2xl text-[#2D2D2D] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {inquiry.clientName}
              </h2>
              <p className="text-sm text-[#2D2D2D]/50">{inquiry.clientEmail}</p>
              {inquiry.clientPhone && (
                <p className="text-sm text-[#2D2D2D]/50 mt-1">{inquiry.clientPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 mb-3">event</p>
              <p className="text-lg text-[#2D2D2D]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {format(new Date(inquiry.eventDate), "MMM d, yyyy")}
              </p>
              {inquiry.eventLocation && (
                <p className="text-sm text-[#2D2D2D]/50 mt-2">{inquiry.eventLocation}</p>
              )}
              {inquiry.eventType && (
                <p className="text-xs text-[#2D2D2D]/40 mt-1">{inquiry.eventType}</p>
              )}
            </div>
          </div>

          {inquiry.message && (
            <div className="mt-10 pl-6 border-l border-[#2D2D2D]/10">
              <p className="text-sm text-[#2D2D2D]/70 leading-relaxed italic">
                "{inquiry.message}"
              </p>
            </div>
          )}
        </div>

        {inquiry.status.toLowerCase() === "pending" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => actionMutation.mutate({ action: "accept-client" })}
                disabled={actionMutation.isPending}
                className="py-6 border border-[#2D2D2D] hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-accept"
              >
                <p className="text-xs tracking-[0.2em] uppercase">Accept</p>
              </button>
              <button
                onClick={() => actionMutation.mutate({ action: "refer" })}
                disabled={actionMutation.isPending}
                className="group py-6 border border-[#2D2D2D]/30 hover:border-[#2D2D2D] hover:bg-[#2D2D2D] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-refer"
              >
                <p className="text-xs tracking-[0.2em] uppercase text-[#2D2D2D]/70 group-hover:text-[#F9F8F6]">Refer</p>
              </button>
              <button
                onClick={() => actionMutation.mutate({ action: "decline" })}
                disabled={actionMutation.isPending}
                className="group py-6 border border-[#2D2D2D]/20 hover:border-[#2D2D2D] hover:bg-[#2D2D2D] transition-all duration-500 text-center disabled:opacity-50"
                data-testid="button-decline"
              >
                <p className="text-xs tracking-[0.2em] uppercase text-[#2D2D2D]/50 group-hover:text-[#F9F8F6]">Decline</p>
              </button>
            </div>
          </div>
        )}

        {inquiry.status.toLowerCase() === "accepted" && (
          <div className="space-y-8">
            {!onboardingComplete ? (
              <div className="p-8 border border-[#2D2D2D]/10">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 mb-6">Complete Setup</p>
                
                <div className="space-y-4">
                  <a
                    href={`/setup/${slug}/square`}
                    className={`flex items-center gap-4 p-5 border ${artist?.squareAccessToken ? "border-[#2D2D2D]/30" : "border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.squareAccessToken ? "bg-[#2D2D2D] text-[#F9F8F6]" : "border border-[#2D2D2D]/20"} flex items-center justify-center text-xs`}>
                      {artist?.squareAccessToken ? "✓" : "1"}
                    </div>
                    <div>
                      <p className="text-sm text-[#2D2D2D]">Connect Square</p>
                      <p className="text-[10px] text-[#2D2D2D]/40 mt-1">{artist?.squareAccessToken ? "Connected" : "Accept payments"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/contract`}
                    className={`flex items-center gap-4 p-5 border ${artist?.contractTemplate ? "border-[#2D2D2D]/30" : "border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.contractTemplate ? "bg-[#2D2D2D] text-[#F9F8F6]" : "border border-[#2D2D2D]/20"} flex items-center justify-center text-xs`}>
                      {artist?.contractTemplate ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="text-sm text-[#2D2D2D]">Contract Template</p>
                      <p className="text-[10px] text-[#2D2D2D]/40 mt-1">{artist?.contractTemplate ? "Template saved" : "Your service agreement"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/links`}
                    className={`flex items-center gap-4 p-5 border ${artist?.prettyLinks ? "border-[#2D2D2D]/30" : "border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.prettyLinks ? "bg-[#2D2D2D] text-[#F9F8F6]" : "border border-[#2D2D2D]/20"} flex items-center justify-center text-xs`}>
                      {artist?.prettyLinks ? "✓" : "3"}
                    </div>
                    <div>
                      <p className="text-sm text-[#2D2D2D]">Your Links</p>
                      <p className="text-[10px] text-[#2D2D2D]/40 mt-1">{artist?.prettyLinks ? "Links added" : "Instagram, website, etc."}</p>
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowContractForm(!showContractForm)}
                  className="w-full py-5 border border-[#2D2D2D] hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500 text-center"
                >
                  <p className="text-xs tracking-[0.2em] uppercase">Send Contract</p>
                </button>

                {showContractForm && (
                  <div className="p-8 border border-[#2D2D2D]/10">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        contractMutation.mutate(contractData);
                      }}
                      className="space-y-8"
                    >
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                          Package Description
                        </label>
                        <textarea
                          value={contractData.packageDetails}
                          onChange={(e) => setContractData({ ...contractData, packageDetails: e.target.value })}
                          rows={3}
                          className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm resize-none"
                          placeholder="Bridal hair & makeup, bridesmaids..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                            Total ($)
                          </label>
                          <input
                            type="number"
                            value={contractData.totalAmount}
                            onChange={(e) => setContractData({ ...contractData, totalAmount: e.target.value })}
                            step="0.01"
                            required
                            className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm"
                            placeholder="1500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                            Deposit ($)
                          </label>
                          <input
                            type="number"
                            value={contractData.depositAmount}
                            onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                            step="0.01"
                            required
                            className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm"
                            placeholder="500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                          Location
                        </label>
                        <input
                          type="text"
                          value={contractData.eventLocation}
                          onChange={(e) => setContractData({ ...contractData, eventLocation: e.target.value })}
                          className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm"
                          placeholder="Venue name, address..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={contractMutation.isPending}
                        className="w-full border border-[#2D2D2D] py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500 disabled:opacity-50"
                      >
                        {contractMutation.isPending ? "Sending..." : "Create & Send"}
                      </button>
                    </form>
                  </div>
                )}

                <button
                  onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                  className="group w-full py-5 border border-[#2D2D2D]/30 hover:border-[#2D2D2D] hover:bg-[#2D2D2D] transition-all duration-500 text-center"
                >
                  <p className="text-xs tracking-[0.2em] uppercase text-[#2D2D2D]/70 group-hover:text-[#F9F8F6]">Send Invoice</p>
                </button>

                {showInvoiceForm && (
                  <div className="p-8 border border-[#2D2D2D]/10">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        invoiceMutation.mutate(invoiceData);
                      }}
                      className="space-y-8"
                    >
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                          Type
                        </label>
                        <select
                          value={invoiceData.type}
                          onChange={(e) => setInvoiceData({ ...invoiceData, type: e.target.value })}
                          className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm"
                        >
                          <option value="deposit">Deposit</option>
                          <option value="balance">Final Balance</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          value={invoiceData.amount}
                          onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                          step="0.01"
                          required
                          className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/40 block mb-4">
                          Description
                        </label>
                        <textarea
                          value={invoiceData.description}
                          onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                          rows={2}
                          className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] focus:border-[#2D2D2D]/50 focus:outline-none px-0 py-3 text-sm resize-none"
                          placeholder="Deposit for bridal services..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={invoiceMutation.isPending}
                        className="w-full border border-[#2D2D2D] py-4 text-xs tracking-[0.2em] uppercase hover:bg-[#2D2D2D] hover:text-[#F9F8F6] transition-all duration-500 disabled:opacity-50"
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

        {inquiry.status.toLowerCase() === "referred" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#2D2D2D]/50 italic">This inquiry has been referred.</p>
          </div>
        )}

        {inquiry.status.toLowerCase() === "declined" && (
          <div className="text-center py-8">
            <p className="text-sm text-[#2D2D2D]/50 italic">This inquiry has been declined.</p>
          </div>
        )}
      </main>
    </div>
  );
}
