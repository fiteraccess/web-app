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
  buildNipSwitchAccountingReplacement,
  createNipSwitchAccountingForm,
  getNipSwitchAccountingGlAccountOptions,
  NipSwitchAccountingForm
} from '../nip-switch-accounting-configuration-form.model';
import {
  NIP_SWITCH_ACCOUNTING_DIRECTIONS,
  NipSwitchAccountingCommandResult,
  normalizeNipSwitchAccountingSwitchId
} from '../nip-switch-accounting-configuration.model';

/** Creates a NIP switch accounting configuration through a switch-ID-addressed upsert. */
@Component({
  selector: 'mifosx-create-nip-switch-accounting-configuration',
  templateUrl: './create-nip-switch-accounting-configuration.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    GlAccountSelectorComponent
  ]
})
export class CreateNipSwitchAccountingConfigurationComponent {
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly directions = NIP_SWITCH_ACCOUNTING_DIRECTIONS;
  form: NipSwitchAccountingForm = createNipSwitchAccountingForm();
  glAccounts: GLAccount[] = [];

  constructor() {
    this.route.data.subscribe((data: { nipSwitchAccountingGlAccounts: GLAccount[] }) => {
      this.glAccounts = data.nipSwitchAccountingGlAccounts ?? [];
    });
  }

  accountOptions(
    field:
      | 'switchPayableGlAccountId'
      | 'switchFeeGlAccountId'
      | 'commissionIncomeGlAccountId'
      | 'switchReceivableGlAccountId'
  ): GLAccount[] {
    return getNipSwitchAccountingGlAccountOptions(this.glAccounts, field);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const switchId = normalizeNipSwitchAccountingSwitchId(this.form.controls.switchId.value);
    this.accountingService
      .upsertNipSwitchAccountingConfiguration(switchId, buildNipSwitchAccountingReplacement(this.form))
      .subscribe((result) => {
        this.navigateToConfiguration(result, switchId);
      });
  }

  private navigateToConfiguration(result: NipSwitchAccountingCommandResult, submittedSwitchId: string): void {
    this.router.navigate([
      '/accounting/nip-switch-accounting-configurations/view',
      result.resourceIdentifier ?? submittedSwitchId
    ]);
  }
}
