import "dotenv/config";
import crypto from "node:crypto";
import prisma from "../src/config/prisma.js";

const setting = {
  enabled: false,
  provider: "disabled",
  credentialEnvironmentVariable: "",
  lookupOnNewLoginOnly: true,
  retainApproximateCoordinates: false,
  displayCityRegionCountry: true,
  testMode: true,
};

async function main() {
  const organization = await prisma.organization.findUnique({ where: { slug: "myfitideas" } });
  if (!organization) throw new Error("The myfitideas organization was not found. Run the RBAC seed first.");

  await prisma.$executeRaw`
    INSERT INTO "organization_settings" ("id", "organizationId", "category", "key", "value", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${organization.id}, 'security', 'security.ipGeolocation', ${JSON.stringify(setting)}::jsonb, NOW(), NOW())
    ON CONFLICT ("organizationId", "key")
    DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
  `;

  await prisma.$executeRawUnsafe(`
    WITH ranked AS (
      SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) AS rn
      FROM "user_sessions"
      WHERE "revokedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 8
    )
    UPDATE "user_sessions" AS s
    SET
      "locationCity" = CASE ranked.rn
        WHEN 1 THEN 'Des Moines' WHEN 2 THEN 'Chicago' WHEN 3 THEN 'Kansas City'
        WHEN 4 THEN 'Sao Paulo' WHEN 5 THEN 'Curitiba' WHEN 6 THEN 'Lisbon'
        WHEN 7 THEN 'Omaha' ELSE 'Minneapolis' END,
      "locationRegion" = CASE ranked.rn
        WHEN 1 THEN 'Iowa' WHEN 2 THEN 'Illinois' WHEN 3 THEN 'Missouri'
        WHEN 4 THEN 'Sao Paulo' WHEN 5 THEN 'Parana' WHEN 6 THEN 'Lisbon'
        WHEN 7 THEN 'Nebraska' ELSE 'Minnesota' END,
      "locationCountry" = CASE WHEN ranked.rn IN (4,5) THEN 'Brazil' WHEN ranked.rn = 6 THEN 'Portugal' ELSE 'United States' END,
      "locationCountryCode" = CASE WHEN ranked.rn IN (4,5) THEN 'BR' WHEN ranked.rn = 6 THEN 'PT' ELSE 'US' END,
      "locationTimezone" = CASE WHEN ranked.rn IN (4,5) THEN 'America/Sao_Paulo' WHEN ranked.rn = 6 THEN 'Europe/Lisbon' ELSE 'America/Chicago' END,
      "locationLatitude" = NULL,
      "locationLongitude" = NULL,
      "locationProvider" = 'seeded-test-data',
      "locationLookedUpAt" = NOW()
    FROM ranked
    WHERE s."id" = ranked."id"
  `);

  console.log("Seeded provider-neutral geolocation settings and sample session locations.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
