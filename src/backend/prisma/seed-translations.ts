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
