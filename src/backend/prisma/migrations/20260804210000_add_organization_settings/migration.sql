CREATE TABLE IF NOT EXISTS "organization_settings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organization_settings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_settings_organizationId_key_key"
  ON "organization_settings"("organizationId", "key");

CREATE INDEX IF NOT EXISTS "organization_settings_organizationId_category_idx"
  ON "organization_settings"("organizationId", "category");
