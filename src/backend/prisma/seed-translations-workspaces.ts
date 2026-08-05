import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["workspace.choose", "Choose your workspace", "workspace", "Escolha seu espaço de trabalho"],
  ["workspace.startToday", "Where would you like to start today?", "workspace", "Onde você gostaria de começar hoje?"],
  ["workspace.switchAnytime", "You can switch workspaces at any time from the page header.", "workspace", "Você pode trocar de espaço de trabalho a qualquer momento pelo cabeçalho da página."],
  ["workspace.personal", "Personal", "workspace", "Pessoal"],
  ["workspace.myHealth", "My Health", "workspace", "Minha Saúde"],
  ["workspace.personalDescription", "Track hydration, measurements, goals, and personal progress.", "workspace", "Acompanhe hidratação, medidas, metas e progresso pessoal."],
  ["workspace.openHealth", "Open My Health", "workspace", "Abrir Minha Saúde"],
  ["workspace.work", "Work", "workspace", "Trabalho"],
  ["workspace.myfitideasWork", "MyFitIdeas Work", "workspace", "Trabalho MyFitIdeas"],
  ["workspace.workDescription", "Manage users, roles, translations, audit activity, and organization controls.", "workspace", "Gerencie usuários, funções, traduções, atividades de auditoria e controles da organização."],
  ["workspace.openWork", "Open MyFitIdeas Work", "workspace", "Abrir Trabalho MyFitIdeas"],
  ["workspace.label", "Workspace", "workspace", "Espaço de trabalho"],
  ["workspace.switch", "Switch workspace", "workspace", "Trocar espaço de trabalho"],
] as const;

async function main() {
  const english = await prisma.language.findUniqueOrThrow({ where: { locale: "en-US" } });
  const portuguese = await prisma.language.findUniqueOrThrow({ where: { locale: "pt-BR" } });

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
