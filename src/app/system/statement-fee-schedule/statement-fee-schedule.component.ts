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
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../environments/environment';

import { StatementFeeSchedule } from './statement-fee-schedule.model';
import { StatementFeeScheduleService } from './statement-fee-schedule.service';

/**
 * AB-339: admin screen for the signed e-statement fee + VAT — "configurable without a code release." Every
 * schedule here has exactly one flat band, unlike NIP's fee policy which supports multiple amount-tiered bands,
 * so this form asks for the two numbers ops actually thinks in (fee amount, VAT %) rather than the raw
 * totalFee/vatBase band shape.
 */
@Component({
  selector: 'mifosx-statement-fee-schedule',
  templateUrl: './statement-fee-schedule.component.html',
  styleUrls: ['./statement-fee-schedule.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent
  ]
})
export class StatementFeeScheduleComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private statementFeeScheduleService = inject(StatementFeeScheduleService);

  currencyCode = '';
  currencies: { code: string; name?: string }[] = [];
  readonly form = this.formBuilder.group({
    currencyCode: [
      { value: this.currencyCode, disabled: true },
      Validators.required
    ],
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

  canWrite = false;
  loading = true;
  saving = false;
  errorMessage = '';
  private loadRequestId = 0;
  private saveRequestId = 0;

  get currencySelectionDisabled(): boolean {
    return this.loading || this.saving;
  }

  get vatAmount(): number {
    const feeAmount = Number(this.form.controls.feeAmount.value) || 0;
    const vatRate = this.vatRateFraction();
    return this.round(feeAmount * vatRate);
  }

  get totalFee(): number {
    const feeAmount = Number(this.form.controls.feeAmount.value) || 0;
    return this.round(feeAmount + this.vatAmount);
  }

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('READ_STATEMENTFEESCHEDULE', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }

    this.canWrite = this.hasPermission('WRITE_STATEMENTFEESCHEDULE', permissions);
    this.setEditing(this.canWrite);
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
    this.form.controls.currencyCode.setValue(this.currencyCode);
    this.loadSchedule();
  }

  onCurrencyChange(change: MatSelectChange | string): void {
    const nextCurrencyCode = (typeof change === 'string' ? change : change.value)?.trim().toUpperCase();
    if (!nextCurrencyCode || nextCurrencyCode === this.currencyCode || this.saving) {
      this.restoreCurrencySelection(change);
      return;
    }

    if (this.form.dirty && !window.confirm('You have unsaved changes. Discard them and switch currencies?')) {
      this.restoreCurrencySelection(change);
      return;
    }

    this.currencyCode = nextCurrencyCode;
    this.errorMessage = '';
    this.populateForm(this.emptySchedule(nextCurrencyCode));
    this.loadSchedule();
  }

  save(): void {
    if (!this.canWrite || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const currencyCode = this.currencyCode;
    const requestId = ++this.saveRequestId;
    this.statementFeeScheduleService.replaceSchedule(currencyCode, this.scheduleFromForm()).subscribe({
      next: (schedule) => {
        if (requestId !== this.saveRequestId || currencyCode !== this.currencyCode) {
          return;
        }
        this.populateForm(schedule);
        this.saving = false;
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.saveRequestId || currencyCode !== this.currencyCode) {
          return;
        }
        this.errorMessage = this.serverMessage(error);
        this.saving = false;
      }
    });
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
        this.populateForm(schedule);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.loadRequestId || currencyCode !== this.currencyCode) {
          return;
        }
        if (error.status === 404) {
          this.populateForm(this.emptySchedule(currencyCode));
          this.errorMessage = this.canWrite ? '' : `No statement fee schedule is configured for ${currencyCode}.`;
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
    this.form.controls.currencyCode.setValue(schedule.currencyCode);
    this.form.controls.feeAmount.setValue(band?.vatBase ?? 0);
    this.form.controls.vatRatePercent.setValue(this.round(schedule.vatRate * 100, 6));
    this.form.markAsPristine();
    this.setEditing(this.canWrite);
  }

  private emptySchedule(currencyCode: string): StatementFeeSchedule {
    return {
      currencyCode,
      vatRate: 0,
      bands: [{ order: 1, upperThreshold: null, totalFee: 0, vatBase: 0 }]
    };
  }

  private restoreCurrencySelection(change: MatSelectChange | string): void {
    if (typeof change !== 'string') {
      change.source.value = this.currencyCode;
    }
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

  private setEditing(enabled: boolean): void {
    if (enabled) {
      this.form.controls.feeAmount.enable({ emitEvent: false });
      this.form.controls.vatRatePercent.enable({ emitEvent: false });
      return;
    }
    this.form.controls.feeAmount.disable({ emitEvent: false });
    this.form.controls.vatRatePercent.disable({ emitEvent: false });
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
      'Unable to load or save the statement fee schedule. Please try again.'
    );
  }

  private round(value: number, scale = 2): number {
    const factor = 10 ** scale;
    return Math.round(value * factor) / factor;
  }
}
