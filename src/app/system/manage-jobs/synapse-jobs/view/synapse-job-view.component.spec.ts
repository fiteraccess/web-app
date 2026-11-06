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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, convertToParamMap, provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';

import translations from '../../../../../assets/translations/en-US.json';
import { SynapseJobLookup, lookupOf, synapseJobResolver } from '../synapse-job.resolver';
import { SynapseJobs } from '../synapse-jobs.model';
import { jobsFixture, runFixture } from '../testing/synapse-jobs.fixture';
import { SynapseJobViewComponent } from './synapse-job-view.component';

const JOBS = '/api/v1/admin/jobs';

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
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } },
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
    setUp(lookupOf('settlement-collapse', jobsFixture()));

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
    setUp(lookupOf('settlement-collapse', jobsFixture()));

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
    setUp(lookupOf('settlement-collapse', jobsFixture()));

    routeData.next({ synapseJob: lookupOf('settlement-eoc', jobsFixture()) });
    fixture.detectChanges();

    expect(details()[0]).toEqual([
      'Job Name',
      'Settlement End Of Cycle'
    ]);
    expect(page().querySelector('.nodes .empty')).not.toBeNull();
  });

  it('lists each node, muting nodes that are not live', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture()));

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

  it('shows a Run now that found nothing to do as neither worked nor failed', () => {
    const jobs = jobsFixture();
    jobs.jobs[0].lastRun = runFixture({ outcome: 'IDLE', trigger: 'MANUAL', processed: 0 });
    setUp(lookupOf(jobs.jobs[0].name, jobs));

    const icon = page().querySelector('.previous-run fa-icon');
    expect(icon.classList.contains('muted')).toBe(true);
    expect(icon.classList.contains('fail')).toBe(false);
    expect(fixture.debugElement.query(By.css('.previous-run fa-icon')).injector.get(MatTooltip).message).toBe(
      'Nothing to do'
    );
  });

  it('marks an overdue node', () => {
    setUp(lookupOf('inbox-job', jobsFixture()));

    expect(text(page().querySelector('tr.node-row .status-overdue'))).toBe('Overdue');
  });

  it('truncates a long node error, keeping the whole of it in the tooltip', () => {
    setUp(lookupOf('flexcube-outbox-drain', jobsFixture()));

    expect(text(page().querySelector('tr.node-row td.last-error'))).toBe(`${'Connection refused: '.padEnd(80, 'x')}…`);
    const tooltip = fixture.debugElement.query(By.css('tr.node-row td.last-error')).injector.get(MatTooltip);
    expect(tooltip.message).toBe('Connection refused: '.padEnd(120, 'x'));
  });

  it('says when no node has reported the job', () => {
    setUp(lookupOf('settlement-eoc', jobsFixture()));

    expect(text(page().querySelector('.nodes .empty'))).toBe('No node has reported this job yet.');
  });

  it('links to the run history', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture()));

    expect(page().querySelector('button.view-history')).not.toBeNull();
  });

  it('reads the job again on Refresh', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture()));
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
    setUp(lookupOf('no-such-job', jobsFixture()));

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
      limits: null,
      loadError: 'FORBIDDEN'
    });

    expect(text(page().querySelector('.load-error'))).toBe('You do not have permission to view Synapse jobs.');
  });

  it('goes back to the Synapse Jobs tab of Manage Jobs', () => {
    setUp(lookupOf('settlement-collapse', jobsFixture()));
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    page().querySelector<HTMLButtonElement>('button.back').click();

    expect(navigate).toHaveBeenCalledWith(['/system/manage-jobs'], { queryParams: { tab: 'synapse' } });
  });
});

describe('Synapse job page controls', () => {
  let fixture: ComponentFixture<SynapseJobViewComponent>;
  let http: HttpTestingController;
  let dialogAnswer: unknown;
  let opened: jest.SpyInstance;
  let told: jest.SpyInstance;

  function setUp(jobs: SynapseJobs, name: string): void {
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
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions: ['ALL_FUNCTIONS'] }) } },
        { provide: ActivatedRoute, useValue: { data: new BehaviorSubject({ synapseJob: lookupOf(name, jobs) }) } }]
    });
    TestBed.inject(FaIconLibrary).addIconPacks(fas);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SynapseJobViewComponent);
    dialogAnswer = true;
    opened = jest
      .spyOn(fixture.debugElement.injector.get(MatDialog), 'open')
      .mockImplementation(() => ({ afterClosed: () => of(dialogAnswer) }) as never);
    told = jest.spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open').mockReturnValue(null);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  function button(css: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`button.${css}`);
  }

  function prompt(): { heading: string; message: string } {
    return opened.mock.calls.at(-1)[1].data;
  }

  function answerThenReread(method: string, url: string): { body: unknown } {
    const request = http.expectOne((r) => r.method === method && r.url === url);
    request.flush({});
    http.expectOne(JOBS).flush(jobsFixture());
    return { body: request.request.body };
  }

  it('offers Run Now, Pause and Edit Schedule on a job that takes controls', () => {
    setUp(jobsFixture(), 'settlement-collapse');

    expect(button('run-now')).not.toBeNull();
    expect(button('pause').textContent.trim()).toBe('Pause');
    expect(button('edit-schedule')).not.toBeNull();
  });

  it('offers no controls on a job the console depends on', () => {
    const jobs = jobsFixture();
    jobs.jobs[0].cadence = 'FIXED';
    setUp(jobs, 'settlement-collapse');

    expect(button('run-now')).toBeNull();
    expect(button('pause')).toBeNull();
    expect(button('edit-schedule')).toBeNull();
  });

  it('offers Resume on a paused job and will not run it', () => {
    const jobs = jobsFixture();
    jobs.jobs[0].control.paused = true;
    setUp(jobs, 'settlement-collapse');

    expect(button('pause').textContent.trim()).toBe('Resume');
    expect(button('run-now').disabled).toBe(true);
  });

  it('asks before Run Now, then asks Synapse and reads the job again', () => {
    setUp(jobsFixture(), 'settlement-collapse');

    button('run-now').click();

    expect(prompt().heading).toBe('Run Collapse Settlement Batches now');
    answerThenReread('POST', `${JOBS}/settlement-collapse/run`);
    expect(told).toHaveBeenCalledWith('Run requested; a node runs it within a few seconds.', 'Close', {
      duration: 6000
    });
  });

  it('sends nothing when the operator cancels', () => {
    setUp(jobsFixture(), 'settlement-collapse');
    dialogAnswer = false;

    button('pause').click();

    http.expectNone(`${JOBS}/settlement-collapse/state`);
  });

  it('pauses against the version the operator saw', () => {
    setUp(jobsFixture(), 'settlement-collapse');

    button('pause').click();

    expect(prompt().message).toBe(
      'The job stops on every node until it is resumed. A run already in progress finishes.'
    );
    expect(answerThenReread('PUT', `${JOBS}/settlement-collapse/state`).body).toEqual({ paused: true, version: 0 });
  });

  it('names what pausing the end of cycle holds up', () => {
    setUp(jobsFixture(), 'settlement-eoc');
    dialogAnswer = false;

    button('pause').click();

    expect(prompt().message).toBe(
      'No settlement cycle is captured while it is paused. A run already in progress finishes.'
    );
  });

  it("explains a refused change in Synapse's words", () => {
    setUp(jobsFixture(), 'settlement-collapse');

    button('pause').click();
    http
      .expectOne(`${JOBS}/settlement-collapse/state`)
      .flush(
        { defaultUserMessage: 'The job was changed by someone else; refresh and try again' },
        { status: 409, statusText: 'Conflict' }
      );
    http.expectOne(JOBS).flush(jobsFixture());

    expect(told).toHaveBeenCalledWith('The job was changed by someone else; refresh and try again', 'Close', {
      duration: 6000
    });
  });

  it('saves a new schedule with the version the operator saw', () => {
    setUp(jobsFixture(), 'settlement-eoc');
    dialogAnswer = {
      timesOfDay: [
        '09:00',
        '16:00'
      ]
    };

    button('edit-schedule').click();

    expect(answerThenReread('PUT', `${JOBS}/settlement-eoc/schedule`).body).toEqual({
      timesOfDay: [
        '09:00',
        '16:00'
      ],
      version: 2
    });
  });

  it('shows the default beside a changed schedule, and who changed it', () => {
    setUp(jobsFixture(), 'settlement-eoc');
    const text = (css: string) => fixture.nativeElement.querySelector(css).textContent.replace(/\s+/g, ' ').trim();

    expect(text('dd.schedule .default')).toBe('Default: 08:40, 12:00, 15:00, 18:10');
    expect(text('dd.changed')).toBe('mifos · 04 Nov 2026 08:00:00');
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
      limits: null,
      loadError: 'FORBIDDEN'
    });
  });
});
