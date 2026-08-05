import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";

const SETTING_KEY = "integrations.providers";
const CATEGORY = "integrations";

const EMAIL_PROVIDERS = ["disabled", "console", "smtp", "ses", "sendgrid", "mailgun", "postmark", "custom"] as const;
const BILLING_PROVIDERS = ["disabled", "manual", "stripe", "paddle", "braintree", "adyen", "custom"] as const;

type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
type BillingProvider = (typeof BILLING_PROVIDERS)[number];
type ProviderMode = "test" | "production";

interface ProviderConfiguration<TProvider extends string> {
  enabled: boolean;
  provider: TProvider;
  mode: ProviderMode;
  credentialEnvironmentVariable: string;
  secondaryCredentialEnvironmentVariable: string;
  configuration: Record<string, string>;
}

interface IntegrationSettings {
  email: ProviderConfiguration<EmailProvider>;
  billing: ProviderConfiguration<BillingProvider>;
}

const defaults: IntegrationSettings = {
  email: {
    enabled: false,
    provider: "console",
    mode: "test",
    credentialEnvironmentVariable: "",
    secondaryCredentialEnvironmentVariable: "",
    configuration: { fromAddress: "", fromName: "MyFitIdeas" },
  },
  billing: {
    enabled: false,
    provider: "disabled",
    mode: "test",
    credentialEnvironmentVariable: "",
    secondaryCredentialEnvironmentVariable: "",
    configuration: { webhookSecretEnvironmentVariable: "" },
  },
};

function normalizeEnvironmentVariable(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeConfiguration(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "string") as Array<[string, string]>);
}

function normalizeProvider<TProvider extends string>(
  value: unknown,
  supported: readonly TProvider[],
  fallback: ProviderConfiguration<TProvider>,
): ProviderConfiguration<TProvider> {
  const input = value && typeof value === "object" ? value as Partial<ProviderConfiguration<TProvider>> : {};
  return {
    enabled: input.enabled === true,
    provider: supported.includes(input.provider as TProvider) ? input.provider as TProvider : fallback.provider,
    mode: input.mode === "production" ? "production" : "test",
    credentialEnvironmentVariable: normalizeEnvironmentVariable(input.credentialEnvironmentVariable),
    secondaryCredentialEnvironmentVariable: normalizeEnvironmentVariable(input.secondaryCredentialEnvironmentVariable),
    configuration: { ...fallback.configuration, ...normalizeConfiguration(input.configuration) },
  };
}

function normalizeSettings(value: unknown): IntegrationSettings {
  const input = value && typeof value === "object" ? value as Partial<IntegrationSettings> : {};
  return {
    email: normalizeProvider(input.email, EMAIL_PROVIDERS, defaults.email),
    billing: normalizeProvider(input.billing, BILLING_PROVIDERS, defaults.billing),
  };
}

function validateEnvironmentVariables(settings: IntegrationSettings): string | null {
  const values = [
    settings.email.credentialEnvironmentVariable,
    settings.email.secondaryCredentialEnvironmentVariable,
    settings.billing.credentialEnvironmentVariable,
    settings.billing.secondaryCredentialEnvironmentVariable,
    settings.billing.configuration.webhookSecretEnvironmentVariable ?? "",
  ].filter(Boolean);
  return values.every((value) => /^[A-Z][A-Z0-9_]*$/.test(value))
    ? null
    : "Credential environment variables must use uppercase letters, numbers, and underscores.";
}

async function organizationIdFor(userId: string): Promise<string | null> {
  const authorization = await getAuthorizationSnapshot(userId);
  return authorization.organizationId;
}

function credentialConfigured(variableName: string): boolean {
  return Boolean(variableName && process.env[variableName]);
}

function responseFor(settings: IntegrationSettings) {
  return {
    settings,
    capabilities: {
      supportedEmailProviders: EMAIL_PROVIDERS,
      supportedBillingProviders: BILLING_PROVIDERS,
      secretsStoredInDatabase: false,
      emailCredentialConfigured: credentialConfigured(settings.email.credentialEnvironmentVariable),
      billingCredentialConfigured: credentialConfigured(settings.billing.credentialEnvironmentVariable),
      billingSecondaryCredentialConfigured: credentialConfigured(settings.billing.secondaryCredentialEnvironmentVariable),
    },
  };
}

export async function getIntegrationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const organizationId = await organizationIdFor(req.user.id);
  if (!organizationId) { res.status(404).json({ error: "Organization not found." }); return; }

  const rows = await prisma.$queryRaw<Array<{ value: unknown }>>`
    SELECT "value" FROM "organization_settings"
    WHERE "organizationId" = ${organizationId} AND "key" = ${SETTING_KEY}
    LIMIT 1
  `;
  res.status(200).json(responseFor(normalizeSettings(rows[0]?.value)));
}

export async function updateIntegrationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const organizationId = await organizationIdFor(req.user.id);
  if (!organizationId) { res.status(404).json({ error: "Organization not found." }); return; }

  const settings = normalizeSettings(req.body);
  const validationError = validateEnvironmentVariables(settings);
  if (validationError) { res.status(400).json({ error: validationError }); return; }
  if (settings.email.enabled && settings.email.provider === "disabled") {
    res.status(400).json({ error: "Select an email provider before enabling email delivery." }); return;
  }
  if (settings.billing.enabled && settings.billing.provider === "disabled") {
    res.status(400).json({ error: "Select a billing provider before enabling billing." }); return;
  }

  const before = await prisma.$queryRaw<Array<{ value: unknown }>>`
    SELECT "value" FROM "organization_settings"
    WHERE "organizationId" = ${organizationId} AND "key" = ${SETTING_KEY}
    LIMIT 1
  `;
  const serialized = JSON.stringify(settings);
  await prisma.$executeRaw`
    INSERT INTO "organization_settings" ("id", "organizationId", "category", "key", "value", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${organizationId}, ${CATEGORY}, ${SETTING_KEY}, ${serialized}::jsonb, NOW(), NOW())
    ON CONFLICT ("organizationId", "key")
    DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
  `;

  await writeAuditLog({
    organizationId,
    actorUserId: req.user.id,
    action: "INTEGRATION_PROVIDER_SETTINGS_UPDATED",
    targetType: "OrganizationSetting",
    targetId: SETTING_KEY,
    beforeState: normalizeSettings(before[0]?.value),
    afterState: settings,
    request: req,
  });

  res.status(200).json({ message: "Integration provider settings updated.", ...responseFor(settings) });
}
