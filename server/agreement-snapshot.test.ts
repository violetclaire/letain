import assert from "node:assert/strict";
import test from "node:test";
import { buildAgreementSnapshot, agreementMatches } from "./agreementSnapshot";
const inquiry = { id: "wedding", vendorId: "owner", partySize: 1, budget: "1600" };
const contract = { id: "contract", totalAmount: 160000, depositAmount: 80000, serviceItems: [{ service: "hair", qty: 1 }] };
test("expanded booking cannot reuse the $800 agreement; a newly reviewed version matches", () => {
 const original = buildAgreementSnapshot(inquiry, null, [contract]);
 const saved = structuredClone(original);
 const revised = buildAgreementSnapshot({ ...inquiry, partySize: 8, budget: "5500" }, null, [{ ...contract, totalAmount: 550000, serviceItems: [{ service: "hair", qty: 8 }] }]);
 assert.equal(agreementMatches(original, revised), false);
 assert.equal(agreementMatches(revised, revised), true);
 assert.deepEqual(original, saved);
 assert.equal((revised.terms.contracts as any[])[0].depositAmount, 80000);
});
for (const change of [{ depositAmount: 200000 }, { balanceDueDate: "2026-10-01" }, { serviceStartTime: "08:00" }, { packageDetails: "Hair and makeup" }, { artistId: "other" }]) {
 test(`changed ${Object.keys(change)[0]} requires review`, () => {
  assert.equal(agreementMatches(buildAgreementSnapshot(inquiry, null, [contract]), buildAgreementSnapshot(inquiry, null, [{ ...contract, ...change }])), false);
 });
}
test("JSON key order and operational timestamps do not manufacture a revision", () => {
 assert.equal(agreementMatches(buildAgreementSnapshot(inquiry, null, [contract]), buildAgreementSnapshot({ budget: "1600", partySize: 1, vendorId: "owner", id: "wedding", updatedAt: new Date() }, null, [{ ...contract, updatedAt: new Date() }])), true);
});
test("missing snapshot and forged terms do not pass", () => {
 const current = buildAgreementSnapshot(inquiry);
 assert.equal(agreementMatches(null, current), false);
 assert.equal(agreementMatches({ ...current, terms: {} }, current), false);
});
