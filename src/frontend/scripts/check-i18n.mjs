import process from "node:process";
import { scanProject } from "./i18n-scan.mjs";

async function main() {
  const { files, catalog, candidates } = await scanProject();
  const findings = candidates.filter((candidate) => !catalog.has(candidate.text));

  if (findings.length > 0) {
    console.error("\nLocalization guard failed.\n");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}:${finding.column}  unregistered ${finding.kind}: \"${finding.text}\"`);
    }
    console.error("\nRegister each user-facing English source in the appropriate translation catalog under src/backend/prisma/.");
    console.error("Use the member catalogs for customer-facing features and the administration catalogs for workspace, RBAC, security, and admin-shell text.");
    console.error("For intentional exceptions, use data-no-translate, i18n-ignore, or i18n-file-ignore.\n");
    process.exit(1);
  }

  console.log(`Localization guard passed: ${files.length} files checked against ${catalog.size} catalog entries.`);
}

main().catch((error) => {
  console.error("Localization guard failed to run:", error);
  process.exit(1);
});
