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

import { HANDLED_ERROR_STATUSES } from 'app/core/http/error-handler.interceptor';
import { OpsHealthService } from './ops-health.service';
import { OpsHealth } from './ops-health.model';
import { OPS_HEALTH_FIXTURE, PAY_WINDOW_REFUSED_PAYLOAD } from './testing/ops-health.fixture';

const BASE = '/access/api/v1/ops/health';

describe('OpsHealthService', () => {
  let service: OpsHealthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(OpsHealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the given business date', () => {
    let actual: OpsHealth | undefined;
    service.getHealth('2026-10-23').subscribe((health) => (actual = health));

    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('businessDate')).toBe('2026-10-23');
    req.flush(OPS_HEALTH_FIXTURE);

    expect(actual).toEqual(OPS_HEALTH_FIXTURE);
  });

  it('leaves the date to the server when none is chosen', () => {
    service.getHealth(null).subscribe();

    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.has('businessDate')).toBe(false);
    req.flush(OPS_HEALTH_FIXTURE);
  });

  it('passes the call ref back URL-encoded, without full by default', () => {
    service.getPayload('PAY_WINDOW', 'accepted.ETZ Outbound/W2#1').subscribe();

    const req = http.expectOne(`${BASE}/calls/PAY_WINDOW/accepted.ETZ%20Outbound%2FW2%231`);
    expect(req.request.params.has('full')).toBe(false);
    req.flush(PAY_WINDOW_REFUSED_PAYLOAD);
  });

  it('asks for untruncated bodies with full=true', () => {
    service.getPayload('FLEX_BALANCE', '412.7', true).subscribe();

    const req = http.expectOne((r) => r.url === `${BASE}/calls/FLEX_BALANCE/412.7`);
    expect(req.request.params.get('full')).toBe('true');
    req.flush(PAY_WINDOW_REFUSED_PAYLOAD);
  });

  it('counts breaks through the existing reconciliation endpoint, 50 at most', () => {
    service.getReconBreaks().subscribe();

    const req = http.expectOne((r) => r.url === '/access/api/v1/settlement/reconciliation/breaks');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({ asOf: '2026-10-29T09:41:02', total: 0, truncated: false, integrity: [], items: [] });
  });

  describe('global error alert', () => {
    it('leaves a refused or missing body to the payload view', () => {
      service.getPayload('PAY_WINDOW', '7').subscribe({ error: () => undefined });

      const req = http.expectOne(`${BASE}/calls/PAY_WINDOW/7`);
      expect(req.request.context.get(HANDLED_ERROR_STATUSES)).toEqual([
        403,
        404
      ]);
      req.flush(null, { status: 403, statusText: 'Forbidden' });
    });

    it('leaves the switched-off, refused, busy and bad-date answers to the page', () => {
      service.getHealth(null).subscribe({ error: () => undefined });

      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.context.get(HANDLED_ERROR_STATUSES)).toEqual([
        400,
        403,
        404,
        503
      ]);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('leaves the breaks answers it explains to the Recon tab', () => {
      service.getReconBreaks().subscribe({ error: () => undefined });

      const req = http.expectOne((r) => r.url === '/access/api/v1/settlement/reconciliation/breaks');
      expect(req.request.context.get(HANDLED_ERROR_STATUSES)).toEqual([
        403,
        404,
        503
      ]);
      req.flush(null, { status: 503, statusText: 'Service Unavailable' });
    });
  });
});
