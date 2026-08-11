/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { StatementFeeSchedule } from './statement-fee-schedule.model';
import { StatementFeeScheduleService } from './statement-fee-schedule.service';

const SCHEDULE: StatementFeeSchedule = {
  currencyCode: 'NGN',
  vatRate: 0.075,
  bands: [{ order: 1, upperThreshold: null, totalFee: 21.5, vatBase: 20 }]
};

describe('StatementFeeScheduleService', () => {
  let service: StatementFeeScheduleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(StatementFeeScheduleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a currency schedule from the Access API', () => {
    service.getSchedule('ngn').subscribe((result) => expect(result).toEqual(SCHEDULE));

    const request = http.expectOne('/access/api/v1/admin/statement-fee-schedule/NGN');
    expect(request.request.method).toBe('GET');
    request.flush(SCHEDULE);
  });

  it('replaces the complete schedule and returns the canonical response', () => {
    service.replaceSchedule('NGN', SCHEDULE).subscribe((result) => expect(result).toEqual(SCHEDULE));

    const request = http.expectOne('/access/api/v1/admin/statement-fee-schedule/NGN');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(SCHEDULE);
    request.flush(SCHEDULE);
  });
});
