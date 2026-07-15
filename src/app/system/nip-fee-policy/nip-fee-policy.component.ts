/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../environments/environment';

import { NipFeeBand, NipFeePreview, NipFeeSchedule } from './nip-fee-policy.model';
import { NipFeePolicyService } from './nip-fee-policy.service';

@Component({
  selector: 'mifosx-nip-fee-policy',
  templateUrl: './nip-fee-policy.component.html',
  styleUrls: ['./nip-fee-policy.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatIconButton
  ]
})
export class NipFeePolicyComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private nipFeePolicyService = inject(NipFeePolicyService);

  currencyCode = '';
  currencies: { code: string; name?: string }[] = [];
  readonly form = this.formBuilder.group({
    currencyCode: [
      { value: this.currencyCode, disabled: true },
      Validators.required
    ],
    vatRate: [
      0,
      [
        Validators.required,
        Validators.min(Number.EPSILON),
        Validators.max(0.99999999)
      ]
    ],
    bands: this.formBuilder.array<FormGroup>([], Validators.minLength(1))
  });

  canWrite = false;
  loading = true;
  saving = false;
  errorMessage = '';
  private loadRequestId = 0;
  private saveRequestId = 0;

  get bands(): FormArray<FormGroup> {
    return this.form.controls.bands;
  }

  get currencySelectionDisabled(): boolean {
    return this.loading || this.saving;
  }

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('READ_NIPFEEPOLICY', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }

    this.canWrite = this.hasPermission('WRITE_NIPFEEPOLICY', permissions);
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
      this.errorMessage = 'No currency is configured. Configure a currency before managing NIP fees.';
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

  addBand(): void {
    const previousFinalBand = this.bands.at(this.bands.length - 1);
    if (previousFinalBand?.controls['upperThreshold'].value === null) {
      previousFinalBand.controls['upperThreshold'].setValue(1);
    }
    this.bands.push(
      this.createBand({
        order: this.bands.length + 1,
        upperThreshold: null,
        totalFee: 0,
        vatBase: 0
      })
    );
    this.normalizeBands();
    this.form.markAsDirty();
  }

  removeBand(index: number): void {
    if (this.bands.length === 1) {
      return;
    }
    this.bands.removeAt(index);
    this.normalizeBands();
    this.form.markAsDirty();
  }

  moveBand(index: number, offset: number): void {
    const target = index + offset;
    if (target < 0 || target >= this.bands.length) {
      return;
    }
    const thresholds = this.bands.controls.map((band) => band.controls['upperThreshold'].value);
    const band = this.bands.at(index);
    this.bands.removeAt(index);
    this.bands.insert(target, band);
    this.bands.controls.forEach((row, rowIndex) => {
      row.controls['upperThreshold'].setValue(thresholds[rowIndex], { emitEvent: false });
    });
    this.normalizeBands();
    this.form.markAsDirty();
  }

  preview(index: number): NipFeePreview {
    const band = this.bands.at(index).getRawValue() as NipFeeBand;
    const vatRate = Number(this.form.controls.vatRate.value) || 0;
    const vat = this.roundHalfEven(Number(band.vatBase) * vatRate);
    return {
      vat,
      commission: this.roundHalfEven(Number(band.totalFee) - vat)
    };
  }

  scheduleIsValid(): boolean {
    const vatRate = Number(this.form.controls.vatRate.value);
    let previousThreshold = 0;
    return (
      this.bands.length > 0 &&
      this.bands.controls.every((band, index) => {
        const value = band.getRawValue() as NipFeeBand;
        const finalBand = index === this.bands.length - 1;
        const thresholdValid = finalBand
          ? value.upperThreshold === null
          : Number(value.upperThreshold) > previousThreshold;
        if (!finalBand) {
          previousThreshold = Number(value.upperThreshold);
        }
        return thresholdValid && Number(value.vatBase) * vatRate <= Number(value.totalFee);
      })
    );
  }

  save(): void {
    if (!this.canWrite || this.form.invalid || !this.scheduleIsValid() || this.saving) {
      this.form.markAllAsTouched();
      if (this.canWrite && !this.scheduleIsValid()) {
        this.errorMessage = 'labels.text.NIP fee schedule validation failed';
      }
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const currencyCode = this.currencyCode;
    const requestId = ++this.saveRequestId;
    this.nipFeePolicyService.replaceSchedule(currencyCode, this.scheduleFromForm()).subscribe({
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
    this.nipFeePolicyService.getSchedule(currencyCode).subscribe({
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
          this.errorMessage = this.canWrite ? '' : `No NIP fee schedule is configured for ${currencyCode}.`;
          this.loading = false;
          return;
        }
        this.errorMessage = this.serverMessage(error);
        this.loading = false;
      }
    });
  }

  private populateForm(schedule: NipFeeSchedule): void {
    this.form.controls.currencyCode.setValue(schedule.currencyCode);
    this.form.controls.vatRate.setValue(schedule.vatRate);
    this.bands.clear();
    schedule.bands
      .slice()
      .sort((left, right) => left.order - right.order)
      .forEach((band) => this.bands.push(this.createBand(band)));
    this.normalizeBands();
    this.form.markAsPristine();
    this.setEditing(this.canWrite);
  }

  private emptySchedule(currencyCode: string): NipFeeSchedule {
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

  private createBand(band: NipFeeBand): FormGroup {
    return this.formBuilder.group({
      order: [
        band.order,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],
      upperThreshold: [band.upperThreshold],
      totalFee: [
        band.totalFee,
        [
          Validators.required,
          Validators.min(Number.EPSILON)
        ]
      ],
      vatBase: [
        band.vatBase,
        [
          Validators.required,
          Validators.min(Number.EPSILON)
        ]
      ]
    });
  }

  private normalizeBands(): void {
    this.bands.controls.forEach((band, index) => {
      band.controls['order'].setValue(index + 1, { emitEvent: false });
      const threshold = band.controls['upperThreshold'];
      if (index === this.bands.length - 1) {
        threshold.setValue(null, { emitEvent: false });
        threshold.clearValidators();
        if (this.canWrite) {
          threshold.disable({ emitEvent: false });
        }
      } else {
        if (this.canWrite) {
          threshold.enable({ emitEvent: false });
        }
        threshold.setValidators([
          Validators.required,
          Validators.min(Number.EPSILON)
        ]);
      }
      threshold.updateValueAndValidity({ emitEvent: false });
    });
  }

  private scheduleFromForm(): NipFeeSchedule {
    const value = this.form.getRawValue();
    return {
      currencyCode: this.currencyCode,
      vatRate: Number(value.vatRate),
      bands: value.bands.map((band, index) => ({
        order: index + 1,
        upperThreshold: index === value.bands.length - 1 ? null : Number(band.upperThreshold),
        totalFee: Number(band.totalFee),
        vatBase: Number(band.vatBase)
      }))
    };
  }

  private setEditing(enabled: boolean): void {
    if (enabled) {
      this.form.controls.vatRate.enable({ emitEvent: false });
      this.bands.enable({ emitEvent: false });
      this.normalizeBands();
      return;
    }
    this.form.controls.vatRate.disable({ emitEvent: false });
    this.bands.disable({ emitEvent: false });
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
      'Unable to load or save the NIP fee policy. Please try again.'
    );
  }

  private roundHalfEven(value: number, scale = 8): number {
    const factor = 10 ** scale;
    const scaled = value * factor;
    const floor = Math.floor(scaled);
    const fraction = scaled - floor;
    if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.abs(scaled)) {
      return (floor % 2 === 0 ? floor : floor + 1) / factor;
    }
    return Math.round(scaled) / factor;
  }
}
