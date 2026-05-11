import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Users, Plus, Search, Heart, Star, Mail, Phone, Instagram, ExternalLink, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { NetworkContactUI as NetworkContact } from "@shared/types";

export default function ArtistRolodex() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    specialty: "",
    notes: "",
  });

  const { data: contacts = [], isLoading } = useQuery<NetworkContact[]>({
    queryKey: ["artist-network"],
    queryFn: async () => {
      const res = await fetch("/api/artist-network", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const res = await fetch("/api/artist-network/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send invite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-network"] });
      setShowInviteForm(false);
      setInviteForm({ name: "", email: "", specialty: "", notes: "" });
      toast({ title: "Invitation sent!" });
    },
  });

  const specialties = [
    "all",
    "Wedding Planner",
    "Photographer",
    "Videographer",
    "Florist",
    "DJ",
    "Caterer",
    "Venue",
    "Hair Stylist",
    "Makeup Artist",
    "Other",
  ];

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || c.specialty.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const favorites = filteredContacts.filter(c => c.isFavorite);
  const others = filteredContacts.filter(c => !c.isFavorite);

  return (
    <div className="min-h-screen bg-powder">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/artist">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="font-header text-xl sm:text-2xl ink-main flex items-center gap-2">
              <Users className="w-6 h-6" />
              Your Network
            </h1>
            <p className="text-sm text-gray-600">People you love to work with</p>
          </div>
          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-black text-white hover:bg-gray-800"
            data-testid="button-invite-new"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>

        {/* AI Learning Banner */}
        <div className="bg-gradient-to-r from-[#E8B4B8]/20 to-[#A7C7E7]/20 p-4 rounded-lg mb-6 border border-[#C9A961]/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-full">
              <Sparkles className="w-5 h-5 text-[#C9A961]" />
            </div>
            <div>
              <h3 className="font-header text-sm ink-main mb-1">Your Secretary learns who you work with best</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Build your trusted network here. When you're unavailable for a booking, we'll recommend your favorites first. 
                If they're also booked, we'll suggest vendors from their trusted networks - so clients always get someone great.
              </p>
            </div>
          </div>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <div className="bg-cream p-4 sm:p-6 rounded-lg shadow-sm border border-black/10 mb-6">
            <h2 className="font-header text-lg mb-4">Invite to Your Network</h2>
            <p className="text-sm text-gray-600 mb-4">
              Invite vendors you love working with. They'll get a beautiful invitation to join.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Their name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  data-testid="input-invite-name"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="Their email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  data-testid="input-invite-email"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">What do they do?</label>
                <select
                  value={inviteForm.specialty}
                  onChange={(e) => setInviteForm({ ...inviteForm, specialty: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  data-testid="select-invite-specialty"
                >
                  <option value="">Select specialty...</option>
                  {specialties.filter(s => s !== "all").map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="How do you know them?"
                  value={inviteForm.notes}
                  onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  data-testid="input-invite-notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowInviteForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => inviteMutation.mutate(inviteForm)}
                disabled={!inviteForm.name || !inviteForm.email || !inviteForm.specialty || inviteMutation.isPending}
                className="flex-1 bg-black text-white hover:bg-gray-800"
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search your network..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              data-testid="input-search-network"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
            data-testid="select-filter-type"
          >
            {specialties.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All Types" : s}</option>
            ))}
          </select>
        </div>

        {/* Empty State */}
        {!isLoading && contacts.length === 0 && (
          <div className="bg-cream p-8 rounded-lg text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <h3 className="font-header text-lg mb-2">Start Building Your Network</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Invite wedding planners, photographers, and other vendors you love working with. 
              Your Secretary will learn your preferences and help connect you with the right people.
            </p>
            <Button
              onClick={() => setShowInviteForm(true)}
              className="bg-black text-white hover:bg-gray-800"
              data-testid="button-invite-first"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Your First Contact
            </Button>
          </div>
        )}

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="mb-6">
            <h2 className="font-header text-sm uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#E8B4B8]" fill="#E8B4B8" />
              Favorites
            </h2>
            <div className="space-y-3">
              {favorites.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          </div>
        )}

        {/* All Contacts */}
        {others.length > 0 && (
          <div>
            <h2 className="font-header text-sm uppercase tracking-wider text-gray-500 mb-3">
              {favorites.length > 0 ? "All Contacts" : "Your Network"}
            </h2>
            <div className="space-y-3">
              {others.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && contacts.length > 0 && filteredContacts.length === 0 && (
          <div className="bg-cream p-6 rounded-lg text-center">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">No contacts match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: NetworkContact }) {
  return (
    <div 
      className="bg-cream p-4 rounded-lg border border-black/10 hover:shadow-md transition-shadow"
      data-testid={`contact-${contact.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#A7C7E7]/30 flex items-center justify-center flex-shrink-0">
          {contact.profileImageUrl ? (
            <img src={contact.profileImageUrl} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <span className="font-header text-lg text-[#262329]">{contact.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-header text-base ink-main truncate">{contact.name}</h3>
            {contact.isFavorite && (
              <Heart className="w-4 h-4 text-[#E8B4B8] flex-shrink-0" fill="#E8B4B8" />
            )}
            {contact.isOnPlatform && (
              <span className="text-xs bg-[#3D5A3B]/10 text-[#3D5A3B] px-2 py-0.5 rounded-full flex-shrink-0">
                Member
              </span>
            )}
          </div>
          {contact.businessName && (
            <p className="text-sm text-gray-600 truncate">{contact.businessName}</p>
          )}
          <p className="text-xs text-[#C9A961] mb-2">{contact.specialty}</p>
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {contact.timesWorkedTogether > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                Worked together {contact.timesWorkedTogether}x
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {contact.email && (
            <a 
              href={`mailto:${contact.email}`}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4 text-gray-500" />
            </a>
          )}
          {contact.instagram && (
            <a 
              href={`https://instagram.com/${contact.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              title="Instagram"
            >
              <Instagram className="w-4 h-4 text-gray-500" />
            </a>
          )}
        </div>
      </div>
      {contact.notes && (
        <p className="mt-2 text-xs text-gray-500 italic pl-16">"{contact.notes}"</p>
      )}
    </div>
  );
}
