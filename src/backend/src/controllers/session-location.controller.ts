import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";
import { lookupIpGeolocation } from "../services/ip-geolocation.service.js";

interface SessionRow {
  id: string;
  ipAddress: string | null;
  locationLookedUpAt: Date | null;
}

interface StoredSettings {
  enabled?: boolean;
  provider?: string;
  credentialEnvironmentVariable?: string;
  lookupOnNewLoginOnly?: boolean;
  retainApproximateCoordinates?: boolean;
  testMode?: boolean;
}

export async function enrichCurrentSessionLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.sessionId) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  try {
    const sessions = await prisma.$queryRaw<SessionRow[]>`
      SELECT "id", "ipAddress", "locationLookedUpAt"
      FROM "user_sessions"
      WHERE "id" = ${req.user.sessionId} AND "userId" = ${req.user.id}
      LIMIT 1
    `;
    const session = sessions[0];
    if (!session) {
      res.status(404).json({ error: "The current session was not found." });
      return;
    }
    if (session.locationLookedUpAt) {
      res.status(200).json({ enriched: false, reason: "already_enriched" });
      return;
    }

    const authorization = await getAuthorizationSnapshot(req.user.id);
    if (!authorization.organizationId) {
      res.status(200).json({ enriched: false, reason: "provider_disabled" });
      return;
    }

    const rows = await prisma.$queryRaw<Array<{ value: StoredSettings }>>`
      SELECT "value" FROM "organization_settings"
      WHERE "organizationId" = ${authorization.organizationId}
        AND "key" = 'security.ipGeolocation'
      LIMIT 1
    `;
    const settings = rows[0]?.value ?? {};
    if (settings.testMode === true || settings.enabled !== true || !settings.provider || settings.provider === "disabled") {
      res.status(200).json({ enriched: false, reason: settings.testMode === true ? "test_mode" : "provider_disabled" });
      return;
    }

    const location = await lookupIpGeolocation(session.ipAddress, {
      provider: settings.provider,
      credentialEnvironmentVariable: settings.credentialEnvironmentVariable,
      retainApproximateCoordinates: settings.retainApproximateCoordinates === true,
    });
    if (!location) {
      res.status(200).json({ enriched: false, reason: "location_unavailable" });
      return;
    }

    await prisma.$executeRaw`
      UPDATE "user_sessions"
      SET "locationCity" = ${location.city},
          "locationRegion" = ${location.region},
          "locationCountry" = ${location.country},
          "locationCountryCode" = ${location.countryCode},
          "locationTimezone" = ${location.timezone},
          "locationLatitude" = ${location.latitude},
          "locationLongitude" = ${location.longitude},
          "locationProvider" = ${location.provider},
          "locationLookedUpAt" = ${location.lookedUpAt}
      WHERE "id" = ${session.id}
    `;

    res.status(200).json({ enriched: true, provider: location.provider });
  } catch (error) {
    console.error("Enrich current session location error:", error);
    res.status(500).json({ error: "Unable to enrich the current session location." });
  }
}
