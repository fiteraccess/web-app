/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Wire shapes of Synapse's EOD GL mirror mapping admin API (`/access/api/v1/admin/eod/gl-mappings`). */

export type EodJob = 'DEPOSIT' | 'INCOME' | 'TAX' | 'INTEREST' | 'SETTLEMENT';
export const EOD_JOBS: EodJob[] = [
  'DEPOSIT',
  'INCOME',
  'TAX',
  'INTEREST',
  'SETTLEMENT'
];
export const MIRRORED_JOBS: EodJob[] = [
  'DEPOSIT',
  'INCOME',
  'TAX',
  'INTEREST'
];

export type AmountSource =
  | 'DEPOSIT_MOVEMENT'
  | 'REFERENCE_TYPE'
  | 'TX_TYPE'
  | 'NIP_COMMISSION'
  | 'SWITCH_FEE'
  | 'BILLS_COMMISSION'
  | 'AIRTIME_COMMISSION'
  | 'STATEMENT_FEE'
  | 'GOAL_PENALTY'
  | 'NONE';

export const AMOUNT_SOURCES: AmountSource[] = [
  'DEPOSIT_MOVEMENT',
  'REFERENCE_TYPE',
  'TX_TYPE',
  'NIP_COMMISSION',
  'SWITCH_FEE',
  'BILLS_COMMISSION',
  'AIRTIME_COMMISSION',
  'STATEMENT_FEE',
  'GOAL_PENALTY'
];

/** The sources Synapse reads through a `sourceKey`; each lists the keys it accepts, or null when they are loaded. */
export const SOURCE_KEY_OPTIONS: Partial<Record<AmountSource, string[] | null>> = {
  REFERENCE_TYPE: [
    'VAT',
    'EMT_LEVY'
  ],
  TX_TYPE: [
    'WITHHOLD_TAX',
    'INTEREST_POSTING',
    'OVERDRAFT_INTEREST'
  ],
  NIP_COMMISSION: null,
  SWITCH_FEE: null,
  BILLS_COMMISSION: null,
  AIRTIME_COMMISSION: null
};

export type Side = 'DEBIT' | 'CREDIT';

export interface FlexGl {
  gl: string;
  branch: string;
}

export interface EodGlMapping {
  id?: number;
  job: EodJob;
  logicalName: string;
  amountSource: AmountSource;
  sourceKey: string | null;
  finSourceRef: string | null;
  finBridgeRef: string | null;
  normalSide: Side;
  flexSource: FlexGl | null;
  flexBridge: FlexGl | null;
  mirroredThrough: string | null;
  active: boolean;
}

/** PUT and preview body; job and logical name travel in the path. */
export interface EodGlMappingRequest {
  amountSource: AmountSource;
  sourceKey: string | null;
  finSourceRef: string | null;
  finBridgeRef: string | null;
  normalSide: Side;
  flexSource: FlexGl | null;
  flexBridge: FlexGl | null;
  active: boolean;
}

export interface ResolvedGl {
  glId: number;
  glCode: string;
  type: string;
}

export interface EodGlMappingPreview {
  category: string | null;
  source: ResolvedGl | null;
  sourceByProduct: (ResolvedGl & { productId: number })[];
  bridge: ResolvedGl | null;
}

export type SourceKind = 'PRODUCT' | 'ACTIVITY' | 'SWITCH' | 'AGGREGATOR';

/** The GLs a NIP switch's accounting configuration offers the mirror: its commission income and its switch fee. */
export type SwitchGl = 'commissionIncome' | 'switchFee';
export const SWITCH_GLS: SwitchGl[] = [
  'commissionIncome',
  'switchFee'
];
export const PRODUCT_CATEGORIES = [
  'DIGITAL',
  'AUTOSAVE',
  'GOAL'
];

/** Fineract savings product accounting keys the mirror can read, plus the product's withholding-tax credit account. */
export const PRODUCT_ACCOUNT_KEYS = [
  'savingsControlAccount',
  'interestOnSavingsAccount',
  'incomeFromFeeAccount',
  'incomeFromPenaltyAccount',
  'interestPayableAccount',
  'withHoldTax'
];

/** The bridge each mirrored job clears into, as Fineract financial activities 205 to 208. */
export const DEFAULT_BRIDGE_ACTIVITY: Partial<Record<EodJob, number>> = {
  DEPOSIT: 205,
  INCOME: 206,
  TAX: 207,
  INTEREST: 208
};

/** A row's identity in the URL: job and logical name, both path segments. */
export function mappingPath(job: EodJob, logicalName: string): string {
  return `/access/api/v1/admin/eod/gl-mappings/${encodeURIComponent(job)}/${encodeURIComponent(logicalName)}`;
}

/** The message Synapse answered with, for an inline error. */
export function synapseMessage(error: any): string {
  return error?.error?.defaultUserMessage ?? error?.error?.developerMessage ?? error?.message ?? 'Request failed';
}
