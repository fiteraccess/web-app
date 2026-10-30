/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';

import { Body, Call, CheckResult, Direction, Mark, OpsHealth, ReconBreaks, StepId } from './ops-health.model';

export interface OpsTab {
  path: string;
  /** Null for the Overview tab, which has no step of its own. */
  step: StepId | null;
  label: string;
}

/** The tabs, in the order the money moves through the day. Labels are `labels.text.*` keys. */
export const OPS_TABS: readonly OpsTab[] = [
  { path: 'overview', step: null, label: 'Overview' },
  { path: 'pay-window', step: 'PAY_WINDOW', label: 'Pay window' },
  { path: 'settlement', step: 'SETTLEMENT', label: 'Settlement' },
  { path: 'end-of-cycle', step: 'END_OF_CYCLE', label: 'End of cycle' },
  { path: 'business-date', step: 'BUSINESS_DATE', label: 'Business date' },
  { path: 'end-of-day', step: 'END_OF_DAY', label: 'End of day' },
  { path: 'recon', step: 'RECON', label: 'Recon' }
];

export function tabOf(step: StepId): OpsTab {
  return OPS_TABS.find((tab) => tab.step === step);
}

/** Synapse sends every instant with the Lagos offset; times are shown in Lagos and labelled so. */
export const LAGOS_TZ = '+0100';

/** `yyyy-MM-dd` of a calendar date picked in the browser. */
export function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The calendar date of a `yyyy-MM-dd` string, at local midnight (what the date picker holds). */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Oldest day the server assesses, counted back from today. */
export const MAX_DAYS_BACK = 366;

/** Lines of a body shown before "… n more lines". */
export const BODY_LINE_LIMIT = 200;

/** CSS class carrying a mark's colour; only RED and AMBER are coloured. */
export function markClass(mark: Mark): string {
  return `mark-${(mark ?? 'NONE').toLowerCase()}`;
}

const MARK_ORDER: Record<Mark, number> = { RED: 0, AMBER: 1, NONE: 2 };

const DIRECTION_LABELS: Record<Direction, string> = {
  ACCESS_TO_SYNAPSE: 'Access → Synapse',
  SYNAPSE_TO_ACCESS: 'Synapse → Access',
  SYNAPSE_TO_EFM: 'Synapse → Flexcube'
};

/** `labels.text.*` key of a call direction badge. */
export function directionLabel(direction: Direction): string {
  return DIRECTION_LABELS[direction];
}

const CALL_STEPS: readonly StepId[] = [
  'PAY_WINDOW',
  'SETTLEMENT',
  'END_OF_CYCLE',
  'END_OF_DAY'
];

/** Steps that exchange calls with Access, so have a Calls with Access table. */
export function hasCallsPanel(step: StepId): boolean {
  return CALL_STEPS.includes(step);
}

/** Red first, then amber, then the rest; newest first within a mark. */
export function sortCalls(calls: Call[]): Call[] {
  return [...calls].sort(
    (a, b) =>
      MARK_ORDER[a.mark] - MARK_ORDER[b.mark] || instantMillis(b.at) - instantMillis(a.at) || a.ref.localeCompare(b.ref)
  );
}

export function callsOfStep(health: OpsHealth, step: StepId): Call[] {
  return sortCalls(health.calls.filter((call) => call.step === step));
}

function instantMillis(instant: string | null): number {
  return instant ? Date.parse(instant) : 0;
}

/** A refusal is an answer code other than `00`; an `HTTP …` code or no code at all means no answer came back. */
export function isRefusal(answerCode: string | null | undefined): boolean {
  return !!answerCode && answerCode !== '00' && !answerCode.startsWith('HTTP');
}

/** Row key of a balance check: `<gl> @ <branch> <SIDE>`, or `<gl> <SIDE>` without a branch, unless the row has one. */
export function checkRowKey(check: CheckResult): string {
  if (check.reference) {
    return check.reference;
  }
  return [
    check.glCode,
    check.branch ? `@ ${check.branch}` : null,
    check.side
  ]
    .filter(Boolean)
    .join(' ');
}

/** Row key of a grid cell, the `<rail> <switch> <HH:mm>` reference the server gives a cycle that did not run. */
export function cycleRowKey(rail: string, switchProvider: string, cycle: string): string {
  return `${rail} ${switchProvider} ${cycle}`;
}

export function callKey(kind: string, ref: string): string {
  return `${kind}|${ref}`;
}

/** DOM id of a call's row, so a grid cell can scroll to it. */
export function callRowId(kind: string, ref: string): string {
  return `ops-call-${kind}-${ref}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

/** JSON is pretty-printed so a one-line body reads as a document; anything else is shown as stored. */
export function displayText(body: Body): string {
  if (body.format !== 'JSON') {
    return body.text;
  }
  try {
    return JSON.stringify(JSON.parse(body.text), null, 2);
  } catch {
    return body.text;
  }
}

export interface ShownBody {
  text: string;
  hiddenLines: number;
  /** True when the server cut the body or the pretty-printed text is too long, so Download full is offered. */
  cut: boolean;
}

export function shownBody(body: Body): ShownBody {
  const lines = displayText(body).split('\n');
  const shown = lines.slice(0, BODY_LINE_LIMIT);
  const hiddenLines = Math.max(body.truncated ? body.totalLines - shown.length : 0, lines.length - shown.length);
  return { text: shown.join('\n'), hiddenLines, cut: body.truncated || lines.length > BODY_LINE_LIMIT };
}

export function downloadFileName(reference: string, part: 'request' | 'reply', body: Body): string {
  return `${reference}-${part}.${body.format === 'JSON' ? 'json' : 'txt'}`;
}

const NAIRA = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function naira(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? '—' : `₦${NAIRA.format(amount)}`;
}

/** What went wrong on a call to Synapse, as a `labels.text.*` key or a server sentence. */
export interface OpsError {
  status: number;
  /** `labels.text.*` key, or null when `message` carries the server's own words. */
  key: string | null;
  message: string | null;
}

export function healthError(error: HttpErrorResponse): OpsError {
  const status = error?.status ?? 0;
  switch (status) {
    case 400:
      return {
        status,
        key: error.error?.defaultUserMessage ? null : 'The date is not valid',
        message: error.error?.defaultUserMessage ?? null
      };
    case 403:
      return { status, key: 'You do not have permission to view Operations Health', message: null };
    case 404:
      return { status, key: 'Operations Health is switched off on this server', message: null };
    case 503:
      return { status, key: 'The server is busy', message: null };
    default:
      return { status, key: 'Operations Health could not be loaded', message: null };
  }
}

export function payloadError(error: HttpErrorResponse): OpsError {
  const status = error?.status ?? 0;
  switch (status) {
    case 403:
      return { status, key: 'You do not have access to request and reply bodies', message: null };
    case 404:
      return { status, key: 'This call is no longer available', message: null };
    default:
      return { status, key: 'Request and reply could not be loaded', message: null };
  }
}

/** Check breaks now goes to the reconciliation endpoint, which has its own permission and its own failures. */
export function breaksError(error: HttpErrorResponse): OpsError {
  const status = error?.status ?? 0;
  switch (status) {
    case 403:
      return { status, key: 'You do not have permission to check unmatched items', message: null };
    case 404:
      return { status, key: 'Checking unmatched items is not available on this server', message: null };
    case 503:
      return { status, key: 'The server is busy checking unmatched items', message: null };
    default:
      return { status, key: 'Unmatched items could not be checked', message: null };
  }
}

export interface BreakLine {
  glCode: string;
  mark: Mark;
  /** The stored verdict when it is not OK. */
  integrity: string | null;
  difference: number | null;
  items: number;
  critical: number;
  high: number;
  warn: number;
}

/**
 * One line per GL that is out of balance or has unmatched items: red for a broken balance or any critical/high item,
 * amber for an unverified balance or only low-severity items.
 */
export function breakLines(breaks: ReconBreaks): BreakLine[] {
  const lines = new Map<string, BreakLine>();
  const lineOf = (glCode: string): BreakLine => {
    if (!lines.has(glCode)) {
      lines.set(glCode, {
        glCode,
        mark: 'AMBER',
        integrity: null,
        difference: null,
        items: 0,
        critical: 0,
        high: 0,
        warn: 0
      });
    }
    return lines.get(glCode);
  };
  for (const verdict of breaks.integrity ?? []) {
    if (verdict.integrity !== 'OK') {
      const line = lineOf(verdict.glCode);
      line.integrity = verdict.integrity;
      line.difference = verdict.difference;
    }
  }
  for (const item of breaks.items ?? []) {
    const line = lineOf(item.glCode);
    line.items++;
    if (item.severity === 'CRITICAL') {
      line.critical++;
    } else if (item.severity === 'HIGH') {
      line.high++;
    } else {
      line.warn++;
    }
  }
  return [...lines.values()]
    .map((line) => ({
      ...line,
      mark: (line.integrity === 'BREAK' || line.critical + line.high > 0 ? 'RED' : 'AMBER') as Mark
    }))
    .sort((a, b) => MARK_ORDER[a.mark] - MARK_ORDER[b.mark] || a.glCode.localeCompare(b.glCode));
}
