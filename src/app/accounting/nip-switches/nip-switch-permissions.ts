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
import { environment } from '../../../environments/environment';

export const NIP_SWITCH_READ_PERMISSIONS = [
  'READ_NIP_SWITCH_ACCOUNTING_CONFIGURATION',
  'READ_NIPFEEPOLICY'
] as const;

export const NIP_SWITCH_WRITE_PERMISSIONS = [
  'UPDATE_NIP_SWITCH_ACCOUNTING_CONFIGURATION',
  'WRITE_NIPFEEPOLICY'
] as const;

export function hasAllPermissions(
  required: readonly string[],
  permissions: readonly string[],
  rbacEnabled: boolean = environment.productionModeEnableRBAC
): boolean {
  if (!rbacEnabled || permissions.includes('ALL_FUNCTIONS')) {
    return true;
  }
  return required.every(
    (permission) =>
      permissions.includes(permission) || (permission.startsWith('READ_') && permissions.includes('ALL_FUNCTIONS_READ'))
  );
}

export function canReadNipSwitches(
  permissions: readonly string[],
  rbacEnabled: boolean = environment.productionModeEnableRBAC
): boolean {
  return hasAllPermissions(NIP_SWITCH_READ_PERMISSIONS, permissions, rbacEnabled);
}

export function canWriteNipSwitches(
  permissions: readonly string[],
  rbacEnabled: boolean = environment.productionModeEnableRBAC
): boolean {
  return hasAllPermissions(NIP_SWITCH_WRITE_PERMISSIONS, permissions, rbacEnabled);
}

export function createNipSwitchReadGuard(rbacEnabled: boolean = environment.productionModeEnableRBAC): CanActivateFn {
  return () => {
    const authenticationService = inject(AuthenticationService);
    const router = inject(Router);
    const permissions = authenticationService.getCredentials()?.permissions ?? [];
    return canReadNipSwitches(permissions, rbacEnabled) || router.createUrlTree(['/not-found']);
  };
}

export const nipSwitchReadGuard: CanActivateFn = createNipSwitchReadGuard();

export function createNipSwitchWriteGuard(rbacEnabled: boolean = environment.productionModeEnableRBAC): CanActivateFn {
  return () => {
    const authenticationService = inject(AuthenticationService);
    const router = inject(Router);
    const permissions = authenticationService.getCredentials()?.permissions ?? [];
    return canWriteNipSwitches(permissions, rbacEnabled) || router.createUrlTree(['/not-found']);
  };
}

export const nipSwitchWriteGuard: CanActivateFn = createNipSwitchWriteGuard();
