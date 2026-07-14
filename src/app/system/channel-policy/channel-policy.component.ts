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
import { MatDialog } from '@angular/material/dialog';
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
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Components */
import { ChannelDialogComponent, ChannelDialogData } from './channel-dialog.component';

/** Custom Services */
import { ChannelPolicyService } from './channel-policy.service';

/** Custom Models */
import { Channel } from './channel-policy.model';

/**
 * AB-473 channel list. Follows the Fineract webapp convention (see `CodesComponent`): sortable +
 * filterable + paginated Material table, click-through row navigation to the per-channel detail
 * page. Edit and delete now live on the detail page; the list only exposes "New Channel".
 */
@Component({
  selector: 'mifosx-channel-policy',
  templateUrl: './channel-policy.component.html',
  styleUrls: ['./channel-policy.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
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
    MatSort,
    MatSortHeader,
    MatPaginator,
    MatTooltip
  ]
})
export class ChannelPolicyComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private service = inject(ChannelPolicyService);

  displayedColumns = [
    'code',
    'displayName',
    'active',
    'updatedBy'
  ];
  dataSource: MatTableDataSource<Channel> = new MatTableDataSource<Channel>([]);

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;

  ngOnInit(): void {
    this.dataSource.data = this.route.snapshot.data['channels'] ?? [];
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string): void {
    this.dataSource.filter = (filterValue ?? '').trim().toLowerCase();
  }

  private refresh(): void {
    this.service.listChannels().subscribe((rows) => (this.dataSource.data = rows));
  }

  openCreate(): void {
    const ref = this.dialog.open(ChannelDialogComponent, {
      data: {} as ChannelDialogData,
      width: '540px'
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.createChannel(payload).subscribe(() => this.refresh());
    });
  }
}
