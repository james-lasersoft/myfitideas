import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog: ReadonlyArray<readonly [string, string, string]> = [
  ["A connected transformation platform", "Uma plataforma de transformação conectada", "public"],
  ["Features built around your whole journey", "Recursos criados para toda a sua jornada", "public"],
  ["MyFitIdeas is designed to connect the information, routines, and insights that support sustainable body transformation.", "O MyFitIdeas foi projetado para conectar informações, rotinas e insights que sustentam uma transformação corporal duradoura.", "public"],
  ["Body tracking", "Acompanhamento corporal", "public"],
  ["Record weight, body measurements, hydration, and progress history in one consistent place.", "Registre peso, medidas corporais, hidratação e histórico de progresso em um só lugar.", "public"],
  ["Progress intelligence", "Inteligência de progresso", "public"],
  ["Review clear trends and build toward future correlations, reports, and AI-guided insights.", "Acompanhe tendências claras e prepare-se para futuras correlações, relatórios e insights orientados por IA.", "public"],
  ["Daily habits", "Hábitos diários", "public"],
  ["Bring nutrition, workouts, sleep, recovery, and habits into the same transformation journey.", "Reúna nutrição, treinos, sono, recuperação e hábitos na mesma jornada de transformação.", "public"],
  ["Privacy controls", "Controles de privacidade", "public"],
  ["Manage consent, sessions, trusted devices, and account access with dedicated security tools.", "Gerencie consentimento, sessões, dispositivos confiáveis e acesso à conta com ferramentas de segurança dedicadas.", "public"],
  ["Flexible preferences", "Preferências flexíveis", "public"],
  ["Use localized language, time, date, and measurement preferences across your experience.", "Use preferências localizadas de idioma, hora, data e medidas em toda a experiência.", "public"],
  ["Future connections", "Conexões futuras", "public"],
  ["Prepare for wearable integrations, coach collaboration, exports, and advanced analytics.", "Prepare-se para integrações com dispositivos vestíveis, colaboração com treinadores, exportações e análises avançadas.", "public"],
  ["Start with a secure account", "Comece com uma conta segura", "public"],
  ["Health measurements and goals are collected later through guided onboarding.", "Medidas de saúde e metas são coletadas depois, por meio de um onboarding guiado.", "public"],
  ["Simple plans, before billing", "Planos simples, antes da cobrança", "public"],
  ["Choose the experience that fits your journey", "Escolha a experiência que combina com sua jornada", "public"],
  ["Pricing is not active yet. These plan previews show the intended product structure without creating a subscription or payment obligation.", "A cobrança ainda não está ativa. Estas prévias de planos mostram a estrutura pretendida do produto sem criar assinatura ou obrigação de pagamento.", "public"],
  ["Foundation", "Fundamentos", "public"],
  ["For starting your transformation record", "Para começar seu histórico de transformação", "public"],
  ["Account and security controls", "Controles de conta e segurança", "public"],
  ["Measurements and hydration", "Medidas e hidratação", "public"],
  ["Progress charts", "Gráficos de progresso", "public"],
  ["Localized preferences", "Preferências localizadas", "public"],
  ["Transformation", "Transformação", "public"],
  ["For a connected long-term journey", "Para uma jornada conectada de longo prazo", "public"],
  ["Planned premium experience", "Experiência premium planejada", "public"],
  ["Everything in Foundation", "Tudo do plano Fundamentos", "public"],
  ["Nutrition, workouts, sleep, and habits", "Nutrição, treinos, sono e hábitos", "public"],
  ["Advanced reports and correlations", "Relatórios e correlações avançadas", "public"],
  ["Future AI-guided insights", "Futuros insights orientados por IA", "public"],
  ["Coach and Team", "Treinador e Equipe", "public"],
  ["For guided or professional support", "Para suporte guiado ou profissional", "public"],
  ["Shared client progress", "Progresso compartilhado de clientes", "public"],
  ["Role-based access", "Acesso baseado em funções", "public"],
  ["Coach and trainer workflows", "Fluxos de trabalho para coaches e treinadores", "public"],
  ["Organization administration", "Administração da organização", "public"],
  ["Pricing coming before billing launch", "Preços serão divulgados antes do lançamento da cobrança", "public"],
  ["Creating an account does not create a paid subscription. Account status and subscription status remain separate.", "Criar uma conta não gera uma assinatura paga. O status da conta e o status da assinatura permanecem separados.", "public"],
  ["Checkout result", "Resultado do checkout", "public"],
  ["Checkout complete", "Checkout concluído", "public"],
  ["Your payment result will be confirmed securely with the billing provider before access changes.", "O resultado do pagamento será confirmado com segurança junto ao provedor de cobrança antes de qualquer alteração de acesso.", "public"],
  ["Checkout canceled", "Checkout cancelado", "public"],
  ["No subscription change was completed. You may return to pricing when you are ready.", "Nenhuma alteração de assinatura foi concluída. Você pode voltar aos preços quando estiver pronto.", "public"],
  ["Checkout could not be completed", "Não foi possível concluir o checkout", "public"],
  ["No access change should occur until the backend verifies a successful payment result.", "Nenhuma alteração de acesso deve ocorrer até que o backend confirme um pagamento bem-sucedido.", "public"],
  ["Checkout confirmation pending", "Confirmação do checkout pendente", "public"],
  ["This page is ready for provider-verified billing results when checkout is activated.", "Esta página está pronta para resultados de cobrança verificados pelo provedor quando o checkout for ativado.", "public"],
  ["Return to Pricing", "Voltar aos Preços", "public"],
  ["Public legal information", "Informações jurídicas públicas", "public"],
  ["Privacy Notice", "Aviso de Privacidade", "public"],
  ["Terms of Service", "Termos de Serviço", "public"],
  ["This prelaunch notice explains the intended handling of account, security, consent, and health-related information.", "Este aviso de pré-lançamento explica o tratamento pretendido de informações de conta, segurança, consentimento e dados relacionados à saúde.", "public"],
  ["These prelaunch terms describe the intended rules for accessing and using MyFitIdeas.", "Estes termos de pré-lançamento descrevem as regras pretendidas para acessar e usar o MyFitIdeas.", "public"],
  ["Version", "Versão", "public"],
  ["Effective date", "Data de vigência", "public"],
  ["Not yet effective", "Ainda não vigente", "public"],
  ["Status", "Status", "public"],
  ["Legal review required before launch", "Revisão jurídica necessária antes do lançamento", "public"],
  ["Information we collect", "Informações que coletamos", "public"],
  ["We collect essential account, localization, consent, security, and service-use information. Health measurements and goals are collected later when you choose to provide them during onboarding or product use.", "Coletamos informações essenciais de conta, localização, consentimento, segurança e uso do serviço. Medidas de saúde e metas são coletadas depois, quando você decide fornecê-las durante o onboarding ou uso do produto.", "public"],
  ["How information is used", "Como as informações são usadas", "public"],
  ["Information supports account operation, security, personalization, requested features, customer support, and service improvement. Aggregate analytics preferences are managed separately where offered.", "As informações apoiam a operação da conta, segurança, personalização, recursos solicitados, suporte ao cliente e melhoria do serviço. Preferências de análises agregadas são gerenciadas separadamente quando oferecidas.", "public"],
  ["Security and account activity", "Segurança e atividade da conta", "public"],
  ["We may retain login, device, session, IP-derived location, and audit information to protect accounts and help users review access. We do not use a device's internal GPS for login geolocation.", "Podemos reter informações de login, dispositivo, sessão, localização derivada de IP e auditoria para proteger contas e ajudar os usuários a revisar acessos. Não usamos o GPS interno do dispositivo para geolocalização de login.", "public"],
  ["Sharing and service providers", "Compartilhamento e prestadores de serviço", "public"],
  ["Information may be processed by carefully selected infrastructure, security, communication, analytics, and future billing providers under appropriate agreements and access controls.", "As informações podem ser processadas por provedores cuidadosamente selecionados de infraestrutura, segurança, comunicação, análise e futura cobrança, sob acordos e controles de acesso apropriados.", "public"],
  ["Your choices", "Suas escolhas", "public"],
  ["Available controls may include consent preferences, session revocation, trusted-device management, account correction, export, deletion, and applicable privacy requests.", "Os controles disponíveis podem incluir preferências de consentimento, revogação de sessões, gerenciamento de dispositivos confiáveis, correção de conta, exportação, exclusão e solicitações de privacidade aplicáveis.", "public"],
  ["Retention and changes", "Retenção e alterações", "public"],
  ["Information is retained only as needed for service, security, legal, and operational purposes. Material policy changes will use a new version and effective date.", "As informações são retidas apenas pelo tempo necessário para fins de serviço, segurança, obrigações legais e operações. Alterações relevantes na política usarão nova versão e data de vigência.", "public"],
  ["Using MyFitIdeas", "Uso do MyFitIdeas", "public"],
  ["You must provide accurate account information, protect your credentials, and use the service lawfully. Access may depend on verification, account status, permissions, and future subscription entitlements.", "Você deve fornecer informações corretas da conta, proteger suas credenciais e usar o serviço de forma legal. O acesso pode depender de verificação, status da conta, permissões e futuros direitos de assinatura.", "public"],
  ["Health information and guidance", "Informações de saúde e orientação", "public"],
  ["MyFitIdeas is a tracking and decision-support platform. It does not replace medical diagnosis, treatment, emergency services, or advice from a qualified healthcare professional.", "O MyFitIdeas é uma plataforma de acompanhamento e apoio à decisão. Ele não substitui diagnóstico médico, tratamento, serviços de emergência ou aconselhamento de um profissional de saúde qualificado.", "public"],
  ["Account status", "Status da conta", "public"],
  ["Accounts may be pending verification, active, suspended, or closed independently from any subscription status. Security or policy restrictions take priority over billing status.", "As contas podem estar pendentes de verificação, ativas, suspensas ou encerradas independentemente do status da assinatura. Restrições de segurança ou política têm prioridade sobre o status de cobrança.", "public"],
  ["Subscriptions and billing", "Assinaturas e cobrança", "public"],
  ["Paid plans are not active yet. Future purchases, renewals, cancellations, refunds, and billing terms will be presented before payment and verified through the backend and billing provider.", "Os planos pagos ainda não estão ativos. Futuras compras, renovações, cancelamentos, reembolsos e condições de cobrança serão apresentados antes do pagamento e verificados pelo backend e pelo provedor de cobrança.", "public"],
  ["Acceptable use", "Uso aceitável", "public"],
  ["You may not misuse the service, interfere with security, access data without authorization, upload unlawful content, or attempt to reverse engineer protected systems except where law permits.", "Você não pode usar o serviço de forma indevida, interferir na segurança, acessar dados sem autorização, enviar conteúdo ilegal ou tentar fazer engenharia reversa de sistemas protegidos, exceto quando permitido por lei.", "public"],
  ["Changes and termination", "Alterações e encerramento", "public"],
  ["Features and terms may evolve. Material changes will use a new version and effective date. Users may close accounts subject to lawful retention and unresolved obligations.", "Os recursos e termos podem evoluir. Alterações relevantes usarão nova versão e data de vigência. Os usuários podem encerrar contas, sujeitos à retenção legal e obrigações pendentes.", "public"],
  ["This is a product-design draft and is not the final legally approved policy.", "Este é um rascunho de design do produto e não representa a política final aprovada juridicamente.", "public"],
];

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

  for (const [sourceText, ptBr, category] of catalog) {
    const key = `public.phase7.${Buffer.from(sourceText).toString("base64url").slice(0, 36)}`;
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
