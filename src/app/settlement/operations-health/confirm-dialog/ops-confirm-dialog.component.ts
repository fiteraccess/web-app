/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from '@angular/material/dialog';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

export interface OpsConfirmData {
  heading: string;
  message: string;
}

/**
 * Asks before a recovery action. The shared confirmation dialog appends " ?" to its text, which these
 * two-sentence prompts cannot carry; this one shows the prompt as written. Closes with true on Confirm.
 */
@Component({
  selector: 'mifosx-ops-confirm-dialog',
  templateUrl: './ops-confirm-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class OpsConfirmDialogComponent {
  readonly data = inject<OpsConfirmData>(MAT_DIALOG_DATA);
}
