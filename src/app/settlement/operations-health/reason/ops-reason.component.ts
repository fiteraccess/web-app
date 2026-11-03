/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { OpsTextComponent } from '../text/ops-text.component';

/** Why a row stopped, its failure code beneath, and the raw stored error folded behind Details. */
@Component({
  selector: 'mifosx-ops-reason',
  templateUrl: './ops-reason.component.html',
  styleUrls: ['./ops-reason.component.scss'],
  imports: [
    TranslateModule,
    OpsTextComponent
  ]
})
export class OpsReasonComponent {
  readonly reason = input<string | null>(null);
  readonly failureCode = input<string | null>(null);
  readonly lastError = input<string | null>(null);
  readonly supersededBy = input<string | null>(null);
}
