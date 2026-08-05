import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

export const frontendRoot = process.cwd();
export const sourceRoot = path.join(frontendRoot, "src");

const memberCatalogPaths = [
  "seed-translations.ts",
  "seed-translations-extra.ts",
  "seed-translations-dashboard.ts",
  "seed-translations-dashboard-quick-add.ts",
  "seed-translations-privacy.ts",
  "seed-translations-account-creation.ts",
];

const administrationCatalogPaths = [
  "seed-translations-rbac.ts",
  "seed-translations-workspaces.ts",
  "seed-translations-admin-shell.ts",
  "seed-translations-system-operations.ts",
  "seed-translations-guardrails.ts",
  "seed-translations-security.ts",
  "seed-translations-security-operations-ui.ts",
  "seed-translations-company-settings.ts",
];

export const seedPaths = [...memberCatalogPaths, ...administrationCatalogPaths].map((fileName) =>
  path.resolve(frontendRoot, "../backend/prisma", fileName)
);

const ignoredDirectories = new Set(["node_modules", "dist", "coverage", ".git"]);
const ignoredFiles = new Set(["translations.ts"]);
const visibleAttributes = new Set(["placeholder", "title", "aria-label", "alt"]);
const messageFunctions = new Set(["setError", "setMessage", "alert", "confirm", "prompt"]);
const allowedLiterals = new Set(["MyFitIdeas"]);
const symbolOnlyPattern = /^[×✎◷●—✓←→]+$/;

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

export function normalize(value) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

export function looksUserFacing(value) {
  const text = normalize(value);
  if (!text || text.length < 2 || allowedLiterals.has(text)) return false;
  if (symbolOnlyPattern.test(text)) return false;
  if (/^[\d\s.,:;()\-+/%]+$/.test(text)) return false;
  if (/^(https?:\/\/|\/api\/|\.\/|\.\.\/|[A-Za-z]:\\)/.test(text)) return false;
  if (/^[a-z0-9_.:/-]+$/.test(text) && !text.includes(" ")) return false;
  if (/^[A-Z0-9_]+$/.test(text)) return false;
  return /[A-Za-zÀ-ÿ]/.test(text);
}

export async function collectFiles(directory = sourceRoot) {
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

function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (file.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function hasNoTranslateAttribute(node) {
  let current = node;
  while (current) {
    if (ts.isJsxElement(current)) {
      const attributes = current.openingElement.attributes.properties;
      if (attributes.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "data-no-translate")) return true;
    }
    if (ts.isJsxSelfClosingElement(current)) {
      const attributes = current.attributes.properties;
      if (attributes.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "data-no-translate")) return true;
    }
    current = current.parent;
  }
  return false;
}

function lineHasIgnore(sourceFile, node) {
  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
  const lineStart = sourceFile.getPositionOfLineAndCharacter(line, 0);
  const lineEnd = line + 1 < sourceFile.getLineStarts().length
    ? sourceFile.getPositionOfLineAndCharacter(line + 1, 0)
    : sourceFile.getFullText().length;
  return sourceFile.getFullText().slice(lineStart, lineEnd).includes("i18n-ignore");
}

function addCandidate(candidates, sourceFile, file, node, text, kind) {
  const normalized = normalize(text);
  if (!looksUserFacing(normalized) || lineHasIgnore(sourceFile, node) || hasNoTranslateAttribute(node)) return;
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  candidates.push({
    file: path.relative(frontendRoot, file),
    line: location.line + 1,
    column: location.character + 1,
    text: normalized,
    kind,
    category: inferCategory(file),
  });
}

export function inferCategory(file) {
  const base = path.basename(file).replace(/\.(tsx?|jsx?)$/, "");
  const value = base.replace(/Page$/, "").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  if (file.includes(`${path.sep}components${path.sep}`)) return "common";
  if (file.includes(`${path.sep}i18n${path.sep}`)) return "language";
  return value || "common";
}

export function scanSource(file, source) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
  const candidates = [];

  function visit(node) {
    if (ts.isJsxText(node)) {
      addCandidate(candidates, sourceFile, file, node, node.getText(sourceFile), "JSX text");
    } else if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.getText(sourceFile))) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) {
        addCandidate(candidates, sourceFile, file, node, node.initializer.text, `${node.name.getText(sourceFile)} attribute`);
      } else if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        const text = literalText(node.initializer.expression);
        if (text !== null) addCandidate(candidates, sourceFile, file, node, text, `${node.name.getText(sourceFile)} attribute`);
      }
    } else if (ts.isJsxExpression(node) && node.expression) {
      const text = literalText(node.expression);
      if (text !== null) addCandidate(candidates, sourceFile, file, node, text, "JSX expression");
    } else if (ts.isCallExpression(node)) {
      const expressionName = ts.isIdentifier(node.expression) ? node.expression.text : null;
      const firstArgument = node.arguments[0];
      if (expressionName === "t" && firstArgument) {
        const text = literalText(firstArgument);
        if (text !== null) addCandidate(candidates, sourceFile, file, firstArgument, text, "t() source");
      } else if (expressionName && messageFunctions.has(expressionName) && firstArgument) {
        const text = literalText(firstArgument);
        if (text !== null) addCandidate(candidates, sourceFile, file, firstArgument, text, `${expressionName} message`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return candidates;
}

export function extractCatalog(seedSource, seedPath) {
  const sourceFile = ts.createSourceFile(seedPath, seedSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const catalog = new Map();

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "catalog" && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) return;
      for (const row of initializer.elements) {
        const unwrappedRow = unwrapExpression(row);
        if (!ts.isArrayLiteralExpression(unwrappedRow) || unwrappedRow.elements.length < 4) continue;
        const key = literalText(unwrappedRow.elements[0]);
        const source = literalText(unwrappedRow.elements[1]);
        const category = literalText(unwrappedRow.elements[2]);
        const translation = literalText(unwrappedRow.elements[3]);
        if (key && source && category) catalog.set(normalize(source), { key, source: normalize(source), category, translation: translation ?? "" });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return catalog;
}

export async function scanProject() {
  const [seedSources, files] = await Promise.all([
    Promise.all(seedPaths.map(async (seedPath) => ({ seedPath, source: await fs.readFile(seedPath, "utf8") }))),
    collectFiles(),
  ]);

  const catalog = new Map();
  for (const { seedPath, source } of seedSources) {
    for (const [text, entry] of extractCatalog(source, seedPath)) catalog.set(text, entry);
  }
  if (catalog.size === 0) throw new Error(`No translation catalog entries were parsed from ${seedPaths.join(", ")}`);

  const candidates = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    if (source.includes("i18n-file-ignore")) continue;
    candidates.push(...scanSource(file, source));
  }

  const unique = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.file}:${candidate.line}:${candidate.kind}:${candidate.text}`;
    unique.set(key, candidate);
  }

  return { files, catalog, candidates: [...unique.values()] };
}
