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
import { NipSwitchAccountingConfiguration } from './nip-switch-accounting-configuration.model';
import { nipSwitchAccountingGlAccountLabel } from './nip-switch-accounting-gl-account-label';

/** Lists NIP switch accounting configurations using switch IDs as row identity. */
@Component({
  selector: 'mifosx-nip-switch-accounting-configurations',
  templateUrl: './nip-switch-accounting-configurations.component.html',
  styleUrls: ['./nip-switch-accounting-configurations.component.scss'],
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
export class NipSwitchAccountingConfigurationsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  configurations: NipSwitchAccountingConfiguration[] = [];
  glAccounts: GLAccount[] = [];
  displayedColumns = [
    'switchId',
    'direction',
    'mappings',
    'active'
  ];
  dataSource = new MatTableDataSource<NipSwitchAccountingConfiguration>();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor() {
    this.route.data.subscribe(
      (data: {
        nipSwitchAccountingConfigurations: NipSwitchAccountingConfiguration[];
        nipSwitchAccountingGlAccounts: GLAccount[];
      }) => {
        this.configurations = data.nipSwitchAccountingConfigurations ?? [];
        this.glAccounts = data.nipSwitchAccountingGlAccounts ?? [];
      }
    );
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.configurations);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (configuration, property) => {
      if (property === 'mappings') {
        return this.mappingsSummary(configuration);
      }
      const value = configuration[property as keyof NipSwitchAccountingConfiguration];
      return typeof value === 'boolean' ? String(value) : (value as string | number);
    };
  }

  mappingsSummary(configuration: NipSwitchAccountingConfiguration): string {
    const mappings = [
      [
        'Switch Payable',
        configuration.switchPayableGlAccountId
      ],
      [
        'Switch Receivable',
        configuration.switchReceivableGlAccountId
      ],
      [
        'Switch Fee',
        configuration.switchFeeGlAccountId
      ],
      [
        'Commission Income',
        configuration.commissionIncomeGlAccountId
      ]
    ].filter(
      ([
        ,
        accountId
      ]) => accountId !== null && accountId !== undefined
    );

    return mappings
      .map(
        ([
          label,
          accountId
        ]) => `${label}: ${nipSwitchAccountingGlAccountLabel(accountId as number, this.glAccounts)}`
      )
      .join(' · ');
  }
}
