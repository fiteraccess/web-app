/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { DatePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker } from '@angular/material/datepicker';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { SettingsService } from 'app/settings/settings.service';
import { environment } from '../../../environments/environment';
import translations from '../../../assets/translations/en-US.json';

import { OperationsHealthComponent } from './operations-health.component';
import { OpsOverviewComponent } from './overview/ops-overview.component';
import { OpsStepTabComponent } from './step-tab/ops-step-tab.component';
import { OPS_TABS } from './ops-health-presentation';
import { AttentionItem, OpsHealth } from './ops-health.model';
import {
  EOC_COMPLETE_PAYLOAD,
  FLEX_POSTING_PAYLOAD,
  PAY_WINDOW_REFUSED_PAYLOAD,
  SETTLE_COMPLETE_PAYLOAD,
  healthFixture
} from './testing/ops-health.fixture';

const HEALTH = '/access/api/v1/ops/health';
const PAGE = '/settlement/operations-health';

const routes: Routes = [
  {
    path: 'settlement/operations-health',
    component: OperationsHealthComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OpsOverviewComponent },
      ...OPS_TABS.filter((tab) => tab.step).map((tab) => ({
        path: tab.path,
        component: OpsStepTabComponent,
        data: { step: tab.step }
      }))
    ]
  }
];

describe('Operations Health page', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let permissions: string[];
  const rbac = environment.productionModeEnableRBAC;

  beforeEach(async () => {
    permissions = ['ALL_FUNCTIONS'];
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideNativeDateAdapter(),
        DatePipe,
        { provide: AuthenticationService, useValue: { getCredentials: () => ({ permissions }) } },
        { provide: SettingsService, useValue: { dateFormat: 'dd MMMM yyyy', language: { code: 'en' } } }]
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    environment.productionModeEnableRBAC = rbac;
    harness.fixture.destroy();
  });

  async function open(url: string, health: OpsHealth | null = healthFixture()): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    if (health) {
      http.expectOne((r) => r.url === HEALTH).flush(health);
    }
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement;
  }

  function page(): HTMLElement {
    return harness.fixture.nativeElement;
  }

  function all(selector: string): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>(selector));
  }

  function rowOf(selector: string): HTMLElement {
    return page().querySelector<HTMLElement>(selector);
  }

  function marks(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('mat-icon[data-mark]')).map((icon) => icon.getAttribute('data-mark'));
  }

  function buttonNamed(text: string): HTMLButtonElement | undefined {
    return all('button').find((button) => button.textContent.trim() === text) as HTMLButtonElement;
  }

  describe('shell', () => {
    it('lets the server pick the day, then writes it into the URL without a second request', async () => {
      await harness.navigateByUrl(PAGE);
      harness.detectChanges();
      const req = http.expectOne((r) => r.url === HEALTH);
      expect(req.request.params.has('businessDate')).toBe(false);
      req.flush(healthFixture());
      harness.detectChanges();
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe(`${PAGE}/overview?businessDate=2026-10-23`);
      http.expectNone((r) => r.url === HEALTH);
    });

    it('asks for the date in the URL and keeps it on every tab link', async () => {
      await harness.navigateByUrl(`${PAGE}/overview?businessDate=2026-10-22`);
      harness.detectChanges();
      http.expectOne((r) => r.url === HEALTH && r.params.get('businessDate') === '2026-10-22').flush(healthFixture());
      harness.detectChanges();

      const tabLinks = all('a[mat-tab-link]');
      const label = (link: HTMLElement) =>
        link.textContent.replace(link.querySelector('mifosx-ops-mark')?.textContent ?? '', '').trim();
      expect(tabLinks.map(label)).toEqual([
        'Overview',
        'Pay window',
        'Settlement',
        'End of cycle',
        'Business date',
        'End of day',
        'Recon'
      ]);
      expect(tabLinks.every((link) => link.getAttribute('href').includes('businessDate=2026-10-22'))).toBe(true);
    });

    it('marks a step tab only when its step is red or amber, with a spoken name', async () => {
      const health = healthFixture();
      health.steps[3] = { ...health.steps[3], mark: 'AMBER' };
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);

      const tabLinks = all('a[mat-tab-link]');
      expect(tabLinks.map((link) => marks(link))).toEqual([
        [],
        ['RED'],
        ['RED'],
        ['RED'],
        ['AMBER'],
        ['RED'],
        []
      ]);
      const icon = tabLinks[4].querySelector('mat-icon');
      expect(icon.textContent.trim()).toBe('schedule');
      expect(icon.getAttribute('aria-label')).toBe('Amber mark');
      expect(tabLinks[1].querySelector('mat-icon').textContent.trim()).toBe('error');
    });

    it('has no headline, problem list, escalation note or verdict words on any tab', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);
      for (const tab of OPS_TABS) {
        await harness.navigateByUrl(`${PAGE}/${tab.path}?businessDate=2026-10-23`);
        harness.detectChanges();
        const textContent = page().textContent;
        expect(textContent.length).toBeGreaterThan(200);
        for (const words of [
          'All good',
          'Needs action',
          'What needs attention',
          'Caused by',
          'Who acts',
          'Next step',
          'escalation',
          'engineer'
        ]) {
          expect(textContent.toLowerCase()).not.toContain(words.toLowerCase());
        }
        expect(page().querySelector('.ops-headline')).toBeNull();
        expect(page().querySelector('mifosx-ops-problem-list')).toBeNull();
      }
      http.expectNone((r) => r.url === HEALTH);
    });

    it('warns that figures may be out of date when the server served them stale', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`, { ...healthFixture(), stale: true });

      expect(page().querySelector('.ops-stale').textContent).toContain('These figures may be out of date');
    });

    it.each([
      [
        403,
        { error: 'Access denied: missing permission READ_OPSHEALTH' },
        'You do not have permission to view Operations Health (READ_OPSHEALTH).'
      ],
      [
        404,
        {
          developerMessage: 'off',
          httpStatusCode: '404',
          defaultUserMessage: 'Operations Health is switched off',
          userMessageGlobalisationCode: 'x',
          errors: []
        },
        'Operations Health is switched off on this server.'
      ],
      [
        400,
        {
          developerMessage: 'bad',
          httpStatusCode: '400',
          defaultUserMessage: 'businessDate must not be in the future',
          userMessageGlobalisationCode: 'x',
          errors: []
        },
        'businessDate must not be in the future'
      ],
      [
        503,
        {
          developerMessage: 'busy',
          httpStatusCode: '503',
          defaultUserMessage: 'Busy, try again shortly',
          userMessageGlobalisationCode: 'error.msg.opshealth.busy',
          errors: []
        },
        'The server is busy. Try again in a minute.'
      ],
      [
        500,
        null,
        'Operations Health could not be loaded. Try again.'
      ]
    ])('explains a %s answer in plain words', async (status, body, message) => {
      await harness.navigateByUrl(`${PAGE}/overview?businessDate=2026-10-23`);
      harness.detectChanges();
      http.expectOne((r) => r.url === HEALTH).flush(body, { status, statusText: 'x' });
      harness.detectChanges();

      expect(page().querySelector('.report-error').textContent.trim()).toBe(message);
      expect(all('a[mat-tab-link]').length).toBe(0);
      expect(!!buttonNamed('Retry')).toBe(status !== 403 && status !== 404);
    });

    it('says switched off after in-app navigation, without the earlier rows', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);
      expect(all('[data-step]').length).toBe(6);

      buttonNamed('Refresh').click();
      http.expectOne((r) => r.url === HEALTH).flush(null, { status: 502, statusText: 'Bad Gateway' });
      harness.detectChanges();
      expect(all('[data-step]').length).toBe(0);

      await harness.navigateByUrl(`${PAGE}/end-of-day?businessDate=2026-10-23`);
      harness.detectChanges();
      http
        .expectOne((r) => r.url === HEALTH)
        .flush({ defaultUserMessage: 'Operations Health is switched off' }, { status: 404, statusText: 'Not Found' });
      harness.detectChanges();

      expect(page().querySelector('.report-error').textContent.trim()).toBe(
        'Operations Health is switched off on this server.'
      );
      expect(all('a[mat-tab-link]').length).toBe(0);
      expect(page().querySelector('table')).toBeNull();
    });

    it('keeps the rows and the progress bar’s slot while a refresh loads', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);
      const slot = page().querySelector('.ops-progress');
      expect(slot).not.toBeNull();
      expect(slot.querySelector('mat-progress-bar')).toBeNull();

      buttonNamed('Refresh').click();
      harness.detectChanges();
      expect(page().querySelector('.ops-progress')).toBe(slot);
      expect(slot.querySelector('mat-progress-bar')).not.toBeNull();
      expect(all('[data-step]').length).toBe(6);
      expect(all('tr[data-attention]').length).toBe(4);
      http.expectOne((r) => r.url === HEALTH).flush(healthFixture());
    });

    describe('business date calendar', () => {
      // jsdom cannot parse the CDK overlay's structural stylesheet; that one error is not the page's.
      let consoleError: jest.SpyInstance;
      beforeEach(() => {
        const original = console.error;
        consoleError = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
          if (!String(args[0]).includes('Could not parse CSS stylesheet')) {
            original(...args);
          }
        });
      });
      afterEach(() => consoleError.mockRestore());

      function picker(): MatDatepicker<Date> {
        return harness.fixture.debugElement.query(By.directive(MatDatepicker)).injector.get(MatDatepicker);
      }

      async function openPicker(): Promise<void> {
        picker().open();
        harness.detectChanges();
        await harness.fixture.whenStable();
        expect(picker().opened).toBe(true);
      }

      it('closes on Refresh', async () => {
        await open(`${PAGE}/overview?businessDate=2026-10-23`);
        await openPicker();

        buttonNamed('Refresh').click();
        harness.detectChanges();

        expect(picker().opened).toBe(false);
        http.expectOne((r) => r.url === HEALTH).flush(healthFixture());
      });

      it('closes when the date changes', async () => {
        await open(`${PAGE}/overview?businessDate=2026-10-23`);
        await openPicker();

        await harness.navigateByUrl(`${PAGE}/overview?businessDate=2026-10-22`);
        harness.detectChanges();

        expect(picker().opened).toBe(false);
        http.expectOne((r) => r.url === HEALTH && r.params.get('businessDate') === '2026-10-22').flush(healthFixture());
      });

      it('closes when another tab opens', async () => {
        await open(`${PAGE}/overview?businessDate=2026-10-23`);
        await openPicker();

        await harness.navigateByUrl(`${PAGE}/settlement?businessDate=2026-10-23`);
        harness.detectChanges();

        expect(picker().opened).toBe(false);
        http.expectNone((r) => r.url === HEALTH);
      });
    });

    it('shows a progress bar and no content on first load', async () => {
      await harness.navigateByUrl(`${PAGE}/overview?businessDate=2026-10-23`);
      harness.detectChanges();

      expect(page().querySelector('mat-progress-bar')).not.toBeNull();
      expect(page().querySelector('.ops-row')).toBeNull();
      http.expectOne((r) => r.url === HEALTH).flush(healthFixture());
    });
  });

  describe('overview', () => {
    it('lists the six steps with their marks and raw status counts', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      const steps = all('[data-step]');
      expect(steps.map((row) => row.getAttribute('data-step'))).toEqual([
        'PAY_WINDOW',
        'SETTLEMENT',
        'END_OF_CYCLE',
        'BUSINESS_DATE',
        'END_OF_DAY',
        'RECON'
      ]);
      expect(steps.map((row) => marks(row.querySelector('.ops-row-mark')))).toEqual([
        ['RED'],
        ['RED'],
        ['RED'],
        ['RED'],
        ['RED'],
        []
      ]);
      expect(Array.from(steps[0].querySelectorAll('.ops-fact')).map((fact) => fact.textContent.trim())).toEqual([
        'SETTLED 2',
        'PROCESSING 1',
        'REFUSED 2'
      ]);
      expect(steps[3].textContent).toContain('6 days behind');
      expect(steps[3].textContent).toContain('Fineract date');
      expect(steps[5].textContent).toContain('Last sweep (Lagos) 29 Oct 10:41');
      expect(steps[1].getAttribute('href')).toContain('/settlement');
    });

    it('sets marked counts apart from finished ones, without a status word', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      const payWindow = rowOf('[data-step="PAY_WINDOW"]');
      expect(
        Array.from(payWindow.querySelectorAll('.ops-fact-marked')).map((fact) => fact.getAttribute('data-value'))
      ).toEqual([
        'PROCESSING',
        'REFUSED'
      ]);
    });

    it('shows a step whose rows are all finished in plain text, with no icon', async () => {
      const health = healthFixture();
      health.steps[1] = {
        ...health.steps[1],
        mark: 'NONE',
        counts: [{ value: 'SETTLED', count: 4, mark: 'NONE' }]
      };
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);

      const settlement = rowOf('[data-step="SETTLEMENT"]');
      expect(settlement.querySelector('mat-icon')).toBeNull();
      expect(settlement.querySelector('.ops-fact-marked')).toBeNull();
      expect(settlement.querySelector('.ops-row-facts').textContent.trim()).toBe('SETTLED 4');
    });

    it('shows the stored check error on a step whose inputs failed, without hiding the others', async () => {
      const health = healthFixture();
      health.steps[5] = {
        ...health.steps[5],
        mark: 'AMBER',
        unchecked: true,
        checkError: 'ops reporting pool timed out'
      };
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);

      const recon = all('[data-step]')[5];
      expect(recon.textContent).toContain('ops reporting pool timed out');
      expect(marks(recon)).toEqual(['AMBER']);
      expect(all('[data-step]').length).toBe(6);
    });
  });

  describe('needs a look', () => {
    async function settle(): Promise<void> {
      await harness.fixture.whenStable();
      harness.detectChanges();
      harness.detectChanges();
    }

    function linkOf(reference: string): HTMLAnchorElement {
      return rowOf(`tr[data-attention="${reference}"]`).querySelector<HTMLAnchorElement>('a.ops-attention-link');
    }

    it('lists the red rows above the steps with their stored values', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      expect(page().textContent).toContain('Needs a look');
      const rows = all('tr[data-attention]');
      expect(rows.map((row) => row.getAttribute('data-attention'))).toEqual([
        'EOC-20261023-1740 INBOUND NIBSS',
        'EOD_ZERO_BALANCE',
        'NIBSS-Inbound-20261023-W9-6a0d2125',
        '2026-10-23'
      ]);
      const cells = Array.from(rows[0].querySelectorAll('td')).map((cell) =>
        cell.textContent.replace(/\s+/g, ' ').trim()
      );
      expect(cells.slice(1)).toEqual([
        'End of cycle',
        'EOC-20261023-1740 INBOUND NIBSS',
        'COMPLETED / 26',
        '11 batch(es) in order, 1 rejected. Nothing in this call was recorded.',
        '23 Oct 17:46',
        'NIBSS-Inbound-20261015-W4-1b2c3d4e (2026-10-15, SETTLED)'
      ]);
      expect(rows.map((row) => marks(row))).toEqual([
        ['RED'],
        ['RED'],
        ['RED'],
        ['RED']
      ]);
      expect(page().querySelector('.ops-tag')).toBeNull();
      expect(
        page().querySelector('mifosx-ops-attention').compareDocumentPosition(page().querySelector('.ops-list'))
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('shows an unrecognised status as it is, tagged, and says when the list was cut', async () => {
      const health = healthFixture();
      health.attention.push({
        step: 'SETTLEMENT',
        reference: 'NIBSS-Inbound-20261023-W8-c1d77e09',
        status: 'PARKED_BY_OPS',
        code: null,
        message: null,
        at: '2026-10-23T12:30:40+01:00',
        mark: 'AMBER',
        unrecognised: true,
        link: { rowKey: 'NIBSS-Inbound-20261023-W8-c1d77e09', call: null },
        refersTo: []
      });
      health.attentionTruncated = true;
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);

      const row = rowOf('tr[data-attention="NIBSS-Inbound-20261023-W8-c1d77e09"]');
      expect(row.textContent).toContain('PARKED_BY_OPS');
      expect(row.querySelector('.ops-tag').textContent.trim()).toBe('unrecognised');
      expect(marks(row)).toEqual(['AMBER']);
      expect(page().textContent).toContain('Only the first 5 rows are shown.');
    });

    it('opens a line’s tab on the same date and highlights its row', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      linkOf('EOD_ZERO_BALANCE').click();
      await settle();

      expect(TestBed.inject(Router).url).toBe(`${PAGE}/end-of-day?businessDate=2026-10-23`);
      expect(all('.ops-row-highlight').map((row) => row.getAttribute('data-row-key'))).toEqual(['EOD_ZERO_BALANCE']);
      http.expectNone((r) => r.url === HEALTH);
    });

    function item(fields: Partial<AttentionItem> & Pick<AttentionItem, 'step' | 'reference'>): AttentionItem {
      return {
        status: 'FAILED',
        code: null,
        message: null,
        at: '2026-10-23T18:00:00+01:00',
        mark: 'RED',
        unrecognised: false,
        link: { rowKey: fields.reference, call: null },
        refersTo: [],
        ...fields
      };
    }

    async function follow(health: OpsHealth, reference: string): Promise<string[]> {
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);
      linkOf(reference).click();
      await settle();
      return all('.ops-row-highlight').map((row) => row.getAttribute('data-row-key'));
    }

    it('highlights the grid cell of a cycle that did not run', async () => {
      const health = healthFixture();
      health.attention.push(item({ step: 'END_OF_CYCLE', reference: 'INBOUND NIBSS 08:40', status: 'NO_RUN' }));

      expect(await follow(health, 'INBOUND NIBSS 08:40')).toEqual(['INBOUND NIBSS 08:40']);
      expect(rowOf('.ops-row-highlight').getAttribute('data-cycle')).toBe('08:40');
      expect(TestBed.inject(Router).url).toBe(`${PAGE}/end-of-cycle?businessDate=2026-10-23`);
    });

    it('highlights a mirror leg by the posting’s own reference', async () => {
      const health = healthFixture();
      health.detail.endOfDay.mirrorLegs[0] = {
        ...health.detail.endOfDay.mirrorLegs[0],
        flexStatus: 'DEAD',
        mark: 'RED'
      };
      health.attention.push(item({ step: 'END_OF_DAY', reference: 'EOD-20261023-DEPOSIT-1', status: 'DEAD' }));

      expect(await follow(health, 'EOD-20261023-DEPOSIT-1')).toEqual(['EOD-20261023-DEPOSIT-1']);
      expect(rowOf('.ops-row-highlight').getAttribute('data-gl')).toBe('250061010');
      expect(rowOf('.ops-row-highlight').querySelector('.cdk-column-outboxStatus').textContent.trim()).toBe('SENT');
    });

    it.each([
      [
        '250061010 @ 099 FLEXCUBE',
        '250061010'
      ],
      [
        '140061950 FINERACT',
        '140061950'
      ]
    ])('highlights the balance check %s, keyed by GL, branch and side', async (key, glCode) => {
      const health = healthFixture();
      health.attention.push(item({ step: 'END_OF_DAY', reference: key, status: 'UNVERIFIED' }));

      expect(await follow(health, key)).toEqual([key]);
      expect(rowOf('.ops-row-highlight').getAttribute('data-gl')).toBe(glCode);
    });

    it('prefers a balance check’s own reference when the server sends one', async () => {
      const health = healthFixture();
      health.detail.endOfDay.checks[0] = { ...health.detail.endOfDay.checks[0], reference: 'CHECK-412.7' };
      health.attention.push(item({ step: 'END_OF_DAY', reference: 'CHECK-412.7', status: 'UNVERIFIED' }));

      expect(await follow(health, 'CHECK-412.7')).toEqual(['CHECK-412.7']);
    });

    it.each([
      [
        'business-date',
        'BUSINESS_DATE',
        'daysBehind=6',
        'business-date'
      ],
      [
        'eod-run',
        'END_OF_DAY',
        null,
        'end-of-day'
      ],
      [
        'replay',
        'END_OF_DAY',
        'failedNew=2, failedLegacy=11227',
        'end-of-day'
      ],
      [
        'recon',
        'RECON',
        'intervalSeconds=60',
        'recon'
      ]
    ] as const)('highlights the %s block, its message shown as sent', async (rowKey, step, message, path) => {
      const health = healthFixture();
      health.attention.push(
        item({ step, reference: `${rowKey} item`, status: null, message, link: { rowKey, call: null } })
      );
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);
      if (message) {
        expect(rowOf(`tr[data-attention="${rowKey} item"]`).textContent).toContain(message);
      }

      linkOf(`${rowKey} item`).click();
      await settle();

      expect(TestBed.inject(Router).url).toBe(`${PAGE}/${path}?businessDate=2026-10-23`);
      expect(
        all('.ops-row-highlight').map((block) => [
          block.tagName,
          block.getAttribute('data-row-key')
        ])
      ).toEqual([
        [
          'DL',
          rowKey
        ]
      ]);
    });

    it('highlights a pay-window refusal by its call ref, even when it names a batch', async () => {
      const health = healthFixture();
      const refusal = health.detail.payWindow.refusals[1];
      health.attention.push(
        item({ step: 'PAY_WINDOW', reference: refusal.batchId, code: '12', link: { rowKey: refusal.ref, call: null } })
      );

      expect(await follow(health, refusal.batchId)).toEqual([refusal.ref]);
      expect(rowOf('.ops-row-highlight').getAttribute('data-batch')).toBe('ETZ-Outbound-20261023-W3-0b7d33f2');
    });

    it('shows a refusal that names no batch with a dash', async () => {
      const health = healthFixture();
      health.detail.payWindow.refusals[1] = { ...health.detail.payWindow.refusals[1], batchId: null };
      await open(`${PAGE}/pay-window?businessDate=2026-10-23`, health);

      const row = rowOf(`tr[data-row-key="${health.detail.payWindow.refusals[1].ref}"]`);
      expect(row.querySelector('.cdk-column-batchId').textContent.trim()).toBe('—');
    });

    it('folds a long stored message to two lines, whole on hover and on click', async () => {
      const long = `Fineract 403: ${'{"developerMessage":"Access denied","userMessageGlobalisationCode":"x"}'.repeat(7)}`;
      const health = healthFixture();
      health.attention[2] = { ...health.attention[2], message: long };
      await open(`${PAGE}/overview?businessDate=2026-10-23`, health);

      const message = rowOf('tr[data-attention="NIBSS-Inbound-20261023-W9-6a0d2125"] .ops-clamp');
      expect(message.textContent).toBe(long);
      expect(message.getAttribute('title')).toBe(long);
      expect(message.classList).not.toContain('ops-clamp-open');

      message.click();
      harness.detectChanges();
      expect(message.classList).toContain('ops-clamp-open');
      expect(message.getAttribute('aria-expanded')).toBe('true');
      message.click();
      harness.detectChanges();
      expect(message.classList).not.toContain('ops-clamp-open');
    });

    it('leaves a message folded when a click ends a text selection', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);
      const message = rowOf('tr[data-attention="EOD_ZERO_BALANCE"] .ops-clamp');
      const selection = jest
        .spyOn(window, 'getSelection')
        .mockReturnValue({ toString: () => '250061010' } as Selection);

      message.click();
      harness.detectChanges();

      expect(message.classList).not.toContain('ops-clamp-open');
      selection.mockRestore();
    });

    it('opens the call behind a call line in Calls with Access', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      linkOf('EOC-20261023-1740 INBOUND NIBSS').click();
      await settle();

      expect(TestBed.inject(Router).url).toBe(`${PAGE}/end-of-cycle?businessDate=2026-10-23`);
      http.expectOne(`${HEALTH}/calls/EOC_COMPLETE/5e0b8a12-3c4d-4e6f-9a0b-1c2d3e4f5a6b`).flush(EOC_COMPLETE_PAYLOAD);
      harness.detectChanges();
      expect(page().querySelector('.ops-row-revealed').textContent).toContain('EOC-20261023-1740');
    });

    it('opens a batch Access referred to on its own date’s Settlement tab', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`);

      page().querySelector<HTMLAnchorElement>('a[data-refers-to="NIBSS-Inbound-20261015-W4-1b2c3d4e"]').click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      const earlier = healthFixture();
      earlier.businessDate = '2026-10-15';
      earlier.detail.settlement.batches[0].batchId = 'NIBSS-Inbound-20261015-W4-1b2c3d4e';
      http.expectOne((r) => r.url === HEALTH && r.params.get('businessDate') === '2026-10-15').flush(earlier);
      await settle();

      expect(TestBed.inject(Router).url).toBe(`${PAGE}/settlement?businessDate=2026-10-15`);
      expect(all('.ops-row-highlight').map((row) => row.getAttribute('data-row-key'))).toEqual([
        'NIBSS-Inbound-20261015-W4-1b2c3d4e'
      ]);
    });

    it('renders nothing when there is nothing to list', async () => {
      await open(`${PAGE}/overview?businessDate=2026-10-23`, { ...healthFixture(), attention: [] });

      expect(page().querySelector('mifosx-ops-attention').textContent.trim()).toBe('');
      expect(page().textContent).not.toContain('Needs a look');
      expect(all('[data-step]').length).toBe(6);
    });
  });

  describe('step tabs', () => {
    it('shows the pay window batches and refusals as stored, then its calls red first', async () => {
      await open(`${PAGE}/pay-window?businessDate=2026-10-23`);

      const accepted = rowOf('tr[data-batch="NIBSS-Outbound-20261023-W12-3f8e10aa"]');
      expect(accepted.textContent).toContain('₦90,233,118.75');
      expect(accepted.getAttribute('data-mark')).toBe('NONE');
      const refusal = rowOf('tr[data-batch="ETZ-Outbound-20261023-W2-91c0e7a4"]');
      expect(refusal.textContent).toContain('12');
      expect(refusal.textContent).toContain('Totals mismatch: declared 4813/61219118.50, received 4812/61204118.50');
      expect(marks(refusal)).toEqual(['RED']);

      const calls = all('tr[id^="ops-call-"]');
      expect(calls.map((row) => row.getAttribute('data-mark'))).toEqual([
        'RED',
        'RED',
        'NONE'
      ]);
      expect(calls[2].textContent).toContain('NIBSS-Inbound-20261023-W9-6a0d2125');
      expect(calls[2].textContent).toContain('00');
      expect(page().textContent).toContain('Duplicates and system errors are not listed.');
    });

    it('shows the pay window batches with intake facts only: our code, no settlement status', async () => {
      await open(`${PAGE}/pay-window?businessDate=2026-10-23`);

      const row = rowOf('tr[data-batch="NIBSS-Inbound-20261023-W9-6a0d2125"]');
      const batches = row.closest('table');
      expect(Array.from(batches.querySelectorAll('th')).map((th) => th.textContent.trim())).toEqual([
        '',
        'Batch id',
        'Rail',
        'Switch',
        'Window',
        'Loaded date',
        'Rows',
        'Amount',
        'Code',
        'Received (Lagos)'
      ]);
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      expect(cells[8]).toBe('00');
      expect(batches.textContent).not.toContain('SETTLED');
      expect(batches.textContent).not.toContain('PROCESSING');
    });

    it('shows a settlement batch with its settle-complete status and Access’s answer as stored', async () => {
      await open(`${PAGE}/settlement?businessDate=2026-10-23`);

      const batch = rowOf('tr[data-batch="NIBSS-Inbound-20261023-W9-6a0d2125"]');
      const cells = Array.from(batch.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      expect(cells).toEqual(
        expect.arrayContaining([
          'SETTLED',
          'FAILED',
          '10',
          'Retries exhausted: HTTP 0: Read timed out'
        ])
      );
      expect(marks(batch)).toEqual(['RED']);

      const calls = all('tr[id^="ops-call-"]');
      expect(calls[0].textContent).toContain('Retries exhausted: HTTP 0: Read timed out');
      expect(calls[1].textContent).toContain('NOT_YET');
      expect(calls[1].getAttribute('data-mark')).toBe('AMBER');
    });

    it('shows a status it does not recognise as it is, with an amber mark', async () => {
      const health = healthFixture();
      health.detail.settlement.batches[1] = {
        ...health.detail.settlement.batches[1],
        status: 'PARKED_BY_OPS',
        mark: 'AMBER'
      };
      await open(`${PAGE}/settlement?businessDate=2026-10-23`, health);

      const batch = rowOf('tr[data-batch="NIBSS-Inbound-20261023-W8-c1d77e09"]');
      expect(Array.from(batch.querySelectorAll('td')).map((cell) => cell.textContent.trim())).toContain(
        'PARKED_BY_OPS'
      );
      expect(marks(batch)).toEqual(['AMBER']);
      expect(batch.querySelector('mat-icon').textContent.trim()).toBe('schedule');
    });

    it('fetches a call’s request and reply only when asked, once per row, without calling a timeout Refused', async () => {
      await open(`${PAGE}/settlement?businessDate=2026-10-23`);
      http.expectNone((r) => r.url.startsWith(`${HEALTH}/calls`));

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http
        .expectOne(`${HEALTH}/calls/SETTLE_COMPLETE/NIBSS-Inbound-20261023-W9-6a0d2125`)
        .flush(SETTLE_COMPLETE_PAYLOAD);
      harness.detectChanges();

      expect(page().querySelector('.ops-reply-refused')).toBeNull();
      expect(page().textContent).toContain('Request sent to Access');
      expect(page().textContent).toContain("Access's reply");
      expect(page().querySelector('mifosx-ops-payload-view').textContent).toContain(
        'Retries exhausted: HTTP 0: Read timed out'
      );

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      expect(page().querySelector('mifosx-ops-payload-view')).toBeNull();
      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http.expectNone((r) => r.url.startsWith(`${HEALTH}/calls`));
      expect(page().querySelector('mifosx-ops-payload-view')).not.toBeNull();
    });

    it('labels a reply Refused only when its code is not 00', async () => {
      await open(`${PAGE}/end-of-day?businessDate=2026-10-23`);

      const posting = all('tr[id^="ops-call-"]').find((row) => row.textContent.includes('EOD-20261023-DEPOSIT-1'));
      posting.querySelector<HTMLButtonElement>('button').click();
      harness.detectChanges();
      http.expectOne(`${HEALTH}/calls/FLEX_POSTING/EOD-20261023-DEPOSIT-1`).flush(FLEX_POSTING_PAYLOAD);
      harness.detectChanges();

      expect(page().querySelector('mifosx-ops-payload-view').textContent).toContain('FT2629601234');
      expect(page().querySelector('.ops-reply-refused')).toBeNull();
    });

    it('does not call an HTTP status without an answer Refused', async () => {
      await open(`${PAGE}/settlement?businessDate=2026-10-23`);

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http
        .expectOne((r) => r.url.startsWith(`${HEALTH}/calls/SETTLE_COMPLETE/`))
        .flush({
          ...SETTLE_COMPLETE_PAYLOAD,
          reply: { ...SETTLE_COMPLETE_PAYLOAD.reply, httpStatus: 503, answerCode: 'HTTP 503' }
        });
      harness.detectChanges();

      expect(page().querySelector('.ops-reply-refused')).toBeNull();
      expect(page().querySelector('mifosx-ops-payload-view').textContent).toContain('HTTP 503');
    });

    it('names the pay-window bodies the other way round and pretty-prints the reply', async () => {
      await open(`${PAGE}/pay-window?businessDate=2026-10-23`);

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http.expectOne((r) => r.url.startsWith(`${HEALTH}/calls/PAY_WINDOW/`)).flush(PAY_WINDOW_REFUSED_PAYLOAD);
      harness.detectChanges();

      expect(page().textContent).toContain('Request Access sent us');
      expect(page().textContent).toContain('Our reply');
      expect(page().textContent).toContain('Rebuilt from stored fields');
      expect(all('.ops-body-text')[1].textContent).toContain('\n  "responseCode": "12",');
      expect(page().querySelector('.ops-reply-refused').textContent).toContain('Refused');
    });

    it('cuts a long body at 200 lines and downloads the full one on request', async () => {
      const createObjectURL = jest.fn().mockReturnValue('blob:full');
      Object.assign(window.URL, { createObjectURL, revokeObjectURL: jest.fn() });
      const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      const longReply = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
      await open(`${PAGE}/settlement?businessDate=2026-10-23`);

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http
        .expectOne((r) => r.url.startsWith(`${HEALTH}/calls/`) && !r.params.has('full'))
        .flush({
          ...SETTLE_COMPLETE_PAYLOAD,
          reply: { ...SETTLE_COMPLETE_PAYLOAD.reply, text: longReply, truncated: true, totalLines: 950 }
        });
      harness.detectChanges();
      expect(page().textContent).toContain('… 750 more lines');

      buttonNamed('Download full reply').click();
      http
        .expectOne((r) => r.url.startsWith(`${HEALTH}/calls/SETTLE_COMPLETE/`) && r.params.get('full') === 'true')
        .flush(SETTLE_COMPLETE_PAYLOAD);

      expect(createObjectURL).toHaveBeenCalled();
      expect((click.mock.instances[0] as unknown as HTMLAnchorElement).download).toBe(
        'NIBSS-Inbound-20261023-W9-6a0d2125-reply.txt'
      );
      click.mockRestore();
    });

    it('says when a call is no longer available', async () => {
      await open(`${PAGE}/settlement?businessDate=2026-10-23`);

      buttonNamed('Request & reply').click();
      harness.detectChanges();
      http
        .expectOne((r) => r.url.startsWith(`${HEALTH}/calls/`))
        .flush({ defaultUserMessage: 'gone' }, { status: 404, statusText: 'Not Found' });
      harness.detectChanges();

      expect(page().querySelector('mifosx-ops-payload-view').textContent).toContain(
        'This call is no longer available.'
      );
    });

    it('shows each cycle cell’s stored status and amount, and opens the call behind it', async () => {
      await open(`${PAGE}/end-of-cycle?businessDate=2026-10-23`);

      const cells = all('[data-cycle]');
      expect(
        cells.map((cell) => [
          cell.getAttribute('data-cycle'),
          cell.getAttribute('data-mark')
        ])
      ).toEqual([
        [
          '08:40',
          'RED'
        ],
        [
          '17:40',
          'RED'
        ],
        [
          '15:00',
          'NONE'
        ]
      ]);
      expect(cells[0].tagName).toBe('SPAN');
      expect(cells[0].textContent).toContain('NO_RUN');

      const refused = cells[1];
      expect(refused.tagName).toBe('BUTTON');
      expect(refused.textContent).toContain('COMPLETED');
      expect(refused.textContent).toContain('₦401,702,118.66');
      refused.click();
      harness.detectChanges();

      http.expectOne(`${HEALTH}/calls/EOC_COMPLETE/5e0b8a12-3c4d-4e6f-9a0b-1c2d3e4f5a6b`).flush(EOC_COMPLETE_PAYLOAD);
      harness.detectChanges();
      const revealed = page().querySelector('.ops-row-revealed');
      expect(revealed.textContent).toContain('EOC-20261023-1740');
      expect(revealed.textContent).toContain('26');
      expect(revealed.textContent).toContain('11 batch(es) in order, 1 rejected. Nothing in this call was recorded.');
    });

    it('lists every end-of-cycle run, Bills included, with Access’s code and message', async () => {
      await open(`${PAGE}/end-of-cycle?businessDate=2026-10-23`);

      expect(all('tr[data-eoc]').map((row) => row.getAttribute('data-eoc'))).toEqual([
        'EOC-20261023-1740',
        'EOC-20261023-1500',
        'EOC-20261024-0840',
        'BILLS-EOC-20261023-W1'
      ]);
      const run = rowOf('tr[data-eoc="EOC-20261023-1740"]');
      expect(run.getAttribute('data-mark')).toBe('RED');
      expect(run.textContent).toContain('COMPLETED');
      expect(run.textContent).toContain('17:40');
      expect(rowOf('tr[data-eoc="BILLS-EOC-20261023-W1"]').textContent).toContain('INTERSWITCH');
    });

    it('says when a list was cut at its cap', async () => {
      const health = healthFixture();
      health.detail.endOfCycle.truncated = true;
      await open(`${PAGE}/end-of-cycle?businessDate=2026-10-23`, health);

      expect(page().textContent).toContain('Only the first 4 rows are shown.');
    });

    it('shows the Fineract date and days behind on the business date tab', async () => {
      await open(`${PAGE}/business-date?businessDate=2026-10-23`);

      expect(all('.ops-details dt').map((term) => term.textContent.trim())).toEqual([
        'Fineract date',
        'Today',
        'Days behind'
      ]);
      expect(all('.ops-details dd').map((value) => value.textContent.trim())).toEqual([
        '2026-10-23',
        '2026-10-29',
        expect.stringMatching(/^6\b/)
      ]);
      expect(marks(page().querySelector('[data-field="daysBehind"]'))).toEqual(['RED']);
      expect(page().querySelector('[data-field="daysBehind"]').textContent).toContain('6');
      expect(page().querySelector('mifosx-ops-calls-panel')).toBeNull();
    });

    it('shows the end-of-day run, its stored steps, mirror legs and balance checks', async () => {
      await open(`${PAGE}/end-of-day?businessDate=2026-10-23`);

      expect(page().querySelector('[data-field="runStatus"]').textContent).toContain('FAILED');
      expect(page().textContent).toContain('EOD_ZERO_BALANCE: 250061010@099 flexcube balance unread');
      const steps = all('tr[data-eod-step]');
      expect(steps.length).toBe(11);
      expect(steps[9].getAttribute('data-eod-step')).toBe('EOD_ZERO_BALANCE');
      expect(steps[9].getAttribute('data-mark')).toBe('RED');
      expect(steps[3].textContent).toContain('SKIPPED');
      expect(marks(steps[3])).toEqual([]);

      const checks = all('tr[data-gl]').filter((row) => row.textContent.includes('UNVERIFIED'));
      expect(checks.length).toBe(1);
      expect(checks[0].textContent).toContain('Flexcube balance unread: EFM unreachable');
      expect(all('tr[data-gl]').some((row) => row.textContent.includes('SENT'))).toBe(true);
      expect(page().querySelector('[data-field="drained"]').textContent).toContain('Yes');
    });

    it('checks breaks on request only, one request at a time', async () => {
      await open(`${PAGE}/recon?businessDate=2026-10-23`);
      expect(page().querySelector('[data-field="lastSweepAt"]').textContent).toContain('29 Oct 10:41:02');
      expect(page().querySelector('tr[data-gl]')).toBeNull();

      const check = buttonNamed('Check breaks now');
      check.click();
      harness.detectChanges();
      expect(check.disabled).toBe(true);
      const req = http.expectOne((r) => r.url === '/access/api/v1/settlement/reconciliation/breaks');
      expect(req.request.params.get('limit')).toBe('50');
      req.flush({
        asOf: '2026-10-29T09:41:02',
        total: 2,
        truncated: false,
        integrity: [
          { glCode: '250061010', kind: 'K', provider: 'NIBSS', integrity: 'BREAK', difference: 5, note: null }],
        items: [{ glCode: '250061010', severity: 'HIGH' }]
      });
      harness.detectChanges();

      expect(check.disabled).toBe(false);
      expect(page().textContent).toContain('2 items unmatched');
      const line = rowOf('tr[data-gl="250061010"]');
      expect(line.textContent).toContain('BREAK');
      expect(line.textContent).toContain('₦5.00');
      expect(marks(line)).toEqual(['RED']);
    });

    it('shows the recon facts without a sentence about when items are counted', async () => {
      await open(`${PAGE}/recon?businessDate=2026-10-23`);

      expect(page().textContent).not.toContain('only counted when you ask');
      expect(page().textContent).not.toContain('never slows down payments');
      expect((translations as any).labels.text['Unmatched items are only counted when you ask']).toBeUndefined();
    });

    it('explains a refused Check breaks now in breaks words', async () => {
      await open(`${PAGE}/recon?businessDate=2026-10-23`);

      buttonNamed('Check breaks now').click();
      harness.detectChanges();
      http
        .expectOne((r) => r.url === '/access/api/v1/settlement/reconciliation/breaks')
        .flush(
          { error: 'Access denied: missing permission READ_SETTLEMENTRECON' },
          { status: 403, statusText: 'Forbidden' }
        );
      harness.detectChanges();

      const message = page().querySelector('mifosx-ops-recon-breaks .report-error').textContent.trim();
      expect(message).toBe('You do not have permission to check unmatched items (READ_SETTLEMENTRECON).');
      expect(message).not.toContain('request and reply');
      expect(buttonNamed('Check breaks now').disabled).toBe(false);
    });
  });

  describe('permissions', () => {
    it('hides Request & reply and Check breaks now without their permissions', async () => {
      environment.productionModeEnableRBAC = true;
      permissions = ['READ_OPSHEALTH'];

      await open(`${PAGE}/settlement?businessDate=2026-10-23`);
      expect(buttonNamed('Request & reply')).toBeUndefined();
      expect(all('tr[id^="ops-call-"]').length).toBe(3);

      await harness.navigateByUrl(`${PAGE}/recon?businessDate=2026-10-23`);
      harness.detectChanges();
      expect(buttonNamed('Check breaks now')).toBeUndefined();
    });

    it('still lets a grid cell point at its call without opening the bodies', async () => {
      environment.productionModeEnableRBAC = true;
      permissions = ['READ_OPSHEALTH'];

      await open(`${PAGE}/end-of-cycle?businessDate=2026-10-23`);
      all('[data-cycle]')[1].click();
      harness.detectChanges();

      http.expectNone((r) => r.url.startsWith(`${HEALTH}/calls`));
      expect(page().querySelector('.ops-row-revealed').textContent).toContain('EOC-20261023-1740');
    });
  });
});
