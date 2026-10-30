/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { createOpsHealthReadGuard } from './ops-health-permissions';

describe('Operations Health route guard', () => {
  const denied = {} as UrlTree;

  function guardWith(permissions: string[]): unknown {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } },
        { provide: Router, useValue: { createUrlTree: () => denied } }
      ]
    });
    return TestBed.runInInjectionContext(() => createOpsHealthReadGuard(true)({} as never, {} as never));
  }

  it('lets READ_OPSHEALTH in', () => {
    expect(guardWith(['READ_OPSHEALTH'])).toBe(true);
  });

  it('lets super users and all-read users in, as the menu directive does', () => {
    expect(guardWith(['ALL_FUNCTIONS'])).toBe(true);
    TestBed.resetTestingModule();
    expect(guardWith(['ALL_FUNCTIONS_READ'])).toBe(true);
  });

  it('sends everyone else to not-found', () => {
    expect(
      guardWith([
        'READ_OPSHEALTHPAYLOAD',
        'READ_SETTLEMENTRECON'
      ])
    ).toBe(denied);
  });
});
