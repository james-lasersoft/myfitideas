import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["hydration.beverage", "Beverage", "hydration", "Bebida"],
  ["hydration.beverageType", "Beverage type", "hydration", "Tipo de bebida"],
  ["hydration.water", "Water", "hydration", "Água"],
  ["hydration.coffee", "Coffee", "hydration", "Café"],
  ["hydration.tea", "Tea", "hydration", "Chá"],
  ["hydration.sportsDrink", "Sports Drink", "hydration", "Bebida esportiva"],
  ["hydration.milk", "Milk", "hydration", "Leite"],
  ["hydration.juice", "Juice", "hydration", "Suco"],
  ["hydration.soda", "Soda", "hydration", "Refrigerante"],
  ["hydration.sparklingWater", "Sparkling Water", "hydration", "Água com gás"],
  ["hydration.energyDrink", "Energy Drink", "hydration", "Bebida energética"],
  ["hydration.smoothie", "Smoothie", "hydration", "Vitamina"],
  ["hydration.oralRehydration", "Oral Rehydration Drink", "hydration", "Bebida de reidratação oral"],
  ["hydration.otherBeverage", "Other Beverage", "hydration", "Outra bebida"],
  ["hydration.more", "More", "hydration", "Mais"],
  ["hydration.moreBeverages", "More beverages", "hydration", "Mais bebidas"],
  ["hydration.selectBeverage", "Select beverage", "hydration", "Selecionar bebida"],
  ["hydration.loggingFor", "Logging For", "hydration", "Registrando para"],
  ["hydration.on", "on", "hydration", "em"],
  ["hydration.at", "at", "hydration", "às"],
] as const;

async function main() {
  const english = await prisma.language.upsert({
    where: { locale: "en-US" },
    update: { enabled: true, isSource: true },
    create: {
      locale: "en-US",
      displayName: "English",
      nativeName: "English",
      enabled: true,
      isSource: true,
    },
  });

  const portuguese = await prisma.language.upsert({
    where: { locale: "pt-BR" },
    update: { enabled: true },
    create: {
      locale: "pt-BR",
      displayName: "Brazilian Portuguese",
      nativeName: "Português (Brasil)",
      enabled: true,
      isSource: false,
    },
  });

  for (const [key, sourceText, category, ptBr] of catalog) {
    const translationKey = await prisma.translationKey.upsert({
      where: { key },
      update: { sourceText, category },
      create: { key, sourceText, category },
    });

    await prisma.translationValue.upsert({
      where: {
        translationKeyId_languageId: {
          translationKeyId: translationKey.id,
          languageId: english.id,
        },
      },
      update: {
        value: sourceText,
        status: "PUBLISHED",
        publishedValue: sourceText,
      },
      create: {
        translationKeyId: translationKey.id,
        languageId: english.id,
        value: sourceText,
        status: "PUBLISHED",
        publishedValue: sourceText,
        publishedAt: new Date(),
      },
    });

    await prisma.translationValue.upsert({
      where: {
        translationKeyId_languageId: {
          translationKeyId: translationKey.id,
          languageId: portuguese.id,
        },
      },
      update: {
        value: ptBr,
        status: "PUBLISHED",
        publishedValue: ptBr,
      },
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
