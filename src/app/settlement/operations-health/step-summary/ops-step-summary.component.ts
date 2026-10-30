/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, input } from '@angular/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsHealth, Step } from '../ops-health.model';
import { LAGOS_TZ } from '../ops-health-presentation';

/**
 * A step's facts on one line: its stored status counts (`SETTLED 4 · FAILED 1`), the Fineract date on Business date
 * or the last sweep on Recon, or the check error when the step could not be read. Muted, except counts that carry a mark.
 */
@Component({
  selector: 'mifosx-ops-step-summary',
  templateUrl: './ops-step-summary.component.html',
  styleUrls: ['./ops-step-summary.component.scss'],
  imports: [...STANDALONE_SHARED_IMPORTS]
})
export class OpsStepSummaryComponent {
  readonly health = input.required<OpsHealth>();
  readonly step = input.required<Step>();

  readonly lagos = LAGOS_TZ;
}
