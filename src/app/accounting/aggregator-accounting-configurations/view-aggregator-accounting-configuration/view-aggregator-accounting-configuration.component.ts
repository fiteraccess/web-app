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
import { nipSwitchGlAccountLabel } from '../../nip-switches/nip-switch-gl-accounts';
import { AggregatorAccountingConfiguration } from '../aggregator-accounting-configuration.model';

/** Displays one aggregator accounting configuration and its resolved GL labels (AB-510). */
@Component({
  selector: 'mifosx-view-aggregator-accounting-configuration',
  templateUrl: './view-aggregator-accounting-configuration.component.html',
  imports: [...STANDALONE_SHARED_IMPORTS]
})
export class ViewAggregatorAccountingConfigurationComponent {
  configuration: AggregatorAccountingConfiguration;
  glAccounts: GLAccount[] = [];

  private route = inject(ActivatedRoute);

  constructor() {
    this.route.data.subscribe(
      (data: {
        aggregatorAccountingConfiguration: AggregatorAccountingConfiguration;
        aggregatorAccountingGlAccounts: GLAccount[];
      }) => {
        this.configuration = data.aggregatorAccountingConfiguration;
        this.glAccounts = data.aggregatorAccountingGlAccounts ?? [];
      }
    );
  }

  glAccountLabel(accountId: number | null | undefined): string {
    return nipSwitchGlAccountLabel(accountId, this.glAccounts);
  }
}
