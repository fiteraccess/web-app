/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AfterViewInit, Component, ViewChild, inject } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import { canWriteNipSwitches } from './nip-switch-permissions';
import { nipSwitchActionLabel, nipSwitchActiveLabel, nipSwitchDirectionLabel } from './nip-switch-presentation';

@Component({
  selector: 'mifosx-nip-switches',
  templateUrl: './nip-switches.component.html',
  styleUrl: './nip-switches.component.scss',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    FaIconComponent,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule
  ]
})
export class NipSwitchesComponent implements AfterViewInit {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);

  readonly canWrite = canWriteNipSwitches(this.authenticationService.getCredentials()?.permissions ?? []);
  readonly displayedColumns = [
    'switchId',
    'direction',
    'accounting',
    'transferConfiguration',
    'active',
    'status',
    ...(this.canWrite ? ['action'] : [])
  ];
  readonly dataSource = new MatTableDataSource<NipSwitchConfiguration>();
  switches: NipSwitchConfiguration[] = [];

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor() {
    this.dataSource.sortingDataAccessor = (configuration, column) => {
      switch (column) {
        case 'direction':
          return this.direction(configuration);
        case 'accounting':
          return configuration.accounting.configured ? 'Configured' : 'Missing';
        case 'transferConfiguration':
          return configuration.transferConfiguration.configured ? 'Configured' : 'Missing';
        case 'active':
          return this.active(configuration);
        case 'status':
          return configuration.configurationStatus;
        default:
          return configuration.switchId;
      }
    };
    this.route.data.subscribe((data) => {
      this.switches = data['nipSwitches'] ?? [];
      this.dataSource.data = this.switches;
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  direction(configuration: NipSwitchConfiguration): string {
    return nipSwitchDirectionLabel(configuration);
  }

  active(configuration: NipSwitchConfiguration): string {
    return nipSwitchActiveLabel(configuration);
  }

  actionLabel(configuration: NipSwitchConfiguration): 'Edit' | 'Resolve mismatch' {
    return nipSwitchActionLabel(configuration);
  }
}
