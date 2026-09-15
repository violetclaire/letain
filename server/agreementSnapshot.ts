import { createHash } from "node:crypto";
import type { AgreementSnapshot } from "../shared/agreementSnapshot";
export type { AgreementSnapshot } from "../shared/agreementSnapshot";
const fields = {
 inquiry: ["id", "vendorId", "clientId", "eventDate", "eventType", "eventLocation", "serviceType", "partySize", "budget", "message", "metadata", "bookingId", "convertedToBookingId", "convertedToContractId"],
 booking: ["id", "artistId", "plannerId", "clientId", "clientContactId", "eventDate", "location", "serviceType", "amount", "notes", "inspirationPhotos"],
 contract: ["id", "bookingId", "inquiryId", "artistId", "clientId", "packageDetails", "totalAmount", "depositAmount", "remainingAmount", "serviceItems", "eventDates", "eventLocation", "serviceStartTime", "serviceEndTime", "balanceDueDate", "contractUrl", "fileUrl", "contractNotes", "status", "signedAt"],
} as const;
function canonical(value: unknown): unknown {
 if (value === undefined || value === null) return null;
 if (value instanceof Date) return value.toISOString();
 if (Array.isArray(value)) return value.map(canonical);
 if (typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
 return value;
}
function select(row: Record<string, unknown> | null, keys: readonly string[]) {
 return row === null ? null : Object.fromEntries(keys.map(key => [key, canonical(row[key])]));
}
export function buildAgreementSnapshot(inquiry: Record<string, unknown>, booking: Record<string, unknown> | null = null, contract: Record<string, unknown>[] = []): AgreementSnapshot {
 const terms = canonical({ inquiry: select(inquiry, fields.inquiry), booking: select(booking, fields.booking), contracts: [...contract].sort((a, b) => String(a.id).localeCompare(String(b.id))).map(row => select(row, fields.contract)) }) as Record<string, unknown>;
 return { version: 1, digest: createHash("sha256").update(JSON.stringify(terms)).digest("hex"), terms };
}
export function agreementMatches(reviewed: AgreementSnapshot | null | undefined, current: AgreementSnapshot): boolean {
 return reviewed?.version === 1 && reviewed.digest === current.digest && JSON.stringify(canonical(reviewed.terms)) === JSON.stringify(canonical(current.terms));
}
export class AgreementReviewRequired extends Error {
 constructor() { super("The work changed or has no reviewed snapshot. Record a new linked permission decision before proceeding."); }
}
