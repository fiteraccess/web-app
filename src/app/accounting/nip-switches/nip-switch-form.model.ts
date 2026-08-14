/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import {
  NipSwitchConfigurationReplacement,
  NipSwitchDirection,
  NipSwitchFeeAllocation,
  NipSwitchFeeAllocations
} from './nip-switch-configuration.model';

export type NipSwitchIdMode = 'create' | 'edit';

export interface NipSwitchFormValue {
  switchId?: string;
  direction?: NipSwitchDirection | null;
  switchPayableGlAccountId?: number | null;
  switchFeeGlAccountId?: number | null;
  commissionIncomeGlAccountId?: number | null;
  switchReceivableGlAccountId?: number | null;
  active?: boolean | null;
  switchFeeAllocations?: NipSwitchFeeAllocation[];
}

export type NipSwitchFeeAllocationFormControls = {
  currencyCode: FormControl<string>;
  switchFee: FormControl<number | null>;
};

export type NipSwitchFeeAllocationForm = FormGroup<NipSwitchFeeAllocationFormControls>;

export type NipSwitchFormControls = {
  switchId: FormControl<string>;
  direction: FormControl<NipSwitchDirection | null>;
  switchPayableGlAccountId: FormControl<number | null>;
  switchFeeGlAccountId: FormControl<number | null>;
  commissionIncomeGlAccountId: FormControl<number | null>;
  switchReceivableGlAccountId: FormControl<number | null>;
  active: FormControl<boolean | null>;
  switchFeeAllocations: FormArray<NipSwitchFeeAllocationForm>;
};

export type NipSwitchForm = FormGroup<NipSwitchFormControls>;

export interface NipSwitchConfigurationSubmission {
  switchId: string;
  replacement: NipSwitchConfigurationReplacement;
}

/** Creates the unified desired-state form in create or immutable-ID edit mode. */
export function createNipSwitchForm(
  configuration: NipSwitchFormValue = {},
  switchIdMode: NipSwitchIdMode = 'create',
  preserveValuesUntilDirectionSelected: boolean = false
): NipSwitchForm {
  const allocations = new FormArray<NipSwitchFeeAllocationForm>(
    (configuration.switchFeeAllocations ?? []).map(createNipSwitchFeeAllocationForm),
    { validators: [uniqueCanonicalCurrencies] }
  );
  const form = new FormGroup<NipSwitchFormControls>({
    switchId: new FormControl(configuration.switchId ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        nonBlank,
        normalizedSwitchIdMaxLength
      ]
    }),
    direction: new FormControl(configuration.direction ?? null, { validators: [Validators.required] }),
    switchPayableGlAccountId: new FormControl(configuration.switchPayableGlAccountId ?? null),
    switchFeeGlAccountId: new FormControl(configuration.switchFeeGlAccountId ?? null),
    commissionIncomeGlAccountId: new FormControl(configuration.commissionIncomeGlAccountId ?? null),
    switchReceivableGlAccountId: new FormControl(configuration.switchReceivableGlAccountId ?? null),
    active: new FormControl(configuration.active === undefined ? true : configuration.active, {
      validators: [Validators.required]
    }),
    switchFeeAllocations: allocations
  });

  if (switchIdMode === 'edit') {
    form.controls.switchId.disable({ emitEvent: false });
  }

  if (!(preserveValuesUntilDirectionSelected && form.controls.direction.value === null)) {
    applyNipSwitchDirection(form, form.controls.direction.value);
  }
  form.controls.direction.valueChanges.subscribe((direction) => applyNipSwitchDirection(form, direction));
  return form;
}

/** Creates a typed fixed switch-fee row. */
export function createNipSwitchFeeAllocationForm(
  allocation: Partial<NipSwitchFeeAllocation> = {}
): NipSwitchFeeAllocationForm {
  return new FormGroup<NipSwitchFeeAllocationFormControls>({
    currencyCode: new FormControl(allocation.currencyCode ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        nonBlank
      ]
    }),
    switchFee: new FormControl(allocation.switchFee ?? null, {
      validators: [
        Validators.required,
        Validators.min(0)
      ]
    })
  });
}

export function addNipSwitchFeeAllocation(form: NipSwitchForm, allocation: Partial<NipSwitchFeeAllocation> = {}): void {
  form.controls.switchFeeAllocations.push(createNipSwitchFeeAllocationForm(allocation));
}

export function removeNipSwitchFeeAllocation(form: NipSwitchForm, index: number): void {
  form.controls.switchFeeAllocations.removeAt(index);
}

/** Applies direction-dependent GL and allocation requirements, clearing incompatible desired values. */
export function applyNipSwitchDirection(form: NipSwitchForm, direction: NipSwitchDirection | null): void {
  const hasOutbound = direction === 'OUTBOUND' || direction === 'BOTH';
  const hasInbound = direction === 'INBOUND' || direction === 'BOTH';

  setMappingControl(form.controls.switchPayableGlAccountId, hasOutbound);
  setMappingControl(form.controls.switchFeeGlAccountId, hasOutbound);
  setMappingControl(form.controls.commissionIncomeGlAccountId, hasOutbound);
  setMappingControl(form.controls.switchReceivableGlAccountId, hasInbound);

  const allocations = form.controls.switchFeeAllocations;
  if (hasOutbound) {
    allocations.setValidators([
      atLeastOneAllocation,
      uniqueCanonicalCurrencies
    ]);
  } else {
    allocations.clear({ emitEvent: false });
    allocations.setValidators([uniqueCanonicalCurrencies]);
  }
  allocations.updateValueAndValidity({ emitEvent: false });
}

/** Builds the normalized path identifier and exact full-replacement PUT body. */
export function buildNipSwitchConfigurationSubmission(form: NipSwitchForm): NipSwitchConfigurationSubmission {
  if (form.invalid) {
    throw new Error('A complete NIP switch configuration is required.');
  }

  const value = form.getRawValue();
  const switchId = normalizeNipSwitchId(value.switchId);
  if (!switchId) {
    throw new Error('A NIP switch identifier is required.');
  }

  const common = { active: requiredActive(value.active) };
  if (value.direction === 'INBOUND') {
    return {
      switchId,
      replacement: {
        direction: value.direction,
        switchReceivableGlAccountId: requiredGlAccountId(value.switchReceivableGlAccountId),
        ...common,
        switchFeeAllocations: []
      }
    };
  }

  const switchFeeAllocations = requiredSwitchFeeAllocations(value.switchFeeAllocations);
  if (value.direction === 'OUTBOUND') {
    return {
      switchId,
      replacement: {
        direction: value.direction,
        switchPayableGlAccountId: requiredGlAccountId(value.switchPayableGlAccountId),
        switchFeeGlAccountId: requiredGlAccountId(value.switchFeeGlAccountId),
        commissionIncomeGlAccountId: requiredGlAccountId(value.commissionIncomeGlAccountId),
        ...common,
        switchFeeAllocations
      }
    };
  }
  if (value.direction === 'BOTH') {
    return {
      switchId,
      replacement: {
        direction: value.direction,
        switchPayableGlAccountId: requiredGlAccountId(value.switchPayableGlAccountId),
        switchFeeGlAccountId: requiredGlAccountId(value.switchFeeGlAccountId),
        commissionIncomeGlAccountId: requiredGlAccountId(value.commissionIncomeGlAccountId),
        switchReceivableGlAccountId: requiredGlAccountId(value.switchReceivableGlAccountId),
        ...common,
        switchFeeAllocations
      }
    };
  }

  throw new Error('A NIP switch direction is required.');
}

export function normalizeNipSwitchId(switchId: string): string {
  return switchId.trim().toUpperCase();
}

function setMappingControl(control: FormControl<number | null>, required: boolean): void {
  if (required) {
    control.enable({ emitEvent: false });
    control.setValidators([Validators.required]);
  } else {
    control.reset(null, { emitEvent: false });
    control.clearValidators();
    control.disable({ emitEvent: false });
  }
  control.updateValueAndValidity({ emitEvent: false });
}

const nonBlank: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim().length === 0 ? { blank: true } : null;

const normalizedSwitchIdMaxLength: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => {
  const actualLength = normalizeNipSwitchId(control.value).length;
  return actualLength <= 64 ? null : { maxlength: { requiredLength: 64, actualLength } };
};

const uniqueCanonicalCurrencies: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const allocations = control.value as Array<{ currencyCode?: string }>;
  const currencies = allocations
    .map(({ currencyCode }) => canonicalCurrency(currencyCode ?? ''))
    .filter((currencyCode) => currencyCode.length > 0);
  return new Set(currencies).size === currencies.length ? null : { duplicateCurrency: true };
};

const atLeastOneAllocation: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  (control.value as unknown[]).length > 0 ? null : { minlength: true };

function canonicalCurrency(currencyCode: string): string {
  return currencyCode.trim().toUpperCase();
}

function requiredGlAccountId(value: number | null): number {
  if (value === null) {
    throw new Error('A required NIP switch GL account is missing.');
  }
  return value;
}

function requiredSwitchFeeAllocations(
  allocations: Array<{ currencyCode: string; switchFee: number | null }>
): NipSwitchFeeAllocations {
  const mapped = allocations.map(({ currencyCode, switchFee }) => ({
    currencyCode: canonicalCurrency(currencyCode),
    switchFee: requiredSwitchFee(switchFee)
  }));
  if (mapped.length === 0) {
    throw new Error('At least one fixed switch-fee allocation is required.');
  }
  return mapped as NipSwitchFeeAllocations;
}

function requiredSwitchFee(value: number | null): number {
  if (value === null || value < 0) {
    throw new Error('A non-negative fixed switch fee is required.');
  }
  return value;
}

function requiredActive(value: boolean | null): boolean {
  if (value === null) {
    throw new Error('The desired NIP switch active state is required.');
  }
  return value;
}
