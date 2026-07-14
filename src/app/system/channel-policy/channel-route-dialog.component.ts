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
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CHANNEL_HTTP_METHODS } from './channel-policy.model';

/** Create-route dialog for AB-473. Routes are immutable — edit = delete + create. */
@Component({
  selector: 'mifosx-channel-route-dialog',
  templateUrl: './channel-route-dialog.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatTooltip
  ]
})
export class ChannelRouteDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<ChannelRouteDialogComponent>>(MatDialogRef);
  formBuilder = inject(UntypedFormBuilder);
  data = inject<{ channelCode: string }>(MAT_DIALOG_DATA);

  form!: UntypedFormGroup;
  readonly methods = CHANNEL_HTTP_METHODS;

  /** Backend rule: pathTemplate must start with `/` or be exactly `*`. */
  static readonly PATH_PATTERN = /^(\*|\/.*)$/;

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      method: [
        'GET',
        Validators.required
      ],
      pathTemplate: [
        '',
        [
          Validators.required,
          Validators.maxLength(255),
          Validators.pattern(ChannelRouteDialogComponent.PATH_PATTERN)
        ]
      ]
    });
  }

  /** Human label for a method option; wildcards render as "Any" per Access Bank tooltip preference. */
  methodLabel(m: string): string {
    return m === '*' ? 'Any' : m;
  }

  submit(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({ method: String(v.method).toUpperCase(), pathTemplate: String(v.pathTemplate).trim() });
  }
}
