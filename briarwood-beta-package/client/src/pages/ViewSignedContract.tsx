import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, CheckCircle2, Calendar, MapPin, FileText } from "lucide-react";
import { Link } from "wouter";
import DOMPurify from "dompurify";

interface ViewSignedContractProps {
  contractId: string;
}

export default function ViewSignedContract({ contractId }: ViewSignedContractProps) {
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Contract not found");
      return res.json();
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p className="text-[#1A1A1A]">Loading contract...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center justify-center p-6">
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">Contract Not Found</h1>
        <p className="text-gray-600 mb-4">This contract may have been deleted or you don't have access.</p>
        <Link href="/artist/contracts" className="text-blue-600 hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB] print:bg-white">
      <div className="max-w-4xl mx-auto p-6 print:p-0">
        <div className="print:hidden mb-6 flex items-center justify-between">
          <Link href="/artist/contracts" className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
            <ArrowLeft size={16} />
            Back to Contracts
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
          >
            <Download size={16} />
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#E8E2D9] overflow-hidden print:shadow-none print:border-none">
          <div className="p-6 border-b border-[#E8E2D9] print:border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">
                  {contract.clientName || "Contract"}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {contract.eventDates && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {contract.eventDates}
                    </span>
                  )}
                  {contract.eventLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {contract.eventLocation}
                    </span>
                  )}
                </div>
              </div>
              {contract.status === "signed" && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Signed
                </div>
              )}
            </div>
          </div>

          {contract.contractHtml && (
            <div 
              className="p-6 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.contractHtml) }}
            />
          )}

          {contract.status === "signed" && (
            <div className="p-6 border-t border-[#E8E2D9] bg-[#FAFAF7]">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Signature Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Signed By</p>
                  <p className="font-medium">{contract.signedByName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-medium">{contract.signedByEmail}</p>
                </div>
                {contract.signedOnBehalfOf && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">On Behalf Of</p>
                    <p className="font-medium">{contract.signedOnBehalfOf}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Signed At</p>
                  <p className="font-medium">
                    {new Date(contract.signedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {contract.clientSignature && (
                <div className="mt-4 pt-4 border-t border-[#E8E2D9]">
                  <p className="text-xs text-gray-500 mb-2">Signature</p>
                  <div className="bg-white border border-[#E8E2D9] rounded p-4 inline-block">
                    {contract.clientSignature.startsWith("data:") ? (
                      <img src={contract.clientSignature} alt="Signature" className="max-h-16" />
                    ) : (
                      <p className="text-2xl font-script italic text-[#1A1A1A]">
                        {contract.clientSignature}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
