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

import { NipFeeSchedule } from './nip-fee-policy.model';

@Injectable({ providedIn: 'root' })
export class NipFeePolicyService {
  private http = inject(HttpClient);

  getSchedule(currencyCode: string): Observable<NipFeeSchedule> {
    return this.http.get<NipFeeSchedule>(this.scheduleUrl(currencyCode));
  }

  replaceSchedule(currencyCode: string, schedule: NipFeeSchedule): Observable<NipFeeSchedule> {
    return this.http.put<NipFeeSchedule>(this.scheduleUrl(currencyCode), schedule);
  }

  private scheduleUrl(currencyCode: string): string {
    return `/access/api/v1/admin/nip-fee-policies/${currencyCode.toUpperCase()}`;
  }
}
