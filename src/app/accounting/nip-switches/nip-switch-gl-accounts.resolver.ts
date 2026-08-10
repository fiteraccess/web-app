/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GLAccount } from 'app/shared/models/general.model';

import { AccountingService } from '../accounting.service';

@Injectable()
export class NipSwitchGlAccountsResolver {
  private accountingService = inject(AccountingService);

  resolve(): Observable<GLAccount[]> {
    return this.accountingService.getNipSwitchGlAccounts();
  }
}
