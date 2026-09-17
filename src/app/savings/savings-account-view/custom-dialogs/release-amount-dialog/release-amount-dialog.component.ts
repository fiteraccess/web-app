/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Releasing a held amount is recorded with the reason the operator gives; the proxy keeps it on the hold. */
@Component({
  selector: 'mifosx-release-amount-dialog',
  templateUrl: './release-amount-dialog.component.html',
  styleUrls: ['./release-amount-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class ReleaseAmountDialogComponent {
  dialogRef = inject<MatDialogRef<ReleaseAmountDialogComponent>>(MatDialogRef);
  private formBuilder = inject(UntypedFormBuilder);

  static readonly REASON_MAX_LENGTH = 500;

  releaseForm: UntypedFormGroup = this.formBuilder.group({
    reason: [
      '',
      [
        Validators.required,
        Validators.maxLength(ReleaseAmountDialogComponent.REASON_MAX_LENGTH)
      ]
    ]
  });

  confirm() {
    this.dialogRef.close({ confirm: true, reason: this.releaseForm.value.reason.trim() });
  }
}
