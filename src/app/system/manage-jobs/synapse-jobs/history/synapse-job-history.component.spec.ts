/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import translations from '../../../../../assets/translations/en-US.json';
import { SynapseRunErrorDialogComponent } from '../error-dialog/synapse-run-error-dialog.component';
import { SynapseJobLookup, lookupOf } from '../synapse-job.resolver';
import { SynapseJobRunsPage } from '../synapse-jobs.model';
import { jobsFixture, runsPageFixture } from '../testing/synapse-jobs.fixture';
import { SynapseJobHistoryComponent } from './synapse-job-history.component';

const JOBS = '/api/v1/admin/jobs';
const RUNS = `${JOBS}/settlement-collapse/runs`;

describe('Synapse job history page', () => {
  let fixture: ComponentFixture<SynapseJobHistoryComponent>;
  let http: HttpTestingController;
  let dialogs: { component: unknown; data: unknown }[];
  let routeData: BehaviorSubject<{ synapseJob: SynapseJobLookup }>;

  beforeEach(async () => {
    dialogs = [];
    await TestBed.configureTestingModule({
      imports: [
        SynapseJobHistoryComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            parent: {
              data: (routeData = new BehaviorSubject({
                synapseJob: lookupOf('settlement-collapse', jobsFixture())
              }))
            }
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: (component: unknown, config: { data: unknown }) => dialogs.push({ component, data: config.data })
          }
        }
      ]
    }).compileComponents();
    TestBed.inject(FaIconLibrary).addIconPacks(fas);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SynapseJobHistoryComponent);
  });

  afterEach(() => http.verify());

  function expectRuns(): TestRequest {
    return http.expectOne((r) => r.url === RUNS);
  }

  function params(req: TestRequest): Record<string, string | null> {
    const p = req.request.params;
    return { offset: p.get('offset'), limit: p.get('limit'), outcome: p.get('outcome'), node: p.get('node') };
  }

  function open(page: SynapseJobRunsPage = runsPageFixture()): TestRequest {
    fixture.detectChanges();
    const req = expectRuns();
    req.flush(page);
    fixture.detectChanges();
    return req;
  }

  function page(): HTMLElement {
    return fixture.nativeElement;
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function rows(): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>('tr.mat-mdc-row'));
  }

  function paginator(): MatPaginator {
    return fixture.debugElement.query(By.directive(MatPaginator)).componentInstance;
  }

  it('asks for the first 50 runs of the job named in the URL, unfiltered', () => {
    const req = open();

    expect(params(req)).toEqual({ offset: '0', limit: '50', outcome: null, node: null });
    expect(text(page().querySelector('h2'))).toBe('Run history: Collapse Settlement Batches');
    expect(paginator().length).toBe(120);
    expect(paginator().pageSizeOptions).toEqual([
      25,
      50,
      100,
      200
    ]);
  });

  it('shows each run in Lagos time with outcome, trigger, ticks, processed and busy time', () => {
    open();

    const [
      worked,
      failed
    ] = rows().map((row) => Array.from(row.querySelectorAll('td')).map(text));
    expect(worked).toEqual([
      '04 Nov 2026 10:58:00',
      '04 Nov 2026 10:59:30',
      'synapse-7f9c-abc',
      '',
      'Scheduled',
      '4',
      '37',
      '1.2 s',
      '',
      ''
    ]);
    expect(failed.slice(4, 8)).toEqual([
      'Manual',
      '2',
      '0',
      '1 min 35 s'
    ]);
    expect(failed[9]).toBe(`${'Connection refused: '.padEnd(80, 'y')}…`);
    expect(rows().map((row) => row.querySelector('td[data-outcome] fa-icon').classList.contains('success'))).toEqual([
      true,
      false
    ]);
    expect(rows().map((row) => row.classList.contains('job-error'))).toEqual([
      false,
      true
    ]);
  });

  it('offers the nodes that reported the job in the node filter', () => {
    open();

    expect(fixture.componentInstance.nodeIds).toEqual([
      'synapse-7f9c-abc',
      'synapse-7f9c-def'
    ]);
  });

  it('asks the server for the page the paginator moves to, with its size', () => {
    open();

    paginator().page.emit({ pageIndex: 2, pageSize: 25, length: 120, previousPageIndex: 0 });
    expect(params(expectRuns())).toEqual({ offset: '50', limit: '25', outcome: null, node: null });
  });

  it('re-queries from the first page when a filter changes', () => {
    open();
    paginator().page.emit({ pageIndex: 1, pageSize: 50, length: 120, previousPageIndex: 0 });
    expectRuns().flush(runsPageFixture());

    fixture.componentInstance.outcome.setValue('FAILED');
    expect(params(expectRuns())).toEqual({ offset: '0', limit: '50', outcome: 'FAILED', node: null });

    fixture.componentInstance.node.setValue('synapse-7f9c-def');
    expect(params(expectRuns())).toEqual({ offset: '0', limit: '50', outcome: 'FAILED', node: 'synapse-7f9c-def' });

    fixture.componentInstance.outcome.setValue(null);
    expect(params(expectRuns())).toEqual({ offset: '0', limit: '50', outcome: null, node: 'synapse-7f9c-def' });
  });

  it('opens the whole error of a failed run in a dialog', () => {
    open();

    rows()[1].querySelector<HTMLButtonElement>('button.error-link').click();

    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].component).toBe(SynapseRunErrorDialogComponent);
    expect(dialogs[0].data).toEqual(runsPageFixture().pageItems[1]);
  });

  it('says when no runs match the filters', () => {
    open({ totalFilteredRecords: 0, pageItems: [] });

    expect(text(page().querySelector('td.empty'))).toBe('No runs match these filters.');
  });

  it('offers a retry when the runs cannot be read, and keeps the filters working afterwards', () => {
    fixture.detectChanges();
    expectRuns().flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text(page().querySelector('.load-error'))).toContain('Synapse job runs could not be loaded.');
    page().querySelector<HTMLButtonElement>('button.retry').click();
    expectRuns().flush(runsPageFixture());
    fixture.detectChanges();
    expect(page().querySelector('.load-error')).toBeNull();

    fixture.componentInstance.outcome.setValue('WORKED');
    expect(params(expectRuns()).outcome).toBe('WORKED');
  });

  it('says so when the user may not read Synapse jobs', () => {
    fixture.detectChanges();
    expectRuns().flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(text(page().querySelector('.load-error'))).toBe('You do not have permission to view Synapse jobs.');
  });

  it('follows the router to another job, starting its history afresh', () => {
    open();
    fixture.componentInstance.outcome.setValue('FAILED');
    expectRuns().flush(runsPageFixture());

    routeData.next({ synapseJob: lookupOf('inbox-job', jobsFixture()) });
    const req = http.expectOne((r) => r.url === `${JOBS}/inbox-job/runs`);
    req.flush(runsPageFixture());
    fixture.detectChanges();

    expect(params(req)).toEqual({ offset: '0', limit: '50', outcome: null, node: null });
    expect(text(page().querySelector('h2'))).toBe('Run history: Deliver Inbox Messages');
  });

  it('goes back to the job page', () => {
    open();

    expect(page().querySelector('a.back').getAttribute('href')).toBe('/system/manage-jobs/synapse/settlement-collapse');
  });
});
