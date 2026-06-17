import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEMO_OPERATOR_ID = "demo-operator-briarwood";
const DEMO_CLIENT_ID = "demo-client-maya";
const DEMO_PROFILE_ID = "demo-artist-profile-briarwood";
const DEMO_INQUIRY_ID = "demo-inquiry-fairmont-2026";
const DEMO_CONTRACT_ID = "demo-contract-fairmont";
const DEMO_SCHEDULE_ID = "demo-schedule-fairmont";
const DEMO_ROUTE_TARGET_HAIR_ID = "demo-route-target-hair";
const DEMO_ROUTE_TARGET_MAKEUP_ID = "demo-route-target-makeup";
const DEMO_ROUTE_TARGET_SCHEDULER_ID = "demo-route-target-scheduler";
const DEMO_CANDIDATE_HAIR_ID = "demo-candidate-fairmont-hair";
const DEMO_CANDIDATE_MAKEUP_ID = "demo-candidate-fairmont-makeup";
const DEMO_ROUTE_ID = "demo-route-fairmont-scheduler";
const DEMO_INTERNAL_NOTE_ID = "demo-internal-note-fairmont";
const DEMO_RESPONSE_ID = "demo-response-fairmont-pricing";

const forbiddenSendPaymentEnv = [
  "RESEND_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_MESSAGING_SERVICE_SID",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_APPLICATION_ID",
  "SQUARE_APPLICATION_SECRET",
];

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (quote === `"` || quote === "'" || quote === "`") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    const inner = trimmed.slice(1, -1);
    return quote === `"`
      ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
      : inner;
  }
  return trimmed;
}

function loadLocalEnvFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false;

  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;

    process.env[key] = unquoteEnvValue(normalized.slice(equalsIndex + 1));
  }

  return true;
}

function loadLocalEnv(): void {
  const envFile = [".env.local", ".env"]
    .map((fileName) => path.resolve(process.cwd(), fileName))
    .find((filePath) => existsSync(filePath));

  if (envFile) {
    loadLocalEnvFile(envFile);
  }
}

function requireGate(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`[local-demo-seed] ${message}`);
  }
}

function withoutId<T extends { id: string }>(row: T): Omit<T, "id"> {
  const { id: _id, ...rest } = row;
  return rest;
}

function cleanDatabaseUrl(url: string): string {
  return url.replace(/^psql\s*/, "").replace(/^['"\s]+/, "").replace(/['"\s]+$/, "").trim();
}

function getDemoDatabaseUrl(): URL {
  const raw = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
  requireGate(raw, "NEON_DATABASE_URL or DATABASE_URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(cleanDatabaseUrl(raw));
  } catch {
    throw new Error("[local-demo-seed] Database URL must parse as a URL.");
  }

  requireGate(
    parsed.protocol === "postgres:" || parsed.protocol === "postgresql:",
    "Database URL must use postgres:// or postgresql://.",
  );
  requireGate(parsed.hostname, "Database URL must include a hostname.");
  const targetLabel = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  requireGate(
    !/(^|[-_/])(prod|production|live)([-_/]|$)/.test(targetLabel),
    "Database host/name looks production-like; use a disposable or staging database.",
  );
  return parsed;
}

function assertSafetyGates(): { dbUrl: URL; password: string; action: "seed" | "cleanup" } {
  requireGate(process.env.ALLOW_LOCAL_DEMO_SEED === "true", "Set ALLOW_LOCAL_DEMO_SEED=true to continue.");
  requireGate(process.env.NODE_ENV !== "production", "Refusing to run with NODE_ENV=production.");
  requireGate(
    process.env.LOCAL_DEMO_DB_CONFIRM === "disposable",
    "Set LOCAL_DEMO_DB_CONFIRM=disposable to confirm this is not production.",
  );
  requireGate(
    process.env.PUBLIC_BASE_URL === "http://localhost:5173",
    "PUBLIC_BASE_URL must be http://localhost:5173 for the local demo seed.",
  );

  const presentForbidden = forbiddenSendPaymentEnv.filter((key) => !!process.env[key]);
  requireGate(
    presentForbidden.length === 0,
    `Remove send/payment env vars before seeding: ${presentForbidden.join(", ")}`,
  );

  const action = process.env.DEMO_SEED_ACTION === "cleanup" ? "cleanup" : "seed";
  const password = process.env.DEMO_OPERATOR_PASSWORD || "";
  if (action === "seed") {
    requireGate(password.length >= 12, "DEMO_OPERATOR_PASSWORD must be at least 12 characters.");
  }

  return { dbUrl: getDemoDatabaseUrl(), password, action };
}

async function seedDemoData(password: string): Promise<void> {
  const bcrypt = await import("bcryptjs");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../server/db");
  const {
    artistProfiles,
    contracts,
    inquiries,
    inquiryInternalNotes,
    inquiryResponses,
    inquiryRouteCandidates,
    inquiryRoutes,
    routeTargets,
    scheduleDrafts,
    users,
  } = await import("../shared/schema");

  const now = new Date();
  const eventDate = new Date("2026-10-25T00:00:00.000Z");
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    id: DEMO_OPERATOR_ID,
    username: "briarwood-demo",
    email: "operator.demo@briarwood.test",
    password: passwordHash,
    firstName: "Briarwood",
    lastName: "Operator Demo",
    role: "artist",
    intakeCompleted: true,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      username: "briarwood-demo",
      email: "operator.demo@briarwood.test",
      password: passwordHash,
      firstName: "Briarwood",
      lastName: "Operator Demo",
      role: "artist",
      intakeCompleted: true,
      updatedAt: now,
    },
  });

  await db.insert(users).values({
    id: DEMO_CLIENT_ID,
    email: "maya.demo@example.test",
    firstName: "Maya",
    lastName: "Demo",
    role: "client",
    intakeCompleted: false,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email: "maya.demo@example.test",
      firstName: "Maya",
      lastName: "Demo",
      role: "client",
      intakeCompleted: false,
      updatedAt: now,
    },
  });

  await db.insert(artistProfiles).values({
    id: DEMO_PROFILE_ID,
    userId: DEMO_OPERATOR_ID,
    businessName: "Briarwood Beauty Demo",
    bio: "Local demo profile for Briarwood operator preview.",
    location: "New York, NY",
    specialties: ["bridal hair", "bridal makeup", "schedule coordination"],
    verificationStatus: "approved",
    artistSlug: "briarwood-demo",
    onboardingCompleted: true,
    calendarConnected: false,
    infoSheetEnabled: false,
    autoResponderMode: "off",
    preferredDeliveryChannel: "email",
    assistantPhoneEnabled: false,
    assistantEmailEnabled: false,
    assistantPromptMode: "immediate",
    assistantDryRun: true,
    createdAt: now,
  }).onConflictDoUpdate({
    target: artistProfiles.id,
    set: {
      userId: DEMO_OPERATOR_ID,
      businessName: "Briarwood Beauty Demo",
      bio: "Local demo profile for Briarwood operator preview.",
      location: "New York, NY",
      specialties: ["bridal hair", "bridal makeup", "schedule coordination"],
      verificationStatus: "approved",
      artistSlug: "briarwood-demo",
      onboardingCompleted: true,
      calendarConnected: false,
      infoSheetEnabled: false,
      autoResponderMode: "off",
      preferredDeliveryChannel: "email",
      assistantPhoneEnabled: false,
      assistantEmailEnabled: false,
      assistantPromptMode: "immediate",
      assistantDryRun: true,
    },
  });

  await db.insert(inquiries).values({
    id: DEMO_INQUIRY_ID,
    threadToken: "demo-thread-token-fairmont-operator",
    clientThreadToken: "demo-client-thread-token-fairmont",
    vendorId: DEMO_OPERATOR_ID,
    clientId: DEMO_CLIENT_ID,
    clientEmail: "maya.demo@example.test",
    clientName: "Maya Demo",
    clientPhone: "+15550101010",
    eventDate,
    eventType: "wedding",
    eventLocation: "Fairmont Demo Ballroom",
    serviceType: "bridal hair and makeup",
    partySize: 7,
    message: "Local demo inquiry: bride plus attendants, venue access at 9:30, ready by 1:20.",
    budget: "Demo only",
    status: "pending",
    responseMode: "manual",
    ownerId: DEMO_OPERATOR_ID,
    nextAction: "vendor_first_response",
    metadata: { source: "local_demo_seed" },
    updatedAt: now,
  }).onConflictDoUpdate({
    target: inquiries.id,
    set: {
      vendorId: DEMO_OPERATOR_ID,
      clientId: DEMO_CLIENT_ID,
      clientEmail: "maya.demo@example.test",
      clientName: "Maya Demo",
      clientPhone: "+15550101010",
      eventDate,
      eventType: "wedding",
      eventLocation: "Fairmont Demo Ballroom",
      serviceType: "bridal hair and makeup",
      partySize: 7,
      message: "Local demo inquiry: bride plus attendants, venue access at 9:30, ready by 1:20.",
      budget: "Demo only",
      status: "pending",
      responseMode: "manual",
      ownerId: DEMO_OPERATOR_ID,
      nextAction: "vendor_first_response",
      metadata: { source: "local_demo_seed" },
      updatedAt: now,
    },
  });

  const routeTargetRows = [
    {
      id: DEMO_ROUTE_TARGET_HAIR_ID,
      operatorId: DEMO_OPERATOR_ID,
      name: "Demo Hair Artist",
      email: "hair.artist.demo@example.test",
      roleLabel: "Hair Artist",
      tags: ["bridal", "hair", "trusted"],
      capabilities: ["hair", "mother hair", "bridesmaid hair"],
      isInternal: false,
      active: true,
      preferred: true,
      availabilitySource: "none",
      notes: "Local demo route target. Do not contact.",
      updatedAt: now,
    },
    {
      id: DEMO_ROUTE_TARGET_MAKEUP_ID,
      operatorId: DEMO_OPERATOR_ID,
      name: "Demo Makeup Artist",
      email: "makeup.artist.demo@example.test",
      roleLabel: "Makeup Artist",
      tags: ["bridal", "makeup", "backup"],
      capabilities: ["makeup", "mother makeup", "bridesmaid makeup"],
      isInternal: false,
      active: true,
      preferred: false,
      availabilitySource: "none",
      notes: "Local demo route target. Do not contact.",
      updatedAt: now,
    },
    {
      id: DEMO_ROUTE_TARGET_SCHEDULER_ID,
      operatorId: DEMO_OPERATOR_ID,
      name: "Briarwood Scheduler Demo",
      email: "scheduler.demo@example.test",
      roleLabel: "Scheduler",
      tags: ["internal", "schedule"],
      capabilities: ["timeline review", "artist coordination"],
      isInternal: true,
      active: true,
      preferred: false,
      availabilitySource: "none",
      notes: "Internal local demo target. Do not contact.",
      updatedAt: now,
    },
  ];

  for (const row of routeTargetRows) {
    await db.insert(routeTargets).values(row).onConflictDoUpdate({
      target: routeTargets.id,
      set: withoutId(row),
    });
  }

  const candidateRows = [
    {
      id: DEMO_CANDIDATE_HAIR_ID,
      operatorId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      routeTargetId: DEMO_ROUTE_TARGET_HAIR_ID,
      status: "draft",
      matchScore: 91,
      matchReasons: ["Hair-only support for larger bridal party", "Trusted local colleague"],
      matchedCapabilities: ["hair", "bridesmaid hair"],
      matchedTags: ["bridal", "trusted"],
      updatedAt: now,
    },
    {
      id: DEMO_CANDIDATE_MAKEUP_ID,
      operatorId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      routeTargetId: DEMO_ROUTE_TARGET_MAKEUP_ID,
      status: "draft",
      matchScore: 86,
      matchReasons: ["Makeup support for attendant timing", "Good backup capacity"],
      matchedCapabilities: ["makeup", "bridesmaid makeup"],
      matchedTags: ["bridal", "backup"],
      updatedAt: now,
    },
  ];

  for (const row of candidateRows) {
    await db.insert(inquiryRouteCandidates).values(row).onConflictDoUpdate({
      target: inquiryRouteCandidates.id,
      set: withoutId(row),
    });
  }

  await db.insert(inquiryRoutes).values({
    id: DEMO_ROUTE_ID,
    operatorId: DEMO_OPERATOR_ID,
    inquiryId: DEMO_INQUIRY_ID,
    routeTargetId: DEMO_ROUTE_TARGET_SCHEDULER_ID,
    routeType: "review",
    status: "draft",
    targetLabelSnapshot: "Scheduler",
    responseRaw: null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: inquiryRoutes.id,
    set: {
      operatorId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      routeTargetId: DEMO_ROUTE_TARGET_SCHEDULER_ID,
      routeType: "review",
      status: "draft",
      targetLabelSnapshot: "Scheduler",
      responseRaw: null,
      updatedAt: now,
    },
  });

  await db.insert(inquiryInternalNotes).values({
    id: DEMO_INTERNAL_NOTE_ID,
    operatorId: DEMO_OPERATOR_ID,
    inquiryId: DEMO_INQUIRY_ID,
    body: "Private demo note: confirm venue access and keep bride midpoint-to-late. Do not send.",
    updatedAt: now,
  }).onConflictDoUpdate({
    target: inquiryInternalNotes.id,
    set: {
      operatorId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      body: "Private demo note: confirm venue access and keep bride midpoint-to-late. Do not send.",
      updatedAt: now,
    },
  });

  await db.insert(inquiryResponses).values({
    id: DEMO_RESPONSE_ID,
    operatorId: DEMO_OPERATOR_ID,
    inquiryId: DEMO_INQUIRY_ID,
    responseType: "pricing",
    channel: "email",
    personalNote: "Demo draft only.",
    body: "Hi Maya - this is a local demo draft only. It is not connected to a real send path.",
    status: "draft",
    sentAt: null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: inquiryResponses.id,
    set: {
      operatorId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      responseType: "pricing",
      channel: "email",
      personalNote: "Demo draft only.",
      body: "Hi Maya - this is a local demo draft only. It is not connected to a real send path.",
      status: "draft",
      sentAt: null,
      updatedAt: now,
    },
  });

  await db.insert(contracts).values({
    id: DEMO_CONTRACT_ID,
    inquiryId: DEMO_INQUIRY_ID,
    artistId: DEMO_OPERATOR_ID,
    clientId: DEMO_CLIENT_ID,
    packageDetails: "Demo bridal beauty package",
    totalAmount: 185000,
    depositAmount: 92500,
    remainingAmount: 92500,
    status: "draft",
    serviceItems: [
      { clientType: "Bride", qty: 1, service: "Hair + Makeup", price: 60000, total: 60000 },
      { clientType: "Attendant", qty: 6, service: "Hair or Makeup", price: 20000, total: 120000 },
    ],
    eventDates: "2026-10-25",
    eventLocation: "Fairmont Demo Ballroom",
    clientName: "Maya Demo",
    clientContact: "maya.demo@example.test",
    contractSource: "local_demo_metadata",
    contractNotes: "Local demo only. No signing link generated.",
    paymentStatus: "payment_not_requested",
    amountPaid: 0,
    paymentDueDate: "Demo only",
    paymentLink: null,
    paymentNotes: "No payment action is available in this demo seed.",
    updatedAt: now,
  }).onConflictDoUpdate({
    target: contracts.id,
    set: {
      inquiryId: DEMO_INQUIRY_ID,
      artistId: DEMO_OPERATOR_ID,
      clientId: DEMO_CLIENT_ID,
      packageDetails: "Demo bridal beauty package",
      totalAmount: 185000,
      depositAmount: 92500,
      remainingAmount: 92500,
      status: "draft",
      serviceItems: [
        { clientType: "Bride", qty: 1, service: "Hair + Makeup", price: 60000, total: 60000 },
        { clientType: "Attendant", qty: 6, service: "Hair or Makeup", price: 20000, total: 120000 },
      ],
      eventDates: "2026-10-25",
      eventLocation: "Fairmont Demo Ballroom",
      clientName: "Maya Demo",
      clientContact: "maya.demo@example.test",
      contractSource: "local_demo_metadata",
      contractNotes: "Local demo only. No signing link generated.",
      paymentStatus: "payment_not_requested",
      amountPaid: 0,
      paymentDueDate: "Demo only",
      paymentLink: null,
      paymentNotes: "No payment action is available in this demo seed.",
      updatedAt: now,
    },
  });

  await db.update(inquiries)
    .set({ convertedToContractId: DEMO_CONTRACT_ID, updatedAt: now })
    .where(eq(inquiries.id, DEMO_INQUIRY_ID));

  await db.insert(scheduleDrafts).values({
    id: DEMO_SCHEDULE_ID,
    artistId: DEMO_OPERATOR_ID,
    inquiryId: DEMO_INQUIRY_ID,
    contractId: DEMO_CONTRACT_ID,
    title: "Fairmont Demo Wedding Schedule",
    eventDate: "2026-10-25",
    location: "Fairmont Demo Ballroom",
    notes: "Local demo only. Review before save.",
    columns: [
      { id: "time", label: "Time", type: "time" },
      { id: "primary", label: "Primary Artist Demo", type: "provider" },
      { id: "hair", label: "Demo Hair Artist", type: "provider" },
      { id: "makeup", label: "Demo Makeup Artist", type: "provider" },
      { id: "notes", label: "Notes", type: "text" },
    ],
    rows: [
      { id: "row-setup", sortOrder: 1, cells: { time: "9:30 AM", primary: "Setup", hair: "Setup", makeup: "Setup", notes: "30 min setup for 3 providers" } },
      { id: "row-attendant-1", sortOrder: 2, cells: { time: "10:00 AM", primary: "Bridesmaid Makeup", hair: "Bridesmaid Hair", makeup: "Bridesmaid Makeup", notes: "Attendants open the morning" } },
      { id: "row-mother", sortOrder: 3, cells: { time: "11:30 AM", primary: "Mother Makeup", hair: "Mother Hair", makeup: "", notes: "Mother adjacent to bride" } },
      { id: "row-bride", sortOrder: 4, cells: { time: "12:00 PM", primary: "Bride Hair + Makeup", hair: "", makeup: "", notes: "Bride anchored midpoint-to-late" } },
      { id: "row-flower-girl", sortOrder: 5, cells: { time: "1:00 PM", primary: "", hair: "Flower Girl", makeup: "", notes: "Tail-end service" } },
      { id: "row-touchups", sortOrder: 6, cells: { time: "1:15 PM", primary: "Touch-Ups", hair: "Touch-Ups", makeup: "Touch-Ups", notes: "Ready by 1:20" } },
    ],
    serviceDefaults: [
      { id: "bride_hair_makeup", label: "Bride Hair + Makeup", durationMinutes: 120 },
      { id: "bride_makeup", label: "Bride Makeup", durationMinutes: 60 },
      { id: "bride_hair", label: "Bride Hair", durationMinutes: 45 },
      { id: "bridesmaid_makeup", label: "Bridesmaid Makeup", durationMinutes: 30 },
      { id: "bridesmaid_hair", label: "Bridesmaid Hair", durationMinutes: 45 },
      { id: "mother_makeup", label: "Mother Makeup", durationMinutes: 30 },
      { id: "mother_hair", label: "Mother Hair", durationMinutes: 45 },
      { id: "flower_girl", label: "Flower Girl", durationMinutes: 45 },
      { id: "touchups", label: "Touch-Ups", durationMinutes: 15 },
      { id: "setup", label: "Setup", durationMinutes: 15 },
    ],
    providers: [
      { id: "primary", name: "Primary Artist Demo", capability: "ALL", isPrimary: true },
      { id: "hair", name: "Demo Hair Artist", capability: "HAIR_ONLY", isPrimary: false },
      { id: "makeup", name: "Demo Makeup Artist", capability: "MAKEUP_ONLY", isPrimary: false },
    ],
    engineMetadata: {
      venueAccessTime: "09:30",
      photographerArrivalTime: "12:45",
      readyByTime: "13:20",
      ceremonyTime: "16:00",
      firstLookTime: "13:30",
    },
    status: "draft",
    updatedAt: now,
  }).onConflictDoUpdate({
    target: scheduleDrafts.id,
    set: {
      artistId: DEMO_OPERATOR_ID,
      inquiryId: DEMO_INQUIRY_ID,
      contractId: DEMO_CONTRACT_ID,
      title: "Fairmont Demo Wedding Schedule",
      eventDate: "2026-10-25",
      location: "Fairmont Demo Ballroom",
      notes: "Local demo only. Review before save.",
      columns: [
        { id: "time", label: "Time", type: "time" },
        { id: "primary", label: "Primary Artist Demo", type: "provider" },
        { id: "hair", label: "Demo Hair Artist", type: "provider" },
        { id: "makeup", label: "Demo Makeup Artist", type: "provider" },
        { id: "notes", label: "Notes", type: "text" },
      ],
      rows: [
        { id: "row-setup", sortOrder: 1, cells: { time: "9:30 AM", primary: "Setup", hair: "Setup", makeup: "Setup", notes: "30 min setup for 3 providers" } },
        { id: "row-attendant-1", sortOrder: 2, cells: { time: "10:00 AM", primary: "Bridesmaid Makeup", hair: "Bridesmaid Hair", makeup: "Bridesmaid Makeup", notes: "Attendants open the morning" } },
        { id: "row-mother", sortOrder: 3, cells: { time: "11:30 AM", primary: "Mother Makeup", hair: "Mother Hair", makeup: "", notes: "Mother adjacent to bride" } },
        { id: "row-bride", sortOrder: 4, cells: { time: "12:00 PM", primary: "Bride Hair + Makeup", hair: "", makeup: "", notes: "Bride anchored midpoint-to-late" } },
        { id: "row-flower-girl", sortOrder: 5, cells: { time: "1:00 PM", primary: "", hair: "Flower Girl", makeup: "", notes: "Tail-end service" } },
        { id: "row-touchups", sortOrder: 6, cells: { time: "1:15 PM", primary: "Touch-Ups", hair: "Touch-Ups", makeup: "Touch-Ups", notes: "Ready by 1:20" } },
      ],
      serviceDefaults: [
        { id: "bride_hair_makeup", label: "Bride Hair + Makeup", durationMinutes: 120 },
        { id: "bride_makeup", label: "Bride Makeup", durationMinutes: 60 },
        { id: "bride_hair", label: "Bride Hair", durationMinutes: 45 },
        { id: "bridesmaid_makeup", label: "Bridesmaid Makeup", durationMinutes: 30 },
        { id: "bridesmaid_hair", label: "Bridesmaid Hair", durationMinutes: 45 },
        { id: "mother_makeup", label: "Mother Makeup", durationMinutes: 30 },
        { id: "mother_hair", label: "Mother Hair", durationMinutes: 45 },
        { id: "flower_girl", label: "Flower Girl", durationMinutes: 45 },
        { id: "touchups", label: "Touch-Ups", durationMinutes: 15 },
        { id: "setup", label: "Setup", durationMinutes: 15 },
      ],
      providers: [
        { id: "primary", name: "Primary Artist Demo", capability: "ALL", isPrimary: true },
        { id: "hair", name: "Demo Hair Artist", capability: "HAIR_ONLY", isPrimary: false },
        { id: "makeup", name: "Demo Makeup Artist", capability: "MAKEUP_ONLY", isPrimary: false },
      ],
      engineMetadata: {
        venueAccessTime: "09:30",
        photographerArrivalTime: "12:45",
        readyByTime: "13:20",
        ceremonyTime: "16:00",
        firstLookTime: "13:30",
      },
      status: "draft",
      updatedAt: now,
    },
  });

  console.log("[local-demo-seed] Seeded local demo data.");
  console.log("[local-demo-seed] Login email: operator.demo@briarwood.test");
  console.log("[local-demo-seed] Open: http://localhost:5173/inquiry-workspace");
  console.log("[local-demo-seed] Open: http://localhost:5173/admin/briarwood-demo/network");
  console.log("[local-demo-seed] Open: http://localhost:5173/admin/briarwood-demo/schedules/demo-schedule-fairmont");
}

async function cleanupDemoData(): Promise<void> {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../server/db");
  const {
    artistProfiles,
    contracts,
    inquiries,
    inquiryInternalNotes,
    inquiryResponses,
    inquiryRouteCandidates,
    inquiryRoutes,
    routeTargets,
    scheduleDrafts,
    users,
  } = await import("../shared/schema");

  await db.update(inquiries)
    .set({ convertedToContractId: null, updatedAt: new Date() })
    .where(eq(inquiries.id, DEMO_INQUIRY_ID));

  await db.delete(inquiryRouteCandidates).where(eq(inquiryRouteCandidates.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryInternalNotes).where(eq(inquiryInternalNotes.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryResponses).where(eq(inquiryResponses.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryRoutes).where(eq(inquiryRoutes.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(scheduleDrafts).where(eq(scheduleDrafts.id, DEMO_SCHEDULE_ID));
  await db.delete(contracts).where(eq(contracts.id, DEMO_CONTRACT_ID));
  await db.delete(routeTargets).where(eq(routeTargets.operatorId, DEMO_OPERATOR_ID));
  await db.delete(inquiries).where(eq(inquiries.id, DEMO_INQUIRY_ID));
  await db.delete(artistProfiles).where(eq(artistProfiles.id, DEMO_PROFILE_ID));
  await db.delete(users).where(eq(users.id, DEMO_CLIENT_ID));
  await db.delete(users).where(eq(users.id, DEMO_OPERATOR_ID));

  console.log("[local-demo-seed] Removed deterministic local demo rows.");
}

async function main(): Promise<void> {
  loadLocalEnv();
  const { dbUrl, password, action } = assertSafetyGates();

  console.log(`[local-demo-seed] Action: ${action}`);
  console.log(`[local-demo-seed] Target host: ${dbUrl.host}`);
  console.log("[local-demo-seed] This script writes deterministic local demo rows only.");

  try {
    if (action === "cleanup") {
      await cleanupDemoData();
    } else {
      await seedDemoData(password);
    }
  } finally {
    const { getPool } = await import("../server/db");
    await getPool().end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
