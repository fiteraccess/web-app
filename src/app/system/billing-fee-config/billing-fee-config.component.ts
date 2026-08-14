/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Models */
import { BillingFeeSchedule } from './billing-fee-config.model';

/** Row shape for the table — flattens the schedule for the `enabledComponentCount` column. */
interface BillingFeeScheduleRow extends BillingFeeSchedule {
  enabledComponentCount: number;
}

/**
 * AB-510: biller/airtime/data fee-schedule list. Follows the Fineract webapp convention (see
 * `ChannelPolicyComponent`): sortable + filterable + paginated Material table, click-through row
 * navigation to the per-schedule edit page. New schedule creation lives on its own route.
 */
@Component({
  selector: 'mifosx-billing-fee-config',
  templateUrl: './billing-fee-config.component.html',
  styleUrls: ['./billing-fee-config.component.scss'],
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
    MatSort,
    MatSortHeader,
    MatPaginator
  ]
})
export class BillingFeeConfigComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);

  displayedColumns = [
    'billerCode',
    'productCode',
    'aggregatorCode',
    'enabledComponentCount'
  ];
  dataSource: MatTableDataSource<BillingFeeScheduleRow> = new MatTableDataSource<BillingFeeScheduleRow>([]);

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  ngOnInit(): void {
    const schedules: BillingFeeSchedule[] = this.route.snapshot.data['schedules']?.schedules ?? [];
    this.dataSource.data = schedules.map((schedule) => ({
      ...schedule,
      enabledComponentCount: schedule.components.filter((component) => component.enabled).length
    }));
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = (filterValue ?? '').trim().toLowerCase();
  }
}
