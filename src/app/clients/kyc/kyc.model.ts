/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * KYC tier. Sequential; cannot be skipped on upgrade.
 * Wire format is the literal string (`TIER_1` etc.) so the API stays
 * self-describing instead of leaning on positional integers.
 */
export type KycTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

/**
 * Ordered list of tiers, useful for select options and progression checks.
 */
export const KYC_TIERS: readonly KycTier[] = [
  'TIER_1',
  'TIER_2',
  'TIER_3'
];

/**
 * Display label for a tier: `TIER_1` → `Tier 1`. The wire value is kept
 * out of the UI so we never surface the enum casing to users.
 */
export function formatKycTier(tier: KycTier | null | undefined): string {
  if (!tier) return '';
  return 'Tier ' + tier.slice('TIER_'.length);
}

/**
 * KYC payload nested inside the client create/update body.
 * Blank strings are treated as absent and should be omitted on submit.
 */
export interface KycContext {
  tier: KycTier;
  bvn?: string;
  nin?: string;
  homeAddress?: string;
  countryOfResidence?: string;
}

/**
 * Field length limits enforced by the backend.
 */
export const KYC_FIELD_MAX_LENGTH = {
  bvn: 32,
  nin: 32,
  homeAddress: 512,
  countryOfResidence: 64
} as const;
