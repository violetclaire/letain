import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Check, AlertCircle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EnvelopeAnimation from "@/components/EnvelopeAnimation";

export default function InviteAccept() {
  const { token: urlToken } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  
  // Check for stored invite token from login redirect
  const storedToken = sessionStorage.getItem('inviteToken');
  const token = urlToken || storedToken;
  
  // Clear stored token after use
  useEffect(() => {
    if (storedToken && urlToken) {
      sessionStorage.removeItem('inviteToken');
    }
  }, [storedToken, urlToken]);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: invitation, isLoading: inviteLoading, error: inviteError } = useQuery({
    queryKey: ["/api/invitations/token", token],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/token/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch invitation");
      }
      return res.json();
    },
    enabled: !!token,
  });

  const { data: booking } = useQuery({
    queryKey: ["/api/bookings", invitation?.bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${invitation.bookingId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!invitation?.bookingId,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invitations/accept/${token}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      setAccepted(true);
      toast({
        title: "Welcome to Beauvette!",
        description: "Your profile has been created. Redirecting to your dashboard...",
      });
      setTimeout(() => {
        const dashboard = invitation?.role === 'planner' ? '/planner' : '/client';
        setLocation(dashboard);
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (inviteLoading || userLoading) {
    return (
      <div className="min-h-screen bg-[#A7C7E7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 animate-pulse">
            <img 
              src="/attached_assets/house_vector_1764825403084.jpg" 
              alt="Loading" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <p className="text-white">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invitation) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border-[#E8B4B8]/20">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-serif text-[#262329] mb-2">Invalid Invitation</h2>
            <p className="text-[#262329]/60 mb-6">
              {inviteError?.message || "This invitation link is invalid, expired, or has already been used."}
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-[#262329] hover:bg-[#262329]/90 text-white"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-white border-[#3D5A3B]/20">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#3D5A3B]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-[#3D5A3B]" />
            </div>
            <h2 className="text-xl font-serif text-[#262329] mb-2">Welcome to Beauvette!</h2>
            <p className="text-[#262329]/60">Redirecting you to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EnvelopeAnimation recipientName={invitation.firstName}>
      <Card className="bg-white border border-[#C9A961]/40 shadow-xl rounded-none p-1">
        <div className="border border-[#C9A961]/30">
        <CardHeader className="text-center pb-2 pt-8">
          <CardTitle className="text-4xl text-[#262329] mb-2" style={{ fontFamily: "'Pinyon Script', 'Dancing Script', cursive", fontWeight: 400 }}>
            Beauvette
          </CardTitle>
          <CardDescription className="text-sm text-[#262329]/60 tracking-wide">
            The first platform for businesses and their clients
          </CardDescription>
          <p className="mt-5 text-base text-[#262329]">
            Hello, {invitation.firstName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-[#FAF9F7] rounded-lg text-center">
            <p className="text-[#262329]/80 leading-relaxed">
              Everything you need is in one place.
            </p>
          </div>

          {booking && (
            <div className="p-4 bg-[#FAF9F7] rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-[#E8B4B8]" />
                <span className="text-[#262329]">
                  {new Date(booking.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-[#E8B4B8]" />
                <span className="text-[#262329]">{booking.location}</span>
              </div>
            </div>
          )}

          {user ? (
            <Button
              className="w-full bg-[#262329] hover:bg-[#262329]/90 text-white py-6"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              data-testid="button-accept-invitation"
            >
              {acceptMutation.isPending ? (
                "Setting up your account..."
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Accept Invitation & Continue
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-[#262329]/60">
                Sign in with your Replit account to accept this invitation
              </p>
              <Button
                className="w-full bg-[#262329] hover:bg-[#262329]/90 text-white py-6"
                onClick={() => {
                  sessionStorage.setItem('inviteToken', token || '');
                  window.location.href = '/api/login';
                }}
                data-testid="button-login-to-accept"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Sign In to Accept
              </Button>
            </div>
          )}

        </CardContent>
        </div>
      </Card>
    </EnvelopeAnimation>
  );
}
