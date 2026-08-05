import crypto from "node:crypto";
import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { writeAuditLog } from "../services/audit.service.js";

const SETTING_KEY = "security.ipGeolocation";
const CATEGORY = "security";
const SUPPORTED_PROVIDERS = ["disabled", "ipinfo", "custom"] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

interface GeolocationSettings {
  enabled: boolean;
  provider: Provider;
  credentialEnvironmentVariable: string;
  lookupOnNewLoginOnly: boolean;
  retainApproximateCoordinates: boolean;
  displayCityRegionCountry: boolean;
  testMode: boolean;
}

const defaults: GeolocationSettings = {
  enabled: false,
  provider: "disabled",
  credentialEnvironmentVariable: "",
  lookupOnNewLoginOnly: true,
  retainApproximateCoordinates: false,
  displayCityRegionCountry: true,
  testMode: true,
};

function normalizeSettings(value: unknown): GeolocationSettings {
  const input = value && typeof value === "object" ? value as Partial<GeolocationSettings> : {};
  const provider = SUPPORTED_PROVIDERS.includes(input.provider as Provider) ? input.provider as Provider : defaults.provider;
  return {
    enabled: input.enabled === true,
    provider,
    credentialEnvironmentVariable: typeof input.credentialEnvironmentVariable === "string" ? input.credentialEnvironmentVariable.trim() : "",
    lookupOnNewLoginOnly: input.lookupOnNewLoginOnly !== false,
    retainApproximateCoordinates: input.retainApproximateCoordinates === true,
    displayCityRegionCountry: input.displayCityRegionCountry !== false,
    testMode: input.testMode !== false,
  };
}

async function organizationIdFor(userId: string): Promise<string | null> {
  const authorization = await getAuthorizationSnapshot(userId);
  return authorization.organizationId;
}

export async function getGeolocationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const organizationId = await organizationIdFor(req.user.id);
  if (!organizationId) { res.status(404).json({ error: "Organization not found." }); return; }

  const rows = await prisma.$queryRaw<Array<{ value: unknown }>>`
    SELECT "value" FROM "organization_settings"
    WHERE "organizationId" = ${organizationId} AND "key" = ${SETTING_KEY}
    LIMIT 1
  `;
  const settings = normalizeSettings(rows[0]?.value);
  const credentialConfigured = settings.credentialEnvironmentVariable.length > 0
    && Boolean(process.env[settings.credentialEnvironmentVariable]);

  res.status(200).json({
    settings,
    capabilities: {
      supportedProviders: SUPPORTED_PROVIDERS,
      credentialConfigured,
      secretsStoredInDatabase: false,
      preciseGpsCollected: false,
    },
  });
}

export async function updateGeolocationSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: "Authentication is required." }); return; }
  const organizationId = await organizationIdFor(req.user.id);
  if (!organizationId) { res.status(404).json({ error: "Organization not found." }); return; }

  const settings = normalizeSettings(req.body);
  if (settings.enabled && settings.provider === "disabled") {
    res.status(400).json({ error: "Select a geolocation provider before enabling lookups." });
    return;
  }
  if (settings.credentialEnvironmentVariable && !/^[A-Z][A-Z0-9_]*$/.test(settings.credentialEnvironmentVariable)) {
    res.status(400).json({ error: "Credential environment variable must use uppercase letters, numbers, and underscores." });
    return;
  }

  const before = await prisma.$queryRaw<Array<{ value: unknown }>>`
    SELECT "value" FROM "organization_settings"
    WHERE "organizationId" = ${organizationId} AND "key" = ${SETTING_KEY}
    LIMIT 1
  `;
  const id = crypto.randomUUID();
  const serialized = JSON.stringify(settings);
  await prisma.$executeRaw`
    INSERT INTO "organization_settings" ("id", "organizationId", "category", "key", "value", "createdAt", "updatedAt")
    VALUES (${id}, ${organizationId}, ${CATEGORY}, ${SETTING_KEY}, ${serialized}::jsonb, NOW(), NOW())
    ON CONFLICT ("organizationId", "key")
    DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
  `;

  await writeAuditLog({
    organizationId,
    actorUserId: req.user.id,
    action: "GEOLOCATION_PROVIDER_SETTINGS_UPDATED",
    targetType: "OrganizationSetting",
    targetId: SETTING_KEY,
    beforeState: normalizeSettings(before[0]?.value),
    afterState: settings,
    request: req,
  });

  res.status(200).json({
    message: "Geolocation provider settings updated.",
    settings,
    capabilities: {
      supportedProviders: SUPPORTED_PROVIDERS,
      credentialConfigured: settings.credentialEnvironmentVariable.length > 0
        && Boolean(process.env[settings.credentialEnvironmentVariable]),
      secretsStoredInDatabase: false,
      preciseGpsCollected: false,
    },
  });
}
