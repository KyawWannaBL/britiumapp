/**
 * Generates permission code constants for packages/shared.
 * Intended workflow:
 * 1) Maintain the catalog in docs/rbac/permission-matrix.csv (or a dedicated catalog file).
 * 2) Generate TS constants to keep FE/BE aligned.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MATRIX = path.join(ROOT, "docs", "rbac", "permission-matrix.csv");

function main() {
  if (!fs.existsSync(MATRIX)) {
    throw new Error(`Missing: ${MATRIX}`);
  }
  const csv = fs.readFileSync(MATRIX, "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const idx = header.indexOf("permission_code");
  const codes = csv.slice(1).map((row) => row.split(",")[idx]).filter(Boolean);

  const out = [
    "/** Auto-generated. Do not edit by hand. */",
    "export const PERMISSION_CATALOG = " + JSON.stringify(codes, null, 2) + " as const;",
    "export type PermissionCatalogCode = typeof PERMISSION_CATALOG[number];",
    "",
  ].join("\n");

  const outPath = path.join(ROOT, "packages", "shared", "src", "permission-catalog.generated.ts");
  fs.writeFileSync(outPath, out);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${codes.length} codes)`);
}

main();
