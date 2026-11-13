/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  activeHolidays,
  CalendarHoliday,
  calendarMonths,
  dayState,
  FineractHoliday,
  holidaysByDay,
  storedHolidayName
} from './holiday-calendar.model';
import { HolidayCalendarService } from './holiday-calendar.service';

const CHRISTMAS: CalendarHoliday = {
  id: 7,
  name: 'Christmas Day 2026-12-25',
  description: null,
  fromDate: '2026-12-25',
  toDate: '2026-12-25'
};

describe('Holiday calendar', () => {
  describe('model', () => {
    it('keeps only active holidays, dates as ISO', () => {
      const raw: FineractHoliday[] = [
        { id: 7, name: 'Christmas Day 2026-12-25', fromDate: [
            2026,
            12,
            25
          ], toDate: [
            2026,
            12,
            25
          ], status: { id: 300 } },
        { id: 8, name: 'Old#8', fromDate: [
            2026,
            12,
            26
          ], toDate: [
            2026,
            12,
            26
          ], status: { id: 600 } },
        { id: 9, name: 'Pending', fromDate: [
            2026,
            12,
            28
          ], toDate: [
            2026,
            12,
            28
          ], status: { id: 100 } }
      ];

      expect(activeHolidays(raw)).toEqual([CHRISTMAS]);
    });

    it('spreads a multi-day holiday over each of its days', () => {
      const byDay = holidaysByDay([{ ...CHRISTMAS, toDate: '2026-12-27' }]);

      expect([...byDay.keys()]).toEqual([
        '2026-12-25',
        '2026-12-26',
        '2026-12-27'
      ]);
    });

    it.each([
      [
        '2026-11-12',
        null,
        'processed'
      ],
      [
        '2026-11-11',
        CHRISTMAS,
        'processed-holiday'
      ],
      [
        '2026-11-13',
        null,
        'free'
      ],
      [
        '2026-12-25',
        CHRISTMAS,
        'holiday'
      ]
    ] as const)('%s with holiday %p is %s against business date 2026-11-12', (iso, holiday, state) => {
      expect(dayState(iso, '2026-11-12', holiday)).toBe(state);
    });

    it('marks no day processed when the business date is unknown', () => {
      expect(dayState('2020-01-01', null, null)).toBe('free');
      expect(dayState('2020-12-25', null, CHRISTMAS)).toBe('holiday');
    });

    it('lays out twelve Monday-first months', () => {
      const months = calendarMonths(2026, holidaysByDay([CHRISTMAS]), '2026-11-12');

      expect(months).toHaveLength(12);
      // 1 January 2026 is a Thursday.
      expect(months[0].weeks[0].slice(0, 3)).toEqual([
        null,
        null,
        null
      ]);
      expect(months[0].weeks[0][3]).toMatchObject({ iso: '2026-01-01', state: 'processed' });
      const christmas = months[11].weeks.flat().find((day) => day?.iso === '2026-12-25');
      expect(christmas).toMatchObject({ state: 'holiday', holiday: CHRISTMAS });
      expect(months.every((month) => month.weeks.every((week) => week.length === 7))).toBe(true);
    });

    it('stores the name with its day so the same holiday recurs every year', () => {
      expect(storedHolidayName(' Christmas Day ', '2027-12-25')).toBe('Christmas Day 2027-12-25');
    });
  });

  describe('service', () => {
    let service: HolidayCalendarService;
    let http: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [
          provideHttpClient(),
          provideHttpClientTesting()
        ] });
      service = TestBed.inject(HolidayCalendarService);
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('takes the office without a parent as the head office', () => {
      let office: unknown;
      service.getHeadOffice().subscribe((o) => (office = o));

      http.expectOne('/offices').flush([
        { id: 2, name: 'Ikeja', parentId: 1 },
        { id: 1, name: 'Head Office', externalId: '099' }
      ]);

      expect(office).toEqual({ id: 1, name: 'Head Office', externalId: '099' });
    });

    it('reads the business date as ISO', () => {
      let date: string | undefined;
      service.getBusinessDate().subscribe((d) => (date = d));

      http.expectOne('/businessdate/BUSINESS_DATE').flush({ type: 'BUSINESS_DATE', date: [
          2026,
          11,
          12
        ] });

      expect(date).toBe('2026-11-12');
    });

    it("reads one year of the office's holidays", () => {
      service.getHolidays(1, 2026).subscribe();

      const request = http.expectOne((r) => r.url === '/holidays');
      expect(request.request.params.toString()).toBe(
        'officeId=1&fromDate=2026-01-01&toDate=2026-12-31&dateFormat=yyyy-MM-dd&locale=en'
      );
      request.flush([]);
    });

    it('creates a one-day holiday for the office, named with its day', () => {
      service.createHoliday(1, '2026-12-25', 'Christmas Day', '').subscribe();

      const request = http.expectOne('/holidays');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        name: 'Christmas Day 2026-12-25',
        description: undefined,
        fromDate: '2026-12-25',
        toDate: '2026-12-25',
        offices: [{ officeId: 1 }],
        dateFormat: 'yyyy-MM-dd',
        locale: 'en'
      });
      request.flush({ resourceId: 7 });
    });

    it('deletes a holiday by id', () => {
      service.deleteHoliday(7).subscribe();

      const request = http.expectOne('/holidays/7');
      expect(request.request.method).toBe('DELETE');
      request.flush({});
    });
  });
});
