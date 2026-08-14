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

import {
  canReadNipSwitches,
  canWriteNipSwitches,
  createNipSwitchReadGuard,
  createNipSwitchWriteGuard
} from './nip-switch-permissions';

describe('NIP switch all-of permissions', () => {
  it('allows reads only when both read permissions are present', () => {
    expect(
      canReadNipSwitches(
        [
          'READ_NIP_SWITCH_ACCOUNTING_CONFIGURATION',
          'READ_NIPFEEPOLICY'
        ],
        true
      )
    ).toBe(true);
    expect(canReadNipSwitches(['READ_NIP_SWITCH_ACCOUNTING_CONFIGURATION'], true)).toBe(false);
    expect(canReadNipSwitches(['READ_NIPFEEPOLICY'], true)).toBe(false);
  });

  it('allows writes only when both write permissions are present', () => {
    expect(
      canWriteNipSwitches(
        [
          'UPDATE_NIP_SWITCH_ACCOUNTING_CONFIGURATION',
          'WRITE_NIPFEEPOLICY'
        ],
        true
      )
    ).toBe(true);
    expect(canWriteNipSwitches(['UPDATE_NIP_SWITCH_ACCOUNTING_CONFIGURATION'], true)).toBe(false);
    expect(canWriteNipSwitches(['WRITE_NIPFEEPOLICY'], true)).toBe(false);
  });

  it('retains ALL_FUNCTIONS and ALL_FUNCTIONS_READ behavior', () => {
    expect(canReadNipSwitches(['ALL_FUNCTIONS'], true)).toBe(true);
    expect(canWriteNipSwitches(['ALL_FUNCTIONS'], true)).toBe(true);
    expect(canReadNipSwitches(['ALL_FUNCTIONS_READ'], true)).toBe(true);
    expect(canWriteNipSwitches(['ALL_FUNCTIONS_READ'], true)).toBe(false);
  });

  it('denies the guarded route when either required read permission is missing', () => {
    const denied = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthenticationService,
          useValue: { getCredentials: () => ({ permissions: ['READ_NIP_SWITCH_ACCOUNTING_CONFIGURATION'] }) }
        },
        { provide: Router, useValue: { createUrlTree: () => denied } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => createNipSwitchReadGuard(true)({} as never, {} as never));
    expect(result).toBe(denied);
  });

  it('denies mutation routes when either required write permission is missing', () => {
    const denied = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthenticationService,
          useValue: { getCredentials: () => ({ permissions: ['UPDATE_NIP_SWITCH_ACCOUNTING_CONFIGURATION'] }) }
        },
        { provide: Router, useValue: { createUrlTree: () => denied } }
      ]
    });

    const result = TestBed.runInInjectionContext(() => createNipSwitchWriteGuard(true)({} as never, {} as never));
    expect(result).toBe(denied);
  });
});
