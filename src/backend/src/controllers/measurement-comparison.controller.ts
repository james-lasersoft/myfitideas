import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  compareMeasurementSessions,
  MeasurementComparisonError,
} from "../services/measurement-comparison.service.js";

export const compareMeasurements = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ code: "AUTHENTICATION_REQUIRED" });
    return;
  }

  const baselineSessionId = typeof req.query.baselineSessionId === "string"
    ? req.query.baselineSessionId.trim()
    : "";
  const comparisonSessionId = typeof req.query.comparisonSessionId === "string"
    ? req.query.comparisonSessionId.trim()
    : "";
  if (!baselineSessionId || !comparisonSessionId) {
    res.status(400).json({ code: "MEASUREMENT_COMPARISON_IDS_REQUIRED" });
    return;
  }

  try {
    const comparison = await compareMeasurementSessions(
      req.user.id,
      baselineSessionId,
      comparisonSessionId
    );
    res.status(200).json(comparison);
  } catch (error) {
    if (error instanceof MeasurementComparisonError) {
      res.status(error.statusCode).json({ code: error.code });
      return;
    }
    console.error("Compare measurements error:", error);
    res.status(500).json({ code: "MEASUREMENT_COMPARISON_FAILED" });
  }
};
