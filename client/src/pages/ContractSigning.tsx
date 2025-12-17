import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ContractSigningProps {
  token: string;
}

export default function ContractSigning({ token }: ContractSigningProps) {
  const queryClient = useQueryClient();
  const [signatureName, setSignatureName] = useState("");
  const [signatureEmail, setSignatureEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  
  const { data: contract, isLoading, error } = useQuery({
    queryKey: [`/api/contracts/sign/${token}`],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/sign/${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Contract not found");
      }
      return res.json();
    },
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedByName: signatureName,
          signedByEmail: signatureEmail,
          clientSignature: typedSignature,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to sign contract");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/sign/${token}`] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6B4A55] mx-auto mb-4" />
          <p className="text-[#6B4A55]">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
            <p className="text-gray-600">
              {(error as Error).message || "This signing link may have expired or is invalid."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (contract.status === "signed") {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Contract Signed
            </h2>
            <p className="text-gray-600 mb-4">
              This contract was signed by <strong>{contract.signedByName}</strong> on{" "}
              {new Date(contract.signedAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <div className="bg-gray-50 p-4 rounded-lg border mt-4">
              <p className="text-sm text-gray-500 mb-2">Signature:</p>
              <p className="text-2xl italic" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
                {contract.clientSignature}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSign = signatureName.trim() && signatureEmail.trim() && typedSignature.trim() && agreedToTerms;

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 
            className="text-3xl text-[#6B4A55] mb-2"
            style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          >
            Beauvette
          </h1>
          <p className="text-sm text-[#6B4A55] tracking-widest uppercase">
            For Life's Most Important Days
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="border-b bg-[#FAF7F2]">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#6B4A55]" />
              Service Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div 
              className="prose prose-sm max-w-none contract-content"
              dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-[#FAF7F2]">
            <CardTitle>Sign This Contract</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signatureName">Your Full Legal Name</Label>
                  <Input
                    id="signatureName"
                    data-testid="input-signature-name"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signatureEmail">Your Email Address</Label>
                  <Input
                    id="signatureEmail"
                    data-testid="input-signature-email"
                    type="email"
                    value={signatureEmail}
                    onChange={(e) => setSignatureEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="typedSignature">Type Your Signature</Label>
                <Input
                  id="typedSignature"
                  data-testid="input-typed-signature"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your name as your signature"
                  className="mt-1 text-2xl italic h-14"
                  style={{ fontFamily: "'Dancing Script', cursive, serif" }}
                />
                {typedSignature && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border text-center">
                    <p className="text-sm text-gray-500 mb-1">Signature Preview:</p>
                    <p 
                      className="text-3xl italic text-[#6B4A55]"
                      style={{ fontFamily: "'Dancing Script', cursive, serif" }}
                    >
                      {typedSignature}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreeTerms"
                  data-testid="checkbox-agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <label htmlFor="agreeTerms" className="text-sm text-gray-600 cursor-pointer">
                  I have read and agree to the terms of this contract. I understand that by typing my name above,
                  I am providing my legal electronic signature.
                </label>
              </div>

              <Button
                data-testid="button-sign-contract"
                onClick={() => signMutation.mutate()}
                disabled={!canSign || signMutation.isPending}
                className="w-full bg-[#6B4A55] hover:bg-[#5A1F2B] text-white py-6 text-lg"
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Signing...
                  </>
                ) : (
                  "Sign Contract"
                )}
              </Button>

              {signMutation.isError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
                  {(signMutation.error as Error).message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
