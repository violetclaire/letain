import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, AlertCircle, Loader2, Pen, Calendar, MapPin, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";

interface ContractCountersignProps {
  token: string;
}

export default function ContractCountersign({ token }: ContractCountersignProps) {
  const queryClient = useQueryClient();
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const { data: contract, isLoading, error } = useQuery({
    queryKey: [`/api/contracts/countersign/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/countersign/${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Contract not found");
      }
      return res.json();
    },
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contracts/countersign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistSignature: typedSignature }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to countersign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/countersign/${token}`] });
    },
  });

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(36,24%,95%)] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[hsl(0,0%,10%)] mx-auto" />
          <p className="mt-4 text-[hsl(0,0%,23%)] font-[Inter]">Loading contract...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(36,24%,95%)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-[hsl(36,10%,84%)]">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-[Fraunces] text-[hsl(0,0%,10%)]">Contract Not Found</h2>
            <p className="mt-2 text-[hsl(0,0%,23%)] font-[Inter]">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contract?.artistSignature || contract?.status === "fully_executed") {
    return (
      <div className="min-h-screen bg-[hsl(36,24%,95%)] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full">
          <Card className="border-[hsl(36,10%,84%)]">
            <CardContent className="pt-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-[Fraunces] text-[hsl(0,0%,10%)] mb-2">Contract Fully Executed</h2>
              <p className="text-[hsl(0,0%,23%)] font-[Inter] mb-6">Both parties have signed this contract.</p>
              <div className="grid grid-cols-2 gap-4 text-left bg-[hsl(36,18%,93%)] rounded-lg p-4">
                <div>
                  <p className="text-sm text-[hsl(0,0%,35%)] font-[Inter]">Client</p>
                  <p className="font-[Fraunces] text-[hsl(0,0%,10%)]">{contract.clientSignature}</p>
                  <p className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">
                    {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(0,0%,35%)] font-[Inter]">Artist</p>
                  <p className="font-[Fraunces] text-[hsl(0,0%,10%)]">{contract.artistSignature}</p>
                  <p className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">
                    {contract.artistSignedAt ? new Date(contract.artistSignedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-[hsl(0,0%,35%)] font-[Inter]">A copy of the fully executed contract has been emailed to you.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (contract?.status !== "signed") {
    return (
      <div className="min-h-screen bg-[hsl(36,24%,95%)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-[hsl(36,10%,84%)]">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-[Fraunces] text-[hsl(0,0%,10%)]">Awaiting Client Signature</h2>
            <p className="mt-2 text-[hsl(0,0%,23%)] font-[Inter]">The client hasn't signed yet. You can countersign after they sign.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSign = typedSignature.trim().length >= 2 && agreedToTerms;

  return (
    <div className="min-h-screen bg-[hsl(36,24%,95%)]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="text-center mb-8">
            <FileText className="h-10 w-10 text-[hsl(0,0%,10%)] mx-auto mb-3" />
            <h1 className="text-3xl font-[Fraunces] tracking-tight text-[hsl(0,0%,10%)]">Countersign Contract</h1>
            <p className="mt-2 text-[hsl(0,0%,23%)] font-[Inter]">
              Review and add your signature to complete this contract with {contract.clientName}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {contract.eventDates && (
              <div className="bg-[hsl(36,18%,93%)] rounded-lg p-3 text-center">
                <Calendar className="h-4 w-4 text-[hsl(42,33%,57%)] mx-auto mb-1" />
                <p className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">Date</p>
                <p className="text-sm font-[Fraunces] text-[hsl(0,0%,10%)]">{contract.eventDates}</p>
              </div>
            )}
            {contract.eventLocation && (
              <div className="bg-[hsl(36,18%,93%)] rounded-lg p-3 text-center">
                <MapPin className="h-4 w-4 text-[hsl(42,33%,57%)] mx-auto mb-1" />
                <p className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">Location</p>
                <p className="text-sm font-[Fraunces] text-[hsl(0,0%,10%)] truncate">{contract.eventLocation}</p>
              </div>
            )}
            {contract.totalAmount && (
              <div className="bg-[hsl(36,18%,93%)] rounded-lg p-3 text-center">
                <DollarSign className="h-4 w-4 text-[hsl(42,33%,57%)] mx-auto mb-1" />
                <p className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">Total</p>
                <p className="text-sm font-[Fraunces] text-[hsl(0,0%,10%)]">{formatCurrency(contract.totalAmount)}</p>
              </div>
            )}
          </div>

          <Card className="border-[hsl(36,10%,84%)] mb-6">
            <CardContent className="p-0">
              <div className="bg-[hsl(36,18%,93%)] px-4 py-3 border-b border-[hsl(36,10%,84%)] flex items-center justify-between">
                <span className="text-sm font-[Inter] text-[hsl(0,0%,23%)]">Client signed by: <strong>{contract.clientSignature}</strong></span>
                <span className="text-xs text-[hsl(0,0%,35%)] font-[Inter]">
                  {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </span>
              </div>
              <div
                className="p-6 max-h-[500px] overflow-y-auto prose prose-sm font-[Inter]"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.contractHtml || '') }}
                data-testid="contract-content"
              />
            </CardContent>
          </Card>

          <Card className="border-[hsl(36,10%,84%)]">
            <CardContent className="pt-6">
              <h3 className="text-lg font-[Fraunces] text-[hsl(0,0%,10%)] mb-4 flex items-center gap-2">
                <Pen className="h-5 w-5" /> Your Signature
              </h3>

              <div className="space-y-4">
                <div>
                  <Label className="font-[Inter] text-[hsl(0,0%,23%)]">Type your full legal name</Label>
                  <Input
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Your full name"
                    className="mt-1 border-[hsl(36,10%,84%)] font-[Inter]"
                    data-testid="input-artist-signature"
                  />
                </div>

                {typedSignature && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[hsl(36,10%,84%)] rounded-lg p-6 text-center">
                    <p className="text-3xl font-[Fraunces] italic text-[hsl(0,0%,10%)]">{typedSignature}</p>
                    <p className="text-xs text-[hsl(0,0%,35%)] mt-2 font-[Inter]">Signature preview</p>
                  </motion.div>
                )}

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    data-testid="checkbox-agree-terms"
                  />
                  <label htmlFor="terms" className="text-sm text-[hsl(0,0%,23%)] font-[Inter] leading-snug cursor-pointer">
                    I confirm that I have reviewed the contract terms and agree to provide the services described herein.
                  </label>
                </div>

                <Button
                  onClick={() => signMutation.mutate()}
                  disabled={!canSign || signMutation.isPending}
                  className="w-full bg-[hsl(0,0%,10%)] text-[hsl(36,24%,95%)] hover:bg-[hsl(0,0%,20%)] font-[Inter] h-12"
                  data-testid="button-countersign"
                >
                  {signMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing...</>
                  ) : (
                    <><Pen className="h-4 w-4 mr-2" /> Countersign Contract</>
                  )}
                </Button>

                {signMutation.isError && (
                  <p className="text-red-600 text-sm font-[Inter] text-center" data-testid="text-sign-error">
                    {(signMutation.error as Error).message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
