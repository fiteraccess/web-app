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
import { Observable } from 'rxjs';

/** Custom Models */
import { KycTier } from '../../clients/kyc/kyc.model';
import { TierPolicy } from './tier-policy.model';

/** Custom Services */
import { TierPolicyService } from './tier-policy.service';

/**
 * Tier policy data resolver.
 */
@Injectable()
export class TierPolicyResolver {
  private tierPolicyService = inject(TierPolicyService);

  /**
   * Returns the tier policy data.
   * @returns {Observable<TierPolicy>}
   */
  resolve(route: ActivatedRouteSnapshot): Observable<TierPolicy> {
    const tier = route.paramMap.get('tier');
    return this.tierPolicyService.getTierPolicy(tier as KycTier);
  }
}
