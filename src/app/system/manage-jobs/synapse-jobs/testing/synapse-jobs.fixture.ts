/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { SynapseJobNode, SynapseJobRun, SynapseJobRunsPage, SynapseJobs } from '../synapse-jobs.model';

export function runFixture(overrides: Partial<SynapseJobRun> = {}): SynapseJobRun {
  return {
    id: 123,
    jobName: 'settlement-collapse',
    nodeId: 'synapse-7f9c-abc',
    outcome: 'WORKED',
    trigger: 'SCHEDULE',
    triggeredBy: null,
    startedAt: '2026-11-04T10:58:00+01:00',
    endedAt: '2026-11-04T10:59:30+01:00',
    busyMs: 1200,
    ticks: 4,
    processed: 37,
    note: null,
    errorMessage: null,
    errorDetail: null,
    ...overrides
  };
}

export function nodeFixture(overrides: Partial<SynapseJobNode> = {}): SynapseJobNode {
  return {
    nodeId: 'synapse-7f9c-abc',
    live: true,
    lastTickStartedAt: '2026-11-04T10:59:55+01:00',
    lastTickEndedAt: '2026-11-04T10:59:56+01:00',
    lastOutcome: 'IDLE',
    lastError: null,
    nextTickAt: '2026-11-04T11:00:01+01:00',
    consecutiveFailures: 0,
    overdue: false,
    updatedAt: '2026-11-04T10:59:56+01:00',
    ...overrides
  };
}

export function jobsFixture(): SynapseJobs {
  return {
    generatedAt: '2026-11-04T11:00:00+01:00',
    jobs: [
      {
        name: 'settlement-collapse',
        module: 'access',
        description: 'Collapses accepted pay-window batches into journals',
        schedule: 'Every 5 s when idle',
        status: 'OK',
        nextRunAt: '2026-11-04T11:00:01+01:00',
        consecutiveFailures: 0,
        lastRun: runFixture(),
        nodes: [
          nodeFixture(),
          nodeFixture({ nodeId: 'synapse-7f9c-def', live: false, lastOutcome: 'WORKED' })
        ]
      },
      {
        name: 'eod-orchestrator',
        module: 'access',
        description: 'Runs end of day',
        schedule: 'Every 1 min',
        status: 'FAILING',
        nextRunAt: '2026-11-04T11:01:00+01:00',
        consecutiveFailures: 3,
        lastRun: runFixture({
          jobName: 'eod-orchestrator',
          outcome: 'FAILED',
          processed: 0,
          ticks: 3,
          errorMessage: 'Fineract refused the close'
        }),
        nodes: [
          nodeFixture({
            lastOutcome: 'FAILED',
            consecutiveFailures: 3,
            lastError: 'Fineract refused the close: '.padEnd(120, 'x')
          })
        ]
      },
      {
        name: 'cdc-relay',
        module: 'cdc',
        description: 'Relays change events',
        schedule: 'Every 10 s',
        status: 'OVERDUE',
        nextRunAt: null,
        consecutiveFailures: 0,
        lastRun: null,
        nodes: [nodeFixture({ overdue: true })]
      },
      {
        name: 'autosave-sweep',
        module: 'access',
        description: 'Sweeps AutoSave balances',
        schedule: 'Daily 02:00',
        status: 'NOT_RUNNING',
        nextRunAt: null,
        consecutiveFailures: 0,
        lastRun: null,
        nodes: []
      }
    ]
  };
}

export function runsPageFixture(total = 120): SynapseJobRunsPage {
  return {
    totalFilteredRecords: total,
    pageItems: [
      runFixture(),
      runFixture({
        id: 122,
        outcome: 'FAILED',
        trigger: 'MANUAL',
        triggeredBy: 'mifos',
        busyMs: 95000,
        ticks: 2,
        processed: 0,
        errorMessage: 'Connection refused: '.padEnd(120, 'y'),
        errorDetail: 'java.net.ConnectException: Connection refused\n\tat Foo.bar(Foo.java:1)'
      })
    ]
  };
}
