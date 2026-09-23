/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { RegulatoryReportsService } from './regulatory-reports.service';
import { WeeklyNewAccountsReport } from './regulatory-reports.model';

const BASE = '/access/api/v1/reports/regulatory';

describe('RegulatoryReportsService', () => {
  let service: RegulatoryReportsService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RegulatoryReportsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RegulatoryReportsService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('requests report A with the period and tier filter', () => {
    service.getKycMonitoring('2026-07-01', '2026-09-30', 'TIER_2').subscribe();

    const req = httpTestingController.expectOne(
      (r) => r.url === `${BASE}/kyc-monitoring` && r.params.get('tier') === 'TIER_2'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('startDate')).toBe('2026-07-01');
    expect(req.request.params.get('endDate')).toBe('2026-09-30');
    req.flush({ items: [], paging: { limit: 1000, offset: 0, sortDir: 'asc', hasNext: false } });
  });

  it('omits the tier parameter when no tier is selected', () => {
    service.getKycMonitoring('2026-07-01', '2026-09-30').subscribe();

    const req = httpTestingController.expectOne((r) => r.url === `${BASE}/kyc-monitoring`);
    expect(req.request.params.has('tier')).toBe(false);
    req.flush({ items: [], paging: { limit: 1000, offset: 0, sortDir: 'asc', hasNext: false } });
  });

  it('returns report D with its submission header', () => {
    const expected: WeeklyNewAccountsReport = {
      reportingBank: 'Access Bank',
      bankCode: '044',
      reportingPeriod: '1ST JULY - 7TH JULY, 2026',
      rows: []
    };
    let actual: WeeklyNewAccountsReport | undefined;

    service.getWeeklyNewAccounts('2026-07-01', '2026-07-07').subscribe((result) => (actual = result));

    httpTestingController.expectOne((r) => r.url === `${BASE}/new-accounts-weekly`).flush(expected);
    expect(actual).toEqual(expected);
  });

  it('requests the quarterly return without a page size', () => {
    service.getQuarterlyKycMonitoring('2026-07-01', '2026-09-30').subscribe();

    const req = httpTestingController.expectOne((r) => r.url === `${BASE}/kyc-monitoring-quarterly`);
    expect(req.request.params.has('limit')).toBe(false);
    req.flush({ periodStart: '2026-07-01', periodEnd: '2026-09-30', branches: [] });
  });
});
