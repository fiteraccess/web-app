/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
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
import { LiftReason, LIFT_DOCUMENT_TYPES } from 'app/savings/restrictions/restriction-reason.model';

/**
 * Lifting a restriction — Unblock, Unblock Deposit or Unblock Withdrawal — is documented with a reason chosen
 * from Fineract's unblock-reasons list, a free-text narration, and a supporting document that establishes who
 * the customer is or where they live. The proxy refuses a lift without all three.
 *
 * <p>The document is filed against the account before the lift is requested, and the lift quotes the id that
 * upload returns. The two are deliberately separate calls — the file lives in the core, the restriction does
 * not — so this dialog uploads first and only then closes with a result.
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
  data: { heading: string; accountNumber: string } = inject(MAT_DIALOG_DATA);
  private formBuilder = inject(UntypedFormBuilder);
  private restrictionsService = inject(RestrictionsService);

  static readonly NARRATION_MAX_LENGTH = 500;

  liftReasons: LiftReason[] = [];
  readonly documentTypes = LIFT_DOCUMENT_TYPES;
  file: File | null = null;
  uploading = false;
  errorMessage = '';

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
    ],
    documentType: [
      '',
      Validators.required
    ]
  });

  ngOnInit() {
    this.restrictionsService.getLiftReasons().subscribe((reasons: LiftReason[]) => (this.liftReasons = reasons));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.length ? input.files[0] : null;
    this.errorMessage = '';
  }

  get canConfirm(): boolean {
    return this.unblockForm.valid && !!this.file && !this.uploading;
  }

  confirm() {
    if (!this.canConfirm) {
      return;
    }
    const { reasonCode, narration, documentType } = this.unblockForm.value;
    this.uploading = true;
    this.errorMessage = '';

    this.restrictionsService.uploadDocument(this.data.accountNumber, this.file as File, documentType).subscribe({
      next: (uploaded) => {
        this.uploading = false;
        this.dialogRef.close({
          confirm: true,
          reasonCode: String(reasonCode),
          narration: narration.trim(),
          documentId: uploaded.resourceId
        });
      },
      error: (error: HttpErrorResponse) => {
        // The lift is not attempted: nothing has changed on the account, so the operator can simply retry.
        this.uploading = false;
        this.errorMessage = this.serverMessage(error);
      }
    });
  }

  private serverMessage(error: HttpErrorResponse): string {
    return (
      error.error?.errors?.[0]?.defaultUserMessage ||
      error.error?.defaultUserMessage ||
      error.error?.message ||
      'The supporting document could not be filed. Please try again.'
    );
  }
}
