/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

/** Custom Models */
import { BillingFeeSchedule, BillingFeeScheduleList } from './billing-fee-config.model';

/** Custom Services */
import { BillingFeeConfigService } from './billing-fee-config.service';

/** Resolves the full schedule list for the AB-510 admin list page. */
@Injectable()
export class BillingFeeConfigListResolver {
  private service = inject(BillingFeeConfigService);

  resolve(_route: ActivatedRouteSnapshot): Observable<BillingFeeScheduleList> {
    return this.service.listSchedules();
  }
}

/**
 * Resolves one schedule (drill-in edit page) by its (billerCode, productCode) route params. The
 * `:billerCode`-only route (no `productCode` segment) resolves the biller's default schedule —
 * `paramMap.get('productCode')` returns `null` when that segment is absent from the matched route.
 */
@Injectable()
export class BillingFeeConfigResolver {
  private service = inject(BillingFeeConfigService);

  resolve(route: ActivatedRouteSnapshot): Observable<BillingFeeSchedule> {
    const billerCode = route.paramMap.get('billerCode') as string;
    const productCode = route.paramMap.get('productCode');
    return this.service.getSchedule(billerCode, productCode);
  }
}
