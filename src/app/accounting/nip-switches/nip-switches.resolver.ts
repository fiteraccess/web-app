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
import { NipSwitchConfiguration } from './nip-switch-configuration.model';

@Injectable()
export class NipSwitchesResolver {
  private accountingService = inject(AccountingService);

  resolve(): Observable<NipSwitchConfiguration[]> {
    return this.accountingService.getNipSwitchConfigurations();
  }
}
