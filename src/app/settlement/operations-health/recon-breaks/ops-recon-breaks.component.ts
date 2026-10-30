/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, inject, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsHealthStore } from '../ops-health.store';
import { ReconDetail } from '../ops-health.model';
import { LAGOS_TZ, breakLines, naira } from '../ops-health-presentation';

/** Recon detail: the matching cursor, and the unmatched items counted when someone asks (Check breaks now). */
@Component({
  selector: 'mifosx-ops-recon-breaks',
  templateUrl: './ops-recon-breaks.component.html',
  styleUrls: ['./ops-recon-breaks.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatTableModule,
    OpsMarkComponent
  ]
})
export class OpsReconBreaksComponent {
  readonly store = inject(OpsHealthStore);

  readonly recon = input.required<ReconDetail>();
  /** True for a moment after a Needs a look line pointed at the recon block. */
  readonly highlighted = input(false);

  readonly lines = computed(() => {
    const breaks = this.store.breaks()?.breaks;
    return breaks ? breakLines(breaks) : [];
  });

  readonly columns = [
    'mark',
    'glCode',
    'integrity',
    'difference',
    'items',
    'critical',
    'high',
    'warn'
  ];
  readonly lagos = LAGOS_TZ;
  readonly naira = naira;

  checkBreaks(): void {
    this.store.checkBreaks();
  }
}
