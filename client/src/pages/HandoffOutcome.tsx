import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Outcome =
  | "clean"
  | "paid_as_agreed_but_scope_off"
  | "paid_late_or_partial"
  | "scope_and_payment_both_off"
  | "cancellation_no_fault";

const OUTCOME_OPTIONS: { value: Outcome; label: string; help: string }[] = [
  { value: "clean", label: "Clean", help: "Went as described. Paid as agreed." },
  { value: "paid_as_agreed_but_scope_off", label: "Paid fine, scope was off", help: "Money was right, but the services or count weren't what I was told." },
  { value: "paid_late_or_partial", label: "Paid late or partial", help: "The work was fine, but the payment broke the agreement." },
  { value: "scope_and_payment_both_off", label: "Both off", help: "Scope and payment were both not as described." },
  { value: "cancellation_no_fault", label: "Cancelled, no fault", help: "Client cancelled. Originator had secured payment. Everyone protected." },
];

export default function HandoffOutcome() {
  const { id } = useParams<{ id: string }>();
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [wantsToShareAdvice, setWantsToShareAdvice] = useState(false);
  const [adviceDraft, setAdviceDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery<{ handoff: any; gaps: string[]; acceptAtOwnRisk: boolean }>({
    queryKey: [`/api/handoffs/${id}`],
  });

  const submitOutcome = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/handoffs/${id}/helper-outcome`, {
        method: "POST",
        body: JSON.stringify({
          outcome,
          helperPaidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
          paymentNote: paymentNote || undefined,
          privateNote: privateNote || undefined,
          wantsToShareAdvice,
          adviceDraft: wantsToShareAdvice ? adviceDraft : undefined,
        }),
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: [`/api/handoffs/${id}`] });
    },
  });

  if (isLoading) {
    return <div className="estate-container py-16"><p className="text-faint-ink">Loading.</p></div>;
  }

  if (submitted) {
    return (
      <main className="estate-container py-16" data-testid="page-handoff-outcome-thanks">
        <article className="estate-prose">
          <h1 className="font-serif text-3xl tracking-tight text-ink">Recorded. Thank you.</h1>
          <p className="text-muted-ink mt-4">
            Your private notes stay with you. {wantsToShareAdvice
              ? "Your coaching note is now offered to the originator. They'll only see it if they ask to."
              : "Nothing was sent to the originator."}
          </p>
          <p className="text-faint-ink mt-6 text-sm">
            This is how the network protects itself. Quietly, with consent.
          </p>
        </article>
      </main>
    );
  }

  const gaps = data?.gaps || [];

  return (
    <main className="estate-container py-16" data-testid="page-handoff-outcome">
      <article className="estate-prose">
        <p className="text-xs uppercase tracking-widest text-faint-ink">Handoff outcome</p>
        <h1 className="font-serif text-3xl tracking-tight text-ink mt-2">
          How did this go?
        </h1>
        <p className="text-muted-ink mt-4">
          The originator never sees your private note. They never see who said what.
          The only thing they can see — and only if they ask — is the coaching note you choose to share.
        </p>

        {gaps.length > 0 && (
          <div className="border border-hairline bg-surface-2 p-4 mt-6 text-sm" data-testid="banner-gaps">
            <p className="text-ink font-medium">What the originator didn't attest:</p>
            <ul className="list-disc pl-5 mt-2 text-muted-ink">
              {gaps.includes("payment_not_secured") && <li>Payment was not yet secured at handoff.</li>}
              {gaps.includes("no_contract_attached") && <li>No contract was attached.</li>}
              {gaps.includes("scope_not_documented") && <li>Full scope was not documented.</li>}
            </ul>
          </div>
        )}

        <section className="mt-8 space-y-3">
          <p className="text-ink font-medium">Outcome</p>
          {OUTCOME_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`block border p-3 cursor-pointer ${outcome === opt.value ? "border-ink" : "border-hairline hover:bg-surface"}`}
              data-testid={`option-outcome-${opt.value}`}
            >
              <input
                type="radio"
                name="outcome"
                value={opt.value}
                checked={outcome === opt.value}
                onChange={() => setOutcome(opt.value)}
                className="mr-2"
              />
              <span className="text-ink">{opt.label}</span>
              <p className="text-sm text-faint-ink mt-1 ml-5">{opt.help}</p>
            </label>
          ))}
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <label className="block text-ink font-medium mb-1">When were you paid?</label>
            <input
              type="date"
              value={paidAt}
              onChange={e => setPaidAt(e.target.value)}
              className="border border-hairline bg-bg px-3 py-2 w-full"
              data-testid="input-paid-at"
            />
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">Payment note <span className="text-faint-ink font-normal">(optional)</span></label>
            <textarea
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              rows={2}
              placeholder='e.g. "Paid in two installments, week after the wedding."'
              className="border border-hairline bg-bg px-3 py-2 w-full"
              data-testid="input-payment-note"
            />
          </div>

          <div>
            <label className="block text-ink font-medium mb-1">Private note to yourself <span className="text-faint-ink font-normal">(never shared)</span></label>
            <textarea
              value={privateNote}
              onChange={e => setPrivateNote(e.target.value)}
              rows={3}
              placeholder="Your gut. For your eyes only."
              className="border border-hairline bg-bg px-3 py-2 w-full"
              data-testid="input-private-note"
            />
          </div>
        </section>

        <section className="mt-8 border-t border-hairline pt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wantsToShareAdvice}
              onChange={e => setWantsToShareAdvice(e.target.checked)}
              className="mt-1"
              data-testid="checkbox-share-advice"
            />
            <span>
              <span className="text-ink font-medium">Offer coaching to the originator.</span>
              <span className="block text-sm text-faint-ink mt-1">
                They will be asked: "Want some feedback that could improve future bookings?"
                If they say no, your note stays here.
              </span>
            </span>
          </label>

          {wantsToShareAdvice && (
            <textarea
              value={adviceDraft}
              onChange={e => setAdviceDraft(e.target.value)}
              rows={4}
              placeholder='e.g. "Just for next time — securing payment 2 weeks out really protects everyone if anything shifts. Happy to help again when timing allows."'
              className="border border-hairline bg-bg px-3 py-2 w-full mt-3"
              data-testid="input-advice-draft"
            />
          )}
        </section>

        <div className="mt-10">
          <button
            disabled={!outcome || submitOutcome.isPending}
            onClick={() => submitOutcome.mutate()}
            className="bg-ink text-bg px-6 py-3 disabled:opacity-40"
            data-testid="button-submit-outcome"
          >
            {submitOutcome.isPending ? "Recording..." : "Record outcome"}
          </button>
          {submitOutcome.error && (
            <p className="text-oxblood text-sm mt-3">{(submitOutcome.error as Error).message}</p>
          )}
        </div>
      </article>
    </main>
  );
}
