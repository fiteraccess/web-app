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
import { canReadSynapseJobs, createSynapseJobsReadGuard, synapseJobAbilities } from './synapse-jobs-permissions';

describe('Synapse jobs permissions', () => {
  const denied = {} as UrlTree;

  function guardWith(permissions: string[] | undefined, rbacEnabled = true): unknown {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } },
        { provide: Router, useValue: { createUrlTree: () => denied } }
      ]
    });
    return TestBed.runInInjectionContext(() => createSynapseJobsReadGuard(rbacEnabled)({} as never, {} as never));
  }

  it('lets READ_SYNAPSEJOB in', () => {
    expect(guardWith(['READ_SYNAPSEJOB'])).toBe(true);
  });

  it('lets super users and all-read users in, as the permission directive does', () => {
    expect(guardWith(['ALL_FUNCTIONS'])).toBe(true);
    TestBed.resetTestingModule();
    expect(guardWith(['ALL_FUNCTIONS_READ'])).toBe(true);
  });

  it('sends everyone else, including users without credentials, to not-found', () => {
    expect(
      guardWith([
        'READ_SCHEDULER',
        'READ_OPSHEALTH'
      ])
    ).toBe(denied);
    TestBed.resetTestingModule();
    expect(guardWith(undefined)).toBe(denied);
  });

  it('lets everyone in when RBAC is off', () => {
    expect(guardWith([], false)).toBe(true);
  });

  it('decides the tab the same way as the route', () => {
    expect(canReadSynapseJobs(['READ_SYNAPSEJOB'], true)).toBe(true);
    expect(canReadSynapseJobs(['READ_SCHEDULER'], true)).toBe(false);
  });

  it('gives each control its own permission', () => {
    expect(synapseJobAbilities(['READ_SYNAPSEJOB'], true)).toEqual({ run: false, pause: false, reschedule: false });
    expect(synapseJobAbilities(['EXECUTE_SYNAPSEJOB'], true)).toEqual({ run: true, pause: false, reschedule: false });
    expect(synapseJobAbilities(['UPDATE_SYNAPSEJOB'], true)).toEqual({ run: false, pause: true, reschedule: false });
    expect(synapseJobAbilities(['UPDATE_SYNAPSEJOBSCHEDULE'], true)).toEqual({
      run: false,
      pause: false,
      reschedule: true
    });
  });

  it('does not let all-read users steer jobs', () => {
    expect(synapseJobAbilities(['ALL_FUNCTIONS_READ'], true)).toEqual({ run: false, pause: false, reschedule: false });
  });
});
