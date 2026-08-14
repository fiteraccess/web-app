/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import {
  nipSwitchActionLabel,
  nipSwitchActiveLabel,
  nipSwitchDirectionLabel,
  nipSwitchSharedValuesDiffer
} from './nip-switch-presentation';

const COMPLETE: NipSwitchConfiguration = {
  switchId: 'COMPLETE',
  configurationStatus: 'COMPLETE',
  accounting: {
    configured: true,
    direction: 'OUTBOUND',
    switchPayableGlAccountId: 101,
    switchFeeGlAccountId: 102,
    commissionIncomeGlAccountId: 103,
    switchReceivableGlAccountId: null,
    active: true
  },
  transferConfiguration: {
    configured: true,
    direction: 'OUTBOUND',
    active: true,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const MISSING_ACCOUNTING: NipSwitchConfiguration = {
  switchId: 'NO-ACCOUNTING',
  configurationStatus: 'INCOMPLETE',
  accounting: { configured: false },
  transferConfiguration: COMPLETE.transferConfiguration
};

const MISSING_TRANSFER: NipSwitchConfiguration = {
  switchId: 'NO-TRANSFER',
  configurationStatus: 'INCOMPLETE',
  accounting: COMPLETE.accounting,
  transferConfiguration: { configured: false }
};

const INCONSISTENT_DIRECTION: NipSwitchConfiguration = {
  ...COMPLETE,
  switchId: 'DIRECTION',
  configurationStatus: 'INCONSISTENT',
  transferConfiguration: {
    configured: true,
    direction: 'BOTH',
    active: true,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const INCONSISTENT_ACTIVE: NipSwitchConfiguration = {
  ...COMPLETE,
  switchId: 'ACTIVE',
  configurationStatus: 'INCONSISTENT',
  transferConfiguration: {
    configured: true,
    direction: 'OUTBOUND',
    active: false,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

describe('NIP switch list presentation', () => {
  it('uses Edit only for complete state and Resolve mismatch otherwise', () => {
    expect(nipSwitchActionLabel(COMPLETE)).toBe('Edit');
    expect(nipSwitchActionLabel(MISSING_ACCOUNTING)).toBe('Resolve mismatch');
    expect(nipSwitchActionLabel(MISSING_TRANSFER)).toBe('Resolve mismatch');
    expect(nipSwitchActionLabel(INCONSISTENT_DIRECTION)).toBe('Resolve mismatch');
    expect(nipSwitchActionLabel(INCONSISTENT_ACTIVE)).toBe('Resolve mismatch');
  });

  it('renders available and differing actual direction/active state honestly', () => {
    expect(nipSwitchDirectionLabel(MISSING_ACCOUNTING)).toBe('OUTBOUND');
    expect(nipSwitchDirectionLabel(MISSING_TRANSFER)).toBe('OUTBOUND');
    expect(nipSwitchDirectionLabel(INCONSISTENT_DIRECTION)).toBe('OUTBOUND / BOTH');
    expect(nipSwitchActiveLabel(INCONSISTENT_ACTIVE)).toBe('Mixed');
  });
});

describe('NIP switch detail comparison', () => {
  it.each([
    [
      MISSING_ACCOUNTING,
      false
    ],
    [
      MISSING_TRANSFER,
      false
    ],
    [
      INCONSISTENT_DIRECTION,
      true
    ],
    [
      INCONSISTENT_ACTIVE,
      true
    ]
  ] as const)('compares actual component state for %s', (configuration, differs) => {
    expect(nipSwitchSharedValuesDiffer(configuration)).toBe(differs);
    expect(nipSwitchActionLabel(configuration)).toBe('Resolve mismatch');
  });
});
