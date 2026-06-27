# Tier-Policy Admin UI — Build Plan

## Goal

Ship the admin UI for KYC tier policy (tx-limits and balance-caps),
backed by synapse's `/access/api/v1/admin/kyc-tiers/...` endpoints
(synapse ticket T6, contract thread
`20260627T002453Z-tier-policy-admin-ui-contract`).

The contract is locked. We start the UI now in parallel with synapse's
backend build. The permission gate (`READ_TIERPOLICY`) is the
fail-safe: until synapse registers and grants it, the menu entry
won't render and the route is unreachable. The code ships dormant.

## Locked API contract (recap)

| Item                  | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| URL prefix            | `/access/api/v1/admin/kyc-tiers/...`                                  |
| Composite read        | `GET .../{tier}/policy` → `{ txLimits, balanceCaps }`                 |
| Tx-limit write        | `PUT/DELETE .../tier-tx-limits/{tier}/{paymentTypeId}/{currency}`     |
| Balance-cap write     | `PUT/DELETE .../tier-balance-caps/{tier}/{currency}`                  |
| Create                | Implicit-via-PUT: `200` update, `201` create                          |
| Errors                | Fineract envelope; `400` validation, `404` unknown tier/paymentTypeId |
| Permissions           | `READ_TIERPOLICY` (read + menu), `WRITE_TIERPOLICY` (all writes)      |
| Payment-type list     | Reuse `OrganizationService.getPaymentTypes()`                         |
| Currency list         | Reuse existing Mifos org currency list                                |
| Bulk writes           | None                                                                  |
| Stale-edit detection  | None in v1 (show "saved at" stamp on rows)                            |
| Missing-row semantics | Out of contract scope (AB-443)                                        |

## Deliverables

### 1. Routing escape for `/access/...` paths

**File:** `src/app/core/http/api-prefix.interceptor.ts`

Today the interceptor unconditionally prepends
`{server}/fineract-provider/api/v1` to every relative URL, with
escapes only for `/actuator/` and `/vN/`. Add a third escape: when
`request.url` starts with `/access/`, route to `serverHost` (bare
origin) so the full URL becomes `{server}/access/api/v1/...`.

One small change. No new config knobs.

### 2. TypeScript models

**File (new):** `src/app/system/tier-policy/tier-policy.model.ts`

```ts
export interface TierTxLimit {
  tier: KycTier;
  paymentTypeId: number;
  paymentTypeName?: string; // resolved server-side, nullable
  currency: string; // ISO-4217
  perTxCap: number;
  dailySpendCap: number;
  updatedAt?: string; // ISO-8601, for the "saved at" stamp
}

export interface TierBalanceCap {
  tier: KycTier;
  currency: string;
  balanceCap: number | null; // null = no cap on the row
  updatedAt?: string;
}

export interface TierPolicy {
  tier: KycTier;
  txLimits: TierTxLimit[];
  balanceCaps: TierBalanceCap[];
}
```

Reuses the existing `KycTier` type from
`src/app/clients/kyc/kyc.model.ts`.

### 3. Service

**File (new):** `src/app/system/tier-policy/tier-policy.service.ts`

Methods, all using relative `/access/...` URLs that the interceptor
will route correctly after deliverable 1:

- `getTierPolicy(tier: KycTier): Observable<TierPolicy>`
  → `GET /access/api/v1/admin/kyc-tiers/{tier}/policy`
- `putTxLimit(row: TierTxLimit): Observable<TierTxLimit>`
  → `PUT /access/api/v1/admin/kyc-tiers/tier-tx-limits/{tier}/{paymentTypeId}/{currency}`
- `deleteTxLimit(tier, paymentTypeId, currency): Observable<void>`
- `putBalanceCap(row: TierBalanceCap): Observable<TierBalanceCap>`
  → `PUT /access/api/v1/admin/kyc-tiers/tier-balance-caps/{tier}/{currency}`
- `deleteBalanceCap(tier, currency): Observable<void>`

### 4. Resolver

**File (new):** `src/app/system/tier-policy/tier-policy.resolver.ts`

`TierPolicyResolver` resolves `TierPolicy` from the route param `tier`.
Mirrors the pattern used by `HookResolver`, `SurveyResolver`, etc.

### 5. Page components

Folder (new): `src/app/system/tier-policy/`

- `tier-policy.component.{ts,html,scss}` — landing page. Tier
  selector (three tabs: TIER_1, TIER_2, TIER_3) driving the
  composite GET. Two sub-tables per tier: tx-limits and balance-caps.
  Each table has its own Add button and per-row edit/delete actions.
  Uses `*mifosxHasPermission="'WRITE_TIERPOLICY'"` to gate add/edit/
  delete affordances. Each row shows a "saved at HH:MM" stamp from
  `updatedAt`.
- `tx-limit-dialog.component.{ts,html}` — modal for create/edit of a
  tx-limit row. Form fields: payment-type dropdown (from
  `OrganizationService.getPaymentTypes()`), currency dropdown (from
  the existing org currency list), per-tx cap, daily-spend cap.
- `balance-cap-dialog.component.{ts,html}` — modal for create/edit
  of a balance-cap row. Form fields: currency dropdown, balance cap
  (nullable for "no cap on row").
- Delete confirmation uses the shared
  `app/shared/delete-dialog/delete-dialog.component`.

All components standalone (matches the pattern used by
`SystemComponent` and the recent KYC step components), with
`imports: [...STANDALONE_SHARED_IMPORTS, ...]`.

### 6. Routing

**File:** `src/app/system/system-routing.module.ts`

Add under the `system` parent route:

```ts
{
  path: 'tier-policy',
  data: { title: 'Tier Policy', breadcrumb: 'Tier Policy' },
  component: TierPolicyComponent,
  resolve: {
    paymentTypes: PaymentTypesResolver,
    currencies: CurrenciesResolver
  }
}
```

Tier selection is internal to the component (tab change reloads the
composite GET via the service); no route param for tier. Single
route keeps deep-linking simple and the breadcrumb stable.

Register `TierPolicyResolver` in the routing module's `providers`.

### 7. System landing-page tile

**File:** `src/app/system/system.component.html`

Add a `<mat-list-item>` in the existing `<mat-nav-list>` linking to
`/system/tier-policy`, with the same icon/label/explanation pattern
as the other tiles (icon: `shield-halved` or `gauge-high`; copy from
i18n).

### 8. Dashboard activity link

**File:** `src/app/home/activities.ts`

Add `{ activity: 'tier policy', path: '/system/tier-policy' }` so it
surfaces in the home dashboard's recent-activities and quick-access.

### 9. i18n labels

**File:** `src/assets/translations/en-US.json`

Add keys under `labels.heading`, `labels.inputs`, `labels.text` for
page title, table headers, dialog titles, and the explanation copy
on the system tile. Follow the existing keying conventions.

### 10. Unit tests

**File (new):** `src/app/system/tier-policy/tier-policy.service.spec.ts`

`HttpTestingController`-driven tests covering:

- Each method calls the correct URL.
- `getTierPolicy` returns the parsed shape on success.
- 400/404 errors propagate so the page can surface them.

No new e2e tests until synapse ships T6 and we can run against the
real endpoints.

## Order of work

1. Interceptor escape (deliverable 1) — unblocks everything.
2. Models + service + resolver (deliverables 2–4) + service tests
   (deliverable 10). Pure code + tests, no UI yet.
3. Routing + landing-page tile + dashboard activity (deliverables
   6–8). Wires the page in, gated by `READ_TIERPOLICY` — invisible
   until a user has the permission.
4. Page component + two dialogs (deliverable 5) + i18n labels
   (deliverable 9). End-to-end UI, fully gated.

Each step compiles and ships green on its own.

## Pre-existing constraints to respect

- **Interceptor must still work for fineract paths.** Any path that
  doesn't start with `/access/` keeps existing behaviour. Cover with
  a deliberate unit test alongside the new escape.
- **`serverHost` resolves to the bare origin.** When the app is
  served same-origin with the backend, `/access/...` resolves to
  `{origin}/access/...` — exactly what synapse-as-middleware expects.
- **RBAC backward compat.** `HasPermissionDirective` shows everything
  when `environment.productionModeEnableRBAC` is false. Existing
  behaviour; no change.
- **`KycTier` type already exists** at
  `src/app/clients/kyc/kyc.model.ts`. Reuse, do not redefine.

## What we don't do

- No bulk-save endpoint; no bulk-save UI. Per-row writes only.
- No optimistic locking / version field. Last-write-wins for v1;
  the "saved at" stamp surfaces freshness.
- No rendering of the cartesian product of
  (tier × payment-type × currency). Sparse list only.
- No synapse-side payment-type endpoint. Reuse fineract
  `/paymenttypes` via `OrganizationService.getPaymentTypes()`.

## Still blocked on synapse (does not block UI build)

- Live endpoints at the agreed prefix.
- `READ_TIERPOLICY` and `WRITE_TIERPOLICY` registered as actual
  permission strings on the server.
- OpenAPI doc with the missing-row one-liner pointing to AB-443.

When synapse pings, we run the UI against the real endpoints and
confirm there's no integration drift.

## File-change summary

New files:

- `src/app/system/tier-policy/tier-policy.model.ts`
- `src/app/system/tier-policy/tier-policy.service.ts`
- `src/app/system/tier-policy/tier-policy.service.spec.ts`
- `src/app/system/tier-policy/tier-policy.resolver.ts`
- `src/app/system/tier-policy/tier-policy.component.{ts,html,scss}`
- `src/app/system/tier-policy/tx-limit-dialog.component.{ts,html}`
- `src/app/system/tier-policy/balance-cap-dialog.component.{ts,html}`

Edited files:

- `src/app/core/http/api-prefix.interceptor.ts`
- `src/app/system/system-routing.module.ts`
- `src/app/system/system.component.html`
- `src/app/home/activities.ts`
- `src/assets/translations/en-US.json`
