/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
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
import { DeleteDialogComponent } from '../../../shared/delete-dialog/delete-dialog.component';
import { BillingFeeComponent, BillingFeeSchedule } from '../billing-fee-config.model';
import { BillingFeeConfigService } from '../billing-fee-config.service';

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
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private billingFeeConfigService = inject(BillingFeeConfigService);

  constructor() {
    this.route.data.subscribe((data: { schedule: BillingFeeSchedule }) => {
      this.schedule = data.schedule;
    });
  }

  ratePercentOrFlat(component: BillingFeeComponent): string {
    return component.rateType === 'PERCENT' ? `${this.round(component.rate * 100, 6)}%` : `${component.rate}`;
  }

  /** Absolute, not relative to the current route - a relative ['edit'] link doubles up (view/X/edit/edit)
   * if the current route is already the edit page (e.g. a stale/duplicated URL) rather than the view page. */
  editRoute(): string[] {
    if (!this.schedule) {
      return ['/system/billing-fee-configs'];
    }
    return this.schedule.productCode ? [
          '/system/billing-fee-configs/view',
          this.schedule.billerCode,
          this.schedule.productCode,
          'edit'
        ] : [
          '/system/billing-fee-configs/view',
          this.schedule.billerCode,
          'edit'
        ];
  }

  deleteSchedule(): void {
    const context = this.schedule.productCode
      ? `billing fee configuration "${this.schedule.billerCode}/${this.schedule.productCode}"`
      : `billing fee configuration "${this.schedule.billerCode}" (default schedule)`;
    const ref = this.dialog.open(DeleteDialogComponent, { data: { deleteContext: context } });
    ref.afterClosed().subscribe((response: { delete?: boolean }) => {
      if (!response?.delete) return;
      this.billingFeeConfigService
        .deleteSchedule(this.schedule.billerCode, this.schedule.productCode)
        .subscribe(() => this.router.navigate(['/system/billing-fee-configs']));
    });
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
