import api from "./api";

export type TranslationStatus = "DRAFT" | "REVIEWED" | "PUBLISHED";

export interface LanguageRecord {
  id: string;
  locale: string;
  displayName: string;
  nativeName: string;
  enabled: boolean;
  isSource: boolean;
}

export interface TranslationValueRecord {
  id: string;
  value: string;
  status: TranslationStatus;
  publishedValue: string | null;
  publishedAt: string | null;
  updatedAt: string;
  language: LanguageRecord;
}

export interface TranslationKeyRecord {
  id: string;
  key: string;
  sourceText: string;
  category: string;
  description: string | null;
  translations: TranslationValueRecord[];
}

export interface TranslationHistoryRecord {
  id: string;
  languageLocale: string;
  previousValue: string | null;
  newValue: string;
  previousStatus: TranslationStatus | null;
  newStatus: TranslationStatus;
  action: string;
  changedAt: string;
  changedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  };
}

export async function getTranslations(params?: {
  search?: string;
  category?: string;
  status?: TranslationStatus | "";
}): Promise<{ translations: TranslationKeyRecord[]; categories: string[] }> {
  const response = await api.get("/api/v1/admin/translations", { params });
  return response.data;
}

export async function saveTranslation(
  keyId: string,
  locale: string,
  value: string,
  status: TranslationStatus
): Promise<TranslationValueRecord> {
  const response = await api.put(`/api/v1/admin/translations/${keyId}`, {
    locale,
    value,
    status,
  });
  return response.data.translation;
}

export async function getTranslationHistory(
  keyId: string
): Promise<TranslationHistoryRecord[]> {
  const response = await api.get(`/api/v1/admin/translations/${keyId}/history`);
  return response.data.history;
}
