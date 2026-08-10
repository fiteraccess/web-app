/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AccountingService } from '../accounting.service';
import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import { NipSwitchResolver } from './nip-switch.resolver';
import { NipSwitchesResolver } from './nip-switches.resolver';

const CONFIGURATION: NipSwitchConfiguration = {
  switchId: 'NIP',
  configurationStatus: 'INCOMPLETE',
  accounting: { configured: false },
  transferConfiguration: {
    configured: true,
    direction: 'INBOUND',
    active: true,
    switchFeeAllocations: []
  }
};

describe('NIP switch composite resolvers', () => {
  const accountingService = {
    getNipSwitchConfigurations: jest.fn(),
    getNipSwitchConfiguration: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: AccountingService, useValue: accountingService }] });
  });

  it('loads the composite list', (done) => {
    accountingService.getNipSwitchConfigurations.mockReturnValue(of([CONFIGURATION]));
    const resolver = TestBed.runInInjectionContext(() => new NipSwitchesResolver());

    resolver.resolve().subscribe((result) => {
      expect(result).toEqual([CONFIGURATION]);
      done();
    });
  });

  it('loads encoded-path detail through the composite service', (done) => {
    accountingService.getNipSwitchConfiguration.mockReturnValue(of(CONFIGURATION));
    const resolver = TestBed.runInInjectionContext(() => new NipSwitchResolver());
    const route = { paramMap: convertToParamMap({ switchId: 'NIP / TEST' }) } as ActivatedRouteSnapshot;

    resolver.resolve(route).subscribe((result) => {
      expect(result).toEqual(CONFIGURATION);
      expect(accountingService.getNipSwitchConfiguration).toHaveBeenCalledWith('NIP / TEST');
      done();
    });
  });

  it('preserves standard request failures from list loading', (done) => {
    const failure = new Error('request failed');
    accountingService.getNipSwitchConfigurations.mockReturnValue(throwError(() => failure));
    const resolver = TestBed.runInInjectionContext(() => new NipSwitchesResolver());

    resolver.resolve().subscribe({
      next: () => fail('expected list loading to fail'),
      error: (error) => {
        expect(error).toBe(failure);
        done();
      }
    });
  });
});
