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
    <div className="fixed top-0 right-0 z-40 p-4">
      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6B4A55]">
            {user.firstName || user.email}
          </span>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/login")}
            data-testid="button-login"
          >
            Login
          </Button>
          <Button
            size="sm"
            className="bg-[#6B4A55] hover:bg-[#5A1F2B]"
            onClick={() => setLocation("/signup")}
            data-testid="button-signup"
          >
            Sign Up
          </Button>
        </div>
      )}
    </div>
  );
}
