/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { KycTier } from '../../clients/kyc/kyc.model';

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
