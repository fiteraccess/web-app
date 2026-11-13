/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Calendar-date helpers over ISO `yyyy-MM-dd` strings; no time zone ever enters the arithmetic. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function isoOf(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function isoParts(iso: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE.exec(iso ?? '');
  return match ? { year: +match[1], month: +match[2], day: +match[3] } : null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = isoParts(iso);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return isoOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** The same day-of-month `months` later, pulled back to the month's last day when it has no such day. */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = isoParts(iso);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return isoOf(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(iso: string): number {
  const { year, month, day } = isoParts(iso);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** A date picker's local `Date` as the calendar day it shows. */
export function dateToIso(date: Date | null | undefined): string | null {
  return date ? isoOf(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null;
}

export function isoToDate(iso: string | null | undefined): Date | null {
  const parts = isoParts(iso);
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : null;
}

/** Fineract's `[year, month, day]` arrays. */
export function arrayToIso(value: number[] | null | undefined): string | null {
  return value?.length === 3 ? isoOf(value[0], value[1], value[2]) : null;
}

/** `2026-01-31` as `31-01-2026`. */
export function formatDmy(iso: string | null | undefined): string {
  const parts = isoParts(iso);
  return parts ? `${pad(parts.day)}-${pad(parts.month)}-${pad(parts.year, 4)}` : '';
}
