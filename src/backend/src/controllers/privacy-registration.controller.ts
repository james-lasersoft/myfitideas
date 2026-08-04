import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { writeAuditLog } from "../services/audit.service.js";

interface PrivacyRegistrationBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  privacyAcknowledged?: boolean;
  aggregateAnalyticsEnabled?: boolean;
}

const TERMS_VERSION = "2026-08-04";
const PRIVACY_NOTICE_VERSION = "2026-08-04";
const SECURITY_NOTICE_VERSION = "2026-08-04";

export const registerWithPrivacy = async (
  req: Request<Record<string, never>, unknown, PrivacyRegistrationBody>,
  res: Response
): Promise<void> => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim() || null;
    const privacyAcknowledged = req.body.privacyAcknowledged === true;
    const aggregateAnalyticsEnabled = req.body.aggregateAnalyticsEnabled === true;

    if (!email || !password || !firstName) {
      res.status(400).json({ error: "Email, password, and first name are required." });
      return;
    }
    if (!privacyAcknowledged) {
      res.status(400).json({ error: "You must acknowledge the Terms and Privacy Notice to create an account." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must contain at least 8 characters." });
      return;
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    const [organization, freeRole, freePlan] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: "myfitideas" } }),
      prisma.role.findFirst({ where: { key: "free-user", organization: { slug: "myfitideas" } } }),
      prisma.subscriptionPlan.findUnique({ where: { key: "free" } }),
    ]);

    if (!organization || !freeRole || !freePlan) {
      res.status(503).json({ error: "Account registration is temporarily unavailable." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, firstName, lastName, status: "ACTIVE" },
      });
      const membership = await tx.organizationMembership.create({
        data: { userId: created.id, organizationId: organization.id, status: "ACTIVE" },
      });
      await tx.membershipRole.create({ data: { membershipId: membership.id, roleId: freeRole.id } });
      await tx.userSubscription.create({ data: { userId: created.id, planId: freePlan.id, status: "ACTIVE" } });
      return created;
    });

    const requestMetadata = {
      termsVersion: TERMS_VERSION,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      securityNoticeVersion: SECURITY_NOTICE_VERSION,
      approximateLocationMethod: "IP_GEOLOCATION",
      preciseGpsCollected: false,
    };

    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "USER_REGISTERED",
      targetType: "User",
      targetId: user.id,
      request: req,
    });
    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "PRIVACY_NOTICE_ACKNOWLEDGED",
      targetType: "User",
      targetId: user.id,
      afterState: requestMetadata,
      request: req,
    });
    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "SECURITY_TELEMETRY_ACKNOWLEDGED",
      targetType: "User",
      targetId: user.id,
      afterState: requestMetadata,
      request: req,
    });
    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: aggregateAnalyticsEnabled
        ? "AGGREGATE_ANALYTICS_OPTED_IN"
        : "AGGREGATE_ANALYTICS_OPTED_OUT",
      targetType: "User",
      targetId: user.id,
      afterState: {
        enabled: aggregateAnalyticsEnabled,
        purpose: "DEIDENTIFIED_AGGREGATE_PRODUCT_STATISTICS",
      },
      request: req,
    });
    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: "SUBSCRIPTION_ASSIGNED",
      targetType: "SubscriptionPlan",
      targetId: freePlan.id,
      afterState: { plan: "free" },
      request: req,
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      privacy: {
        termsVersion: TERMS_VERSION,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        securityNoticeVersion: SECURITY_NOTICE_VERSION,
        aggregateAnalyticsEnabled,
      },
    });
  } catch (error) {
    console.error("Privacy-aware registration error:", error);
    res.status(500).json({ error: "An unexpected error occurred during registration." });
  }
};
