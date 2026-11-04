/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBar } from '@angular/material/progress-bar';
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
  MatTable
} from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { YesnoPipe } from 'app/pipes/yesno.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Services */
import { SynapseJobsService } from '../synapse-jobs.service';

/** Custom Models */
import { SynapseJob, SynapseJobStatus, SynapseNodeOutcome } from '../synapse-jobs.model';
import { SynapseJobLookup, lookupOf } from '../synapse-job.resolver';
import {
  LAGOS_TZ,
  STATUS_ICONS,
  SynapseJobsLoadError,
  loadErrorOf,
  outcomeLabel,
  statusClass,
  statusLabel,
  truncate
} from '../synapse-jobs-presentation';

/**
 * One Synapse job, laid out like View Scheduler Job: its details, then how each node runs it.
 */
@Component({
  selector: 'mifosx-synapse-job-view',
  templateUrl: './synapse-job-view.component.html',
  styleUrls: ['./synapse-job-view.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
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
    MatTooltip,
    YesnoPipe
  ]
})
export class SynapseJobViewComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private synapseJobsService = inject(SynapseJobsService);
  private destroyRef = inject(DestroyRef);

  readonly lagos = LAGOS_TZ;
  readonly nodeColumns = [
    'nodeId',
    'state',
    'running',
    'lastTickEndedAt',
    'lastOutcome',
    'nextTickAt',
    'consecutiveFailures',
    'lastError'
  ];

  name: string;
  job: SynapseJob | null = null;
  loadError: SynapseJobsLoadError | null = null;
  loading = false;

  constructor() {
    // The router reuses this page when moving from one job to another, so follow each new lookup.
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const lookup: SynapseJobLookup = data['synapseJob'];
      this.name = lookup.name;
      this.job = lookup.job;
      this.loadError = lookup.loadError;
    });
  }

  refresh(): void {
    this.loading = true;
    this.synapseJobsService
      .getJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.loadError = null;
          this.job = lookupOf(this.name, response.jobs, response.generatedAt).job;
        },
        error: (error: unknown) => {
          this.loading = false;
          this.loadError = loadErrorOf(error);
        }
      });
  }

  back(): void {
    this.router.navigate(['/system/manage-jobs'], { queryParams: { tab: 'synapse' } });
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
