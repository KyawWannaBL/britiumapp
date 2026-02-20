/**
 * Generates:
 * - docs/rbac/permission-matrix.csv
 * - packages/shared/src/index.ts (permission catalog + role map section)
 *
 * Intentionally conservative and heuristic-based: you can replace categorization rules
 * with an explicit registry once modules stabilize.
 */

import fs from "node:fs";
import path from "node:path";

type Role =
  | "APP_OWNER"
  | "SUPER_ADMIN"
  | "OPERATIONS_ADMIN"
  | "FINANCE_STAFF"
  | "HR_ADMIN"
  | "MARKETING_ADMIN"
  | "SUPERVISOR"
  | "WAREHOUSE_MANAGER"
  | "SUBSTATION_MANAGER"
  | "RIDER"
  | "DRIVER"
  | "HELPER"
  | "DATA_ENTRY"
  | "CUSTOMER_SERVICE"
  | "STAFF"
  | "MERCHANT"
  | "CUSTOMER";

const ROLES: Role[] = [
  "APP_OWNER",
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "FINANCE_STAFF",
  "HR_ADMIN",
  "MARKETING_ADMIN",
  "SUPERVISOR",
  "WAREHOUSE_MANAGER",
  "SUBSTATION_MANAGER",
  "RIDER",
  "DRIVER",
  "HELPER",
  "DATA_ENTRY",
  "CUSTOMER_SERVICE",
  "STAFF",
  "MERCHANT",
  "CUSTOMER",
];

const DOMAIN_FOR_CATEGORY: Record<string, string> = {
  public: "PUB",
  identity: "AUTH",
  operations: "OPS",
  execution: "EXEC",
  fleet: "GPS",
  finance: "FIN",
  admin: "ADM",
  analytics: "ANA",
  warehouse: "WH",
  support: "SUP",
  hr: "HR",
  marketing: "MKT",
  merchant: "MER",
  customer: "CUS",
  "control-room": "CTRL",
};

const DEFAULT_SCOPE_FOR_DOMAIN: Record<string, string | undefined> = {
  PUB: undefined,
  AUTH: "S1_SELF",
  OPS: "S3_BRANCH",
  EXEC: "S3_BRANCH",
  GPS: "S3_BRANCH",
  FIN: "S4_REGION",
  ADM: "S5_COMPANY",
  ANA: "S4_REGION",
  WH: "S3_BRANCH",
  SUP: "S3_BRANCH",
  HR: "S5_COMPANY",
  MKT: "S5_COMPANY",
  MER: "S1_SELF",
  CUS: "S1_SELF",
  CTRL: "S5_COMPANY",
};

function pascalToSnake(input: string): string {
  return input
    .replace(/(.)([A-Z][a-z]+)/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function pascalToKebab(input: string): string {
  return input
    .replace(/(.)([A-Z][a-z]+)/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function categorizeByPath(relPath: string, baseName: string): keyof typeof DOMAIN_FOR_CATEGORY {
  const seg = relPath.split(/[\\/]/)[0]?.toLowerCase() ?? "";
  const map: Record<string, keyof typeof DOMAIN_FOR_CATEGORY> = {
    customer: "customer",
    merchant: "merchant",
    marketing: "marketing",
    office: "operations",
    approvals: "operations",
    rider: "execution",
    service: "support",
    substation: "operations",
    supervisor: "operations",
    warehouse: "warehouse",
    deliveries: "execution",
    groupshipments: "operations",
    home: "public",
    "not-found": "public",
  };
  if (map[seg]) return map[seg];

  const b = baseName.toLowerCase();
  if (b.startsWith("admin") || b.includes("audit") || b.includes("permission")) return "admin";
  if (b.includes("finance") || b.includes("report") || b.includes("revenue") || b.includes("billing")) return "finance";
  if (b.includes("gps") || b.includes("fleet") || b.includes("map")) return "fleet";
  if (b.includes("warehouse") || b.includes("inventory") || b.includes("dispatch") || b.includes("receiv")) return "warehouse";
  if (b.includes("rider") || b.includes("courier") || b.includes("delivery") || b.includes("signature")) return "execution";
  if (b.includes("support") || b.includes("ticket") || b.includes("claim") || b.includes("chat")) return "support";
  if (b.includes("marketing")) return "marketing";
  if (b.includes("humanresources") || b === "hr") return "hr";
  if (b.includes("merchant")) return "merchant";
  if (b.includes("customer")) return "customer";
  if (b.includes("analytics") || b.includes("kpi")) return "analytics";
  return "operations";
}

function buildPermission(domain: string, resource: string, action: string, scope?: string): string {
  const base = `${domain}:${resource}:${action}`;
  return scope ? `${base}:${scope}` : base;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isRoutable(rel: string): boolean {
  const lower = rel.toLowerCase();
  if (!lower.endsWith(".tsx")) return false;
  if (lower.includes("components/")) return false;
  if (lower.includes("kpichartcomponents")) return false;
  if (lower.includes("sidecar")) return false;
  if (lower.includes("react-signature-canvas")) return false;
  if (lower.includes("britium enterprise")) return false;
  if (path.basename(lower).startsWith("index")) return false;
  if (lower.endsWith(".simple.tsx")) return false;
  return true;
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const pagesRoot = path.join(repoRoot, "apps", "web-portal", "src", "pages");

  const files = walk(pagesRoot)
    .map((abs) => path.relative(pagesRoot, abs))
    .filter(isRoutable);

  const routes = files
    .map((rel) => {
      const base = path.basename(rel, ".tsx");
      const category = categorizeByPath(rel, base);
      const domain = DOMAIN_FOR_CATEGORY[category];
      const scope = DEFAULT_SCOPE_FOR_DOMAIN[domain];

      const resource = pascalToSnake(base);
      const perm = buildPermission(domain, resource, "VIEW", scope);

      const keb = pascalToKebab(base);

      let routePath = `/${category}/${keb}`;
      if (category === "admin") routePath = `/admin/${keb}`;
      if (category === "finance") routePath = base.toLowerCase() === "finance" ? "/finance" : `/finance/${keb}`;
      if (category === "analytics") routePath = base.toLowerCase() === "dashboard" ? "/dashboard" : `/analytics/${keb}`;
      if (category === "public") routePath = base.toLowerCase().includes("landing") ? "/" : `/${keb}`;
      if (category === "execution") routePath = `/execution/${keb}`;
      if (category === "warehouse") routePath = `/warehouse/${keb}`;
      if (category === "support") routePath = `/support/${keb}`;
      if (category === "merchant" || category === "customer") routePath = `/${category}/${keb}`;
      if (category === "operations") routePath = `/operations/${keb}`;

      return { rel, base, category, domain, scope, resource, perm, routePath };
    })
    .sort((a, b) => a.routePath.localeCompare(b.routePath));

  const permissionCatalog = new Map<string, string>();

  // must-have enterprise perms
  const seed: Array<[string, string]> = [
    ["PUB:TRACKING:VIEW", "Public shipment tracking"],
    ["PUB:RATES:VIEW", "Public rates preview"],
    ["PUB:LOCATIONS:VIEW", "Public locations list"],
    ["AUTH:PROFILE:VIEW:S1_SELF", "View own profile"],
    ["AUTH:PROFILE:UPDATE:S1_SELF", "Update own profile"],
    ["AUTH:SESSION:VIEW:S1_SELF", "View own sessions"],
    ["AUTH:PASSWORD:CHANGE:S1_SELF", "Change own password"],
    ["OPS:SHIPMENT:VIEW:S3_BRANCH", "View shipments (branch)"],
    ["OPS:SHIPMENT:CREATE:S3_BRANCH", "Create shipments (branch)"],
    ["OPS:SHIPMENT:UPDATE:S3_BRANCH", "Update shipments (branch)"],
    ["OPS:SHIPMENT:CANCEL:S3_BRANCH", "Cancel shipments (branch)"],
    ["OPS:SCAN:EXECUTE:S1_SELF", "Execute scanning"],
    ["OPS:EXCEPTION:CREATE:S3_BRANCH", "Create exceptions"],
    ["OPS:EXCEPTION:APPROVE:S4_REGION", "Approve exceptions (region)"],
    ["GPS:TRACKING:VIEW:S3_BRANCH", "View GPS tracking (branch)"],
    ["GPS:TRACKING:UPDATE:S1_SELF", "Update own GPS device"],
    ["GPS:GEOFENCE:CFG:S5_COMPANY", "Configure geofences"],
    ["FIN:COD:EXECUTE:S1_SELF", "Execute COD"],
    ["FIN:COD:RECONCILE:S3_BRANCH", "Reconcile COD"],
    ["FIN:REPORTS:VIEW:S4_REGION", "View finance reports"],
    ["FIN:REPORTS:EXPORT:S4_REGION", "Export finance reports"],
    ["ADM:USERS:VIEW:S5_COMPANY", "View users"],
    ["ADM:USERS:CREATE:S5_COMPANY", "Create users"],
    ["ADM:USERS:UPDATE:S5_COMPANY", "Update users"],
    ["ADM:USERS:DISABLE:S5_COMPANY", "Disable users"],
    ["ADM:AUDIT:VIEW:S5_COMPANY", "View audit logs"],
    ["ADM:SETTINGS:CFG:S5_COMPANY", "Configure settings"],
    ["CTRL:RBAC:VIEW:S5_COMPANY", "View Control Room RBAC"],
    ["CTRL:RBAC:WRITE:S5_COMPANY", "Write Control Room RBAC"],
    ["CTRL:PERMISSIONS:CATALOG:WRITE:S5_COMPANY", "Write permission catalog"],
    ["CTRL:POLICIES:RLS:DEPLOY:S5_COMPANY", "Deploy RLS policies"],
    ["CTRL:SYSTEM:FEATURE_FLAGS:CFG:S5_COMPANY", "Configure feature flags"],
  ];

  for (const [code, desc] of seed) permissionCatalog.set(code, desc);
  for (const r of routes) permissionCatalog.set(r.perm, `Access route ${r.routePath}`);

  const allCodes = Array.from(permissionCatalog.keys()).sort();

  const byDomain = new Map<string, string[]>();
  for (const code of allCodes) {
    const dom = code.split(":")[0] ?? "UNK";
    byDomain.set(dom, [...(byDomain.get(dom) ?? []), code]);
  }

  const domainCodes = (...doms: string[]): string[] => {
    const out: string[] = [];
    for (const d of doms) out.push(...(byDomain.get(d) ?? []));
    return Array.from(new Set(out)).sort();
  };

  const roleMap: Record<Role, string[]> = {
    APP_OWNER: allCodes,
    SUPER_ADMIN: allCodes.filter((c) => !c.startsWith("CTRL:")),
    OPERATIONS_ADMIN: domainCodes("AUTH", "OPS", "GPS", "WH", "EXEC", "ANA", "SUP"),
    FINANCE_STAFF: domainCodes("AUTH", "FIN", "ANA"),
    HR_ADMIN: domainCodes("AUTH", "HR"),
    MARKETING_ADMIN: domainCodes("AUTH", "MKT", "ANA"),
    SUPERVISOR: domainCodes("AUTH", "OPS", "GPS", "WH", "EXEC"),
    WAREHOUSE_MANAGER: domainCodes("AUTH", "WH", "OPS"),
    SUBSTATION_MANAGER: domainCodes("AUTH", "OPS", "EXEC"),
    RIDER: Array.from(
      new Set([
        ...domainCodes("AUTH", "EXEC"),
        ...allCodes.filter((c) => c.startsWith("GPS:TRACKING:UPDATE") || c.startsWith("OPS:SCAN:EXECUTE") || c.startsWith("FIN:COD:EXECUTE")),
        ...domainCodes("PUB"),
      ]),
    ).sort(),
    DRIVER: Array.from(new Set([...domainCodes("AUTH", "EXEC"), ...allCodes.filter((c) => c.startsWith("GPS:TRACKING:UPDATE")), ...domainCodes("PUB")])).sort(),
    HELPER: Array.from(new Set([...domainCodes("AUTH", "EXEC"), ...domainCodes("PUB")])).sort(),
    DATA_ENTRY: Array.from(new Set([...domainCodes("AUTH", "OPS"), ...domainCodes("PUB")])).sort(),
    CUSTOMER_SERVICE: Array.from(new Set([...domainCodes("AUTH", "SUP"), ...allCodes.filter((c) => c.startsWith("OPS:SHIPMENT:VIEW")), ...domainCodes("PUB")])).sort(),
    STAFF: Array.from(new Set([...domainCodes("AUTH"), ...allCodes.filter((c) => c.startsWith("OPS:SHIPMENT:VIEW")), ...domainCodes("PUB")])).sort(),
    MERCHANT: Array.from(new Set([...domainCodes("PUB", "AUTH", "MER")])).sort(),
    CUSTOMER: Array.from(new Set([...domainCodes("PUB", "AUTH", "CUS")])).sort(),
  };

  // CSV export
  const outCsv = path.join(repoRoot, "docs", "rbac", "permission-matrix.csv");
  fs.mkdirSync(path.dirname(outCsv), { recursive: true });

  const header = ["permission_code", "domain", "resource", "action", "scope", "description", ...ROLES];
  const lines = [header.join(",")];

  for (const code of allCodes) {
    const desc = permissionCatalog.get(code) ?? "";
    const parts = code.split(":");
    const row: Record<string, string> = {
      permission_code: code,
      domain: parts[0] ?? "",
      resource: parts[1] ?? "",
      action: parts[2] ?? "",
      scope: parts[3] ?? "",
      description: desc.replace(/"/g, '""'),
    };

    const cells = header.map((h) => {
      if (h in row) return `"${row[h] ?? ""}"`;
      const r = h as Role;
      return roleMap[r]?.includes(code) ? `"Y"` : `""`;
    });

    lines.push(cells.join(","));
  }

  fs.writeFileSync(outCsv, lines.join("\n"), "utf-8");

  // Minimal success output
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outCsv} (${allCodes.length} permissions)`);
}

main();
