/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatTabChangeEvent, MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { SystemService } from '../system.service';
import { TranslateService } from '@ngx-translate/core';
import { ManageSchedulerJobsComponent } from './scheduler-jobs/manage-scheduler-jobs.component';
import { WorkflowJobsComponent } from './workflow-jobs/workflow-jobs.component';
import { CobWorkflowComponent } from './cob-workflow/cob-workflow.component';
import { SynapseJobsComponent } from './synapse-jobs/synapse-jobs.component';
import { canReadSynapseJobs } from './synapse-jobs/synapse-jobs-permissions';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Tab indexes; the Synapse Jobs tab comes last so the Fineract tabs keep theirs. */
const COB_TAB_INDEX = 2;
const SYNAPSE_TAB_INDEX = 3;

@Component({
  selector: 'mifosx-manage-jobs',
  templateUrl: './manage-jobs.component.html',
  styleUrls: ['./manage-jobs.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTabGroup,
    MatTab,
    MatTabContent,
    ManageSchedulerJobsComponent,
    WorkflowJobsComponent,
    CobWorkflowComponent,
    SynapseJobsComponent
  ]
})
export class ManageJobsComponent {
  private systemService = inject(SystemService);
  private translateService = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private authenticationService = inject(AuthenticationService);

  /** Synapse Jobs tab shown only to users who may read Synapse jobs. */
  readonly canReadSynapseJobs = canReadSynapseJobs(this.authenticationService.getCredentials()?.permissions ?? []);

  /** `?tab=synapse` (the Synapse job history's Back) opens the Synapse Jobs tab. */
  readonly initialTabIndex =
    this.canReadSynapseJobs && this.route.snapshot.queryParamMap.get('tab') === 'synapse' ? SYNAPSE_TAB_INDEX : 0;

  /** Process running flag */
  isCatchUpRunning = true;

  onJobTabChange(event: MatTabChangeEvent) {
    if (event.index === COB_TAB_INDEX) {
      this.systemService.getCOBCatchUpStatus().subscribe((response: any) => {
        this.isCatchUpRunning = response.isCatchUpRunning;
      });
    }
  }

  title(label: string) {
    return this.translateService.instant('labels.inputs.' + label);
  }
}
