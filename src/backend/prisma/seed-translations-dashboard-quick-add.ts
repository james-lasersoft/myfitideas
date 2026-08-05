import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["dashboard.quickAddHydrationAria", "Quick add hydration", "dashboard", "Adição rápida de hidratação"],
  ["dashboard.quickAdd", "Quick Add", "dashboard", "Adição Rápida"],
  ["dashboard.adding", "Adding...", "dashboard", "Adicionando..."],
  ["dashboard.hydrationAdded", "Hydration entry added.", "dashboard", "Registro de hidratação adicionado."],
  ["hydration.effectiveHydration", "Effective hydration", "hydration", "Hidratação efetiva"],
  ["hydration.beveragesConsumed", "Beverages consumed", "hydration", "Bebidas consumidas"],
  ["hydration.ofGoal", "of goal", "hydration", "da meta"],
  ["hydration.effective", "effective", "hydration", "efetivos"],
  ["hydration.remainingToGoal", "Remaining to goal", "hydration", "Restante para a meta"],
  ["hydration.historyConsumed", "Consumed", "hydration", "Consumido"],
  ["hydration.historyCoefficient", "Coefficient", "hydration", "Coeficiente"],
  ["hydration.historyEffective", "Effective", "hydration", "Efetivo"],
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
