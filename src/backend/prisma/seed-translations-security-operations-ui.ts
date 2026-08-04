import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["security.overview", "Security Overview", "security-operations", "Visão Geral de Segurança"],
  ["security.totalUsers", "Total Users", "security-operations", "Total de Usuários"],
  ["security.mfaEnabledSummary", "MFA Enabled", "security-operations", "MFA Ativada"],
  ["security.usersWithoutMfa", "Users Without MFA", "security-operations", "Usuários sem MFA"],
  ["security.lastLogin", "Last Login", "security-operations", "Último Login"],
  ["security.never", "Never", "security-operations", "Nunca"],
  ["security.unableRevoke", "Unable to revoke active sessions.", "security-operations", "Não foi possível revogar as sessões ativas."],
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
      create: { translationKeyId: translationKey.id, languageId: english.id, value: currentSource, status: "PUBLISHED", publishedValue: currentSource, publishedAt: new Date() },
    });

    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } },
      update: { value: ptBr, status: "PUBLISHED", publishedValue: ptBr },
      create: { translationKeyId: translationKey.id, languageId: portuguese.id, value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() },
    });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
