/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AfterViewInit, Component, ViewChild, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCardHeader, MatCardTitle } from '@angular/material/card';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatPaginator } from '@angular/material/paginator';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource
} from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { DMY_DATE_FORMATS, DmyDateAdapter } from '../dmy-date-adapter';
import {
  buildFinancialYearRequest,
  createFinancialPeriodForm,
  createFinancialYearForm,
  FinancialPeriodForm,
  FinancialYearForm
} from '../financial-year-form.model';
import { FinancialYear } from '../financial-year.model';
import { generateMonthlyPeriods } from '../financial-year-periods';
import { FinancialYearsService } from '../financial-years.service';
import { dateToIso } from '../iso-date';

/** Creates a financial year or replaces a stored one with its periods; Synapse judges everything past the basics. */
@Component({
  selector: 'mifosx-financial-year-form',
  templateUrl: './financial-year-form.component.html',
  styleUrls: ['./financial-year-form.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitle,
    MatIconButton,
    FaIconComponent,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator
  ],
  providers: [
    { provide: DateAdapter, useClass: DmyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DMY_DATE_FORMATS }
  ]
})
export class FinancialYearFormComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private financialYearsService = inject(FinancialYearsService);

  form: FinancialYearForm = createFinancialYearForm();
  editing = false;
  displayedColumns = [
    'periodCode',
    'startDate',
    'endDate',
    'actions'
  ];
  dataSource = new MatTableDataSource<FinancialPeriodForm>();

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor() {
    this.route.data.subscribe((data: { financialYear?: FinancialYear }) => {
      if (data.financialYear) {
        this.editing = true;
        this.form = createFinancialYearForm(data.financialYear);
      }
      this.refreshRows();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  get canGenerate(): boolean {
    const { startDate, endDate } = this.form.controls;
    return !!startDate.value && !!endDate.value && endDate.value >= startDate.value;
  }

  generatePeriods(): void {
    const { startDate, endDate, periods } = this.form.controls;
    periods.clear();
    generateMonthlyPeriods(dateToIso(startDate.value), dateToIso(endDate.value)).forEach((period) =>
      periods.push(createFinancialPeriodForm(period))
    );
    periods.markAsDirty();
    this.refreshRows();
    this.paginator?.firstPage();
  }

  addPeriod(): void {
    this.form.controls.periods.push(createFinancialPeriodForm());
    this.refreshRows();
    this.paginator?.lastPage();
  }

  removePeriod(row: FinancialPeriodForm): void {
    const periods = this.form.controls.periods;
    periods.removeAt(periods.controls.indexOf(row));
    periods.markAsDirty();
    this.refreshRows();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const financialCycle = this.form.controls.financialCycle.value.trim();
    this.financialYearsService
      .putFinancialYear(financialCycle, buildFinancialYearRequest(this.form))
      .subscribe((saved) =>
        this.router.navigate([
          '/organization/financial-years/view',
          saved.financialCycle
        ])
      );
  }

  private refreshRows(): void {
    this.dataSource.data = [...this.form.controls.periods.controls];
  }
}
