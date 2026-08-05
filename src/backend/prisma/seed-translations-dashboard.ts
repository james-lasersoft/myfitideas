import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["dashboard.modulesAria", "Dashboard modules", "dashboard", "Módulos do painel"],
  ["dashboard.measurementsDescription", "Record weight, body measurements, and body-fat progress.", "dashboard", "Registre peso, medidas corporais e progresso da gordura corporal."],
  ["dashboard.hydrationDescription", "Log water intake, update your daily goal, and review history.", "dashboard", "Registre o consumo de água, atualize sua meta diária e consulte o histórico."],
  ["dashboard.progressDescription", "Review trends across weight, hydration, and body measurements.", "dashboard", "Acompanhe tendências de peso, hidratação e medidas corporais."],
  ["dashboard.profileDescription", "Manage personal details, goals, units, and localization preferences.", "dashboard", "Gerencie dados pessoais, metas, unidades e preferências de localização."],
  ["public.homeAria", "MyFitIdeas home", "public", "Início do MyFitIdeas"],
  ["public.navigationAria", "Public navigation", "public", "Navegação pública"],
  ["public.features", "Features", "public", "Recursos"],
  ["public.pricing", "Pricing", "public", "Preços"],
  ["public.login", "Log In", "public", "Entrar"],
  ["public.createAccount", "Create Account", "public", "Criar Conta"],
  ["public.footerDescription", "A privacy-conscious platform for long-term body transformation.", "public", "Uma plataforma consciente da privacidade para transformação corporal de longo prazo."],
  ["public.legalNavigationAria", "Legal navigation", "public", "Navegação jurídica"],
  ["public.privacy", "Privacy", "public", "Privacidade"],
  ["public.terms", "Terms", "public", "Termos"],
  ["public.heroKicker", "Body transformation, made measurable", "public", "Transformação corporal, agora mensurável"],
  ["public.heroTitle", "Build a clearer picture of your health and progress.", "public", "Construa uma visão mais clara da sua saúde e do seu progresso."],
  ["public.heroDescription", "MyFitIdeas brings measurements, hydration, progress trends, habits, and future AI insights into one privacy-conscious transformation platform.", "public", "O MyFitIdeas reúne medidas, hidratação, tendências de progresso, hábitos e futuros insights de IA em uma plataforma de transformação consciente da privacidade."],
  ["public.createYourAccount", "Create Your Account", "public", "Crie sua conta"],
  ["public.exploreFeatures", "Explore Features", "public", "Explorar recursos"],
  ["public.platformHighlightsAria", "Platform highlights", "public", "Destaques da plataforma"],
  ["public.identityFirstTitle", "Start with identity, not health data", "public", "Comece com identidade, não com dados de saúde"],
  ["public.identityFirstDescription", "Initial signup collects only essential account, localization, and consent information. Measurements and goals belong in onboarding after verification or activation.", "public", "O cadastro inicial coleta apenas informações essenciais de conta, localização e consentimento. Medidas e metas pertencem ao onboarding após verificação ou ativação."],
  ["public.valueAreasAria", "MyFitIdeas value areas", "public", "Áreas de valor do MyFitIdeas"],
  ["public.trackTitle", "Track what matters", "public", "Acompanhe o que importa"],
  ["public.trackDescription", "Bring weight, body measurements, hydration, and progress history into one consistent record.", "public", "Reúna peso, medidas corporais, hidratação e histórico de progresso em um registro consistente."],
  ["public.patternsTitle", "Understand patterns", "public", "Entenda padrões"],
  ["public.patternsDescription", "Use charts and future correlation insights to understand what supports lasting progress.", "public", "Use gráficos e futuros insights de correlação para entender o que sustenta um progresso duradouro."],
  ["public.controlTitle", "Control your information", "public", "Controle suas informações"],
  ["public.controlDescription", "Review sessions, trusted devices, privacy preferences, and account access from a dedicated Security Center.", "public", "Revise sessões, dispositivos confiáveis, preferências de privacidade e acesso à conta em uma Central de Segurança dedicada."],
  ["public.previewDashboard", "Dashboard", "public", "Painel"],
  ["public.previewToday", "Today", "public", "Hoje"],
  ["public.previewWeight", "Weight", "public", "Peso"],
  ["public.previewBodyFat", "Body Fat", "public", "Gordura corporal"],
  ["public.previewHydration", "Hydration", "public", "Hidratação"],
  ["public.previewProgress", "Progress", "public", "Progresso"],
  ["public.previewSteadyProgress", "Steady progress", "public", "Progresso constante"],
  ["public.previewPrivate", "Your data stays private", "public", "Seus dados permanecem privados"],
  ["public.experienceKicker", "MyFitIdeas Public Experience", "public", "Experiência Pública MyFitIdeas"],
  ["public.featuresDescription", "Explore the MyFitIdeas transformation platform and the capabilities planned for each stage of the customer journey.", "public", "Explore a plataforma de transformação MyFitIdeas e os recursos planejados para cada etapa da jornada do cliente."],
  ["public.pricingDescription", "Plan presentation is being prepared before billing activation. Account creation remains separate from subscription state.", "public", "A apresentação dos planos está sendo preparada antes da ativação do faturamento. A criação da conta permanece separada do estado da assinatura."],
  ["public.checkoutTitle", "Checkout Result", "public", "Resultado do Checkout"],
  ["public.checkoutDescription", "This route is reserved for verified billing outcomes when checkout is introduced.", "public", "Esta rota está reservada para resultados de cobrança verificados quando o checkout for introduzido."],
  ["public.privacyDescription", "The public privacy notice and versioned consent language will be published here before customer launch.", "public", "O aviso público de privacidade e a linguagem de consentimento versionada serão publicados aqui antes do lançamento ao cliente."],
  ["public.termsDescription", "The public terms of service and effective version will be published here before customer launch.", "public", "Os termos públicos de serviço e a versão vigente serão publicados aqui antes do lançamento ao cliente."],
  ["public.detailFeaturesTitle", "Features built around your whole journey", "public", "Recursos criados para toda a sua jornada"],
  ["public.detailSecureAccount", "Start with a secure account", "public", "Comece com uma conta segura"],
  ["public.detailOnboarding", "Health measurements and goals are collected later through guided onboarding.", "public", "Medidas de saúde e metas são coletadas depois, por meio de um onboarding guiado."],
  ["public.detailPricingTitle", "Choose the experience that fits your journey", "public", "Escolha a experiência que combina com sua jornada"],
  ["public.detailPremium", "Planned premium experience", "public", "Experiência premium planejada"],
  ["public.detailPricingComing", "Pricing coming before billing launch", "public", "Preços serão divulgados antes do lançamento da cobrança"],
  ["public.detailSeparateStates", "Creating an account does not create a paid subscription. Account status and subscription status remain separate.", "public", "Criar uma conta não gera uma assinatura paga. O status da conta e o status da assinatura permanecem separados."],
  ["public.detailCheckoutResult", "Checkout result", "public", "Resultado do checkout"],
  ["public.detailReturnPricing", "Return to Pricing", "public", "Voltar aos Preços"],
  ["public.detailVersion", "Version", "public", "Versão"],
  ["public.detailEffectiveDate", "Effective date", "public", "Data de vigência"],
  ["public.detailNotEffective", "Not yet effective", "public", "Ainda não vigente"],
  ["public.detailLegalReview", "Legal review required before launch", "public", "Revisão jurídica necessária antes do lançamento"],
  ["public.detailLegalDraft", "This is a product-design draft and is not the final legally approved policy.", "public", "Este é um rascunho de design do produto e não representa a política final aprovada juridicamente."],
  ["signup.identityFirst", "Identity first. Health data later.", "public", "Primeiro a identidade. Dados de saúde depois."],
  ["signup.title", "Create your MyFitIdeas account", "public", "Crie sua conta MyFitIdeas"],
  ["signup.description", "Set up your secure account and preferences now. Measurements, goals, and health details are collected later through guided onboarding.", "public", "Configure agora sua conta segura e preferências. Medidas, metas e dados de saúde serão coletados depois por meio de um onboarding guiado."],
  ["signup.noPayment", "No payment required", "public", "Nenhum pagamento necessário"],
  ["signup.noHealth", "No health data during signup", "public", "Nenhum dado de saúde durante o cadastro"],
  ["signup.privacyControl", "Privacy choices stay under your control", "public", "As escolhas de privacidade permanecem sob seu controle"],
  ["signup.existingAccount", "Already have an account?", "public", "Já tem uma conta?"],
  ["signup.identityProviders", "Identity provider options", "public", "Opções de provedor de identidade"],
  ["signup.comingSoon", "Coming soon", "public", "Em breve"],
  ["signup.emailDivider", "or create an account with email", "public", "ou crie uma conta com e-mail"],
  ["signup.checkingEmail", "Checking email availability...", "public", "Verificando a disponibilidade do e-mail..."],
  ["signup.emailAvailable", "Email is available", "public", "O e-mail está disponível"],
  ["signup.emailExists", "This email already has an account.", "public", "Este e-mail já possui uma conta."],
  ["signup.invalidEmail", "Enter a valid email address", "public", "Digite um endereço de e-mail válido"],
  ["signup.uppercase", "One uppercase letter", "public", "Uma letra maiúscula"],
  ["signup.lowercase", "One lowercase letter", "public", "Uma letra minúscula"],
  ["signup.number", "One number", "public", "Um número"],
  ["signup.special", "One special character", "public", "Um caractere especial"],
  ["signup.locationLanguage", "Location and language", "public", "Localização e idioma"],
  ["signup.country", "Country", "public", "País"],
  ["signup.timezone", "Timezone", "public", "Fuso horário"],
  ["signup.termsOfService", "Terms of Service", "public", "Termos de Serviço"],
  ["signup.privacyNotice", "Privacy Notice", "public", "Aviso de Privacidade"],
  ["signup.us", "United States", "public", "Estados Unidos"],
  ["signup.brazil", "Brazil", "public", "Brasil"],
  ["signup.canada", "Canada", "public", "Canadá"],
  ["signup.uk", "United Kingdom", "public", "Reino Unido"],
  ["signup.portugal", "Portugal", "public", "Portugal"],
  ["signup.mexico", "Mexico", "public", "México"],
  ["signup.agreeTerms", "I agree to the", "public", "Concordo com os"],
  ["signup.readPrivacy", "I have read and acknowledge the", "public", "Li e reconheço o"],
  ["signup.analytics", "Allow de-identified aggregate analytics", "public", "Permitir análises agregadas desidentificadas"],
  ["signup.analyticsOptional", "Optional. This can be changed later without affecting your access.", "public", "Opcional. Isso pode ser alterado depois sem afetar seu acesso."],
  ["signup.creating", "Creating your secure account...", "public", "Criando sua conta segura..."],
  ["signup.accountCreated", "Account created", "public", "Conta criada"],
  ["signup.checkEmail", "Check your email", "public", "Verifique seu e-mail"],
  ["signup.preparingVerification", "We are preparing a verification message for", "public", "Estamos preparando uma mensagem de verificação para"],
  ["signup.pendingDescription", "Your account is secure and pending verification. Health measurements and goals have not been collected yet.", "public", "Sua conta está segura e aguardando verificação. Medidas de saúde e metas ainda não foram coletadas."],
  ["signup.resend", "Resend verification email", "public", "Reenviar e-mail de verificação"],
  ["signup.differentEmail", "Use a different email", "public", "Usar outro e-mail"],
  ["signup.providerNotice", "Email delivery will become active when an email provider is enabled in Company Settings.", "public", "A entrega de e-mail será ativada quando um provedor de e-mail for habilitado nas Configurações da Empresa."],
  ["signup.returnLogin", "Return to Log In", "public", "Voltar para Entrar"],
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
