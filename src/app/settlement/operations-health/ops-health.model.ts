/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Operations Health, as served by Synapse at `/access/api/v1/ops/health`. Dates are `yyyy-MM-dd` strings, instants
 * are ISO-8601 strings with the Lagos offset, amounts are naira numbers. Statuses, codes, messages and errors are the
 * stored values and are shown as they are; `mark` is the only interpretation the server adds.
 */

export const STEP_IDS = [
  'PAY_WINDOW',
  'SETTLEMENT',
  'END_OF_CYCLE',
  'BUSINESS_DATE',
  'END_OF_DAY',
  'RECON'
] as const;
export type StepId = (typeof STEP_IDS)[number];

/** RED: failed, refused or late; AMBER: in progress or a status the server does not recognise; NONE: finished. */
export type Mark = 'RED' | 'AMBER' | 'NONE';
export type CallKind = 'PAY_WINDOW' | 'SETTLE_COMPLETE' | 'EOC_COMPLETE' | 'FLEX_POSTING' | 'FLEX_BALANCE';
export type Direction = 'ACCESS_TO_SYNAPSE' | 'SYNAPSE_TO_ACCESS' | 'SYNAPSE_TO_EFM';
export type Called = 'YES' | 'NOT_YET' | 'NOT_CALLED';
export type Answer = 'RECORDED' | 'REFUSED' | 'NO_ANSWER' | 'NONE';
export type BodyFormat = 'JSON' | 'FORM' | 'TEXT';

export interface OpsHealth {
  businessDate: string;
  defaulted: boolean;
  today: string;
  fineractBusinessDate: string | null;
  asOf: string;
  stale: boolean;
  /** Always the six steps, in {@link STEP_IDS} order. */
  steps: Step[];
  /** Every call of the day, all steps. */
  calls: Call[];
  detail: Detail;
  /** Every RED row of the page, then every row with an unrecognised status; newest first within each; at most 50. */
  attention: AttentionItem[];
  attentionTruncated: boolean;
}

export interface AttentionItem {
  step: StepId;
  /** The row's own reference: batchId, eocId, posting reference, `GL @ branch`, call ref or end-of-day step name. */
  reference: string;
  status: string | null;
  code: string | null;
  message: string | null;
  at: string | null;
  /** RED, or AMBER when the row is listed only because its status is unrecognised. */
  mark: Mark;
  unrecognised: boolean;
  link: AttentionLink;
  /** Only the batch ids Access itself listed in its refusal reply. */
  refersTo: RefersTo[];
}

export interface AttentionLink {
  /** The row's reference on its step tab (`data-row-key`), or null when the tab has no row table for it. */
  rowKey: string | null;
  call: CallLink | null;
}

export interface RefersTo {
  batchId: string;
  /** Null when the batch was not found. */
  businessDate: string | null;
  status: string | null;
}

export interface Step {
  id: StepId;
  mark: Mark;
  unchecked: boolean;
  checkError: string | null;
  /** Stored status to number of the step's main rows; empty for Business date and Recon. */
  counts: StatusCount[];
}

export interface StatusCount {
  value: string;
  count: number;
  mark: Mark;
}

export interface CallLink {
  kind: CallKind;
  ref: string;
}

export interface Call {
  kind: CallKind;
  step: StepId;
  direction: Direction;
  ref: string;
  reference: string;
  rail: string | null;
  switchProvider: string | null;
  window: number | null;
  cycleAt: string | null;
  glCode: string | null;
  branch: string | null;
  called: Called;
  at: string | null;
  tries: number | null;
  /** Access's responseCode, our pay-window code, or the HTTP status when there was no JSON code. */
  code: string | null;
  /** Access's responseMessage as stored, or the stored transport error or reason. */
  message: string | null;
  mark: Mark;
}

export interface Detail {
  payWindow: PayWindowDetail;
  settlement: SettlementDetail;
  endOfCycle: EndOfCycleDetail;
  businessDate: BusinessDateDetail;
  endOfDay: EndOfDayDetail;
  recon: ReconDetail;
}

export interface PayWindowDetail {
  batches: PwBatch[];
  refusals: PwRefusal[];
  truncated: boolean;
}

export interface PwBatch {
  batchId: string;
  rail: string;
  switchProvider: string;
  window: number | null;
  loadedDate: string;
  totalCount: number | null;
  totalAmount: number | null;
  /** Our reply to the accepted file (`00`); intake only, the settlement status is on the settlement row. */
  code: string;
  receivedAt: string;
  mark: Mark;
}

export interface PwRefusal {
  /** The refusal's call ref (`rejected.<id>`), the row's key even when a batch id exists. */
  ref: string;
  batchId: string | null;
  rail: string;
  switchProvider: string;
  window: number | null;
  code: string;
  reason: string;
  receivedAt: string;
  mark: Mark;
}

export interface SettlementDetail {
  batches: SettlementBatch[];
  truncated: boolean;
}

export interface SettlementBatch {
  batchId: string;
  rail: string;
  switchProvider: string;
  window: number | null;
  status: string;
  attempts: number | null;
  lastError: string | null;
  declaredCount: number | null;
  declaredAmount: number | null;
  postedCount: number | null;
  postedAmount: number | null;
  exceptions: number;
  settleCompleteStatus: string | null;
  settleCompleteAttempts: number | null;
  settleCompleteAt: string | null;
  code: string | null;
  message: string | null;
  createdAt: string;
  mark: Mark;
  call: CallLink | null;
}

export interface EndOfCycleDetail {
  /** Scheduled cycles of the day, `HH:mm`. */
  cycles: string[];
  grid: CycleRow[];
  runs: EocRun[];
  truncated: boolean;
}

export interface CycleRow {
  rail: string;
  switchProvider: string;
  cells: CycleCell[];
}

export interface CycleCell {
  cycle: string;
  eocId: string | null;
  /** The run's stored status, `NO_RUN` when a due cycle has no run, null when not due yet. */
  status: string | null;
  amount: number | null;
  mark: Mark;
  call: CallLink | null;
}

export interface EocRun {
  /** The run's own id and its row key; an eocId is shared by every rail and switch of a cycle. */
  runId: string;
  eocId: string;
  rail: string;
  switchProvider: string;
  cycleAt: string;
  cycleDate: string;
  status: string;
  amount: number | null;
  notifyAttempts: number | null;
  notifiedAt: string | null;
  code: string | null;
  message: string | null;
  lastError: string | null;
  mark: Mark;
  call: CallLink | null;
}

export interface BusinessDateDetail {
  fineractDate: string | null;
  today: string;
  daysBehind: number | null;
  mark: Mark;
}

export interface EndOfDayDetail {
  run: EodRun;
  steps: EodStep[];
  replay: Replay;
  mirrorLegs: MirrorLeg[];
  checks: CheckResult[];
  truncated: boolean;
}

export interface EodRun {
  /** Stored status, `NOT_STARTED` when there is no run, `UNCHECKED` when the reporting database could not be read. */
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  attempts: number | null;
  lastError: string | null;
  mark: Mark;
}

export interface EodStep {
  name: string;
  order: number;
  status: string;
  at: string | null;
  error: string | null;
  mark: Mark;
}

export interface Replay {
  inFlight: number;
  pendingTx: number;
  postedToTbOnly: number;
  inboxPending: number;
  inboxRetrying: number;
  failedNewCount: number;
  failedLegacyCount: number;
  drained: boolean;
  mark: Mark;
}

export interface MirrorLeg {
  /** The posting's own reference, e.g. `EOD-20261023-INCOME-2`; the row's key. */
  reference: string;
  glCode: string | null;
  branch: string | null;
  amount: number | null;
  flexStatus: string;
  outboxStatus: string | null;
  attempts: number | null;
  code: string | null;
  message: string | null;
  mark: Mark;
  call: CallLink | null;
}

/** One ledger's stored check; `side` says which balance the row carries. */
export interface CheckResult {
  /** The row's key when the server sends one; otherwise it is built from the GL, branch and side. */
  reference?: string | null;
  glCode: string;
  branch: string | null;
  side: string | null;
  expected: number | null;
  fineractBalance: number | null;
  flexcubeBalance: number | null;
  result: string;
  note: string | null;
  mark: Mark;
  call: CallLink | null;
}

export interface ReconDetail {
  lastSweepAt: string | null;
  lastCheckedAt: string | null;
  intervalSeconds: number;
  mark: Mark;
}

/** Response of `/access/api/v1/ops/health/calls/{kind}/{ref}`. */
export interface CallPayload {
  kind: CallKind;
  ref: string;
  reference: string;
  what: string;
  direction: Direction;
  at: string | null;
  tries: number | null;
  request: Body | null;
  reply: Reply | null;
  missingNote: string | null;
}

export interface Body {
  format: BodyFormat;
  text: string;
  rebuilt: boolean;
  truncated: boolean;
  totalLines: number;
}

export interface Reply extends Body {
  httpStatus: number | null;
  answerCode: string | null;
  answer: Answer;
  ok: boolean;
}

/** Response of the existing `/access/api/v1/settlement/reconciliation/breaks` endpoint. */
export interface ReconBreaks {
  asOf: string;
  total: number;
  truncated: boolean;
  integrity: ReconVerdict[];
  items: ReconItem[];
}

export interface ReconVerdict {
  glCode: string;
  kind: string;
  provider: string;
  integrity: 'OK' | 'BREAK' | 'UNVERIFIED';
  difference: number | null;
  note: string | null;
}

export interface ReconItem {
  glCode: string;
  kind: string;
  rail: string;
  provider: string;
  reference: string;
  legKind: string;
  side: string;
  amount: number;
  status: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARN';
  reason: string;
  postedAt: string;
  ageHours: number;
  batchId: string | null;
}
