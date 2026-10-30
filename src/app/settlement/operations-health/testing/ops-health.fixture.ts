/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Test fixture only: example responses in the shape of the data-only contract. Never imported by production code.

import { Call, CallPayload, EodStep, OpsHealth } from '../ops-health.model';

const PW_ETZ_W2 = 'rejected.6f1c2a9e-0b44-4c1e-9a51-3d2e7f0a1b11';
const PW_ETZ_W3 = 'rejected.0a7d33f2-5b1e-4f0c-8e2d-77c1a9e04b22';
const EOC_1740 = '5e0b8a12-3c4d-4e6f-9a0b-1c2d3e4f5a6b';
const EOC_1500 = '9a1f0c33-7b2e-4d5c-8e6f-0a1b2c3d4e5f';
const EOC_0840_NEXT = 'c4d2e6f8-1a3b-4c5d-9e7f-2b4d6f8a0c1e';
const EOC_BILLS_W1 = 'e7a91b20-4c3d-4f8e-a1b2-3c4d5e6f7a8b';

function call(fields: Partial<Call> & Pick<Call, 'kind' | 'step' | 'direction' | 'ref' | 'reference'>): Call {
  return {
    rail: null,
    switchProvider: null,
    window: null,
    cycleAt: null,
    glCode: null,
    branch: null,
    called: 'YES',
    at: null,
    tries: 1,
    code: '00',
    message: null,
    mark: 'NONE',
    ...fields
  };
}

function eodStep(name: string, order: number, status: string, at: string | null, error: string | null = null): EodStep {
  const mark = status === 'FAILED' ? 'RED' : status === 'PENDING' ? 'AMBER' : 'NONE';
  return { name, order, status, at, error, mark };
}

/** `GET /access/api/v1/ops/health?businessDate=2026-10-23`: the dummy 23 Oct scenario. */
export const OPS_HEALTH_FIXTURE: OpsHealth = {
  businessDate: '2026-10-23',
  defaulted: true,
  today: '2026-10-29',
  fineractBusinessDate: '2026-10-23',
  asOf: '2026-10-29T10:42:07+01:00',
  stale: false,
  steps: [
    {
      id: 'PAY_WINDOW',
      mark: 'RED',
      unchecked: false,
      checkError: null,
      counts: [
        { value: 'SETTLED', count: 2, mark: 'NONE' },
        { value: 'PROCESSING', count: 1, mark: 'AMBER' },
        { value: 'REFUSED', count: 2, mark: 'RED' }
      ]
    },
    {
      id: 'SETTLEMENT',
      mark: 'RED',
      unchecked: false,
      checkError: null,
      counts: [
        { value: 'SETTLED', count: 2, mark: 'NONE' },
        { value: 'PROCESSING', count: 1, mark: 'AMBER' }
      ]
    },
    {
      id: 'END_OF_CYCLE',
      mark: 'RED',
      unchecked: false,
      checkError: null,
      counts: [
        { value: 'COMPLETED', count: 3, mark: 'NONE' },
        { value: 'PENDING', count: 1, mark: 'AMBER' }
      ]
    },
    { id: 'BUSINESS_DATE', mark: 'RED', unchecked: false, checkError: null, counts: [] },
    {
      id: 'END_OF_DAY',
      mark: 'RED',
      unchecked: false,
      checkError: null,
      counts: [
        { value: 'COMPLETED', count: 8, mark: 'NONE' },
        { value: 'SKIPPED', count: 1, mark: 'NONE' },
        { value: 'FAILED', count: 1, mark: 'RED' },
        { value: 'PENDING', count: 1, mark: 'AMBER' }
      ]
    },
    { id: 'RECON', mark: 'NONE', unchecked: false, checkError: null, counts: [] }
  ],
  calls: [
    call({
      kind: 'PAY_WINDOW',
      step: 'PAY_WINDOW',
      direction: 'ACCESS_TO_SYNAPSE',
      ref: PW_ETZ_W2,
      reference: 'ETZ-Outbound-20261023-W2-91c0e7a4',
      rail: 'OUTBOUND',
      switchProvider: 'ETRANZACT',
      window: 2,
      at: '2026-10-23T11:58:03+01:00',
      code: '12',
      message: 'Totals mismatch: declared 4813/61219118.50, received 4812/61204118.50',
      mark: 'RED'
    }),
    call({
      kind: 'PAY_WINDOW',
      step: 'PAY_WINDOW',
      direction: 'ACCESS_TO_SYNAPSE',
      ref: PW_ETZ_W3,
      reference: 'ETZ-Outbound-20261023-W3-0b7d33f2',
      rail: 'OUTBOUND',
      switchProvider: 'ETRANZACT',
      window: 3,
      at: '2026-10-23T14:51:40+01:00',
      code: '12',
      message: 'Totals mismatch: declared 48770420.10, received 48770402.10',
      mark: 'RED'
    }),
    call({
      kind: 'PAY_WINDOW',
      step: 'PAY_WINDOW',
      direction: 'ACCESS_TO_SYNAPSE',
      ref: 'accepted.NIBSS-Inbound-20261023-W9-6a0d2125',
      reference: 'NIBSS-Inbound-20261023-W9-6a0d2125',
      rail: 'INBOUND',
      switchProvider: 'NIBSS',
      window: 9,
      at: '2026-10-23T13:58:12+01:00'
    }),
    call({
      kind: 'SETTLE_COMPLETE',
      step: 'SETTLEMENT',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: 'NIBSS-Inbound-20261023-W9-6a0d2125',
      reference: 'NIBSS-Inbound-20261023-W9-6a0d2125',
      rail: 'INBOUND',
      switchProvider: 'NIBSS',
      window: 9,
      at: '2026-10-23T14:06:31+01:00',
      tries: 10,
      code: null,
      message: 'Retries exhausted: HTTP 0: Read timed out',
      mark: 'RED'
    }),
    call({
      kind: 'SETTLE_COMPLETE',
      step: 'SETTLEMENT',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: 'NIBSS-Inbound-20261023-W8-c1d77e09',
      reference: 'NIBSS-Inbound-20261023-W8-c1d77e09',
      rail: 'INBOUND',
      switchProvider: 'NIBSS',
      window: 8,
      at: '2026-10-23T12:41:05+01:00',
      message: 'Successful'
    }),
    call({
      kind: 'SETTLE_COMPLETE',
      step: 'SETTLEMENT',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: 'NIBSS-Outbound-20261023-W12-3f8e10aa',
      reference: 'NIBSS-Outbound-20261023-W12-3f8e10aa',
      rail: 'OUTBOUND',
      switchProvider: 'NIBSS',
      window: 12,
      called: 'NOT_YET',
      tries: null,
      code: null,
      mark: 'AMBER'
    }),
    call({
      kind: 'EOC_COMPLETE',
      step: 'END_OF_CYCLE',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: EOC_1740,
      reference: 'EOC-20261023-1740',
      rail: 'INBOUND',
      switchProvider: 'NIBSS',
      cycleAt: '2026-10-23T17:40:00+01:00',
      at: '2026-10-23T17:46:02+01:00',
      code: '26',
      message: '11 batch(es) in order, 1 rejected. Nothing in this call was recorded.',
      mark: 'RED'
    }),
    call({
      kind: 'EOC_COMPLETE',
      step: 'END_OF_CYCLE',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: EOC_1500,
      reference: 'EOC-20261023-1500',
      rail: 'OUTBOUND',
      switchProvider: 'NIBSS',
      cycleAt: '2026-10-23T15:00:00+01:00',
      at: '2026-10-23T15:06:44+01:00',
      message: 'Successful'
    }),
    call({
      kind: 'EOC_COMPLETE',
      step: 'END_OF_CYCLE',
      direction: 'SYNAPSE_TO_ACCESS',
      ref: EOC_0840_NEXT,
      reference: 'EOC-20261024-0840',
      rail: 'INBOUND',
      switchProvider: 'NIBSS',
      cycleAt: '2026-10-24T08:40:00+01:00',
      called: 'NOT_YET',
      tries: null,
      code: null,
      mark: 'AMBER'
    }),
    call({
      kind: 'FLEX_BALANCE',
      step: 'END_OF_DAY',
      direction: 'SYNAPSE_TO_EFM',
      ref: '412.7',
      reference: 'GL 250061010 @ 099',
      glCode: '250061010',
      branch: '099',
      at: '2026-10-23T17:42:10+01:00',
      tries: null,
      code: null,
      message: 'Flexcube balance unread: EFM unreachable',
      mark: 'RED'
    }),
    call({
      kind: 'FLEX_BALANCE',
      step: 'END_OF_DAY',
      direction: 'SYNAPSE_TO_EFM',
      ref: '412.3',
      reference: 'GL 140061950 @ 099',
      glCode: '140061950',
      branch: '099',
      at: '2026-10-23T17:42:10+01:00',
      tries: null
    }),
    call({
      kind: 'FLEX_POSTING',
      step: 'END_OF_DAY',
      direction: 'SYNAPSE_TO_EFM',
      ref: 'EOD-20261023-DEPOSIT-1',
      reference: 'EOD-20261023-DEPOSIT-1',
      glCode: '250061010',
      branch: '099',
      at: '2026-10-23T17:20:55+01:00',
      message: 'PUBLISHED'
    })
  ],
  detail: {
    payWindow: {
      batches: [
        {
          batchId: 'NIBSS-Inbound-20261023-W9-6a0d2125',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          window: 9,
          loadedDate: '2026-10-23',
          totalCount: 812,
          totalAmount: 36451251.42,
          code: '00',
          receivedAt: '2026-10-23T13:58:12+01:00',
          mark: 'NONE'
        },
        {
          batchId: 'NIBSS-Inbound-20261023-W8-c1d77e09',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          window: 8,
          loadedDate: '2026-10-23',
          totalCount: 640,
          totalAmount: 28100400.0,
          code: '00',
          receivedAt: '2026-10-23T12:30:40+01:00',
          mark: 'NONE'
        },
        {
          batchId: 'NIBSS-Outbound-20261023-W12-3f8e10aa',
          rail: 'OUTBOUND',
          switchProvider: 'NIBSS',
          window: 12,
          loadedDate: '2026-10-23',
          totalCount: 1204,
          totalAmount: 90233118.75,
          code: '00',
          receivedAt: '2026-10-23T16:10:05+01:00',
          mark: 'NONE'
        }
      ],
      refusals: [
        {
          ref: PW_ETZ_W2,
          batchId: 'ETZ-Outbound-20261023-W2-91c0e7a4',
          rail: 'OUTBOUND',
          switchProvider: 'ETRANZACT',
          window: 2,
          code: '12',
          reason: 'Totals mismatch: declared 4813/61219118.50, received 4812/61204118.50',
          receivedAt: '2026-10-23T11:58:03+01:00',
          mark: 'RED'
        },
        {
          ref: PW_ETZ_W3,
          batchId: 'ETZ-Outbound-20261023-W3-0b7d33f2',
          rail: 'OUTBOUND',
          switchProvider: 'ETRANZACT',
          window: 3,
          code: '12',
          reason: 'Totals mismatch: declared 48770420.10, received 48770402.10',
          receivedAt: '2026-10-23T14:51:40+01:00',
          mark: 'RED'
        }
      ],
      truncated: false
    },
    settlement: {
      batches: [
        {
          batchId: 'NIBSS-Inbound-20261023-W9-6a0d2125',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          window: 9,
          status: 'SETTLED',
          attempts: 1,
          lastError: null,
          declaredCount: 812,
          declaredAmount: 36451251.42,
          postedCount: 812,
          postedAmount: 36451251.42,
          exceptions: 0,
          settleCompleteStatus: 'FAILED',
          settleCompleteAttempts: 10,
          settleCompleteAt: '2026-10-23T14:06:31+01:00',
          code: null,
          message: 'Retries exhausted: HTTP 0: Read timed out',
          createdAt: '2026-10-23T13:58:12+01:00',
          mark: 'RED',
          call: { kind: 'SETTLE_COMPLETE', ref: 'NIBSS-Inbound-20261023-W9-6a0d2125' }
        },
        {
          batchId: 'NIBSS-Inbound-20261023-W8-c1d77e09',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          window: 8,
          status: 'SETTLED',
          attempts: 1,
          lastError: null,
          declaredCount: 640,
          declaredAmount: 28100400.0,
          postedCount: 640,
          postedAmount: 28100400.0,
          exceptions: 0,
          settleCompleteStatus: 'COMPLETED',
          settleCompleteAttempts: 1,
          settleCompleteAt: '2026-10-23T12:41:05+01:00',
          code: '00',
          message: 'Successful',
          createdAt: '2026-10-23T12:30:40+01:00',
          mark: 'NONE',
          call: { kind: 'SETTLE_COMPLETE', ref: 'NIBSS-Inbound-20261023-W8-c1d77e09' }
        },
        {
          batchId: 'NIBSS-Outbound-20261023-W12-3f8e10aa',
          rail: 'OUTBOUND',
          switchProvider: 'NIBSS',
          window: 12,
          status: 'PROCESSING',
          attempts: 2,
          lastError: 'Fineract 503 on journal post, retrying',
          declaredCount: 1204,
          declaredAmount: 90233118.75,
          postedCount: 600,
          postedAmount: 45001100.0,
          exceptions: 0,
          settleCompleteStatus: null,
          settleCompleteAttempts: null,
          settleCompleteAt: null,
          code: null,
          message: null,
          createdAt: '2026-10-23T16:10:05+01:00',
          mark: 'AMBER',
          call: { kind: 'SETTLE_COMPLETE', ref: 'NIBSS-Outbound-20261023-W12-3f8e10aa' }
        }
      ],
      truncated: false
    },
    endOfCycle: {
      cycles: [
        '08:40',
        '11:40',
        '15:00',
        '17:40'
      ],
      grid: [
        {
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          cells: [
            { cycle: '08:40', eocId: null, status: 'NO_RUN', amount: null, mark: 'RED', call: null },
            { cycle: '11:40', eocId: null, status: null, amount: null, mark: 'NONE', call: null },
            { cycle: '15:00', eocId: null, status: null, amount: null, mark: 'NONE', call: null },
            {
              cycle: '17:40',
              eocId: 'EOC-20261023-1740',
              status: 'COMPLETED',
              amount: 401702118.66,
              mark: 'RED',
              call: { kind: 'EOC_COMPLETE', ref: EOC_1740 }
            }
          ]
        },
        {
          rail: 'OUTBOUND',
          switchProvider: 'NIBSS',
          cells: [
            { cycle: '08:40', eocId: null, status: null, amount: null, mark: 'NONE', call: null },
            { cycle: '11:40', eocId: null, status: null, amount: null, mark: 'NONE', call: null },
            {
              cycle: '15:00',
              eocId: 'EOC-20261023-1500',
              status: 'COMPLETED',
              amount: 120440009.1,
              mark: 'NONE',
              call: { kind: 'EOC_COMPLETE', ref: EOC_1500 }
            },
            { cycle: '17:40', eocId: null, status: null, amount: null, mark: 'NONE', call: null }
          ]
        }
      ],
      runs: [
        {
          runId: EOC_1740,
          eocId: 'EOC-20261023-1740',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          cycleAt: '2026-10-23T17:40:00+01:00',
          cycleDate: '2026-10-23',
          status: 'COMPLETED',
          amount: 401702118.66,
          notifyAttempts: 1,
          notifiedAt: '2026-10-23T17:46:02+01:00',
          code: '26',
          message: '11 batch(es) in order, 1 rejected. Nothing in this call was recorded.',
          lastError: null,
          mark: 'RED',
          call: { kind: 'EOC_COMPLETE', ref: EOC_1740 }
        },
        {
          runId: EOC_1500,
          eocId: 'EOC-20261023-1500',
          rail: 'OUTBOUND',
          switchProvider: 'NIBSS',
          cycleAt: '2026-10-23T15:00:00+01:00',
          cycleDate: '2026-10-23',
          status: 'COMPLETED',
          amount: 120440009.1,
          notifyAttempts: 1,
          notifiedAt: '2026-10-23T15:06:44+01:00',
          code: '00',
          message: 'Successful',
          lastError: null,
          mark: 'NONE',
          call: { kind: 'EOC_COMPLETE', ref: EOC_1500 }
        },
        {
          runId: EOC_0840_NEXT,
          eocId: 'EOC-20261024-0840',
          rail: 'INBOUND',
          switchProvider: 'NIBSS',
          cycleAt: '2026-10-24T08:40:00+01:00',
          cycleDate: '2026-10-24',
          status: 'PENDING',
          amount: 18220400.0,
          notifyAttempts: null,
          notifiedAt: null,
          code: null,
          message: null,
          lastError: null,
          mark: 'AMBER',
          call: { kind: 'EOC_COMPLETE', ref: EOC_0840_NEXT }
        },
        {
          runId: EOC_BILLS_W1,
          eocId: 'BILLS-EOC-20261023-W1',
          rail: 'BILLS',
          switchProvider: 'INTERSWITCH',
          cycleAt: '2026-10-23T12:00:00+01:00',
          cycleDate: '2026-10-23',
          status: 'COMPLETED',
          amount: 5120000.0,
          notifyAttempts: 1,
          notifiedAt: '2026-10-23T12:03:10+01:00',
          code: '00',
          message: 'Successful',
          lastError: null,
          mark: 'NONE',
          call: null
        }
      ],
      truncated: false
    },
    businessDate: { fineractDate: '2026-10-23', today: '2026-10-29', daysBehind: 6, mark: 'RED' },
    endOfDay: {
      run: {
        status: 'FAILED',
        startedAt: '2026-10-23T17:15:00+01:00',
        completedAt: null,
        attempts: 3,
        lastError: 'EOD_ZERO_BALANCE: 250061010@099 flexcube balance unread',
        mark: 'RED'
      },
      steps: [
        eodStep('EOD_ROLLOVER', 0, 'COMPLETED', '2026-10-23T17:15:02+01:00'),
        eodStep('EOD_REPLAY_DRAIN', 1, 'COMPLETED', '2026-10-23T17:16:40+01:00'),
        eodStep('EOD_ACCRUAL', 2, 'COMPLETED', '2026-10-23T17:18:11+01:00'),
        eodStep('EOD_INTEREST_POSTING', 3, 'SKIPPED', '2026-10-23T17:18:12+01:00'),
        eodStep('EOD_BILLS_GATE', 4, 'COMPLETED', '2026-10-23T17:18:15+01:00'),
        eodStep('EOD_MIRROR_DEPOSIT', 5, 'COMPLETED', '2026-10-23T17:20:55+01:00'),
        eodStep('EOD_MIRROR_INCOME', 6, 'COMPLETED', '2026-10-23T17:21:30+01:00'),
        eodStep('EOD_MIRROR_TAX', 7, 'COMPLETED', '2026-10-23T17:22:04+01:00'),
        eodStep('EOD_MIRROR_INTEREST', 8, 'COMPLETED', '2026-10-23T17:22:40+01:00'),
        eodStep('EOD_ZERO_BALANCE', 9, 'FAILED', '2026-10-23T17:42:10+01:00', '250061010@099 flexcube balance unread'),
        eodStep('EOD_COMPLETION', 10, 'PENDING', null)
      ],
      replay: {
        inFlight: 0,
        pendingTx: 0,
        postedToTbOnly: 0,
        inboxPending: 0,
        inboxRetrying: 0,
        failedNewCount: 0,
        failedLegacyCount: 3,
        drained: true,
        mark: 'NONE'
      },
      mirrorLegs: [
        {
          reference: 'EOD-20261023-DEPOSIT-1',
          glCode: '250061010',
          branch: '099',
          amount: 184220917.33,
          flexStatus: 'SENT',
          outboxStatus: 'SENT',
          attempts: 1,
          code: '00',
          message: 'PUBLISHED',
          mark: 'NONE',
          call: { kind: 'FLEX_POSTING', ref: 'EOD-20261023-DEPOSIT-1' }
        }
      ],
      checks: [
        {
          glCode: '250061010',
          branch: '099',
          side: 'FLEXCUBE',
          expected: 0,
          fineractBalance: 0,
          flexcubeBalance: null,
          result: 'UNVERIFIED',
          note: 'Flexcube balance unread: EFM unreachable',
          mark: 'RED',
          call: { kind: 'FLEX_BALANCE', ref: '412.7' }
        },
        {
          glCode: '140061950',
          branch: null,
          side: 'FINERACT',
          expected: 0,
          fineractBalance: 0,
          flexcubeBalance: 0,
          result: 'CLEAR',
          note: null,
          mark: 'NONE',
          call: { kind: 'FLEX_BALANCE', ref: '412.3' }
        }
      ],
      truncated: false
    },
    recon: {
      lastSweepAt: '2026-10-29T10:41:02+01:00',
      lastCheckedAt: '2026-10-29T10:41:02+01:00',
      intervalSeconds: 60,
      mark: 'NONE'
    }
  },
  attention: [
    {
      step: 'END_OF_CYCLE',
      reference: 'EOC-20261023-1740 INBOUND NIBSS',
      status: 'COMPLETED',
      code: '26',
      message: '11 batch(es) in order, 1 rejected. Nothing in this call was recorded.',
      at: '2026-10-23T17:46:02+01:00',
      mark: 'RED',
      unrecognised: false,
      link: { rowKey: EOC_1740, call: { kind: 'EOC_COMPLETE', ref: EOC_1740 } },
      refersTo: [{ batchId: 'NIBSS-Inbound-20261015-W4-1b2c3d4e', businessDate: '2026-10-15', status: 'SETTLED' }]
    },
    {
      step: 'END_OF_DAY',
      reference: 'EOD_ZERO_BALANCE',
      status: 'FAILED',
      code: null,
      message: '250061010@099 flexcube balance unread',
      at: '2026-10-23T17:42:10+01:00',
      mark: 'RED',
      unrecognised: false,
      link: { rowKey: 'EOD_ZERO_BALANCE', call: null },
      refersTo: []
    },
    {
      step: 'SETTLEMENT',
      reference: 'NIBSS-Inbound-20261023-W9-6a0d2125',
      status: 'FAILED',
      code: null,
      message: 'Retries exhausted: HTTP 0: Read timed out',
      at: '2026-10-23T14:06:31+01:00',
      mark: 'RED',
      unrecognised: false,
      link: { rowKey: 'NIBSS-Inbound-20261023-W9-6a0d2125', call: null },
      refersTo: []
    },
    {
      step: 'BUSINESS_DATE',
      reference: '2026-10-23',
      status: null,
      code: null,
      message: 'daysBehind=6',
      at: null,
      mark: 'RED',
      unrecognised: false,
      link: { rowKey: 'business-date', call: null },
      refersTo: []
    }
  ],
  attentionTruncated: false
};

export const PAY_WINDOW_REFUSED_PAYLOAD: CallPayload = {
  kind: 'PAY_WINDOW',
  ref: 'rejected.6f1c2a9e-0b44-4c1e-9a51-3d2e7f0a1b11',
  reference: 'ETZ-Outbound-20261023-W2-91c0e7a4',
  what: 'Outbound · Etranzact · window 2',
  direction: 'ACCESS_TO_SYNAPSE',
  at: '2026-10-23T11:58:03+01:00',
  tries: 1,
  request: {
    format: 'FORM',
    rebuilt: true,
    truncated: false,
    totalLines: 8,
    text: 'batchId:        ETZ-Outbound-20261023-W2-91c0e7a4\nswitchProvider: Etranzact\nrail:           OUTBOUND\nwindow:         2\nloadedDate:     2026-10-23\ntotalCount:     4813\ntotalAmount:    61219118.50\nfile:           (name not stored) 4812 rows'
  },
  reply: {
    httpStatus: 400,
    answerCode: '12',
    answer: 'REFUSED',
    ok: false,
    format: 'JSON',
    rebuilt: true,
    truncated: false,
    totalLines: 7,
    text: '{\n  "responseCode": "12",\n  "responseMessage": "Totals mismatch: declared 4813/61219118.50, received 4812/61204118.50",\n  "batchId": "ETZ-Outbound-20261023-W2-91c0e7a4",\n  "receivedCount": 4812,\n  "receivedAmount": 61204118.50\n}'
  },
  missingNote: null
};

export const SETTLE_COMPLETE_PAYLOAD: CallPayload = {
  kind: 'SETTLE_COMPLETE',
  ref: 'NIBSS-Inbound-20261023-W9-6a0d2125',
  reference: 'NIBSS-Inbound-20261023-W9-6a0d2125',
  what: 'Inbound · NIBSS · window 9',
  direction: 'SYNAPSE_TO_ACCESS',
  at: '2026-10-23T14:06:31+01:00',
  tries: 10,
  request: {
    format: 'JSON',
    rebuilt: false,
    truncated: false,
    totalLines: 1,
    text: '{"settleBatchId":"NIBSS-Inbound-20261023-W9-6a0d2125","movedCount":812,"movedAmount":36451251.42,"exceptionCount":0,"exceptions":[]}'
  },
  reply: {
    httpStatus: null,
    answerCode: null,
    answer: 'NO_ANSWER',
    ok: false,
    format: 'TEXT',
    rebuilt: false,
    truncated: false,
    totalLines: 1,
    text: 'Retries exhausted: HTTP 0: Read timed out'
  },
  missingNote: null
};

export const EOC_COMPLETE_PAYLOAD: CallPayload = {
  kind: 'EOC_COMPLETE',
  ref: '5e0b8a12-3c4d-4e6f-9a0b-1c2d3e4f5a6b',
  reference: 'EOC-20261023-1740',
  what: 'Inbound · NIBSS · 17:40 cycle',
  direction: 'SYNAPSE_TO_ACCESS',
  at: '2026-10-23T17:46:02+01:00',
  tries: 1,
  request: {
    format: 'JSON',
    rebuilt: false,
    truncated: false,
    totalLines: 1,
    text: '{"eocId":"EOC-20261023-1740","switchProvider":"NIBSS","rail":"Inbound","totalCount":9874,"totalAmount":401702118.66,"settleBatchIds":["NIBSS-Inbound-20261023-W9-6a0d2125","NIBSS-Inbound-20261023-W10-650f6121","NIBSS-Inbound-20261023-W11-5b944681"]}'
  },
  reply: {
    httpStatus: 200,
    answerCode: '26',
    answer: 'REFUSED',
    ok: false,
    format: 'JSON',
    rebuilt: false,
    truncated: false,
    totalLines: 1,
    text: '{"responseCode":"26","responseMessage":"11 batch(es) in order, 1 rejected. Nothing in this call was recorded.","rejected":[{"settleBatchId":"NIBSS-Inbound-20261023-W9-6a0d2125","reason":"listed a batch we never sent"}]}'
  },
  missingNote: null
};

export const FLEX_POSTING_PAYLOAD: CallPayload = {
  kind: 'FLEX_POSTING',
  ref: 'EOD-20261023-DEPOSIT-1',
  reference: 'EOD-20261023-DEPOSIT-1',
  what: 'Posting · Deposit mirror',
  direction: 'SYNAPSE_TO_EFM',
  at: '2026-10-23T17:20:55+01:00',
  tries: 1,
  request: {
    format: 'JSON',
    rebuilt: false,
    truncated: false,
    totalLines: 1,
    text: '{"msg_id":"EOD-20261023-DEPOSIT-1","dr_account":"250061010","cr_account":"220010455","branch_code":"099","amount":"184220917.33","narration":"EOD 23-OCT-2026 DEPOSIT MIRROR"}'
  },
  reply: {
    httpStatus: null,
    answerCode: '00',
    answer: 'RECORDED',
    ok: true,
    format: 'JSON',
    rebuilt: true,
    truncated: false,
    totalLines: 1,
    text: '{"status":"PUBLISHED","flex_reply_code":"00","flex_transaction_reference":"FT2629601234","error_message":null}'
  },
  missingNote: null
};

export const FLEX_BALANCE_PAYLOAD: CallPayload = {
  kind: 'FLEX_BALANCE',
  ref: '412.7',
  reference: 'GL 250061010 @ 099',
  what: 'Balance read · Deposit bridge',
  direction: 'SYNAPSE_TO_EFM',
  at: '2026-10-23T17:42:10+01:00',
  tries: null,
  request: {
    format: 'JSON',
    rebuilt: true,
    truncated: false,
    totalLines: 1,
    text: '{"channel_code":"SYNAPSE","gl_account":"250061010","branch_code":"099"}'
  },
  reply: {
    httpStatus: null,
    answerCode: null,
    answer: 'NO_ANSWER',
    ok: false,
    format: 'JSON',
    rebuilt: true,
    truncated: false,
    totalLines: 1,
    text: '{"result":"UNVERIFIED","expected":0.00,"actual":null,"note":"Flexcube balance unread: EFM unreachable"}'
  },
  missingNote: null
};

export const PAYLOAD_FIXTURES: CallPayload[] = [
  PAY_WINDOW_REFUSED_PAYLOAD,
  SETTLE_COMPLETE_PAYLOAD,
  EOC_COMPLETE_PAYLOAD,
  FLEX_POSTING_PAYLOAD,
  FLEX_BALANCE_PAYLOAD
];

/** A fresh deep copy, so a test can change it without leaking into the next one. */
export function healthFixture(): OpsHealth {
  return JSON.parse(JSON.stringify(OPS_HEALTH_FIXTURE));
}
