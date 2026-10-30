/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';

import translations from '../../../assets/translations/en-US.json';
import { Body, Call, Mark, ReconBreaks, STEP_IDS } from './ops-health.model';
import {
  BODY_LINE_LIMIT,
  OPS_TABS,
  breakLines,
  breaksError,
  callsOfStep,
  directionLabel,
  hasCallsPanel,
  healthError,
  isRefusal,
  isoDate,
  markClass,
  naira,
  parseIsoDate,
  payloadError,
  shownBody,
  sortCalls
} from './ops-health-presentation';
import { EOC_COMPLETE_PAYLOAD, healthFixture } from './testing/ops-health.fixture';

const text = (translations as any).labels.text as Record<string, string>;

function body(textValue: string, overrides: Partial<Body> = {}): Body {
  return { format: 'JSON', text: textValue, rebuilt: false, truncated: false, totalLines: 1, ...overrides };
}

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('Operations Health presentation', () => {
  describe('refusals', () => {
    it.each([
      [
        '12',
        true
      ],
      [
        '26',
        true
      ],
      [
        '00',
        false
      ],
      [
        'HTTP 503',
        false
      ],
      [
        'HTTP 0',
        false
      ],
      [
        null,
        false
      ],
      [
        '',
        false
      ]
    ])('treats answer code %p as a refusal: %p', (code, refused) => {
      expect(isRefusal(code)).toBe(refused);
    });
  });

  describe('marks', () => {
    it('gives each mark its own colour class', () => {
      expect(
        ([
            'RED',
            'AMBER',
            'NONE'
          ] as Mark[]).map(markClass)
      ).toEqual([
        'mark-red',
        'mark-amber',
        'mark-none'
      ]);
    });

    it('names the marks for screen readers', () => {
      expect(text['Red mark']).toBe('Red mark');
      expect(text['Amber mark']).toBe('Amber mark');
    });
  });

  describe('wording', () => {
    it('has an en-US text for every tab, direction and error the page can show', () => {
      const keys = [
        ...OPS_TABS.map((tab) => tab.label),
        ...([
            'ACCESS_TO_SYNAPSE',
            'SYNAPSE_TO_ACCESS',
            'SYNAPSE_TO_EFM'
          ] as const).map(directionLabel),
        ...[
          400,
          403,
          404,
          503,
          0
        ].map((status) => healthError(httpError(status)).key),
        ...[
          403,
          404,
          500
        ].map((status) => payloadError(httpError(status)).key),
        ...[
          403,
          404,
          503,
          0
        ].map((status) => breaksError(httpError(status)).key)
      ];
      expect(keys.filter((key) => !(key in text))).toEqual([]);
      // ngx-translate reads a dot in a key as nesting, so such a key never resolves.
      expect(keys.filter((key) => key.includes('.'))).toEqual([]);
    });

    it('keeps no verdict, owner or escalation wording in en-US', () => {
      for (const removed of [
        'All good',
        'Needs action',
        'Waiting — no action',
        'Who acts',
        'Caused by',
        'Next step',
        'What it means',
        'Copy escalation note'
      ]) {
        expect(removed in text).toBe(false);
      }
      expect(JSON.stringify(translations).toLowerCase()).not.toContain('engineer');
    });
  });

  describe('calls', () => {
    it('sorts calls red first, then amber, then newest first', () => {
      const call = (ref: string, mark: Mark, at: string | null): Call => ({
        ...healthFixture().calls[0],
        ref,
        mark,
        at
      });
      const sorted = sortCalls([
        call('old-ok', 'NONE', '2026-10-23T09:00:00+01:00'),
        call('not-yet', 'AMBER', null),
        call('new-ok', 'NONE', '2026-10-23T18:00:00+01:00'),
        call('refused', 'RED', '2026-10-23T08:00:00+01:00'),
        call('not-called', 'RED', null)
      ]);
      expect(sorted.map((c) => c.ref)).toEqual([
        'refused',
        'not-called',
        'not-yet',
        'new-ok',
        'old-ok'
      ]);
    });

    it('lists only the step’s own calls', () => {
      const calls = callsOfStep(healthFixture(), 'SETTLEMENT');
      expect(calls.map((c) => c.step)).toEqual([
        'SETTLEMENT',
        'SETTLEMENT',
        'SETTLEMENT'
      ]);
      expect(calls[0].mark).toBe('RED');
    });

    it('gives a Calls with Access table only to the steps that talk to Access', () => {
      expect(STEP_IDS.filter(hasCallsPanel)).toEqual([
        'PAY_WINDOW',
        'SETTLEMENT',
        'END_OF_CYCLE',
        'END_OF_DAY'
      ]);
    });
  });

  describe('request and reply bodies', () => {
    it('pretty-prints JSON before showing it', () => {
      const shown = shownBody(body(EOC_COMPLETE_PAYLOAD.request.text));
      expect(shown.text.split('\n').length).toBeGreaterThan(1);
      expect(JSON.parse(shown.text)).toEqual(JSON.parse(EOC_COMPLETE_PAYLOAD.request.text));
      expect(shown.cut).toBe(false);
    });

    it('shows text that is not valid JSON as stored', () => {
      expect(shownBody(body('Retries exhausted: HTTP 0: Read timed out')).text).toBe(
        'Retries exhausted: HTTP 0: Read timed out'
      );
    });

    it('cuts a long body at 200 lines and offers the full one', () => {
      const lines = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n');
      const shown = shownBody(body(lines, { format: 'TEXT', totalLines: 250 }));
      expect(shown.text.split('\n').length).toBe(BODY_LINE_LIMIT);
      expect(shown.hiddenLines).toBe(50);
      expect(shown.cut).toBe(true);
    });

    it('counts the lines the server cut off', () => {
      const lines = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
      const shown = shownBody(body(lines, { format: 'TEXT', truncated: true, totalLines: 900 }));
      expect(shown.hiddenLines).toBe(700);
      expect(shown.cut).toBe(true);
    });
  });

  describe('errors', () => {
    it('shows the server’s words for a 400', () => {
      const error = healthError(
        httpError(400, {
          developerMessage: 'bad',
          httpStatusCode: '400',
          defaultUserMessage: 'businessDate must not be in the future',
          userMessageGlobalisationCode: 'error.msg.x',
          errors: []
        })
      );
      expect(error.message).toBe('businessDate must not be in the future');
    });

    it('names the permission on the AuthzInterceptor 403 body', () => {
      const error = healthError(httpError(403, { error: 'Access denied: missing permission READ_OPSHEALTH' }));
      expect(error.key).toBe('You do not have permission to view Operations Health');
      expect(text[error.key]).toContain('READ_OPSHEALTH');
    });

    it('tells a switched-off server, a busy one and a broken one apart', () => {
      expect(healthError(httpError(404)).key).toBe('Operations Health is switched off on this server');
      expect(healthError(httpError(503)).key).toBe('The server is busy');
      expect(healthError(httpError(0)).key).toBe('Operations Health could not be loaded');
      expect(payloadError(httpError(404)).key).toBe('This call is no longer available');
      expect(payloadError(httpError(403)).key).toBe('You do not have access to request and reply bodies');
    });
  });

  describe('Check breaks now', () => {
    const breaks: ReconBreaks = {
      asOf: '2026-10-29T09:41:02',
      total: 4,
      truncated: false,
      integrity: [
        { glCode: '140061950', kind: 'K', provider: 'NIBSS', integrity: 'OK', difference: 0, note: null },
        { glCode: '250061010', kind: 'K', provider: 'NIBSS', integrity: 'UNVERIFIED', difference: null, note: null },
        { glCode: '260010001', kind: 'K', provider: 'NIBSS', integrity: 'BREAK', difference: 12.5, note: null }
      ],
      items: [
        { glCode: '330010001', severity: 'WARN' },
        { glCode: '330010001', severity: 'WARN' },
        { glCode: '340010001', severity: 'HIGH' },
        { glCode: '250061010', severity: 'WARN' }
      ] as any
    };

    it('lists one line per GL that is out or has items, red for a break or a high item', () => {
      const lines = breakLines(breaks);
      expect(
        lines.map((line) => [
          line.glCode,
          line.mark,
          line.items
        ])
      ).toEqual([
        [
          '260010001',
          'RED',
          0
        ],
        [
          '340010001',
          'RED',
          1
        ],
        [
          '250061010',
          'AMBER',
          1
        ],
        [
          '330010001',
          'AMBER',
          2
        ]
      ]);
      expect(lines.find((line) => line.glCode === '140061950')).toBeUndefined();
    });
  });

  describe('amounts and dates', () => {
    it('formats naira with grouping and two decimals', () => {
      expect(naira(4910331466.25)).toBe('₦4,910,331,466.25');
      expect(naira(null)).toBe('—');
    });

    it('round-trips a business date through the date picker', () => {
      expect(isoDate(parseIsoDate('2026-10-23'))).toBe('2026-10-23');
      expect(parseIsoDate('23/10/2026')).toBeNull();
    });
  });
});
