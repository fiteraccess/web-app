/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { FinancialYear, FinancialYearRequest } from './financial-year.model';

/**
 * Financial years and their periods. The URLs start with `/access/` so the api-prefix interceptor routes them to
 * Synapse rather than the fineract-provider prefix.
 */
@Injectable({
  providedIn: 'root'
})
export class FinancialYearsService {
  private http = inject(HttpClient);

  private static readonly BASE = '/access/api/v1/admin/financial-years';

  /** @returns {Observable<FinancialYear[]>} Every financial year with its periods. */
  getFinancialYears(): Observable<FinancialYear[]> {
    return this.http.get<FinancialYear[]>(FinancialYearsService.BASE);
  }

  /**
   * @param {string} financialCycle The year's code, e.g. FY2026.
   * @returns {Observable<FinancialYear>} That year with its periods.
   */
  getFinancialYear(financialCycle: string): Observable<FinancialYear> {
    return this.http.get<FinancialYear>(this.yearUrl(financialCycle));
  }

  /**
   * Creates the year or replaces it with its periods; Synapse answers 400 or 409 naming every broken rule.
   * @param {string} financialCycle The year's code.
   * @param {FinancialYearRequest} year The year and its periods.
   * @returns {Observable<FinancialYear>} The stored year.
   */
  putFinancialYear(financialCycle: string, year: FinancialYearRequest): Observable<FinancialYear> {
    return this.http.put<FinancialYear>(this.yearUrl(financialCycle), year);
  }

  /**
   * @param {string} financialCycle The year's code.
   * @returns {Observable<void>} Completes on deletion; a closed or used year is refused with 409.
   */
  deleteFinancialYear(financialCycle: string): Observable<void> {
    return this.http.delete<void>(this.yearUrl(financialCycle));
  }

  private yearUrl(financialCycle: string): string {
    return `${FinancialYearsService.BASE}/${encodeURIComponent(financialCycle)}`;
  }
}
