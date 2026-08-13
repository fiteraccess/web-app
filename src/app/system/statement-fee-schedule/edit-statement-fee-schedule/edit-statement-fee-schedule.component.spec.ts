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
import { environment } from '../../../../environments/environment';

import { StatementFeeSchedule } from '../statement-fee-schedule.model';

jest.mock('app/standalone-shared.module', () => ({ STANDALONE_SHARED_IMPORTS: [] as any[] }));

import { EditStatementFeeScheduleComponent } from './edit-statement-fee-schedule.component';
import { StatementFeeScheduleService } from '../statement-fee-schedule.service';

const SCHEDULE: StatementFeeSchedule = {
  currencyCode: 'NGN',
  vatRate: 0.075,
  bands: [{ order: 1, upperThreshold: null, totalFee: 21.5, vatBase: 20 }]
};

describe('EditStatementFeeScheduleComponent', () => {
  let service: { getSchedule: jest.Mock; replaceSchedule: jest.Mock };
  let authenticationService: { getCredentials: jest.Mock };
  let route: { snapshot: { data: Record<string, any>; queryParamMap: { get: jest.Mock } } };
  let router: { navigate: jest.Mock };
  let component: EditStatementFeeScheduleComponent;
  let originalRbac: boolean;

  beforeEach(() => {
    originalRbac = environment.productionModeEnableRBAC;
    environment.productionModeEnableRBAC = true;
    service = {
      getSchedule: jest.fn().mockReturnValue(of(SCHEDULE)),
      replaceSchedule: jest.fn().mockReturnValue(of(SCHEDULE))
    };
    authenticationService = {
      getCredentials: jest.fn().mockReturnValue({ permissions: ['WRITE_STATEMENTFEESCHEDULE'] })
    };
    route = {
      snapshot: {
        data: { currencies: { selectedCurrencyOptions: [{ code: 'NGN' }] } },
        queryParamMap: { get: jest.fn().mockReturnValue('NGN') }
      }
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [EditStatementFeeScheduleComponent],
      providers: [
        { provide: StatementFeeScheduleService, useValue: service },
        { provide: AuthenticationService, useValue: authenticationService },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router }
      ]
    });
    TestBed.overrideComponent(EditStatementFeeScheduleComponent, { set: { template: '' } });
    component = TestBed.createComponent(EditStatementFeeScheduleComponent).componentInstance;
  });

  afterEach(() => {
    environment.productionModeEnableRBAC = originalRbac;
  });

  it('loads the fee amount and VAT rate for the currency in the query param', () => {
    component.ngOnInit();

    expect(service.getSchedule).toHaveBeenCalledWith('NGN');
    expect(component.form.controls.feeAmount.value).toBe(20);
    expect(component.form.controls.vatRatePercent.value).toBe(7.5);
  });

  it('falls back to the first configured currency when the query param is absent', () => {
    route.snapshot.queryParamMap.get.mockReturnValue(null);

    component.ngOnInit();

    expect(component.currencyCode).toBe('NGN');
  });

  it('ignores a query-param currency that is not configured', () => {
    route.snapshot.queryParamMap.get.mockReturnValue('KES');

    component.ngOnInit();

    expect(component.currencyCode).toBe('NGN');
  });

  it('computes the VAT and total from the edited values', () => {
    component.ngOnInit();
    component.form.controls.feeAmount.setValue(30);
    component.form.controls.vatRatePercent.setValue(10);

    expect(component.vatAmount).toBe(3);
    expect(component.totalFee).toBe(33);
  });

  it('sends a single-band schedule built from the fee amount and VAT rate, then navigates back', () => {
    component.ngOnInit();
    component.form.controls.feeAmount.setValue(30);
    component.form.controls.vatRatePercent.setValue(10);

    component.submit();

    expect(service.replaceSchedule).toHaveBeenCalledWith('NGN', {
      currencyCode: 'NGN',
      vatRate: 0.1,
      bands: [{ order: 1, upperThreshold: null, totalFee: 33, vatBase: 30 }]
    });
    expect(router.navigate).toHaveBeenCalledWith(['../'], { relativeTo: route, queryParams: { currency: 'NGN' } });
  });

  it('does not submit an invalid form', () => {
    component.ngOnInit();
    component.form.controls.feeAmount.setValue(0);

    component.submit();

    expect(service.replaceSchedule).not.toHaveBeenCalled();
    expect(component.form.controls.feeAmount.touched).toBe(true);
  });

  it('disables the form while saving', () => {
    const saveResponse = new Subject<StatementFeeSchedule>();
    service.replaceSchedule.mockReturnValue(saveResponse);
    component.ngOnInit();

    component.submit();

    expect(component.saving).toBe(true);
    saveResponse.next(SCHEDULE);
    expect(component.saving).toBe(false);
  });

  it('surfaces the server validation message on save failure', () => {
    service.replaceSchedule.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ defaultUserMessage: 'VAT rate must be less than 100%' }] }
          })
      )
    );
    component.ngOnInit();

    component.submit();

    expect(component.errorMessage).toBe('VAT rate must be less than 100%');
    expect(component.saving).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('initializes an editable zeroed schedule when none exists yet', () => {
    service.getSchedule.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.form.controls.feeAmount.value).toBe(0);
    expect(component.form.controls.vatRatePercent.value).toBe(0);
  });

  it('cancel navigates back to the view page for the same currency', () => {
    component.ngOnInit();

    component.cancel();

    expect(router.navigate).toHaveBeenCalledWith(['../'], { relativeTo: route, queryParams: { currency: 'NGN' } });
  });

  it('does not load and routes away without write permission', () => {
    authenticationService.getCredentials.mockReturnValue({ permissions: [] });
    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/not-found']);
    expect(service.getSchedule).not.toHaveBeenCalled();
  });

  it('does not load a schedule when no backend currency is configured', () => {
    route.snapshot.data['currencies'].selectedCurrencyOptions = [];
    route.snapshot.queryParamMap.get.mockReturnValue(null);

    component.ngOnInit();

    expect(component.errorMessage).toBe(
      'No currency is configured. Configure a currency before managing the statement fee.'
    );
    expect(component.loading).toBe(false);
    expect(service.getSchedule).not.toHaveBeenCalled();
  });
});
