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
import { SynapseJobsService } from './synapse-jobs.service';
import { SynapseJobRunsPage, SynapseJobs } from './synapse-jobs.model';
import { jobsFixture, runsPageFixture } from './testing/synapse-jobs.fixture';

const BASE = '/api/v1/admin/jobs';

describe('SynapseJobsService', () => {
  let service: SynapseJobsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SynapseJobsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads every job from the Synapse admin jobs endpoint', () => {
    let actual: SynapseJobs | undefined;
    service.getJobs().subscribe((jobs) => (actual = jobs));

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush(jobsFixture());

    expect(actual).toEqual(jobsFixture());
  });

  it('asks for one page of runs by offset and limit, without filters by default', () => {
    let actual: SynapseJobRunsPage | undefined;
    service.getRuns('settlement-collapse', { offset: 50, limit: 50 }).subscribe((page) => (actual = page));

    const req = http.expectOne((r) => r.url === `${BASE}/settlement-collapse/runs`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('offset')).toBe('50');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.has('outcome')).toBe(false);
    expect(req.request.params.has('node')).toBe(false);
    req.flush(runsPageFixture());

    expect(actual).toEqual(runsPageFixture());
  });

  it('passes the outcome and node filters and URL-encodes the job name', () => {
    service
      .getRuns('eod/orchestrator', { offset: 0, limit: 25, outcome: 'FAILED', node: 'synapse-7f9c-abc' })
      .subscribe();

    const req = http.expectOne((r) => r.url === `${BASE}/eod%2Forchestrator/runs`);
    expect(req.request.params.get('outcome')).toBe('FAILED');
    expect(req.request.params.get('node')).toBe('synapse-7f9c-abc');
    req.flush(runsPageFixture());
  });

  it('leaves refused, missing and unavailable answers to the console', () => {
    service.getJobs().subscribe({ error: () => undefined });
    service.getRuns('x', { offset: 0, limit: 50 }).subscribe({ error: () => undefined });

    const handled = [
      403,
      404,
      503
    ];
    const jobs = http.expectOne(BASE);
    expect(jobs.request.context.get(HANDLED_ERROR_STATUSES)).toEqual(handled);
    jobs.flush(null, { status: 403, statusText: 'Forbidden' });
    const runs = http.expectOne((r) => r.url === `${BASE}/x/runs`);
    expect(runs.request.context.get(HANDLED_ERROR_STATUSES)).toEqual(handled);
    runs.flush(null, { status: 503, statusText: 'Service Unavailable' });
  });

  describe('controls', () => {
    it('asks for a Run now by POST', () => {
      service.runNow('settlement-collapse').subscribe();

      const req = http.expectOne(`${BASE}/settlement-collapse/run`);
      expect(req.request.method).toBe('POST');
      expect(req.request.context.get(HANDLED_ERROR_STATUSES)).toContain(409);
      req.flush({});
    });

    it('pauses with the version the operator saw', () => {
      service.setPaused('settlement-collapse', true, 3).subscribe();

      const req = http.expectOne(`${BASE}/settlement-collapse/state`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ paused: true, version: 3 });
      req.flush({});
    });

    it('sends a schedule change as it is given', () => {
      service.reschedule('settlement-collapse', { idleIntervalMs: null, version: 1 }).subscribe();

      const req = http.expectOne(`${BASE}/settlement-collapse/schedule`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ idleIntervalMs: null, version: 1 });
      req.flush({});
    });
  });
});
