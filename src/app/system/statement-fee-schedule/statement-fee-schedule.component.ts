/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { MatCardTitle } from '@angular/material/card';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../environments/environment';

import { StatementFeeSchedule } from './statement-fee-schedule.model';
import { StatementFeeScheduleService } from './statement-fee-schedule.service';

/**
 * AB-339: read-only view of the signed e-statement fee + VAT, per currency. Editing happens on a dedicated
 * `edit` route reached via the Edit button, so this page owns only currency selection and display.
 */
@Component({
  selector: 'mifosx-statement-fee-schedule',
  templateUrl: './statement-fee-schedule.component.html',
  styleUrls: ['./statement-fee-schedule.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatCardTitle
  ]
})
export class StatementFeeScheduleComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private statementFeeScheduleService = inject(StatementFeeScheduleService);

  currencyCode = '';
  currencies: { code: string; name?: string }[] = [];
  feeAmount = 0;
  vatRatePercent = 0;

  loading = true;
  errorMessage = '';
  private loadRequestId = 0;

  get vatAmount(): number {
    return this.round(this.feeAmount * this.vatRateFraction());
  }

  get totalFee(): number {
    return this.round(this.feeAmount + this.vatAmount);
  }

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('READ_STATEMENTFEESCHEDULE', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }

    const selectedCurrencies = this.route.snapshot.data['currencies']?.selectedCurrencyOptions || [];
    this.currencies = selectedCurrencies
      .map((currency: { code?: string; name?: string }) => ({
        ...currency,
        code: currency.code?.trim().toUpperCase() || ''
      }))
      .filter((currency: { code: string }) => currency.code);
    this.currencyCode = this.currencies[0]?.code || '';
    if (!this.currencyCode) {
      this.errorMessage = 'No currency is configured. Configure a currency before managing the statement fee.';
      this.loading = false;
      return;
    }
    this.loadSchedule();
  }

  onCurrencyChange(change: MatSelectChange | string): void {
    const nextCurrencyCode = (typeof change === 'string' ? change : change.value)?.trim().toUpperCase();
    if (!nextCurrencyCode || nextCurrencyCode === this.currencyCode) {
      return;
    }

    this.currencyCode = nextCurrencyCode;
    this.errorMessage = '';
    this.populateFrom(this.emptySchedule(nextCurrencyCode));
    this.loadSchedule();
  }

  private loadSchedule(): void {
    this.loading = true;
    this.errorMessage = '';
    const currencyCode = this.currencyCode;
    const requestId = ++this.loadRequestId;
    this.statementFeeScheduleService.getSchedule(currencyCode).subscribe({
      next: (schedule) => {
        if (requestId !== this.loadRequestId || currencyCode !== this.currencyCode) {
          return;
        }
        this.populateFrom(schedule);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.loadRequestId || currencyCode !== this.currencyCode) {
          return;
        }
        if (error.status === 404) {
          this.populateFrom(this.emptySchedule(currencyCode));
          this.errorMessage = `No statement fee schedule is configured for ${currencyCode}.`;
          this.loading = false;
          return;
        }
        this.errorMessage = this.serverMessage(error);
        this.loading = false;
      }
    });
  }

  private populateFrom(schedule: StatementFeeSchedule): void {
    const band = schedule.bands[0];
    this.feeAmount = band?.vatBase ?? 0;
    this.vatRatePercent = this.round(schedule.vatRate * 100, 6);
  }

  private emptySchedule(currencyCode: string): StatementFeeSchedule {
    return {
      currencyCode,
      vatRate: 0,
      bands: [{ order: 1, upperThreshold: null, totalFee: 0, vatBase: 0 }]
    };
  }

  private vatRateFraction(): number {
    return this.vatRatePercent / 100;
  }

  private hasPermission(permission: string, permissions: string[]): boolean {
    if (!environment.productionModeEnableRBAC || permissions.includes('ALL_FUNCTIONS')) {
      return true;
    }
    return (
      permissions.includes(permission) || (permission.startsWith('READ_') && permissions.includes('ALL_FUNCTIONS_READ'))
    );
  }

  private serverMessage(error: HttpErrorResponse): string {
    return (
      error.error?.errors?.[0]?.defaultUserMessage ||
      error.error?.defaultUserMessage ||
      error.error?.message ||
      'Unable to load the statement fee schedule. Please try again.'
    );
  }

  private round(value: number, scale = 2): number {
    const factor = 10 ** scale;
    return Math.round(value * factor) / factor;
  }
}
