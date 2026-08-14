/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * AB-510: one fee component within a biller/product schedule. `dependsOnComponentCode`, when set,
 * means this component's percentage base is that other component's resolved amount (e.g. VAT depends
 * on CONVENIENCE_FEE) rather than the bill amount — and this component is skipped entirely whenever
 * its dependency is disabled. Not a closed set of `componentCode` values — the engine supports a
 * future fee type added purely through configuration.
 */
export interface BillingFeeComponent {
  componentCode: string;
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
