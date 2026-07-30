import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} was not found`,
    },
    meta: {
      requestId: res.locals.requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const apiError = error instanceof ApiError ? error : null;
  const statusCode = apiError?.statusCode ?? 500;

  if (!apiError) {
    console.error("Unhandled API error:", error);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: apiError?.code ?? "INTERNAL_SERVER_ERROR",
      message: apiError?.message ?? "An unexpected error occurred",
      ...(apiError?.details === undefined ? {} : { details: apiError.details }),
    },
    meta: {
      requestId: res.locals.requestId,
      timestamp: new Date().toISOString(),
    },
  });
};
