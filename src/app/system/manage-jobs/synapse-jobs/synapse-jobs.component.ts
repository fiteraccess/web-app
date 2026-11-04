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
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
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
import { YesnoPipe } from 'app/pipes/yesno.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Services */
import { SynapseJobsService } from './synapse-jobs.service';

/** Custom Components */
import { SynapseRunErrorDialogComponent } from './error-dialog/synapse-run-error-dialog.component';

/** Custom Models */
import { SynapseJob, SynapseJobs } from './synapse-jobs.model';
import { LAGOS_TZ, SynapseJobsLoadError, loadErrorOf } from './synapse-jobs-presentation';

/**
 * Synapse Jobs tab of Manage Jobs, laid out like the Scheduler Jobs tab. A job's own page holds its details.
 */
@Component({
  selector: 'mifosx-synapse-jobs',
  templateUrl: './synapse-jobs.component.html',
  styleUrls: ['./synapse-jobs.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatIconButton,
    MatPaginator,
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
    MatTooltip,
    YesnoPipe
  ]
})
export class SynapseJobsComponent implements OnInit {
  private synapseJobsService = inject(SynapseJobsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly lagos = LAGOS_TZ;
  readonly displayedColumns = [
    'displayName',
    'active',
    'previousRunTime',
    'nextRunTime',
    'currentlyRunning',
    'errorLog'
  ];

  dataSource = new MatTableDataSource<SynapseJob>([]);
  generatedAt: string | null = null;
  loading = false;
  loadError: SynapseJobsLoadError | null = null;

  @ViewChild(MatSort) set sort(sort: MatSort) {
    this.dataSource.sort = sort;
  }

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }

  constructor() {
    this.dataSource.sortingDataAccessor = (job, column) => {
      switch (column) {
        case 'active':
          return job.active ? 1 : 0;
        case 'previousRunTime':
          return job.lastRun?.startedAt ?? '';
        case 'nextRunTime':
          return job.nextRunAt ?? '';
        case 'currentlyRunning':
          return job.running ? 1 : 0;
        default:
          return job.displayName.toLowerCase();
      }
    };
    this.dataSource.filterPredicate = (job, filter) =>
      job.displayName.toLowerCase().includes(filter) || job.name.includes(filter);
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
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError = loadErrorOf(error);
        }
      });
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  /** As in Scheduler Jobs: the newest run failed, so its error can be read. */
  jobWithError(job: SynapseJob): boolean {
    return job.lastRun?.outcome === 'FAILED';
  }

  /** Failing and overdue jobs stand out, as Fineract jobs with errors do. */
  needsAttention(job: SynapseJob): boolean {
    return this.jobWithError(job) || job.status === 'FAILING' || job.status === 'OVERDUE';
  }

  showErrorLog(job: SynapseJob): void {
    this.dialog.open(SynapseRunErrorDialogComponent, { data: job.lastRun, width: '60rem', maxWidth: '95vw' });
  }
}
