/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FormControl, FormGroup, Validators } from '@angular/forms';

import { GLAccount } from 'app/shared/models/general.model';

import {
  hasInboundNipSwitchAccountingMappings,
  hasOutboundNipSwitchAccountingMappings,
  NipSwitchAccountingConfiguration,
  NipSwitchAccountingConfigurationRequest,
  NipSwitchAccountingDirection
} from './nip-switch-accounting-configuration.model';

/** Fineract's GL account type identifier for asset accounts. */
export const NIP_SWITCH_ACCOUNTING_ASSET_ACCOUNT_TYPE = 1;

export type NipSwitchAccountingGlAccountField =
  | 'switchPayableGlAccountId'
  | 'switchFeeGlAccountId'
  | 'commissionIncomeGlAccountId'
  | 'switchReceivableGlAccountId';

type NipSwitchAccountingFormValue = {
  switchId?: string;
  direction?: NipSwitchAccountingDirection | null;
  switchPayableGlAccountId?: number | null;
  switchFeeGlAccountId?: number | null;
  commissionIncomeGlAccountId?: number | null;
  switchReceivableGlAccountId?: number | null;
  active?: boolean;
};

export type NipSwitchAccountingFormControls = {
  switchId: FormControl<string>;
  direction: FormControl<NipSwitchAccountingDirection | null>;
  switchPayableGlAccountId: FormControl<number | null>;
  switchFeeGlAccountId: FormControl<number | null>;
  commissionIncomeGlAccountId: FormControl<number | null>;
  switchReceivableGlAccountId: FormControl<number | null>;
  active: FormControl<boolean>;
};

export type NipSwitchAccountingForm = FormGroup<NipSwitchAccountingFormControls>;

/** Creates the shared NIP switch accounting form used for create and edit workflows. */
export function createNipSwitchAccountingForm(
  configuration: NipSwitchAccountingFormValue = {}
): NipSwitchAccountingForm {
  const form = new FormGroup<NipSwitchAccountingFormControls>({
    switchId: new FormControl(configuration.switchId ?? '', { nonNullable: true, validators: [Validators.required] }),
    direction: new FormControl(configuration.direction ?? null, { validators: [Validators.required] }),
    switchPayableGlAccountId: new FormControl(configuration.switchPayableGlAccountId ?? null),
    switchFeeGlAccountId: new FormControl(configuration.switchFeeGlAccountId ?? null),
    commissionIncomeGlAccountId: new FormControl(configuration.commissionIncomeGlAccountId ?? null),
    switchReceivableGlAccountId: new FormControl(configuration.switchReceivableGlAccountId ?? null),
    active: new FormControl(configuration.active ?? true, { nonNullable: true })
  });

  applyNipSwitchAccountingDirection(form, form.controls.direction.value);
  form.controls.direction.valueChanges.subscribe((direction) => applyNipSwitchAccountingDirection(form, direction));
  return form;
}

/** Initializes the shared form from a configuration returned by Fineract. */
export function createNipSwitchAccountingEditForm(
  configuration: NipSwitchAccountingConfiguration
): NipSwitchAccountingForm {
  return createNipSwitchAccountingForm(configuration);
}

/** Applies the selected direction's exact control availability and validators. */
export function applyNipSwitchAccountingDirection(
  form: NipSwitchAccountingForm,
  direction: NipSwitchAccountingDirection | null
): void {
  const hasOutboundMappings = direction !== null && hasOutboundNipSwitchAccountingMappings(direction);
  const hasInboundMappings = direction !== null && hasInboundNipSwitchAccountingMappings(direction);

  setNipSwitchAccountingMappingControl(form.controls.switchPayableGlAccountId, hasOutboundMappings);
  setNipSwitchAccountingMappingControl(form.controls.switchFeeGlAccountId, hasOutboundMappings);
  setNipSwitchAccountingMappingControl(form.controls.commissionIncomeGlAccountId, hasOutboundMappings);
  setNipSwitchAccountingMappingControl(form.controls.switchReceivableGlAccountId, hasInboundMappings);
}

/** Builds the exact full-replacement request allowed by the selected direction. */
export function buildNipSwitchAccountingReplacement(
  form: NipSwitchAccountingForm
): NipSwitchAccountingConfigurationRequest {
  if (form.invalid) {
    throw new Error('A complete NIP switch accounting mapping is required.');
  }

  const value = form.getRawValue();
  if (value.direction === 'OUTBOUND') {
    return {
      direction: value.direction,
      switchPayableGlAccountId: requiredGlAccountId(value.switchPayableGlAccountId),
      switchFeeGlAccountId: requiredGlAccountId(value.switchFeeGlAccountId),
      commissionIncomeGlAccountId: requiredGlAccountId(value.commissionIncomeGlAccountId),
      active: value.active
    };
  }
  if (value.direction === 'INBOUND') {
    return {
      direction: value.direction,
      switchReceivableGlAccountId: requiredGlAccountId(value.switchReceivableGlAccountId),
      active: value.active
    };
  }
  if (value.direction === 'BOTH') {
    return {
      direction: value.direction,
      switchPayableGlAccountId: requiredGlAccountId(value.switchPayableGlAccountId),
      switchFeeGlAccountId: requiredGlAccountId(value.switchFeeGlAccountId),
      commissionIncomeGlAccountId: requiredGlAccountId(value.commissionIncomeGlAccountId),
      switchReceivableGlAccountId: requiredGlAccountId(value.switchReceivableGlAccountId),
      active: value.active
    };
  }

  throw new Error('A NIP switch accounting direction is required.');
}

/** Returns enabled detail accounts, limiting the Receivable field to assets. */
export function getNipSwitchAccountingGlAccountOptions(
  accounts: readonly GLAccount[],
  field: NipSwitchAccountingGlAccountField
): GLAccount[] {
  return accounts.filter(
    (account) =>
      !account.disabled &&
      account.usage.id === 1 &&
      (field !== 'switchReceivableGlAccountId' || account.type.id === NIP_SWITCH_ACCOUNTING_ASSET_ACCOUNT_TYPE)
  );
}

function setNipSwitchAccountingMappingControl(control: FormControl<number | null>, required: boolean): void {
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

function requiredGlAccountId(value: number | null): number {
  if (value === null) {
    throw new Error('A required NIP switch accounting GL account is missing.');
  }
  return value;
}
