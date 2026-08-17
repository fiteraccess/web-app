/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { BillingFeeComponent, BillingFeeSchedule } from '../billing-fee-config.model';

/** Displays one billing fee schedule read-only, with an Edit button leading to the edit page (AB-510). */
@Component({
  selector: 'mifosx-view-billing-fee-config',
  templateUrl: './view-billing-fee-config.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow
  ]
})
export class ViewBillingFeeConfigComponent {
  schedule: BillingFeeSchedule;

  private route = inject(ActivatedRoute);

  constructor() {
    this.route.data.subscribe((data: { schedule: BillingFeeSchedule }) => {
      this.schedule = data.schedule;
    });
  }

  ratePercentOrFlat(component: BillingFeeComponent): string {
    return component.rateType === 'PERCENT' ? `${this.round(component.rate * 100, 6)}%` : `${component.rate}`;
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
