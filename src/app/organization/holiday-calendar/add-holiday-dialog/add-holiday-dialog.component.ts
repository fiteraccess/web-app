/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { formatDmy } from '../../financial-years/iso-date';
import { HOLIDAY_NAME_MAX_LENGTH } from '../holiday-calendar.model';

export interface AddHolidayResult {
  name: string;
  description: string | null;
}

/** Names the holiday for one day; the calendar saves it. */
@Component({
  selector: 'mifosx-add-holiday-dialog',
  templateUrl: './add-holiday-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class AddHolidayDialogComponent {
  private dialogRef = inject(MatDialogRef<AddHolidayDialogComponent, AddHolidayResult>);
  readonly data = inject<{ iso: string }>(MAT_DIALOG_DATA);

  readonly day = formatDmy(this.data.iso);
  readonly maxLength = HOLIDAY_NAME_MAX_LENGTH;
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(HOLIDAY_NAME_MAX_LENGTH)
      ]
    }),
    description: new FormControl('', { nonNullable: true })
  });

  submit(): void {
    if (this.form.invalid || !this.form.controls.name.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description } = this.form.getRawValue();
    this.dialogRef.close({ name: name.trim(), description: description.trim() || null });
  }
}
