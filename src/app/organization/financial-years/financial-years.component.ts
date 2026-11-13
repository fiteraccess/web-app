/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ViewChild, inject } from '@angular/core';
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
import { ActivatedRoute } from '@angular/router';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FinancialYear } from './financial-year.model';
import { formatDmy } from './iso-date';

/** Lists the financial years, newest first. */
@Component({
  selector: 'mifosx-financial-years',
  templateUrl: './financial-years.component.html',
  styleUrls: ['./financial-years.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
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
export class FinancialYearsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  readonly formatDmy = formatDmy;
  years: FinancialYear[] = [];
  displayedColumns = [
    'financialCycle',
    'description',
    'startDate',
    'endDate',
    'holidaysConfirmed',
    'closedOn'
  ];
  dataSource = new MatTableDataSource<FinancialYear>();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  constructor() {
    this.route.data.subscribe((data: { financialYears: FinancialYear[] }) => {
      this.years = [...(data.financialYears ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
    });
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.years);
    this.dataSource.paginator = this.paginator;
  }
}
