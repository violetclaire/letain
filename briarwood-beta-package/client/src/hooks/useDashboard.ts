import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useDashboard(requiredRole?: string, isAuthorized?: (user: any) => boolean) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const isDateInquiry = typeof window !== 'undefined' && window.location.hostname.includes('dateinquiry');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
      return;
    }

    if (user) {
      const roleAuthorized = !requiredRole || user.role === requiredRole;
      const customAuthorized = !isAuthorized || isAuthorized(user);

      if (!roleAuthorized && !customAuthorized) {
        if (!user.role) {
          setLocation("/register");
          return;
        }
        toast({
          title: "Access Denied",
          description: `You do not have permission to access this dashboard.`,
          variant: "destructive",
        });
        setLocation("/");
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, requiredRole, isAuthorized, setLocation, toast]);

  return {
    user,
    authLoading,
    isAuthenticated,
    toast,
    queryClient,
    location,
    setLocation,
    isDateInquiry
  };
}
