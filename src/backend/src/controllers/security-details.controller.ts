import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const TRUSTED_DEVICE_PREFIX = "trusted:";

type SecurityRecord = {
  id: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  locationCountryCode: string | null;
  locationTimezone: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationProvider: string | null;
  locationLookedUpAt: Date | null;
};

function presentLocation(record: SecurityRecord) {
  return {
    city: record.locationCity,
    region: record.locationRegion,
    country: record.locationCountry,
    countryCode: record.locationCountryCode,
    timezone: record.locationTimezone,
    latitude: record.locationLatitude,
    longitude: record.locationLongitude,
    provider: record.locationProvider,
    lookedUpAt: record.locationLookedUpAt,
    method: "IP_GEOLOCATION",
    preciseGpsCollected: false,
  };
}

export async function listOwnSecurityDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  try {
    const records = await prisma.$queryRaw<SecurityRecord[]>`
      SELECT "id", "tokenHash", "userAgent", "ipAddress", "createdAt", "lastSeenAt",
             "expiresAt", "refreshExpiresAt", "locationCity", "locationRegion",
             "locationCountry", "locationCountryCode", "locationTimezone",
             "locationLatitude", "locationLongitude", "locationProvider", "locationLookedUpAt"
      FROM "user_sessions"
      WHERE "userId" = ${req.user.id}
        AND "revokedAt" IS NULL
        AND COALESCE("refreshExpiresAt", "expiresAt") > NOW()
      ORDER BY "lastSeenAt" DESC
      LIMIT 50
    `;

    const sessions = records
      .filter((record) => !record.tokenHash.startsWith(TRUSTED_DEVICE_PREFIX))
      .map((record) => ({
        id: record.id,
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
        createdAt: record.createdAt,
        lastSeenAt: record.lastSeenAt,
        refreshExpiresAt: record.refreshExpiresAt,
        current: record.id === req.user?.sessionId,
        location: presentLocation(record),
      }));
    const devices = records
      .filter((record) => record.tokenHash.startsWith(TRUSTED_DEVICE_PREFIX))
      .map((record) => ({
        id: record.id,
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
        createdAt: record.createdAt,
        lastSeenAt: record.lastSeenAt,
        expiresAt: record.expiresAt,
        location: presentLocation(record),
      }));

    res.status(200).json({ sessions, devices });
  } catch (error) {
    console.error("List security details error:", error);
    res.status(500).json({ error: "Unable to load session and trusted-device details." });
  }
}
