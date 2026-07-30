import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

const buildMeta = (res: Response, pagination?: PaginationMeta): ResponseMeta => ({
  requestId: String(res.locals.requestId ?? "unknown"),
  timestamp: new Date().toISOString(),
  ...(pagination ? { pagination } : {}),
});

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: PaginationMeta,
): Response => res.status(statusCode).json({
  success: true,
  data,
  meta: buildMeta(res, pagination),
});

export const sendCreated = <T>(res: Response, data: T): Response =>
  sendSuccess(res, data, 201);
