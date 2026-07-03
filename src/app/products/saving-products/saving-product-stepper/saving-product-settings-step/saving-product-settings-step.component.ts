/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, Input, inject } from '@angular/core';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-saving-product-settings-step',
  templateUrl: './saving-product-settings-step.component.html',
  styleUrls: ['./saving-product-settings-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTooltip,
    MatCheckbox,
    MatDivider,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ]
})
export class SavingProductSettingsStepComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);

  @Input() savingProductsTemplate: any;

  savingProductSettingsForm: UntypedFormGroup;

  lockinPeriodFrequencyTypeData: any;
  taxGroupData: any;

  constructor() {
    this.createSavingProductSettingsForm();
    this.setConditionalControls();
  }

  ngOnInit() {
    this.lockinPeriodFrequencyTypeData = this.savingProductsTemplate.lockinPeriodFrequencyTypeOptions;
    this.taxGroupData = this.savingProductsTemplate.taxGroupOptions;

    const hasLockinPeriod =
      this.savingProductsTemplate.lockinPeriodFrequency && this.savingProductsTemplate.lockinPeriodFrequency > 0;

    this.savingProductSettingsForm.patchValue({
      minRequiredOpeningBalance: this.savingProductsTemplate.minRequiredOpeningBalance,
      enableLockinPeriod: hasLockinPeriod,
      withdrawalFeeForTransfers: this.savingProductsTemplate.withdrawalFeeForTransfers,
      minBalanceForInterestCalculation: this.savingProductsTemplate.minBalanceForInterestCalculation,
      enforceMinRequiredBalance: this.savingProductsTemplate.enforceMinRequiredBalance,
      minRequiredBalance: this.savingProductsTemplate.minRequiredBalance,
      allowOverdraft: this.savingProductsTemplate.allowOverdraft,
      minOverdraftForInterestCalculation: this.savingProductsTemplate.minOverdraftForInterestCalculation,
      nominalAnnualInterestRateOverdraft: this.savingProductsTemplate.nominalAnnualInterestRateOverdraft,
      overdraftLimit: this.savingProductsTemplate.overdraftLimit,
      withHoldTax: this.savingProductsTemplate.withHoldTax,
      taxGroupId: this.savingProductsTemplate.taxGroup && this.savingProductsTemplate.taxGroup.id,
      isDormancyTrackingActive: this.savingProductsTemplate.isDormancyTrackingActive,
      daysToInactive: this.savingProductsTemplate.daysToInactive,
      daysToDormancy: this.savingProductsTemplate.daysToDormancy,
      daysToEscheat: this.savingProductsTemplate.daysToEscheat
    });

    // AB-265: hydrate EMT Levy attributes from the Synapse-merged response. Prefer `additionalAttributes`
    // (added by SavingsProductProxyHandler.enrichSingle on GET /savingsproducts/{id}), but fall back to
    // top-level fields so a Fineract-direct load (bypassing Synapse) still populates the controls.
    const emt = this.savingProductsTemplate.additionalAttributes || {};
    const src = this.savingProductsTemplate;
    this.savingProductSettingsForm.patchValue({
      isEmtLevyApplicableForDeposit: !!(emt.isEmtLevyApplicableForDeposit ?? src.isEmtLevyApplicableForDeposit),
      isEmtLevyApplicableForWithdraw: !!(emt.isEmtLevyApplicableForWithdraw ?? src.isEmtLevyApplicableForWithdraw),
      overrideGlobalEmtLevySetting: !!(emt.overrideGlobalEmtLevySetting ?? src.overrideGlobalEmtLevySetting),
      emtLevyAmount: emt.emtLevyAmount ?? src.emtLevyAmount ?? '',
      emtLevyThreshold: emt.emtLevyThreshold ?? src.emtLevyThreshold ?? ''
    });

    if (hasLockinPeriod) {
      this.savingProductSettingsForm.patchValue({
        lockinPeriodFrequency: this.savingProductsTemplate.lockinPeriodFrequency,
        lockinPeriodFrequencyType:
          this.savingProductsTemplate.lockinPeriodFrequencyType &&
          this.savingProductsTemplate.lockinPeriodFrequencyType.id
      });
    }
  }

  createSavingProductSettingsForm() {
    this.savingProductSettingsForm = this.formBuilder.group({
      minRequiredOpeningBalance: [
        '',
        [Validators.min(0)]
      ],
      enableLockinPeriod: [false],
      withdrawalFeeForTransfers: [false],
      minBalanceForInterestCalculation: [
        '',
        [Validators.min(0)]
      ],
      enforceMinRequiredBalance: [false],
      minRequiredBalance: [
        '',
        [Validators.min(0)]
      ],
      allowOverdraft: [false],
      withHoldTax: [false],
      isDormancyTrackingActive: [false],
      // AB-265: All EMT Levy controls are declared upfront (with no validators) so the reactive-form bindings
      // in the template resolve immediately. Validators for amount/threshold are toggled dynamically in
      // setConditionalControls based on the override flag.
      isEmtLevyApplicableForDeposit: [false],
      isEmtLevyApplicableForWithdraw: [false],
      overrideGlobalEmtLevySetting: [false],
      emtLevyAmount: [''],
      emtLevyThreshold: ['']
    });
  }

  setConditionalControls() {
    this.savingProductSettingsForm.get('enableLockinPeriod').valueChanges.subscribe((enableLockinPeriod: any) => {
      if (enableLockinPeriod) {
        this.savingProductSettingsForm.addControl(
          'lockinPeriodFrequency',
          new UntypedFormControl('', [
            Validators.required,
            Validators.min(1),
            Validators.pattern('^[1-9]\\d*$')
          ])
        );
        this.savingProductSettingsForm.addControl(
          'lockinPeriodFrequencyType',
          new UntypedFormControl('', Validators.required)
        );
      } else {
        this.savingProductSettingsForm.removeControl('lockinPeriodFrequency');
        this.savingProductSettingsForm.removeControl('lockinPeriodFrequencyType');
      }
    });

    this.savingProductSettingsForm.get('allowOverdraft').valueChanges.subscribe((allowOverdraft: any) => {
      if (allowOverdraft) {
        this.savingProductSettingsForm.addControl(
          'minOverdraftForInterestCalculation',
          new UntypedFormControl('', [Validators.min(0)])
        );
        this.savingProductSettingsForm.addControl(
          'nominalAnnualInterestRateOverdraft',
          new UntypedFormControl('', [Validators.min(0)])
        );
        this.savingProductSettingsForm.addControl('overdraftLimit', new UntypedFormControl('', [Validators.min(0)]));
      } else {
        this.savingProductSettingsForm.removeControl('minOverdraftForInterestCalculation');
        this.savingProductSettingsForm.removeControl('nominalAnnualInterestRateOverdraft');
        this.savingProductSettingsForm.removeControl('overdraftLimit');
      }
    });

    this.savingProductSettingsForm.get('withHoldTax').valueChanges.subscribe((withHoldTax: any) => {
      if (withHoldTax) {
        this.savingProductSettingsForm.addControl('taxGroupId', new UntypedFormControl('', Validators.required));
      } else {
        this.savingProductSettingsForm.removeControl('taxGroupId');
      }
    });

    this.savingProductSettingsForm
      .get('isDormancyTrackingActive')
      .valueChanges.subscribe((isDormancyTrackingActive: any) => {
        if (isDormancyTrackingActive) {
          this.savingProductSettingsForm.addControl(
            'daysToInactive',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
          this.savingProductSettingsForm.addControl(
            'daysToDormancy',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
          this.savingProductSettingsForm.addControl(
            'daysToEscheat',
            new UntypedFormControl('', [
              Validators.required,
              Validators.min(0)
            ])
          );
        } else {
          this.savingProductSettingsForm.removeControl('daysToInactive');
          this.savingProductSettingsForm.removeControl('daysToDormancy');
          this.savingProductSettingsForm.removeControl('daysToEscheat');
        }
      });

    // AB-265: EMT Levy validators are toggled dynamically. Amount + threshold are declared upfront (no
    // validators) so bindings resolve immediately; we add/remove the required + min(0) validators when the
    // override flag flips. The @if in the template drives visibility only.
    const emtAmountCtrl = this.savingProductSettingsForm.get('emtLevyAmount');
    const emtThresholdCtrl = this.savingProductSettingsForm.get('emtLevyThreshold');
    const applyEmtValidators = (override: boolean) => {
      if (override) {
        emtAmountCtrl.setValidators([
          Validators.required,
          Validators.min(0)
        ]);
        emtThresholdCtrl.setValidators([
          Validators.required,
          Validators.min(0)
        ]);
      } else {
        emtAmountCtrl.clearValidators();
        emtThresholdCtrl.clearValidators();
        emtAmountCtrl.setValue('', { emitEvent: false });
        emtThresholdCtrl.setValue('', { emitEvent: false });
      }
      emtAmountCtrl.updateValueAndValidity({ emitEvent: false });
      emtThresholdCtrl.updateValueAndValidity({ emitEvent: false });
    };

    this.savingProductSettingsForm
      .get('overrideGlobalEmtLevySetting')
      .valueChanges.subscribe((override: boolean) => applyEmtValidators(override));

    // If either applicability flag is turned off AND neither remains, clear the override + amount/threshold.
    const clearIfNoApplicability = () => {
      const anyEnabled =
        this.savingProductSettingsForm.value.isEmtLevyApplicableForDeposit ||
        this.savingProductSettingsForm.value.isEmtLevyApplicableForWithdraw;
      if (!anyEnabled) {
        this.savingProductSettingsForm.patchValue({ overrideGlobalEmtLevySetting: false }, { emitEvent: true });
      }
    };
    this.savingProductSettingsForm
      .get('isEmtLevyApplicableForDeposit')
      .valueChanges.subscribe(() => clearIfNoApplicability());
    this.savingProductSettingsForm
      .get('isEmtLevyApplicableForWithdraw')
      .valueChanges.subscribe(() => clearIfNoApplicability());
  }

  get savingProductSettings() {
    const formValue = { ...this.savingProductSettingsForm.value };
    delete formValue.enableLockinPeriod;
    return formValue;
  }
}
