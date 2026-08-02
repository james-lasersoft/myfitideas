import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["nav.dashboard", "Dashboard", "navigation", "Painel"],
  ["nav.measurements", "Measurements", "navigation", "Medidas"],
  ["nav.hydration", "Hydration", "navigation", "Hidratação"],
  ["nav.progress", "Progress Charts", "navigation", "Gráficos de Progresso"],
  ["nav.profile", "Profile", "navigation", "Perfil"],
  ["auth.welcome", "Welcome back", "authentication", "Bem-vindo de volta"],
  ["auth.signIn", "Sign In", "authentication", "Entrar"],
  ["auth.email", "Email", "authentication", "E-mail"],
  ["auth.password", "Password", "authentication", "Senha"],
  ["common.save", "Save", "common", "Salvar"],
  ["common.delete", "Delete", "common", "Excluir"],
  ["common.cancel", "Cancel", "common", "Cancelar"],
  ["common.loading", "Loading...", "common", "Carregando..."],
  ["measurements.weight", "Weight", "measurements", "Peso"],
  ["measurements.waist", "Waist", "measurements", "Cintura"],
  ["measurements.chest", "Chest", "measurements", "Peitoral"],
  ["measurements.hips", "Hips", "measurements", "Quadril"],
  ["measurements.bodyFat", "Body Fat", "measurements", "Gordura Corporal"],
  ["hydration.dailyGoal", "Daily Goal", "hydration", "Meta Diária"],
  ["profile.firstName", "First Name", "profile", "Nome"],
  ["profile.lastName", "Last Name", "profile", "Sobrenome"],
  ["profile.timezone", "Time Zone", "profile", "Fuso Horário"],
  ["admin.tooltip.editSource", "Edit English source text", "admin", "Editar o texto-fonte em inglês"],
  ["admin.tooltip.editTranslation", "Edit Portuguese translation", "admin", "Editar a tradução em português"],
  ["admin.tooltip.saveDraft", "Save translation as a draft", "admin", "Salvar a tradução como rascunho"],
  ["admin.tooltip.publish", "Publish this translation", "admin", "Publicar esta tradução"],
  ["admin.tooltip.publishSelected", "Publish all selected translations", "admin", "Publicar todas as traduções selecionadas"],
  ["admin.tooltip.discard", "Discard unsaved changes", "admin", "Descartar alterações não salvas"],
  ["admin.tooltip.history", "View translation history", "admin", "Ver histórico da tradução"],
  ["admin.status.published", "Published and visible in the application", "admin", "Publicada e visível no aplicativo"],
  ["admin.status.reviewed", "Reviewed and awaiting publication", "admin", "Revisada e aguardando publicação"],
  ["admin.status.draft", "Draft or source changed; review required", "admin", "Rascunho ou fonte alterada; revisão necessária"],
  ["admin.status.missing", "Translation is missing", "admin", "A tradução está ausente"],
  ["admin.source.updated", "English source updated. Existing translations require review.", "admin", "Fonte em inglês atualizada. As traduções existentes precisam de revisão."],
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
      update: { category },
      create: { key, sourceText, category },
    });

    const currentSource = translationKey.sourceText;
    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: english.id } },
      update: { value: currentSource, status: "PUBLISHED", publishedValue: currentSource },
      create: { translationKeyId: translationKey.id, languageId: english.id, value: currentSource, status: "PUBLISHED", publishedValue: currentSource, publishedAt: new Date() },
    });
    await prisma.translationValue.upsert({
      where: { translationKeyId_languageId: { translationKeyId: translationKey.id, languageId: portuguese.id } },
      update: {},
      create: { translationKeyId: translationKey.id, languageId: portuguese.id, value: ptBr, status: "PUBLISHED", publishedValue: ptBr, publishedAt: new Date() },
    });
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
