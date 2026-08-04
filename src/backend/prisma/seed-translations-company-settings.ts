import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["company.settings.title", "Company Settings", "administration", "Configurações da Empresa"],
  ["company.settings.moduleDescription", "Configure provider-neutral services and organization security policies.", "administration", "Configure serviços independentes de provedor e políticas de segurança da organização."],
  ["company.settings.open", "Open Company Settings", "administration", "Abrir Configurações da Empresa"],
  ["company.settings.eyebrow", "Organization Controls", "administration", "Controles da Organização"],
  ["company.settings.description", "Configure provider-neutral services and security policies without storing provider secrets in MyFitIdeas.", "administration", "Configure serviços independentes de provedor e políticas de segurança sem armazenar segredos do provedor no MyFitIdeas."],
  ["company.settings.loading", "Loading company settings...", "administration", "Carregando configurações da empresa..."],
  ["company.settings.loadError", "Unable to load company settings.", "administration", "Não foi possível carregar as configurações da empresa."],
  ["company.settings.updated", "Company settings updated.", "administration", "Configurações da empresa atualizadas."],
  ["company.settings.updateError", "Unable to update company settings.", "administration", "Não foi possível atualizar as configurações da empresa."],
  ["company.settings.geolocation", "IP Geolocation Provider", "security", "Provedor de Geolocalização por IP"],
  ["company.settings.geolocationDescription", "Approximate login location is derived from the public IP address only. Device GPS is never requested.", "security", "A localização aproximada do login é derivada apenas do endereço IP público. O GPS do dispositivo nunca é solicitado."],
  ["company.settings.testMode", "Test data mode", "security", "Modo de dados de teste"],
  ["company.settings.disabled", "Disabled", "security", "Desativado"],
  ["company.settings.provider", "Provider", "security", "Provedor"],
  ["company.settings.customProvider", "Custom provider", "security", "Provedor personalizado"],
  ["company.settings.credentialEnv", "Credential environment variable", "security", "Variável de ambiente da credencial"],
  ["company.settings.secretInstruction", "Store the secret in the deployment environment. Only its variable name is saved here.", "security", "Armazene o segredo no ambiente de implantação. Apenas o nome da variável é salvo aqui."],
  ["company.settings.credentialStatus", "Credential status", "security", "Status da credencial"],
  ["company.settings.configured", "Configured in environment", "security", "Configurada no ambiente"],
  ["company.settings.notConfigured", "Not configured", "security", "Não configurada"],
  ["company.settings.enable", "Enable provider lookups", "security", "Ativar consultas ao provedor"],
  ["company.settings.keepDisabled", "Keep disabled while using seeded test locations.", "security", "Mantenha desativado enquanto estiver usando localizações de teste semeadas."],
  ["company.settings.newLoginOnly", "Lookup only when a new login session is created", "security", "Consultar apenas quando uma nova sessão de login for criada"],
  ["company.settings.persist", "Persist the result and avoid repeated provider requests.", "security", "Persistir o resultado e evitar solicitações repetidas ao provedor."],
  ["company.settings.displayLocation", "Display city, region, and country", "security", "Exibir cidade, região e país"],
  ["company.settings.displayDescription", "Show an approximate location in member and administrator security views.", "security", "Mostrar uma localização aproximada nas visualizações de segurança do membro e do administrador."],
  ["company.settings.retainCoordinates", "Retain approximate coordinates", "security", "Reter coordenadas aproximadas"],
  ["company.settings.coordinatesDefault", "Disabled by default to minimize stored location data.", "security", "Desativado por padrão para minimizar os dados de localização armazenados."],
  ["company.settings.seededData", "Use seeded test location data", "security", "Usar dados de localização de teste semeados"],
  ["company.settings.seededDescription", "Allows interface testing without a paid provider account.", "security", "Permite testar a interface sem uma conta paga de provedor."],
  ["company.settings.secretHandling", "Secret handling", "security", "Tratamento de segredos"],
  ["company.settings.secretPolicy", "Provider tokens are never stored in the database, audit logs, browser, or source repository.", "security", "Os tokens do provedor nunca são armazenados no banco de dados, logs de auditoria, navegador ou repositório de código-fonte."],
  ["company.settings.saving", "Saving settings...", "administration", "Salvando configurações..."],
  ["company.settings.save", "Save Company Settings", "administration", "Salvar Configurações da Empresa"],
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
