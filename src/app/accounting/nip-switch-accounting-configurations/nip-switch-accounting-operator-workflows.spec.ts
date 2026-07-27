/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, expect, it, jest } from '@jest/globals';

jest.mock('app/standalone-shared.module', () => ({ STANDALONE_SHARED_IMPORTS: [] as unknown[] }));
jest.mock('app/shared/accounting/gl-account-selector/gl-account-selector.component', () => ({
  GlAccountSelectorComponent: class GlAccountSelectorComponent {}
}));

import { AccountingService } from '../accounting.service';
import { NipSwitchAccountingConfigurationResolver } from './nip-switch-accounting-configuration.resolver';
import { NipSwitchAccountingConfigurationsResolver } from './nip-switch-accounting-configurations.resolver';
import { CreateNipSwitchAccountingConfigurationComponent } from './create-nip-switch-accounting-configuration/create-nip-switch-accounting-configuration.component';
import { EditNipSwitchAccountingConfigurationComponent } from './edit-nip-switch-accounting-configuration/edit-nip-switch-accounting-configuration.component';
import { NipSwitchAccountingConfigurationsComponent } from './nip-switch-accounting-configurations.component';
import { ViewNipSwitchAccountingConfigurationComponent } from './view-nip-switch-accounting-configuration/view-nip-switch-accounting-configuration.component';

const accounts: any[] = [{ id: 1, glCode: '1000', name: 'Cash', usage: { id: 1 }, type: { id: 1 }, disabled: false }];
const configuration = {
  switchId: 'NIP-1',
  direction: 'INBOUND' as const,
  switchReceivableGlAccountId: 99,
  active: true
};

describe('NIP switch accounting operator workflows', () => {
  const accountingService = {
    getNipSwitchAccountingConfigurations: jest.fn(),
    getNipSwitchAccountingConfiguration: jest.fn(),
    upsertNipSwitchAccountingConfiguration: jest.fn()
  };
  const router = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountingService, useValue: accountingService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ nipSwitchAccountingConfiguration: configuration, nipSwitchAccountingGlAccounts: accounts }),
            snapshot: {
              data: { nipSwitchAccountingConfiguration: configuration, nipSwitchAccountingGlAccounts: accounts }
            }
          }
        }
      ]
    });
  });

  it('retrieves a list and a detail configuration using switchId', () => {
    accountingService.getNipSwitchAccountingConfigurations.mockReturnValue(of([configuration]));
    accountingService.getNipSwitchAccountingConfiguration.mockReturnValue(of(configuration));
    const listResolver = TestBed.runInInjectionContext(() => new NipSwitchAccountingConfigurationsResolver());
    const detailResolver = TestBed.runInInjectionContext(() => new NipSwitchAccountingConfigurationResolver());
    let list: any;
    let detail: any;
    listResolver.resolve().subscribe((value) => (list = value));
    detailResolver
      .resolve({ paramMap: { get: () => 'NIP-1' } } as unknown as ActivatedRouteSnapshot)
      .subscribe((value) => (detail = value));

    expect(accountingService.getNipSwitchAccountingConfigurations).toHaveBeenCalledWith();
    expect(accountingService.getNipSwitchAccountingConfiguration).toHaveBeenCalledWith('NIP-1');
    expect(list).toEqual([configuration]);
    expect(detail).toEqual(configuration);
  });

  it('preserves a not-found retrieval error for the application error handler', () => {
    accountingService.getNipSwitchAccountingConfiguration.mockReturnValue(throwError(() => new Error('Not found')));
    const resolver = TestBed.runInInjectionContext(() => new NipSwitchAccountingConfigurationResolver());
    let failure: Error | undefined;
    resolver.resolve({ paramMap: { get: () => 'MISSING' } } as unknown as ActivatedRouteSnapshot).subscribe({
      error: (error) => (failure = error)
    });

    expect(failure?.message).toBe('Not found');
  });

  it('summarizes list mappings and navigates rows by switchId', () => {
    const component = TestBed.runInInjectionContext(() => new NipSwitchAccountingConfigurationsComponent());
    component.glAccounts = accounts;
    expect(component.mappingsSummary({ ...configuration, switchReceivableGlAccountId: 1 })).toContain('(1000) Cash');
  });

  it('creates through PUT and follows Fineract normalized identity', () => {
    accountingService.upsertNipSwitchAccountingConfiguration.mockReturnValue(of({ resourceIdentifier: 'NIP-1' }));
    const component = createCreateComponent();
    component.form.patchValue({
      switchId: ' nip-1 ',
      direction: 'INBOUND',
      switchReceivableGlAccountId: 1,
      active: true
    });
    component.submit();

    expect(accountingService.upsertNipSwitchAccountingConfiguration).toHaveBeenCalledWith('NIP-1', {
      direction: 'INBOUND',
      switchReceivableGlAccountId: 1,
      active: true
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [
        '../view',
        'NIP-1'
      ],
      expect.anything()
    );
  });

  it('displays raw identifiers when a detail GL lookup no longer contains the account', () => {
    const component = TestBed.runInInjectionContext(() => new ViewNipSwitchAccountingConfigurationComponent());
    component.glAccounts = accounts;
    expect(component.glAccountLabel(99)).toBe('99');
    expect(component.glAccountLabel(1)).toBe('(1000) Cash');
  });

  it('initializes immutable edit identity and replaces the full selected shape', () => {
    accountingService.upsertNipSwitchAccountingConfiguration.mockReturnValue(of({}));
    const component = createEditComponent({
      switchId: 'NIP-1',
      direction: 'OUTBOUND',
      switchPayableGlAccountId: 1,
      switchFeeGlAccountId: 2,
      commissionIncomeGlAccountId: 3,
      active: false
    });
    expect(component.form.controls.switchId.disabled).toBe(true);
    component.submit();

    expect(accountingService.upsertNipSwitchAccountingConfiguration).toHaveBeenCalledWith('NIP-1', {
      direction: 'OUTBOUND',
      switchPayableGlAccountId: 1,
      switchFeeGlAccountId: 2,
      commissionIncomeGlAccountId: 3,
      active: false
    });
    expect(router.navigate).toHaveBeenCalledWith(
      [
        '../../',
        'NIP-1'
      ],
      expect.anything()
    );
  });
});

function createCreateComponent(): CreateNipSwitchAccountingConfigurationComponent {
  TestBed.overrideProvider(ActivatedRoute, {
    useValue: { data: of({ nipSwitchAccountingGlAccounts: accounts }), snapshot: { data: {} } }
  });
  return TestBed.runInInjectionContext(() => new CreateNipSwitchAccountingConfigurationComponent());
}

function createEditComponent(configurationToEdit: any): EditNipSwitchAccountingConfigurationComponent {
  TestBed.overrideProvider(ActivatedRoute, {
    useValue: {
      snapshot: {
        data: { nipSwitchAccountingConfiguration: configurationToEdit, nipSwitchAccountingGlAccounts: accounts }
      }
    }
  });
  return TestBed.runInInjectionContext(() => new EditNipSwitchAccountingConfigurationComponent());
}
