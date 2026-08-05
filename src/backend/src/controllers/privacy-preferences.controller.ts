import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { writeAuditLog } from "../services/audit.service.js";

const ANALYTICS_ACTIONS = [
  "AGGREGATE_ANALYTICS_OPTED_IN",
  "AGGREGATE_ANALYTICS_OPTED_OUT",
] as const;

async function readAnalyticsPreference(userId: string): Promise<boolean> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      actorUserId: userId,
      action: { in: [...ANALYTICS_ACTIONS] },
      targetType: "User",
      targetId: userId,
    },
    orderBy: { createdAt: "desc" },
    select: { action: true },
  });

  return latest?.action === "AGGREGATE_ANALYTICS_OPTED_IN";
}

export async function getPrivacyPreferences(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const aggregateAnalyticsEnabled = await readAnalyticsPreference(userId);
    res.status(200).json({
      preferences: {
        aggregateAnalyticsEnabled,
        preciseGpsCollected: false,
        approximateLocationMethod: "IP_GEOLOCATION",
      },
    });
  } catch (error) {
    console.error("Get privacy preferences error:", error);
    res.status(500).json({ error: "Unable to retrieve privacy preferences." });
  }
}

export async function updatePrivacyPreferences(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    const enabled = (req.body as { aggregateAnalyticsEnabled?: unknown }).aggregateAnalyticsEnabled;
    if (typeof enabled !== "boolean") {
      res.status(400).json({ error: "Aggregate analytics preference must be true or false." });
      return;
    }

    const current = await readAnalyticsPreference(userId);
    if (current !== enabled) {
      await writeAuditLog({
        actorUserId: userId,
        action: enabled ? "AGGREGATE_ANALYTICS_OPTED_IN" : "AGGREGATE_ANALYTICS_OPTED_OUT",
        targetType: "User",
        targetId: userId,
        beforeState: {
          enabled: current,
          purpose: "DEIDENTIFIED_AGGREGATE_PRODUCT_STATISTICS",
        },
        afterState: {
          enabled,
          purpose: "DEIDENTIFIED_AGGREGATE_PRODUCT_STATISTICS",
        },
        request: req,
      });
    }

    res.status(200).json({
      message: "Privacy preferences updated successfully.",
      preferences: {
        aggregateAnalyticsEnabled: enabled,
        preciseGpsCollected: false,
        approximateLocationMethod: "IP_GEOLOCATION",
      },
    });
  } catch (error) {
    console.error("Update privacy preferences error:", error);
    res.status(500).json({ error: "Unable to update privacy preferences." });
  }
}
