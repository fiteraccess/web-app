/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
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
import { TranslateService } from '@ngx-translate/core';
import { YesnoPipe } from 'app/pipes/yesno.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** rxjs Imports */
import { Observable } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { SynapseJobsService } from '../synapse-jobs.service';

/** Custom Components */
import {
  OpsConfirmData,
  OpsConfirmDialogComponent
} from 'app/settlement/operations-health/confirm-dialog/ops-confirm-dialog.component';
import {
  SynapseJobScheduleData,
  SynapseJobScheduleDialogComponent,
  SynapseJobScheduleResult
} from '../schedule-dialog/synapse-job-schedule-dialog.component';

/** Custom Models */
import { SynapseJob, SynapseJobLimits, SynapseJobStatus, SynapseNodeOutcome } from '../synapse-jobs.model';
import { SynapseJobLookup, lookupOf } from '../synapse-job.resolver';
import { SynapseJobAbilities, synapseJobAbilities } from '../synapse-jobs-permissions';
import {
  LAGOS_TZ,
  STATUS_ICONS,
  SynapseJobsLoadError,
  loadErrorOf,
  outcomeLabel,
  statusClass,
  statusLabel,
  humanDuration,
  truncate
} from '../synapse-jobs-presentation';

/** Pausing these jobs holds up work operators should know about; every other job gets the plain prompt. */
const PAUSE_EFFECTS: Record<string, string> = {
  'settlement-eoc': 'labels.text.Pausing settlement-eoc',
  'eod-gl-mirror': 'labels.text.Pausing eod-gl-mirror',
  'inbox-job': 'labels.text.Pausing inbox-job'
};

/**
 * One Synapse job, laid out like View Scheduler Job: its details, then how each node runs it. Operators with the
 * matching permission can run it now, pause or resume it and change its schedule; each asks first.
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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  readonly can: SynapseJobAbilities = synapseJobAbilities(
    inject(AuthenticationService).getCredentials()?.permissions ?? []
  );

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
  limits: SynapseJobLimits | null = null;
  loadError: SynapseJobsLoadError | null = null;
  loading = false;
  /** A control is on its way; the buttons wait for it. */
  acting = false;

  constructor() {
    // The router reuses this page when moving from one job to another, so follow each new lookup.
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const lookup: SynapseJobLookup = data['synapseJob'];
      this.name = lookup.name;
      this.job = lookup.job;
      this.limits = lookup.limits;
      this.loadError = lookup.loadError;
    });
  }

  /** The job takes controls; a fixed job, such as the node heartbeat, does not. */
  controllable(): boolean {
    return this.job?.cadence !== 'FIXED';
  }

  runNow(): void {
    this.confirmThen(
      {
        heading: this.text('labels.heading.Run job now', { job: this.job.displayName }),
        message: this.text('labels.text.Run now prompt')
      },
      () => this.synapseJobsService.runNow(this.name),
      'labels.text.Run now requested'
    );
  }

  togglePause(): void {
    const pausing = !this.job.control.paused;
    const job = this.job.displayName;
    this.confirmThen(
      pausing
        ? {
            heading: this.text('labels.heading.Pause job', { job }),
            message: this.text(PAUSE_EFFECTS[this.name] ?? 'labels.text.Pause prompt')
          }
        : { heading: this.text('labels.heading.Resume job', { job }), message: this.text('labels.text.Resume prompt') },
      () => this.synapseJobsService.setPaused(this.name, pausing, this.job.control.version),
      pausing ? 'labels.text.Job paused' : 'labels.text.Job resumed'
    );
  }

  editSchedule(): void {
    this.dialog
      .open<SynapseJobScheduleDialogComponent, SynapseJobScheduleData, SynapseJobScheduleResult>(
        SynapseJobScheduleDialogComponent,
        { data: { job: this.job, limits: this.limits }, width: '36rem' }
      )
      .afterClosed()
      .pipe(filter((change) => change != null))
      .subscribe((change) =>
        this.act(
          () => this.synapseJobsService.reschedule(this.name, { ...change, version: this.job.control.version }),
          'labels.text.Schedule saved'
        )
      );
  }

  /** The default beside the value in force, when an operator changed it. */
  scheduleDefault(): string | null {
    const control = this.job.control;
    if (this.job.cadence === 'INTERVAL' && control.idleIntervalMs !== control.defaultIdleIntervalMs) {
      return humanDuration(control.defaultIdleIntervalMs);
    }
    if (this.job.cadence === 'TIMES_OF_DAY' && control.timesOfDay?.join() !== control.defaultTimesOfDay?.join()) {
      return control.defaultTimesOfDay.join(', ');
    }
    return null;
  }

  private confirmThen(prompt: OpsConfirmData, send: () => Observable<unknown>, done: string): void {
    this.dialog
      .open<OpsConfirmDialogComponent, OpsConfirmData, boolean>(OpsConfirmDialogComponent, { data: prompt })
      .afterClosed()
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => this.act(send, done));
  }

  private act(send: () => Observable<unknown>, done: string): void {
    this.acting = true;
    send()
      .pipe(
        finalize(() => {
          this.acting = false;
          this.refresh();
        })
      )
      .subscribe({
        next: () => this.tell(this.text(done)),
        error: (error: HttpErrorResponse) =>
          this.tell(error?.error?.defaultUserMessage ?? this.text('labels.text.The action could not be done'))
      });
  }

  private tell(message: string): void {
    this.snackBar.open(message, this.text('labels.buttons.Close'), { duration: 6000 });
  }

  private text(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
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
          const lookup = lookupOf(this.name, response);
          this.job = lookup.job;
          this.limits = lookup.limits;
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
