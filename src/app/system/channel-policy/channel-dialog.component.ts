/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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
import { Channel } from './channel-policy.model';

/** {@link Channel} row when editing; absent when creating. */
export interface ChannelDialogData {
  channel?: Channel;
}

/** {@link Channel} form dialog — create or edit. `code` is immutable after creation. */
@Component({
  selector: 'mifosx-channel-dialog',
  templateUrl: './channel-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class ChannelDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<ChannelDialogComponent>>(MatDialogRef);
  formBuilder = inject(UntypedFormBuilder);
  data = inject<ChannelDialogData>(MAT_DIALOG_DATA);

  form!: UntypedFormGroup;
  isEditMode = false;

  /** Regex used by the backend: uppercase, no whitespace, 2–32 chars. */
  static readonly CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;

  ngOnInit(): void {
    this.isEditMode = !!this.data.channel;
    const c = this.data.channel;
    this.form = this.formBuilder.group({
      code: [
        { value: c?.code ?? '', disabled: this.isEditMode },
        [
          Validators.required,
          Validators.pattern(ChannelDialogComponent.CODE_PATTERN)
        ]
      ],
      displayName: [
        c?.displayName ?? '',
        [
          Validators.required,
          Validators.maxLength(64)
        ]
      ],
      description: [
        c?.description ?? '',
        [Validators.maxLength(255)]
      ],
      active: [
        c?.active ?? true,
        [Validators.required]
      ]
    });
  }

  submit(): void {
    const v = this.form.getRawValue();
    // Server normalises code to uppercase, but pre-normalise on the client so the UI reflects it.
    if (!this.isEditMode)
      v.code = String(v.code || '')
        .trim()
        .toUpperCase();
    this.dialogRef.close(v);
  }
}
