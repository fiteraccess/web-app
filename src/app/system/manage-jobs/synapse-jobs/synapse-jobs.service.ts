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
import { SynapseJobRunsPage, SynapseJobRunsQuery, SynapseJobs } from './synapse-jobs.model';

/**
 * Synapse background job reads. URLs start with `/access/` so the api-prefix interceptor routes them to Synapse.
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
}
