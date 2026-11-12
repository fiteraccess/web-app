/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FinancialPeriod } from './financial-year.model';
import { addDays, addMonths, isoParts } from './iso-date';

/**
 * Monthly periods M01, M02, … covering start to end. Each runs to the day before the same day-of-month one month
 * later, so a year starting on the 1st gets calendar months; the last period ends exactly on the end date.
 */
export function generateMonthlyPeriods(startDate: string, endDate: string): FinancialPeriod[] {
  if (!isoParts(startDate) || !isoParts(endDate) || endDate < startDate) return [];
  const periods: FinancialPeriod[] = [];
  let periodStart = startDate;
  while (periodStart <= endDate) {
    const nextStart = addMonths(startDate, periods.length + 1);
    const periodEnd = addDays(nextStart, -1);
    periods.push({
      periodCode: `M${String(periods.length + 1).padStart(2, '0')}`,
      startDate: periodStart,
      endDate: periodEnd < endDate ? periodEnd : endDate
    });
    periodStart = nextStart;
  }
  return periods;
}
