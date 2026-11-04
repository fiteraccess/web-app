/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** rxjs Imports */
import { EMPTY, Subject, merge } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

/** Custom Services */
import { SynapseJobsService } from '../synapse-jobs.service';

/** Custom Components */
import { SynapseRunErrorDialogComponent } from '../error-dialog/synapse-run-error-dialog.component';

/** Custom Models */
import { SynapseJobRun, SynapseRunOutcome, SynapseRunTrigger } from '../synapse-jobs.model';
import {
  LAGOS_TZ,
  SynapseJobsLoadError,
  humanDuration,
  loadErrorOf,
  triggerLabel,
  truncate
} from '../synapse-jobs-presentation';

/**
 * Run history of one Synapse job, newest first, paged on the server.
 */
@Component({
  selector: 'mifosx-synapse-job-history',
  templateUrl: './synapse-job-history.component.html',
  styleUrls: ['./synapse-job-history.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatPaginator,
    MatProgressBar,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
    MatTooltip
  ]
})
export class SynapseJobHistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private synapseJobsService = inject(SynapseJobsService);
  private destroyRef = inject(DestroyRef);

  readonly lagos = LAGOS_TZ;
  readonly pageSizeOptions = [
    25,
    50,
    100,
    200
  ];
  readonly displayedColumns = [
    'startedAt',
    'endedAt',
    'nodeId',
    'outcome',
    'trigger',
    'ticks',
    'processed',
    'busyMs',
    'note',
    'error'
  ];

  readonly name: string = this.route.snapshot.paramMap.get('name');
  readonly outcome = new FormControl<SynapseRunOutcome | null>(null);
  readonly node = new FormControl<string | null>(null);

  /** Nodes that have reported this job, offered by the node filter. */
  nodeIds: string[] = [];
  runs: SynapseJobRun[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 50;
  loading = false;
  loadError: SynapseJobsLoadError | null = null;

  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    this.reload$
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.synapseJobsService
            .getRuns(this.name, {
              offset: this.pageIndex * this.pageSize,
              limit: this.pageSize,
              outcome: this.outcome.value,
              node: this.node.value
            })
            .pipe(
              catchError((error: unknown) => {
                this.loading = false;
                this.loadError = loadErrorOf(error);
                return EMPTY;
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((page) => {
        this.loading = false;
        this.loadError = null;
        this.runs = page.pageItems;
        this.total = page.totalFilteredRecords;
      });

    merge(this.outcome.valueChanges, this.node.valueChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex = 0;
        this.reload();
      });

    this.synapseJobsService
      .getJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const job = response.jobs.find((candidate) => candidate.name === this.name);
          this.nodeIds = (job?.nodes ?? []).map((node) => node.nodeId);
        },
        error: () => (this.nodeIds = [])
      });

    this.reload();
  }

  reload(): void {
    this.reload$.next();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.reload();
  }

  openError(run: SynapseJobRun): void {
    this.dialog.open(SynapseRunErrorDialogComponent, { data: run, width: '60rem', maxWidth: '95vw' });
  }

  busy(ms: number): string {
    return humanDuration(ms);
  }

  triggerLabel(trigger: SynapseRunTrigger): string {
    return triggerLabel(trigger);
  }

  truncate(text: string | null): string {
    return truncate(text);
  }
}
