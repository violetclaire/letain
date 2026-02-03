import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Upload, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ContractEditor() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch artist bookings
  const { data: bookings = [], error: bookingsError } = useQuery({
    queryKey: ["artistBookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        console.log("[ContractEditor] Fetching bookings for artist:", user.id);
        const res = await fetch(`/api/bookings/artist/${user.id}`, { 
          credentials: "include" 
        });
        if (!res.ok) {
          console.error("[ContractEditor] Bookings fetch failed:", res.status, res.statusText);
          return [];
        }
        const data = await res.json();
        console.log("[ContractEditor] Bookings fetched:", data.length);
        return data;
      } catch (err) {
        console.error("[ContractEditor] Error fetching bookings:", err);
        return [];
      }
    },
    enabled: !!user,
  });

  // Fetch artist contracts
  const { data: contracts = [], error: contractsError } = useQuery({
    queryKey: ["artistContracts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        console.log("[ContractEditor] Fetching contracts for artist:", user.id);
        const res = await fetch(`/api/contracts/artist/${user.id}`, { 
          credentials: "include" 
        });
        if (!res.ok) {
          console.error("[ContractEditor] Contracts fetch failed:", res.status, res.statusText);
          const text = await res.text();
          console.error("[ContractEditor] Response:", text);
          return [];
        }
        const data = await res.json();
        console.log("[ContractEditor] Contracts fetched:", data.length, data);
        return data;
      } catch (err) {
        console.error("[ContractEditor] Error fetching contracts:", err);
        return [];
      }
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (bookingsError) {
      console.error("[ContractEditor] Bookings error:", bookingsError);
      toast({
        title: "Error loading bookings",
        description: bookingsError.message,
        variant: "destructive"
      });
    }
    if (contractsError) {
      console.error("[ContractEditor] Contracts error:", contractsError);
      toast({
        title: "Error loading contracts",
        description: contractsError.message,
        variant: "destructive"
      });
    }
  }, [bookingsError, contractsError, toast]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBookingId) {
      toast({ 
        title: "Error", 
        description: "Please select a client first",
        variant: "destructive" 
      });
      return;
    }

    if (!uploadedFile) {
      toast({ 
        title: "Error", 
        description: "Please select a file to upload",
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1];
          
          console.log("[ContractEditor] Uploading contract for booking:", selectedBookingId);
          const res = await fetch(`/api/bookings/${selectedBookingId}/upload-contract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              fileContent: base64,
              fileName: uploadedFile.name,
              mimeType: uploadedFile.type || 'application/pdf',
              packageDetails: 'Beauty Services Package',
              totalAmount: 0,
              depositAmount: 0,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log("[ContractEditor] Upload successful:", data);
            toast({ 
              title: "Success", 
              description: "Contract uploaded successfully!"
            });
            setUploadedFile(null);
            queryClient.invalidateQueries({ queryKey: ["artistContracts"] });
          } else {
            const error = await res.json();
            console.error("[ContractEditor] Upload failed:", error);
            toast({ 
              title: "Upload Failed", 
              description: error.error || "Failed to upload contract",
              variant: "destructive" 
            });
          }
        } catch (err: any) {
          console.error("[ContractEditor] Upload error:", err);
          toast({ 
            title: "Error", 
            description: err.message || "Failed to upload contract",
            variant: "destructive" 
          });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(uploadedFile);
    } catch (err: any) {
      console.error("[ContractEditor] File read error:", err);
      toast({ 
        title: "Error", 
        description: "Failed to read file",
        variant: "destructive" 
      });
      setIsUploading(false);
    }
  };

  const handleSend = async (contractId: string) => {
    setIsSending(true);
    try {
      console.log("[ContractEditor] Sending contract for signing:", contractId);
      const res = await fetch(`/api/contracts/${contractId}/send-for-signing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[ContractEditor] Send successful:", data);
        toast({ 
          title: "Success", 
          description: "Contract sent for signing! Client will receive an email."
        });
        queryClient.invalidateQueries({ queryKey: ["artistContracts"] });
      } else {
        const error = await res.json();
        console.error("[ContractEditor] Send failed:", error);
        toast({ 
          title: "Error", 
          description: error.error || "Failed to send contract",
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      console.error("[ContractEditor] Send error:", err);
      toast({ 
        title: "Error", 
        description: err.message || "Failed to send contract",
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen p-4 bg-powder-blue">
      <div className="max-w-4xl mx-auto">
        <Link href="/artist" className="text-sm flex items-center gap-1 hover:underline mb-6">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Upload Contract</h1>
          <p className="text-gray-600">Upload and send contracts for clients to sign</p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Client *</label>
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Choose a client --</option>
                {bookings.map((booking: any) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.clientName} - {booking.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Upload Contract File *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.html"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
              {uploadedFile && (
                <p className="text-sm text-green-600 mt-1">
                  File selected: {uploadedFile.name}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedBookingId || !uploadedFile}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              {isUploading ? "Uploading..." : "Upload Contract"}
            </button>
          </form>
        </div>

        {/* Contracts List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Your Contracts ({contracts.length})</h2>
          
          {contracts.length === 0 ? (
            <p className="text-gray-500">No contracts yet. Upload one to get started!</p>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract: any) => (
                <div key={contract.id} className="border border-gray-200 rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{contract.clientName}</p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="font-semibold capitalize">{contract.status}</span>
                    </p>
                    {contract.eventLocation && (
                      <p className="text-sm text-gray-600">{contract.eventLocation}</p>
                    )}
                  </div>
                  
                  {contract.status === 'draft' && (
                    <button
                      onClick={() => handleSend(contract.id)}
                      disabled={isSending}
                      className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={16} />
                      {isSending ? "Sending..." : "Send for Signing"}
                    </button>
                  )}
                  
                  {contract.status === 'sent' && (
                    <div className="text-orange-600 font-medium">Awaiting Signature</div>
                  )}
                  
                  {contract.status === 'signed' && (
                    <div className="flex items-center gap-3">
                      <div className="text-green-600 font-medium">Signed</div>
                      <a 
                        href={`/contract/${contract.id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
                      >
                        View Contract
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
