/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ErrorHandlerService } from 'app/core/error-handler/error-handler.service';
import { GLAccount } from 'app/shared/models/general.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { AccountingService } from '../accounting.service';
import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import {
  addNipSwitchFeeAllocation,
  buildNipSwitchConfigurationSubmission,
  createNipSwitchForm,
  NipSwitchForm,
  removeNipSwitchFeeAllocation
} from './nip-switch-form.model';
import { NipSwitchGlAccountField, nipSwitchGlAccountOptions } from './nip-switch-gl-accounts';
import {
  NipSwitchSaveCallbacks,
  NipSwitchSaveCoordinator,
  NipSwitchWorkflowMode,
  nipSwitchWorkflowFormValue
} from './nip-switch-workflow.model';

@Component({
  selector: 'mifosx-nip-switch-workflow',
  templateUrl: './nip-switch-workflow.component.html',
  styleUrl: './nip-switch-workflow.component.scss',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink
  ]
})
export class NipSwitchWorkflowComponent implements OnDestroy {
  private accountingService = inject(AccountingService);
  private errorHandler = inject(ErrorHandlerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private valueChanges: Subscription;

  readonly mode: NipSwitchWorkflowMode;
  readonly actualConfiguration?: NipSwitchConfiguration;
  readonly form: NipSwitchForm;
  readonly coordinator = new NipSwitchSaveCoordinator((switchId, replacement) =>
    this.accountingService.upsertNipSwitchConfiguration(switchId, replacement)
  );
  readonly directions = [
    'OUTBOUND',
    'INBOUND',
    'BOTH'
  ] as const;
  glAccounts: GLAccount[] = [];
  currencies: Array<{ code: string; name?: string }> = [];

  constructor() {
    const data = this.route.snapshot.data;
    this.mode = data['workflowMode'] ?? 'add';
    this.actualConfiguration = data['nipSwitch'];
    this.form = createNipSwitchForm(
      nipSwitchWorkflowFormValue(this.mode, this.actualConfiguration),
      this.mode === 'add' ? 'create' : 'edit',
      this.mode === 'resolve' && this.actualConfiguration?.configurationStatus === 'INCONSISTENT'
    );
    this.glAccounts = data['nipSwitchGlAccounts'] ?? [];
    const configuredCurrencies = data['currencies']?.selectedCurrencyOptions ?? [];
    this.currencies = configuredCurrencies.map((currency: { code: string; name?: string }) => ({
      ...currency,
      code: currency.code.trim().toUpperCase()
    }));
    this.valueChanges = this.form.valueChanges.subscribe(() => this.coordinator.invalidateRetry());
  }

  get title(): string {
    if (this.mode === 'add') {
      return 'Add NIP Switch';
    }
    return this.mode === 'edit'
      ? `Edit NIP Switch: ${this.actualConfiguration?.switchId}`
      : `Resolve mismatch: ${this.actualConfiguration?.switchId}`;
  }

  get allocations() {
    return this.form.controls.switchFeeAllocations;
  }

  get operation() {
    return this.coordinator.session.operation;
  }

  get structuredError() {
    return this.coordinator.session.structuredError;
  }

  get canRetry(): boolean {
    return this.coordinator.session.canRetry;
  }

  addAllocation(): void {
    addNipSwitchFeeAllocation(this.form);
  }

  removeAllocation(index: number): void {
    removeNipSwitchFeeAllocation(this.form, index);
  }

  accountOptions(field: NipSwitchGlAccountField): GLAccount[] {
    return nipSwitchGlAccountOptions(this.glAccounts, field);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.coordinator.save(buildNipSwitchConfigurationSubmission(this.form), this.callbacks());
  }

  retry(): void {
    this.coordinator.retry(this.callbacks());
  }

  ngOnDestroy(): void {
    this.valueChanges.unsubscribe();
    this.coordinator.invalidateRetry();
  }

  private callbacks(): NipSwitchSaveCallbacks {
    return {
      success: (response) => {
        this.errorHandler.showSuccess('NIP switch saved.');
        this.router.navigate([
          '/accounting/nip-switches/view',
          response.switchId
        ]);
      },
      structuredError: () => undefined,
      standardError: (error) => {
        this.errorHandler.handleError(error as HttpErrorResponse, 'NIP switch configuration').subscribe({
          error: () => undefined
        });
      }
    };
  }
}
