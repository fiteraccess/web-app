/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';

import { SynapseJobStatus, SynapseNodeOutcome, SynapseRunTrigger } from './synapse-jobs.model';

/** Synapse instants are shown in Lagos time (no daylight saving, so a fixed offset is exact). */
export { LAGOS_TZ } from 'app/settlement/operations-health/ops-health-presentation';

/** Why a read failed, in the words the console shows. */
export type SynapseJobsLoadError = 'FORBIDDEN' | 'FAILED';

export function loadErrorOf(error: unknown): SynapseJobsLoadError {
  return error instanceof HttpErrorResponse && error.status === 403 ? 'FORBIDDEN' : 'FAILED';
}

/** Icon and CSS class of a job status: OK green, FAILING red, OVERDUE amber, NOT_RUNNING and PAUSED grey. */
export const STATUS_ICONS: Record<SynapseJobStatus, string> = {
  OK: 'check-circle',
  FAILING: 'times-circle',
  OVERDUE: 'exclamation-circle',
  NOT_RUNNING: 'minus-circle',
  PAUSED: 'pause'
};

export function statusClass(status: SynapseJobStatus): string {
  return `status-${status.toLowerCase().replace('_', '-')}`;
}

/** Translation key of a job status label. */
export function statusLabel(status: SynapseJobStatus): string {
  const labels: Record<SynapseJobStatus, string> = {
    OK: 'OK',
    FAILING: 'Failing',
    OVERDUE: 'Overdue',
    NOT_RUNNING: 'Not running',
    PAUSED: 'Paused'
  };
  return `labels.text.${labels[status]}`;
}

/** Translation key of a node or run outcome; an IDLE run is a Run now that found nothing to do. */
export function outcomeLabel(outcome: SynapseNodeOutcome): string {
  const labels: Record<SynapseNodeOutcome, string> = { IDLE: 'Idle', WORKED: 'Worked', FAILED: 'Failed' };
  return `labels.text.${labels[outcome]}`;
}

/** Translation key of what started a run. */
export function triggerLabel(trigger: SynapseRunTrigger): string {
  return trigger === 'MANUAL' ? 'labels.text.Manual' : 'labels.text.Scheduled';
}

/** Busy time in the largest unit that keeps it readable: `850 ms`, `1.2 s`, `3 min 5 s`, `2 h 4 min`. */
export function humanDuration(ms: number | null | undefined): string {
  if (ms == null) {
    return '';
  }
  if (ms < 1000) {
    return `${ms} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${Number(seconds.toFixed(1))} s`;
  }
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min ${totalSeconds % 60} s`;
  }
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Length of an error shown inline before the rest is left to the tooltip or dialog. */
export const ERROR_PREVIEW_LENGTH = 80;

export function truncate(text: string | null | undefined, length: number = ERROR_PREVIEW_LENGTH): string {
  if (!text) {
    return '';
  }
  return text.length <= length ? text : `${text.slice(0, length)}…`;
}
