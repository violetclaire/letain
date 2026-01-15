import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, AlertCircle, Loader2, Pen, Type, Calendar, MapPin, DollarSign, Clock, ChevronDown, Download, Mail, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";

interface ContractSigningProps {
  token: string;
}

export default function ContractSigning({ token }: ContractSigningProps) {
  const queryClient = useQueryClient();
  const [signatureName, setSignatureName] = useState("");
  const [signatureEmail, setSignatureEmail] = useState("");
  const [signingOnBehalfOf, setSigningOnBehalfOf] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const contractScrollRef = useRef<HTMLDivElement>(null);

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
      const signature = signatureMode === "draw" ? drawnSignature : typedSignature;
      const res = await fetch(`/api/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedByName: signatureName,
          signedByEmail: signatureEmail,
          clientSignature: signature,
          signedOnBehalfOf: signingOnBehalfOf || null,
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

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawnSignature(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSignature(null);
  };

  const handleScroll = () => {
    const container = contractScrollRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setHasScrolledToBottom(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-gray-700 mx-auto" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-gray-200 mx-auto" />
          </div>
          <p className="mt-4 text-gray-700 font-medium">Loading your contract...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full shadow-sm border-gray-200">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900">Contract Not Found</h2>
              <p className="text-gray-600">
                {(error as Error).message || "This signing link may have expired or is invalid."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state - contract already signed
  if (contract.status === "signed") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <div className="bg-green-50 p-8 text-center border-b border-gray-200">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                Contract Signed Successfully
              </h2>
              <p className="text-green-700">Your signature has been recorded</p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Signed by</p>
                    <p className="font-medium text-gray-900">{contract.signedByName}</p>
                    {contract.signedOnBehalfOf && (
                      <p className="text-xs text-gray-500">on behalf of {contract.signedOnBehalfOf}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(contract.signedAt).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">Your Signature</p>
                {contract.clientSignature?.startsWith('data:image') ? (
                  <img src={contract.clientSignature} alt="Signature" className="max-h-16 mx-auto" />
                ) : (
                  <p className="text-3xl italic text-gray-700" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
                    {contract.clientSignature}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <p>A copy of this signed contract has been sent to your email.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const hasSignature = signatureMode === "draw" ? !!drawnSignature : !!typedSignature.trim();
  const canSign = signatureName.trim() && signatureEmail.trim() && hasSignature && agreedToTerms;

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl text-gray-900 font-medium" style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
              {contract.artistName || "Beauty Services"}
            </h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase">Contract Signing</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Secure & Encrypted</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Event Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {contract.packageDetails || "Beauty Services Contract"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">From {contract.artistName || "Your Beauty Artist"}</p>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(contract.totalAmount || 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contract Content - Full Width, No Scroll */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="shadow-sm border-gray-200">
            <div className="bg-gray-100 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-800">Service Contract</span>
            </div>
            <div className="p-6">
              <div 
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contract.contractHtml, { 
                  FORBID_TAGS: ['style'],
                }) }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Signature Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm border-gray-200">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Sign This Contract</h3>
              <p className="text-xs text-gray-500 mt-1">Complete the form below to sign</p>
            </div>
            <CardContent className="p-6 space-y-5">
                {/* Name & Email */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="signatureName" className="text-sm font-medium">Full Legal Name</Label>
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
                    <Label htmlFor="signatureEmail" className="text-sm font-medium">Email Address</Label>
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
                  <div>
                    <Label htmlFor="signingOnBehalfOf" className="text-sm font-medium">
                      Signing on Behalf of <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="signingOnBehalfOf"
                      data-testid="input-signing-on-behalf-of"
                      value={signingOnBehalfOf}
                      onChange={(e) => setSigningOnBehalfOf(e.target.value)}
                      placeholder="e.g., Laura Fiche (if signing for someone else)"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank if signing for yourself</p>
                  </div>
                </div>

                {/* Signature Mode Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-900">Your Signature</Label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSignatureMode("type")}
                      data-testid="button-signature-type"
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                        signatureMode === "type" 
                          ? "bg-gray-900 text-white border-gray-900" 
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Type className="h-4 w-4" />
                      Type
                    </button>
                    <button
                      onClick={() => setSignatureMode("draw")}
                      data-testid="button-signature-draw"
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                        signatureMode === "draw" 
                          ? "bg-gray-900 text-white border-gray-900" 
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Pen className="h-4 w-4" />
                      Draw
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {signatureMode === "type" ? (
                      <motion.div
                        key="type"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Input
                          data-testid="input-typed-signature"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your name as signature"
                          className="text-xl italic h-14 text-center"
                          style={{ fontFamily: "'Dancing Script', cursive, serif" }}
                        />
                        {typedSignature && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                            <p className="text-xs text-gray-400 mb-1">Preview</p>
                            <p className="text-2xl italic text-gray-700" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
                              {typedSignature}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="draw"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="border-2 border-dashed border-gray-200 rounded-lg bg-white relative">
                          <canvas
                            ref={canvasRef}
                            width={300}
                            height={120}
                            className="w-full cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          {!drawnSignature && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300">
                              <span className="text-sm">Sign here</span>
                            </div>
                          )}
                        </div>
                        {drawnSignature && (
                          <button
                            onClick={clearCanvas}
                            data-testid="button-clear-signature"
                            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Clear signature
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="agreeTerms"
                    data-testid="checkbox-agree-terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="agreeTerms" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
                    I have read and agree to the terms of this contract. I understand that by signing, 
                    I am providing my legal electronic signature.
                  </label>
                </div>

                {/* Sign Button */}
                <Button
                  data-testid="button-sign-contract"
                  onClick={() => signMutation.mutate()}
                  disabled={!canSign || signMutation.isPending}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-lg"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Signing Contract...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Sign Contract
                    </>
                  )}
                </Button>

                {signMutation.isError && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{(signMutation.error as Error).message}</span>
                  </div>
                )}

                <p className="text-xs text-center text-gray-400">
                  Secured • Your data is encrypted
                </p>
              </CardContent>
            </Card>
          </motion.div>
      </div>
    </div>
  );
}
