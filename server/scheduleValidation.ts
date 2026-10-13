// Legacy schedule write validation (scheduler defects #2, #3, #5, #6, #7).
//
// The production engine (shared/schedulingIntelligence.ts) blocks on deadline,
// unplaceable services, capability, and overlap via warnings. The legacy write
// paths bypass it, so these helpers enforce the same invariants there.
// Pure functions: no storage, no express. Unit-tested in
// server/schedule-validation.test.ts.

import {
  parseScheduleClock,
  providerCanPerform,
  type ProviderCapability,
  type ScheduleServiceKind,
} from "@shared/schedulingIntelligence";

// FNV-1a 32-bit hash, base36. Deterministic content-derived ids:
// re-sanitizing the same data yields the same ids (defect #6). Not a
// security hash; only used for stable synthetic ids.
export function stableContentHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function stableContentId(
  prefix: string,
  ...parts: Array<string | number | null | undefined>
): string {
  return `${prefix}_${stableContentHash(parts.map((part) => String(part ?? "")).join("|"))}`;
}

export type LegacyScheduleMemberLike = { id: string; serviceType?: string | null };
export type LegacyAppointmentLike = {
  id?: string;
  teamMemberId?: string | null;
  serviceType?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  clientName?: string | null;
};

export function normalizeMemberId(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

// Legacy team-member serviceType ('hair' | 'makeup' | 'both' | null) mapped to
// the engine's ProviderCapability. Null/unknown means the legacy data never
// recorded a capability, so we cannot prove inability: treat as ALL rather
// than inventing a restriction (defect #5).
export function legacyMemberCapability(member: LegacyScheduleMemberLike): ProviderCapability {
  const serviceType = (member.serviceType || "").toLowerCase();
  if (serviceType === "hair") return "HAIR_ONLY";
  if (serviceType === "makeup") return "MAKEUP_ONLY";
  return "ALL";
}

// Legacy appointment serviceType ('H' | 'M' | 'HM' | ...) mapped to the
// engine's ScheduleServiceKind. Returns null when unrecognized so callers
// skip the capability check instead of guessing (defect #3 / #5).
export function legacyAppointmentServiceKind(serviceType: unknown): ScheduleServiceKind | null {
  const normalized = String(serviceType ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (normalized === "h" || normalized === "hair") return "hair";
  if (normalized === "m" || normalized === "makeup") return "makeup";
  if (normalized === "hm" || normalized === "hairmakeup" || normalized === "both") return "hair_makeup";
  if (normalized === "touchup") return "touchup";
  return null;
}

export function parseLegacyClock(value: unknown): number | null {
  return typeof value === "string" ? parseScheduleClock(value) : null;
}

export function memberCanPerformService(
  member: LegacyScheduleMemberLike,
  serviceKind: ScheduleServiceKind,
): boolean {
  return providerCanPerform(
    { id: member.id, name: "", capability: legacyMemberCapability(member) },
    serviceKind,
  );
}

// Validates one legacy appointment write (create or update). Returns an
// error message when the write must be rejected, null when acceptable.
// `existing` is the stored appointment being updated (undefined on create);
// `peers` are the schedule's other appointments, used for overlap checks.
export function validateLegacyAppointmentWrite(args: {
  input: {
    startTime?: unknown;
    endTime?: unknown;
    teamMemberId?: unknown;
    serviceType?: unknown;
    clientName?: unknown;
  };
  existing?: LegacyAppointmentLike;
  peers: LegacyAppointmentLike[];
  members: LegacyScheduleMemberLike[];
  readyByTime?: string | null;
  isCreate: boolean;
}): string | null {
  const { input, existing, peers, members, readyByTime, isCreate } = args;
  const memberById = new Map(members.map((member) => [member.id, member]));

  const startTime = input.startTime !== undefined ? input.startTime : existing?.startTime;
  const endTime = input.endTime !== undefined ? input.endTime : existing?.endTime;
  const teamMemberId =
    input.teamMemberId !== undefined
      ? normalizeMemberId(input.teamMemberId)
      : normalizeMemberId(existing?.teamMemberId);
  const serviceType = input.serviceType !== undefined ? input.serviceType : existing?.serviceType;
  const clientName = input.clientName !== undefined ? input.clientName : existing?.clientName;
  const serviceKind = legacyAppointmentServiceKind(serviceType);

  // Defect #7 semantic: appointments need a name.
  if (isCreate && String(clientName ?? "").trim() === "") {
    return "Appointment clientName is required.";
  }

  const timeChanging = input.startTime !== undefined || input.endTime !== undefined;
  const start = parseLegacyClock(startTime);
  const end = parseLegacyClock(endTime);

  // Defect #5: duration must be positive.
  if (isCreate || timeChanging) {
    if (start === null || end === null) {
      return "Appointment startTime and endTime must be parseable times.";
    }
    if (end <= start) {
      return "Appointment endTime must be after startTime.";
    }
  }

  // Defect #2: never end after the schedule's hard ready time.
  if ((isCreate || timeChanging) && readyByTime) {
    const readyBy = parseLegacyClock(readyByTime);
    if (readyBy !== null && end !== null && end > readyBy) {
      return "Appointment ends after the schedule ready time.";
    }
  }

  // Defects #3 / #5 / #7: the assigned member must exist and be able to
  // perform the service. Unassigned creates are allowed only when the
  // schedule has no members yet (nothing to judge against); once members
  // exist, at least one must be able to perform the service.
  const memberChanging = input.teamMemberId !== undefined;
  const serviceChanging = input.serviceType !== undefined;
  if (isCreate || memberChanging || serviceChanging) {
    if (teamMemberId !== null) {
      const member = memberById.get(teamMemberId);
      if (!member) {
        return "Unknown teamMemberId: no such team member on this schedule.";
      }
      if (serviceKind !== null && !memberCanPerformService(member, serviceKind)) {
        return `Team member cannot perform this service (${String(serviceType)}).`;
      }
    } else if (isCreate && serviceKind !== null && members.length > 0) {
      const placeable = members.some((member) => memberCanPerformService(member, serviceKind));
      if (!placeable) {
        return `No team member on this schedule can perform ${String(serviceType)}; appointment not created.`;
      }
    }
  }

  // Defect #5: no overlapping appointments for the same team member.
  if ((isCreate || timeChanging || memberChanging) && teamMemberId !== null && start !== null && end !== null) {
    for (const peer of peers) {
      if (peer.id !== undefined && existing?.id !== undefined && peer.id === existing.id) continue;
      if (normalizeMemberId(peer.teamMemberId) !== teamMemberId) continue;
      const peerStart = parseLegacyClock(peer.startTime);
      const peerEnd = parseLegacyClock(peer.endTime);
      if (peerStart === null || peerEnd === null) continue;
      if (start < peerEnd && peerStart < end) {
        return "Appointment overlaps another appointment for the same team member.";
      }
    }
  }

  return null;
}

// Defect #7 semantic validation for whole-schedule PATCH bodies.
export function validateSchedulePatchBody(
  body: Record<string, unknown>,
  members: Array<{ id: string }>,
): string | null {
  if (body.startTime !== undefined || body.endTime !== undefined) {
    const start = parseLegacyClock(body.startTime);
    const end = parseLegacyClock(body.endTime);
    if (start !== null && end !== null && end <= start) {
      return "Schedule endTime must be after startTime.";
    }
  }
  if (Array.isArray(body.appointments)) {
    const memberIds = new Set(members.map((member) => member.id));
    for (const item of body.appointments) {
      if (!item || typeof item !== "object") return "Invalid appointment in schedule body.";
      const apt = item as Record<string, unknown>;
      const memberId = normalizeMemberId(apt.teamMemberId);
      if (memberId !== null && !memberIds.has(memberId)) {
        return "Appointment references an unknown teamMemberId.";
      }
      if ("clientName" in apt && String(apt.clientName ?? "").trim() === "") {
        return "Appointment clientName must not be empty.";
      }
    }
  }
  return null;
}

// Defect #7 optimistic concurrency: optional expectedRevision in PATCH bodies.
// Returns an error message when the check fails, null when it passes (or
// when the caller supplied no expectedRevision).
export function checkExpectedRevision(
  body: Record<string, unknown>,
  currentRevision: unknown,
): string | null {
  const expected = body.expectedRevision;
  if (expected === undefined || expected === null) return null;
  const expectedNumber = Number(expected);
  if (!Number.isInteger(expectedNumber)) return "expectedRevision must be an integer.";
  const current = typeof currentRevision === "number" ? currentRevision : 0;
  if (expectedNumber !== current) {
    return `Schedule changed elsewhere (expected revision ${expectedNumber}, current ${current}). Refresh before saving.`;
  }
  return null;
}

// Strip client-controlled revision fields before storage; storage bumps the
// revision itself on every successful write (defect #7).
export function stripRevisionFields(body: Record<string, unknown>): any {
  const { expectedRevision: _expected, revision: _revision, ...rest } = body;
  return rest;
}
