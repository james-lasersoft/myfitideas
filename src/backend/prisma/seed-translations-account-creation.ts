import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["accountCreation.noHealthData", "No health data during account creation", "public", "Nenhum dado de saúde durante a criação da conta"],
  ["accountCreation.analyticsLabel", "Help improve MyFitIdeas with anonymous, aggregated usage analytics", "public", "Ajude a melhorar o MyFitIdeas com análises anônimas e agregadas de uso"],
  ["accountCreation.analyticsHelp", "Optional. You can change this preference later in Privacy Settings. Personal health information is never used for analytics.", "public", "Opcional. Você pode alterar esta preferência depois nas Configurações de Privacidade. Informações pessoais de saúde nunca são usadas para análises."],
  ["accountCreation.identityOnly", "Initial account creation collects only essential account, localization, and consent information. Measurements and goals belong in onboarding after verification or activation.", "public", "A criação inicial da conta coleta apenas informações essenciais de conta, localização e consentimento. Medidas e metas pertencem ao onboarding após verificação ou ativação."],
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

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: english.id } },
      update: { value: sourceText, status: "PUBLISHED", publishedValue: sourceText, publishedAt: new Date() },
      create: { translationKeyId: translationKey.id, languageId: english.id, value: sourceText, status: "PUBLISHED", publishedValue: sourceText, publishedAt: new Date() },
    });

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } },
      update: { value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() },
      create: { translationKeyId: translationKey.id, languageId: portuguese.id, value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() },
    });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
