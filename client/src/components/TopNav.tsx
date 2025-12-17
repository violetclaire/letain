import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function TopNav() {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setLocation("/");
    window.location.reload();
  };

  return (
    <div className="fixed top-0 right-0 z-40 p-6 md:p-8">
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-xs md:text-sm font-medium text-[#6B4A55]">
            {user.firstName || user.email}
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wide text-[#6B4A55] border border-[#6B4A55]/20 rounded hover:bg-[#6B4A55]/5 transition-all duration-200"
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <div className="flex gap-3 md:gap-4">
          <button
            onClick={() => setLocation("/login")}
            className="px-5 py-2.5 text-xs uppercase tracking-wide font-medium text-[#6B4A55] border border-[#6B4A55]/30 rounded hover:bg-[#6B4A55]/5 transition-all duration-200"
            data-testid="button-login"
          >
            Login
          </button>
          <button
            onClick={() => setLocation("/signup")}
            className="px-5 py-2.5 text-xs uppercase tracking-wide font-medium text-white bg-[#6B4A55] rounded hover:bg-[#5A1F2B] transition-all duration-200 shadow-sm"
            data-testid="button-signup"
          >
            Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
