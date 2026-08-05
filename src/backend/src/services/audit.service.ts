import type { Request } from "express";
import prisma from "../config/prisma.js";

interface AuditInput {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  result?: "SUCCESS" | "FAILURE" | "DENIED";
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
  request?: Request;
}

function jsonValue(value: unknown): object | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      result: input.result ?? "SUCCESS",
      ipAddress: input.request?.ip ?? null,
      userAgent: input.request?.get("user-agent") ?? null,
      beforeState: jsonValue(input.beforeState),
      afterState: jsonValue(input.afterState),
      metadata: jsonValue(input.metadata),
    },
  });
}
