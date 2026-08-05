import type { Response } from "express";
import prisma from "../config/prisma.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const VALID_STATUSES = ["DRAFT", "REVIEWED", "PUBLISHED"] as const;
type TranslationStatusValue = (typeof VALID_STATUSES)[number];

function requireUserId(req: AuthenticatedRequest, res: Response): string | null {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Authentication is required." });
    return null;
  }
  return userId;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function listLanguages(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!requireUserId(req, res)) return;
  const languages = await prisma.language.findMany({ orderBy: [{ isSource: "desc" }, { displayName: "asc" }] });
  res.json({ languages });
}

export async function listTranslations(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!requireUserId(req, res)) return;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const status = typeof req.query.status === "string" && VALID_STATUSES.includes(req.query.status as TranslationStatusValue)
    ? req.query.status as TranslationStatusValue
    : undefined;

  const keys = await prisma.translationKey.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(search ? { OR: [
        { key: { contains: search, mode: "insensitive" } },
        { sourceText: { contains: search, mode: "insensitive" } },
        { translations: { some: { value: { contains: search, mode: "insensitive" } } } },
      ] } : {}),
      ...(status ? { translations: { some: { status: status as never } } } : {}),
    },
    include: { translations: { include: { language: true }, orderBy: { language: { locale: "asc" } } } },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  const categories = await prisma.translationKey.findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } });
  res.json({ translations: keys, categories: categories.map((item) => item.category) });
}

export async function updateSourceText(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const keyId = routeParam(req.params.keyId);
  const sourceText = typeof req.body.sourceText === "string" ? req.body.sourceText.trim() : "";
  if (!keyId || !sourceText) {
    res.status(400).json({ error: "Translation key and English source text are required." });
    return;
  }

  const current = await prisma.translationKey.findUnique({ where: { id: keyId } });
  if (!current) {
    res.status(404).json({ error: "Translation key not found." });
    return;
  }
  if (current.sourceText === sourceText) {
    res.json({ message: "English source is unchanged.", translationKey: current });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const translationKey = await tx.translationKey.update({ where: { id: keyId }, data: { sourceText } });
    await tx.translationValue.updateMany({
      where: { translationKeyId: keyId, language: { isSource: false } },
      data: { status: "DRAFT" as never },
    });
    await tx.translationHistory.create({
      data: {
        translationKeyId: keyId,
        languageLocale: "en-US",
        previousValue: current.sourceText,
        newValue: sourceText,
        previousStatus: null,
        newStatus: "PUBLISHED" as never,
        action: "UPDATE_SOURCE",
        changedByUserId: userId,
      },
    });
    return translationKey;
  });

  res.json({
    message: "English source updated. Existing translations were returned to draft for review.",
    translationKey: updated,
  });
}

export async function saveTranslation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const keyId = routeParam(req.params.keyId);
  const locale = typeof req.body.locale === "string" ? req.body.locale : "";
  const value = typeof req.body.value === "string" ? req.body.value.trim() : "";
  const requestedStatus = typeof req.body.status === "string" ? req.body.status : "DRAFT";
  if (!keyId || !locale || !value || !VALID_STATUSES.includes(requestedStatus as TranslationStatusValue)) {
    res.status(400).json({ error: "Translation key, locale, value, and a valid status are required." });
    return;
  }

  const [translationKey, language] = await Promise.all([
    prisma.translationKey.findUnique({ where: { id: keyId } }),
    prisma.language.findUnique({ where: { locale } }),
  ]);
  if (!translationKey || !language) {
    res.status(404).json({ error: "Translation key or language not found." });
    return;
  }

  const existing = await prisma.translationValue.findUnique({
    where: { translationKeyId_languageId: { translationKeyId: keyId, languageId: language.id } },
  });
  const status = requestedStatus as TranslationStatusValue;
  const published = status === "PUBLISHED";

  const result = await prisma.$transaction(async (tx) => {
    const translation = await tx.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: keyId, languageId: language.id } },
      create: { translationKeyId: keyId, languageId: language.id, value, status: status as never, publishedValue: published ? value : null, publishedAt: published ? new Date() : null },
      update: { value, status: status as never, ...(published ? { publishedValue: value, publishedAt: new Date() } : {}) },
      include: { language: true },
    });
    await tx.translationHistory.create({
      data: {
        translationKeyId: keyId,
        languageLocale: locale,
        previousValue: existing?.value ?? null,
        newValue: value,
        previousStatus: existing?.status ?? null,
        newStatus: status as never,
        action: published ? "PUBLISH" : status === "REVIEWED" ? "REVIEW" : "SAVE_DRAFT",
        changedByUserId: userId,
      },
    });
    return translation;
  });
  res.json({ message: published ? "Translation published." : "Translation saved.", translation: result });
}

export async function getTranslationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!requireUserId(req, res)) return;
  const keyId = routeParam(req.params.keyId);
  if (!keyId) {
    res.status(400).json({ error: "Translation key is required." });
    return;
  }
  const history = await prisma.translationHistory.findMany({
    where: { translationKeyId: keyId },
    include: { changedBy: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { changedAt: "desc" },
    take: 50,
  });
  res.json({ history });
}

export async function getPublishedTranslations(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!requireUserId(req, res)) return;
  const locale = routeParam(req.params.locale);
  if (!locale) {
    res.status(400).json({ error: "Locale is required." });
    return;
  }
  const values = await prisma.translationValue.findMany({
    where: { language: { locale, enabled: true }, publishedValue: { not: null } },
    include: { translationKey: true },
  });
  res.json({
    locale,
    translations: Object.fromEntries(values.map((item) => [item.translationKey.sourceText, item.publishedValue])),
  });
}
