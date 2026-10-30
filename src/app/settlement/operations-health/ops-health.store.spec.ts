/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { OpsHealthStore } from './ops-health.store';
import { OpsHealthService } from './ops-health.service';
import { CallPayload, OpsHealth, ReconBreaks } from './ops-health.model';
import { PAY_WINDOW_REFUSED_PAYLOAD, healthFixture } from './testing/ops-health.fixture';

describe('OpsHealthStore', () => {
  let store: OpsHealthStore;
  let healthCalls: { date: string | null; reply: Subject<OpsHealth> }[];
  let payloadCalls: { kind: string; ref: string; reply: Subject<CallPayload> }[];
  let breaksCalls: Subject<ReconBreaks>[];
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    jest.useFakeTimers();
    healthCalls = [];
    payloadCalls = [];
    breaksCalls = [];
    visibility = 'visible';
    jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);

    const service = {
      getHealth: (date: string | null) => {
        const reply = new Subject<OpsHealth>();
        healthCalls.push({ date, reply });
        return reply;
      },
      getPayload: (kind: string, ref: string) => {
        const reply = new Subject<CallPayload>();
        payloadCalls.push({ kind, ref, reply });
        return reply;
      },
      getReconBreaks: () => {
        const reply = new Subject<ReconBreaks>();
        breaksCalls.push(reply);
        return reply;
      }
    };

    TestBed.configureTestingModule({
      providers: [
        OpsHealthStore,
        { provide: OpsHealthService, useValue: service }]
    });
    store = TestBed.inject(OpsHealthStore);
  });

  afterEach(() => {
    store.ngOnDestroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function answer(index: number, health: OpsHealth = healthFixture()): void {
    healthCalls[index].reply.next(health);
    healthCalls[index].reply.complete();
  }

  function fail(index: number, status: number, error: unknown = null): void {
    healthCalls[index].reply.error(new HttpErrorResponse({ status, error }));
  }

  function setVisibility(state: DocumentVisibilityState): void {
    visibility = state;
    TestBed.inject(DOCUMENT).dispatchEvent(new Event('visibilitychange'));
  }

  it('loads the server’s default day and does not reload when the URL catches up with it', () => {
    store.selectDate(null);
    expect(healthCalls.map((call) => call.date)).toEqual([null]);
    expect(store.loading()).toBe(true);

    answer(0);
    store.selectDate('2026-10-23');

    expect(healthCalls.length).toBe(1);
    expect(store.health().businessDate).toBe('2026-10-23');
    expect(store.loading()).toBe(false);
  });

  it('drops the answer of a request a date change replaced', () => {
    store.selectDate('2026-10-22');
    store.selectDate('2026-10-23');
    answer(0, { ...healthFixture(), businessDate: '2026-10-22' });

    expect(healthCalls[0].reply.observed).toBe(false);
    expect(store.health()).toBeNull();

    answer(1);
    expect(store.health().businessDate).toBe('2026-10-23');
  });

  it('refreshes every 60 seconds while the page is visible', () => {
    store.selectDate('2026-10-23');
    answer(0);

    jest.advanceTimersByTime(59_999);
    expect(healthCalls.length).toBe(1);
    jest.advanceTimersByTime(1);
    expect(healthCalls.length).toBe(2);
    expect(healthCalls[1].date).toBe('2026-10-23');
  });

  it('pauses while hidden and refreshes at once on return when the figures are older than a minute', () => {
    store.selectDate('2026-10-23');
    answer(0);
    setVisibility('hidden');

    jest.advanceTimersByTime(5 * 60_000);
    expect(healthCalls.length).toBe(1);

    setVisibility('visible');
    expect(healthCalls.length).toBe(2);
  });

  it('waits out the rest of the minute when the page comes back sooner', () => {
    store.selectDate('2026-10-23');
    answer(0);
    jest.advanceTimersByTime(20_000);
    setVisibility('hidden');
    setVisibility('visible');

    expect(healthCalls.length).toBe(1);
    jest.advanceTimersByTime(40_000);
    expect(healthCalls.length).toBe(2);
  });

  it('restarts the minute on manual Refresh and never has two requests pending', () => {
    store.selectDate('2026-10-23');
    answer(0);
    jest.advanceTimersByTime(30_000);

    store.refresh();
    store.refresh();
    expect(healthCalls.length).toBe(3);
    expect(healthCalls[1].reply.observed).toBe(false);

    answer(2);
    jest.advanceTimersByTime(59_000);
    expect(healthCalls.length).toBe(3);
  });

  it('keeps the last figures, marked stale, when the server is busy', () => {
    store.selectDate('2026-10-23');
    answer(0);
    store.refresh();
    fail(1, 503);

    expect(store.health().stale).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('says the server is busy when there is nothing to show yet', () => {
    store.selectDate('2026-10-23');
    fail(0, 503);

    expect(store.health()).toBeNull();
    expect(store.error().status).toBe(503);
  });

  it('stops asking every minute after a refusal', () => {
    store.selectDate('2026-10-23');
    fail(0, 403, { error: 'Access denied: missing permission READ_OPSHEALTH' });

    jest.advanceTimersByTime(5 * 60_000);
    expect(healthCalls.length).toBe(1);
    expect(store.error().key).toBe('You do not have permission to view Operations Health');
  });

  it('drops the earlier figures when a later load fails', () => {
    store.selectDate('2026-10-23');
    answer(0);
    store.refresh();
    fail(1, 500);

    expect(store.health()).toBeNull();
    expect(store.error().key).toBe('Operations Health could not be loaded');
  });

  it('says switched off, with nothing left over, when the server is switched off between loads', () => {
    store.selectDate('2026-10-23');
    answer(0);
    store.refresh();
    fail(1, 404);

    expect(store.health()).toBeNull();
    expect(store.error().key).toBe('Operations Health is switched off on this server');
  });

  it('asks again for a day that failed when navigation comes back to it', () => {
    store.selectDate('2026-10-23');
    fail(0, 500);

    store.selectDate('2026-10-23');
    expect(healthCalls.length).toBe(2);
    expect(healthCalls[1].date).toBe('2026-10-23');
    expect(store.error()).toBeNull();

    fail(1, 404);
    expect(store.error().key).toBe('Operations Health is switched off on this server');
  });

  it('asks again on a revisit only after a failure', () => {
    store.selectDate('2026-10-23');
    answer(0);
    store.revisit();
    expect(healthCalls.length).toBe(1);

    store.refresh();
    fail(1, 404);
    store.revisit();
    expect(healthCalls.length).toBe(3);
    expect(healthCalls[2].date).toBe('2026-10-23');
  });

  it('fetches a call’s bodies once and drops the cache on Refresh', () => {
    store.loadPayload('PAY_WINDOW', 'rejected.x');
    store.loadPayload('PAY_WINDOW', 'rejected.x');
    expect(payloadCalls.length).toBe(1);

    payloadCalls[0].reply.next(PAY_WINDOW_REFUSED_PAYLOAD);
    store.loadPayload('PAY_WINDOW', 'rejected.x');
    expect(payloadCalls.length).toBe(1);
    expect(store.payloads()['PAY_WINDOW|rejected.x'].payload).toBe(PAY_WINDOW_REFUSED_PAYLOAD);

    store.refresh();
    store.loadPayload('PAY_WINDOW', 'rejected.x');
    expect(payloadCalls.length).toBe(2);
  });

  it('lets a failed body be retried', () => {
    store.loadPayload('EOC_COMPLETE', 'abc');
    payloadCalls[0].reply.error(new HttpErrorResponse({ status: 500 }));
    expect(store.payloads()['EOC_COMPLETE|abc'].error.status).toBe(500);

    store.loadPayload('EOC_COMPLETE', 'abc');
    expect(payloadCalls.length).toBe(2);
  });

  it.each([
    [
      403,
      'You do not have permission to check unmatched items'
    ],
    [
      404,
      'Checking unmatched items is not available on this server'
    ],
    [
      503,
      'The server is busy checking unmatched items'
    ],
    [
      0,
      'Unmatched items could not be checked'
    ]
  ])('words a %s on Check breaks now for breaks, not for request bodies', (status, key) => {
    store.checkBreaks();
    breaksCalls[0].error(new HttpErrorResponse({ status, error: { error: 'Access denied' } }));

    expect(store.breaks()).toEqual({ loading: false, breaks: null, error: { status, key, message: null } });

    store.checkBreaks();
    expect(breaksCalls.length).toBe(2);
  });

  it('runs one Check breaks now at a time', () => {
    store.checkBreaks();
    store.checkBreaks();
    expect(breaksCalls.length).toBe(1);
    expect(store.breaks().loading).toBe(true);

    breaksCalls[0].next({ asOf: '2026-10-29T09:41:02', total: 0, truncated: false, integrity: [], items: [] });
    expect(store.breaks().loading).toBe(false);

    store.checkBreaks();
    expect(breaksCalls.length).toBe(2);
  });
});
