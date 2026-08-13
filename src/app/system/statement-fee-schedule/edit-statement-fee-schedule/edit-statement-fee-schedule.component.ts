/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatCardTitle } from '@angular/material/card';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../../environments/environment';

import { StatementFeeSchedule } from '../statement-fee-schedule.model';
import { StatementFeeScheduleService } from '../statement-fee-schedule.service';

/**
 * AB-339: edit page for the signed e-statement fee + VAT, reached from the view page's Edit button. The
 * currency comes from the `currency` query param (set by the view page); direct navigation without one falls
 * back to the first configured currency, matching the view page's own default. Every schedule here has
 * exactly one flat band, so this form asks for the two numbers ops actually thinks in (fee amount, VAT %)
 * rather than the raw totalFee/vatBase band shape.
 */
@Component({
  selector: 'mifosx-edit-statement-fee-schedule',
  templateUrl: './edit-statement-fee-schedule.component.html',
  styleUrls: ['./edit-statement-fee-schedule.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardTitle
  ]
})
export class EditStatementFeeScheduleComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private statementFeeScheduleService = inject(StatementFeeScheduleService);

  currencyCode = '';
  readonly form = this.formBuilder.group({
    feeAmount: [
      0,
      [
        Validators.required,
        Validators.min(Number.EPSILON)
      ]
    ],
    vatRatePercent: [
      0,
      [
        Validators.required,
        Validators.min(Number.EPSILON),
        Validators.max(99.999999)
      ]
    ]
  });

  loading = true;
  saving = false;
  errorMessage = '';

  get vatAmount(): number {
    const feeAmount = Number(this.form.controls.feeAmount.value) || 0;
    return this.round(feeAmount * this.vatRateFraction());
  }

  get totalFee(): number {
    const feeAmount = Number(this.form.controls.feeAmount.value) || 0;
    return this.round(feeAmount + this.vatAmount);
  }

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('WRITE_STATEMENTFEESCHEDULE', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }

    const selectedCurrencies = (this.route.snapshot.data['currencies']?.selectedCurrencyOptions || [])
      .map((currency: { code?: string }) => currency.code?.trim().toUpperCase() || '')
      .filter((code: string) => code);
    const requestedCurrency = this.route.snapshot.queryParamMap.get('currency')?.trim().toUpperCase();
    this.currencyCode =
      requestedCurrency && selectedCurrencies.includes(requestedCurrency)
        ? requestedCurrency
        : selectedCurrencies[0] || '';

    if (!this.currencyCode) {
      this.errorMessage = 'No currency is configured. Configure a currency before managing the statement fee.';
      this.loading = false;
      return;
    }
    this.loadSchedule();
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.statementFeeScheduleService.replaceSchedule(this.currencyCode, this.scheduleFromForm()).subscribe({
      next: () => {
        this.saving = false;
        this.navigateToView();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.serverMessage(error);
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.navigateToView();
  }

  private navigateToView(): void {
    this.router.navigate(['../'], { relativeTo: this.route, queryParams: { currency: this.currencyCode } });
  }

  private loadSchedule(): void {
    this.loading = true;
    this.errorMessage = '';
    this.statementFeeScheduleService.getSchedule(this.currencyCode).subscribe({
      next: (schedule) => {
        this.populateForm(schedule);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.populateForm(this.emptySchedule(this.currencyCode));
          this.loading = false;
          return;
        }
        this.errorMessage = this.serverMessage(error);
        this.loading = false;
      }
    });
  }

  private populateForm(schedule: StatementFeeSchedule): void {
    const band = schedule.bands[0];
    this.form.controls.feeAmount.setValue(band?.vatBase ?? 0);
    this.form.controls.vatRatePercent.setValue(this.round(schedule.vatRate * 100, 6));
    this.form.markAsPristine();
  }

  private emptySchedule(currencyCode: string): StatementFeeSchedule {
    return {
      currencyCode,
      vatRate: 0,
      bands: [{ order: 1, upperThreshold: null, totalFee: 0, vatBase: 0 }]
    };
  }

  private scheduleFromForm(): StatementFeeSchedule {
    return {
      currencyCode: this.currencyCode,
      vatRate: this.vatRateFraction(),
      bands: [
        {
          order: 1,
          upperThreshold: null,
          totalFee: this.totalFee,
          vatBase: Number(this.form.controls.feeAmount.value) || 0
        }
      ]
    };
  }

  private vatRateFraction(): number {
    return (Number(this.form.controls.vatRatePercent.value) || 0) / 100;
  }

  private hasPermission(permission: string, permissions: string[]): boolean {
    if (!environment.productionModeEnableRBAC || permissions.includes('ALL_FUNCTIONS')) {
      return true;
    }
    return permissions.includes(permission);
  }

  private serverMessage(error: HttpErrorResponse): string {
    return (
      error.error?.errors?.[0]?.defaultUserMessage ||
      error.error?.defaultUserMessage ||
      error.error?.message ||
      'Unable to load or save the statement fee schedule. Please try again.'
    );
  }

  private round(value: number, scale = 2): number {
    const factor = 10 ** scale;
    return Math.round(value * factor) / factor;
  }
}
