/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

/** rxjs Imports */
import { map, Observable } from 'rxjs';

/** Custom Models */
import { Channel, ChannelRoute } from './channel-policy.model';

/** Custom Services */
import { ChannelPolicyService } from './channel-policy.service';

/** Resolves the full channel list for the AB-473 admin page. */
@Injectable()
export class ChannelPolicyResolver {
  private service = inject(ChannelPolicyService);

  resolve(_route: ActivatedRouteSnapshot): Observable<Channel[]> {
    return this.service.listChannels();
  }
}

/** Resolves the route list for a single channel (drill-in page). */
@Injectable()
export class ChannelRoutesResolver {
  private service = inject(ChannelPolicyService);

  resolve(route: ActivatedRouteSnapshot): Observable<ChannelRoute[]> {
    return this.service.listRoutes(route.paramMap.get('id') as string);
  }
}

/**
 * Resolves the channel record (from the list endpoint filtered by id) so the drill-in page can
 * render "Routes for <displayName> (<code>)" instead of the raw UUID, and survives page refresh
 * (unlike a query-param handoff).
 */
@Injectable()
export class ChannelResolver {
  private service = inject(ChannelPolicyService);

  resolve(route: ActivatedRouteSnapshot): Observable<Channel | undefined> {
    const id = route.paramMap.get('id') as string;
    return this.service.listChannels().pipe(map((list) => list.find((c) => c.id === id)));
  }
}
