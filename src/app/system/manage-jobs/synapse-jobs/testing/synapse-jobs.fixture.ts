/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  SynapseJobControl,
  SynapseJobLimits,
  SynapseJobNode,
  SynapseJobRun,
  SynapseJobRunsPage,
  SynapseJobs
} from '../synapse-jobs.model';

export const LIMITS: SynapseJobLimits = {
  minIntervalMs: 1000,
  maxIntervalMs: 86_400_000,
  maxTimesOfDay: 12,
  minTimesGapMs: 900_000
};

/** An interval job nobody has touched, at its default. */
export function controlFixture(overrides: Partial<SynapseJobControl> = {}): SynapseJobControl {
  return {
    paused: false,
    idleIntervalMs: 5000,
    defaultIdleIntervalMs: 5000,
    timesOfDay: null,
    defaultTimesOfDay: null,
    heldToday: [],
    version: 0,
    updatedBy: null,
    updatedAt: null,
    runRequestedAt: null,
    runRequestedBy: null,
    ...overrides
  };
}

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
    running: false,
    updatedAt: '2026-11-04T10:59:56+01:00',
    ...overrides
  };
}

export function jobsFixture(): SynapseJobs {
  return {
    generatedAt: '2026-11-04T11:00:00+01:00',
    limits: LIMITS,
    jobs: [
      {
        name: 'settlement-collapse',
        displayName: 'Collapse Settlement Batches',
        module: 'access',
        description: 'Collapses accepted pay-window batches into journals',
        schedule: 'Every 5 s when idle',
        cadence: 'INTERVAL',
        control: controlFixture(),
        status: 'OK',
        active: true,
        running: true,
        nextRunAt: '2026-11-04T11:00:01+01:00',
        consecutiveFailures: 0,
        lastRun: runFixture(),
        nodes: [
          nodeFixture({ lastOutcome: 'WORKED', running: true }),
          nodeFixture({ nodeId: 'synapse-7f9c-def', live: false, lastOutcome: 'WORKED' })
        ]
      },
      {
        name: 'flexcube-outbox-drain',
        displayName: 'Deliver FlexCube Credits',
        module: 'access',
        description: 'Delivers pending FlexCube credit instructions',
        schedule: 'Every 1 s when idle',
        cadence: 'INTERVAL',
        control: controlFixture({ idleIntervalMs: 1000, defaultIdleIntervalMs: 1000 }),
        status: 'FAILING',
        active: true,
        running: false,
        nextRunAt: '2026-11-04T11:01:00+01:00',
        consecutiveFailures: 3,
        lastRun: runFixture({
          jobName: 'flexcube-outbox-drain',
          outcome: 'FAILED',
          processed: 0,
          ticks: 3,
          errorMessage: 'Connection refused'
        }),
        nodes: [
          nodeFixture({
            lastOutcome: 'FAILED',
            consecutiveFailures: 3,
            lastError: 'Connection refused: '.padEnd(120, 'x')
          })
        ]
      },
      {
        name: 'inbox-job',
        displayName: 'Deliver Inbox Messages',
        module: 'core',
        description: 'Delivers inbox messages to Fineract',
        schedule: 'Every 1 s when idle',
        cadence: 'INTERVAL',
        control: controlFixture({ idleIntervalMs: 1000, defaultIdleIntervalMs: 1000 }),
        status: 'OVERDUE',
        active: true,
        running: false,
        nextRunAt: null,
        consecutiveFailures: 0,
        lastRun: null,
        nodes: [nodeFixture({ overdue: true })]
      },
      {
        name: 'settlement-eoc',
        displayName: 'Settlement End Of Cycle',
        module: 'access',
        description: 'Captures and posts each end-of-cycle settlement, then sends EOC Complete',
        schedule: '09:00, 15:00 (Africa/Lagos)',
        cadence: 'TIMES_OF_DAY',
        control: controlFixture({
          idleIntervalMs: null,
          defaultIdleIntervalMs: null,
          timesOfDay: [
            '09:00',
            '15:00'
          ],
          defaultTimesOfDay: [
            '08:40',
            '12:00',
            '15:00',
            '18:10'
          ],
          version: 2,
          updatedBy: 'mifos',
          updatedAt: '2026-11-04T08:00:00+01:00'
        }),
        status: 'NOT_RUNNING',
        active: false,
        running: false,
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
