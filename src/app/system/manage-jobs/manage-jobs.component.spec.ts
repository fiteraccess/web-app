/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTab, MatTabContent, MatTabGroup } from '@angular/material/tabs';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../environments/environment';
import { SystemService } from '../system.service';
import { ManageJobsComponent } from './manage-jobs.component';

/** The Fineract tabs pull in charting libraries Jest cannot load; their content is not under test here. */
jest.mock('./scheduler-jobs/manage-scheduler-jobs.component', () => ({ ManageSchedulerJobsComponent: class {} }));
jest.mock('./workflow-jobs/workflow-jobs.component', () => ({ WorkflowJobsComponent: class {} }));
jest.mock('./cob-workflow/cob-workflow.component', () => ({ CobWorkflowComponent: class {} }));

@Component({ selector: 'mifosx-synapse-jobs', template: 'synapse jobs' })
class SynapseJobsStubComponent {}

describe('Manage Jobs tabs', () => {
  const rbac = environment.productionModeEnableRBAC;
  let catchUpChecks: number;

  afterEach(() => (environment.productionModeEnableRBAC = rbac));

  function create(permissions: string[], tab: string | null = null): ComponentFixture<ManageJobsComponent> {
    environment.productionModeEnableRBAC = true;
    catchUpChecks = 0;
    TestBed.configureTestingModule({
      imports: [
        ManageJobsComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideNoopAnimations(),
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(tab ? { tab } : {}) } } },
        {
          provide: SystemService,
          useValue: { getCOBCatchUpStatus: () => (catchUpChecks++, of({ isCatchUpRunning: false })) }
        }
      ]
    });
    TestBed.overrideComponent(ManageJobsComponent, {
      set: {
        imports: [
          ...STANDALONE_SHARED_IMPORTS,
          MatTabGroup,
          MatTab,
          MatTabContent,
          SynapseJobsStubComponent
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }
    });
    const fixture = TestBed.createComponent(ManageJobsComponent);
    fixture.detectChanges();
    return fixture;
  }

  function tabGroup(fixture: ComponentFixture<ManageJobsComponent>): MatTabGroup {
    return fixture.debugElement.query(By.directive(MatTabGroup)).componentInstance;
  }

  it('adds the Synapse Jobs tab after COB for users who may read Synapse jobs', () => {
    const fixture = create(['READ_SYNAPSEJOB']);

    expect(tabGroup(fixture)._tabs.map((tab) => tab.textLabel)).toEqual([
      'labels.inputs.Scheduler Jobs',
      'labels.inputs.Workflow Jobs',
      'labels.inputs.COB',
      'labels.inputs.Synapse Jobs'
    ]);
    expect(tabGroup(fixture).selectedIndex).toBe(0);
  });

  it('leaves the Synapse Jobs tab out for everyone else', () => {
    const fixture = create(['READ_SCHEDULER'], 'synapse');

    expect(tabGroup(fixture)._tabs.length).toBe(3);
    expect(tabGroup(fixture).selectedIndex).toBe(0);
  });

  it('opens on the Synapse Jobs tab when coming back from a job history', () => {
    const fixture = create(['ALL_FUNCTIONS'], 'synapse');

    expect(tabGroup(fixture).selectedIndex).toBe(3);
  });

  it('still checks the COB catch-up status on the COB tab only', () => {
    const fixture = create(['ALL_FUNCTIONS']);

    fixture.componentInstance.onJobTabChange({ index: 3, tab: null });
    expect(catchUpChecks).toBe(0);
    fixture.componentInstance.onJobTabChange({ index: 2, tab: null });
    expect(catchUpChecks).toBe(1);
  });
});
