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
  createAggregatorAccountingForm,
  getAggregatorAccountingGlAccountOptions,
  AggregatorAccountingForm
} from '../aggregator-accounting-configuration-form.model';
import {
  AggregatorAccountingCommandResult,
  normalizeAggregatorCode
} from '../aggregator-accounting-configuration.model';

/** Creates an aggregator accounting configuration through an aggregator-code-addressed upsert (AB-510). */
@Component({
  selector: 'mifosx-create-aggregator-accounting-configuration',
  templateUrl: './create-aggregator-accounting-configuration.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    GlAccountSelectorComponent
  ]
})
export class CreateAggregatorAccountingConfigurationComponent {
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form: AggregatorAccountingForm = createAggregatorAccountingForm();
  glAccounts: GLAccount[] = [];
  // Computed once per load, not as a getter: `[glAccountList]` re-binds on every change-detection
  // pass, and a getter returning a fresh filtered array each time makes GlAccountSelectorComponent's
  // ngOnChanges treat it as "changed" continuously, which keeps resetting its own search filter.
  accountOptions: GLAccount[] = [];

  constructor() {
    this.route.data.subscribe((data: { aggregatorAccountingGlAccounts: GLAccount[] }) => {
      this.glAccounts = data.aggregatorAccountingGlAccounts ?? [];
      this.accountOptions = getAggregatorAccountingGlAccountOptions(this.glAccounts);
    });
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
