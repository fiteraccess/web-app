/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** A single row of `m_channel` (AB-473). `id` is a UUID string. */
export interface Channel {
  id: string;
  code: string; // uppercase, no spaces
  displayName: string;
  description?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

/** A single row of `m_channel_route`. */
export interface ChannelRoute {
  id: string;
  channelId: string;
  httpMethod: string; // GET|POST|PUT|DELETE|PATCH|*
  pathTemplate: string; // "/access/api/v1/…" or "*"
  createdAt?: string;
  createdBy?: string | null;
}

/** Whitelisted HTTP methods for the create-route form. `*` renders as "Any". */
export const CHANNEL_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  '*'
] as const;
