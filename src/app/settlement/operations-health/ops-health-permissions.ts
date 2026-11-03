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
import { environment } from '../../../environments/environment';
import { CallKind } from './ops-health.model';

export const OPS_HEALTH_READ_PERMISSION = 'READ_OPSHEALTH';
export const OPS_HEALTH_PAYLOAD_PERMISSION = 'READ_OPSHEALTHPAYLOAD';
export const RESEND_SETTLEMENT_COMPLETION_PERMISSION = 'RESEND_SETTLEMENTCOMPLETION';
export const RESCHEDULE_SETTLEMENT_BATCH_PERMISSION = 'RESCHEDULE_SETTLEMENTBATCH';
export const RESEND_EOC_COMPLETION_PERMISSION = 'RESEND_SETTLEMENTEOCCOMPLETION';

/** The permission behind a call row's Resend, or null for calls that cannot be resent. */
export function resendPermissionOf(kind: CallKind): string | null {
  switch (kind) {
    case 'SETTLE_COMPLETE':
      return RESEND_SETTLEMENT_COMPLETION_PERMISSION;
    case 'EOC_COMPLETE':
      return RESEND_EOC_COMPLETION_PERMISSION;
    default:
      return null;
  }
}

export function createOpsHealthReadGuard(rbacEnabled: boolean = environment.productionModeEnableRBAC): CanActivateFn {
  return () => {
    const authenticationService = inject(AuthenticationService);
    const router = inject(Router);
    const permissions = authenticationService.getCredentials()?.permissions ?? [];
    return (
      hasAllPermissions([OPS_HEALTH_READ_PERMISSION], permissions, rbacEnabled) || router.createUrlTree(['/not-found'])
    );
  };
}

export const opsHealthReadGuard: CanActivateFn = createOpsHealthReadGuard();
