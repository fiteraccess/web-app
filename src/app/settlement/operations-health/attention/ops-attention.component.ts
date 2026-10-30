/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject, input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsTextComponent } from '../text/ops-text.component';
import { OpsHealthStore } from '../ops-health.store';
import { AttentionItem, OpsHealth, RefersTo } from '../ops-health.model';
import { LAGOS_TZ, tabOf } from '../ops-health-presentation';

/**
 * Needs a look: every red row of the day and every row whose status is not recognised, as stored, each one click
 * from its row (or its call) on its own tab. Renders nothing when there is nothing to list.
 */
@Component({
  selector: 'mifosx-ops-attention',
  templateUrl: './ops-attention.component.html',
  styleUrls: ['./ops-attention.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTableModule,
    OpsMarkComponent,
    OpsTextComponent
  ]
})
export class OpsAttentionComponent {
  private store = inject(OpsHealthStore);

  readonly health = input.required<OpsHealth>();

  readonly columns = [
    'mark',
    'step',
    'reference',
    'status',
    'message',
    'at',
    'refersTo'
  ];
  readonly lagos = LAGOS_TZ;
  readonly tabOf = tabOf;
  readonly byItem = (index: number, item: AttentionItem) => `${item.step}|${item.reference ?? index}`;

  /** Runs before the router lands on the tab, which then opens the call or highlights the row. */
  reveal(item: AttentionItem): void {
    if (item.link.call) {
      this.store.revealCall(item.link.call.kind, item.link.call.ref);
    } else if (item.link.rowKey) {
      this.store.revealRow(item.link.rowKey);
    }
  }

  revealBatch(refersTo: RefersTo): void {
    this.store.revealRow(refersTo.batchId);
  }
}
