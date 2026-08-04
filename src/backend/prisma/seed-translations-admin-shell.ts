import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["admin.shell.ariaLabel", "MyFitIdeas Admin Center", "admin-shell", "Central de Administração MyFitIdeas"],
  ["admin.center.title", "Admin Center", "admin-shell", "Central de Administração"],
  ["admin.center.back", "Back to Admin Center", "admin-shell", "Voltar à Central de Administração"],
] as const;

async function main() {
  const english = await prisma.language.findUniqueOrThrow({ where: { locale: "en-US" } });
  const portuguese = await prisma.language.findUniqueOrThrow({ where: { locale: "pt-BR" } });

  for (const [key, sourceText, category, ptBr] of catalog) {
    const translationKey = await prisma.translationKey.upsert({
      where: { key },
      update: { sourceText, category },
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
      update: { value: ptBr, status: "PUBLISHED", publishedValue: ptBr },
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
