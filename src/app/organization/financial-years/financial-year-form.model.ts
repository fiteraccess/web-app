/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import { FinancialPeriod, FinancialYear, FinancialYearRequest, sortedByStart } from './financial-year.model';
import { dateToIso, isoToDate } from './iso-date';

export type FinancialPeriodForm = FormGroup<{
  periodCode: FormControl<string>;
  startDate: FormControl<Date | null>;
  endDate: FormControl<Date | null>;
}>;

export type FinancialYearForm = FormGroup<{
  financialCycle: FormControl<string>;
  description: FormControl<string>;
  startDate: FormControl<Date | null>;
  endDate: FormControl<Date | null>;
  holidaysConfirmed: FormControl<boolean>;
  periods: FormArray<FinancialPeriodForm>;
}>;

function endNotBeforeStart(group: AbstractControl): ValidationErrors | null {
  const { startDate, endDate } = group.value as { startDate: Date | null; endDate: Date | null };
  return startDate && endDate && endDate < startDate ? { endBeforeStart: true } : null;
}

export function createFinancialPeriodForm(period?: FinancialPeriod): FinancialPeriodForm {
  return new FormGroup(
    {
      periodCode: new FormControl(period?.periodCode ?? '', { nonNullable: true, validators: Validators.required }),
      startDate: new FormControl(isoToDate(period?.startDate), Validators.required),
      endDate: new FormControl(isoToDate(period?.endDate), Validators.required)
    },
    { validators: endNotBeforeStart }
  );
}

/** An empty form for a new year, or one holding a stored year whose code can no longer change. */
export function createFinancialYearForm(year?: FinancialYear): FinancialYearForm {
  return new FormGroup({
    financialCycle: new FormControl(
      { value: year?.financialCycle ?? '', disabled: !!year },
      { nonNullable: true, validators: Validators.required }
    ),
    description: new FormControl(year?.description ?? '', { nonNullable: true }),
    startDate: new FormControl(isoToDate(year?.startDate), Validators.required),
    endDate: new FormControl(isoToDate(year?.endDate), Validators.required),
    holidaysConfirmed: new FormControl(year?.holidaysConfirmed ?? false, { nonNullable: true }),
    periods: new FormArray(sortedByStart(year?.periods ?? []).map(createFinancialPeriodForm))
  });
}

/** The PUT body the form stands for: ISO dates, periods in start-date order. */
export function buildFinancialYearRequest(form: FinancialYearForm): FinancialYearRequest {
  const v = form.getRawValue();
  return {
    description: v.description.trim() || null,
    startDate: dateToIso(v.startDate),
    endDate: dateToIso(v.endDate),
    holidaysConfirmed: v.holidaysConfirmed,
    periods: sortedByStart(
      v.periods.map((period) => ({
        periodCode: period.periodCode.trim(),
        startDate: dateToIso(period.startDate),
        endDate: dateToIso(period.endDate)
      }))
    )
  };
}
