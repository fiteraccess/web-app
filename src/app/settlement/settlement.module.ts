/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { NgModule } from '@angular/core';

/** Custom Modules */
import { SettlementRoutingModule } from './settlement-routing.module';

/** Custom Components */
import { OperationsHealthComponent } from './operations-health/operations-health.component';
import { OpsOverviewComponent } from './operations-health/overview/ops-overview.component';
import { OpsStepTabComponent } from './operations-health/step-tab/ops-step-tab.component';

/**
 * Settlement Module
 *
 * Screens about settlement and end of day with Access Bank. The components are standalone.
 */
@NgModule({
  imports: [
    SettlementRoutingModule,
    OperationsHealthComponent,
    OpsOverviewComponent,
    OpsStepTabComponent
  ]
})
export class SettlementModule {}
