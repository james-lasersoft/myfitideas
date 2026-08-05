import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { getAuthorizationSnapshot } from "../services/authorization.service.js";

export interface AuthorizedRequest extends AuthenticatedRequest {
  authorization?: Awaited<ReturnType<typeof getAuthorizationSnapshot>>;
}

export function requirePermission(permission: string) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    try {
      const organizationId = typeof req.headers["x-organization-id"] === "string"
        ? req.headers["x-organization-id"]
        : undefined;
      const snapshot = await getAuthorizationSnapshot(req.user.id, organizationId);
      req.authorization = snapshot;

      if (!snapshot.permissions.includes(permission)) {
        res.status(403).json({
          error: "You do not have permission to perform this action.",
          requiredPermission: permission,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
