/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';

import { humanDuration, loadErrorOf, truncate } from './synapse-jobs-presentation';

describe('Synapse jobs presentation', () => {
  it('writes busy time in the largest readable unit', () => {
    expect(
      [
        0,
        850,
        1200,
        59_949,
        95_000,
        3_600_000 + 4 * 60_000 + 20_000
      ].map(humanDuration)
    ).toEqual([
      '0 ms',
      '850 ms',
      '1.2 s',
      '59.9 s',
      '1 min 35 s',
      '1 h 4 min'
    ]);
    expect(humanDuration(null)).toBe('');
  });

  it('truncates only text longer than the preview', () => {
    expect(truncate('short')).toBe('short');
    expect(truncate('abcdef', 3)).toBe('abc…');
    expect(truncate(null)).toBe('');
  });

  it('tells a refusal apart from any other failure', () => {
    expect(loadErrorOf(new HttpErrorResponse({ status: 403 }))).toBe('FORBIDDEN');
    expect(loadErrorOf(new HttpErrorResponse({ status: 0 }))).toBe('FAILED');
    expect(loadErrorOf(new Error('boom'))).toBe('FAILED');
  });
});
