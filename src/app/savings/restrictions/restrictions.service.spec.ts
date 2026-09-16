/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RestrictionsService } from './restrictions.service';
import { LiftReason, RestrictionReason } from './restriction-reason.model';

const PND_REASONS: RestrictionReason[] = [
  { id: 91, name: 'Fraud Investigation', description: null, legalOrRegulatory: false },
  { id: 93, name: 'Court Order', description: 'Placed on a court order', legalOrRegulatory: true }
];

const LIFT_REASONS: LiftReason[] = [
  { id: 7, name: 'Investigation concluded', description: null },
  { id: 8, name: 'Court order vacated', description: 'The order was lifted by the court' }
];

describe('RestrictionsService', () => {
  let service: RestrictionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RestrictionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the PND reasons, with their legal/regulatory flag, from the proxy', () => {
    let received: RestrictionReason[] | undefined;
    service.getPndReasons().subscribe((reasons) => (received = reasons));

    const request = http.expectOne('/access/api/v1/restrictions/reasons');
    expect(request.request.method).toBe('GET');
    request.flush(PND_REASONS);

    expect(received).toEqual(PND_REASONS);
    expect(received?.find((reason) => reason.id === 93)?.legalOrRegulatory).toBe(true);
  });

  it('reads the lift reasons from the proxy', () => {
    let received: LiftReason[] | undefined;
    service.getLiftReasons().subscribe((reasons) => (received = reasons));

    const request = http.expectOne('/access/api/v1/restrictions/lift-reasons');
    expect(request.request.method).toBe('GET');
    request.flush(LIFT_REASONS);

    expect(received).toEqual(LIFT_REASONS);
  });
});
