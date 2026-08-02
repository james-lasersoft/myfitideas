CREATE TYPE "TranslationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'PUBLISHED');

CREATE TABLE "languages" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isSource" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_keys" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "sourceText" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "translation_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_values" (
  "id" TEXT NOT NULL,
  "translationKeyId" TEXT NOT NULL,
  "languageId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "status" "TranslationStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedValue" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "translation_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "translation_history" (
  "id" TEXT NOT NULL,
  "translationKeyId" TEXT NOT NULL,
  "languageLocale" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT NOT NULL,
  "previousStatus" "TranslationStatus",
  "newStatus" "TranslationStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "changedByUserId" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "translation_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "languages_locale_key" ON "languages"("locale");
CREATE UNIQUE INDEX "translation_keys_key_key" ON "translation_keys"("key");
CREATE INDEX "translation_keys_category_idx" ON "translation_keys"("category");
CREATE UNIQUE INDEX "translation_values_translationKeyId_languageId_key" ON "translation_values"("translationKeyId", "languageId");
CREATE INDEX "translation_values_languageId_status_idx" ON "translation_values"("languageId", "status");
CREATE INDEX "translation_history_translationKeyId_changedAt_idx" ON "translation_history"("translationKeyId", "changedAt");
CREATE INDEX "translation_history_changedByUserId_changedAt_idx" ON "translation_history"("changedByUserId", "changedAt");

ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "translation_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_values" ADD CONSTRAINT "translation_values_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_history" ADD CONSTRAINT "translation_history_translationKeyId_fkey" FOREIGN KEY ("translationKeyId") REFERENCES "translation_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_history" ADD CONSTRAINT "translation_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "languages" ("id", "locale", "displayName", "nativeName", "enabled", "isSource", "updatedAt") VALUES
  (gen_random_uuid()::text, 'en-US', 'English', 'English', true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', true, false, CURRENT_TIMESTAMP);
