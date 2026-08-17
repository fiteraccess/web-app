/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** A complete aggregator accounting replacement request accepted by Fineract. */
export interface AggregatorAccountingConfigurationRequest {
  aggregatorPayableGlAccountId: number;
  commissionIncomeGlAccountId: number;
  convenienceFeeIncomeGlAccountId?: number | null;
  active: boolean;
}

/** An aggregator accounting configuration returned by Fineract (AB-510). */
export interface AggregatorAccountingConfiguration {
  aggregatorCode: string;
  aggregatorPayableGlAccountId: number;
  commissionIncomeGlAccountId: number;
  convenienceFeeIncomeGlAccountId?: number | null;
  active: boolean;
}

/** Fineract's standard command result returned after an aggregator configuration upsert. */
export interface AggregatorAccountingCommandResult {
  commandId?: number;
  resourceId?: number;
  resourceIdentifier?: string;
}

/** Matches Fineract's public aggregator identifier normalization for route navigation. */
export function normalizeAggregatorCode(aggregatorCode: string): string {
  return aggregatorCode.trim().toUpperCase();
}
