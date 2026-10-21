/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** AB-566: withdrawals that count towards the Regular Savings monthly limit (interest forfeiture) by default. */
export const QUALIFYING_WITHDRAWAL_TYPES: readonly string[] = [
  'INTERBANK_TRANSFER',
  'INTRABANK_TRANSFER',
  'OWN_ACCOUNT_TRANSFER',
  'BILL_PAYMENT',
  'AIRTIME',
  'DATA'
];

/** Every selectable type: the defaults plus the ones a product must opt in to. */
export const ALL_QUALIFYING_WITHDRAWAL_TYPES: readonly string[] = [
  ...QUALIFYING_WITHDRAWAL_TYPES,
  'CASH_WITHDRAWAL',
  'CARD_PURCHASE',
  'ATM_WITHDRAWAL'
];

export const DEFAULT_MONTHLY_WITHDRAWAL_THRESHOLD = 4;

/** The only product category the monthly withdrawal limit applies to. */
export const WITHDRAWAL_LIMIT_PRODUCT_CATEGORY = 'DIGITAL';

export interface WithdrawalRule {
  effectiveFrom: string;
  withdrawalCounterEnabled: boolean;
  monthlyWithdrawalThreshold: number;
  qualifyingWithdrawalTypes: string[];
}

/** Local calendar date as yyyy-MM-dd, the format Fineract uses for `effectiveFrom`. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Rules that start after `today`, oldest first; the product's top-level fields describe the current month. */
export function pendingWithdrawalRules(
  rules: WithdrawalRule[] | null | undefined,
  today: string = isoDate(new Date())
): WithdrawalRule[] {
  return (rules ?? [])
    .filter((rule) => rule.effectiveFrom > today)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}
