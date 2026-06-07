/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, inject } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';

import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { KYC_FIELD_MAX_LENGTH, KycContext } from '../../kyc/kyc.model';

/**
 * KYC step for the create-client stepper. Captures Tier 1 KYC, which
 * requires at least one of BVN or NIN. The 'bvnOrNin' form-level error
 * is set when both fields are blank.
 */
@Component({
  selector: 'mifosx-client-kyc-step',
  templateUrl: './client-kyc-step.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatStepperPrevious,
    MatStepperNext
  ]
})
export class ClientKycStepComponent {
  private formBuilder = inject(UntypedFormBuilder);

  /** Field length limits surfaced to the template. */
  readonly maxLength = KYC_FIELD_MAX_LENGTH;

  /** KYC form. */
  kycForm: UntypedFormGroup = this.formBuilder.group(
    {
      bvn: [
        '',
        Validators.maxLength(KYC_FIELD_MAX_LENGTH.bvn)
      ],
      nin: [
        '',
        Validators.maxLength(KYC_FIELD_MAX_LENGTH.nin)
      ]
    },
    { validators: ClientKycStepComponent.bvnOrNinValidator }
  );

  /**
   * Form-level validator: at least one of BVN or NIN must be non-blank.
   */
  static bvnOrNinValidator(group: AbstractControl): ValidationErrors | null {
    const bvn = (group.get('bvn')?.value || '').trim();
    const nin = (group.get('nin')?.value || '').trim();
    return bvn.length > 0 || nin.length > 0 ? null : { bvnOrNin: true };
  }

  /**
   * Returns the cleaned KYC payload for Tier 1. Blank fields are omitted.
   */
  get kycContext(): KycContext {
    const raw = this.kycForm.value;
    const context: KycContext = { tier: 'TIER_1' };
    const bvn = (raw.bvn || '').trim();
    const nin = (raw.nin || '').trim();
    if (bvn) {
      context.bvn = bvn;
    }
    if (nin) {
      context.nin = nin;
    }
    return context;
  }
}
