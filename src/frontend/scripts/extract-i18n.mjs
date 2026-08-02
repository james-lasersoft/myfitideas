import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { frontendRoot, scanProject } from "./i18n-scan.mjs";

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 60) || "text";
}

async function main() {
  const { catalog, candidates } = await scanProject();
  const grouped = new Map();

  for (const candidate of candidates) {
    if (catalog.has(candidate.text)) continue;
    const existing = grouped.get(candidate.text) ?? {
      sourceText: candidate.text,
      suggestedKey: `${candidate.category}.${slug(candidate.text)}`,
      suggestedCategory: candidate.category,
      occurrences: [],
    };
    existing.occurrences.push({
      file: candidate.file,
      line: candidate.line,
      column: candidate.column,
      kind: candidate.kind,
    });
    grouped.set(candidate.text, existing);
  }

  const missing = [...grouped.values()].sort((left, right) =>
    left.suggestedCategory.localeCompare(right.suggestedCategory) ||
    left.sourceText.localeCompare(right.sourceText)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    missingCount: missing.length,
    entries: missing,
  };

  const outputDirectory = path.join(frontendRoot, "i18n-reports");
  const outputPath = path.join(outputDirectory, "missing-translations.json");
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (missing.length === 0) {
    console.log("No missing translation sources found.");
  } else {
    console.log(`Found ${missing.length} missing translation sources.`);
    console.log(`Report written to ${path.relative(frontendRoot, outputPath)}.`);
    for (const entry of missing) {
      const first = entry.occurrences[0];
      console.log(`- ${entry.sourceText} (${first.file}:${first.line})`);
    }
  }
}

main().catch((error) => {
  console.error("Localization extraction failed:", error);
  process.exit(1);
});
