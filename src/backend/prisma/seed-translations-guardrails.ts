import "dotenv/config";
import prisma from "../src/config/prisma.js";

const catalog = [
  ["guardrails.measurementDate", "Measurement Date", "guardrails", "Data da Medição"],
  ["guardrails.weeklyEvaluation", "Body measurements are evaluated across the elapsed weeks since the nearest previous entry.", "guardrails", "As medidas corporais são avaliadas ao longo das semanas decorridas desde o registro anterior mais próximo."],
  ["guardrails.enterOne", "Enter at least one measurement value.", "guardrails", "Insira pelo menos um valor de medição."],
  ["guardrails.review", "Measurement was not saved. Review the value and unit.", "guardrails", "A medição não foi salva. Revise o valor e a unidade."],
  ["guardrails.confirm", "Save this entry as confirmed?", "guardrails", "Salvar este registro como confirmado?"],
  ["guardrails.weightRange", "Weight must be between 25 and 450 kg.", "guardrails", "O peso deve estar entre 25 e 450 kg."],
  ["guardrails.waistRange", "Waist must be between 30 and 300 cm.", "guardrails", "A cintura deve estar entre 30 e 300 cm."],
  ["guardrails.chestRange", "Chest must be between 30 and 300 cm.", "guardrails", "O peitoral deve estar entre 30 e 300 cm."],
  ["guardrails.hipsRange", "Hips must be between 30 and 300 cm.", "guardrails", "O quadril deve estar entre 30 e 300 cm."],
  ["guardrails.bodyFatRange", "Body fat must be between 2% and 75%.", "guardrails", "A gordura corporal deve estar entre 2% e 75%."],
  ["guardrails.futureMeasurement", "Measurement dates cannot be in the future.", "guardrails", "As datas de medição não podem estar no futuro."],
  ["guardrails.futureHydration", "Hydration entries cannot be dated in the future.", "guardrails", "Os registros de hidratação não podem ter data futura."],
  ["guardrails.hydrationMaximum", "A single hydration entry cannot exceed 128 oz or 3,785 ml.", "guardrails", "Um único registro de hidratação não pode exceder 128 oz ou 3.785 ml."],
  ["guardrails.confirmHydration", "Please confirm this unusual hydration entry.", "guardrails", "Confirme este registro incomum de hidratação."],
  ["guardrails.duplicateHydration", "A matching hydration entry was logged within 30 seconds.", "guardrails", "Um registro de hidratação correspondente foi lançado nos últimos 30 segundos."],
  ["guardrails.dailyHydration", "This entry would raise the daily total above 256 oz or 7,570 ml.", "guardrails", "Este registro elevaria o total diário acima de 256 oz ou 7.570 ml."],
  ["guardrails.largeHydration", "This single entry is more than 150% of your daily hydration goal.", "guardrails", "Este único registro representa mais de 150% da sua meta diária de hidratação."],
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
