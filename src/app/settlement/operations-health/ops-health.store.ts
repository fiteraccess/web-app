/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';

/** rxjs Imports */
import { Observable, Subject, Subscription, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

/** Custom Services */
import { OpsHealthService } from './ops-health.service';

/** Custom Models */
import { CallKind, CallPayload, OpsHealth, ReconBreaks } from './ops-health.model';
import { OpsError, breaksError, callKey, healthError, payloadError } from './ops-health-presentation';

export interface PayloadState {
  loading: boolean;
  payload: CallPayload | null;
  error: OpsError | null;
}

export interface BreaksState {
  loading: boolean;
  breaks: ReconBreaks | null;
  error: OpsError | null;
}

type HealthResult = { health: OpsHealth } | { error: HttpErrorResponse };

/**
 * State of one Operations Health page, shared by its shell and tabs (provided by the shell component, so it lives
 * and dies with the page). Holds the assessment, refreshes it every minute while the page is visible, and caches the
 * request/reply bodies opened on it.
 */
@Injectable()
export class OpsHealthStore implements OnDestroy {
  private service = inject(OpsHealthService);
  private document = inject(DOCUMENT);

  static readonly REFRESH_MS = 60_000;

  readonly health = signal<OpsHealth | null>(null);
  readonly loading = signal(false);
  readonly error = signal<OpsError | null>(null);
  readonly payloads = signal<Record<string, PayloadState>>({});
  readonly breaks = signal<BreaksState | null>(null);
  /** The call row a grid cell asked to show, as a `callKey`. */
  readonly revealedCall = signal<string | null>(null);
  /** The `data-row-key` of a row a Needs a look line asked to show; kept across a date change. */
  readonly revealedRow = signal<string | null>(null);

  /** `undefined` until the page asks for a date; `null` means "the server's default day". */
  private requestedDate: string | null | undefined = undefined;
  private lastSettledAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Set after a 403 or 404: asking again every minute would only repeat the same refusal. */
  private polling = true;
  /** Bumped whenever cached bodies are dropped, so a body that arrives afterwards is not cached. */
  private payloadGeneration = 0;
  private loads = new Subject<string | null>();
  private subscription: Subscription;
  private onVisibilityChange = () => this.visibilityChanged();

  constructor() {
    this.subscription = this.loads
      .pipe(
        tap(() => {
          this.clearTimer();
          this.loading.set(true);
        }),
        // switchMap drops the answer of a request a newer one replaced, so only one assessment is ever pending.
        switchMap((date) => this.fetch(date))
      )
      .subscribe((result) => this.settle(result));
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.subscription.unsubscribe();
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  /**
   * Shows the day in the URL; the URL catching up with the server's default day does not reload. A day that failed
   * is asked for again, so coming back to it never shows an earlier answer.
   */
  selectDate(date: string | null): void {
    if (date === this.requestedDate && !this.error()) {
      return;
    }
    const urlCaughtUp = date !== null && this.requestedDate === null && this.health()?.businessDate === date;
    this.requestedDate = date;
    if (urlCaughtUp) {
      return;
    }
    this.health.set(null);
    this.error.set(null);
    this.dropPayloads();
    this.polling = true;
    this.loads.next(date);
  }

  /** In-app navigation within the page: a failed load is asked again, the way a fresh load of the page would. */
  revisit(): void {
    if (this.error() && !this.loading()) {
      this.selectDate(this.requestedDate ?? null);
    }
  }

  /** Manual Refresh: reloads now, drops cached bodies and restarts the minute. */
  refresh(): void {
    this.dropPayloads();
    this.polling = true;
    this.loads.next(this.requestedDate ?? null);
  }

  loadPayload(kind: CallKind, ref: string): void {
    const key = callKey(kind, ref);
    const current = this.payloads()[key];
    if (current && !current.error) {
      return;
    }
    const generation = this.payloadGeneration;
    this.setPayload(key, { loading: true, payload: null, error: null });
    this.service.getPayload(kind, ref).subscribe({
      next: (payload) => this.storePayload(generation, key, { loading: false, payload, error: null }),
      error: (error: HttpErrorResponse) =>
        this.storePayload(generation, key, { loading: false, payload: null, error: payloadError(error) })
    });
  }

  /** The untruncated bodies, for Download full; never cached. */
  fullPayload(kind: CallKind, ref: string): Observable<CallPayload> {
    return this.service.getPayload(kind, ref, true);
  }

  /** Check breaks now: one request at a time per page. */
  checkBreaks(): void {
    if (this.breaks()?.loading) {
      return;
    }
    this.breaks.set({ loading: true, breaks: this.breaks()?.breaks ?? null, error: null });
    this.service.getReconBreaks().subscribe({
      next: (breaks) => this.breaks.set({ loading: false, breaks, error: null }),
      error: (error: HttpErrorResponse) => this.breaks.set({ loading: false, breaks: null, error: breaksError(error) })
    });
  }

  revealCall(kind: CallKind, ref: string): void {
    this.revealedCall.set(callKey(kind, ref));
  }

  revealRow(rowKey: string): void {
    this.revealedRow.set(rowKey);
  }

  private fetch(date: string | null): Observable<HealthResult> {
    return this.service.getHealth(date).pipe(
      map((health): HealthResult => ({ health })),
      catchError((error: HttpErrorResponse) => of<HealthResult>({ error }))
    );
  }

  private settle(result: HealthResult): void {
    this.loading.set(false);
    this.lastSettledAt = Date.now();
    if ('health' in result) {
      this.health.set(result.health);
      this.error.set(null);
    } else {
      this.fail(healthError(result.error));
    }
    this.schedule(OpsHealthStore.REFRESH_MS);
  }

  private fail(error: OpsError): void {
    const previous = this.health();
    if (error.status === 503 && previous) {
      this.health.set({ ...previous, stale: true });
      this.error.set(null);
      return;
    }
    if (error.status === 403 || error.status === 404) {
      this.polling = false;
    }
    // An earlier answer under a failure reads as the current state, so it goes.
    this.health.set(null);
    this.error.set(error);
  }

  private schedule(delay: number): void {
    this.clearTimer();
    if (!this.polling || this.document.visibilityState !== 'visible') {
      return;
    }
    this.timer = setTimeout(() => this.loads.next(this.requestedDate ?? null), delay);
  }

  private visibilityChanged(): void {
    if (this.document.visibilityState !== 'visible') {
      this.clearTimer();
      return;
    }
    if (this.loading() || this.requestedDate === undefined) {
      return;
    }
    const age = Date.now() - this.lastSettledAt;
    if (age >= OpsHealthStore.REFRESH_MS) {
      if (this.polling) {
        this.loads.next(this.requestedDate);
      }
      return;
    }
    this.schedule(OpsHealthStore.REFRESH_MS - age);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private dropPayloads(): void {
    this.payloadGeneration++;
    this.payloads.set({});
    this.revealedCall.set(null);
  }

  private storePayload(generation: number, key: string, state: PayloadState): void {
    if (generation === this.payloadGeneration) {
      this.setPayload(key, state);
    }
  }

  private setPayload(key: string, state: PayloadState): void {
    this.payloads.update((payloads) => ({ ...payloads, [key]: state }));
  }
}
