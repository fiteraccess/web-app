/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { SynapseJobLimits } from './synapse-jobs.model';

/** Why a schedule edit would be refused, as a translation key with its parameters; null when it is fine. */
export interface ScheduleProblem {
  key: string;
  params?: Record<string, unknown>;
}

const LAGOS_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

/** The time of day in Lagos, as `HH:mm`: Synapse reads times of day in its business zone. */
export function lagosTime(now: Date): string {
  return LAGOS_CLOCK.format(now);
}

function minutes(time: string): number {
  const [
    hours,
    mins
  ] = time.split(':').map(Number);
  return hours * 60 + mins;
}

/** The same checks Synapse makes, so the operator hears them before saving. */
export function intervalProblem(seconds: number | null, limits: SynapseJobLimits): ScheduleProblem | null {
  const min = limits.minIntervalMs / 1000;
  const max = limits.maxIntervalMs / 1000;
  if (seconds == null || !Number.isInteger(seconds) || seconds < min || seconds > max) {
    return { key: 'labels.text.Interval must be between', params: { min, max } };
  }
  return null;
}

/** `times` must already be in order; the editor keeps them sorted. */
export function timesProblem(times: string[], limits: SynapseJobLimits): ScheduleProblem | null {
  if (times.length === 0 || times.length > limits.maxTimesOfDay) {
    return { key: 'labels.text.Give between 1 and n times of day', params: { max: limits.maxTimesOfDay } };
  }
  const gap = limits.minTimesGapMs / 60_000;
  for (let i = 1; i < times.length; i++) {
    if (minutes(times[i]) - minutes(times[i - 1]) < gap) {
      return { key: 'labels.text.Times of day must be apart', params: { gap } };
    }
  }
  return null;
}

/**
 * When a time first runs: a time already listed keeps running as before (null); a new one runs today if it is still
 * ahead, else from tomorrow, so an edit never fires a time that has passed.
 */
export function firstRun(time: string, current: readonly string[], now: string): 'TODAY' | 'TOMORROW' | null {
  if (current.includes(time)) {
    return null;
  }
  return minutes(time) > minutes(now) ? 'TODAY' : 'TOMORROW';
}
