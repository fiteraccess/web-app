/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { LiftReason, RestrictionReason } from './restriction-reason.model';

/**
 * Account-restriction reads served by the proxy. URLs start with `/access/` so the api-prefix
 * interceptor leaves them alone, as for the other Access services.
 */
@Injectable({ providedIn: 'root' })
export class RestrictionsService {
  private http = inject(HttpClient);

  /** The active PND reason codes, with the proxy's legal/regulatory classification of each. */
  getPndReasons(): Observable<RestrictionReason[]> {
    return this.http.get<RestrictionReason[]>('/access/api/v1/restrictions/reasons');
  }

  /** The active reason codes a restriction may be lifted with. */
  getLiftReasons(): Observable<LiftReason[]> {
    return this.http.get<LiftReason[]>('/access/api/v1/restrictions/lift-reasons');
  }
}
