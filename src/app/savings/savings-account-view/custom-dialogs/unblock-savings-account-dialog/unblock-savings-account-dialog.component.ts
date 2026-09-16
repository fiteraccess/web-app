/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose
} from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { RestrictionsService } from 'app/savings/restrictions/restrictions.service';
import { LiftReason } from 'app/savings/restrictions/restriction-reason.model';

/**
 * Lifting a restriction — Unblock, Unblock Deposit or Unblock Withdrawal — is documented with a reason chosen
 * from Fineract's unblock-reasons list and a free-text narration; the proxy refuses a lift without both.
 */
@Component({
  selector: 'mifosx-unblock-savings-account-dialog',
  templateUrl: './unblock-savings-account-dialog.component.html',
  styleUrls: ['./unblock-savings-account-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class UnblockSavingsAccountDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<UnblockSavingsAccountDialogComponent>>(MatDialogRef);
  data: { heading: string } = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(UntypedFormBuilder);
  private restrictionsService = inject(RestrictionsService);

  static readonly NARRATION_MAX_LENGTH = 500;

  liftReasons: LiftReason[] = [];

  unblockForm: UntypedFormGroup = this.formBuilder.group({
    reasonCode: [
      '',
      Validators.required
    ],
    narration: [
      '',
      [
        Validators.required,
        Validators.maxLength(UnblockSavingsAccountDialogComponent.NARRATION_MAX_LENGTH)
      ]
    ]
  });

  ngOnInit() {
    this.restrictionsService.getLiftReasons().subscribe((reasons: LiftReason[]) => (this.liftReasons = reasons));
  }

  confirm() {
    const { reasonCode, narration } = this.unblockForm.value;
    this.dialogRef.close({ confirm: true, reasonCode: String(reasonCode), narration: narration.trim() });
  }
}
