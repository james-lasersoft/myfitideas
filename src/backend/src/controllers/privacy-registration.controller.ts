import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import { writeAuditLog } from "../services/audit.service.js";

interface PrivacyRegistrationBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage?: string;
  timezone?: string;
  countryCode?: string;
  termsAccepted?: boolean;
  privacyAcknowledged?: boolean;
  aggregateAnalyticsEnabled?: boolean;
}

interface EmailAvailabilityBody { email?: string }

const TERMS_VERSION = "2026-08-04";
const PRIVACY_NOTICE_VERSION = "2026-08-04";
const SECURITY_NOTICE_VERSION = "2026-08-04";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const LANGUAGE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

function passwordRequirementsMet(password: string): boolean {
  return password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export const checkEmailAvailability = async (
  req: Request<Record<string, never>, unknown, EmailAvailabilityBody>,
  res: Response
): Promise<void> => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    res.status(400).json({ available: false, error: "Enter a valid email address." });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  res.status(200).json({ available: !existing });
};

export const registerWithPrivacy = async (
  req: Request<Record<string, never>, unknown, PrivacyRegistrationBody>,
  res: Response
): Promise<void> => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password ?? "";
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim() || null;
    const preferredLanguage = req.body.preferredLanguage?.trim() || "en-US";
    const timezone = req.body.timezone?.trim() || "UTC";
    const countryCode = req.body.countryCode?.trim().toUpperCase() || "US";
    const termsAccepted = req.body.termsAccepted === true;
    const privacyAcknowledged = req.body.privacyAcknowledged === true;
    const aggregateAnalyticsEnabled = req.body.aggregateAnalyticsEnabled === true;

    if (!email || !EMAIL_PATTERN.test(email) || !firstName) {
      res.status(400).json({ error: "A valid email address and first name are required." });
      return;
    }
    if (!termsAccepted || !privacyAcknowledged) {
      res.status(400).json({ error: "You must accept the Terms and acknowledge the Privacy Notice to create an account." });
      return;
    }
    if (!passwordRequirementsMet(password)) {
      res.status(400).json({ error: "Password does not meet the security requirements." });
      return;
    }
    if (!COUNTRY_PATTERN.test(countryCode) || !LANGUAGE_PATTERN.test(preferredLanguage) || timezone.length > 100) {
      res.status(400).json({ error: "Country, language, or timezone selection is invalid." });
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
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          status: "PENDING_VERIFICATION",
          preferredLanguage,
          timezone,
          countryCode,
        },
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
      preferredLanguage,
      timezone,
      countryCode,
      approximateLocationMethod: "IP_GEOLOCATION",
      preciseGpsCollected: false,
    };

    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "USER_REGISTERED_PENDING_VERIFICATION", targetType: "User", targetId: user.id, afterState: { status: user.status }, request: req });
    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "TERMS_ACCEPTED", targetType: "User", targetId: user.id, afterState: requestMetadata, request: req });
    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "PRIVACY_NOTICE_ACKNOWLEDGED", targetType: "User", targetId: user.id, afterState: requestMetadata, request: req });
    await writeAuditLog({ organizationId: organization.id, actorUserId: user.id, action: "SECURITY_TELEMETRY_ACKNOWLEDGED", targetType: "User", targetId: user.id, afterState: requestMetadata, request: req });
    await writeAuditLog({
      organizationId: organization.id,
      actorUserId: user.id,
      action: aggregateAnalyticsEnabled ? "AGGREGATE_ANALYTICS_OPTED_IN" : "AGGREGATE_ANALYTICS_OPTED_OUT",
      targetType: "User",
      targetId: user.id,
      afterState: { enabled: aggregateAnalyticsEnabled, purpose: "DEIDENTIFIED_AGGREGATE_PRODUCT_STATISTICS" },
      request: req,
    });

    res.status(201).json({
      message: "Account created. Email verification is required.",
      verificationRequired: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        preferredLanguage: user.preferredLanguage,
        timezone: user.timezone,
        countryCode: user.countryCode,
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
