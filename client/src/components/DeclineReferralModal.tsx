import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, UserPlus, AlertCircle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NetworkContact {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  specialty: string;
  profileImageUrl?: string;
  isOnPlatform: boolean;
  _fitScore: number;
  acceptedUserId?: string;
}

interface Inquiry {
  id: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventType?: string;
  serviceType: string;
}

interface DeclineReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry: Inquiry | null;
  onSuccess: () => void;
}

const DECLINE_REASONS = [
  { value: "fully_booked", label: "Fully booked on this date" },
  { value: "not_specialty", label: "Not my specialty" },
  { value: "location_far", label: "Location too far" },
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "other", label: "Other reason" },
];

export default function DeclineReferralModal({
  open,
  onOpenChange,
  inquiry,
  onSuccess,
}: DeclineReferralModalProps) {
  const { toast } = useToast();
  const [declineReason, setDeclineReason] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [notifyClient, setNotifyClient] = useState(true);
  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNetworkContacts();
      setDeclineReason("");
      setReferralMessage("");
      setSelectedVendors([]);
      setNotifyClient(true);
      setShowPreview(false);
    }
  }, [open]);

  const fetchNetworkContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artist-network", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const onPlatformContacts = data
          .filter((c: NetworkContact) => c.isOnPlatform)
          .sort((a: NetworkContact, b: NetworkContact) => b._fitScore - a._fitScore)
          .slice(0, 10);
        setNetworkContacts(onPlatformContacts);
      }
    } catch (err) {
      console.error("Failed to fetch network:", err);
    }
    setLoading(false);
  };

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendors((prev) => {
      if (prev.includes(vendorId)) {
        return prev.filter((id) => id !== vendorId);
      }
      if (prev.length >= 3) {
        toast({
          title: "Maximum 3 referrals",
          description: "You can only refer to up to 3 vendors at a time.",
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, vendorId];
    });
  };

  const getReasonLabel = (value: string) => {
    return DECLINE_REASONS.find((r) => r.value === value)?.label || value;
  };

  const generatePreviewMessage = () => {
    if (!inquiry) return "";
    const reasonText = getReasonLabel(declineReason);
    const vendorNames = selectedVendors
      .map((id) => {
        const v = networkContacts.find((c) => c.id === id || c.acceptedUserId === id);
        return v?.businessName || v?.name || "vendor";
      })
      .join(", ");

    return `Hi ${inquiry.clientName},

Thank you for reaching out about your ${inquiry.eventType || "event"} on ${new Date(inquiry.eventDate).toLocaleDateString()}.

Unfortunately, I'm unable to take on this booking at this time: ${reasonText}.

${selectedVendors.length > 0 ? `I've referred your inquiry to ${vendorNames}. They're talented colleagues who may be able to help with your ${inquiry.serviceType} needs.` : ""}

${referralMessage ? `\nNote: ${referralMessage}` : ""}

Best wishes for your special day!`;
  };

  const handleSubmit = async () => {
    if (!inquiry) return;
    if (!declineReason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for declining.",
        variant: "destructive",
      });
      return;
    }
    if (selectedVendors.length === 0) {
      toast({
        title: "Referrals required",
        description: "Please select at least one vendor to refer the client to.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const vendorIds = selectedVendors.map((id) => {
        const contact = networkContacts.find((c) => c.id === id);
        return contact?.acceptedUserId || id;
      });

      const res = await fetch(`/api/inquiries/${inquiry.id}/decline-with-referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          declineReason: getReasonLabel(declineReason),
          referralMessage: referralMessage || undefined,
          referralVendorIds: vendorIds,
          notifyClient,
        }),
      });

      if (res.ok) {
        toast({
          title: "Inquiry Declined with Referrals",
          description: `Referred to ${selectedVendors.length} vendor(s). ${notifyClient ? "Client has been notified." : ""}`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to decline with referrals",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const topReferrals = networkContacts.slice(0, 3);
  const otherContacts = networkContacts.slice(3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="modal-decline-referral">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#5A1F2B]" />
            Decline & Refer
          </DialogTitle>
          <DialogDescription>
            Pass this inquiry to trusted colleagues in your network.
          </DialogDescription>
        </DialogHeader>

        {inquiry && (
          <div className="space-y-4">
            <div className="bg-[#FAF8F5] rounded-lg p-3 border border-[#5A1F2B]/20">
              <p className="text-sm font-medium">{inquiry.clientName}</p>
              <p className="text-xs text-gray-600">
                {inquiry.serviceType} • {new Date(inquiry.eventDate).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decline-reason">Reason for declining</Label>
              <Select value={declineReason} onValueChange={setDeclineReason}>
                <SelectTrigger id="decline-reason" data-testid="select-decline-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recommend colleagues (select up to 3)</Label>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5A1F2B]" />
                </div>
              ) : networkContacts.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <p>No network contacts available.</p>
                  <p className="text-xs mt-1">Invite colleagues to your network first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topReferrals.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-[#5A1F2B] font-medium flex items-center gap-1">
                        <Star className="h-3 w-3" /> Top recommendations
                      </p>
                      {topReferrals.map((contact) => (
                        <VendorCard
                          key={contact.id}
                          contact={contact}
                          selected={selectedVendors.includes(contact.id)}
                          onToggle={() => handleVendorToggle(contact.id)}
                          isTop
                        />
                      ))}
                    </div>
                  )}
                  {otherContacts.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <p className="text-xs text-gray-500">Other contacts</p>
                      {otherContacts.map((contact) => (
                        <VendorCard
                          key={contact.id}
                          contact={contact}
                          selected={selectedVendors.includes(contact.id)}
                          onToggle={() => handleVendorToggle(contact.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral-message">Personal note (optional)</Label>
              <Textarea
                id="referral-message"
                data-testid="input-referral-message"
                placeholder="Add a personal note about the client or event..."
                value={referralMessage}
                onChange={(e) => setReferralMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-client"
                data-testid="checkbox-notify-client"
                checked={notifyClient}
                onCheckedChange={(checked) => setNotifyClient(checked as boolean)}
              />
              <Label htmlFor="notify-client" className="text-sm">
                Notify client about the referral
              </Label>
            </div>

            {showPreview ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message Preview</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    Hide
                  </Button>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap border">
                  {generatePreviewMessage()}
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={!declineReason || selectedVendors.length === 0}
                data-testid="button-preview-message"
              >
                Preview client message
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !declineReason || selectedVendors.length === 0}
            className="bg-[#5A1F2B] hover:bg-[#7A3F4B]"
            data-testid="button-submit-decline-referral"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Decline & Refer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VendorCard({
  contact,
  selected,
  onToggle,
  isTop,
}: {
  contact: NetworkContact;
  selected: boolean;
  onToggle: () => void;
  isTop?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? "bg-[#5A1F2B]/10 border-[#5A1F2B]"
          : "bg-white border-gray-200 hover:border-[#5A1F2B]/50"
      } ${isTop ? "ring-1 ring-[#5A1F2B]/20" : ""}`}
      onClick={onToggle}
      data-testid={`vendor-card-${contact.id}`}
    >
      <Checkbox checked={selected} className="pointer-events-none" />
      <Avatar className="h-8 w-8">
        <AvatarImage src={contact.profileImageUrl} />
        <AvatarFallback className="bg-[#5A1F2B]/20 text-[#5A1F2B] text-xs">
          {(contact.name || "V")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {contact.businessName || contact.name}
        </p>
        <p className="text-xs text-gray-500 truncate">{contact.specialty}</p>
      </div>
      {isTop && (
        <Badge variant="secondary" className="text-xs bg-[#5A1F2B]/10 text-[#5A1F2B]">
          Top fit
        </Badge>
      )}
    </div>
  );
}
