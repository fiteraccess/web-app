/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const READ_FINANCIAL_YEAR_PERMISSION = 'READ_FINANCIALYEAR';
export const UPDATE_FINANCIAL_YEAR_PERMISSION = 'UPDATE_FINANCIALYEAR';
export const DELETE_FINANCIAL_YEAR_PERMISSION = 'DELETE_FINANCIALYEAR';

export interface FinancialPeriod {
  periodCode: string;
  startDate: string;
  endDate: string;
}

export interface FinancialYearRequest {
  description: string | null;
  startDate: string;
  endDate: string;
  holidaysConfirmed: boolean;
  periods: FinancialPeriod[];
}

/** A financial year as Synapse keeps it; every date is ISO `yyyy-MM-dd`. */
export interface FinancialYear extends FinancialYearRequest {
  financialCycle: string;
  closedOn: string | null;
}

export function sortedByStart(periods: FinancialPeriod[]): FinancialPeriod[] {
  return [...periods].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.periodCode.localeCompare(b.periodCode)
  );
}

/** The PUT body that stores a year exactly as it is, apart from the given changes. */
export function toFinancialYearRequest(
  year: FinancialYear,
  changes: Partial<FinancialYearRequest> = {}
): FinancialYearRequest {
  return {
    description: year.description ?? null,
    startDate: year.startDate,
    endDate: year.endDate,
    holidaysConfirmed: year.holidaysConfirmed,
    periods: sortedByStart(year.periods ?? []).map(({ periodCode, startDate, endDate }) => ({
      periodCode,
      startDate,
      endDate
    })),
    ...changes
  };
}

/** The year whose date range holds the given day, if any. */
export function financialYearCovering(years: FinancialYear[], isoDate: string): FinancialYear | null {
  return years.find((year) => year.startDate <= isoDate && isoDate <= year.endDate) ?? null;
}
