/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * AB-510: the fee components the posting engine (Synapse's `BillingFeeCalculator`) actually
 * recognizes today — `COMMISSION`, `CONVENIENCE_FEE`, `VAT`. A component code outside this set is
 * accepted by the schedule API but fails at transaction time with an "unknown reference transaction
 * type" error, not at config-save time — so the admin screen constrains input to this list rather than
 * accepting free text.
 */
export const BILLING_FEE_COMPONENT_CODES = [
  'COMMISSION',
  'CONVENIENCE_FEE',
  'VAT'
] as const;

export type BillingFeeComponentCode = (typeof BILLING_FEE_COMPONENT_CODES)[number];

/**
 * The TigerBeetle `Transfer.code` stamped on each component's ledger leg, for reporting/reconciliation
 * bucketing. This is a fixed 1:1 function of `componentCode` — every seeded schedule uses the same code
 * per component type — so the admin screen derives it automatically instead of accepting a free-typed
 * number (a typo here would silently misclassify a ledger transfer's reporting bucket).
 */
export const BILLING_FEE_COMPONENT_TB_TRANSFER_CODES: Record<BillingFeeComponentCode, number> = {
  COMMISSION: 201,
  CONVENIENCE_FEE: 202,
  VAT: 203
};

/**
 * AB-510: one fee component within a biller/product schedule. `dependsOnComponentCode`, when set,
 * means this component's percentage base is that other component's resolved amount (e.g. VAT depends
 * on CONVENIENCE_FEE) rather than the bill amount — and this component is skipped entirely whenever
 * its dependency is disabled. `rate` is the wire-level value the posting engine consumes: a fraction
 * for `PERCENT` (e.g. `0.01` for 1%), the flat amount for `FLAT`. The admin form presents `PERCENT`
 * rates to the operator as a 0-100 percentage and converts at the form/wire boundary — see
 * `edit-billing-fee-config.component.ts`.
 */
export interface BillingFeeComponent {
  componentCode: BillingFeeComponentCode | '';
  dependsOnComponentCode: string | null;
  rate: number;
  rateType: 'PERCENT' | 'FLAT';
  enabled: boolean;
  tbTransferCode: number;
}

/** The resolved fee configuration for one (billerCode, productCode) pair. */
export interface BillingFeeSchedule {
  billerCode: string;
  productCode: string;
  aggregatorCode: string;
  components: BillingFeeComponent[];
}

export interface BillingFeeScheduleList {
  schedules: BillingFeeSchedule[];
}
