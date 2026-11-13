/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { addDays, arrayToIso, daysInMonth, isoOf, weekdayOf } from '../financial-years/iso-date';

/** Fineract's ACTIVE holiday status; only active holidays move the business date. */
export const HOLIDAY_ACTIVE_STATUS = 300;

/** The holiday name column is 100 characters; the screen appends ` yyyy-MM-dd`. */
export const HOLIDAY_NAME_MAX_LENGTH = 100 - ' yyyy-MM-dd'.length;

export interface FineractHoliday {
  id: number;
  name: string;
  description?: string;
  fromDate: number[];
  toDate: number[];
  status: { id: number };
}

export interface CalendarHoliday {
  id: number;
  name: string;
  description: string | null;
  fromDate: string;
  toDate: string;
}

export interface HeadOffice {
  id: number;
  name: string;
  externalId: string | null;
}

/** `processed` days are on or before the business date: the server refuses any change to them. */
export type DayState = 'free' | 'holiday' | 'processed' | 'processed-holiday';

export interface CalendarDay {
  iso: string;
  day: number;
  holiday: CalendarHoliday | null;
  state: DayState;
}

export interface CalendarMonth {
  month: number;
  /** Monday-first weeks; null pads the days outside the month. */
  weeks: (CalendarDay | null)[][];
}

export function activeHolidays(holidays: FineractHoliday[]): CalendarHoliday[] {
  return holidays
    .filter((holiday) => holiday.status?.id === HOLIDAY_ACTIVE_STATUS)
    .map((holiday) => ({
      id: holiday.id,
      name: holiday.name,
      description: holiday.description ?? null,
      fromDate: arrayToIso(holiday.fromDate),
      toDate: arrayToIso(holiday.toDate)
    }));
}

/** Every day a holiday covers, keyed by ISO date; a multi-day holiday from the old screen fills each of its days. */
export function holidaysByDay(holidays: CalendarHoliday[]): Map<string, CalendarHoliday> {
  const byDay = new Map<string, CalendarHoliday>();
  for (const holiday of holidays) {
    for (let day = holiday.fromDate; day <= holiday.toDate; day = addDays(day, 1)) {
      byDay.set(day, holiday);
    }
  }
  return byDay;
}

/** An unknown business date (null) marks no day as processed; the server still refuses processed dates. */
export function dayState(iso: string, businessDate: string | null, holiday: CalendarHoliday | null): DayState {
  const processed = businessDate !== null && iso <= businessDate;
  if (holiday) return processed ? 'processed-holiday' : 'holiday';
  return processed ? 'processed' : 'free';
}

export function calendarMonths(
  year: number,
  holidays: Map<string, CalendarHoliday>,
  businessDate: string | null
): CalendarMonth[] {
  return Array.from({ length: 12 }, (_, index) => calendarMonth(year, index + 1, holidays, businessDate));
}

function calendarMonth(
  year: number,
  month: number,
  holidays: Map<string, CalendarHoliday>,
  businessDate: string | null
): CalendarMonth {
  const cells: (CalendarDay | null)[] = Array(weekdayOf(isoOf(year, month, 1))).fill(null);
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const iso = isoOf(year, month, day);
    const holiday = holidays.get(iso) ?? null;
    cells.push({ iso, day, holiday, state: dayState(iso, businessDate, holiday) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return { month, weeks };
}

/** Fineract keeps holiday names unique for ever, so the stored name carries its date: the same holiday recurs yearly. */
export function storedHolidayName(name: string, iso: string): string {
  return `${name.trim()} ${iso}`;
}
