---
name: Contract payment tracking is observational only
description: Briarwood tracks contract/payment business state but never processes money; where the boundary lives.
---

Briarwood's Contract Vault tracks payment **business state** only. It must never
process money, call a payment API (Square/Stripe/PayPal), send invoices, emit
events, or touch CDI.

**Why:** Product decision - the operator records "where the client stands"
manually; actual money movement (if ever built) is a separate, deliberate flow.

**How to apply:**
- Payment fields on the `contracts` table are additive metadata: paymentStatus
  (allow-list, default payment_not_requested), paymentMethod (allow-list),
  amountPaid/depositAmount/remainingAmount (integer cents), paymentDueDate,
  paymentLink (external URL/instructions pasted by operator), paymentNotes.
- Edits go ONLY through the operator-scoped Vault PATCH (owner/admin), which
  whitelists fields and validates enums/amounts. Never widen this to write
  signing/signature/openSign fields.
- "Payment link" is a pasted external link/instructions, not a generated invoice.
