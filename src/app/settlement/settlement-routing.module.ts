/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** Routing Imports */
import { Route } from '../core/route/route.service';

/** Custom Components */
import { OperationsHealthComponent } from './operations-health/operations-health.component';
import { OpsOverviewComponent } from './operations-health/overview/ops-overview.component';
import { OpsStepTabComponent } from './operations-health/step-tab/ops-step-tab.component';

/** Custom Guards */
import { opsHealthReadGuard } from './operations-health/ops-health-permissions';

/** Custom Models */
import { OPS_TABS } from './operations-health/ops-health-presentation';

/** One route per step tab; the step is read from `data.step`. */
const stepRoutes: Routes = OPS_TABS.filter((tab) => tab.step !== null).map((tab) => ({
  path: tab.path,
  component: OpsStepTabComponent,
  data: { title: 'Operations Health', breadcrumb: tab.label, step: tab.step }
}));

/** Settlement Routes */
const routes: Routes = [
  Route.withShell([
    {
      path: 'settlement',
      data: { title: 'Settlement', breadcrumb: 'Settlement', addBreadcrumbLink: false },
      children: [
        {
          path: 'operations-health',
          component: OperationsHealthComponent,
          canActivate: [opsHealthReadGuard],
          data: { title: 'Operations Health', breadcrumb: 'Operations Health' },
          children: [
            {
              path: '',
              redirectTo: 'overview',
              pathMatch: 'full'
            },
            {
              path: 'overview',
              component: OpsOverviewComponent,
              data: { title: 'Operations Health', breadcrumb: 'Overview' }
            },
            ...stepRoutes
          ]
        }
      ]
    }
  ])
];

/**
 * Settlement Routing Module
 *
 * Configures the settlement routes.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettlementRoutingModule {}
