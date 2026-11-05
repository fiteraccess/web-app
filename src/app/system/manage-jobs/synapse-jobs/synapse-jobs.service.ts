/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Interceptors */
import { HANDLED_ERROR_STATUSES } from 'app/core/http/error-handler.interceptor';

/** Custom Models */
import {
  SynapseJobControl,
  SynapseJobRunsPage,
  SynapseJobRunsQuery,
  SynapseJobScheduleChange,
  SynapseJobs
} from './synapse-jobs.model';

/**
 * Synapse background jobs: reads, and the operator's controls. URLs start with `/api/v1/admin/` so the api-prefix
 * interceptor routes them to Synapse.
 */
@Injectable({
  providedIn: 'root'
})
export class SynapseJobsService {
  private http = inject(HttpClient);

  private static readonly BASE = '/api/v1/admin/jobs';

  /** Failures the console explains in its own words, so the global alert would only repeat them. */
  private static readonly HANDLED = new HttpContext().set(
    HANDLED_ERROR_STATUSES,
    [
      403,
      404,
      503
    ]
  );

  /** Refusals the job page turns into a message of its own, beside the read failures. */
  private static readonly CONTROL_HANDLED = new HttpContext().set(
    HANDLED_ERROR_STATUSES,
    [
      400,
      403,
      404,
      409,
      503
    ]
  );

  /**
   * @returns {Observable<SynapseJobs>} Every registered job with its per-node state.
   */
  getJobs(): Observable<SynapseJobs> {
    return this.http.get<SynapseJobs>(SynapseJobsService.BASE, { context: SynapseJobsService.HANDLED });
  }

  /**
   * @param {string} name Job name.
   * @param {SynapseJobRunsQuery} query Page window and optional outcome / node filters.
   * @returns {Observable<SynapseJobRunsPage>} One page of the job's runs, newest first.
   */
  getRuns(name: string, query: SynapseJobRunsQuery): Observable<SynapseJobRunsPage> {
    let params = new HttpParams().set('offset', query.offset).set('limit', query.limit);
    if (query.outcome) {
      params = params.set('outcome', query.outcome);
    }
    if (query.node) {
      params = params.set('node', query.node);
    }
    return this.http.get<SynapseJobRunsPage>(`${SynapseJobsService.BASE}/${encodeURIComponent(name)}/runs`, {
      params,
      context: SynapseJobsService.HANDLED
    });
  }

  /**
   * Asks one node that runs the job to run it once now.
   * @param {string} name Job name.
   * @returns {Observable<SynapseJobControl>} The job's controls with the pending request.
   */
  runNow(name: string): Observable<SynapseJobControl> {
    return this.http.post<SynapseJobControl>(`${this.jobUrl(name)}/run`, null, {
      context: SynapseJobsService.CONTROL_HANDLED
    });
  }

  /**
   * @param {string} name Job name.
   * @param {boolean} paused True to pause, false to resume.
   * @param {number} version The version the operator saw.
   * @returns {Observable<SynapseJobControl>} The job's controls after the change.
   */
  setPaused(name: string, paused: boolean, version: number): Observable<SynapseJobControl> {
    return this.http.put<SynapseJobControl>(
      `${this.jobUrl(name)}/state`,
      { paused, version },
      { context: SynapseJobsService.CONTROL_HANDLED }
    );
  }

  /**
   * @param {string} name Job name.
   * @param {SynapseJobScheduleChange} change The new interval or times of day, null for the default.
   * @returns {Observable<SynapseJobControl>} The job's controls after the change.
   */
  reschedule(name: string, change: SynapseJobScheduleChange): Observable<SynapseJobControl> {
    return this.http.put<SynapseJobControl>(`${this.jobUrl(name)}/schedule`, change, {
      context: SynapseJobsService.CONTROL_HANDLED
    });
  }

  private jobUrl(name: string): string {
    return `${SynapseJobsService.BASE}/${encodeURIComponent(name)}`;
  }
}
