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
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import translations from '../../../../assets/translations/en-US.json';
import { SynapseRunErrorDialogComponent } from './error-dialog/synapse-run-error-dialog.component';
import { SynapseJobsComponent } from './synapse-jobs.component';
import { SynapseJobs } from './synapse-jobs.model';
import { jobsFixture } from './testing/synapse-jobs.fixture';

const JOBS = '/api/v1/admin/jobs';

describe('Synapse Jobs tab', () => {
  let fixture: ComponentFixture<SynapseJobsComponent>;
  let http: HttpTestingController;
  let dialogs: { component: unknown; data: unknown }[];

  beforeEach(async () => {
    dialogs = [];
    await TestBed.configureTestingModule({
      imports: [
        SynapseJobsComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
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
    fixture = TestBed.createComponent(SynapseJobsComponent);
  });

  afterEach(() => http.verify());

  function load(jobs: SynapseJobs = jobsFixture()): HTMLElement {
    fixture.detectChanges();
    http.expectOne(JOBS).flush(jobs);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  function page(): HTMLElement {
    return fixture.nativeElement;
  }

  function jobRows(): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>('tr.job-row'));
  }

  function rowOf(name: string): HTMLElement {
    return page().querySelector<HTMLElement>(`tr.job-row[data-job="${name}"]`);
  }

  function text(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function cellsOf(name: string): string[] {
    return Array.from(rowOf(name).querySelectorAll('td')).map(text);
  }

  function indicator(name: string, column: string): string {
    return rowOf(name).querySelector(`td.mat-column-${column} div`).className;
  }

  it('loads the jobs on init and lists them by display name, with the time they were read in Lagos', () => {
    load();

    expect(jobRows().map((row) => row.getAttribute('data-job'))).toEqual([
      'settlement-collapse',
      'flexcube-outbox-drain',
      'inbox-job',
      'settlement-eoc'
    ]);
    expect(text(page().querySelector('.as-of'))).toBe('As of 04 Nov 2026 11:00:00 (Lagos)');
  });

  it('shows the Scheduler Jobs columns only, naming each job by its display name', () => {
    load();

    expect(Array.from(page().querySelectorAll('th')).map(text)).toEqual([
      'Name',
      'Active',
      'Previous Run',
      'Next Run',
      'Currently Running',
      'Error Log'
    ]);
    expect(cellsOf('settlement-collapse')).toEqual([
      'Collapse Settlement Batches',
      '',
      '04 Nov 2026 10:58:00',
      '04 Nov 2026 11:00:01',
      '',
      ''
    ]);
    expect(text(page())).not.toContain('Collapses accepted pay-window batches into journals');
    expect(rowOf('settlement-collapse').querySelector('td.mat-column-previousRunTime fa-icon').classList).toContain(
      'success'
    );
    expect(rowOf('flexcube-outbox-drain').querySelector('td.mat-column-previousRunTime fa-icon').classList).toContain(
      'fail'
    );
  });

  it('marks whether each job is active and currently running', () => {
    load();

    expect(indicator('settlement-collapse', 'active')).toBe('currently-running');
    expect(indicator('settlement-collapse', 'currentlyRunning')).toBe('currently-running');
    expect(indicator('inbox-job', 'currentlyRunning')).toBe('not-currently-running');
    expect(indicator('settlement-eoc', 'active')).toBe('not-currently-running');
  });

  it('opens the error of a failed last run from the Error Log column', () => {
    load();

    expect(
      jobRows()
        .filter((row) => row.querySelector('button.errorlog'))
        .map((row) => row.getAttribute('data-job'))
    ).toEqual(['flexcube-outbox-drain']);
    rowOf('flexcube-outbox-drain').querySelector<HTMLButtonElement>('button.errorlog').click();

    expect(dialogs).toEqual([
      { component: SynapseRunErrorDialogComponent, data: jobsFixture().jobs[1].lastRun }]);
  });

  it('highlights failing and overdue jobs', () => {
    load();

    expect(
      jobRows()
        .filter((row) => row.classList.contains('job-error'))
        .map((row) => row.getAttribute('data-job'))
    ).toEqual([
      'flexcube-outbox-drain',
      'inbox-job'
    ]);
  });

  it('opens the job page from its row', () => {
    load();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    rowOf('settlement-collapse').querySelector<HTMLElement>('td.mat-column-displayName').click();

    expect(String(navigate.mock.calls[0][0])).toBe('/system/manage-jobs/synapse/settlement-collapse');
  });

  it('filters by display name or job key', () => {
    load();

    fixture.componentInstance.applyFilter(' Deliver ');
    fixture.detectChanges();
    expect(jobRows().map((row) => row.getAttribute('data-job'))).toEqual([
      'flexcube-outbox-drain',
      'inbox-job'
    ]);

    fixture.componentInstance.applyFilter('settlement-eoc');
    fixture.detectChanges();
    expect(jobRows().map((row) => row.getAttribute('data-job'))).toEqual(['settlement-eoc']);
  });

  it('reads the jobs again on Refresh', () => {
    load();

    page().querySelector<HTMLButtonElement>('button.refresh').click();
    http.expectOne(JOBS).flush(jobsFixture());
    fixture.detectChanges();

    expect(jobRows()).toHaveLength(4);
  });

  it('says so when the user may not read Synapse jobs, without a retry', () => {
    fixture.detectChanges();
    http.expectOne(JOBS).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(text(page().querySelector('.load-error'))).toBe('You do not have permission to view Synapse jobs.');
    expect(page().querySelector('button.retry')).toBeNull();
  });

  it('offers a retry when Synapse cannot be read, and shows the jobs once it answers', () => {
    fixture.detectChanges();
    http.expectOne(JOBS).flush(null, { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();

    expect(text(page().querySelector('.load-error'))).toContain('Synapse jobs could not be loaded.');
    page().querySelector<HTMLButtonElement>('button.retry').click();
    http.expectOne(JOBS).flush(jobsFixture());
    fixture.detectChanges();

    expect(page().querySelector('.load-error')).toBeNull();
    expect(jobRows()).toHaveLength(4);
  });
});
