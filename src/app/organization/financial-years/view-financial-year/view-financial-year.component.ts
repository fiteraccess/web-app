/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AfterViewInit, Component, ViewChild, inject } from '@angular/core';
import { MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
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

import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FinancialPeriod, FinancialYear, sortedByStart } from '../financial-year.model';
import { FinancialYearsService } from '../financial-years.service';
import { formatDmy } from '../iso-date';

/** One financial year with its periods; a year the EOD has closed can only be read. */
@Component({
  selector: 'mifosx-view-financial-year',
  templateUrl: './view-financial-year.component.html',
  styleUrls: ['./view-financial-year.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitle,
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
  ]
})
export class ViewFinancialYearComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private financialYearsService = inject(FinancialYearsService);

  readonly formatDmy = formatDmy;
  year: FinancialYear;
  displayedColumns = [
    'periodCode',
    'startDate',
    'endDate'
  ];
  dataSource = new MatTableDataSource<FinancialPeriod>();

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor() {
    this.route.data.subscribe((data: { financialYear: FinancialYear }) => {
      this.year = data.financialYear;
      this.dataSource.data = sortedByStart(this.year.periods ?? []);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  delete(): void {
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: this.year.financialCycle }
    });
    ref.afterClosed().subscribe((response: { delete?: boolean }) => {
      if (!response?.delete) return;
      this.financialYearsService
        .deleteFinancialYear(this.year.financialCycle)
        .subscribe(() => this.router.navigate(['/organization/financial-years']));
    });
  }
}
