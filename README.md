# Britium Enterprise Monorepo

HEAD
See docs/ for architecture and RBAC.
# britiumapp
# britiumapp
Enterprise monorepo layout:

- `apps/web-portal` — React (Vite) portal
- `packages/shared` — roles + permission codes + role→permission mapping (source of truth)
- `supabase` — migrations, seed, edge functions, policies
- `docs` — RBAC + architecture docs
- `scripts` — generators + build verification

## Prerequisites

- Node.js **20 LTS** (recommended)
- `pnpm` (workspace package manager)

Windows install (PowerShell / Git Bash):

```bash
npm i -g pnpm
pnpm -v
```

If you hit low disk space during install, move pnpm store to another drive:

```bash
pnpm config set store-dir D:\pnpm-store
```

## Environment variables

Frontend (Vite) expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Copy and edit:

```bash
cp .env.example apps/web-portal/.env.local
```

## Local development

From repo root:

```bash
pnpm install
pnpm --filter web-portal dev
```

## Build

```bash
pnpm -w verify:build
pnpm --filter web-portal build
```

## CI

GitHub Actions runs:

- `node scripts/verify-build.mjs`
- `pnpm --filter web-portal build`

## Deploy

### Vercel
- Root Directory: `apps/web-portal`
- Install: `pnpm install`
- Build: `pnpm --filter web-portal build`
- Output: `apps/web-portal/dist`
- Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Netlify
`apps/web-portal/netlify.toml` is included.

### Cloudflare Pages
- Build command: `pnpm --filter web-portal build`
- Output: `apps/web-portal/dist`

## Supabase

Install Supabase CLI, then (from repo root):

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Seed RBAC:

```bash
supabase db reset
```

(Or manually run `supabase/seed/seed_rbac.sql`.)

## RBAC Source of Truth

- `packages/shared/src/index.ts` — roles + permissions + mapping
- `docs/rbac/permission-matrix.csv` — exported matrix
- `scripts/generate-permission-matrix.ts` — generator (expand as modules grow)
e252eaf (init)
