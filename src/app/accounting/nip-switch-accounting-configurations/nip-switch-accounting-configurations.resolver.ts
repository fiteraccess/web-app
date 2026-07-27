/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AccountingService } from '../accounting.service';
import { NipSwitchAccountingConfiguration } from './nip-switch-accounting-configuration.model';

/** Resolves NIP switch accounting configurations keyed by their public switch ID. */
@Injectable()
export class NipSwitchAccountingConfigurationsResolver {
  private accountingService = inject(AccountingService);

  resolve(): Observable<NipSwitchAccountingConfiguration[]> {
    return this.accountingService.getNipSwitchAccountingConfigurations();
  }
}
