import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, AlertCircle, Loader2, Pen, Type, Calendar, MapPin, DollarSign, Clock, ChevronDown, Download, Mail, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-[#6B4A55] mx-auto" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-[#6B4A55]/20 mx-auto" />
          </div>
          <p className="mt-4 text-[#6B4A55] font-medium">Loading your contract...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full shadow-xl border-red-100">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
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
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full"
        >
          <Card className="shadow-xl border-green-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 text-center border-b">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
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
                    <p className="font-medium">{contract.signedByName}</p>
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
                    <p className="font-medium">
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
              
              <div className="border rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">Your Signature</p>
                {contract.clientSignature?.startsWith('data:image') ? (
                  <img src={contract.clientSignature} alt="Signature" className="max-h-16 mx-auto" />
                ) : (
                  <p className="text-3xl italic text-[#6B4A55]" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
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

  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 
              className="text-2xl text-[#6B4A55]"
              style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
            >
              Your Private Secretary
            </h1>
            <p className="text-xs text-[#6B4A55]/60 tracking-widest uppercase">Contract Signing</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Secure & Encrypted</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Event Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-[#6B4A55]/5 to-[#6B4A55]/10 border-[#6B4A55]/20">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {contract.packageDetails || "Beauty Services Contract"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">From {contract.artistName || "Your Beauty Artist"}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {contract.eventDates && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[#6B4A55]" />
                      <span>{contract.eventDates}</span>
                    </div>
                  )}
                  {contract.eventLocation && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-[#6B4A55]" />
                      <span className="max-w-[200px] truncate">{contract.eventLocation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#6B4A55]">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCurrency(contract.totalAmount || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contract Content - Left Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="shadow-lg overflow-hidden">
              <div className="bg-[#6B4A55] text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">Service Contract</span>
                </div>
                {!hasScrolledToBottom && (
                  <motion.div 
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1 text-sm text-white/80"
                  >
                    <span>Scroll to read</span>
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                )}
              </div>
              <div 
                ref={contractScrollRef}
                onScroll={handleScroll}
                className="max-h-[60vh] overflow-y-auto p-6 contract-scroll"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div 
                  className="prose prose-sm max-w-none contract-content"
                  dangerouslySetInnerHTML={{ __html: contract.contractHtml }}
                />
              </div>
            </Card>
          </motion.div>

          {/* Signature Panel - Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-lg sticky top-24">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-800">Sign This Contract</h3>
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
                  <Label className="text-sm font-medium mb-2 block">Your Signature</Label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setSignatureMode("type")}
                      data-testid="button-signature-type"
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${
                        signatureMode === "type" 
                          ? "bg-[#6B4A55] text-white border-[#6B4A55]" 
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
                          ? "bg-[#6B4A55] text-white border-[#6B4A55]" 
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
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border text-center">
                            <p className="text-xs text-gray-400 mb-1">Preview</p>
                            <p className="text-2xl italic text-[#6B4A55]" style={{ fontFamily: "'Dancing Script', cursive, serif" }}>
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
                  className="w-full bg-[#6B4A55] hover:bg-[#5A1F2B] text-white py-6 text-lg shadow-lg"
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

      <style>{`
        .contract-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .contract-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .contract-scroll::-webkit-scrollbar-thumb {
          background: #c4c4c4;
          border-radius: 3px;
        }
        .contract-scroll::-webkit-scrollbar-thumb:hover {
          background: #a0a0a0;
        }
      `}</style>
    </div>
  );
}
