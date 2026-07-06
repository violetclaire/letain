import { useState } from "react";
import { X, Send, Mail, FileText, Calendar, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { enableInvoicesUi } from "@/lib/demoFeatureFlags";

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: { name: string; email: string; role?: string }[];
  preSelectedEmail?: string;
  preSelectedTemplate?: 'general' | 'invoice' | 'schedule' | 'confirmation';
}

const EMAIL_TEMPLATES = {
  general: {
    label: "General Message",
    icon: Mail,
    subject: "",
    body: "",
  },
  invoice: {
    label: "Send Invoice",
    icon: FileText,
    subject: "Invoice for Your Upcoming Appointment",
    body: `Hi there,

Please find attached the invoice for your upcoming beauty services. You can review the details and complete payment through the secure link provided.

If you have any questions, feel free to reply to this email.

Looking forward to seeing you!`,
  },
  schedule: {
    label: "Share Schedule",
    icon: Calendar,
    subject: "Your Day-of Schedule",
    body: `Hi there,

Your day-of beauty schedule is ready! Click the link below to view all appointment times, team assignments, and important details.

Please review and let me know if you have any questions or need any changes.

See you soon!`,
  },
  confirmation: {
    label: "Booking Confirmation",
    icon: User,
    subject: "Booking Confirmation",
    body: `Hi there,

This is to confirm your booking for beauty services. I'm excited to work with you!

Please let me know if you need any changes or have questions.

Best regards,`,
  },
};

export default function ComposeEmailModal({
  isOpen,
  onClose,
  contacts = [],
  preSelectedEmail = "",
  preSelectedTemplate = "general",
}: ComposeEmailModalProps) {
  const { toast } = useToast();
  const initialTemplate = !enableInvoicesUi && preSelectedTemplate === "invoice" ? "general" : preSelectedTemplate;
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EMAIL_TEMPLATES>(initialTemplate);
  const [toEmail, setToEmail] = useState(preSelectedEmail);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[initialTemplate].subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES[initialTemplate].body);
  const [sending, setSending] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const visibleTemplateKeys = (Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>).filter(
    (key) => enableInvoicesUi || key !== "invoice",
  );

  if (!isOpen) return null;

  const handleTemplateChange = (template: keyof typeof EMAIL_TEMPLATES) => {
    setSelectedTemplate(template);
    setSubject(EMAIL_TEMPLATES[template].subject);
    setBody(EMAIL_TEMPLATES[template].body);
  };

  const handleSelectContact = (email: string) => {
    setToEmail(email);
    setShowContacts(false);
  };

  const handleSend = async () => {
    if (!toEmail.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Missing Subject",
        description: "Please enter a subject line",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/emails/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to: toEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          templateType: selectedTemplate,
        }),
      });

      if (res.ok) {
        toast({
          title: "Email Sent",
          description: `Your email has been sent to ${toEmail}`,
        });
        onClose();
        setToEmail("");
        setSubject("");
        setBody("");
      } else {
        const error = await res.json();
        toast({
          title: "Send Failed",
          description: error.error || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send email",
        variant: "destructive",
      });
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b bg-[#6B4A55] text-white rounded-t-xl">
          <h2 className="font-medium flex items-center gap-2">
            <Mail size={18} />
            Compose Email
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded" data-testid="button-close-compose">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {visibleTemplateKeys.map((key) => {
              const template = EMAIL_TEMPLATES[key];
              const Icon = template.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleTemplateChange(key)}
                  className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 transition-colors ${
                    selectedTemplate === key
                      ? "bg-[#6B4A55] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  data-testid={`button-template-${key}`}
                >
                  <Icon size={12} />
                  {template.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <div className="flex gap-2">
              <Input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1"
                data-testid="input-email-to"
              />
              {contacts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContacts(!showContacts)}
                  className="text-xs"
                  data-testid="button-show-contacts"
                >
                  Contacts
                </Button>
              )}
            </div>
            {showContacts && contacts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {contacts.map((contact, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectContact(contact.email)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                    data-testid={`contact-option-${idx}`}
                  >
                    <span>{contact.name}</span>
                    <span className="text-xs text-gray-400">{contact.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              data-testid="input-email-subject"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className="resize-none"
              data-testid="input-email-body"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-email">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !toEmail.trim()}
              className="flex-1 bg-[#6B4A55] hover:bg-[#8a6270]"
              data-testid="button-send-email"
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} className="mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
