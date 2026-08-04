import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["security.session.localDevelopment", "Local Development", "security", "Desenvolvimento Local"],
  ["security.session.privateNetwork", "Private Network", "security", "Rede Privada"],
  ["security.session.locationPrivacyNotice", "Approximate login location is derived from your public IP address. MyFitIdeas never requests your device GPS location.", "security", "A localização aproximada do login é derivada do seu endereço IP público. O MyFitIdeas nunca solicita a localização GPS do seu dispositivo."],
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
