/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

import { AccountingService } from '../accounting.service';
import { NipSwitchAccountingConfiguration } from './nip-switch-accounting-configuration.model';

/** Resolves one NIP switch accounting configuration from its route switch ID. */
@Injectable()
export class NipSwitchAccountingConfigurationResolver {
  private accountingService = inject(AccountingService);

  resolve(route: ActivatedRouteSnapshot): Observable<NipSwitchAccountingConfiguration> {
    return this.accountingService.getNipSwitchAccountingConfiguration(route.paramMap.get('switchId') ?? '');
  }
}
