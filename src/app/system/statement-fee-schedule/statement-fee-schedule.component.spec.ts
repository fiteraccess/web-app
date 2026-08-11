/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { environment } from '../../../environments/environment';

import { StatementFeeSchedule } from './statement-fee-schedule.model';

jest.mock('app/standalone-shared.module', () => ({ STANDALONE_SHARED_IMPORTS: [] as any[] }));

import { StatementFeeScheduleComponent } from './statement-fee-schedule.component';
import { StatementFeeScheduleService } from './statement-fee-schedule.service';

const SCHEDULE: StatementFeeSchedule = {
  currencyCode: 'NGN',
  vatRate: 0.075,
  bands: [{ order: 1, upperThreshold: null, totalFee: 21.5, vatBase: 20 }]
};

describe('StatementFeeScheduleComponent', () => {
  let service: { getSchedule: jest.Mock; replaceSchedule: jest.Mock };
  let authenticationService: { getCredentials: jest.Mock };
  let route: { snapshot: { data: Record<string, any> } };
  let router: { navigate: jest.Mock };
  let component: StatementFeeScheduleComponent;
  let originalRbac: boolean;

  beforeEach(() => {
    originalRbac = environment.productionModeEnableRBAC;
    environment.productionModeEnableRBAC = true;
    service = {
      getSchedule: jest.fn().mockReturnValue(of(SCHEDULE)),
      replaceSchedule: jest.fn().mockReturnValue(of(SCHEDULE))
    };
    authenticationService = {
      getCredentials: jest.fn().mockReturnValue({
        permissions: [
          'READ_STATEMENTFEESCHEDULE',
          'WRITE_STATEMENTFEESCHEDULE'
        ]
      })
    };
    route = {
      snapshot: { data: { currencies: { selectedCurrencyOptions: [{ code: 'NGN' }] } } }
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [StatementFeeScheduleComponent],
      providers: [
        { provide: StatementFeeScheduleService, useValue: service },
        { provide: AuthenticationService, useValue: authenticationService },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router }
      ]
    });
    TestBed.overrideComponent(StatementFeeScheduleComponent, { set: { template: '' } });
    component = TestBed.createComponent(StatementFeeScheduleComponent).componentInstance;
  });

  afterEach(() => {
    environment.productionModeEnableRBAC = originalRbac;
  });

  it('loads the fee amount and VAT rate from the schedule', () => {
    component.ngOnInit();

    expect(service.getSchedule).toHaveBeenCalledWith('NGN');
    expect(component.form.controls.feeAmount.value).toBe(20);
    expect(component.form.controls.vatRatePercent.value).toBe(7.5);
  });

  it('computes the VAT and total from the edited values', () => {
    component.ngOnInit();

    expect(component.vatAmount).toBe(1.5);
    expect(component.totalFee).toBe(21.5);
  });

  it('sends a single-band schedule built from the fee amount and VAT rate', () => {
    component.ngOnInit();
    component.form.controls.feeAmount.setValue(30);
    component.form.controls.vatRatePercent.setValue(10);

    component.save();

    expect(service.replaceSchedule).toHaveBeenCalledWith('NGN', {
      currencyCode: 'NGN',
      vatRate: 0.1,
      bands: [{ order: 1, upperThreshold: null, totalFee: 33, vatBase: 30 }]
    });
  });

  it('offers every configured currency and loads a newly selected schedule', () => {
    const kesSchedule = { ...SCHEDULE, currencyCode: 'KES' };
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'ngn', name: 'Naira' },
      { code: 'kes', name: 'Kenyan shilling' }
    ];
    service.getSchedule.mockImplementation((currencyCode: string) =>
      of(currencyCode === 'KES' ? kesSchedule : SCHEDULE)
    );

    component.ngOnInit();
    component.onCurrencyChange('kes');

    expect(component.currencies).toEqual([
      { code: 'NGN', name: 'Naira' },
      { code: 'KES', name: 'Kenyan shilling' }
    ]);
    expect(component.currencyCode).toBe('KES');
    expect(service.getSchedule).toHaveBeenNthCalledWith(2, 'KES');
  });

  it('keeps the current currency when a dirty switch is cancelled', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    component.ngOnInit();
    component.form.controls.feeAmount.setValue(25);
    component.form.markAsDirty();

    component.onCurrencyChange('KES');

    expect(confirm).toHaveBeenCalled();
    expect(component.currencyCode).toBe('NGN');
    expect(component.form.controls.feeAmount.value).toBe(25);
    expect(service.getSchedule).toHaveBeenCalledTimes(1);
  });

  it('does not request a schedule when no backend currency is configured', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [];

    component.ngOnInit();

    expect(component.errorMessage).toBe(
      'No currency is configured. Configure a currency before managing the statement fee.'
    );
    expect(component.loading).toBe(false);
    expect(service.getSchedule).not.toHaveBeenCalled();
  });

  it('disables currency selection while saving', () => {
    const saveResponse = new Subject<StatementFeeSchedule>();
    service.replaceSchedule.mockReturnValue(saveResponse);
    component.ngOnInit();

    component.save();

    expect(component.saving).toBe(true);
    expect(component.currencySelectionDisabled).toBe(true);
    saveResponse.next(SCHEDULE);
    expect(component.currencySelectionDisabled).toBe(false);
  });

  it('loads read-only state without permitting a save', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: ['READ_STATEMENTFEESCHEDULE'] });
    component.ngOnInit();
    component.save();

    expect(component.canWrite).toBe(false);
    expect(component.form.controls.feeAmount.disabled).toBe(true);
    expect(service.replaceSchedule).not.toHaveBeenCalled();
  });

  it('does not load and routes away without read permission', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: [] });
    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/not-found']);
    expect(service.getSchedule).not.toHaveBeenCalled();
  });

  it('surfaces the server validation message', () => {
    service.getSchedule.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ defaultUserMessage: 'Statement fee schedule must have exactly one band' }] }
          })
      )
    );

    component.ngOnInit();

    expect(component.errorMessage).toBe('Statement fee schedule must have exactly one band');
  });

  it('initializes an editable schedule when none exists yet', () => {
    service.getSchedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.form.controls.feeAmount.value).toBe(0);
    expect(component.form.controls.vatRatePercent.value).toBe(0);
  });

  it('explains a missing schedule to a read-only user', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: ['READ_STATEMENTFEESCHEDULE'] });
    service.getSchedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.ngOnInit();

    expect(component.errorMessage).toBe('No statement fee schedule is configured for NGN.');
    expect(component.form.controls.feeAmount.disabled).toBe(true);
  });
});
