/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, convertToParamMap, provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import translations from '../../../../../assets/translations/en-US.json';
import { SynapseJobLookup, lookupOf, synapseJobResolver } from '../synapse-job.resolver';
import { jobsFixture } from '../testing/synapse-jobs.fixture';
import { SynapseJobViewComponent } from './synapse-job-view.component';

const JOBS = '/api/v1/admin/jobs';
const AS_OF = '2026-11-04T11:00:00+01:00';

describe('Synapse job page', () => {
  let fixture: ComponentFixture<SynapseJobViewComponent>;
  let http: HttpTestingController;
  let routeData: BehaviorSubject<{ synapseJob: SynapseJobLookup }>;

  function setUp(lookup: SynapseJobLookup): void {
    TestBed.configureTestingModule({
      imports: [
        SynapseJobViewComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: (routeData = new BehaviorSubject({ synapseJob: lookup })) } }]
    });
    TestBed.inject(FaIconLibrary).addIconPacks(fas);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SynapseJobViewComponent);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  function page(): HTMLElement {
    return fixture.nativeElement;
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  /** The details card as label → value pairs, left column first. */
  function details(): string[][] {
    return Array.from(page().querySelectorAll('.details .detail-row')).map((row) => [
      text(row.querySelector('dt')),
      text(row.querySelector('dd'))
    ]);
  }

  function column(name: string): string[] {
    return Array.from(page().querySelectorAll(`.detail-column.${name} dt`)).map(text);
  }

  function nodeRows(): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>('tr.node-row'));
  }

  it('shows the job details, naming it by display name and keeping its key', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));

    expect(details()).toEqual([
      [
        'Job Name',
        'Collapse Settlement Batches'
      ],
      [
        'Job key',
        'settlement-collapse'
      ],
      [
        'Description',
        'Collapses accepted pay-window batches into journals'
      ],
      [
        'Module',
        'access'
      ],
      [
        'Schedule',
        'Every 5 s when idle'
      ],
      [
        'Status',
        'OK'
      ],
      [
        'Is Active Job?',
        'Yes'
      ],
      [
        'Currently Running',
        'Yes'
      ],
      [
        'Previous Run',
        '04 Nov 2026 10:58:00 synapse-7f9c-abc · 37 processed'
      ],
      [
        'Next Run',
        '04 Nov 2026 11:00:01'
      ],
      [
        'Failures',
        '0'
      ]
    ]);
  });

  it('puts what the job is beside how it is running', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));

    expect(column('about')).toEqual([
      'Job Name',
      'Job key',
      'Description',
      'Module',
      'Schedule'
    ]);
    expect(column('state')).toEqual([
      'Status',
      'Is Active Job?',
      'Currently Running',
      'Previous Run',
      'Next Run',
      'Failures'
    ]);
  });

  it('follows the router to another job when it reuses the page', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));

    routeData.next({ synapseJob: lookupOf('settlement-eoc', jobsFixture().jobs, AS_OF) });
    fixture.detectChanges();

    expect(details()[0]).toEqual([
      'Job Name',
      'Settlement End Of Cycle'
    ]);
    expect(page().querySelector('.nodes .empty')).not.toBeNull();
  });

  it('lists each node, muting nodes that are not live', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));

    expect(nodeRows().map((row) => row.classList.contains('muted'))).toEqual([
      false,
      true
    ]);
    expect(Array.from(nodeRows()[0].querySelectorAll('td')).map(text)).toEqual([
      'synapse-7f9c-abc',
      'Live',
      'Yes',
      '04 Nov 10:59:56',
      'Worked',
      '04 Nov 11:00:01',
      '0',
      ''
    ]);
    expect(text(nodeRows()[1].querySelectorAll('td')[1])).toBe('Not live');
  });

  it('marks an overdue node', () => {
    setUp(lookupOf('inbox-job', jobsFixture().jobs, AS_OF));

    expect(text(page().querySelector('tr.node-row .status-overdue'))).toBe('Overdue');
  });

  it('truncates a long node error, keeping the whole of it in the tooltip', () => {
    setUp(lookupOf('flexcube-outbox-drain', jobsFixture().jobs, AS_OF));

    expect(text(page().querySelector('tr.node-row td.last-error'))).toBe(`${'Connection refused: '.padEnd(80, 'x')}…`);
    const tooltip = fixture.debugElement.query(By.css('tr.node-row td.last-error')).injector.get(MatTooltip);
    expect(tooltip.message).toBe('Connection refused: '.padEnd(120, 'x'));
  });

  it('says when no node has reported the job', () => {
    setUp(lookupOf('settlement-eoc', jobsFixture().jobs, AS_OF));

    expect(text(page().querySelector('.nodes .empty'))).toBe('No node has reported this job yet.');
  });

  it('links to the run history', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));

    expect(page().querySelector('button.view-history')).not.toBeNull();
  });

  it('reads the job again on Refresh', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));
    const refreshed = jobsFixture();
    refreshed.jobs[0].consecutiveFailures = 2;

    page().querySelector<HTMLButtonElement>('button.refresh').click();
    http.expectOne(JOBS).flush(refreshed);
    fixture.detectChanges();

    expect(details().at(-1)).toEqual([
      'Failures',
      '2'
    ]);
  });

  it('says so when no job has the name in the URL', () => {
    setUp(lookupOf('no-such-job', jobsFixture().jobs, AS_OF));

    expect(text(page().querySelector('.not-found'))).toBe('No Synapse job is registered under the name no-such-job.');
    expect(page().querySelector('.details')).toBeNull();
    expect(page().querySelector('button.view-history')).toBeNull();
  });

  it('says so when the user may not read Synapse jobs', () => {
    setUp({
      name: 'settlement-collapse',
      label: 'settlement-collapse',
      job: null,
      generatedAt: null,
      loadError: 'FORBIDDEN'
    });

    expect(text(page().querySelector('.load-error'))).toBe('You do not have permission to view Synapse jobs.');
  });

  it('goes back to the Synapse Jobs tab of Manage Jobs', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture().jobs, AS_OF));
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    page().querySelector<HTMLButtonElement>('button.back').click();

    expect(navigate).toHaveBeenCalledWith(['/system/manage-jobs'], { queryParams: { tab: 'synapse' } });
  });
});

describe('Synapse job resolver', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function resolve(name: string): Promise<SynapseJobLookup> {
    const route = { paramMap: convertToParamMap({ name }) } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => synapseJobResolver(route, null)) as Observable<SynapseJobLookup>;
    return firstValueFrom(result);
  }

  it('resolves the job named in the URL, labelled by its display name', async () => {
    const lookup = resolve('inbox-job');
    http.expectOne(JOBS).flush(jobsFixture());

    const resolved = await lookup;
    expect(resolved.label).toBe('Deliver Inbox Messages');
    expect(resolved.job.name).toBe('inbox-job');
  });

  it('still resolves when the read fails, labelled by the key, so the page can say why', async () => {
    const lookup = resolve('inbox-job');
    http.expectOne(JOBS).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(await lookup).toEqual({
      name: 'inbox-job',
      label: 'inbox-job',
      job: null,
      generatedAt: null,
      loadError: 'FORBIDDEN'
    });
  });
});
