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

import {
  CustomerDocument,
  LiftReason,
  RestrictionReason,
  RestrictionReasonRuling,
  UploadedDocument
} from './restriction-reason.model';

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

  /**
   * Files a supporting document against the account's customer and returns the id a restriction refers to.
   * Addressed by account number so the caller never needs the Fineract client id.
   */
  uploadDocument(accountNumber: string, file: File, documentType: string): Observable<UploadedDocument> {
    const formData = new FormData();
    formData.append('name', file.name);
    formData.append('file', file);
    formData.append('documentType', documentType);
    return this.http.post<UploadedDocument>(`/access/api/v1/accounts/${accountNumber}/documents`, formData);
  }

  /** The customer's documents, addressed by account so no caller needs the Fineract client id. */
  listDocuments(accountNumber: string): Observable<CustomerDocument[]> {
    return this.http.get<CustomerDocument[]>(`/access/api/v1/accounts/${accountNumber}/documents`);
  }

  /**
   * Records whether placing a PND under this reason demands a case/court/regulator reference. Fineract owns the
   * reason itself; a CodeValue has nowhere to state this, so the proxy keeps the ruling.
   */
  setReasonLegal(reasonCode: number, legal: boolean): Observable<RestrictionReasonRuling> {
    return this.http.put<RestrictionReasonRuling>(`/access/api/v1/admin/restriction-reasons/${reasonCode}`, {
      legal
    });
  }
}
