/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
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

/** Custom Services */
import { BillingFeeConfigService } from './billing-fee-config.service';

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
  private router = inject(Router);
  private billingFeeConfigService = inject(BillingFeeConfigService);

  // The app's global RouteReusableStrategy reuses this component instance (and never re-runs the
  // resolver) whenever the router navigates back to this same route config - e.g. returning here
  // after creating a schedule on /new. Refetch directly on every reactivation so a newly-added
  // biller shows up instead of the stale resolver snapshot from the first visit. Set up here (not in
  // ngOnInit) so takeUntilDestroyed() has the injection context it needs.
  private readonly navigationEnd$ = this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    takeUntilDestroyed()
  );

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
    this.applySchedules(this.route.snapshot.data['schedules']?.schedules ?? []);

    this.navigationEnd$.subscribe((event) => {
      if (this.router.url === event.urlAfterRedirects) {
        this.billingFeeConfigService.listSchedules().subscribe((list) => this.applySchedules(list.schedules));
      }
    });
  }

  private applySchedules(schedules: BillingFeeSchedule[]): void {
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
