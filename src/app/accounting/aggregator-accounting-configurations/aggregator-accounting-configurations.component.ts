/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
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
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GLAccount } from 'app/shared/models/general.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { nipSwitchGlAccountLabel } from '../nip-switches/nip-switch-gl-accounts';
import { AggregatorAccountingConfiguration } from './aggregator-accounting-configuration.model';

/** Lists aggregator accounting configurations using aggregator codes as row identity (AB-510). */
@Component({
  selector: 'mifosx-aggregator-accounting-configurations',
  templateUrl: './aggregator-accounting-configurations.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
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
export class AggregatorAccountingConfigurationsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  configurations: AggregatorAccountingConfiguration[] = [];
  glAccounts: GLAccount[] = [];
  displayedColumns = [
    'aggregatorCode',
    'aggregatorPayable',
    'commissionIncome',
    'convenienceFeeIncome',
    'active'
  ];
  dataSource = new MatTableDataSource<AggregatorAccountingConfiguration>();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor() {
    this.route.data.subscribe(
      (data: {
        aggregatorAccountingConfigurations: AggregatorAccountingConfiguration[];
        aggregatorAccountingGlAccounts: GLAccount[];
      }) => {
        this.configurations = data.aggregatorAccountingConfigurations ?? [];
        this.glAccounts = data.aggregatorAccountingGlAccounts ?? [];
      }
    );
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.configurations);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (configuration, property) => {
      const value = configuration[property as keyof AggregatorAccountingConfiguration];
      return typeof value === 'boolean' ? String(value) : (value as string | number);
    };
  }

  glAccountLabel(accountId?: number | null): string {
    return accountId === null || accountId === undefined ? '—' : nipSwitchGlAccountLabel(accountId, this.glAccounts);
  }
}
