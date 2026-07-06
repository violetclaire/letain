const envFlag = (value: unknown): boolean => value === "true";

export const enableAssistantDelayedPromptControls = envFlag(
  import.meta.env.VITE_ENABLE_ASSISTANT_DELAYED_PROMPT_CONTROLS,
);

export const enablePaymentsUi = envFlag(import.meta.env.VITE_ENABLE_PAYMENTS_UI);

export const enableInvoicesUi = envFlag(import.meta.env.VITE_ENABLE_INVOICES_UI);

export const enableContractsUi = envFlag(import.meta.env.VITE_ENABLE_CONTRACTS_UI);

export const enableLegacyClientCreationUi = envFlag(
  import.meta.env.VITE_ENABLE_LEGACY_CLIENT_CREATION_UI,
);
