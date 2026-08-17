/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { GLAccount } from 'app/shared/models/general.model';

import {
  AggregatorAccountingConfiguration,
  AggregatorAccountingConfigurationRequest,
  normalizeAggregatorCode
} from './aggregator-accounting-configuration.model';

type AggregatorAccountingFormValue = {
  aggregatorCode?: string;
  aggregatorPayableGlAccountId?: number | null;
  commissionIncomeGlAccountId?: number | null;
  convenienceFeeIncomeGlAccountId?: number | null;
  active?: boolean;
};

export type AggregatorAccountingFormControls = {
  aggregatorCode: FormControl<string>;
  aggregatorPayableGlAccountId: FormControl<number | null>;
  commissionIncomeGlAccountId: FormControl<number | null>;
  convenienceFeeIncomeGlAccountId: FormControl<number | null>;
  active: FormControl<boolean>;
};

export type AggregatorAccountingForm = FormGroup<AggregatorAccountingFormControls>;

/** Creates the shared aggregator accounting form used for create and edit workflows. */
export function createAggregatorAccountingForm(
  configuration: AggregatorAccountingFormValue = {}
): AggregatorAccountingForm {
  return new FormGroup<AggregatorAccountingFormControls>({
    aggregatorCode: new FormControl(configuration.aggregatorCode ?? '', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    aggregatorPayableGlAccountId: new FormControl(configuration.aggregatorPayableGlAccountId ?? null, {
      validators: [Validators.required]
    }),
    commissionIncomeGlAccountId: new FormControl(configuration.commissionIncomeGlAccountId ?? null, {
      validators: [Validators.required]
    }),
    convenienceFeeIncomeGlAccountId: new FormControl(configuration.convenienceFeeIncomeGlAccountId ?? null, {
      validators: [Validators.required]
    }),
    active: new FormControl(configuration.active ?? true, { nonNullable: true })
  });
}

/** Rejects an aggregator code that already has a configuration — the create endpoint is a full-replacement
 * upsert, so submitting an existing code would silently overwrite it rather than erroring. */
export function duplicateAggregatorCodeValidator(existingCodes: ReadonlySet<string>): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    return existingCodes.has(normalizeAggregatorCode(control.value)) ? { duplicateAggregatorCode: true } : null;
  };
}

/** Applies the duplicate-code guard to a create-mode form, given the currently configured aggregators. */
export function preventDuplicateAggregatorCode(
  form: AggregatorAccountingForm,
  existingConfigurations: readonly AggregatorAccountingConfiguration[]
): void {
  const existingCodes = new Set(existingConfigurations.map((configuration) => configuration.aggregatorCode));
  form.controls.aggregatorCode.addValidators(duplicateAggregatorCodeValidator(existingCodes));
  form.controls.aggregatorCode.updateValueAndValidity({ emitEvent: false });
}

/** Initializes the shared form from a configuration returned by Fineract. */
export function createAggregatorAccountingEditForm(
  configuration: AggregatorAccountingConfiguration
): AggregatorAccountingForm {
  return createAggregatorAccountingForm(configuration);
}

/** Builds the full-replacement request Fineract's upsert endpoint expects. */
export function buildAggregatorAccountingReplacement(
  form: AggregatorAccountingForm
): AggregatorAccountingConfigurationRequest {
  if (form.invalid) {
    throw new Error('A complete aggregator accounting mapping is required.');
  }

  const value = form.getRawValue();
  return {
    aggregatorPayableGlAccountId: requiredGlAccountId(value.aggregatorPayableGlAccountId),
    commissionIncomeGlAccountId: requiredGlAccountId(value.commissionIncomeGlAccountId),
    convenienceFeeIncomeGlAccountId: requiredGlAccountId(value.convenienceFeeIncomeGlAccountId),
    active: value.active
  };
}

/** Returns enabled detail GL accounts eligible for aggregator configuration. */
export function getAggregatorAccountingGlAccountOptions(accounts: readonly GLAccount[]): GLAccount[] {
  return accounts.filter((account) => !account.disabled && account.usage.id === 1);
}

function requiredGlAccountId(value: number | null): number {
  if (value === null) {
    throw new Error('A required aggregator accounting GL account is missing.');
  }
  return value;
}
