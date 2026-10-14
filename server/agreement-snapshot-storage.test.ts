import assert from "node:assert/strict";
import { test, before, afterEach, mock } from "node:test";
import { buildAgreementSnapshot, AgreementReviewRequired } from "./agreementSnapshot";
let storage: any;
let db: any;
before(async () => {
 process.env.DATABASE_URL = "postgres://test:test@localhost/test";
 ({ storage } = await import("./storage"));
 db = (await import("./db")).getDb();
});
afterEach(() => mock.restoreAll());
const inquiry = { id: "i", vendorId: "owner", partySize: 1 };
const contract = { id: "c", inquiryId: "i", totalAmount: 160000, depositAmount: 80000 };
const original = buildAgreementSnapshot(inquiry, null, [contract]);
const data = { operatorId: "owner", inquiryId: "i", permissionDecisionId: "p", choice: "proceed", conditionConfirmations: [] };
function database(rows: any[][]) {
 const writes: any[] = [];
 const locks: string[] = [];
 const tx = {
  select() {
   const result = rows.shift();
   assert.ok(result, "unexpected database read");
   const query: any = { from() { return query; }, where() { return query; }, orderBy() { return query; }, for(mode: string) { locks.push(mode); return Promise.resolve(result); }, then(resolve: any) { return Promise.resolve(result).then(resolve); } };
   return query;
  },
  insert() { return { values(value: any) { writes.push(value); return { returning: async () => [{ ...value, id: "new" }] }; } }; },
 };
 mock.method(db, "transaction", async (callback: any) => callback(tx));
 return { writes, locks };
}
function permission(extra = {}) { return { id: "p", agreementSnapshot: original, decision: "permitted", requiredConditions: [], expiresAt: null, ...extra }; }
test("storage rejects expanded work even if the route previously accepted it", async () => {
 const { writes } = database([[{ ...inquiry, partySize: 8 }], [{ ...contract, totalAmount: 550000 }], [permission()]]);
 await assert.rejects(storage.createHumanActionDecision(data), AgreementReviewRequired);
 assert.deepEqual(writes, []);
});
test("unchanged approved work writes once under the transaction", async () => {
 const { writes, locks } = database([[inquiry], [contract], [permission()], []]);
 await storage.createHumanActionDecision(data);
 assert.equal(writes.length, 1);
 assert.equal(locks.length, 3);
});
test("permission capture derives terms from storage, ignoring a supplied snapshot", async () => {
 const { writes } = database([[inquiry], [contract]]);
 await storage.createScopedPermissionDecision({ ...data, agreementSnapshot: { digest: "forged" } }, ["judgment"]);
 assert.deepEqual(writes[0].agreementSnapshot, original);
});
for (const override of [{ agreementSnapshot: null }, { expiresAt: new Date(0) }, { decision: "wait" }, { requiredConditions: ["Additional payment confirmed"] }]) {
 test(`storage fails closed for ${Object.keys(override)[0]}`, async () => {
  const { writes } = database([[inquiry], [contract], [permission(override)], []]);
  await assert.rejects(storage.createHumanActionDecision(data), AgreementReviewRequired);
  assert.deepEqual(writes, []);
 });
}
test("linked withdrawal cannot race through a route-only check", async () => {
 const { writes } = database([[inquiry], [contract], [permission()], [{ id: "withdrawal" }]]);
 await assert.rejects(storage.createHumanActionDecision(data), AgreementReviewRequired);
 assert.deepEqual(writes, []);
});

