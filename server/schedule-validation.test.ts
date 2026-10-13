import assert from "node:assert/strict";
import test from "node:test";
import {
  checkExpectedRevision,
  legacyAppointmentServiceKind,
  legacyMemberCapability,
  stableContentId,
  stripRevisionFields,
  validateLegacyAppointmentWrite,
  validateSchedulePatchBody,
} from "./scheduleValidation";

const MEMBERS = [
  { id: "m1", serviceType: "both" },
  { id: "m2", serviceType: "hair" },
];

test("stableContentId is deterministic for the same content", () => {
  const a = stableContentId("prov", "Violet", "ALL");
  const b = stableContentId("prov", "Violet", "ALL");
  const c = stableContentId("prov", "Violet", "HAIR_ONLY");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("capability mapping: hair-only member cannot take makeup", () => {
  assert.equal(legacyMemberCapability({ id: "x", serviceType: "hair" }), "HAIR_ONLY");
  assert.equal(legacyMemberCapability({ id: "x", serviceType: null }), "ALL");
  assert.equal(legacyAppointmentServiceKind("HM"), "hair_makeup");
  assert.equal(legacyAppointmentServiceKind("bogus"), null);
});

test("create rejects empty name, bad duration, and unknown member", () => {
  const base = { peers: [], members: MEMBERS, readyByTime: null, isCreate: true };
  assert.match(
    validateLegacyAppointmentWrite({ ...base, input: { clientName: "", serviceType: "H", startTime: "9:00", endTime: "10:00" } }) ?? "",
    /clientName/,
  );
  assert.match(
    validateLegacyAppointmentWrite({ ...base, input: { clientName: "A", serviceType: "H", startTime: "10:00", endTime: "9:00" } }) ?? "",
    /after startTime/,
  );
  assert.match(
    validateLegacyAppointmentWrite({ ...base, input: { clientName: "A", serviceType: "H", startTime: "9:00", endTime: "10:00", teamMemberId: "nope" } }) ?? "",
    /Unknown teamMemberId/,
  );
});

test("create rejects when no member can perform the service (defect #3)", () => {
  const err = validateLegacyAppointmentWrite({
    input: { clientName: "A", serviceType: "M", startTime: "9:00", endTime: "10:00" },
    peers: [],
    members: [{ id: "m2", serviceType: "hair" }],
    readyByTime: null,
    isCreate: true,
  });
  assert.match(err ?? "", /No team member/);
});

test("create allows unassigned appointment when no members exist yet", () => {
  const err = validateLegacyAppointmentWrite({
    input: { clientName: "A", serviceType: "M", startTime: "9:00", endTime: "10:00" },
    peers: [],
    members: [],
    readyByTime: null,
    isCreate: true,
  });
  assert.equal(err, null);
});

test("create rejects appointment ending after ready time (defect #2)", () => {
  const err = validateLegacyAppointmentWrite({
    input: { clientName: "A", serviceType: "H", startTime: "1:00 PM", endTime: "3:00 PM", teamMemberId: "m1" },
    peers: [],
    members: MEMBERS,
    readyByTime: "2:00 PM",
    isCreate: true,
  });
  assert.match(err ?? "", /ready time/);
});

test("update validates swap capability and overlap (defect #5)", () => {
  const existing = { id: "a1", teamMemberId: "m1", serviceType: "HM", startTime: "9:00", endTime: "10:00", clientName: "A" };
  const peers = [{ id: "a2", teamMemberId: "m2", serviceType: "H", startTime: "9:30", endTime: "10:30", clientName: "B" }];

  // Swap a hair+makeup appointment onto a hair-only member -> reject.
  const swapErr = validateLegacyAppointmentWrite({
    input: { teamMemberId: "m2" },
    existing,
    peers,
    members: MEMBERS,
    readyByTime: null,
    isCreate: false,
  });
  assert.match(swapErr ?? "", /cannot perform/);

  // Move into an overlapping slot for the same member -> reject.
  const overlapErr = validateLegacyAppointmentWrite({
    input: { teamMemberId: "m2", startTime: "9:00", endTime: "10:00", serviceType: "H" },
    existing,
    peers,
    members: MEMBERS,
    readyByTime: null,
    isCreate: false,
  });
  assert.match(overlapErr ?? "", /overlaps/);

  // Unrelated field change passes.
  const ok = validateLegacyAppointmentWrite({
    input: { clientName: "A (updated)" },
    existing,
    peers,
    members: MEMBERS,
    readyByTime: null,
    isCreate: false,
  });
  assert.equal(ok, null);
});

test("expectedRevision mismatch is reported (defect #7)", () => {
  assert.equal(checkExpectedRevision({}, 3), null);
  assert.equal(checkExpectedRevision({ expectedRevision: 3 }, 3), null);
  assert.match(checkExpectedRevision({ expectedRevision: 2 }, 3) ?? "", /changed elsewhere/);
  assert.match(checkExpectedRevision({ expectedRevision: "x" }, 3) ?? "", /integer/);
});

test("stripRevisionFields removes client-controlled revision keys", () => {
  const out = stripRevisionFields({ title: "T", revision: 9, expectedRevision: 8 } as any);
  assert.deepEqual(out, { title: "T" });
});

test("validateSchedulePatchBody rejects bad times and unknown members", () => {
  assert.match(
    validateSchedulePatchBody({ startTime: "10:00", endTime: "9:00" }, []) ?? "",
    /after startTime/,
  );
  assert.match(
    validateSchedulePatchBody({ appointments: [{ teamMemberId: "ghost", clientName: "A" }] }, [{ id: "m1" }]) ?? "",
    /unknown teamMemberId/,
  );
  assert.match(
    validateSchedulePatchBody({ appointments: [{ teamMemberId: "m1", clientName: "  " }] }, [{ id: "m1" }]) ?? "",
    /must not be empty/,
  );
  assert.equal(validateSchedulePatchBody({ title: "ok" }, []), null);
});
