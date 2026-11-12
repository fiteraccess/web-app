/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

import { dateToIso, daysInMonth, formatDmy } from './iso-date';

const DMY = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

/** Shows and reads date-picker inputs as `dd-MM-yyyy`; calendar headings keep the locale's wording. */
@Injectable()
export class DmyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: object): string {
    return displayFormat === DMY_DATE_FORMATS.display.dateInput
      ? formatDmy(dateToIso(date))
      : super.format(date, displayFormat);
  }

  override parse(value: unknown): Date | null {
    if (typeof value !== 'string') return value instanceof Date ? value : null;
    const match = DMY.exec(value.trim());
    if (!match) return value.trim() ? this.invalid() : null;
    const [
      day,
      month,
      year
    ] = [
      +match[1],
      +match[2],
      +match[3]
    ];
    const valid = month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
    return valid ? new Date(year, month - 1, day) : this.invalid();
  }
}

export const DMY_DATE_FORMATS = {
  parse: { dateInput: null as object | null },
  display: {
    dateInput: { dmy: true } as object,
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};
