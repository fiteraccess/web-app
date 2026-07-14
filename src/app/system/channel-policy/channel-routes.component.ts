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

import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { ChannelRouteDialogComponent } from './channel-route-dialog.component';

import { ChannelPolicyService } from './channel-policy.service';
import { Channel, ChannelRoute } from './channel-policy.model';

/** AB-473 routes-for-a-channel page. Add/delete inline; routes are immutable (delete + create). */
@Component({
  selector: 'mifosx-channel-routes',
  templateUrl: './channel-routes.component.html',
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

  private refresh(): void {
    this.service.listRoutes(this.channelId).subscribe((rows) => (this.routes = rows));
  }

  openAdd(): void {
    const ref = this.dialog.open(ChannelRouteDialogComponent, {
      data: { channelCode: this.channel?.code ?? this.channelId },
      width: '540px'
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.createRoute(this.channelId, payload).subscribe(() => this.refresh());
    });
  }

  openDelete(row: ChannelRoute): void {
    const label = `route "${this.methodLabel(row.httpMethod)} ${row.pathTemplate}"`;
    const ref = this.dialog.open(DeleteDialogComponent, { data: { deleteContext: label } });
    ref.afterClosed().subscribe((r) => {
      if (r?.delete) this.service.deleteRoute(this.channelId, row.id).subscribe(() => this.refresh());
    });
  }

  /**
   * Navigate to the channel-policy landing page. The relative path from
   * `/system/channel-policy/:id/routes` needs two `..` segments to reach the list;
   * an absolute route is more robust to future restructuring, so we use that.
   */
  goBack(): void {
    this.router.navigate(['/system/channel-policy']);
  }

  methodLabel(m: string): string {
    return m === '*' ? 'Any' : m;
  }

  pathLabel(p: string): string {
    return p === '*' ? 'All paths' : p;
  }
}
