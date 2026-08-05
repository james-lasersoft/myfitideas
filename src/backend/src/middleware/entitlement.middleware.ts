import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { hasEntitlement } from "../services/entitlement.service.js";

export function requireEntitlement(entitlement: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication is required." });
      return;
    }

    try {
      if (!(await hasEntitlement(req.user.id, entitlement))) {
        res.status(403).json({
          error: "Your subscription does not include this feature.",
          requiredEntitlement: entitlement,
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
