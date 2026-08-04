import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["privacy.preferences.title", "Privacy & Analytics", "privacy", "Privacidade e Análises"],
  ["privacy.preferences.description", "Choose whether your information may contribute to de-identified aggregate product statistics.", "privacy", "Escolha se suas informações podem contribuir para estatísticas agregadas e desidentificadas do produto."],
  ["privacy.preferences.participating", "Participating", "privacy", "Participando"],
  ["privacy.preferences.notParticipating", "Not participating", "privacy", "Não participando"],
  ["privacy.preferences.detail", "This optional choice does not affect access to MyFitIdeas. Login security continues to use IP address, device information, and approximate IP-based location. Device GPS is not requested.", "privacy", "Esta escolha opcional não afeta o acesso ao MyFitIdeas. A segurança do login continua usando endereço IP, informações do dispositivo e localização aproximada baseada no IP. O GPS do dispositivo não é solicitado."],
  ["privacy.preferences.allow", "Allow de-identified aggregate analytics", "privacy", "Permitir análises agregadas e desidentificadas"],
  ["privacy.preferences.saving", "Saving privacy preference...", "privacy", "Salvando preferência de privacidade..."],
  ["privacy.preferences.updated", "Privacy preferences updated.", "privacy", "Preferências de privacidade atualizadas."],
  ["privacy.preferences.updateError", "Unable to update privacy preferences.", "privacy", "Não foi possível atualizar as preferências de privacidade."],
  ["privacy.preferences.securityDescription", "Manage multi-factor authentication, trusted devices, active access, and privacy preferences for your account.", "privacy", "Gerencie autenticação multifator, dispositivos confiáveis, acesso ativo e preferências de privacidade da sua conta."],
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
      update: { value: sourceText, status: "PUBLISHED", publishedValue: sourceText },
      create: { translationKeyId: translationKey.id, languageId: english.id, value: sourceText, status: "PUBLISHED", publishedValue: sourceText, publishedAt: new Date() },
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
