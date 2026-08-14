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
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../../environments/environment';

import { BillingFeeComponent, BillingFeeSchedule } from '../billing-fee-config.model';
import { BillingFeeConfigService } from '../billing-fee-config.service';

/**
 * AB-510: create/edit page for one (billerCode, productCode) fee schedule. Mirrors
 * `NipFeePolicyComponent`'s FormArray pattern (there: `bands`, here: `components`) — same
 * add/remove, dirty-tracking, permission-gated editing, and server-message-on-error shape.
 *
 * In create mode (route `billing-fee-configs/new`, no resolved data) `billerCode`/`productCode` are
 * editable text inputs, since they form the immutable composite key. In edit mode (route
 * `billing-fee-configs/:billerCode/:productCode`) they render as disabled — case in point:
 * `NipFeePolicyComponent` disables `currencyCode` in the same way since it's the resolved schedule's
 * own key, not something a save re-targets.
 */
@Component({
  selector: 'mifosx-edit-billing-fee-config',
  templateUrl: './edit-billing-fee-config.component.html',
  styleUrls: ['./edit-billing-fee-config.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatIconButton
  ]
})
export class EditBillingFeeConfigComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private billingFeeConfigService = inject(BillingFeeConfigService);

  isCreate = true;
  canWrite = false;
  saving = false;
  errorMessage = '';

  readonly form = this.formBuilder.group({
    billerCode: [
      '',
      Validators.required
    ],
    productCode: [
      '',
      Validators.required
    ],
    aggregatorCode: [
      '',
      Validators.required
    ],
    components: this.formBuilder.array<FormGroup>([], Validators.minLength(1))
  });

  get components(): FormArray<FormGroup> {
    return this.form.controls.components;
  }

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('READ_BILLINGFEECONFIG', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }
    this.canWrite = this.hasPermission('WRITE_BILLINGFEECONFIG', permissions);

    const resolved = this.route.snapshot.data['schedule'] as BillingFeeSchedule | undefined;
    this.isCreate = !resolved;
    this.populateForm(resolved ?? this.emptySchedule());
  }

  addComponent(): void {
    this.components.push(this.createComponent(this.emptyComponent()));
    this.form.markAsDirty();
  }

  removeComponent(index: number): void {
    if (this.components.length === 1) {
      return;
    }
    this.components.removeAt(index);
    this.form.markAsDirty();
  }

  /** The `componentCode` values already in the form, for the "depends on" select — excludes `self`. */
  dependencyOptions(selfIndex: number): string[] {
    return this.components.controls
      .map((control, index) => ({ index, code: (control.value.componentCode as string)?.trim() }))
      .filter(({ index, code }) => index !== selfIndex && !!code)
      .map(({ code }) => code);
  }

  save(): void {
    if (!this.canWrite || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const schedule = this.scheduleFromForm();
    this.billingFeeConfigService.putSchedule(schedule.billerCode, schedule.productCode, schedule).subscribe({
      next: (saved) => {
        this.saving = false;
        this.isCreate = false;
        this.populateForm(saved);
        this.router.navigate([
          '/system/billing-fee-configs',
          saved.billerCode,
          saved.productCode
        ]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.errorMessage = this.serverMessage(error);
      }
    });
  }

  private populateForm(schedule: BillingFeeSchedule): void {
    this.form.controls.billerCode.setValue(schedule.billerCode);
    this.form.controls.productCode.setValue(schedule.productCode);
    this.form.controls.aggregatorCode.setValue(schedule.aggregatorCode);
    this.components.clear();
    schedule.components.forEach((component) => this.components.push(this.createComponent(component)));
    if (this.components.length === 0) {
      this.components.push(this.createComponent(this.emptyComponent()));
    }
    this.form.markAsPristine();
    this.setEditing();
  }

  private emptySchedule(): BillingFeeSchedule {
    return {
      billerCode: '',
      productCode: '',
      aggregatorCode: '',
      components: [this.emptyComponent()]
    };
  }

  private emptyComponent(): BillingFeeComponent {
    return {
      componentCode: '',
      dependsOnComponentCode: null,
      rate: 0,
      rateType: 'PERCENT',
      enabled: true,
      tbTransferCode: 0
    };
  }

  private createComponent(component: BillingFeeComponent): FormGroup {
    return this.formBuilder.group({
      componentCode: [
        component.componentCode,
        Validators.required
      ],
      dependsOnComponentCode: [component.dependsOnComponentCode],
      rate: [
        component.rate,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      rateType: [
        component.rateType,
        Validators.required
      ],
      enabled: [component.enabled],
      tbTransferCode: [
        component.tbTransferCode,
        [
          Validators.required,
          Validators.min(1)
        ]
      ]
    });
  }

  private scheduleFromForm(): BillingFeeSchedule {
    const value = this.form.getRawValue();
    return {
      billerCode: value.billerCode.trim().toUpperCase(),
      productCode: value.productCode.trim().toUpperCase(),
      aggregatorCode: value.aggregatorCode.trim().toUpperCase(),
      components: value.components.map((component) => ({
        componentCode: component.componentCode.trim().toUpperCase(),
        dependsOnComponentCode: component.dependsOnComponentCode?.trim()?.toUpperCase() || null,
        rate: Number(component.rate),
        rateType: component.rateType,
        enabled: !!component.enabled,
        tbTransferCode: Number(component.tbTransferCode)
      }))
    };
  }

  private setEditing(): void {
    if (this.canWrite) {
      this.form.enable({ emitEvent: false });
      if (!this.isCreate) {
        this.form.controls.billerCode.disable({ emitEvent: false });
        this.form.controls.productCode.disable({ emitEvent: false });
      }
      return;
    }
    this.form.disable({ emitEvent: false });
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
      'Unable to load or save the billing fee schedule. Please try again.'
    );
  }
}
