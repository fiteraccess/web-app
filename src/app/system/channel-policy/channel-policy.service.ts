/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Models */
import { Channel, ChannelRoute } from './channel-policy.model';

/**
 * AB-473 channel-policy admin service. All URLs live under `/access/api/v1/admin/channels` so the
 * api-prefix interceptor routes them to `serverHost` (bare origin) instead of the
 * fineract-provider prefix. Every mutation invalidates the server-side ChannelPolicyCache across
 * pods via Redis pub/sub — callers do not need to trigger a refresh manually.
 */
@Injectable({ providedIn: 'root' })
export class ChannelPolicyService {
  private http = inject(HttpClient);

  /** Returns every configured channel, sorted by code. */
  listChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>('/access/api/v1/admin/channels');
  }

  /** Creates a channel. Server normalises `code` to uppercase. */
  createChannel(body: {
    code: string;
    displayName: string;
    description?: string | null;
    active?: boolean;
  }): Observable<Channel> {
    return this.http.post<Channel>('/access/api/v1/admin/channels', body);
  }

  /** Updates the mutable attributes (displayName, description, active). Code is immutable. */
  updateChannel(
    id: string,
    body: { displayName: string; description?: string | null; active: boolean }
  ): Observable<Channel> {
    return this.http.put<Channel>(`/access/api/v1/admin/channels/${id}`, body);
  }

  /** Cascade-deletes the channel and every associated route. */
  deleteChannel(id: string): Observable<void> {
    return this.http.delete<void>(`/access/api/v1/admin/channels/${id}`);
  }

  /** Returns every route configured for the channel. */
  listRoutes(channelId: string): Observable<ChannelRoute[]> {
    return this.http.get<ChannelRoute[]>(`/access/api/v1/admin/channels/${channelId}/routes`);
  }

  /** Adds a `(method, pathTemplate)` entry to a channel's allow-list. */
  createRoute(channelId: string, body: { method: string; pathTemplate: string }): Observable<ChannelRoute> {
    return this.http.post<ChannelRoute>(`/access/api/v1/admin/channels/${channelId}/routes`, body);
  }

  /** Removes a single route. */
  deleteRoute(channelId: string, routeId: string): Observable<void> {
    return this.http.delete<void>(`/access/api/v1/admin/channels/${channelId}/routes/${routeId}`);
  }
}
