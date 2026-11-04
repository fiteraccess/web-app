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
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import translations from '../../../../assets/translations/en-US.json';
import { SynapseJobsComponent } from './synapse-jobs.component';
import { SynapseJobs } from './synapse-jobs.model';
import { jobsFixture } from './testing/synapse-jobs.fixture';

const JOBS = '/api/v1/admin/jobs';

describe('Synapse Jobs tab', () => {
  let fixture: ComponentFixture<SynapseJobsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SynapseJobsComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([])
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

  it('loads the jobs on init and lists them sorted by name, with the time they were read in Lagos', () => {
    load();

    expect(jobRows().map((row) => row.getAttribute('data-job'))).toEqual([
      'autosave-sweep',
      'cdc-relay',
      'eod-orchestrator',
      'settlement-collapse'
    ]);
    expect(text(page().querySelector('.as-of'))).toBe('As of 04 Nov 2026 11:00:00 (Lagos)');
  });

  it('shows name, description, module, schedule, last run, next run, failures and node count', () => {
    load();

    const cells = Array.from(rowOf('settlement-collapse').querySelectorAll('td')).map(text);
    expect(cells[0]).toContain('settlement-collapse');
    expect(cells[0]).toContain('Collapses accepted pay-window batches into journals');
    expect(cells[1]).toBe('access');
    expect(cells[2]).toBe('Every 5 s when idle');
    expect(cells[4]).toBe('04 Nov 10:58:00 synapse-7f9c-abc · 37 processed');
    expect(rowOf('settlement-collapse').querySelector('.last-run fa-icon').classList).toContain('success');
    expect(cells[5]).toBe('04 Nov 11:00:01');
    expect(cells[6]).toBe('0');
    expect(cells[7]).toBe('2');
    expect(rowOf('eod-orchestrator').querySelector('.last-run fa-icon').classList).toContain('fail');
  });

  it('maps each status to its label and colour, and highlights failing and overdue jobs', () => {
    load();

    const status = (name: string) => rowOf(name).querySelector('.status');
    expect(
      [
        'settlement-collapse',
        'eod-orchestrator',
        'cdc-relay',
        'autosave-sweep'
      ].map((name) => [
        text(status(name)),
        status(name).className.match(/status-[a-z-]+/)[0]
      ])
    ).toEqual([
      [
        'OK',
        'status-ok'
      ],
      [
        'Failing',
        'status-failing'
      ],
      [
        'Overdue',
        'status-overdue'
      ],
      [
        'Not running',
        'status-not-running'
      ]
    ]);
    expect(
      jobRows()
        .filter((row) => row.classList.contains('job-error'))
        .map((row) => row.getAttribute('data-job'))
    ).toEqual([
      'cdc-relay',
      'eod-orchestrator'
    ]);
  });

  it('links each job to its run history', () => {
    load();

    expect(rowOf('settlement-collapse').querySelector('a.history').getAttribute('href')).toBe(
      '/system/manage-jobs/synapse/settlement-collapse/history'
    );
  });

  it('expands a row to show its nodes, muting nodes that are not live, and collapses it again', () => {
    load();
    expect(page().querySelector('table.nodes')).toBeNull();

    rowOf('settlement-collapse').click();
    fixture.detectChanges();

    const nodeRows = Array.from(page().querySelectorAll<HTMLElement>('tr.node-row'));
    expect(nodeRows.map((row) => text(row.querySelector('td')))).toEqual([
      'synapse-7f9c-abc',
      'synapse-7f9c-def'
    ]);
    expect(nodeRows.map((row) => row.classList.contains('muted'))).toEqual([
      false,
      true
    ]);
    const cells = Array.from(nodeRows[0].querySelectorAll('td')).map(text);
    expect(cells).toEqual([
      'synapse-7f9c-abc',
      'Live',
      '04 Nov 10:59:56',
      'Idle',
      '04 Nov 11:00:01',
      '0',
      ''
    ]);
    expect(text(nodeRows[1].querySelectorAll('td')[1])).toBe('Not live');

    rowOf('settlement-collapse').click();
    fixture.detectChanges();
    expect(page().querySelector('table.nodes')).toBeNull();
  });

  it('marks an overdue node and truncates a long node error, keeping the whole of it in the tooltip', () => {
    load();

    rowOf('cdc-relay').click();
    fixture.detectChanges();
    expect(text(page().querySelector('tr.node-row .status-overdue'))).toBe('Overdue');

    rowOf('eod-orchestrator').click();
    fixture.detectChanges();
    const error = page().querySelector<HTMLElement>('tr.node-row td.last-error');
    expect(text(error)).toBe(`${'Fineract refused the close: '.padEnd(80, 'x')}…`);
    const tooltip = fixture.debugElement.query(By.css('tr.node-row td.last-error')).injector.get(MatTooltip);
    expect(tooltip.message).toBe('Fineract refused the close: '.padEnd(120, 'x'));
    expect(text(page().querySelector('tr.node-row td.fail'))).toBe('Failed');
  });

  it('reads the jobs again on Refresh, keeping the open row open', () => {
    load();
    rowOf('settlement-collapse').click();
    fixture.detectChanges();

    page().querySelector<HTMLButtonElement>('button.refresh').click();
    http.expectOne(JOBS).flush(jobsFixture());
    fixture.detectChanges();

    expect(fixture.componentInstance.expanded?.name).toBe('settlement-collapse');
    expect(page().querySelectorAll('tr.node-row')).toHaveLength(2);
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
