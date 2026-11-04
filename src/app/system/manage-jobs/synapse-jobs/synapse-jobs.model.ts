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

export type SynapseJobStatus = 'OK' | 'FAILING' | 'OVERDUE' | 'NOT_RUNNING';
export type SynapseNodeOutcome = 'IDLE' | 'WORKED' | 'FAILED';
export type SynapseRunOutcome = 'WORKED' | 'FAILED';
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
  updatedAt: string | null;
}

export interface SynapseJob {
  name: string;
  module: string;
  description: string;
  schedule: string;
  status: SynapseJobStatus;
  nextRunAt: string | null;
  consecutiveFailures: number;
  lastRun: SynapseJobRun | null;
  nodes: SynapseJobNode[];
}

export interface SynapseJobs {
  generatedAt: string;
  jobs: SynapseJob[];
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
