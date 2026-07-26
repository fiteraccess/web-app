/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import {
  MatTableDataSource,
  MatTable,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

/** Custom Services */
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Switch GL configurations component.
 */
@Component({
  selector: 'mifosx-switch-gl-configurations',
  templateUrl: './switch-gl-configurations.component.html',
  styleUrls: ['./switch-gl-configurations.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator
  ]
})
export class SwitchGlConfigurationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Switch GL configuration data. */
  switchGlConfigurationData: any;
  /** Columns to be displayed in switch GL configurations table. */
  displayedColumns: string[] = [
    'switchCode',
    'direction',
    'principalGlAccount',
    'active'
  ];
  /** Data source for switch GL configurations table. */
  dataSource: MatTableDataSource<any>;

  /** Paginator for switch GL configurations table. */
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  /** Sorter for switch GL configurations table. */
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  /**
   * Retrieves the switch GL configurations data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router.
   */
  constructor() {
    this.route.data.subscribe((data: { switchGlConfigurations: any }) => {
      this.switchGlConfigurationData = data.switchGlConfigurations;
    });
  }

  /**
   * Sets the switch GL configurations table.
   */
  ngOnInit() {
    this.setSwitchGlConfigurations();
  }

  /**
   * Initializes the data source, paginator and sorter for switch GL configurations table.
   */
  setSwitchGlConfigurations() {
    this.dataSource = new MatTableDataSource(this.switchGlConfigurationData);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (switchGlConfiguration: any, property: any) => {
      switch (property) {
        case 'direction':
          return switchGlConfiguration.direction.value;
        case 'principalGlAccount':
          return switchGlConfiguration.principalGlAccountData.name;
        default:
          return switchGlConfiguration[property];
      }
    };
    this.dataSource.sort = this.sort;
  }
}
