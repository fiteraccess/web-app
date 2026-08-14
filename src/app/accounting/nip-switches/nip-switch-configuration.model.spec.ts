/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  NipSwitchAccountingActual,
  NipSwitchConfiguration,
  NipSwitchConfigurationReplacement,
  NipSwitchConfigurationStructuredError
} from './nip-switch-configuration.model';

const INCOMPLETE_CONFIGURATION: NipSwitchConfiguration = {
  switchId: 'NIP-IN',
  configurationStatus: 'INCOMPLETE',
  accounting: { configured: false },
  transferConfiguration: {
    configured: true,
    direction: 'INBOUND',
    active: true,
    switchFeeAllocations: []
  }
};

const INCONSISTENT_CONFIGURATION: NipSwitchConfiguration = {
  switchId: 'NIP-MIXED',
  configurationStatus: 'INCONSISTENT',
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
    direction: 'BOTH',
    active: false,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 0 }]
  }
};

const FAILED_COORDINATION_ERROR: NipSwitchConfigurationStructuredError = {
  code: 'NIP_SWITCH_SAVE_FAILED',
  message: 'The switch could not be saved.',
  retryable: true,
  operation: {
    status: 'FAILED',
    accounting: {
      status: 'FAILED',
      error: { code: 'ACCOUNTING_SAVE_FAILED', message: 'Accounting configuration could not be saved.' }
    },
    transferConfiguration: {
      status: 'NOT_ATTEMPTED',
      error: { code: 'NOT_ATTEMPTED', message: 'Transfer configuration was not attempted.' }
    }
  }
};

const INBOUND_REPLACEMENT: NipSwitchConfigurationReplacement = {
  direction: 'INBOUND',
  switchReceivableGlAccountId: 201,
  active: true,
  switchFeeAllocations: []
};

describe('NIP switch composite contract models', () => {
  it('represents an absent component using only the configured discriminant', () => {
    expect(INCOMPLETE_CONFIGURATION.accounting).toEqual({ configured: false });
    expect(Object.keys(INCOMPLETE_CONFIGURATION.accounting)).toEqual(['configured']);
  });

  it('represents inconsistent actual directions without flattening either component', () => {
    const { accounting, transferConfiguration } = INCONSISTENT_CONFIGURATION;

    expect(accounting.configured && accounting.direction).toBe('OUTBOUND');
    expect(transferConfiguration.configured && transferConfiguration.direction).toBe('BOTH');
    expect(accounting.configured && accounting.switchReceivableGlAccountId).toBeNull();
  });

  it('represents total failure with failed and not-attempted component outcomes', () => {
    expect(FAILED_COORDINATION_ERROR.operation.status).toBe('FAILED');
    expect(FAILED_COORDINATION_ERROR.operation.accounting.status).toBe('FAILED');
    expect(FAILED_COORDINATION_ERROR.operation.transferConfiguration.status).toBe('NOT_ATTEMPTED');
  });

  it('narrows accounting mappings and inbound allocation cardinality by direction', () => {
    const accounting: NipSwitchAccountingActual = INCONSISTENT_CONFIGURATION.accounting;

    if (accounting.configured && accounting.direction === 'OUTBOUND') {
      expect(accounting.switchPayableGlAccountId).toBe(101);
      expect(accounting.switchReceivableGlAccountId).toBeNull();
    } else {
      fail('expected configured outbound accounting');
    }

    expect(INBOUND_REPLACEMENT.switchFeeAllocations).toEqual([]);
  });
});
