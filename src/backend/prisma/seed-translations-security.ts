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
  ["security.step", "Step", "security", "Etapa"],
  ["security.ofThree", "of 3", "security", "de 3"],
  ["security.scanQr", "Scan the QR code with your authenticator app, then enter the six-digit code.", "security", "Escaneie o código QR com seu aplicativo autenticador e insira o código de seis dígitos."],
  ["security.authQr", "Authenticator QR code", "security", "Código QR do autenticador"],
  ["security.manualKey", "Unable to scan? Enter this setup key manually:", "security", "Não consegue escanear? Insira esta chave de configuração manualmente:"],
  ["security.showUri", "Show authenticator setup URI", "security", "Mostrar URI de configuração do autenticador"],
  ["security.trustDevice", "Trust this device for 30 days", "security", "Confiar neste dispositivo por 30 dias"],
  ["security.copy", "Copy", "security", "Copiar"],
  ["security.download", "Download", "security", "Baixar"],
  ["security.print", "Print", "security", "Imprimir"],
  ["security.recoveryStored", "I have stored these recovery codes safely", "security", "Armazenei estes códigos de recuperação com segurança"],
  ["security.confirmRecovery", "Confirm that you stored the recovery codes before continuing.", "security", "Confirme que armazenou os códigos de recuperação antes de continuar."],
  ["security.verifyEnable", "Verify and enable MFA", "security", "Verificar e ativar MFA"],
  ["security.finishSetup", "Finish setup", "security", "Concluir configuração"],
  ["security.resetMyMfa", "Reset My MFA", "security", "Redefinir minha MFA"],
  ["security.resetMfaDescription", "Remove authenticator enrollment, trusted devices, recovery codes, and active sessions.", "security", "Remover o cadastro do autenticador, dispositivos confiáveis, códigos de recuperação e sessões ativas."],
  ["security.resetMfaConfirm", "Reset MFA and revoke all sessions? You will enroll again at the next login.", "security", "Redefinir a MFA e revogar todas as sessões? Você fará o cadastro novamente no próximo login."],
  ["security.resetMfaError", "Unable to reset MFA.", "security", "Não foi possível redefinir a MFA."],
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
