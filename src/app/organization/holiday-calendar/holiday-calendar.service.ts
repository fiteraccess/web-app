/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { arrayToIso, isoOf } from '../financial-years/iso-date';
import {
  activeHolidays,
  CalendarHoliday,
  FineractHoliday,
  HeadOffice,
  storedHolidayName
} from './holiday-calendar.model';

/** The head office's holidays through Fineract's native `/holidays`; the end-of-day roll skips the active ones. */
@Injectable({
  providedIn: 'root'
})
export class HolidayCalendarService {
  private http = inject(HttpClient);

  /** @returns {Observable<HeadOffice>} The office without a parent; branch 099 in Access's Flexcube terms. */
  getHeadOffice(): Observable<HeadOffice> {
    return this.http.get<{ id: number; name: string; externalId?: string; parentId?: number }[]>('/offices').pipe(
      map((offices) => offices.find((office) => !office.parentId)),
      map((office) => ({ id: office.id, name: office.name, externalId: office.externalId ?? null }))
    );
  }

  /** @returns {Observable<string>} The current business date, ISO; days up to it are processed. */
  getBusinessDate(): Observable<string> {
    return this.http
      .get<{ date: number[] }>('/businessdate/BUSINESS_DATE')
      .pipe(map((businessDate) => arrayToIso(businessDate.date)));
  }

  /**
   * @param {number} officeId The office.
   * @param {number} year Calendar year.
   * @returns {Observable<CalendarHoliday[]>} The office's active holidays inside that year.
   */
  getHolidays(officeId: number, year: number): Observable<CalendarHoliday[]> {
    const params = new HttpParams()
      .set('officeId', officeId)
      .set('fromDate', isoOf(year, 1, 1))
      .set('toDate', isoOf(year, 12, 31))
      .set('dateFormat', 'yyyy-MM-dd')
      .set('locale', 'en');
    return this.http.get<FineractHoliday[]>('/holidays', { params }).pipe(map(activeHolidays));
  }

  /**
   * One-day holiday, active on save.
   * @param {number} officeId The office.
   * @param {string} iso The day.
   * @param {string} name What the operator typed; the day is appended.
   * @param {string} description Optional.
   * @returns {Observable<unknown>} Fineract's command result.
   */
  createHoliday(officeId: number, iso: string, name: string, description: string | null): Observable<unknown> {
    return this.http.post('/holidays', {
      name: storedHolidayName(name, iso),
      description: description?.trim() || undefined,
      fromDate: iso,
      toDate: iso,
      offices: [{ officeId }],
      dateFormat: 'yyyy-MM-dd',
      locale: 'en'
    });
  }

  /**
   * @param {number} holidayId The holiday.
   * @returns {Observable<unknown>} Fineract's command result.
   */
  deleteHoliday(holidayId: number): Observable<unknown> {
    return this.http.delete(`/holidays/${holidayId}`);
  }
}
