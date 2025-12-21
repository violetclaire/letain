import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

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
      return apiRequest(`/api/public/inquiry/${threadToken}/action/${action}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
    },
  });

  const contractMutation = useMutation({
    mutationFn: async (data: typeof contractData) => {
      return apiRequest(`/api/public/inquiry/${threadToken}/create-contract`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setShowContractForm(false);
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (data: typeof invoiceData) => {
      return apiRequest(`/api/public/inquiry/${threadToken}/create-invoice`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/inquiry/${threadToken}`] });
      setShowInvoiceForm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm tracking-widest uppercase text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm tracking-widest uppercase text-gray-500 mb-4">Inquiry not found</p>
          <a href="/" className="text-xs underline text-gray-400">Return home</a>
        </div>
      </div>
    );
  }

  const { inquiry, artist }: { inquiry: Inquiry; artist: ArtistProfile } = data;
  const onboardingComplete = artist?.onboardingCompleted;
  const slug = artist?.artistSlug;

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING": return "bg-yellow-900 text-yellow-200";
      case "ACCEPTED": return "bg-green-900 text-green-200";
      case "DEPOSIT_PAID": return "bg-emerald-900 text-emerald-200";
      case "REFERRED": return "bg-blue-900 text-blue-200";
      case "DECLINED": return "bg-red-900 text-red-200";
      default: return "bg-gray-800 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-900">
        <a href="/">
          <h1 className="text-sm tracking-[0.3em] font-light lowercase" style={{ fontFamily: "'Playfair Display', serif" }}>
            {artist?.businessName || "Artist"}
          </h1>
        </a>
        <div className="flex items-center gap-6">
          <span className="text-[10px] tracking-widest text-gray-500 uppercase">
            {inquiry.status}
          </span>
          {slug && (
            <a href={`/admin/${slug}`} className="text-xs tracking-widest uppercase text-gray-400 hover:text-white">
              Dashboard
            </a>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        <div className="mb-10 pb-8 border-b border-gray-900">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mb-2">inquiry from</p>
              <h2 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                {inquiry.clientName}
              </h2>
              <p className="text-sm text-gray-400 mt-2">{inquiry.clientEmail}</p>
              {inquiry.clientPhone && (
                <p className="text-sm text-gray-500 mt-1">{inquiry.clientPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs tracking-[0.2em] uppercase text-gray-500 mb-2">event date</p>
              <p className="text-lg">{format(new Date(inquiry.eventDate), "MMM d, yyyy")}</p>
              <span className={`inline-block mt-2 px-3 py-1 text-[10px] tracking-widest uppercase ${getStatusColor(inquiry.status)}`}>
                {inquiry.status}
              </span>
            </div>
          </div>

          {inquiry.message && (
            <div className="mt-6 p-4 bg-gray-900 border-l-2 border-gray-700">
              <p className="text-[10px] tracking-widest uppercase text-gray-500 mb-2">Client Message</p>
              <p className="text-sm text-gray-300 leading-relaxed">{inquiry.message}</p>
            </div>
          )}
        </div>

        {inquiry.status.toLowerCase() === "pending" && (
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-4">Accept & Send Info Sheet</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => actionMutation.mutate({ action: "accept-client" })}
                disabled={actionMutation.isPending}
                className="block p-6 border border-green-800 bg-green-900/20 hover:border-white hover:bg-white hover:text-black transition-all text-center"
              >
                <p className="text-xs tracking-widest uppercase mb-1">Client</p>
                <p className="text-[10px] text-gray-400">Direct booking inquiry</p>
              </button>
              <button
                onClick={() => actionMutation.mutate({ action: "accept-planner" })}
                disabled={actionMutation.isPending}
                className="block p-6 border border-purple-800 bg-purple-900/20 hover:border-white hover:bg-white hover:text-black transition-all text-center"
              >
                <p className="text-xs tracking-widest uppercase mb-1">Wedding Planner</p>
                <p className="text-[10px] text-gray-400">Planner inquiry</p>
              </button>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-4">Other Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => actionMutation.mutate({ action: "refer" })}
                disabled={actionMutation.isPending}
                className="block p-4 border border-gray-800 hover:border-white hover:bg-white hover:text-black transition-all text-center"
              >
                <p className="text-xs tracking-widest uppercase mb-1">Unavailable</p>
                <p className="text-[10px] text-gray-500">& Refer</p>
              </button>
              <button
                onClick={() => actionMutation.mutate({ action: "decline" })}
                disabled={actionMutation.isPending}
                className="block p-4 border border-gray-800 hover:border-white hover:bg-white hover:text-black transition-all text-center"
              >
                <p className="text-xs tracking-widest uppercase mb-1">Polite</p>
                <p className="text-[10px] text-gray-500">Decline</p>
              </button>
            </div>
          </div>
        )}

        {inquiry.status.toLowerCase() === "accepted" && (
          <div className="mb-10 space-y-3">
            {!onboardingComplete ? (
              <div className="border border-amber-600 bg-amber-900/20 p-6 mb-4">
                <p className="text-xs tracking-[0.2em] uppercase text-amber-400 mb-3">First Booking Setup</p>
                <p className="text-sm text-gray-300 mb-4">Before you can send contracts and collect payments, let's get you set up:</p>
                
                <div className="space-y-3">
                  <a
                    href={`/setup/${slug}/square`}
                    className={`flex items-center gap-3 p-4 border ${artist?.squareAccessToken ? "border-green-700 bg-green-900/20" : "border-gray-700 hover:border-white"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.squareAccessToken ? "bg-green-800" : "bg-gray-800"} flex items-center justify-center text-xs`}>
                      {artist?.squareAccessToken ? "✓" : "1"}
                    </div>
                    <div>
                      <p className="text-sm">Connect Square</p>
                      <p className="text-[10px] text-gray-500">{artist?.squareAccessToken ? "Connected" : "Accept payments"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/contract`}
                    className={`flex items-center gap-3 p-4 border ${artist?.contractTemplate ? "border-green-700 bg-green-900/20" : "border-gray-700 hover:border-white"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.contractTemplate ? "bg-green-800" : "bg-gray-800"} flex items-center justify-center text-xs`}>
                      {artist?.contractTemplate ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="text-sm">Upload Contract Template</p>
                      <p className="text-[10px] text-gray-500">{artist?.contractTemplate ? "Template saved" : "Your service agreement"}</p>
                    </div>
                  </a>
                  
                  <a
                    href={`/setup/${slug}/links`}
                    className={`flex items-center gap-3 p-4 border ${artist?.prettyLinks ? "border-green-700 bg-green-900/20" : "border-gray-700 hover:border-white"} transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-full ${artist?.prettyLinks ? "bg-green-800" : "bg-gray-800"} flex items-center justify-center text-xs`}>
                      {artist?.prettyLinks ? "✓" : "3"}
                    </div>
                    <div>
                      <p className="text-sm">Add Your Links</p>
                      <p className="text-[10px] text-gray-500">{artist?.prettyLinks ? "Links added" : "Instagram, website, etc."}</p>
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-2">Booking Actions</p>
                
                <button
                  onClick={() => setShowContractForm(!showContractForm)}
                  className="block w-full p-4 border border-[#6B4A55] bg-[#6B4A55]/20 hover:bg-[#6B4A55] transition-all text-center"
                >
                  <p className="text-xs tracking-widest uppercase">Send Contract</p>
                  <p className="text-[10px] text-gray-400 mt-1">Create & send for signing</p>
                </button>

                {showContractForm && (
                  <div className="p-6 border border-gray-800 bg-gray-900/50">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        contractMutation.mutate(contractData);
                      }}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Package Description</label>
                          <textarea
                            value={contractData.packageDetails}
                            onChange={(e) => setContractData({ ...contractData, packageDetails: e.target.value })}
                            rows={3}
                            className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                            placeholder="Bridal hair & makeup, 3 bridesmaids..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Total Amount ($)</label>
                            <input
                              type="number"
                              value={contractData.totalAmount}
                              onChange={(e) => setContractData({ ...contractData, totalAmount: e.target.value })}
                              step="0.01"
                              required
                              className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                              placeholder="1500.00"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Deposit Amount ($)</label>
                            <input
                              type="number"
                              value={contractData.depositAmount}
                              onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                              step="0.01"
                              required
                              className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                              placeholder="500.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Event Location</label>
                          <input
                            type="text"
                            value={contractData.eventLocation}
                            onChange={(e) => setContractData({ ...contractData, eventLocation: e.target.value })}
                            className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                            placeholder="Hotel name, address..."
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={contractMutation.isPending}
                          className="w-full border border-white py-3 text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                        >
                          {contractMutation.isPending ? "Sending..." : "Create & Send Contract"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <button
                  onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                  className="block w-full p-4 border border-amber-700 bg-amber-900/20 hover:bg-amber-800 transition-all text-center"
                >
                  <p className="text-xs tracking-widest uppercase">Send Invoice</p>
                  <p className="text-[10px] text-gray-400 mt-1">Collect deposit or balance</p>
                </button>

                {showInvoiceForm && (
                  <div className="p-6 border border-gray-800 bg-gray-900/50">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        invoiceMutation.mutate(invoiceData);
                      }}
                    >
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Invoice Type</label>
                          <select
                            value={invoiceData.type}
                            onChange={(e) => setInvoiceData({ ...invoiceData, type: e.target.value })}
                            className="w-full bg-black border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                          >
                            <option value="deposit">Deposit / Retainer</option>
                            <option value="balance">Final Balance</option>
                            <option value="custom">Custom Amount</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Amount ($)</label>
                          <input
                            type="number"
                            value={invoiceData.amount}
                            onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
                            step="0.01"
                            required
                            className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                            placeholder="500.00"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Description (Optional)</label>
                          <textarea
                            value={invoiceData.description}
                            onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
                            rows={2}
                            className="w-full bg-transparent border border-gray-700 p-3 text-sm focus:border-white focus:outline-none"
                            placeholder="Deposit for bridal services..."
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={invoiceMutation.isPending}
                          className="w-full border border-white py-3 text-xs tracking-widest uppercase hover:bg-white hover:text-black transition-all disabled:opacity-50"
                        >
                          {invoiceMutation.isPending ? "Sending..." : "Send Invoice"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
