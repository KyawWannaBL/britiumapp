import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function requireFile(relPath) {
  if (!exists(relPath)) throw new Error(`Missing required file: ${relPath}`);
}

function requireAny(candidates, label) {
  if (!candidates.some((p) => exists(p))) {
    throw new Error(`Missing ${label}. Checked: ${candidates.join(", ")}`);
  }
}

function ok(msg) {
  process.stdout.write(`✅ ${msg}\n`);
}

function warn(msg) {
  process.stdout.write(`⚠️  ${msg}\n`);
}

try {
  requireFile("package.json");
  requireAny(["pnpm-workspace.yaml", "turbo.json"], "workspace config");

  // Web portal
  requireFile("apps/web-portal/package.json");
  requireFile("apps/web-portal/src/main.tsx");
  requireFile("apps/web-portal/src/i18n/index.ts");
  requireFile("apps/web-portal/src/i18n/locales/en.json");
  requireFile("apps/web-portal/src/i18n/locales/mm.json");

  // Shared RBAC artifacts
  requireFile("packages/shared/package.json");
  requireAny(["packages/shared/src/index.ts"], "packages/shared entry");
  requireFile("docs/rbac/RBAC_DOCUMENTATION.md");
  requireFile("docs/rbac/permission-matrix.csv");

  // Supabase structure (optional)
  if (!exists("supabase/migrations")) warn("supabase/migrations not found (ok if not using DB yet).");
  if (!exists("supabase/functions")) warn("supabase/functions not found (ok if not using edge functions yet).");

  ok("Preflight checks passed.");
} catch (err) {
  console.error("❌ Preflight checks failed:\n" + (err?.message ?? err));
  process.exit(1);
}
