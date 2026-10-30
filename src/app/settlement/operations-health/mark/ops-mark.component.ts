/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { Mark } from '../ops-health.model';
import { markClass } from '../ops-health-presentation';

const ICONS: Record<Mark, string | null> = { RED: 'error', AMBER: 'schedule', NONE: null };
const NAMES: Record<Mark, string | null> = { RED: 'Red mark', AMBER: 'Amber mark', NONE: null };

/** A row's mark as a coloured icon; nothing for NONE, so finished rows stay plain. */
@Component({
  selector: 'mifosx-ops-mark',
  templateUrl: './ops-mark.component.html',
  styleUrls: ['./ops-mark.component.scss'],
  imports: [
    MatIcon,
    TranslateModule
  ]
})
export class OpsMarkComponent {
  readonly mark = input.required<Mark>();

  readonly icon = computed(() => ICONS[this.mark()] ?? null);
  readonly name = computed(() => NAMES[this.mark()] ?? null);
  readonly markClass = computed(() => markClass(this.mark()));
}
