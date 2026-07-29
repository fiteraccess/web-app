/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GLAccount } from 'app/shared/models/general.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { nipSwitchAccountingGlAccountLabel } from '../nip-switch-accounting-gl-account-label';
import { NipSwitchAccountingConfiguration } from '../nip-switch-accounting-configuration.model';

/** Displays one NIP switch accounting configuration and its resolved GL labels. */
@Component({
  selector: 'mifosx-view-nip-switch-accounting-configuration',
  templateUrl: './view-nip-switch-accounting-configuration.component.html',
  imports: [...STANDALONE_SHARED_IMPORTS]
})
export class ViewNipSwitchAccountingConfigurationComponent {
  configuration: NipSwitchAccountingConfiguration;
  glAccounts: GLAccount[] = [];

  private route = inject(ActivatedRoute);

  constructor() {
    this.route.data.subscribe(
      (data: {
        nipSwitchAccountingConfiguration: NipSwitchAccountingConfiguration;
        nipSwitchAccountingGlAccounts: GLAccount[];
      }) => {
        this.configuration = data.nipSwitchAccountingConfiguration;
        this.glAccounts = data.nipSwitchAccountingGlAccounts ?? [];
      }
    );
  }

  glAccountLabel(accountId: number | null | undefined): string {
    return nipSwitchAccountingGlAccountLabel(accountId, this.glAccounts);
  }
}
