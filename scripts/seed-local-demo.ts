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
const DEMO_COORDINATION_PATH_ID = "demo-path-fairmont";
const DEMO_COORDINATION_EVENT_CONTEXT_ID = "demo-coordination-event-context";
const DEMO_COORDINATION_EVENT_TIMING_ID = "demo-coordination-event-timing";
const DEMO_COORDINATION_EVENT_HANDOFF_ID = "demo-coordination-event-handoff";
const DEMO_COORDINATION_ASSESSMENT_ID = "demo-coordination-assessment-fairmont";

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

function safeSqlIdentifier(identifier: string): string {
  requireGate(/^[a-z_][a-z0-9_]*$/.test(identifier), `Unsafe SQL identifier: ${identifier}`);
  return identifier;
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

async function getPublicTableColumns(
  db: { execute: (query: unknown) => Promise<{ rows: Array<{ column_name: string }> }> },
  sql: typeof import("drizzle-orm").sql,
  tableName: string,
): Promise<Set<string>> {
  const result = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = ${tableName}
  `);
  return new Set(result.rows.map((row) => row.column_name));
}

async function seedOptionalContractMetadata(
  db: { execute: (query: unknown) => Promise<unknown> },
  sql: typeof import("drizzle-orm").sql,
  now: Date,
): Promise<boolean> {
  const availableColumns = await getPublicTableColumns(db as any, sql, "contracts");
  const requiredContractColumns = [
    "id",
    "inquiry_id",
    "artist_id",
    "client_id",
    "package_details",
    "total_amount",
    "status",
  ];
  const missingRequiredColumns = requiredContractColumns.filter((column) => !availableColumns.has(column));

  if (missingRequiredColumns.length > 0) {
    console.log(
      `[local-demo-seed] Skipping optional contract metadata; missing columns: ${missingRequiredColumns.join(", ")}`,
    );
    return false;
  }

  const contractValues: Array<[string, unknown]> = [
    ["id", DEMO_CONTRACT_ID],
    ["inquiry_id", DEMO_INQUIRY_ID],
    ["artist_id", DEMO_OPERATOR_ID],
    ["client_id", DEMO_CLIENT_ID],
    ["package_details", "Demo bridal beauty package"],
    ["total_amount", 185000],
    ["status", "draft"],
    ["deposit_amount", 92500],
    ["remaining_amount", 92500],
    ["event_dates", "2026-10-25"],
    ["event_location", "Private Venue Ballroom"],
    ["client_name", "Private Client"],
    ["client_contact", "private.client.demo@example.test"],
    ["contract_source", "local_demo_metadata"],
    ["contract_notes", "Local demo only. No signing link generated."],
    ["payment_status", "payment_not_requested"],
    ["amount_paid", 0],
    ["payment_due_date", "Demo only"],
    ["payment_link", null],
    ["payment_notes", "No payment action is available in this demo seed."],
    ["updated_at", now],
  ].filter(([column]) => availableColumns.has(column));

  const insertColumns = contractValues.map(([column]) => safeSqlIdentifier(column));
  const insertValues = contractValues.map(([, value]) => sql`${value}`);
  const updateAssignments = contractValues
    .filter(([column]) => column !== "id")
    .map(([column]) => {
      const safeColumn = safeSqlIdentifier(column);
      return sql.raw(`${safeColumn} = excluded.${safeColumn}`);
    });

  await db.execute(sql`
    insert into contracts (${sql.raw(insertColumns.join(", "))})
    values (${sql.join(insertValues, sql`, `)})
    on conflict (id) do update set ${sql.join(updateAssignments, sql`, `)}
  `);

  console.log("[local-demo-seed] Seeded optional contract/payment summary metadata.");
  return true;
}

async function seedScheduleDraft(
  db: { execute: (query: unknown) => Promise<unknown> },
  sql: typeof import("drizzle-orm").sql,
  now: Date,
  scheduleContractId: string | null,
): Promise<void> {
  const availableColumns = await getPublicTableColumns(db as any, sql, "schedule_drafts");
  const requiredScheduleColumns = ["id", "artist_id"];
  const missingRequiredColumns = requiredScheduleColumns.filter((column) => !availableColumns.has(column));

  if (missingRequiredColumns.length > 0) {
    throw new Error(
      `[local-demo-seed] Cannot seed schedule draft; missing columns: ${missingRequiredColumns.join(", ")}`,
    );
  }

  const scheduleValues: Array<[string, unknown, "json" | "scalar"]> = [
    ["id", DEMO_SCHEDULE_ID, "scalar"],
    ["artist_id", DEMO_OPERATOR_ID, "scalar"],
    ["inquiry_id", DEMO_INQUIRY_ID, "scalar"],
    ["contract_id", scheduleContractId, "scalar"],
    ["title", "Private Venue Wedding Schedule", "scalar"],
    ["event_date", "2026-10-25", "scalar"],
    ["location", "Private Venue Ballroom", "scalar"],
    ["notes", "Local demo only. Review before save.", "scalar"],
    [
      "columns",
      [
        { id: "time", label: "Time", type: "time" },
        { id: "primary", label: "Primary Beauty Lead", type: "provider" },
        { id: "hair", label: "Preferred Hair Artist", type: "provider" },
        { id: "makeup", label: "Preferred Makeup Artist", type: "provider" },
        { id: "notes", label: "Notes", type: "text" },
      ],
      "json",
    ],
    [
      "rows",
      [
        { id: "row-setup", sortOrder: 1, cells: { time: "9:30 AM", primary: "Setup", hair: "Setup", makeup: "Setup", notes: "30 min setup for 3 providers" } },
        { id: "row-attendant-1", sortOrder: 2, cells: { time: "10:00 AM", primary: "Bridesmaid Makeup", hair: "Bridesmaid Hair", makeup: "Bridesmaid Makeup", notes: "Attendants open the morning" } },
        { id: "row-mother", sortOrder: 3, cells: { time: "11:30 AM", primary: "Mother Makeup", hair: "Mother Hair", makeup: "", notes: "Mother adjacent to bride" } },
        { id: "row-bride", sortOrder: 4, cells: { time: "12:00 PM", primary: "Bride Hair + Makeup", hair: "", makeup: "", notes: "Bride anchored midpoint-to-late" } },
        { id: "row-flower-girl", sortOrder: 5, cells: { time: "1:00 PM", primary: "", hair: "Flower Girl", makeup: "", notes: "Tail-end service" } },
        { id: "row-touchups", sortOrder: 6, cells: { time: "1:15 PM", primary: "Touch-Ups", hair: "Touch-Ups", makeup: "Touch-Ups", notes: "Ready by 1:20" } },
      ],
      "json",
    ],
    [
      "service_defaults",
      [
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
      "json",
    ],
    [
      "providers",
      [
        { id: "primary", name: "Primary Beauty Lead", capability: "ALL", isPrimary: true },
        { id: "hair", name: "Preferred Hair Artist", capability: "HAIR_ONLY", isPrimary: false },
        { id: "makeup", name: "Preferred Makeup Artist", capability: "MAKEUP_ONLY", isPrimary: false },
      ],
      "json",
    ],
    [
      "engine_metadata",
      {
        venueAccessTime: "09:30",
        photographerArrivalTime: "12:45",
        readyByTime: "13:20",
        ceremonyTime: "16:00",
        firstLookTime: "13:30",
      },
      "json",
    ],
    ["status", "draft", "scalar"],
    ["updated_at", now, "scalar"],
  ].filter(([column]) => availableColumns.has(column));

  const insertColumns = scheduleValues.map(([column]) => safeSqlIdentifier(column));
  const insertValues = scheduleValues.map(([, value, kind]) =>
    kind === "json" ? sql`${JSON.stringify(value)}::jsonb` : sql`${value}`,
  );
  const updateAssignments = scheduleValues
    .filter(([column]) => column !== "id")
    .map(([column]) => {
      const safeColumn = safeSqlIdentifier(column);
      return sql.raw(`${safeColumn} = excluded.${safeColumn}`);
    });

  await db.execute(sql`
    insert into schedule_drafts (${sql.raw(insertColumns.join(", "))})
    values (${sql.join(insertValues, sql`, `)})
    on conflict (id) do update set ${sql.join(updateAssignments, sql`, `)}
  `);

  const omittedOptionalColumns = ["engine_metadata"].filter((column) => !availableColumns.has(column));
  if (omittedOptionalColumns.length > 0) {
    console.log(
      `[local-demo-seed] Seeded schedule draft without unsupported optional columns: ${omittedOptionalColumns.join(", ")}`,
    );
  } else {
    console.log("[local-demo-seed] Seeded schedule draft.");
  }
}

async function seedCoordinationPath(
  db: { execute: (query: unknown) => Promise<unknown> },
  sql: typeof import("drizzle-orm").sql,
  now: Date,
): Promise<boolean> {
  const pathColumns = await getPublicTableColumns(db as any, sql, "coordination_paths");
  const requiredPathColumns = ["id", "operator_id", "inquiry_id"];
  const missingPathColumns = requiredPathColumns.filter((column) => !pathColumns.has(column));

  if (missingPathColumns.length > 0) {
    console.log(
      `[local-demo-seed] Skipping coordination path; missing columns: ${missingPathColumns.join(", ")}`,
    );
    return false;
  }

  const pathValues: Array<[string, unknown, "json" | "scalar"]> = [
    ["id", DEMO_COORDINATION_PATH_ID, "scalar"],
    ["operator_id", DEMO_OPERATOR_ID, "scalar"],
    ["inquiry_id", DEMO_INQUIRY_ID, "scalar"],
    ["route_target_id", DEMO_ROUTE_TARGET_SCHEDULER_ID, "scalar"],
    ["candidate_route_id", DEMO_CANDIDATE_HAIR_ID, "scalar"],
    ["status", "active", "scalar"],
    ["context_captured", true, "scalar"],
    [
      "timing_constraints",
      {
        bufferMinutes: 35,
        hardStopAt: "2026-10-25T13:20:00",
        readyByAt: "2026-10-25T13:20:00",
        notes: "Ready-by is known; recovery route still needs operator confirmation.",
      },
      "json",
    ],
    ["authority_state", "operator_review", "scalar"],
    ["availability_state", "needs_confirmation", "scalar"],
    ["handoff_state", "drafted", "scalar"],
    ["escalation_state", "none", "scalar"],
    ["recovery_capacity", "limited", "scalar"],
    ["commitment_state", "uncommitted", "scalar"],
    ["outcome_verification_state", "not_ready", "scalar"],
    ["path_risk", ["UNCONFIRMED_HANDOFF", "LOW_RECOVERY_CAPACITY"], "json"],
    [
      "signal_provenance",
      [
        `inquiry:${DEMO_INQUIRY_ID}`,
        `route_target:${DEMO_ROUTE_TARGET_SCHEDULER_ID}`,
        `schedule_draft:${DEMO_SCHEDULE_ID}`,
      ],
      "json",
    ],
    [
      "metadata",
      {
        demo: true,
        label: "Private venue bridal beauty handoff",
        safetyNote: "Local demo only. Nothing is sent from this path.",
      },
      "json",
    ],
    ["updated_at", now, "scalar"],
  ].filter(([column]) => pathColumns.has(column));

  const pathInsertColumns = pathValues.map(([column]) => safeSqlIdentifier(column));
  const pathInsertValues = pathValues.map(([, value, kind]) =>
    kind === "json" ? sql`${JSON.stringify(value)}::jsonb` : sql`${value}`,
  );
  const pathUpdateAssignments = pathValues
    .filter(([column]) => column !== "id")
    .map(([column]) => {
      const safeColumn = safeSqlIdentifier(column);
      return sql.raw(`${safeColumn} = excluded.${safeColumn}`);
    });

  await db.execute(sql`
    insert into coordination_paths (${sql.raw(pathInsertColumns.join(", "))})
    values (${sql.join(pathInsertValues, sql`, `)})
    on conflict (id) do update set ${sql.join(pathUpdateAssignments, sql`, `)}
  `);

  const eventColumns = await getPublicTableColumns(db as any, sql, "coordination_events");
  if (["id", "path_id", "operator_id", "inquiry_id", "event_type", "summary"].every((column) => eventColumns.has(column))) {
    const eventRows = [
      {
        id: DEMO_COORDINATION_EVENT_CONTEXT_ID,
        eventType: "context_captured",
        summary: "Inquiry context captured for private venue bridal beauty schedule.",
        signalProvenance: [`inquiry:${DEMO_INQUIRY_ID}`],
        metadata: { demo: true, contextCaptured: true },
      },
      {
        id: DEMO_COORDINATION_EVENT_TIMING_ID,
        eventType: "timing_constraints_reviewed",
        summary: "Ready-by time and photographer arrival are known; setup buffer is present.",
        signalProvenance: [`schedule_draft:${DEMO_SCHEDULE_ID}`],
        metadata: { demo: true, readyByTime: "13:20", setupBufferMinutes: 30 },
      },
      {
        id: DEMO_COORDINATION_EVENT_HANDOFF_ID,
        eventType: "handoff_drafted",
        summary: "Scheduler handoff is drafted but still requires human review before any outreach.",
        signalProvenance: [`route_target:${DEMO_ROUTE_TARGET_SCHEDULER_ID}`],
        metadata: { demo: true, externalSend: false },
      },
    ];

    for (const row of eventRows) {
      const eventValues: Array<[string, unknown, "json" | "scalar"]> = [
        ["id", row.id, "scalar"],
        ["path_id", DEMO_COORDINATION_PATH_ID, "scalar"],
        ["operator_id", DEMO_OPERATOR_ID, "scalar"],
        ["inquiry_id", DEMO_INQUIRY_ID, "scalar"],
        ["event_type", row.eventType, "scalar"],
        ["event_source", "system", "scalar"],
        ["summary", row.summary, "scalar"],
        ["signal_provenance", row.signalProvenance, "json"],
        ["metadata", row.metadata, "json"],
        ["created_at", now, "scalar"],
      ].filter(([column]) => eventColumns.has(column));
      const eventInsertColumns = eventValues.map(([column]) => safeSqlIdentifier(column));
      const eventInsertValues = eventValues.map(([, value, kind]) =>
        kind === "json" ? sql`${JSON.stringify(value)}::jsonb` : sql`${value}`,
      );
      const eventUpdateAssignments = eventValues
        .filter(([column]) => column !== "id")
        .map(([column]) => {
          const safeColumn = safeSqlIdentifier(column);
          return sql.raw(`${safeColumn} = excluded.${safeColumn}`);
        });

      await db.execute(sql`
        insert into coordination_events (${sql.raw(eventInsertColumns.join(", "))})
        values (${sql.join(eventInsertValues, sql`, `)})
        on conflict (id) do update set ${sql.join(eventUpdateAssignments, sql`, `)}
      `);
    }
  } else {
    console.log("[local-demo-seed] Skipping coordination events; coordination_events table is incomplete.");
  }

  const assessmentColumns = await getPublicTableColumns(db as any, sql, "coordination_assessments");
  if (["id", "path_id", "operator_id", "inquiry_id", "permission_decision", "recommended_next_action", "explanation"].every((column) => assessmentColumns.has(column))) {
    const assessmentValues: Array<[string, unknown, "json" | "scalar"]> = [
      ["id", DEMO_COORDINATION_ASSESSMENT_ID, "scalar"],
      ["path_id", DEMO_COORDINATION_PATH_ID, "scalar"],
      ["operator_id", DEMO_OPERATOR_ID, "scalar"],
      ["inquiry_id", DEMO_INQUIRY_ID, "scalar"],
      ["permission_decision", "PROCEED_WITH_OVERSIGHT", "scalar"],
      ["confidence", 72, "scalar"],
      ["risk_factors", ["UNCONFIRMED_HANDOFF", "LOW_RECOVERY_CAPACITY"], "json"],
      ["missing_signals", ["Route target acceptance", "Recovery provider confirmation"], "json"],
      ["recommended_next_action", "Review the drafted handoff and confirm recovery coverage before outreach.", "scalar"],
      ["explanation", "The path has enough context to continue internally, but handoff and recovery capacity still need human review.", "scalar"],
      [
        "signal_provenance",
        [
          `inquiry:${DEMO_INQUIRY_ID}`,
          `route_target:${DEMO_ROUTE_TARGET_SCHEDULER_ID}`,
          `coordination_path:${DEMO_COORDINATION_PATH_ID}`,
        ],
        "json",
      ],
      ["human_judgment_required", true, "scalar"],
      ["escalation_reasons", [], "json"],
      ["outcome_verification", "NOT_READY", "scalar"],
      ["created_at", now, "scalar"],
    ].filter(([column]) => assessmentColumns.has(column));
    const assessmentInsertColumns = assessmentValues.map(([column]) => safeSqlIdentifier(column));
    const assessmentInsertValues = assessmentValues.map(([, value, kind]) =>
      kind === "json" ? sql`${JSON.stringify(value)}::jsonb` : sql`${value}`,
    );
    const assessmentUpdateAssignments = assessmentValues
      .filter(([column]) => column !== "id")
      .map(([column]) => {
        const safeColumn = safeSqlIdentifier(column);
        return sql.raw(`${safeColumn} = excluded.${safeColumn}`);
      });

    await db.execute(sql`
      insert into coordination_assessments (${sql.raw(assessmentInsertColumns.join(", "))})
      values (${sql.join(assessmentInsertValues, sql`, `)})
      on conflict (id) do update set ${sql.join(assessmentUpdateAssignments, sql`, `)}
    `);
  } else {
    console.log("[local-demo-seed] Skipping coordination assessment; coordination_assessments table is incomplete.");
  }

  console.log("[local-demo-seed] Seeded coordination path demo.");
  return true;
}

async function cleanupCoordinationDemoRows(
  db: { execute: (query: unknown) => Promise<unknown> },
  sql: typeof import("drizzle-orm").sql,
): Promise<void> {
  const assessmentColumns = await getPublicTableColumns(db as any, sql, "coordination_assessments");
  if (assessmentColumns.has("path_id")) {
    await db.execute(sql`delete from coordination_assessments where path_id = ${DEMO_COORDINATION_PATH_ID}`);
  }

  const eventColumns = await getPublicTableColumns(db as any, sql, "coordination_events");
  if (eventColumns.has("path_id")) {
    await db.execute(sql`delete from coordination_events where path_id = ${DEMO_COORDINATION_PATH_ID}`);
  }

  const pathColumns = await getPublicTableColumns(db as any, sql, "coordination_paths");
  if (pathColumns.has("id")) {
    await db.execute(sql`delete from coordination_paths where id = ${DEMO_COORDINATION_PATH_ID}`);
  }
}

async function seedDemoData(password: string): Promise<void> {
  const bcrypt = await import("bcryptjs");
  const { eq, sql } = await import("drizzle-orm");
  const { db } = await import("../server/db");
  const {
    artistProfiles,
    inquiries,
    inquiryInternalNotes,
    inquiryResponses,
    inquiryRouteCandidates,
    inquiryRoutes,
    routeTargets,
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
    email: "private.client.demo@example.test",
    firstName: "Private",
    lastName: "Client",
    role: "client",
    intakeCompleted: false,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email: "private.client.demo@example.test",
      firstName: "Private",
      lastName: "Client",
      role: "client",
      intakeCompleted: false,
      updatedAt: now,
    },
  });

  await db.insert(artistProfiles).values({
    id: DEMO_PROFILE_ID,
    userId: DEMO_OPERATOR_ID,
    businessName: "Briarwood Local Demo Operator",
    bio: "Local demo profile for Briarwood operator preview.",
    location: "Local Market",
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
      businessName: "Briarwood Local Demo Operator",
      bio: "Local demo profile for Briarwood operator preview.",
      location: "Local Market",
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
    clientEmail: "private.client.demo@example.test",
    clientName: "Private Client",
    clientPhone: "+15550101010",
    eventDate,
    eventType: "wedding",
    eventLocation: "Private Venue Ballroom",
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
      clientEmail: "private.client.demo@example.test",
      clientName: "Private Client",
      clientPhone: "+15550101010",
      eventDate,
      eventType: "wedding",
      eventLocation: "Private Venue Ballroom",
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
      name: "Preferred Hair Artist",
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
      name: "Preferred Makeup Artist",
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
      name: "Backup Beauty Coordinator",
      email: "scheduler.demo@example.test",
      roleLabel: "Beauty Coordinator",
      tags: ["internal", "coordination"],
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

  const contractSeeded = await seedOptionalContractMetadata(db as any, sql, now);
  const scheduleContractId = contractSeeded ? DEMO_CONTRACT_ID : null;

  await db.update(inquiries)
    .set({ convertedToContractId: scheduleContractId, updatedAt: now })
    .where(eq(inquiries.id, DEMO_INQUIRY_ID));

  await seedScheduleDraft(db as any, sql, now, scheduleContractId);
  await seedCoordinationPath(db as any, sql, now);

  console.log("[local-demo-seed] Seeded local demo data.");
  console.log("[local-demo-seed] Login email: operator.demo@briarwood.test");
  console.log("[local-demo-seed] Open: http://localhost:5173/inquiry-workspace");
  console.log("[local-demo-seed] Open: http://localhost:5173/admin/briarwood-demo/network");
  console.log("[local-demo-seed] Open: http://localhost:5173/admin/briarwood-demo/schedules/demo-schedule-fairmont");
  console.log("[local-demo-seed] Open: http://localhost:5173/admin/briarwood-demo/coordination/demo-path-fairmont");
}

async function cleanupDemoData(): Promise<void> {
  const { eq, sql } = await import("drizzle-orm");
  const { db } = await import("../server/db");
  const {
    artistProfiles,
    inquiries,
    inquiryInternalNotes,
    inquiryResponses,
    inquiryRouteCandidates,
    inquiryRoutes,
    routeTargets,
    scheduleDrafts,
    users,
  } = await import("../shared/schema");

  await cleanupCoordinationDemoRows(db as any, sql);

  await db.update(inquiries)
    .set({ convertedToContractId: null, updatedAt: new Date() })
    .where(eq(inquiries.id, DEMO_INQUIRY_ID));

  await db.delete(inquiryRouteCandidates).where(eq(inquiryRouteCandidates.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryInternalNotes).where(eq(inquiryInternalNotes.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryResponses).where(eq(inquiryResponses.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(inquiryRoutes).where(eq(inquiryRoutes.inquiryId, DEMO_INQUIRY_ID));
  await db.delete(scheduleDrafts).where(eq(scheduleDrafts.id, DEMO_SCHEDULE_ID));
  await db.execute(sql`delete from contracts where id = ${DEMO_CONTRACT_ID}`);
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
