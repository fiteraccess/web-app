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

import { StatementFeeSchedule } from './statement-fee-schedule.model';

@Injectable({ providedIn: 'root' })
export class StatementFeeScheduleService {
  private http = inject(HttpClient);

  getSchedule(currencyCode: string): Observable<StatementFeeSchedule> {
    return this.http.get<StatementFeeSchedule>(this.scheduleUrl(currencyCode));
  }

  replaceSchedule(currencyCode: string, schedule: StatementFeeSchedule): Observable<StatementFeeSchedule> {
    return this.http.put<StatementFeeSchedule>(this.scheduleUrl(currencyCode), schedule);
  }

  private scheduleUrl(currencyCode: string): string {
    return `/access/api/v1/admin/statement-fee-schedule/${currencyCode.toUpperCase()}`;
  }
}
