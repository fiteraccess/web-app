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

import { AccountingService } from './accounting.service';
import {
  NipSwitchConfiguration,
  NipSwitchConfigurationReplacement,
  NipSwitchConfigurationSaveResponse,
  NipSwitchConfigurationStructuredError
} from './nip-switches/nip-switch-configuration.model';

const COMPOSITE_CONFIGURATION: NipSwitchConfiguration = {
  switchId: 'NIP',
  configurationStatus: 'COMPLETE',
  accounting: {
    configured: true,
    direction: 'OUTBOUND',
    switchPayableGlAccountId: 101,
    switchFeeGlAccountId: 102,
    commissionIncomeGlAccountId: 103,
    switchReceivableGlAccountId: null,
    active: true
  },
  transferConfiguration: {
    configured: true,
    direction: 'OUTBOUND',
    active: true,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const COMPOSITE_REPLACEMENT: NipSwitchConfigurationReplacement = {
  direction: 'OUTBOUND',
  switchPayableGlAccountId: 101,
  switchFeeGlAccountId: 102,
  commissionIncomeGlAccountId: 103,
  active: true,
  switchFeeAllocations: [
    { currencyCode: 'NGN', switchFee: 5 },
    { currencyCode: 'USD', switchFee: 0 }
  ]
};

const COMPLETE_SAVE_RESPONSE: NipSwitchConfigurationSaveResponse = {
  ...COMPOSITE_CONFIGURATION,
  configurationStatus: 'COMPLETE',
  operation: {
    status: 'COMPLETE',
    accounting: { status: 'SAVED', error: null },
    transferConfiguration: { status: 'SAVED', error: null }
  }
};

const PARTIAL_SAVE_ERROR: NipSwitchConfigurationStructuredError = {
  code: 'NIP_SWITCH_PARTIAL_SAVE',
  message: 'The switch was only partially saved.',
  operation: {
    status: 'PARTIAL',
    accounting: { status: 'SAVED', error: null },
    transferConfiguration: {
      status: 'FAILED',
      error: { code: 'ROUTE_SAVE_FAILED', message: 'Transfer configuration could not be saved.' }
    }
  },
  retryable: true
};

describe('AccountingService NIP switch methods', () => {
  let service: AccountingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AccountingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads enabled detail GL accounts without requiring manual journal entry eligibility', () => {
    service.getNipSwitchGlAccounts().subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/glaccounts');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('usage')).toBe('1');
    expect(request.request.params.get('disabled')).toBe('false');
    expect(request.request.params.has('manualEntriesAllowed')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    request.flush([]);
  });

  it('restricts Receivable GL account retrieval to assets', () => {
    service.getNipSwitchGlAccounts(true).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/glaccounts');
    expect(request.request.params.get('type')).toBe('1');
    request.flush([]);
  });

  it('unwraps the composite NIP switch collection', () => {
    service.getNipSwitchConfigurations().subscribe((result) => expect(result).toEqual([COMPOSITE_CONFIGURATION]));

    const request = http.expectOne('/access/api/v1/admin/nip-switch-configurations');
    expect(request.request.method).toBe('GET');
    request.flush({ switches: [COMPOSITE_CONFIGURATION] });
  });

  it('retrieves composite detail using an encoded switch ID', () => {
    service
      .getNipSwitchConfiguration('NIP / TEST')
      .subscribe((result) => expect(result).toEqual(COMPOSITE_CONFIGURATION));

    const request = http.expectOne('/access/api/v1/admin/nip-switch-configurations/NIP%20%2F%20TEST');
    expect(request.request.method).toBe('GET');
    request.flush(COMPOSITE_CONFIGURATION);
  });

  it('sends the exact composite replacement and returns successful component outcomes', () => {
    service
      .upsertNipSwitchConfiguration('NIP / TEST', COMPOSITE_REPLACEMENT)
      .subscribe((result) => expect(result).toEqual(COMPLETE_SAVE_RESPONSE));

    const request = http.expectOne('/access/api/v1/admin/nip-switch-configurations/NIP%20%2F%20TEST');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(COMPOSITE_REPLACEMENT);
    request.flush(COMPLETE_SAVE_RESPONSE);
  });

  it('preserves a structured partial error for component-aware handling', (done) => {
    service.upsertNipSwitchConfiguration('NIP', COMPOSITE_REPLACEMENT).subscribe({
      next: () => fail('expected a structured partial error'),
      error: (response) => {
        expect(response.status).toBe(502);
        expect(response.error).toEqual(PARTIAL_SAVE_ERROR);
        done();
      }
    });

    const request = http.expectOne('/access/api/v1/admin/nip-switch-configurations/NIP');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(COMPOSITE_REPLACEMENT);
    request.flush(PARTIAL_SAVE_ERROR, { status: 502, statusText: 'Bad Gateway' });
  });
});
