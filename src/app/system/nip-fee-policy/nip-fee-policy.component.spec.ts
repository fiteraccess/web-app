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

import { NipFeeSchedule } from './nip-fee-policy.model';

jest.mock('app/standalone-shared.module', () => ({ STANDALONE_SHARED_IMPORTS: [] as any[] }));

import { NipFeePolicyComponent } from './nip-fee-policy.component';
import { NipFeePolicyService } from './nip-fee-policy.service';

const SCHEDULE: NipFeeSchedule = {
  currencyCode: 'NGN',
  vatRate: 0.075,
  bands: [
    { order: 2, upperThreshold: null, totalFee: 23.5, vatBase: 20 },
    { order: 1, upperThreshold: 5000, totalFee: 8.45, vatBase: 6 }
  ]
};

describe('NipFeePolicyComponent', () => {
  let service: {
    getSchedule: jest.Mock;
    replaceSchedule: jest.Mock;
  };
  let authenticationService: { getCredentials: jest.Mock };
  let route: { snapshot: { data: Record<string, any> } };
  let router: { navigate: jest.Mock };
  let component: NipFeePolicyComponent;
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
          'READ_NIPFEEPOLICY',
          'WRITE_NIPFEEPOLICY'
        ]
      })
    };
    route = {
      snapshot: {
        data: { currencies: { selectedCurrencyOptions: [{ code: 'NGN' }] } }
      }
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [NipFeePolicyComponent],
      providers: [
        { provide: NipFeePolicyService, useValue: service },
        { provide: AuthenticationService, useValue: authenticationService },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router }
      ]
    });
    TestBed.overrideComponent(NipFeePolicyComponent, { set: { template: '' } });
    component = TestBed.createComponent(NipFeePolicyComponent).componentInstance;
  });

  afterEach(() => {
    environment.productionModeEnableRBAC = originalRbac;
  });

  it('loads and orders the complete schedule', () => {
    component.ngOnInit();

    expect(service.getSchedule).toHaveBeenCalledWith('NGN');
    expect(component.bands.at(0).controls['order'].value).toBe(1);
    expect(component.bands.at(0).controls['upperThreshold'].value).toBe(5000);
    expect(component.bands.at(1).controls['upperThreshold'].value).toBeNull();
    expect(component.bands.at(1).controls['upperThreshold'].disabled).toBe(true);
  });

  it('loads the schedule for the first currency selected in the backend', () => {
    const kesSchedule = { ...SCHEDULE, currencyCode: 'KES' };
    route.snapshot.data['currencies'].selectedCurrencyOptions = [{ code: 'kes' }];
    service.getSchedule.mockReturnValue(of(kesSchedule));

    component.ngOnInit();

    expect(component.currencyCode).toBe('KES');
    expect(component.form.controls.currencyCode.value).toBe('KES');
    expect(service.getSchedule).toHaveBeenCalledWith('KES');
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
    expect(component.form.controls.currencyCode.value).toBe('KES');
    expect(service.getSchedule).toHaveBeenNthCalledWith(2, 'KES');
  });

  it('keeps the current currency when a dirty switch is cancelled', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    component.ngOnInit();
    component.form.controls.vatRate.setValue(0.1);
    component.form.markAsDirty();

    component.onCurrencyChange('KES');

    expect(confirm).toHaveBeenCalled();
    expect(component.currencyCode).toBe('NGN');
    expect(component.form.controls.vatRate.value).toBe(0.1);
    expect(service.getSchedule).toHaveBeenCalledTimes(1);
  });

  it('treats band structure changes as unsaved edits when switching currency', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    component.ngOnInit();

    component.addBand();
    component.onCurrencyChange('KES');

    expect(component.form.dirty).toBe(true);
    expect(confirm).toHaveBeenCalled();
    expect(component.currencyCode).toBe('NGN');
  });

  it('discards dirty state and resets the form while an accepted currency switch loads', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const kesResponse = new Subject<NipFeeSchedule>();
    service.getSchedule.mockImplementation((currencyCode: string) =>
      currencyCode === 'KES' ? kesResponse : of(SCHEDULE)
    );
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    component.ngOnInit();
    component.form.controls.vatRate.setValue(0.1);
    component.form.markAsDirty();

    component.onCurrencyChange('KES');

    expect(component.currencyCode).toBe('KES');
    expect(component.form.pristine).toBe(true);
    expect(component.form.controls.vatRate.value).toBe(0);
    expect(component.errorMessage).toBe('');
    expect(component.loading).toBe(true);
    expect(component.currencySelectionDisabled).toBe(true);

    kesResponse.next({ ...SCHEDULE, currencyCode: 'KES' });
    kesResponse.complete();
    expect(component.loading).toBe(false);
  });

  it('ignores a stale schedule response after the currency changes', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const ngnResponse = new Subject<NipFeeSchedule>();
    const kesResponse = new Subject<NipFeeSchedule>();
    service.getSchedule.mockImplementation((currencyCode: string) =>
      currencyCode === 'NGN' ? ngnResponse : kesResponse
    );

    component.ngOnInit();
    component.onCurrencyChange('KES');
    ngnResponse.next(SCHEDULE);

    expect(component.currencyCode).toBe('KES');
    expect(component.form.controls.currencyCode.value).toBe('KES');
    expect(component.loading).toBe(true);

    kesResponse.next({ ...SCHEDULE, currencyCode: 'KES', vatRate: 0.16 });
    expect(component.form.controls.vatRate.value).toBe(0.16);
    expect(component.loading).toBe(false);
  });

  it('does not request a schedule when no backend currency is configured', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [];

    component.ngOnInit();

    expect(component.errorMessage).toBe('No currency is configured. Configure a currency before managing NIP fees.');
    expect(component.loading).toBe(false);
    expect(service.getSchedule).not.toHaveBeenCalled();
  });

  it('previews VAT and commission from the edited values', () => {
    component.ngOnInit();

    expect(component.preview(0)).toEqual({ vat: 0.45, commission: 8 });
  });

  it('sends one normalized replacement and re-renders the canonical response', () => {
    component.ngOnInit();
    component.moveBand(1, -1);
    component.save();

    expect(service.replaceSchedule).toHaveBeenCalledWith('NGN', {
      currencyCode: 'NGN',
      vatRate: 0.075,
      bands: [
        { order: 1, upperThreshold: 5000, totalFee: 23.5, vatBase: 20 },
        { order: 2, upperThreshold: null, totalFee: 8.45, vatBase: 6 }
      ]
    });
    expect(component.bands.at(0).controls['totalFee'].value).toBe(8.45);
  });

  it('saves the selected currency in both the path argument and payload', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    const kesSchedule = { ...SCHEDULE, currencyCode: 'KES' };
    service.getSchedule.mockImplementation((currencyCode: string) =>
      of(currencyCode === 'KES' ? kesSchedule : SCHEDULE)
    );
    service.replaceSchedule.mockReturnValue(of(kesSchedule));
    component.ngOnInit();
    component.onCurrencyChange('KES');

    component.save();

    expect(service.replaceSchedule).toHaveBeenCalledWith('KES', expect.objectContaining({ currencyCode: 'KES' }));
  });

  it('disables currency selection while saving', () => {
    const saveResponse = new Subject<NipFeeSchedule>();
    service.replaceSchedule.mockReturnValue(saveResponse);
    component.ngOnInit();

    component.save();

    expect(component.saving).toBe(true);
    expect(component.currencySelectionDisabled).toBe(true);
    saveResponse.next(SCHEDULE);
    expect(component.currencySelectionDisabled).toBe(false);
  });

  it('does not save thresholds that are not strictly increasing', () => {
    component.ngOnInit();
    component.addBand();
    component.bands.at(0).controls['upperThreshold'].setValue(5000);
    component.bands.at(1).controls['upperThreshold'].setValue(4000);
    component.save();

    expect(component.scheduleIsValid()).toBe(false);
    expect(component.errorMessage).toBe('labels.text.NIP fee schedule validation failed');
    expect(service.replaceSchedule).not.toHaveBeenCalled();
  });

  it('does not save when calculated VAT exceeds the total fee', () => {
    component.ngOnInit();
    component.form.controls.vatRate.setValue(0.5);
    component.bands.at(0).controls['totalFee'].setValue(1);
    component.bands.at(0).controls['vatBase'].setValue(3);
    component.save();

    expect(component.scheduleIsValid()).toBe(false);
    expect(service.replaceSchedule).not.toHaveBeenCalled();
  });

  it('loads read-only state without permitting a save', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: ['READ_NIPFEEPOLICY'] });
    component.ngOnInit();
    component.save();

    expect(component.canWrite).toBe(false);
    expect(component.form.controls.vatRate.disabled).toBe(true);
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
            error: { errors: [{ defaultUserMessage: 'Thresholds must be strictly increasing' }] }
          })
      )
    );
    component.ngOnInit();

    expect(component.errorMessage).toBe('Thresholds must be strictly increasing');
  });

  it('initializes an editable schedule when none exists yet', () => {
    service.getSchedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.form.controls.currencyCode.value).toBe('NGN');
    expect(component.form.controls.vatRate.value).toBe(0);
    expect(component.bands.length).toBe(1);
    expect(component.bands.at(0).getRawValue()).toEqual({
      order: 1,
      upperThreshold: null,
      totalFee: 0,
      vatBase: 0
    });
  });

  it('initializes a separate editable schedule when the selected currency has none', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    service.getSchedule.mockImplementation((currencyCode: string) =>
      currencyCode === 'KES' ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(SCHEDULE)
    );
    component.ngOnInit();

    component.onCurrencyChange('KES');

    expect(component.errorMessage).toBe('');
    expect(component.form.controls.currencyCode.value).toBe('KES');
    expect(component.form.controls.vatRate.value).toBe(0);
    expect(component.bands.length).toBe(1);
  });

  it('explains a missing schedule to a read-only user', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: ['READ_NIPFEEPOLICY'] });
    service.getSchedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.ngOnInit();

    expect(component.errorMessage).toBe('No NIP fee schedule is configured for NGN.');
    expect(component.form.controls.vatRate.disabled).toBe(true);
    expect(component.bands.at(0).disabled).toBe(true);
  });

  it('explains a per-currency missing schedule to a read-only user', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [
      { code: 'NGN' },
      { code: 'KES' }];
    authenticationService.getCredentials.mockReturnValue({ permissions: ['READ_NIPFEEPOLICY'] });
    service.getSchedule.mockImplementation((currencyCode: string) =>
      currencyCode === 'KES' ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(SCHEDULE)
    );
    component.ngOnInit();

    component.onCurrencyChange('KES');

    expect(component.errorMessage).toBe('No NIP fee schedule is configured for KES.');
    expect(component.form.controls.vatRate.disabled).toBe(true);
  });
});
