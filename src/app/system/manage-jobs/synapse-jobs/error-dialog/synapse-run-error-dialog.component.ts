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

import { SynapseJobRun } from '../synapse-jobs.model';
import { LAGOS_TZ } from '../synapse-jobs-presentation';

/** The full error of a failed Synapse job run: its message and stored detail. */
@Component({
  selector: 'mifosx-synapse-run-error-dialog',
  templateUrl: './synapse-run-error-dialog.component.html',
  styleUrls: ['./synapse-run-error-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class SynapseRunErrorDialogComponent {
  readonly run = inject<SynapseJobRun>(MAT_DIALOG_DATA);
  readonly lagos = LAGOS_TZ;
}
