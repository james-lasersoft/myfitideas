import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["common.loadingPage", "Loading page...", "common", "Carregando página..."],
  ["theme.switchLight", "Switch to light mode", "appearance", "Mudar para o modo claro"],
  ["theme.switchDark", "Switch to dark mode", "appearance", "Mudar para o modo escuro"],

  ["admin.companyEyebrow", "Company administration", "admin", "Administração da empresa"],
  ["admin.centerTitle", "Administration Center", "admin", "Central de Administração"],
  ["admin.centerDescription", "Manage language content and prepare the operational controls that will be secured by RBAC in the next phase.", "admin", "Gerencie o conteúdo de idiomas e prepare os controles operacionais que serão protegidos por RBAC na próxima fase."],
  ["admin.modulesLabel", "Administrative modules", "admin", "Módulos administrativos"],
  ["admin.available", "Available", "admin", "Disponível"],
  ["admin.translationModuleDescription", "Edit, review, and publish English and Brazilian Portuguese interface content.", "admin", "Edite, revise e publique o conteúdo da interface em inglês e português brasileiro."],
  ["admin.openTranslationManager", "Open Translation Manager", "admin", "Abrir Gerenciador de Traduções"],
  ["admin.planned", "Planned", "admin", "Planejado"],
  ["admin.comingRbac", "Coming in RBAC phase", "admin", "Disponível na fase de RBAC"],
  ["admin.dashboardDescription", "Manage translations and future company controls.", "admin", "Gerencie traduções e futuros controles da empresa."],
  ["admin.openAdministration", "Open Administration", "admin", "Abrir Administração"],

  ["dashboard.sinceLastMeasurement", "since last measurement", "dashboard", "desde a última medição"],

  ["hydration.loadRecordsFailed", "Unable to load hydration records.", "hydration", "Não foi possível carregar os registros de hidratação."],
  ["hydration.selectDateTime", "Select both an entry date and time.", "hydration", "Selecione a data e a hora do registro."],
  ["hydration.saveEntryFailed", "Unable to save hydration entry.", "hydration", "Não foi possível salvar o registro de hidratação."],
  ["hydration.amountPositive", "Enter a hydration amount greater than zero.", "hydration", "Informe uma quantidade de hidratação maior que zero."],
  ["hydration.goalPositive", "Enter a hydration goal greater than zero.", "hydration", "Informe uma meta de hidratação maior que zero."],
  ["hydration.goalUpdated", "Daily hydration goal updated.", "hydration", "Meta diária de hidratação atualizada."],
  ["hydration.goalUpdateFailed", "Unable to update the hydration goal.", "hydration", "Não foi possível atualizar a meta de hidratação."],
  ["hydration.entryDeleted", "Hydration entry deleted successfully.", "hydration", "Registro de hidratação excluído com sucesso."],
  ["hydration.deleteFailed", "Unable to delete hydration entry.", "hydration", "Não foi possível excluir o registro de hidratação."],
  ["hydration.goalPrefix", "Goal:", "hydration", "Meta:"],
  ["hydration.dailyGoalOpen", "Daily Goal (", "hydration", "Meta Diária ("],
  ["hydration.noTotal", "No hydration total is available.", "hydration", "Nenhum total de hidratação está disponível."],
  ["hydration.ounces", "Ounces", "hydration", "Onças"],
  ["hydration.milliliters", "Milliliters", "hydration", "Mililitros"],
  ["hydration.beverageDescription", "Record beverages that contribute to your daily hydration.", "hydration", "Registre bebidas que contribuem para sua hidratação diária."],
  ["hydration.logHydration", "Log Hydration", "hydration", "Registrar Hidratação"],
  ["hydration.recordBeverageVolume", "Record water or another beverage by volume.", "hydration", "Registre água ou outra bebida por volume."],
  ["hydration.beverage", "Beverage", "hydration", "Bebida"],
  ["hydration.beverageType", "Beverage type", "hydration", "Tipo de bebida"],
  ["hydration.more", "More", "hydration", "Mais"],
  ["hydration.moreBeverages", "More beverages", "hydration", "Mais bebidas"],
  ["hydration.selectBeverage", "Select beverage", "hydration", "Selecionar bebida"],
  ["hydration.loggingFor", "Logging For", "hydration", "Registrando para"],
  ["hydration.progressView", "Progress view", "hydration", "Visualização do progresso"],
  ["hydration.daily", "Daily", "hydration", "Diário"],
  ["hydration.sevenDays", "7 Days", "hydration", "7 Dias"],
  ["hydration.lastSevenDays", "Last 7 days hydration", "hydration", "Hidratação dos últimos 7 dias"],

  ["measurements.preferenceIntro", "Entries use your profile preferences:", "measurements", "Os registros usam as preferências do seu perfil:"],
  ["measurements.forWeight", "for weight and", "measurements", "para peso e"],
  ["measurements.forBody", "for body measurements.", "measurements", "para medidas corporais."],
  ["measurements.weightOpen", "Weight (", "measurements", "Peso ("],
  ["measurements.waistOpen", "Waist (", "measurements", "Cintura ("],
  ["measurements.chestOpen", "Chest (", "measurements", "Peitoral ("],
  ["measurements.hipsOpen", "Hips (", "measurements", "Quadril ("],
  ["measurements.bodyFatPercent", "Body Fat (%)", "measurements", "Gordura Corporal (%)"],
  ["measurements.weightLabel", "Weight:", "measurements", "Peso:"],
  ["measurements.waistLabel", "Waist:", "measurements", "Cintura:"],
  ["measurements.chestLabel", "Chest:", "measurements", "Peitoral:"],
  ["measurements.hipsLabel", "Hips:", "measurements", "Quadril:"],
  ["measurements.bodyFatLabel", "Body Fat:", "measurements", "Gordura Corporal:"],

  ["profile.futureRelease", "Planned for a future release", "profile", "Planejado para uma versão futura"],
  ["profile.loadFailed", "Unable to load your profile.", "profile", "Não foi possível carregar seu perfil."],
  ["profile.firstNameRequired", "First name is required.", "profile", "O nome é obrigatório."],
  ["profile.heightInvalid", "Height must be a valid number.", "profile", "A altura deve ser um número válido."],
  ["profile.hydrationGoalPositive", "Daily hydration goal must be greater than zero.", "profile", "A meta diária de hidratação deve ser maior que zero."],
  ["profile.targetWeightPositive", "Target weight must be greater than zero.", "profile", "O peso-alvo deve ser maior que zero."],
  ["profile.emailFuture", "Email changes will be available in a future release.", "profile", "A alteração de e-mail estará disponível em uma versão futura."],
  ["profile.changePassword", "Change Password", "profile", "Alterar Senha"],
  ["profile.passwordPlanned", "Secure password management is planned.", "profile", "O gerenciamento seguro de senhas está planejado."],
  ["profile.unitHelp", "Click a unit to update the related values immediately.", "profile", "Clique em uma unidade para atualizar imediatamente os valores relacionados."],
  ["profile.dailyHydrationGoal", "Daily Hydration Goal", "profile", "Meta Diária de Hidratação"],
  ["profile.dateMmDdYyyy", "MM/DD/YYYY", "profile", "MM/DD/AAAA"],
  ["profile.dateDdMmYyyy", "DD/MM/YYYY", "profile", "DD/MM/AAAA"],
  ["profile.dateIso", "YYYY-MM-DD", "profile", "AAAA-MM-DD"],
  ["profile.time12", "12 hr", "profile", "12 h"],
  ["profile.time24", "24 hr", "profile", "24 h"],
  ["profile.futureSettings", "Future Settings", "profile", "Configurações Futuras"],
  ["profile.futureSettingsDescription", "These areas are staged in the profile layout and will be activated as their features are built.", "profile", "Estas áreas estão preparadas no perfil e serão ativadas à medida que seus recursos forem desenvolvidos."],
  ["profile.appearance", "Appearance", "profile", "Aparência"],
  ["profile.notifications", "Notifications", "profile", "Notificações"],
  ["profile.subscription", "Subscription", "profile", "Assinatura"],
  ["profile.exportData", "Export My Data", "profile", "Exportar Meus Dados"],
  ["profile.deleteAccount", "Delete Account", "profile", "Excluir Conta"],

  ["progress.rangeAria", "Chart date range", "progress", "Período de datas do gráfico"],
  ["progress.weightDescription", "Body weight recorded during the selected period.", "progress", "Peso corporal registrado durante o período selecionado."],
  ["progress.noWeight", "No weight measurements are available for this period.", "progress", "Nenhuma medição de peso está disponível para este período."],
  ["progress.bodyFatDescription", "Body-fat percentage measurements.", "progress", "Medições do percentual de gordura corporal."],
  ["progress.noBodyFat", "No body-fat measurements are available for this period.", "progress", "Nenhuma medição de gordura corporal está disponível para este período."],
  ["progress.hydrationDescription", "Total hydration logged each day.", "progress", "Hidratação total registrada a cada dia."],
  ["progress.noHydration", "No hydration entries are available for this period.", "progress", "Nenhum registro de hidratação está disponível para este período."],
  ["progress.bodyMeasurementsDescription", "Waist, chest, and hip measurements.", "progress", "Medições de cintura, peitoral e quadril."],
  ["progress.noBodyMeasurements", "No body measurements are available for this period.", "progress", "Nenhuma medida corporal está disponível para este período."],

  ["admin.translations.eyebrow", "Administration / Translations", "admin", "Administração / Traduções"],
  ["admin.translations.pagesAria", "Translation pages", "admin", "Páginas de tradução"],
  ["admin.translations.pageSeparator", "· Page", "admin", "· Página"],
  ["admin.translations.historyHeading", "History", "admin", "Histórico"],
  ["admin.translations.loadingHistory", "Loading history...", "admin", "Carregando histórico..."],
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
