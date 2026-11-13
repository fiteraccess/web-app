/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FinancialYear, financialYearCovering, toFinancialYearRequest } from '../financial-years/financial-year.model';
import { FinancialYearsService } from '../financial-years/financial-years.service';
import { formatDmy, isoOf, isoParts } from '../financial-years/iso-date';
import { AddHolidayDialogComponent, AddHolidayResult } from './add-holiday-dialog/add-holiday-dialog.component';
import { CalendarDay, CalendarMonth, calendarMonths, HeadOffice, holidaysByDay } from './holiday-calendar.model';
import { HolidayCalendarService } from './holiday-calendar.service';

/** The head office's holiday calendar for one year, and whether that year's financial year has its holidays confirmed. */
@Component({
  selector: 'mifosx-holiday-calendar',
  templateUrl: './holiday-calendar.component.html',
  styleUrls: ['./holiday-calendar.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIconButton,
    MatTooltip,
    FaIconComponent
  ]
})
export class HolidayCalendarComponent implements OnInit {
  private dialog = inject(MatDialog);
  private holidayCalendarService = inject(HolidayCalendarService);
  private financialYearsService = inject(FinancialYearsService);

  readonly formatDmy = formatDmy;
  readonly weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun'
  ];
  readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  office: HeadOffice | null = null;
  businessDate: string | null = null;
  year: number | null = null;
  months: CalendarMonth[] = [];
  financialYear: FinancialYear | null = null;
  financialYearsUnavailable = false;

  ngOnInit(): void {
    forkJoin({
      office: this.holidayCalendarService.getHeadOffice(),
      // A user who can't read the business date still gets the calendar; the stock alert reports the refusal.
      businessDate: this.holidayCalendarService.getBusinessDate().pipe(catchError(() => of(null)))
    }).subscribe(({ office, businessDate }) => {
      this.office = office;
      this.businessDate = businessDate;
      this.showYear(businessDate ? isoParts(businessDate).year : new Date().getFullYear());
    });
  }

  showYear(year: number): void {
    this.year = year;
    this.loadHolidays();
    this.loadFinancialYear();
  }

  dayClicked(day: CalendarDay): void {
    if (day.state === 'free') this.addHoliday(day);
    if (day.state === 'holiday') this.removeHoliday(day);
  }

  dayTooltip(day: CalendarDay): string {
    return day.holiday ? day.holiday.name : '';
  }

  toggleHolidaysConfirmed(): void {
    const year = this.financialYear;
    const request = toFinancialYearRequest(year, { holidaysConfirmed: !year.holidaysConfirmed });
    this.financialYearsService
      .putFinancialYear(year.financialCycle, request)
      .subscribe((saved) => (this.financialYear = saved));
  }

  private addHoliday(day: CalendarDay): void {
    this.dialog
      .open(AddHolidayDialogComponent, { data: { iso: day.iso }, width: '420px' })
      .afterClosed()
      .subscribe((result?: AddHolidayResult) => {
        if (!result) return;
        this.holidayCalendarService
          .createHoliday(this.office.id, day.iso, result.name, result.description)
          .pipe(finalize(() => this.loadHolidays()))
          .subscribe();
      });
  }

  private removeHoliday(day: CalendarDay): void {
    this.dialog
      .open(DeleteDialogComponent, { data: { deleteContext: `${day.holiday.name}` } })
      .afterClosed()
      .subscribe((response: { delete?: boolean }) => {
        if (!response?.delete) return;
        this.holidayCalendarService
          .deleteHoliday(day.holiday.id)
          .pipe(finalize(() => this.loadHolidays()))
          .subscribe();
      });
  }

  private loadHolidays(): void {
    const year = this.year;
    this.holidayCalendarService.getHolidays(this.office.id, year).subscribe((holidays) => {
      if (year === this.year) this.months = calendarMonths(year, holidaysByDay(holidays), this.businessDate);
    });
  }

  /** The year whose range holds 1 January carries the "holidays confirmed" flag the year-end EOD checks. */
  private loadFinancialYear(): void {
    const year = this.year;
    this.financialYearsService.getFinancialYears().subscribe({
      next: (years) => {
        if (year !== this.year) return;
        this.financialYearsUnavailable = false;
        this.financialYear = financialYearCovering(years, isoOf(year, 1, 1));
      },
      error: () => {
        this.financialYearsUnavailable = true;
        this.financialYear = null;
      }
    });
  }
}
