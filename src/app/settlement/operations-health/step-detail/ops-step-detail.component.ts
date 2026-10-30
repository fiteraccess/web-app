/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, DestroyRef, ElementRef, effect, inject, input, signal, untracked } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsTextComponent } from '../text/ops-text.component';
import { OpsReconBreaksComponent } from '../recon-breaks/ops-recon-breaks.component';
import { OpsHealthStore } from '../ops-health.store';
import { CallLink, CheckResult, CycleCell, CycleRow, EocRun, EodStep, OpsHealth, StepId } from '../ops-health.model';
import { LAGOS_TZ, checkRowKey, cycleRowKey, markClass, naira, tabOf } from '../ops-health-presentation';

/** How long a row a Needs a look line pointed at stays highlighted. */
const HIGHLIGHT_MS = 3000;

/** The step's stored rows for the day, one table per kind of row, values as stored. */
@Component({
  selector: 'mifosx-ops-step-detail',
  templateUrl: './ops-step-detail.component.html',
  styleUrls: ['./ops-step-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTableModule,
    OpsMarkComponent,
    OpsTextComponent,
    OpsReconBreaksComponent
  ]
})
export class OpsStepDetailComponent {
  private store = inject(OpsHealthStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly health = input.required<OpsHealth>();
  readonly step = input.required<StepId>();

  readonly lagos = LAGOS_TZ;
  readonly naira = naira;
  readonly markClass = markClass;
  /** The `data-row-key` of the row a Needs a look line pointed at, for a moment. */
  readonly highlighted = signal<string | null>(null);
  readonly cycleKey = (row: CycleRow, cycle: string) => cycleRowKey(row.rail, row.switchProvider, cycle);

  // Rows keep their elements across a refresh, so the page does not shift under the reader.
  readonly byBatch = (_: number, row: { batchId: string }) => row.batchId;
  readonly byReference = (_: number, row: { reference: string }) => row.reference;
  readonly byRef = (_: number, row: { ref: string }) => row.ref;
  readonly checkKey = checkRowKey;
  readonly byCheck = (_: number, row: CheckResult) => checkRowKey(row);
  readonly byEoc = (_: number, row: EocRun) => row.runId;
  readonly byName = (_: number, row: EodStep) => row.name;
  readonly byCycleRow = (_: number, row: CycleRow) => `${row.rail} ${row.switchProvider}`;

  readonly batchColumns = [
    'mark',
    'batchId',
    'rail',
    'switchProvider',
    'window',
    'loadedDate',
    'totalCount',
    'totalAmount',
    'code',
    'receivedAt'
  ];
  readonly refusalColumns = [
    'mark',
    'batchId',
    'rail',
    'switchProvider',
    'window',
    'code',
    'reason',
    'receivedAt'
  ];
  readonly settlementColumns = [
    'mark',
    'batchId',
    'rail',
    'switchProvider',
    'window',
    'status',
    'attempts',
    'lastError',
    'declaredCount',
    'declaredAmount',
    'postedCount',
    'postedAmount',
    'exceptions',
    'settleCompleteStatus',
    'settleCompleteAttempts',
    'settleCompleteAt',
    'code',
    'message',
    'createdAt'
  ];
  readonly runColumns = [
    'mark',
    'eocId',
    'rail',
    'switchProvider',
    'cycleAt',
    'cycleDate',
    'status',
    'amount',
    'notifyAttempts',
    'notifiedAt',
    'code',
    'message',
    'lastError'
  ];
  readonly eodStepColumns = [
    'mark',
    'order',
    'name',
    'status',
    'at',
    'error'
  ];
  readonly mirrorColumns = [
    'mark',
    'reference',
    'glCode',
    'branch',
    'amount',
    'flexStatus',
    'outboxStatus',
    'attempts',
    'code',
    'message'
  ];
  readonly checkColumns = [
    'mark',
    'glCode',
    'branch',
    'side',
    'expected',
    'fineractBalance',
    'flexcubeBalance',
    'result',
    'note'
  ];

  constructor() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    effect(() => {
      const rowKey = this.store.revealedRow();
      if (rowKey) {
        untracked(() => {
          this.store.revealedRow.set(null);
          this.highlighted.set(rowKey);
          clearTimeout(timer);
          // The row exists only after this change-detection pass renders it.
          setTimeout(() => this.rowOf(rowKey)?.scrollIntoView?.({ block: 'center' }));
          timer = setTimeout(() => this.highlighted.set(null), HIGHLIGHT_MS);
        });
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  cycleColumns(cycles: string[]): string[] {
    return [
      'rail',
      'switchProvider',
      ...cycles.map((cycle) => `cycle-${cycle}`)
    ];
  }

  cellOf(row: CycleRow, cycle: string): CycleCell | null {
    return row.cells.find((cell) => cell.cycle === cycle) ?? null;
  }

  /** Opens the call behind a grid cell in the Calls with Access table of its own tab. */
  showCall(link: CallLink): void {
    const call = this.health().calls.find((candidate) => candidate.kind === link.kind && candidate.ref === link.ref);
    this.store.revealCall(link.kind, link.ref);
    if (call && call.step !== this.step()) {
      this.router.navigate(
        [
          '..',
          tabOf(call.step).path
        ],
        { relativeTo: this.route, queryParamsHandling: 'preserve' }
      );
    }
  }

  private rowOf(rowKey: string): HTMLElement | null {
    return (
      Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-row-key]')).find(
        (row) => row.getAttribute('data-row-key') === rowKey
      ) ?? null
    );
  }

  isListed(link: CallLink | null): boolean {
    return !!link && this.health().calls.some((call) => call.kind === link.kind && call.ref === link.ref);
  }
}
