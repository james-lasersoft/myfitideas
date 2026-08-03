import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["security.secureCompanyAccount", "Secure your company account", "security", "Proteja sua conta corporativa"],
  ["security.saveRecoveryCodes", "Save your recovery codes", "security", "Salve seus códigos de recuperação"],
  ["security.companyMfaRequired", "Company users must use multi-factor authentication.", "security", "Usuários corporativos devem usar autenticação multifator."],
  ["security.storeRecoveryCodes", "Store these one-time codes in a safe place.", "security", "Guarde estes códigos de uso único em um local seguro."],
  ["security.authenticatorSetup", "Open your authenticator app and add this setup key:", "security", "Abra seu aplicativo autenticador e adicione esta chave de configuração:"],
  ["security.authenticatorUri", "Authenticator setup URI:", "security", "URI de configuração do autenticador:"],
  ["security.authenticationCode", "Authentication Code", "security", "Código de Autenticação"],
  ["security.enterAuthenticatorCode", "Enter the six-digit code from your authenticator app.", "security", "Digite o código de seis dígitos do seu aplicativo autenticador."],
  ["security.loginFailedCredentials", "Login failed. Please verify your credentials.", "security", "Falha no login. Verifique suas credenciais."],
  ["security.working", "Working...", "security", "Processando..."],
  ["security.enableMfa", "Enable MFA", "security", "Ativar MFA"],
  ["security.savedCodes", "I saved these codes", "security", "Salvei estes códigos"],
  ["security.verifySignIn", "Verify and Sign In", "security", "Verificar e Entrar"],
  ["security.differentAccount", "Use a different account", "security", "Usar outra conta"],
] as const;

async function main() {
  const english = await prisma.language.findUniqueOrThrow({ where: { locale: "en-US" } });
  const portuguese = await prisma.language.findUniqueOrThrow({ where: { locale: "pt-BR" } });
  for (const [key, sourceText, category, ptBr] of catalog) {
    const translationKey = await prisma.translationKey.upsert({ where: { key }, update: { category }, create: { key, sourceText, category } });
    const currentSource = translationKey.sourceText;
    await prisma.translationValue.upsert({ where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: english.id } }, update: { value: currentSource, status: "PUBLISHED", publishedValue: currentSource }, create: { translationKeyId: translationKey.id, languageId: english.id, value: currentSource, status: "PUBLISHED", publishedValue: currentSource, publishedAt: new Date() } });
    await prisma.translationValue.upsert({ where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } }, update: {}, create: { translationKeyId: translationKey.id, languageId: portuguese.id, value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() } });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
