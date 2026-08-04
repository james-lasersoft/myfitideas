import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["privacy.signup.title", "Create your MyFitIdeas account", "privacy", "Crie sua conta MyFitIdeas"],
  ["privacy.signup.subtitle", "Start tracking your health and transformation journey.", "privacy", "Comece a acompanhar sua saúde e sua jornada de transformação."],
  ["privacy.signup.createPassword", "Create Password", "privacy", "Criar Senha"],
  ["privacy.signup.confirmPassword", "Confirm Password", "privacy", "Confirmar Senha"],
  ["privacy.signup.passwordMismatch", "Passwords do not match.", "privacy", "As senhas não correspondem."],
  ["privacy.signup.passwordRequirements", "Password requirements", "privacy", "Requisitos da senha"],
  ["privacy.signup.passwordLength", "At least 8 characters", "privacy", "Pelo menos 8 caracteres"],
  ["privacy.signup.passwordMatch", "Both password fields match", "privacy", "Os dois campos de senha correspondem"],
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
  ["account.menu.account", "Account", "account", "Conta"],
  ["account.menu.open", "Open account menu", "account", "Abrir menu da conta"],
  ["account.menu.settings", "Account Settings", "account", "Configurações da Conta"],
  ["security.session.unknownBrowser", "Unknown browser", "security", "Navegador desconhecido"],
  ["security.session.unknownOs", "Unknown operating system", "security", "Sistema operacional desconhecido"],
  ["security.session.unknownDevice", "Unknown device", "security", "Dispositivo desconhecido"],
  ["security.session.otherBrowser", "Other browser", "security", "Outro navegador"],
  ["security.session.otherOs", "Other operating system", "security", "Outro sistema operacional"],
  ["security.session.windows", "Windows", "security", "Windows"],
  ["security.session.android", "Android", "security", "Android"],
  ["security.session.ios", "iOS or iPadOS", "security", "iOS ou iPadOS"],
  ["security.session.macos", "macOS", "security", "macOS"],
  ["security.session.linux", "Linux", "security", "Linux"],
  ["security.session.tablet", "Tablet", "security", "Tablet"],
  ["security.session.mobile", "Mobile device", "security", "Dispositivo móvel"],
  ["security.session.computer", "Computer", "security", "Computador"],
  ["security.session.edge", "Microsoft Edge", "security", "Microsoft Edge"],
  ["security.session.opera", "Opera", "security", "Opera"],
  ["security.session.chrome", "Google Chrome", "security", "Google Chrome"],
  ["security.session.firefox", "Mozilla Firefox", "security", "Mozilla Firefox"],
  ["security.session.safari", "Safari", "security", "Safari"],
  ["security.session.browser", "Browser", "security", "Navegador"],
  ["security.session.operatingSystem", "Operating System", "security", "Sistema Operacional"],
  ["security.session.deviceType", "Device Type", "security", "Tipo de Dispositivo"],
  ["security.session.ip", "IP Address", "security", "Endereço IP"],
  ["security.session.location", "Approximate Location", "security", "Localização aproximada"],
  ["security.session.locationUnavailable", "Location unavailable", "security", "Localização indisponível"],
  ["security.session.localDevelopment", "Local Development", "security", "Desenvolvimento Local"],
  ["security.session.privateNetwork", "Private Network", "security", "Rede Privada"],
  ["security.session.locationPrivacyNotice", "Approximate login location is derived from your public IP address. MyFitIdeas never requests your device GPS location.", "security", "A localização aproximada do login é derivada do seu endereço IP público. O MyFitIdeas nunca solicita a localização GPS do seu dispositivo."],
  ["security.session.signedInLabel", "Signed In", "security", "Login realizado"],
  ["security.session.lastActivity", "Last Activity", "security", "Última Atividade"],
  ["security.session.sessionExpiresLabel", "Session Expires", "security", "Sessão Expira"],
  ["security.session.signedIn", "Signed in", "security", "Login realizado"],
  ["security.session.expires", "Session expires", "security", "Sessão expira"],
  ["security.device.trustedSinceLabel", "Trusted Since", "security", "Confiável Desde"],
  ["security.device.trustExpiresLabel", "Trust Expires", "security", "Confiança Expira"],
  ["security.device.trustedSince", "Trusted since", "security", "Confiável desde"],
  ["security.device.trustExpires", "Trust expires", "security", "Confiança expira"],
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
