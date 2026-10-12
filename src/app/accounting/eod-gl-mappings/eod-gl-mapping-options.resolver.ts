/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { AccountingService } from '../accounting.service';
import { GLAccount } from 'app/shared/models/general.model';

/** What the mapping pickers offer: financial activities, NIP switches, aggregators, and GL accounts for names. */
export interface EodGlMappingOptions {
  activities: { id: number; name: string }[];
  switchIds: string[];
  aggregatorCodes: string[];
  glAccounts: GLAccount[];
}

@Injectable()
export class EodGlMappingOptionsResolver {
  private accountingService = inject(AccountingService);

  resolve(): Observable<EodGlMappingOptions> {
    return forkJoin({
      template: this.accountingService.getFinancialActivityAccountsTemplate(),
      switches: this.accountingService.getNipSwitchConfigurations(),
      aggregators: this.accountingService.getAggregatorAccountingConfigurations(),
      glAccounts: this.accountingService.getNipSwitchGlAccounts()
    }).pipe(
      map(({ template, switches, aggregators, glAccounts }) => ({
        activities: (template?.financialActivityOptions ?? []).map((a: any) => ({ id: a.id, name: a.name })),
        switchIds: (switches ?? []).map((s) => s.switchId),
        aggregatorCodes: (aggregators ?? []).map((a) => a.aggregatorCode),
        glAccounts: glAccounts ?? []
      }))
    );
  }
}
