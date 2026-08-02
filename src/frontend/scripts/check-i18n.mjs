import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const frontendRoot = process.cwd();
const sourceRoot = path.join(frontendRoot, "src");
const seedPath = path.resolve(frontendRoot, "../backend/prisma/seed-translations.ts");

const ignoredDirectories = new Set(["node_modules", "dist", "coverage", ".git"]);
const ignoredFiles = new Set(["translations.ts"]);
const nonUiAttributes = new Set([
  "className",
  "id",
  "name",
  "type",
  "value",
  "method",
  "role",
  "htmlFor",
  "data-testid",
  "data-no-translate",
]);

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function looksUserFacing(value) {
  const text = normalize(value);
  if (!text || text.length < 2) return false;
  if (/^[\d\s.,:;()\-+/%]+$/.test(text)) return false;
  if (/^(https?:\/\/|\/api\/|\.\/|\.\.\/|[A-Za-z]:\\)/.test(text)) return false;
  if (/^[a-z0-9_.:/-]+$/.test(text) && !text.includes(" ")) return false;
  if (/^[A-Z0-9_]+$/.test(text)) return false;
  return /[A-Za-zÀ-ÿ]/.test(text);
}

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(fullPath)));
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !ignoredFiles.has(entry.name)) files.push(fullPath);
  }
  return files;
}

function extractCatalog(seedSource) {
  const catalog = new Set();
  const rowPattern = /\[\s*"(?:[^"\\]|\\.)*"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"(?:[^"\\]|\\.)*"\s*,\s*"(?:[^"\\]|\\.)*"\s*\]/g;
  for (const match of seedSource.matchAll(rowPattern)) {
    catalog.add(JSON.parse(`"${match[1]}"`));
  }
  return catalog;
}

function addFinding(findings, file, source, index, text, kind) {
  findings.push({
    file: path.relative(frontendRoot, file),
    line: lineNumber(source, index),
    text: normalize(text),
    kind,
  });
}

function scanFile(file, source, catalog) {
  const findings = [];

  // Explicit translation calls must reference a registered canonical source string.
  const tCallPattern = /\bt\(\s*(["'`])([^"'`$]*(?:\\.[^"'`$]*)*)\1\s*\)/g;
  for (const match of source.matchAll(tCallPattern)) {
    const text = match[2].replace(/\\(["'`\\])/g, "$1");
    if (looksUserFacing(text) && !catalog.has(text)) {
      addFinding(findings, file, source, match.index, text, "unregistered t() source");
    }
  }

  // JSX text nodes. Registered text is allowed because the runtime localization layer
  // translates registered canonical English source text. New text must first be cataloged.
  const jsxTextPattern = />\s*([^<{][^<{]*?)\s*</g;
  for (const match of source.matchAll(jsxTextPattern)) {
    const text = normalize(match[1]);
    if (looksUserFacing(text) && !catalog.has(text) && !/^[×✎◷●—]+$/.test(text)) {
      addFinding(findings, file, source, match.index, text, "unregistered JSX text");
    }
  }

  // User-visible literal attributes.
  const attributePattern = /\b([A-Za-z_:][-A-Za-z0-9_:]*)\s*=\s*(["'])(.*?)\2/g;
  for (const match of source.matchAll(attributePattern)) {
    const attribute = match[1];
    const text = match[3];
    if (nonUiAttributes.has(attribute)) continue;
    if (["placeholder", "title", "aria-label", "alt"].includes(attribute) && looksUserFacing(text) && !catalog.has(text)) {
      addFinding(findings, file, source, match.index, text, `unregistered ${attribute}`);
    }
  }

  // Common user-facing state setters and browser dialogs.
  const messagePattern = /\b(setError|setMessage|alert|confirm|prompt)\(\s*(["'])(.*?)\2/g;
  for (const match of source.matchAll(messagePattern)) {
    const text = match[3];
    if (looksUserFacing(text) && !catalog.has(text)) {
      addFinding(findings, file, source, match.index, text, `unregistered ${match[1]} message`);
    }
  }

  return findings;
}

async function main() {
  const seedSource = await fs.readFile(seedPath, "utf8");
  const catalog = extractCatalog(seedSource);
  if (catalog.size === 0) {
    throw new Error(`No translation catalog entries were parsed from ${seedPath}`);
  }

  const files = await collectFiles(sourceRoot);
  const findings = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    if (source.includes("i18n-file-ignore")) continue;
    findings.push(...scanFile(file, source, catalog));
  }

  if (findings.length) {
    console.error("\nLocalization guard failed.\n");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}  ${finding.kind}: \"${finding.text}\"`);
    }
    console.error("\nRegister each user-facing English source in src/backend/prisma/seed-translations.ts.");
    console.error("For intentionally non-translatable content, add data-no-translate=\"true\" or // i18n-ignore on the same line.\n");
    process.exit(1);
  }

  console.log(`Localization guard passed: ${files.length} files checked against ${catalog.size} catalog entries.`);
}

main().catch((error) => {
  console.error("Localization guard failed to run:", error);
  process.exit(1);
});
