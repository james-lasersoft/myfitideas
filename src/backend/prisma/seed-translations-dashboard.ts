import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["dashboard.modulesAria", "Dashboard modules", "dashboard", "Módulos do painel"],
  ["dashboard.measurementsDescription", "Record weight, body measurements, and body-fat progress.", "dashboard", "Registre peso, medidas corporais e progresso da gordura corporal."],
  ["dashboard.hydrationDescription", "Log water intake, update your daily goal, and review history.", "dashboard", "Registre o consumo de água, atualize sua meta diária e consulte o histórico."],
  ["dashboard.progressDescription", "Review trends across weight, hydration, and body measurements.", "dashboard", "Acompanhe tendências de peso, hidratação e medidas corporais."],
  ["dashboard.profileDescription", "Manage personal details, goals, units, and localization preferences.", "dashboard", "Gerencie dados pessoais, metas, unidades e preferências de localização."],
] as const;

async function main() {
  const english = await prisma.language.upsert({
    where: { locale: "en-US" },
    update: { enabled: true, isSource: true },
    create: { locale: "en-US", displayName: "English", nativeName: "English", enabled: true, isSource: true },
  });

  const portuguese = await prisma.language.upsert({
    where: { locale: "pt-BR" },
    update: { enabled: true },
    create: { locale: "pt-BR", displayName: "Brazilian Portuguese", nativeName: "Português (Brasil)", enabled: true, isSource: false },
  });

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
      create: { translationKeyId: translationKey.id, languageId: english.id, value: currentSource, status: "PUBLISHED", publishedValue: currentSource, publishedAt: new Date() },
    });

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } },
      update: {},
      create: { translationKeyId: translationKey.id, languageId: portuguese.id, value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() },
    });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
