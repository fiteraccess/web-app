/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsStepSummaryComponent } from '../step-summary/ops-step-summary.component';
import { OpsCallsPanelComponent } from '../calls-panel/ops-calls-panel.component';
import { OpsStepDetailComponent } from '../step-detail/ops-step-detail.component';
import { OpsHealthStore } from '../ops-health.store';
import { StepId } from '../ops-health.model';
import { OPS_TABS, hasCallsPanel, tabOf } from '../ops-health-presentation';

/** One step of the day (the route's `data.step`): its counts, its stored rows and its calls with Access. */
@Component({
  selector: 'mifosx-ops-step-tab',
  templateUrl: './ops-step-tab.component.html',
  styleUrls: ['./ops-step-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    OpsMarkComponent,
    OpsStepSummaryComponent,
    OpsCallsPanelComponent,
    OpsStepDetailComponent
  ]
})
export class OpsStepTabComponent {
  readonly store = inject(OpsHealthStore);
  private route = inject(ActivatedRoute);

  readonly stepId: StepId = this.route.snapshot.data['step'];
  readonly tab = tabOf(this.stepId);
  readonly hasCalls = hasCallsPanel(this.stepId);

  private readonly index = OPS_TABS.indexOf(this.tab);
  readonly previous = OPS_TABS[this.index - 1] ?? null;
  readonly next = OPS_TABS[this.index + 1] ?? null;

  readonly step = computed(() => this.store.health()?.steps.find((step) => step.id === this.stepId) ?? null);
}
