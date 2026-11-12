/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { FinancialYear } from './financial-year.model';
import { FinancialYearsService } from './financial-years.service';

/** Resolves every financial year. */
@Injectable()
export class FinancialYearsResolver {
  private financialYearsService = inject(FinancialYearsService);

  resolve(): Observable<FinancialYear[]> {
    return this.financialYearsService.getFinancialYears();
  }
}
