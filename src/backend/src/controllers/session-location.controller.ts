import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { lookupIpGeolocation } from "../services/ip-geolocation.service.js";

export async function enrichCurrentSessionLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.sessionId) {
    res.status(401).json({ error: "Authentication is required." });
    return;
  }

  try {
    const session = await prisma.userSession.findFirst({
      where: { id: req.user.sessionId, userId: req.user.id },
      select: { id: true, ipAddress: true, locationLookedUpAt: true },
    });

    if (!session) {
      res.status(404).json({ error: "The current session was not found." });
      return;
    }

    if (session.locationLookedUpAt) {
      res.status(200).json({ enriched: false, reason: "already_enriched" });
      return;
    }

    const location = await lookupIpGeolocation(session.ipAddress);
    if (!location) {
      res.status(200).json({ enriched: false, reason: "location_unavailable" });
      return;
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        locationCity: location.city,
        locationRegion: location.region,
        locationCountry: location.country,
        locationCountryCode: location.countryCode,
        locationTimezone: location.timezone,
        locationLatitude: location.latitude,
        locationLongitude: location.longitude,
        locationProvider: location.provider,
        locationLookedUpAt: location.lookedUpAt,
      },
    });

    res.status(200).json({ enriched: true, provider: location.provider });
  } catch (error) {
    console.error("Enrich current session location error:", error);
    res.status(500).json({ error: "Unable to enrich the current session location." });
  }
}
