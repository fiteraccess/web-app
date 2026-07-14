/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
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
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Components */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChannelDialogComponent, ChannelDialogData } from './channel-dialog.component';

/** Custom Services */
import { ChannelPolicyService } from './channel-policy.service';

/** Custom Models */
import { Channel } from './channel-policy.model';

/**
 * AB-473 channel list. Every mutation invalidates the server-side cache across pods; the client
 * re-fetches the list after each write to reflect the new state.
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
    MatIconButton,
    MatButton,
    MatTooltip
  ]
})
export class ChannelPolicyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private service = inject(ChannelPolicyService);

  channels: Channel[] = [];
  displayedColumns = [
    'code',
    'displayName',
    'active',
    'updatedBy',
    'actions'
  ];

  ngOnInit(): void {
    this.channels = this.route.snapshot.data['channels'] ?? [];
  }

  private refresh(): void {
    this.service.listChannels().subscribe((rows) => (this.channels = rows));
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

  openEdit(channel: Channel): void {
    const ref = this.dialog.open(ChannelDialogComponent, {
      data: { channel } as ChannelDialogData,
      width: '540px'
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.updateChannel(channel.id, payload).subscribe(() => this.refresh());
    });
  }

  openDelete(channel: Channel): void {
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `channel "${channel.code}" (cascades every route)` }
    });
    ref.afterClosed().subscribe((r) => {
      if (r?.delete) this.service.deleteChannel(channel.id).subscribe(() => this.refresh());
    });
  }

  manageRoutes(channel: Channel): void {
    this.router.navigate(
      [
        channel.id,
        'routes'
      ],
      { relativeTo: this.route }
    );
  }
}
