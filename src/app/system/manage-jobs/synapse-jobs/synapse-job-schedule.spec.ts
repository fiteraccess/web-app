/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { firstRun, intervalProblem, lagosTime, timesProblem } from './synapse-job-schedule';
import { LIMITS } from './testing/synapse-jobs.fixture';

describe('Synapse job schedule rules', () => {
  it('reads the time of day in Lagos', () => {
    expect(lagosTime(new Date('2026-11-04T09:05:00Z'))).toBe('10:05');
    expect(lagosTime(new Date('2026-11-04T23:30:00Z'))).toBe('00:30');
  });

  it('takes a whole number of seconds within the bounds', () => {
    expect(intervalProblem(60, LIMITS)).toBeNull();
    expect(intervalProblem(0, LIMITS)).toEqual({
      key: 'labels.text.Interval must be between',
      params: { min: 1, max: 86400 }
    });
    expect(intervalProblem(1.5, LIMITS)).not.toBeNull();
    expect(intervalProblem(null, LIMITS)).not.toBeNull();
  });

  it('takes 1 to 12 times of day at least 15 minutes apart', () => {
    expect(
      timesProblem(
        [
          '08:40',
          '12:00'
        ],
        LIMITS
      )
    ).toBeNull();
    expect(timesProblem([], LIMITS)?.key).toBe('labels.text.Give between 1 and n times of day');
    expect(
      timesProblem(
        [
          '08:40',
          '08:50'
        ],
        LIMITS
      )
    ).toEqual({ key: 'labels.text.Times of day must be apart', params: { gap: 15 } });
  });

  it('runs a new time today while it is ahead, else from tomorrow; a listed time is unchanged', () => {
    const current = [
      '08:40',
      '12:00'
    ];

    expect(firstRun('11:00', current, '10:05')).toBe('TODAY');
    expect(firstRun('10:05', current, '10:05')).toBe('TOMORROW');
    expect(firstRun('09:00', current, '10:05')).toBe('TOMORROW');
    expect(firstRun('08:40', current, '10:05')).toBeNull();
  });
});
