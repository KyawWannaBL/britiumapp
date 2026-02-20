# RBAC Documentation (Britium Enterprise)

## Role hierarchy (L0–L5)

- L5: APP_OWNER (exclusive Control Room)
- L4: SUPER_ADMIN
- L3: OPERATIONS_ADMIN, FINANCE_STAFF, HR_ADMIN, MARKETING_ADMIN
- L2: SUPERVISOR, WAREHOUSE_MANAGER, SUBSTATION_MANAGER
- L1: RIDER, DRIVER, HELPER, DATA_ENTRY, CUSTOMER_SERVICE, STAFF
- L0: MERCHANT, CUSTOMER

## Permission format

`<DOMAIN>:<RESOURCE>:<ACTION>[:<SCOPE>]`

Scopes:
- S1_SELF, S2_TEAM, S3_BRANCH, S4_REGION, S5_COMPANY

Actions:
- V, C, U, D, X, A, E, CFG

## Source of truth

- Catalog + default mapping: `packages/shared/src/index.ts`
- Generated matrix CSV: `docs/rbac/permission-matrix.csv`
- Generator: `scripts/generate-permission-matrix.ts`

## Control Room rules

- `CTRL:*` permissions are **APP_OWNER only**
- SUPER_ADMIN gets everything **except** Control Room permissions

## Supabase enforcement (server-side)

Migration: `supabase/migrations/20260220_000001_rbac_core.sql`

- `app.has_permission(code)` is used by RLS policies.
- RBAC tables (`app.roles`, `app.permissions`, `app.role_permissions`) are protected so only APP_OWNER can modify them.
