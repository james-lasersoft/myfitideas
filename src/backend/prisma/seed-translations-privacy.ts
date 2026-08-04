import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["privacy.signup.title", "Create your MyFitIdeas account", "privacy", "Crie sua conta MyFitIdeas"],
  ["privacy.signup.subtitle", "Start tracking your health and transformation journey.", "privacy", "Comece a acompanhar sua saúde e sua jornada de transformação."],
  ["privacy.signup.noticeTitle", "Privacy and account security notice", "privacy", "Aviso de privacidade e segurança da conta"],
  ["privacy.signup.securityNotice", "MyFitIdeas records login time, IP address, browser and device information, and approximate location derived from the IP address to protect your account, identify suspicious access, and let you review or end sessions.", "privacy", "O MyFitIdeas registra o horário de login, o endereço IP, informações do navegador e do dispositivo e a localização aproximada derivada do endereço IP para proteger sua conta, identificar acessos suspeitos e permitir que você revise ou encerre sessões."],
  ["privacy.signup.noGps", "MyFitIdeas does not request or use your device GPS location for login security.", "privacy", "O MyFitIdeas não solicita nem usa a localização GPS do seu dispositivo para a segurança do login."],
  ["privacy.signup.required", "I agree to the Terms and acknowledge the Privacy Notice, including the security logging described above.", "privacy", "Concordo com os Termos e reconheço o Aviso de Privacidade, incluindo o registro de segurança descrito acima."],
  ["privacy.signup.analytics", "Allow my data to contribute to de-identified aggregate product statistics. This is optional and can be changed later.", "privacy", "Permitir que meus dados contribuam para estatísticas agregadas e desidentificadas do produto. Isso é opcional e pode ser alterado posteriormente."],
  ["privacy.signup.analyticsNoImpact", "Declining aggregate analytics does not affect your ability to use MyFitIdeas.", "privacy", "Recusar a análise agregada não afeta sua capacidade de usar o MyFitIdeas."],
  ["privacy.signup.creating", "Creating account...", "privacy", "Criando conta..."],
  ["privacy.signup.create", "Create Account", "privacy", "Criar Conta"],
  ["privacy.signup.back", "Back to Sign In", "privacy", "Voltar para Entrar"],
  ["privacy.signup.error", "Unable to create your account.", "privacy", "Não foi possível criar sua conta."],
  ["privacy.signup.requiredError", "You must acknowledge the Terms and Privacy Notice to create an account.", "privacy", "Você deve reconhecer os Termos e o Aviso de Privacidade para criar uma conta."],
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
