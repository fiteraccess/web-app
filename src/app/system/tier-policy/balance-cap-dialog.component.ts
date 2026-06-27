/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { KycTier } from '../../clients/kyc/kyc.model';
import { TierBalanceCap } from './tier-policy.model';

export interface BalanceCapDialogData {
  tier: KycTier;
  row?: TierBalanceCap;
  currencies: { code: string; name?: string }[];
}

/**
 * Balance cap dialog component.
 */
@Component({
  selector: 'mifosx-balance-cap-dialog',
  templateUrl: './balance-cap-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class BalanceCapDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<BalanceCapDialogComponent>>(MatDialogRef);
  formBuilder = inject(UntypedFormBuilder);
  data = inject<BalanceCapDialogData>(MAT_DIALOG_DATA);

  /** Balance Cap Form. */
  balanceCapForm: UntypedFormGroup;
  /** True when editing an existing row. */
  isEditMode = false;

  ngOnInit() {
    this.isEditMode = !!this.data.row;
    const row = this.data.row;
    this.balanceCapForm = this.formBuilder.group({
      currency: [
        { value: row?.currency ?? null, disabled: this.isEditMode },
        Validators.required
      ],
      balanceCap: [
        row?.balanceCap ?? null,
        Validators.min(0)
      ]
    });
  }

  /**
   * Closes the dialog and returns the TierBalanceCap payload.
   */
  submit() {
    const v = this.balanceCapForm.getRawValue();
    const result: TierBalanceCap = {
      tier: this.data.tier,
      currency: v.currency,
      balanceCap: v.balanceCap
    };
    this.dialogRef.close(result);
  }
}
