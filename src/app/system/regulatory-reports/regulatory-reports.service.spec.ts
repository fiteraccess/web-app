/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { RegulatoryReportsService } from './regulatory-reports.service';
import { WeeklyNewAccountsReport } from './regulatory-reports.model';
import { fileNameOf } from '../../shared/excel/download-attachment';

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

  it('asks Synapse for the workbook rather than building one, and keeps the whole response', () => {
    let actual: HttpResponse<Blob> | undefined;

    service.exportXlsx('kyc-monitoring', '2026-07-01', '2026-09-30', 'TIER_2').subscribe((r) => (actual = r));

    const req = httpTestingController.expectOne((r) => r.url === `${BASE}/kyc-monitoring` && r.params.has('format'));
    expect(req.request.params.get('format')).toBe('xlsx');
    expect(req.request.params.get('tier')).toBe('TIER_2');
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['xlsx']), {
      headers: { 'Content-Disposition': 'attachment; filename="Report 2026-07-01 to 2026-09-30.xlsx"' }
    });

    expect(actual.headers.get('Content-Disposition')).toContain('Report 2026-07-01 to 2026-09-30.xlsx');
  });

  it('exports the period rather than a page, so limit and offset are not sent', () => {
    service.exportXlsx('new-accounts-weekly', '2026-09-01', '2026-09-07').subscribe();

    const req = httpTestingController.expectOne((r) => r.url === `${BASE}/new-accounts-weekly`);
    expect(req.request.params.has('limit')).toBe(false);
    expect(req.request.params.has('offset')).toBe(false);
    expect(req.request.params.has('tier')).toBe(false);
    req.flush(new Blob(['xlsx']));
  });
});

describe('fileNameOf', () => {
  it('reads the filename the backend chose', () => {
    expect(fileNameOf('attachment; filename="Weekly Returns 2026-09-01 to 2026-09-07.xlsx"')).toBe(
      'Weekly Returns 2026-09-01 to 2026-09-07.xlsx'
    );
  });

  it('prefers the RFC 5987 form when both are present', () => {
    expect(fileNameOf('attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'R%C3%A9sum%C3%A9.xlsx')).toBe(
      'Résumé.xlsx'
    );
  });

  it('returns null when the header is absent, so the caller can fall back', () => {
    expect(fileNameOf(null)).toBeNull();
    expect(fileNameOf('attachment')).toBeNull();
  });
});
