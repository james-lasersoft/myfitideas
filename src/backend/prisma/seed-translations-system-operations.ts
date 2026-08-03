import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["ops.systemOperations", "System Operations", "operations", "Operações do Sistema"],
  ["ops.description", "Developer utilities, diagnostics, and operational visibility for the MyFitIdeas platform.", "operations", "Utilitários de desenvolvimento, diagnósticos e visibilidade operacional da plataforma MyFitIdeas."],
  ["ops.openWorkAdmin", "Open Work Administration", "operations", "Abrir Administração de Trabalho"],
  ["ops.systemStatus", "System status overview", "operations", "Visão geral do status do sistema"],
  ["ops.application", "Application", "operations", "Aplicação"],
  ["ops.healthy", "Healthy", "operations", "Saudável"],
  ["ops.frontendResponding", "Frontend is responding", "operations", "O frontend está respondendo"],
  ["ops.database", "Database", "operations", "Banco de Dados"],
  ["ops.connected", "Connected", "operations", "Conectado"],
  ["ops.prismaAvailable", "Prisma data services available", "operations", "Serviços de dados Prisma disponíveis"],
  ["ops.monitoring", "Monitoring", "operations", "Monitoramento"],
  ["ops.foundation", "Foundation", "operations", "Fundação"],
  ["ops.metricsPlanned", "Live metrics collection is planned", "operations", "A coleta de métricas em tempo real está planejada"],
  ["ops.email", "Email", "operations", "E-mail"],
  ["ops.notConfigured", "Not configured", "operations", "Não configurado"],
  ["ops.emailProviders", "Console and Amazon SES providers are planned", "operations", "Os provedores Console e Amazon SES estão planejados"],
  ["ops.developerTools", "Developer Tools", "operations", "Ferramentas de Desenvolvimento"],
  ["ops.localControls", "Local browser controls", "operations", "Controles locais do navegador"],
  ["ops.superAdministrator", "Super Administrator", "operations", "Super Administrador"],
  ["ops.superAdminOnly", "Super Admin Only", "operations", "Somente Super Administrador"],
  ["ops.resetWorkspace", "Reset Workspace Selection", "operations", "Redefinir Seleção de Espaço"],
  ["ops.resetWorkspaceDescription", "Show the daily workspace chooser again.", "operations", "Mostrar novamente o seletor diário de espaço."],
  ["ops.resetLanguage", "Reset Language Cache", "operations", "Redefinir Cache de Idioma"],
  ["ops.resetLanguageDescription", "Return language selection to the browser default.", "operations", "Retornar a seleção de idioma ao padrão do navegador."],
  ["ops.resetTheme", "Reset Theme", "operations", "Redefinir Tema"],
  ["ops.resetThemeDescription", "Return appearance to the system default.", "operations", "Retornar a aparência ao padrão do sistema."],
  ["ops.clearSession", "Clear Login Session", "operations", "Limpar Sessão de Login"],
  ["ops.clearSessionDescription", "Sign out and clear cached authorization data.", "operations", "Sair e limpar os dados de autorização em cache."],
  ["ops.clearAll", "Clear All Local Settings", "operations", "Limpar Todas as Configurações Locais"],
  ["ops.clearAllDescription", "Remove all MyFitIdeas browser data on this device.", "operations", "Remover todos os dados do MyFitIdeas deste dispositivo."],
  ["ops.workspaceReset", "Workspace selection reset. The chooser will appear at the next login.", "operations", "Seleção de espaço redefinida. O seletor aparecerá no próximo login."],
  ["ops.languageReset", "Language cache reset. Reload the page to use the browser default.", "operations", "Cache de idioma redefinido. Recarregue a página para usar o padrão do navegador."],
  ["ops.themeReset", "Theme preference reset. Reload the page to use the system default.", "operations", "Preferência de tema redefinida. Recarregue a página para usar o padrão do sistema."],
  ["ops.diagnostics", "Diagnostics", "operations", "Diagnósticos"],
  ["ops.currentSession", "Current session details", "operations", "Detalhes da sessão atual"],
  ["ops.environment", "Environment", "operations", "Ambiente"],
  ["ops.organization", "Organization", "operations", "Organização"],
  ["ops.permissionCount", "Permission count", "operations", "Quantidade de permissões"],
  ["ops.currentLocale", "Current locale", "operations", "Localidade atual"],
  ["ops.workspaceSelection", "Workspace selection", "operations", "Seleção de espaço"],
  ["ops.notAvailable", "Not available", "operations", "Não disponível"],
  ["ops.saved", "Saved", "operations", "Salvo"],
  ["ops.notSelected", "Not selected", "operations", "Não selecionado"],
  ["ops.operationsMonitor", "Operations Monitor", "operations", "Monitor de Operações"],
  ["ops.futureMetrics", "Future live metrics dashboard", "operations", "Painel futuro de métricas em tempo real"],
  ["ops.monitorDescription", "This screen will continuously evaluate platform health and highlight degraded or critical readings.", "operations", "Esta tela avaliará continuamente a saúde da plataforma e destacará leituras degradadas ou críticas."],
  ["ops.registeredUsers", "Registered users", "operations", "Usuários registrados"],
  ["ops.usersOnline", "Users online", "operations", "Usuários online"],
  ["ops.apiResponse", "API response time", "operations", "Tempo de resposta da API"],
  ["ops.errorRate", "Error rate", "operations", "Taxa de erros"],
  ["ops.databaseWrites", "Database writes", "operations", "Gravações no banco de dados"],
  ["ops.activeConnections", "Active connections", "operations", "Conexões ativas"],
  ["ops.emailDelivery", "Email delivery", "operations", "Entrega de e-mail"],
  ["ops.systemUptime", "System uptime", "operations", "Tempo de atividade do sistema"],
  ["ops.awaitingTelemetry", "Awaiting telemetry", "operations", "Aguardando telemetria"],
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
