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
  NipSwitchAccountingBothRequest,
  NipSwitchAccountingConfiguration,
  NipSwitchAccountingCommandResult
} from './nip-switch-accounting-configurations/nip-switch-accounting-configuration.model';

const CONFIGURATION: NipSwitchAccountingConfiguration = {
  switchId: 'NIBSS',
  direction: 'BOTH',
  switchPayableGlAccountId: 101,
  switchFeeGlAccountId: 102,
  commissionIncomeGlAccountId: 103,
  switchReceivableGlAccountId: 104,
  active: true
};

const REPLACEMENT: NipSwitchAccountingBothRequest = {
  direction: 'BOTH',
  switchPayableGlAccountId: 101,
  switchFeeGlAccountId: 102,
  commissionIncomeGlAccountId: 103,
  switchReceivableGlAccountId: 104,
  active: true
};

describe('AccountingService NIP switch accounting methods', () => {
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

  it('lists NIP switch accounting configurations with GET', () => {
    service.getNipSwitchAccountingConfigurations().subscribe((result) => expect(result).toEqual([CONFIGURATION]));

    const request = http.expectOne('/nip-switch-accounting-configurations');
    expect(request.request.method).toBe('GET');
    request.flush([CONFIGURATION]);
  });

  it('retrieves a NIP switch accounting configuration using an encoded switch ID', () => {
    service
      .getNipSwitchAccountingConfiguration('NIBSS / TEST')
      .subscribe((result) => expect(result).toEqual(CONFIGURATION));

    const request = http.expectOne('/nip-switch-accounting-configurations/NIBSS%20%2F%20TEST');
    expect(request.request.method).toBe('GET');
    request.flush(CONFIGURATION);
  });

  it('uses PUT and the exact replacement body for a NIP switch accounting configuration', () => {
    const result: NipSwitchAccountingCommandResult = { resourceId: 9, resourceIdentifier: 'NIBSS' };
    service
      .upsertNipSwitchAccountingConfiguration('NIBSS / TEST', REPLACEMENT)
      .subscribe((response) => expect(response).toEqual(result));

    const request = http.expectOne('/nip-switch-accounting-configurations/NIBSS%20%2F%20TEST');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(REPLACEMENT);
    request.flush(result);
  });

  it('loads enabled detail GL accounts without requiring manual journal entry eligibility', () => {
    service.getNipSwitchAccountingGlAccounts().subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/glaccounts');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('usage')).toBe('1');
    expect(request.request.params.get('disabled')).toBe('false');
    expect(request.request.params.has('manualEntriesAllowed')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    request.flush([]);
  });

  it('restricts Receivable GL account retrieval to assets', () => {
    service.getNipSwitchAccountingGlAccounts(true).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/glaccounts');
    expect(request.request.params.get('type')).toBe('1');
    request.flush([]);
  });
});
