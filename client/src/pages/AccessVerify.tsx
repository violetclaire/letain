import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Loader2 } from "lucide-react";

export default function AccessVerify() {
  const [, params] = useRoute("/access/:code");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.code) {
      window.location.href = `/api/public/artist/login/${params.code}`;
    }
  }, [params?.code]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="w-full max-w-md p-8 border border-[#F5F0E8]/20 rounded text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/login" className="text-[#F5F0E8] underline">
            Request a new login link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5F0E8] mx-auto mb-4" />
        <p className="text-[#F5F0E8]/60">Signing you in...</p>
      </div>
    </div>
  );
}
