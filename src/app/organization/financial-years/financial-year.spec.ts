/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { buildFinancialYearRequest, createFinancialYearForm } from './financial-year-form.model';
import { FinancialYear, financialYearCovering, toFinancialYearRequest } from './financial-year.model';
import { generateMonthlyPeriods } from './financial-year-periods';

const FY2026: FinancialYear = {
  financialCycle: 'FY2026',
  description: 'FISCAL YEAR 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  holidaysConfirmed: false,
  closedOn: null,
  periods: [
    { periodCode: 'M02', startDate: '2026-02-01', endDate: '2026-12-31' },
    { periodCode: 'M01', startDate: '2026-01-01', endDate: '2026-01-31' }
  ]
};

describe('Financial years', () => {
  describe('monthly periods', () => {
    it('gives a calendar year twelve calendar months, February with 28 days', () => {
      const periods = generateMonthlyPeriods('2026-01-01', '2026-12-31');

      expect(periods.map((p) => p.periodCode)).toEqual([
        'M01',
        'M02',
        'M03',
        'M04',
        'M05',
        'M06',
        'M07',
        'M08',
        'M09',
        'M10',
        'M11',
        'M12'
      ]);
      expect(periods[1]).toEqual({ periodCode: 'M02', startDate: '2026-02-01', endDate: '2026-02-28' });
      expect(periods[11]).toEqual({ periodCode: 'M12', startDate: '2026-12-01', endDate: '2026-12-31' });
    });

    it('ends February on the 29th in a leap year', () => {
      expect(generateMonthlyPeriods('2028-01-01', '2028-12-31')[1]).toEqual({
        periodCode: 'M02',
        startDate: '2028-02-01',
        endDate: '2028-02-29'
      });
    });

    it('runs a year starting mid-month from that day, the last period ending on the year end', () => {
      const periods = generateMonthlyPeriods('2026-07-15', '2027-07-14');

      expect(periods).toHaveLength(12);
      expect(periods[0]).toEqual({ periodCode: 'M01', startDate: '2026-07-15', endDate: '2026-08-14' });
      expect(periods[11]).toEqual({ periodCode: 'M12', startDate: '2027-06-15', endDate: '2027-07-14' });
    });

    it('gives nothing for an end before the start', () => {
      expect(generateMonthlyPeriods('2026-12-31', '2026-01-01')).toEqual([]);
    });
  });

  describe('form', () => {
    it('round-trips a stored year to the PUT body, periods in start order and the cycle locked', () => {
      const form = createFinancialYearForm(FY2026);

      expect(form.controls.financialCycle.disabled).toBe(true);
      expect(buildFinancialYearRequest(form)).toEqual(toFinancialYearRequest(FY2026));
      expect(buildFinancialYearRequest(form).periods.map((p) => p.periodCode)).toEqual([
        'M01',
        'M02'
      ]);
    });

    it('marks a period ending before it starts invalid', () => {
      const form = createFinancialYearForm({
        ...FY2026,
        periods: [{ periodCode: 'M01', startDate: '2026-01-31', endDate: '2026-01-01' }]
      });

      expect(form.controls.periods.at(0).hasError('endBeforeStart')).toBe(true);
    });

    it('sends a blank description as null', () => {
      const form = createFinancialYearForm(FY2026);
      form.controls.description.setValue('  ');

      expect(buildFinancialYearRequest(form).description).toBeNull();
    });
  });

  describe('confirming holidays', () => {
    it('re-sends the year unchanged apart from the flag', () => {
      expect(toFinancialYearRequest(FY2026, { holidaysConfirmed: true })).toEqual({
        description: 'FISCAL YEAR 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        holidaysConfirmed: true,
        periods: [
          { periodCode: 'M01', startDate: '2026-01-01', endDate: '2026-01-31' },
          { periodCode: 'M02', startDate: '2026-02-01', endDate: '2026-12-31' }
        ]
      });
    });

    it('finds the year covering a day, or none', () => {
      expect(financialYearCovering([FY2026], '2026-01-01')).toBe(FY2026);
      expect(financialYearCovering([FY2026], '2027-01-01')).toBeNull();
    });
  });
});
