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
import { EodGlMapping, EodJob } from './eod-gl-mapping.model';

/** Resolves one EOD GL mirror mapping row from its route job and logical name. */
@Injectable()
export class EodGlMappingResolver {
  private accountingService = inject(AccountingService);

  resolve(route: ActivatedRouteSnapshot): Observable<EodGlMapping> {
    return this.accountingService.getEodGlMapping(
      route.paramMap.get('job') as EodJob,
      route.paramMap.get('logicalName') ?? ''
    );
  }
}
