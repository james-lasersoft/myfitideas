import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["admin.shell.ariaLabel", "MyFitIdeas administration", "admin-shell", "Administração MyFitIdeas"],
] as const;

async function main() {
  const english = await prisma.language.findUniqueOrThrow({ where: { locale: "en-US" } });
  const portuguese = await prisma.language.findUniqueOrThrow({ where: { locale: "pt-BR" } });

  for (const [key, sourceText, category, ptBr] of catalog) {
    const translationKey = await prisma.translationKey.upsert({
      where: { key },
      update: { category },
      create: { key, sourceText, category },
    });
    const currentSource = translationKey.sourceText;

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: english.id } },
      update: { value: currentSource, status: "PUBLISHED", publishedValue: currentSource },
      create: {
        translationKeyId: translationKey.id,
        languageId: english.id,
        value: currentSource,
        status: "PUBLISHED",
        publishedValue: currentSource,
        publishedAt: new Date(),
      },
    });

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } },
      update: {},
      create: {
        translationKeyId: translationKey.id,
        languageId: portuguese.id,
        value: ptBr,
        status: "PUBLISHED",
        publishedValue: ptBr,
        publishedAt: new Date(),
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
