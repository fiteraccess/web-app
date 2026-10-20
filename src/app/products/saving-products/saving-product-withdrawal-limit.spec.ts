/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, it, expect } from '@jest/globals';
import { WithdrawalRule, isoDate, pendingWithdrawalRules } from './saving-product-withdrawal-limit';

describe('pendingWithdrawalRules', () => {
  const rule = (effectiveFrom: string): WithdrawalRule => ({
    effectiveFrom,
    withdrawalCounterEnabled: true,
    monthlyWithdrawalThreshold: 4,
    qualifyingWithdrawalTypes: ['DATA']
  });

  it('keeps only rules starting after today, oldest first', () => {
    const rules = [
      rule('2026-12-01'),
      rule('2026-10-01'),
      rule('2026-11-01'),
      rule('2026-10-20')
    ];

    expect(pendingWithdrawalRules(rules, '2026-10-20').map((r) => r.effectiveFrom)).toEqual([
      '2026-11-01',
      '2026-12-01'
    ]);
  });

  it('treats a missing rule list as nothing pending', () => {
    expect(pendingWithdrawalRules(undefined, '2026-10-20')).toEqual([]);
  });

  it('formats the local date as yyyy-MM-dd', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
