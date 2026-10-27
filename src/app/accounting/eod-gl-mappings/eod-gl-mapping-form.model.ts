/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import {
  AmountSource,
  DEFAULT_BRIDGE_ACTIVITY,
  EodGlMapping,
  EodGlMappingRequest,
  EodJob,
  Side,
  SOURCE_KEY_OPTIONS,
  SourceKind,
  SwitchGl
} from './eod-gl-mapping.model';

export type EodGlMappingFormControls = {
  job: FormControl<EodJob>;
  logicalName: FormControl<string>;
  amountSource: FormControl<AmountSource>;
  sourceKey: FormControl<string | null>;
  sourceKind: FormControl<SourceKind>;
  productCategory: FormControl<string | null>;
  productAccountKey: FormControl<string | null>;
  sourceActivityId: FormControl<number | null>;
  switchId: FormControl<string | null>;
  switchGl: FormControl<SwitchGl>;
  aggregatorCode: FormControl<string | null>;
  bridgeActivityId: FormControl<number | null>;
  normalSide: FormControl<Side>;
  withFlexcube: FormControl<boolean>;
  flexSourceGl: FormControl<string | null>;
  flexSourceBranch: FormControl<string | null>;
  flexBridgeGl: FormControl<string | null>;
  flexBridgeBranch: FormControl<string | null>;
  active: FormControl<boolean>;
};

export type EodGlMappingForm = FormGroup<EodGlMappingFormControls>;

type SourceValues = Pick<
  EodGlMappingForm['value'],
  | 'sourceKind'
  | 'productCategory'
  | 'productAccountKey'
  | 'sourceActivityId'
  | 'switchId'
  | 'switchGl'
  | 'aggregatorCode'
>;

/** The Fineract reference string a source picker stands for, or null while it is incomplete. */
export function toSourceRef(v: SourceValues): string | null {
  switch (v.sourceKind) {
    case 'PRODUCT':
      return v.productCategory && v.productAccountKey ? `PRODUCT:${v.productCategory}:${v.productAccountKey}` : null;
    case 'ACTIVITY':
      return v.sourceActivityId ? `ACTIVITY:${v.sourceActivityId}` : null;
    case 'SWITCH':
      return v.switchId ? `SWITCH:${v.switchId}:${v.switchGl ?? 'commissionIncome'}` : null;
    case 'AGGREGATOR':
      return v.aggregatorCode ? `AGGREGATOR:${v.aggregatorCode}:commissionIncome` : null;
    default:
      return null;
  }
}

/** The picker values a stored reference string stands for; an unknown shape opens as an empty product picker. */
export function fromSourceRef(ref: string | null): SourceValues {
  const empty: SourceValues = {
    sourceKind: 'PRODUCT',
    productCategory: null,
    productAccountKey: null,
    sourceActivityId: null,
    switchId: null,
    switchGl: 'commissionIncome',
    aggregatorCode: null
  };
  const parts = (ref ?? '').split(':');
  switch (parts[0]) {
    case 'PRODUCT':
      return parts.length === 3 ? { ...empty, productCategory: parts[1], productAccountKey: parts[2] } : empty;
    case 'ACTIVITY':
      return { ...empty, sourceKind: 'ACTIVITY', sourceActivityId: Number(parts[1]) || null };
    case 'SWITCH':
      return {
        ...empty,
        sourceKind: 'SWITCH',
        switchId: parts[1] ?? null,
        switchGl: parts[2] === 'switchFee' ? 'switchFee' : 'commissionIncome'
      };
    case 'AGGREGATOR':
      return { ...empty, sourceKind: 'AGGREGATOR', aggregatorCode: parts[1] ?? null };
    default:
      return empty;
  }
}

export function bridgeActivityOf(ref: string | null): number | null {
  const parts = (ref ?? '').split(':');
  return parts[0] === 'ACTIVITY' ? Number(parts[1]) || null : null;
}

/** Whether a source reads through a `sourceKey`. */
export function needsSourceKey(source: AmountSource | null | undefined): boolean {
  return !!source && source in SOURCE_KEY_OPTIONS;
}

/**
 * The checks Synapse enforces, made visible before a round trip: a source key where the source needs one, a product GL
 * for deposit movement, both Flexcube GLs with their branches or neither, and two different Flexcube GLs.
 */
export const eodGlMappingValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const v = (group as EodGlMappingForm).getRawValue();
  const errors: ValidationErrors = {};
  const settlement = v.job === 'SETTLEMENT';
  if (!settlement) {
    if (needsSourceKey(v.amountSource) && !v.sourceKey) errors['sourceKeyRequired'] = true;
    if (v.amountSource === 'DEPOSIT_MOVEMENT' && v.sourceKind !== 'PRODUCT') errors['depositNeedsProduct'] = true;
    if (!toSourceRef(v)) errors['sourceIncomplete'] = true;
    if (!v.bridgeActivityId) errors['bridgeRequired'] = true;
  }
  if (settlement || v.withFlexcube) {
    if (!v.flexSourceGl || !v.flexSourceBranch || !v.flexBridgeGl || !v.flexBridgeBranch) {
      errors['flexcubeIncomplete'] = true;
    } else if (v.flexSourceGl === v.flexBridgeGl && v.flexSourceBranch === v.flexBridgeBranch) {
      errors['flexcubeSame'] = true;
    }
  }
  return Object.keys(errors).length ? errors : null;
};

/** The create form for a job; the bridge defaults to the job's EOD bridge activity. */
export function createEodGlMappingForm(job: EodJob = 'DEPOSIT'): EodGlMappingForm {
  return new FormGroup<EodGlMappingFormControls>(
    {
      job: new FormControl<EodJob>(job, { nonNullable: true, validators: Validators.required }),
      logicalName: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.maxLength(100),
          Validators.pattern(/^[A-Z0-9_]+$/)
        ]
      }),
      amountSource: new FormControl<AmountSource>(job === 'SETTLEMENT' ? 'NONE' : 'DEPOSIT_MOVEMENT', {
        nonNullable: true
      }),
      sourceKey: new FormControl<string | null>(null),
      sourceKind: new FormControl<SourceKind>('PRODUCT', { nonNullable: true }),
      productCategory: new FormControl<string | null>(null),
      productAccountKey: new FormControl<string | null>(null),
      sourceActivityId: new FormControl<number | null>(null),
      switchId: new FormControl<string | null>(null),
      switchGl: new FormControl<SwitchGl>('commissionIncome', { nonNullable: true }),
      aggregatorCode: new FormControl<string | null>(null),
      bridgeActivityId: new FormControl<number | null>(DEFAULT_BRIDGE_ACTIVITY[job] ?? null),
      normalSide: new FormControl<Side>('CREDIT', { nonNullable: true }),
      withFlexcube: new FormControl<boolean>(job === 'SETTLEMENT', { nonNullable: true }),
      flexSourceGl: new FormControl<string | null>(null),
      flexSourceBranch: new FormControl<string | null>(null),
      flexBridgeGl: new FormControl<string | null>(null),
      flexBridgeBranch: new FormControl<string | null>(null),
      active: new FormControl<boolean>(true, { nonNullable: true })
    },
    { validators: eodGlMappingValidator }
  );
}

/** The edit form for a stored row; job and logical name identify it and cannot change. */
export function createEodGlMappingEditForm(mapping: EodGlMapping): EodGlMappingForm {
  const form = createEodGlMappingForm(mapping.job);
  form.patchValue({
    logicalName: mapping.logicalName,
    amountSource: mapping.amountSource,
    sourceKey: mapping.sourceKey,
    ...fromSourceRef(mapping.finSourceRef),
    bridgeActivityId: bridgeActivityOf(mapping.finBridgeRef),
    normalSide: mapping.normalSide,
    withFlexcube: !!mapping.flexSource,
    flexSourceGl: mapping.flexSource?.gl ?? null,
    flexSourceBranch: mapping.flexSource?.branch ?? null,
    flexBridgeGl: mapping.flexBridge?.gl ?? null,
    flexBridgeBranch: mapping.flexBridge?.branch ?? null,
    active: mapping.active
  });
  form.controls.job.disable();
  form.controls.logicalName.disable();
  form.controls.logicalName.clearValidators();
  return form;
}

/** The PUT and preview body the form stands for. */
export function buildEodGlMappingRequest(form: EodGlMappingForm): EodGlMappingRequest {
  const v = form.getRawValue();
  const settlement = v.job === 'SETTLEMENT';
  const flex = settlement || v.withFlexcube;
  return {
    amountSource: settlement ? 'NONE' : v.amountSource,
    sourceKey: !settlement && needsSourceKey(v.amountSource) ? v.sourceKey : null,
    finSourceRef: settlement ? null : toSourceRef(v),
    finBridgeRef: settlement || !v.bridgeActivityId ? null : `ACTIVITY:${v.bridgeActivityId}`,
    normalSide: v.normalSide,
    flexSource: flex ? { gl: v.flexSourceGl ?? '', branch: v.flexSourceBranch ?? '' } : null,
    flexBridge: flex ? { gl: v.flexBridgeGl ?? '', branch: v.flexBridgeBranch ?? '' } : null,
    active: v.active
  };
}
