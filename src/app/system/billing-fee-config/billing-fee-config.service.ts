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
import { BillingFeeSchedule, BillingFeeScheduleList } from './billing-fee-config.model';

/**
 * AB-510 billing-fee-config admin service. URLs live under `/access/api/v1/admin/billing-fee-configs`
 * so the api-prefix interceptor routes them to `serverHost` (bare origin) instead of the
 * fineract-provider prefix — same convention as `ChannelPolicyService`/`NipFeePolicyService`. Every
 * write evicts the server-side `BillingFeeConfigCache` entry for the affected (billerCode, productCode)
 * pair — callers do not need to trigger a refresh manually.
 */
@Injectable({ providedIn: 'root' })
export class BillingFeeConfigService {
  private http = inject(HttpClient);

  /** Returns every configured biller/product fee schedule. */
  listSchedules(): Observable<BillingFeeScheduleList> {
    return this.http.get<BillingFeeScheduleList>('/access/api/v1/admin/billing-fee-configs');
  }

  /**
   * Returns the schedule for one (billerCode, productCode) pair, or the biller's default schedule
   * when `productCode` is null/blank — routes to the `{billerCode}`-only endpoint.
   */
  getSchedule(billerCode: string, productCode: string | null): Observable<BillingFeeSchedule> {
    return this.http.get<BillingFeeSchedule>(this.url(billerCode, productCode));
  }

  /** Creates or atomically replaces the schedule for one (billerCode, productCode) pair, or the
   * biller's default schedule when `productCode` is null/blank. */
  putSchedule(
    billerCode: string,
    productCode: string | null,
    schedule: BillingFeeSchedule
  ): Observable<BillingFeeSchedule> {
    return this.http.put<BillingFeeSchedule>(this.url(billerCode, productCode), schedule);
  }

  /** Deletes the schedule for one (billerCode, productCode) pair, or the biller's default schedule
   * when `productCode` is null/blank. */
  deleteSchedule(billerCode: string, productCode: string | null): Observable<void> {
    return this.http.delete<void>(this.url(billerCode, productCode));
  }

  private url(billerCode: string, productCode: string | null): string {
    const base = `/access/api/v1/admin/billing-fee-configs/${encodeURIComponent(billerCode)}`;
    return productCode ? `${base}/${encodeURIComponent(productCode)}` : base;
  }
}
