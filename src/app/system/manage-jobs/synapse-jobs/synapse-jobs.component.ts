/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Services */
import { SynapseJobsService } from './synapse-jobs.service';

/** Custom Models */
import { SynapseJob, SynapseJobStatus, SynapseJobs, SynapseNodeOutcome } from './synapse-jobs.model';
import {
  LAGOS_TZ,
  STATUS_ICONS,
  SynapseJobsLoadError,
  loadErrorOf,
  outcomeLabel,
  statusClass,
  statusLabel,
  truncate
} from './synapse-jobs-presentation';

/**
 * Synapse Jobs tab of Manage Jobs: every Synapse background job with its per-node state. Read-only.
 */
@Component({
  selector: 'mifosx-synapse-jobs',
  templateUrl: './synapse-jobs.component.html',
  styleUrls: ['./synapse-jobs.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatProgressBar,
    MatTable,
    MatSort,
    MatSortHeader,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatTooltip
  ]
})
export class SynapseJobsComponent implements OnInit {
  private synapseJobsService = inject(SynapseJobsService);
  private destroyRef = inject(DestroyRef);

  readonly lagos = LAGOS_TZ;
  readonly displayedColumns = [
    'name',
    'module',
    'schedule',
    'status',
    'lastRun',
    'nextRunAt',
    'consecutiveFailures',
    'nodes',
    'actions'
  ];
  readonly nodeColumns = [
    'nodeId',
    'state',
    'lastTickEndedAt',
    'lastOutcome',
    'nextTickAt',
    'consecutiveFailures',
    'lastError'
  ];

  dataSource = new MatTableDataSource<SynapseJob>([]);
  generatedAt: string | null = null;
  loading = false;
  loadError: SynapseJobsLoadError | null = null;
  expanded: SynapseJob | null = null;

  @ViewChild(MatSort) set sort(sort: MatSort) {
    this.dataSource.sort = sort;
  }

  constructor() {
    this.dataSource.sortingDataAccessor = (job, column) => {
      switch (column) {
        case 'lastRun':
          return job.lastRun?.startedAt ?? '';
        case 'nodes':
          return job.nodes.length;
        default:
          return (job as unknown as Record<string, string | number>)[column] ?? '';
      }
    };
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.synapseJobsService
      .getJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: SynapseJobs) => {
          this.loading = false;
          this.loadError = null;
          this.generatedAt = response.generatedAt;
          this.dataSource.data = response.jobs;
          this.expanded = response.jobs.find((job) => job.name === this.expanded?.name) ?? null;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError = loadErrorOf(error);
        }
      });
  }

  toggle(job: SynapseJob): void {
    this.expanded = this.expanded === job ? null : job;
  }

  /** Failing and overdue jobs stand out in the table, as Fineract jobs with errors do. */
  needsAttention(job: SynapseJob): boolean {
    return job.status === 'FAILING' || job.status === 'OVERDUE';
  }

  statusIcon(status: SynapseJobStatus): string {
    return STATUS_ICONS[status];
  }

  statusClass(status: SynapseJobStatus): string {
    return statusClass(status);
  }

  statusLabel(status: SynapseJobStatus): string {
    return statusLabel(status);
  }

  outcomeLabel(outcome: SynapseNodeOutcome): string {
    return outcomeLabel(outcome);
  }

  truncate(text: string | null): string {
    return truncate(text);
  }
}
