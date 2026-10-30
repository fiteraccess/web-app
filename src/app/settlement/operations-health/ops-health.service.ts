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
import { CallKind, CallPayload, OpsHealth, ReconBreaks } from './ops-health.model';

function handled(...statuses: number[]): HttpContext {
  return new HttpContext().set(HANDLED_ERROR_STATUSES, statuses);
}

/**
 * Operations Health reads. All URLs start with `/access/` so the api-prefix interceptor routes them to Synapse
 * (`serverHost`) rather than the fineract-provider prefix.
 */
@Injectable({
  providedIn: 'root'
})
export class OpsHealthService {
  private http = inject(HttpClient);

  private static readonly BASE = '/access/api/v1/ops/health';

  /** The breaks list asked for by Check breaks now; a page of 50 is what the Recon tab shows. */
  private static readonly BREAKS_LIMIT = 50;

  /** Failures the page explains in its own words, so the global alert would only repeat them. */
  private static readonly HEALTH_HANDLED = handled(400, 403, 404, 503);
  private static readonly PAYLOAD_HANDLED = handled(403, 404);
  private static readonly BREAKS_HANDLED = handled(403, 404, 503);

  /**
   * @param {string} businessDate Day to assess (`yyyy-MM-dd`); omitted lets Synapse pick the day that needs attention.
   * @returns {Observable<OpsHealth>} The assessment for that day.
   */
  getHealth(businessDate?: string | null): Observable<OpsHealth> {
    const params = businessDate ? new HttpParams().set('businessDate', businessDate) : new HttpParams();
    return this.http.get<OpsHealth>(OpsHealthService.BASE, { params, context: OpsHealthService.HEALTH_HANDLED });
  }

  /**
   * @param {CallKind} kind Kind of call.
   * @param {string} ref The call's opaque `ref`, passed back exactly as the assessment gave it.
   * @param {boolean} full True for untruncated bodies (Download full request/reply).
   * @returns {Observable<CallPayload>} The stored request and reply.
   */
  getPayload(kind: CallKind, ref: string, full = false): Observable<CallPayload> {
    const params = full ? new HttpParams().set('full', 'true') : new HttpParams();
    return this.http.get<CallPayload>(`${OpsHealthService.BASE}/calls/${kind}/${encodeURIComponent(ref)}`, {
      params,
      context: OpsHealthService.PAYLOAD_HANDLED
    });
  }

  /**
   * @returns {Observable<ReconBreaks>} The unmatched items, counted now by the existing reconciliation endpoint.
   */
  getReconBreaks(): Observable<ReconBreaks> {
    return this.http.get<ReconBreaks>('/access/api/v1/settlement/reconciliation/breaks', {
      params: new HttpParams().set('limit', OpsHealthService.BREAKS_LIMIT),
      context: OpsHealthService.BREAKS_HANDLED
    });
  }
}
