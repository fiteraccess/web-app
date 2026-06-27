/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Models */
import { KycTier } from '../../clients/kyc/kyc.model';
import { TierBalanceCap, TierPolicy, TierTxLimit } from './tier-policy.model';

/**
 * Tier policy service. All URLs start with `/access/` so the api-prefix
 * interceptor routes them to `serverHost` (bare origin) instead of the
 * fineract-provider prefix.
 */
@Injectable({
  providedIn: 'root'
})
export class TierPolicyService {
  private http = inject(HttpClient);

  /**
   * @param {KycTier} tier KYC tier.
   * @returns {Observable<TierPolicy>} Composite policy (tx-limits + balance-caps) for the tier.
   */
  getTierPolicy(tier: KycTier): Observable<TierPolicy> {
    return this.http.get<TierPolicy>(`/access/api/v1/admin/kyc-tiers/${tier}/policy`);
  }

  /**
   * @param {TierTxLimit} row Tx-limit row to upsert.
   * @returns {Observable<TierTxLimit>} Persisted row.
   */
  putTxLimit(row: TierTxLimit): Observable<TierTxLimit> {
    return this.http.put<TierTxLimit>(
      `/access/api/v1/admin/kyc-tiers/tier-tx-limits/${row.tier}/${row.paymentTypeId}/${row.currency}`,
      row
    );
  }

  /**
   * @param {KycTier} tier KYC tier.
   * @param {number} paymentTypeId Payment type identifier.
   * @param {string} currency ISO-4217 currency code.
   * @returns {Observable<void>}
   */
  deleteTxLimit(tier: KycTier, paymentTypeId: number, currency: string): Observable<void> {
    return this.http.delete<void>(`/access/api/v1/admin/kyc-tiers/tier-tx-limits/${tier}/${paymentTypeId}/${currency}`);
  }

  /**
   * @param {TierBalanceCap} row Balance-cap row to upsert.
   * @returns {Observable<TierBalanceCap>} Persisted row.
   */
  putBalanceCap(row: TierBalanceCap): Observable<TierBalanceCap> {
    return this.http.put<TierBalanceCap>(
      `/access/api/v1/admin/kyc-tiers/tier-balance-caps/${row.tier}/${row.currency}`,
      row
    );
  }

  /**
   * @param {KycTier} tier KYC tier.
   * @param {string} currency ISO-4217 currency code.
   * @returns {Observable<void>}
   */
  deleteBalanceCap(tier: KycTier, currency: string): Observable<void> {
    return this.http.delete<void>(`/access/api/v1/admin/kyc-tiers/tier-balance-caps/${tier}/${currency}`);
  }
}
