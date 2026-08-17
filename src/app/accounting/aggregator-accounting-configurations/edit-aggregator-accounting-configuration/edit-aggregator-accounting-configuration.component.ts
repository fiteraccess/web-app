/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AccountingService } from '../../accounting.service';
import { GLAccount } from 'app/shared/models/general.model';
import { GlAccountSelectorComponent } from 'app/shared/accounting/gl-account-selector/gl-account-selector.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import {
  buildAggregatorAccountingReplacement,
  createAggregatorAccountingEditForm,
  getAggregatorAccountingGlAccountOptions,
  AggregatorAccountingForm
} from '../aggregator-accounting-configuration-form.model';
import {
  AggregatorAccountingConfiguration,
  AggregatorAccountingCommandResult,
  normalizeAggregatorCode
} from '../aggregator-accounting-configuration.model';

/** Replaces an aggregator accounting configuration while retaining its immutable aggregator code (AB-510). */
@Component({
  selector: 'mifosx-edit-aggregator-accounting-configuration',
  templateUrl: './edit-aggregator-accounting-configuration.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    GlAccountSelectorComponent
  ]
})
export class EditAggregatorAccountingConfigurationComponent {
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: AggregatorAccountingForm;
  glAccounts: GLAccount[] = [];

  constructor() {
    const data = this.route.snapshot.data as {
      aggregatorAccountingConfiguration: AggregatorAccountingConfiguration;
      aggregatorAccountingGlAccounts: GLAccount[];
    };
    this.form = createAggregatorAccountingEditForm(data.aggregatorAccountingConfiguration);
    this.form.controls.aggregatorCode.disable();
    this.glAccounts = data.aggregatorAccountingGlAccounts ?? [];
  }

  get accountOptions(): GLAccount[] {
    return getAggregatorAccountingGlAccountOptions(this.glAccounts);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const aggregatorCode = normalizeAggregatorCode(this.form.controls.aggregatorCode.value);
    this.accountingService
      .upsertAggregatorAccountingConfiguration(aggregatorCode, buildAggregatorAccountingReplacement(this.form))
      .subscribe((result) => {
        this.navigateToConfiguration(result, aggregatorCode);
      });
  }

  private navigateToConfiguration(result: AggregatorAccountingCommandResult, submittedAggregatorCode: string): void {
    this.router.navigate([
      '/accounting/aggregator-accounting-configurations/view',
      result.resourceIdentifier ?? submittedAggregatorCode
    ]);
  }
}
