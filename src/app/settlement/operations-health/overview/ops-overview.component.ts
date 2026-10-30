/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsAttentionComponent } from '../attention/ops-attention.component';
import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsStepSummaryComponent } from '../step-summary/ops-step-summary.component';
import { OpsHealthStore } from '../ops-health.store';
import { tabOf } from '../ops-health-presentation';

/** Overview tab: Needs a look, then one row per step with its mark and its stored status counts. */
@Component({
  selector: 'mifosx-ops-overview',
  templateUrl: './ops-overview.component.html',
  styleUrls: ['./ops-overview.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    OpsAttentionComponent,
    OpsMarkComponent,
    OpsStepSummaryComponent
  ]
})
export class OpsOverviewComponent {
  readonly store = inject(OpsHealthStore);

  readonly tabOf = tabOf;
}
