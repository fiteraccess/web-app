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

import { FinancialYear } from './financial-year.model';
import { FinancialYearsService } from './financial-years.service';

/** Resolves one financial year from its route code. */
@Injectable()
export class FinancialYearResolver {
  private financialYearsService = inject(FinancialYearsService);

  resolve(route: ActivatedRouteSnapshot): Observable<FinancialYear> {
    return this.financialYearsService.getFinancialYear(route.paramMap.get('financialCycle') ?? '');
  }
}
