/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatCardTitle } from '@angular/material/card';
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
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChannelDialogComponent, ChannelDialogData } from './channel-dialog.component';
import { ChannelRouteDialogComponent } from './channel-route-dialog.component';

import { ChannelPolicyService } from './channel-policy.service';
import { Channel, ChannelRoute } from './channel-policy.model';

/**
 * AB-473 channel detail page (routed at `/system/channel-policy/:id`). Owns three top-bar actions
 * to match the Fineract webapp convention (see `ViewCodeComponent`): Add Route, Edit Channel,
 * Delete Channel. Routes themselves are immutable — the per-row action is delete-only; changing a
 * route is a delete + create round-trip.
 */
@Component({
  selector: 'mifosx-channel-routes',
  templateUrl: './channel-routes.component.html',
  styleUrls: ['./channel-policy.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
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
    MatIconButton,
    MatTooltip
  ]
})
export class ChannelRoutesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private service = inject(ChannelPolicyService);

  channelId!: string;
  /** Resolved channel; undefined only if the id was deleted between navigation and route activation. */
  channel: Channel | undefined;
  routes: ChannelRoute[] = [];
  displayedColumns = [
    'httpMethod',
    'pathTemplate',
    'createdBy',
    'actions'
  ];

  ngOnInit(): void {
    this.channelId = this.route.snapshot.paramMap.get('id') as string;
    this.channel = this.route.snapshot.data['channel'];
    this.routes = this.route.snapshot.data['routes'] ?? [];
  }

  /** Header + dialog label — "displayName (code)" when the channel is resolved, otherwise the raw id. */
  get channelLabel(): string {
    return this.channel ? `${this.channel.displayName} (${this.channel.code})` : this.channelId;
  }

  private refreshRoutes(): void {
    this.service.listRoutes(this.channelId).subscribe((rows) => (this.routes = rows));
  }

  private refreshChannel(): void {
    this.service.listChannels().subscribe((list) => (this.channel = list.find((c) => c.id === this.channelId)));
  }

  openAdd(): void {
    const ref = this.dialog.open(ChannelRouteDialogComponent, {
      data: { channelCode: this.channel?.code ?? this.channelId },
      width: '540px'
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.createRoute(this.channelId, payload).subscribe(() => this.refreshRoutes());
    });
  }

  openEditChannel(): void {
    if (!this.channel) return;
    const ref = this.dialog.open(ChannelDialogComponent, {
      data: { channel: this.channel } as ChannelDialogData,
      width: '540px'
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.updateChannel(this.channelId, payload).subscribe(() => this.refreshChannel());
    });
  }

  openDeleteChannel(): void {
    const label = this.channel ? this.channel.code : this.channelId;
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `channel "${label}" (cascades every route)` }
    });
    ref.afterClosed().subscribe((r) => {
      if (!r?.delete) return;
      this.service.deleteChannel(this.channelId).subscribe(() => this.router.navigate(['/system/channel-policy']));
    });
  }

  openDelete(row: ChannelRoute): void {
    const label = `route "${this.methodLabel(row.httpMethod)} ${row.pathTemplate}"`;
    const ref = this.dialog.open(DeleteDialogComponent, { data: { deleteContext: label } });
    ref.afterClosed().subscribe((r) => {
      if (r?.delete) this.service.deleteRoute(this.channelId, row.id).subscribe(() => this.refreshRoutes());
    });
  }

  methodLabel(m: string): string {
    return m === '*' ? 'Any' : m;
  }

  pathLabel(p: string): string {
    return p === '*' ? 'All paths' : p;
  }
}
