/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Models */
import {
  KycMonitoringRow,
  NewAccountsRenditionRow,
  PagedReport,
  QuarterlyKycReport,
  WeeklyNewAccountsReport
} from './regulatory-reports.model';

/**
 * AB-341 CBN regulatory returns. All URLs start with `/access/` so the api-prefix interceptor routes them to
 * `serverHost` (bare origin) instead of the fineract-provider prefix. Served by Synapse rather than the
 * Fineract report module because tier, BVN and address live in the Synapse database.
 */
@Injectable({
  providedIn: 'root'
})
export class RegulatoryReportsService {
  private http = inject(HttpClient);

  private static readonly BASE = '/access/api/v1/reports/regulatory';

  /** A single page is enough for a filed return; the page size bounds one request, not the return. */
  private static readonly PAGE_SIZE = 1000;

  /**
   * @param {string} startDate First day of the reporting period, inclusive.
   * @param {string} endDate Last day of the reporting period, inclusive.
   * @param {string} tier Optional KYC tier filter.
   * @returns {Observable<PagedReport<KycMonitoringRow>>} Report A.
   */
  getKycMonitoring(startDate: string, endDate: string, tier?: string): Observable<PagedReport<KycMonitoringRow>> {
    let params = this.periodParams(startDate, endDate);
    if (tier) {
      params = params.set('tier', tier);
    }
    return this.http.get<PagedReport<KycMonitoringRow>>(`${RegulatoryReportsService.BASE}/kyc-monitoring`, { params });
  }

  /**
   * @param {string} startDate First day of the reporting period, inclusive.
   * @param {string} endDate Last day of the reporting period, inclusive.
   * @returns {Observable<QuarterlyKycReport>} Report B.
   */
  getQuarterlyKycMonitoring(startDate: string, endDate: string): Observable<QuarterlyKycReport> {
    return this.http.get<QuarterlyKycReport>(`${RegulatoryReportsService.BASE}/kyc-monitoring-quarterly`, {
      params: new HttpParams().set('startDate', startDate).set('endDate', endDate)
    });
  }

  /**
   * @param {string} startDate First day of the reporting period, inclusive.
   * @param {string} endDate Last day of the reporting period, inclusive.
   * @returns {Observable<PagedReport<NewAccountsRenditionRow>>} Report C.
   */
  getNewAccountsRendition(startDate: string, endDate: string): Observable<PagedReport<NewAccountsRenditionRow>> {
    return this.http.get<PagedReport<NewAccountsRenditionRow>>(
      `${RegulatoryReportsService.BASE}/new-accounts-rendition`,
      { params: this.periodParams(startDate, endDate) }
    );
  }

  /**
   * @param {string} startDate First day of the reporting period, inclusive.
   * @param {string} endDate Last day of the reporting period, inclusive.
   * @returns {Observable<WeeklyNewAccountsReport>} Report D, header block included.
   */
  getWeeklyNewAccounts(startDate: string, endDate: string): Observable<WeeklyNewAccountsReport> {
    return this.http.get<WeeklyNewAccountsReport>(`${RegulatoryReportsService.BASE}/new-accounts-weekly`, {
      params: this.periodParams(startDate, endDate)
    });
  }

  private periodParams(startDate: string, endDate: string): HttpParams {
    return new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate)
      .set('limit', RegulatoryReportsService.PAGE_SIZE);
  }
}
