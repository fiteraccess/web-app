/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../../environments/environment';

import {
  BILLING_FEE_COMPONENT_CODES,
  BILLING_FEE_COMPONENT_TB_TRANSFER_CODES,
  BillingFeeComponent,
  BillingFeeComponentCode,
  BillingFeeSchedule
} from '../billing-fee-config.model';
import { BillingFeeConfigService } from '../billing-fee-config.service';

/** Percent rates are wire-level fractions (`0.01` = 1%) but operator-facing input is a 0-100 percentage —
 * mirrors `EditStatementFeeScheduleComponent`'s `vatRatePercent` conversion at the form/wire boundary. A
 * component's rate must be strictly under 100% (Synapse rejects a PERCENT rate >= 1 as a fraction). */
function percentUnderHundred(): ValidatorFn {
  return (control: AbstractControl<number>): ValidationErrors | null => {
    const value = Number(control.value);
    return Number.isFinite(value) && value >= 100 ? { percentTooLarge: true } : null;
  };
}

/** In-form stand-in for "depends on the bill amount" (wire-level `dependsOnComponentCode: null`).
 * `mat-select` does not reliably render a `null`-valued option's text in its closed-state trigger —
 * the selection itself is correct (it shows highlighted when the panel is open), but the collapsed
 * control displays blank. Using a real string sentinel here, converted to/from `null` only at the
 * form/wire boundary, sidesteps that entirely. */
const DEPENDS_ON_AMOUNT = 'AMOUNT';

/**
 * AB-510: create/edit page for one (billerCode, productCode) fee schedule. Mirrors
 * `NipFeePolicyComponent`'s FormArray pattern (there: `bands`, here: `components`) — same
 * add/remove, dirty-tracking, permission-gated editing, and server-message-on-error shape.
 *
 * `billerCode`/`productCode` are editable in both create and edit mode. Synapse's upsert endpoint is
 * keyed by the URL path, not the body, so changing either in edit mode submits to a *new* key —
 * the original schedule is not renamed or removed. `keyChanged` surfaces that as an inline warning
 * before submit.
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

  readonly componentCodes = BILLING_FEE_COMPONENT_CODES;

  isCreate = true;
  canWrite = false;
  saving = false;
  errorMessage = '';
  private originalBillerCode = '';
  private originalProductCode: string | null = null;

  readonly form = this.formBuilder.group({
    billerCode: [
      '',
      Validators.required
    ],
    // AB-510 follow-up: optional - blank means the biller's default schedule (every product under
    // this biller resolves to it unless it has its own override).
    productCode: [''],
    aggregatorCode: [
      '',
      Validators.required
    ],
    components: this.formBuilder.array<FormGroup>([], Validators.minLength(1))
  });

  get components(): FormArray<FormGroup> {
    return this.form.controls.components;
  }

  /** Whether the operator has changed the immutable key fields away from the loaded schedule's —
   * submitting now targets a new (billerCode, productCode) rather than updating this one. */
  get keyChanged(): boolean {
    if (this.isCreate) {
      return false;
    }
    const value = this.form.getRawValue();
    return (
      value.billerCode.trim().toUpperCase() !== this.originalBillerCode ||
      this.normalizedProductCode(value.productCode) !== this.originalProductCode
    );
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
    this.originalBillerCode = resolved?.billerCode ?? '';
    this.originalProductCode = resolved?.productCode ?? null;
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
      .map((control, index) => ({ index, code: control.value.componentCode as string }))
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
        const commands = saved.productCode ? [
              '/system/billing-fee-configs/view',
              saved.billerCode,
              saved.productCode
            ] : [
              '/system/billing-fee-configs/view',
              saved.billerCode
            ];
        this.router.navigate(commands);
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.errorMessage = this.serverMessage(error);
      }
    });
  }

  private populateForm(schedule: BillingFeeSchedule): void {
    this.form.controls.billerCode.setValue(schedule.billerCode);
    this.form.controls.productCode.setValue(schedule.productCode ?? '');
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
    const group = this.formBuilder.group({
      componentCode: [
        component.componentCode,
        Validators.required
      ],
      dependsOnComponentCode: [component.dependsOnComponentCode ?? DEPENDS_ON_AMOUNT],
      rate: [
        this.toDisplayRate(component.rate, component.rateType),
        this.rateValidators(component.rateType)
      ],
      rateType: [
        component.rateType,
        Validators.required
      ],
      enabled: [component.enabled]
    });

    group.controls.rateType.valueChanges.subscribe((rateType) => {
      const currentDisplayRate = group.controls.rate.value;
      // Re-interpret the currently displayed number under the new rate type's convention rather than
      // converting it — a value the operator typed as "1" (meaning 1%) is not the same quantity as a
      // flat amount of 1, so there is no meaningful arithmetic conversion between the two conventions.
      group.controls.rate.setValidators(this.rateValidators(rateType));
      group.controls.rate.setValue(currentDisplayRate, { emitEvent: false });
      group.controls.rate.updateValueAndValidity();
    });

    return group;
  }

  private rateValidators(rateType: 'PERCENT' | 'FLAT'): ValidatorFn[] {
    return rateType === 'PERCENT' ? [
          Validators.required,
          Validators.min(0),
          percentUnderHundred()
        ] : [
          Validators.required,
          Validators.min(0)
        ];
  }

  private toDisplayRate(wireRate: number, rateType: 'PERCENT' | 'FLAT'): number {
    return rateType === 'PERCENT' ? this.round(wireRate * 100, 6) : wireRate;
  }

  private toWireRate(displayRate: number, rateType: 'PERCENT' | 'FLAT'): number {
    return rateType === 'PERCENT' ? this.round(displayRate / 100, 8) : displayRate;
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }

  /** Blank/whitespace-only input means "no product-specific override" - the biller's default. */
  private normalizedProductCode(rawProductCode: string): string | null {
    const trimmed = rawProductCode.trim().toUpperCase();
    return trimmed === '' ? null : trimmed;
  }

  private scheduleFromForm(): BillingFeeSchedule {
    const value = this.form.getRawValue();
    return {
      billerCode: value.billerCode.trim().toUpperCase(),
      productCode: this.normalizedProductCode(value.productCode),
      aggregatorCode: value.aggregatorCode.trim().toUpperCase(),
      components: value.components.map((component) => {
        const componentCode = component.componentCode as BillingFeeComponentCode;
        return {
          componentCode,
          dependsOnComponentCode:
            component.dependsOnComponentCode === DEPENDS_ON_AMOUNT ? null : component.dependsOnComponentCode,
          rate: this.toWireRate(Number(component.rate), component.rateType),
          rateType: component.rateType,
          enabled: !!component.enabled,
          tbTransferCode: BILLING_FEE_COMPONENT_TB_TRANSFER_CODES[componentCode]
        };
      })
    };
  }

  private setEditing(): void {
    if (this.canWrite) {
      this.form.enable({ emitEvent: false });
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
