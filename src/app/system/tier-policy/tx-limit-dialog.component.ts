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
import { TierTxLimit } from './tier-policy.model';

export interface TxLimitDialogData {
  tier: KycTier;
  row?: TierTxLimit;
  paymentTypes: { id: number; name: string }[];
  currencies: { code: string; name?: string }[];
}

/**
 * Tx limit dialog component.
 */
@Component({
  selector: 'mifosx-tx-limit-dialog',
  templateUrl: './tx-limit-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class TxLimitDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<TxLimitDialogComponent>>(MatDialogRef);
  formBuilder = inject(UntypedFormBuilder);
  data = inject<TxLimitDialogData>(MAT_DIALOG_DATA);

  /** Tx Limit Form. */
  txLimitForm: UntypedFormGroup;
  /** True when editing an existing row. */
  isEditMode = false;

  ngOnInit() {
    this.isEditMode = !!this.data.row;
    const row = this.data.row;
    this.txLimitForm = this.formBuilder.group({
      paymentTypeId: [
        { value: row?.paymentTypeId ?? null, disabled: this.isEditMode },
        Validators.required
      ],
      currencyCode: [
        { value: row?.currencyCode ?? null, disabled: this.isEditMode },
        Validators.required
      ],
      perTxCap: [
        row?.perTxCap ?? null,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      dailySpendCap: [
        row?.dailySpendCap ?? null,
        [
          Validators.required,
          Validators.min(0)
        ]
      ]
    });
  }

  /**
   * Closes the dialog and returns the TierTxLimit payload.
   */
  submit() {
    const v = this.txLimitForm.getRawValue();
    const result: TierTxLimit = {
      tier: this.data.tier,
      paymentTypeId: v.paymentTypeId,
      currencyCode: v.currencyCode,
      perTxCap: v.perTxCap,
      dailySpendCap: v.dailySpendCap
    };
    this.dialogRef.close(result);
  }
}
