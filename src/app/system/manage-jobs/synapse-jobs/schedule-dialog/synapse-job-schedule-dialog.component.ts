/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Models */
import { SynapseJob, SynapseJobLimits } from '../synapse-jobs.model';
import { ScheduleProblem, firstRun, intervalProblem, lagosTime, timesProblem } from '../synapse-job-schedule';
import { humanDuration } from '../synapse-jobs-presentation';

export interface SynapseJobScheduleData {
  job: SynapseJob;
  limits: SynapseJobLimits;
  /** The moment the edit is judged against; tests pin it. */
  now?: Date;
}

/** The edit to send; a null value returns the job to its default. Closing without one cancels. */
export interface SynapseJobScheduleResult {
  idleIntervalMs?: number | null;
  timesOfDay?: string[] | null;
}

/**
 * Edits how often an interval job polls when idle, or the times of day a times-of-day job runs. A time added after it
 * has passed today is marked as first running tomorrow, as Synapse will hold it.
 */
@Component({
  selector: 'mifosx-synapse-job-schedule-dialog',
  templateUrl: './synapse-job-schedule-dialog.component.html',
  styleUrls: ['./synapse-job-schedule-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    ReactiveFormsModule,
    FaIconComponent,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
  ]
})
export class SynapseJobScheduleDialogComponent {
  readonly data = inject<SynapseJobScheduleData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<SynapseJobScheduleDialogComponent, SynapseJobScheduleResult>>(MatDialogRef);

  readonly job = this.data.job;
  readonly control = this.job.control;
  readonly byInterval = this.job.cadence === 'INTERVAL';
  readonly now = lagosTime(this.data.now ?? new Date());

  /** Interval jobs: whole seconds. */
  readonly seconds = new FormControl<number | null>(
    this.control.idleIntervalMs == null ? null : this.control.idleIntervalMs / 1000
  );
  readonly defaultInterval = humanDuration(this.control.defaultIdleIntervalMs);

  /** Times-of-day jobs: the list being edited, kept in order. */
  readonly times = signal<string[]>([...(this.control.timesOfDay ?? [])]);
  readonly newTime = new FormControl<string>('');
  readonly defaultTimes = (this.control.defaultTimesOfDay ?? []).join(', ');
  readonly timesError = computed(() => timesProblem(this.times(), this.data.limits));

  intervalError(): ScheduleProblem | null {
    return intervalProblem(this.seconds.value, this.data.limits);
  }

  firstRun(time: string): 'TODAY' | 'TOMORROW' | null {
    return firstRun(time, this.control.timesOfDay ?? [], this.now);
  }

  addTime(): void {
    const time = this.newTime.value?.slice(0, 5);
    if (!time || this.times().includes(time)) {
      return;
    }
    this.times.update((times) => [
        ...times,
        time
      ].sort());
    this.newTime.setValue('');
  }

  removeTime(time: string): void {
    this.times.update((times) => times.filter((candidate) => candidate !== time));
  }

  canSave(): boolean {
    return this.byInterval ? this.intervalError() == null : this.timesError() == null;
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.dialogRef.close(
      this.byInterval ? { idleIntervalMs: this.seconds.value * 1000 } : { timesOfDay: this.times() }
    );
  }

  useDefault(): void {
    this.dialogRef.close(this.byInterval ? { idleIntervalMs: null } : { timesOfDay: null });
  }
}
