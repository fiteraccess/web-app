/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Synapse background jobs as the admin jobs endpoints report them. Instants are ISO-8601 strings with an offset,
 * or null when the event has not happened.
 */

export type SynapseJobStatus = 'OK' | 'FAILING' | 'OVERDUE' | 'NOT_RUNNING' | 'PAUSED';
export type SynapseNodeOutcome = 'IDLE' | 'WORKED' | 'FAILED';
/** A scheduled run either worked or failed; an operator's Run now that found nothing to do is IDLE. */
export type SynapseRunOutcome = 'WORKED' | 'FAILED' | 'IDLE';
/** How operators may retime a job: not at all, its idle interval, or the times of day it runs. */
export type SynapseJobCadence = 'FIXED' | 'INTERVAL' | 'TIMES_OF_DAY';
export type SynapseRunTrigger = 'SCHEDULE' | 'MANUAL';

/** One contiguous burst of activity on one node; a FAILED run is a streak of identical failures. */
export interface SynapseJobRun {
  id: number;
  jobName: string;
  nodeId: string;
  outcome: SynapseRunOutcome;
  trigger: SynapseRunTrigger;
  triggeredBy: string | null;
  startedAt: string;
  endedAt: string | null;
  busyMs: number;
  ticks: number;
  processed: number;
  note: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
}

export interface SynapseJobNode {
  nodeId: string;
  live: boolean;
  lastTickStartedAt: string | null;
  lastTickEndedAt: string | null;
  lastOutcome: SynapseNodeOutcome | null;
  lastError: string | null;
  nextTickAt: string | null;
  consecutiveFailures: number;
  overdue: boolean;
  /** Its last tick did work and the next is due before the run would close. */
  running: boolean;
  updatedAt: string | null;
}

/**
 * What operators changed about a job, beside its defaults. `idleIntervalMs` and `timesOfDay` are the values in force,
 * null when they do not apply to the job's cadence; `heldToday` are times added after they had passed today, which
 * first run tomorrow. `version` is what the next edit sends back.
 */
export interface SynapseJobControl {
  paused: boolean;
  idleIntervalMs: number | null;
  defaultIdleIntervalMs: number | null;
  timesOfDay: string[] | null;
  defaultTimesOfDay: string[] | null;
  heldToday: string[];
  version: number;
  updatedBy: string | null;
  updatedAt: string | null;
  runRequestedAt: string | null;
  runRequestedBy: string | null;
}

/** The bounds every schedule edit is checked against. */
export interface SynapseJobLimits {
  minIntervalMs: number;
  maxIntervalMs: number;
  maxTimesOfDay: number;
  minTimesGapMs: number;
}

/** `name` is the stable key the endpoints take; `displayName` is what the console shows. */
export interface SynapseJob {
  name: string;
  displayName: string;
  module: string;
  description: string;
  /** The cadence in force. */
  schedule: string;
  cadence: SynapseJobCadence;
  control: SynapseJobControl;
  status: SynapseJobStatus;
  /** A live node runs the job and it is not paused. */
  active: boolean;
  /** A node is in the middle of a run. */
  running: boolean;
  nextRunAt: string | null;
  consecutiveFailures: number;
  lastRun: SynapseJobRun | null;
  nodes: SynapseJobNode[];
}

export interface SynapseJobs {
  generatedAt: string;
  limits: SynapseJobLimits;
  jobs: SynapseJob[];
}

/** A schedule edit: `idleIntervalMs` for an interval job, `timesOfDay` (HH:mm) for a times-of-day job; null for the default. */
export interface SynapseJobScheduleChange {
  idleIntervalMs?: number | null;
  timesOfDay?: string[] | null;
  version: number;
}

export interface SynapseJobRunsPage {
  totalFilteredRecords: number;
  pageItems: SynapseJobRun[];
}

export interface SynapseJobRunsQuery {
  offset: number;
  limit: number;
  outcome?: SynapseRunOutcome | null;
  node?: string | null;
}
