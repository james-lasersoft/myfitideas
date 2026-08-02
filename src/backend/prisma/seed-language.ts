import "dotenv/config";
import prisma from "../src/config/prisma.js";

const [locale, displayName, nativeName] = process.argv.slice(2);

if (!locale || !displayName || !nativeName) {
  console.error('Usage: npm run seed:language -- <locale> "<display name>" "<native name>"');
  process.exit(1);
}

async function main() {
  const language = await prisma.language.upsert({
    where: { locale },
    update: { displayName, nativeName, enabled: true },
    create: { locale, displayName, nativeName, enabled: true, isSource: false },
  });

  const keys = await prisma.translationKey.findMany({ orderBy: { key: "asc" } });
  for (const key of keys) {
    await prisma.translationValue.upsert({
      where: {
        translationKeyId_languageId: {
          translationKeyId: key.id,
          languageId: language.id,
        },
      },
      update: {},
      create: {
        translationKeyId: key.id,
        languageId: language.id,
        value: key.sourceText,
        status: "DRAFT",
        publishedValue: null,
        publishedAt: null,
      },
    });
  }

  console.log(`Seeded ${keys.length} current English source strings for ${locale}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
