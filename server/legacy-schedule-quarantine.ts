type Environment = Record<string, string | undefined>;

function enabled(environment: Environment, name: string) {
  return environment[name] === "true";
}

export function getLegacyScheduleQuarantinePolicy(
  environment: Environment = process.env,
) {
  return {
    allowDraftReads: enabled(environment, "ENABLE_LEGACY_PUBLIC_DRAFT_SCHEDULE_READ"),
    allowGuestMutations: enabled(environment, "ENABLE_LEGACY_PUBLIC_SCHEDULE_MUTATIONS"),
    allowAiChat: enabled(environment, "ENABLE_LEGACY_PUBLIC_SCHEDULE_AI_CHAT"),
    allowAutomaticEmailNotifications: enabled(
      environment,
      "ENABLE_LEGACY_PUBLIC_SCHEDULE_EMAIL_NOTIFICATIONS",
    ),
    allowGlobalCollaborationApis: enabled(
      environment,
      "ENABLE_LEGACY_GLOBAL_SCHEDULE_COLLAB_APIS",
    ),
  };
}

export function canReadLegacySharedSchedule(
  status: unknown,
  environment: Environment = process.env,
) {
  if (status === "finalized" || status === "sent") {
    return true;
  }

  return status === "draft" && getLegacyScheduleQuarantinePolicy(environment).allowDraftReads;
}
