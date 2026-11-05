/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { hasAllPermissions } from 'app/accounting/nip-switches/nip-switch-permissions';
import { environment } from '../../../../environments/environment';

export const SYNAPSE_JOBS_READ_PERMISSION = 'READ_SYNAPSEJOB';

export function canReadSynapseJobs(
  permissions: readonly string[],
  rbacEnabled: boolean = environment.productionModeEnableRBAC
): boolean {
  return hasAllPermissions([SYNAPSE_JOBS_READ_PERMISSION], permissions, rbacEnabled);
}

export function createSynapseJobsReadGuard(rbacEnabled: boolean = environment.productionModeEnableRBAC): CanActivateFn {
  return () => {
    const authenticationService = inject(AuthenticationService);
    const router = inject(Router);
    const permissions = authenticationService.getCredentials()?.permissions ?? [];
    return canReadSynapseJobs(permissions, rbacEnabled) || router.createUrlTree(['/not-found']);
  };
}

export const synapseJobsReadGuard: CanActivateFn = createSynapseJobsReadGuard();
