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
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="w-full max-w-md p-8 border border-[#E8E2D9] rounded text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/login" className="text-[#1A1A1A] underline">
            Request a new login link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A] mx-auto mb-4" />
        <p className="text-[#1A1A1A]/60">Signing you in...</p>
      </div>
    </div>
  );
}
