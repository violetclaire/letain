import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import { Loader2, ArrowLeft, Plus, X, Users, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CircleMember {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  slug?: string;
  status: 'pending' | 'active';
  addedAt: string;
}

export default function TrustedCircle() {
  const [, params] = useRoute("/:artistSlug/circle");
  const queryClient = useQueryClient();
  const slug = params?.artistSlug;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  
  // Use session auth if logged in as artist and no token provided
  const useSessionAuth = !token && isAuthenticated && user?.role === 'artist';
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/trusted-circle`, token, useSessionAuth],
    queryFn: async () => {
      if (useSessionAuth) {
        const res = await fetch(`/api/artist/trusted-circle`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Access denied");
          throw new Error("Failed to load trusted circle");
        }
        return res.json();
      }
      const res = await fetch(`/api/public/trusted-circle?token=${token}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Access denied");
        throw new Error("Failed to load trusted circle");
      }
      return res.json();
    },
    enabled: !!token || useSessionAuth,
  });

  const addMember = useMutation({
    mutationFn: async (member: { name: string; email: string; note?: string }) => {
      const url = useSessionAuth ? `/api/artist/trusted-circle` : `/api/public/trusted-circle?token=${token}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: useSessionAuth ? 'include' : 'same-origin',
        body: JSON.stringify(member),
      });
      if (!res.ok) throw new Error("Failed to add member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trusted-circle`, token, useSessionAuth] });
      setShowAddModal(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setInviteNote("");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const url = useSessionAuth ? `/api/artist/trusted-circle/${memberId}` : `/api/public/trusted-circle/${memberId}?token=${token}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: useSessionAuth ? 'include' : 'same-origin',
      });
      if (!res.ok) throw new Error("Failed to remove member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trusted-circle`, token, useSessionAuth] });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]/30" />
      </div>
    );
  }

  if (!token && !useSessionAuth) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Access Required
          </h2>
          <p className="text-sm text-[#2D2D2D]/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            This page requires a secure link. Check your email for your admin link.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#2D2D2D]/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            Invalid or expired access link
          </p>
        </div>
      </div>
    );
  }

  const members: CircleMember[] = data?.members || [];
  const artistProfile = data?.artistProfile;

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-[#2D2D2D]/10">
        <Link 
          href={useSessionAuth ? `/admin/${slug}` : `/admin/${slug}?token=${token}`}
          className="inline-flex items-center gap-2 text-sm text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Your Trusted Circle
        </h1>
        <p className="text-sm text-[#2D2D2D]/50 mt-2">
          Artists you refer clients to when you're unavailable
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-8 md:px-16 py-12">
        <div className="flex justify-between items-center mb-8">
          <p className="text-sm text-[#2D2D2D]/60">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2D2D2D] text-white text-sm hover:bg-[#2D2D2D]/90 transition-colors"
            data-testid="button-add-member"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#2D2D2D]/20">
            <Users className="w-12 h-12 text-[#2D2D2D]/20 mx-auto mb-4" />
            <p className="text-[#2D2D2D]/50">Your circle is empty</p>
            <p className="text-sm text-[#2D2D2D]/30 mt-2">
              Add trusted colleagues to refer clients when you're booked
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex justify-between items-center p-6 border border-[#2D2D2D]/10"
                data-testid={`circle-member-${member.id}`}
              >
                <div>
                  <h3 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {member.name}
                  </h3>
                  {member.businessName && (
                    <p className="text-sm text-[#2D2D2D]/70 mt-1">{member.businessName}</p>
                  )}
                  <p className="text-sm text-[#2D2D2D]/50 mt-1">{member.email}</p>
                  {member.status === 'pending' && (
                    <span className="inline-block mt-2 px-2 py-1 text-[10px] tracking-[0.1em] uppercase bg-yellow-100 text-yellow-800">
                      Pending Invite
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removeMember.mutate(member.id)}
                  disabled={removeMember.isPending}
                  className="p-2 text-[#2D2D2D]/40 hover:text-red-500 transition-colors"
                  data-testid={`button-remove-${member.id}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 bg-[#F5F3F0] border border-[#2D2D2D]/10">
          <p className="text-sm text-[#2D2D2D]/70">
            <strong>How it works:</strong> When you refer a client, they'll receive your referral list
            with links to your circle members' inquiry forms. This creates a trusted network where
            everyone wins.
          </p>
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full p-8" style={{ fontFamily: "'Inter', sans-serif" }}>
            <h2 className="text-xl mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Add to Your Circle
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#2D2D2D]/60 mb-2">Name</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Their name"
                  className="w-full px-4 py-3 border border-[#2D2D2D]/20 focus:border-[#2D2D2D]/40 focus:outline-none"
                  data-testid="input-member-name"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#2D2D2D]/60 mb-2">Email</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Their email address"
                  className="w-full px-4 py-3 border border-[#2D2D2D]/20 focus:border-[#2D2D2D]/40 focus:outline-none"
                  data-testid="input-member-email"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#2D2D2D]/60 mb-2">Personal Note (optional)</label>
                <textarea
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="I'd love to add you to my referral network..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[#2D2D2D]/20 focus:border-[#2D2D2D]/40 focus:outline-none resize-none"
                  data-testid="input-invite-note"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-[#2D2D2D]/20 text-[#2D2D2D] hover:bg-[#F5F3F0] transition-colors"
                data-testid="button-cancel-add"
              >
                Cancel
              </button>
              <button
                onClick={() => addMember.mutate({
                  name: newMemberName,
                  email: newMemberEmail,
                  note: inviteNote || undefined,
                })}
                disabled={!newMemberName || !newMemberEmail || addMember.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2D2D2D] text-white hover:bg-[#2D2D2D]/90 transition-colors disabled:opacity-50"
                data-testid="button-confirm-add"
              >
                {addMember.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
