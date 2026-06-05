import { useState, useEffect } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ContractRecord {
  id: string;
  clientName?: string | null;
  clientContact?: string | null;
  eventDates?: string | null;
  eventLocation?: string | null;
  packageDetails?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  remainingAmount?: number | null;
  depositPaidAt?: string | null;
  contractUrl?: string | null;
  contractSource?: string | null;
  contractNotes?: string | null;
  fileUrl?: string | null;
  bookingId?: string | null;
  inquiryId?: string | null;
  serviceItems?: Array<{ clientType: string; qty: number; service: string; price: number; total: number }> | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  amountPaid?: number | null;
  paymentDueDate?: string | null;
  paymentLink?: string | null;
  paymentNotes?: string | null;
}

interface LinkedInquiry {
  id: string;
  threadToken?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  partySize?: number | null;
  status?: string | null;
}

interface LinkedBooking {
  id: string;
  eventDate?: string | null;
  location?: string | null;
  serviceType?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
}

interface VaultResponse {
  contract: ContractRecord;
  linked: { inquiry: LinkedInquiry | null; booking: LinkedBooking | null };
}

// Only non-flow statuses are editable here. Flow states (sent/signed/completed)
// are set by the real send/signing flows, never from the Vault.
const EDITABLE_STATUSES = ["draft", "cancelled"];

// Payment tracking is business state only. No money is processed on this page.
const PAYMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "payment_not_requested", label: "Not requested yet" },
  { value: "payment_requested", label: "Payment requested" },
  { value: "deposit_due", label: "Deposit due" },
  { value: "deposit_paid", label: "Deposit paid" },
  { value: "balance_due", label: "Balance due" },
  { value: "balance_paid", label: "Balance paid" },
  { value: "overdue", label: "Overdue" },
  { value: "manually_confirmed_paid", label: "Manually confirmed paid" },
];
const PAYMENT_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "square", label: "Square" },
  { value: "zelle", label: "Zelle" },
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
  { value: "stripe", label: "Stripe" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "other", label: "Other" },
];
const paymentStatusLabel = (v?: string | null) =>
  PAYMENT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? null;
const paymentMethodLabel = (v?: string | null) =>
  PAYMENT_METHOD_OPTIONS.find((o) => o.value === v)?.label ?? null;

function money(cents?: number | null): string | null {
  if (cents === null || cents === undefined) return null;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Convert a dollar string from an input into integer cents (or null when blank).
function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/[$,]/g, ""));
  if (!isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
function centsToDollarString(cents?: number | null): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toString();
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Field({ label, value, testId }: { label: string; value?: string | null; testId: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="text-ink mt-0.5" data-testid={testId}>
        {value && value.trim() ? value : <span className="text-ink/40">Not set</span>}
      </div>
    </div>
  );
}

export default function ContractDetail() {
  const [, params] = useRoute("/admin/:slug/contracts/:contractId");
  const slug = params?.slug ?? "";
  const contractId = params?.contractId ?? "";
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ContractRecord>>({});
  // Amount inputs are kept as dollar strings while editing, converted to cents on save.
  const [amountForm, setAmountForm] = useState<{ depositAmount: string; remainingAmount: string; amountPaid: string }>({
    depositAmount: "",
    remainingAmount: "",
    amountPaid: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = `/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/contracts/${contractId}`)}`;
    }
  }, [authLoading, isAuthenticated, slug, contractId]);

  const vaultQuery = useQuery<VaultResponse>({
    queryKey: ["/api/vault/contracts", contractId],
    queryFn: async () => {
      const res = await fetch(`/api/vault/contracts/${contractId}`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (res.status === 403) throw new Error("403");
      if (res.status === 404) throw new Error("404");
      if (!res.ok) throw new Error("Failed to load contract");
      return res.json();
    },
    enabled: !!contractId && isAuthenticated,
    retry: false,
  });

  const contract = vaultQuery.data?.contract;

  const startEdit = () => {
    if (!contract) return;
    setForm({
      clientName: contract.clientName ?? "",
      clientContact: contract.clientContact ?? "",
      eventDates: contract.eventDates ?? "",
      eventLocation: contract.eventLocation ?? "",
      packageDetails: contract.packageDetails ?? "",
      status: contract.status ?? "draft",
      contractUrl: contract.contractUrl ?? "",
      contractSource: contract.contractSource ?? "",
      contractNotes: contract.contractNotes ?? "",
      paymentStatus: contract.paymentStatus ?? "payment_not_requested",
      paymentMethod: contract.paymentMethod ?? "",
      paymentDueDate: contract.paymentDueDate ?? "",
      paymentLink: contract.paymentLink ?? "",
      paymentNotes: contract.paymentNotes ?? "",
    });
    setAmountForm({
      depositAmount: centsToDollarString(contract.depositAmount),
      remainingAmount: centsToDollarString(contract.remainingAmount),
      amountPaid: centsToDollarString(contract.amountPaid),
    });
    setEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<ContractRecord>) => {
      const res = await fetch(`/api/vault/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/contracts", contractId] });
      setEditing(false);
      toast({ title: "Contract updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="flex items-center gap-2 text-ink/60" data-testid="status-auth-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </div>
    );
  }

  const errMsg = (vaultQuery.error as Error)?.message;
  if (errMsg === "403" || errMsg === "404") {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-not-available">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Contract not available</h1>
          <p className="text-ink/70 mb-6">
            This contract does not exist or is not one of yours.
          </p>
          <Link href={`/admin/${slug}/rolodex${authParam}`} className="underline text-ink" data-testid="link-back-rolodex">
            Back to Rolodex
          </Link>
        </div>
      </div>
    );
  }

  const linked = vaultQuery.data?.linked;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10">
        <Link
          href={`/admin/${slug}/rolodex${authParam}`}
          className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
          data-testid="link-back-rolodex"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rolodex
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
              Contract
            </h1>
            <p className="text-ink/70 max-w-[70ch]">
              Review and update the details stored for this contract. Editing here
              only changes the saved record. It never sends anything or starts a
              signing flow.
            </p>
          </div>
          {contract && !editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-2 text-sm border border-hairline px-3 py-2 hover:bg-surface shrink-0"
              data-testid="button-edit"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </header>

        {vaultQuery.isLoading && (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </div>
        )}

        {contract && !editing && (
          <div className="space-y-10">
            <section className="border border-hairline bg-surface p-6 sm:p-8" data-testid="section-overview">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Client name" value={contract.clientName} testId="text-client-name" />
                <Field label="Client contact" value={contract.clientContact} testId="text-client-contact" />
                <Field label="Event / contract date" value={contract.eventDates} testId="text-event-dates" />
                <Field label="Location / venue" value={contract.eventLocation} testId="text-event-location" />
                <Field label="Package / services" value={contract.packageDetails} testId="text-package" />
                <Field label="Status" value={contract.status} testId="text-status" />
                <Field label="Contract source" value={contract.contractSource} testId="text-source" />
                <Field
                  label="Party size"
                  value={linked?.inquiry?.partySize != null ? String(linked.inquiry.partySize) : null}
                  testId="text-party-size"
                />
              </div>
            </section>

            <section data-testid="section-financials">
              <h2 className="font-serif text-xl tracking-tight mb-3">Amounts &amp; payment</h2>
              <div className="border border-hairline bg-surface p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Total" value={money(contract.totalAmount)} testId="text-total" />
                <Field label="Deposit" value={money(contract.depositAmount)} testId="text-deposit" />
                <Field label="Balance" value={money(contract.remainingAmount)} testId="text-balance" />
                <Field label="Amount paid" value={money(contract.amountPaid)} testId="text-amount-paid" />
                <Field label="Payment status" value={paymentStatusLabel(contract.paymentStatus)} testId="text-payment-status" />
                <Field label="Payment method" value={paymentMethodLabel(contract.paymentMethod)} testId="text-payment-method" />
                <Field label="Payment due" value={contract.paymentDueDate} testId="text-payment-due" />
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink/50">Payment link / instructions</div>
                  <div className="text-ink mt-0.5" data-testid="text-payment-link">
                    {contract.paymentLink && contract.paymentLink.trim() ? (
                      /^https?:\/\//i.test(contract.paymentLink.trim()) ? (
                        <a href={contract.paymentLink} target="_blank" rel="noopener noreferrer" className="underline text-ink break-all">
                          {contract.paymentLink}
                        </a>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{contract.paymentLink}</span>
                      )
                    ) : (
                      <span className="text-ink/40">Not set</span>
                    )}
                  </div>
                </div>
              </div>
              {contract.paymentNotes && contract.paymentNotes.trim() && (
                <div className="border border-hairline bg-surface p-6 mt-4 text-sm whitespace-pre-wrap" data-testid="text-payment-notes">
                  <div className="text-xs uppercase tracking-wide text-ink/50 mb-1">Payment notes</div>
                  {contract.paymentNotes}
                </div>
              )}
              <p className="text-xs text-ink/50 mt-2">
                This is business tracking only. Briarwood does not process payments, send invoices,
                or charge cards. Paste an external payment link or instructions if you use one.
              </p>
            </section>

            {contract.serviceItems && contract.serviceItems.length > 0 && (
              <section data-testid="section-services">
                <h2 className="font-serif text-xl tracking-tight mb-3">Services included</h2>
                <div className="border border-hairline bg-surface divide-y divide-hairline">
                  {contract.serviceItems.map((item, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 text-sm" data-testid={`row-service-${i}`}>
                      <span>
                        {item.qty} x {item.service}
                        {item.clientType ? ` (${item.clientType})` : ""}
                      </span>
                      <span className="text-ink/70">{money(item.total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section data-testid="section-links">
              <h2 className="font-serif text-xl tracking-tight mb-3">Linked records &amp; files</h2>
              <div className="border border-hairline bg-surface p-6 space-y-3 text-sm">
                <div>
                  <span className="text-ink/60">Linked inquiry: </span>
                  {linked?.inquiry?.threadToken ? (
                    <Link href={`/inquiry/${linked.inquiry.threadToken}`} className="underline text-ink" data-testid="link-inquiry">
                      {linked.inquiry.clientName || "Open inquiry"}
                    </Link>
                  ) : (
                    <span className="text-ink/40">None</span>
                  )}
                </div>
                <div>
                  <span className="text-ink/60">Linked booking: </span>
                  {linked?.booking ? (
                    <span data-testid="text-linked-booking">
                      {linked.booking.serviceType || "Booking"} - {formatDate(linked.booking.eventDate) || "date not set"}
                      {linked.booking.status ? ` (${linked.booking.status})` : ""}
                    </span>
                  ) : (
                    <span className="text-ink/40">None</span>
                  )}
                </div>
                <div>
                  <span className="text-ink/60">Contract link / PDF: </span>
                  {contract.contractUrl ? (
                    <a href={contract.contractUrl} target="_blank" rel="noopener noreferrer" className="underline text-ink break-all" data-testid="link-contract-url">
                      {contract.contractUrl}
                    </a>
                  ) : contract.fileUrl ? (
                    <a href={contract.fileUrl} target="_blank" rel="noopener noreferrer" className="underline text-ink break-all" data-testid="link-file-url">
                      {contract.fileUrl}
                    </a>
                  ) : (
                    <span className="text-ink/40">None</span>
                  )}
                </div>
              </div>
            </section>

            <section data-testid="section-notes">
              <h2 className="font-serif text-xl tracking-tight mb-3">Notes</h2>
              <div className="border border-hairline bg-surface p-6 text-sm whitespace-pre-wrap" data-testid="text-notes">
                {contract.contractNotes && contract.contractNotes.trim()
                  ? contract.contractNotes
                  : <span className="text-ink/40">No notes yet.</span>}
              </div>
            </section>
          </div>
        )}

        {contract && editing && (
          <form
            className="space-y-5 max-w-[70ch]"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                ...form,
                depositAmount: dollarsToCents(amountForm.depositAmount),
                remainingAmount: dollarsToCents(amountForm.remainingAmount),
                amountPaid: dollarsToCents(amountForm.amountPaid),
              });
            }}
            data-testid="form-edit"
          >
            <EditText label="Client name" value={form.clientName ?? ""} onChange={(v) => setForm({ ...form, clientName: v })} testId="input-client-name" />
            <EditText label="Client contact (email / phone)" value={form.clientContact ?? ""} onChange={(v) => setForm({ ...form, clientContact: v })} testId="input-client-contact" />
            <EditText label="Event / contract date" value={form.eventDates ?? ""} onChange={(v) => setForm({ ...form, eventDates: v })} testId="input-event-dates" />
            <EditText label="Location / venue" value={form.eventLocation ?? ""} onChange={(v) => setForm({ ...form, eventLocation: v })} testId="input-event-location" />
            <EditTextarea label="Package / services included" value={form.packageDetails ?? ""} onChange={(v) => setForm({ ...form, packageDetails: v })} testId="input-package" />

            <div>
              <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">Status</label>
              {form.status && !EDITABLE_STATUSES.includes(form.status) ? (
                <div className="text-sm text-ink/70" data-testid="text-status-locked">
                  Locked at <strong>{form.status}</strong>. This status is managed by the
                  send and signing steps and cannot be changed here.
                </div>
              ) : (
                <select
                  value={form.status ?? "draft"}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:ring-1 focus-visible:ring-oxblood/70 outline-none"
                  data-testid="select-status"
                >
                  {EDITABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            <EditText label="Contract link / PDF URL" value={form.contractUrl ?? ""} onChange={(v) => setForm({ ...form, contractUrl: v })} testId="input-contract-url" placeholder="Paste a link to the contract or PDF" />
            <EditText label="Contract source" value={form.contractSource ?? ""} onChange={(v) => setForm({ ...form, contractSource: v })} testId="input-contract-source" placeholder="e.g. uploaded, external, Dubsado" />
            <EditTextarea label="Notes" value={form.contractNotes ?? ""} onChange={(v) => setForm({ ...form, contractNotes: v })} testId="input-contract-notes" />

            <div className="border-t border-hairline pt-5 mt-1">
              <h2 className="font-serif text-lg tracking-tight mb-1">Payment tracking</h2>
              <p className="text-xs text-ink/50 mb-4 max-w-[60ch]">
                Tracking only. This never charges a card, sends an invoice, or moves money.
                Paste an external payment link or instructions if you use one.
              </p>
              <div className="space-y-5">
                <EditSelect
                  label="Payment status"
                  value={form.paymentStatus ?? "payment_not_requested"}
                  onChange={(v) => setForm({ ...form, paymentStatus: v })}
                  options={PAYMENT_STATUS_OPTIONS}
                  testId="select-payment-status"
                />
                <EditSelect
                  label="Payment method"
                  value={form.paymentMethod ?? ""}
                  onChange={(v) => setForm({ ...form, paymentMethod: v })}
                  options={[{ value: "", label: "Not set" }, ...PAYMENT_METHOD_OPTIONS]}
                  testId="select-payment-method"
                />
                <EditText label="Deposit amount ($)" value={amountForm.depositAmount} onChange={(v) => setAmountForm({ ...amountForm, depositAmount: v })} testId="input-deposit-amount" placeholder="e.g. 250" />
                <EditText label="Balance amount ($)" value={amountForm.remainingAmount} onChange={(v) => setAmountForm({ ...amountForm, remainingAmount: v })} testId="input-balance-amount" placeholder="e.g. 750" />
                <EditText label="Amount paid ($)" value={amountForm.amountPaid} onChange={(v) => setAmountForm({ ...amountForm, amountPaid: v })} testId="input-amount-paid" placeholder="e.g. 250" />
                <EditText label="Payment due date" value={form.paymentDueDate ?? ""} onChange={(v) => setForm({ ...form, paymentDueDate: v })} testId="input-payment-due-date" placeholder="e.g. 30 days before event" />
                <EditText label="Payment link / instructions" value={form.paymentLink ?? ""} onChange={(v) => setForm({ ...form, paymentLink: v })} testId="input-payment-link" placeholder="Paste a Square/PayPal link or Venmo/Zelle instructions" />
                <EditTextarea label="Payment notes" value={form.paymentNotes ?? ""} onChange={(v) => setForm({ ...form, paymentNotes: v })} testId="input-payment-notes" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 text-sm bg-ink text-bg px-4 py-2 disabled:opacity-60"
                data-testid="button-save"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-2 text-sm border border-hairline px-4 py-2 hover:bg-surface"
                data-testid="button-cancel"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function EditText({
  label, value, onChange, testId, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; testId: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:ring-1 focus-visible:ring-oxblood/70 outline-none placeholder:text-ink/40"
        data-testid={testId}
      />
    </div>
  );
}

function EditSelect({
  label, value, onChange, options, testId,
}: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; testId: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:ring-1 focus-visible:ring-oxblood/70 outline-none"
        data-testid={testId}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function EditTextarea({
  label, value, onChange, testId,
}: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:ring-1 focus-visible:ring-oxblood/70 outline-none"
        data-testid={testId}
      />
    </div>
  );
}
