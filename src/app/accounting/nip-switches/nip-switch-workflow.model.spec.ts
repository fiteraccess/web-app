/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { of, throwError } from 'rxjs';

import {
  NipSwitchConfiguration,
  NipSwitchConfigurationSaveResponse,
  NipSwitchConfigurationStructuredError,
  NipSwitchOutboundReplacement
} from './nip-switch-configuration.model';
import {
  buildNipSwitchConfigurationSubmission,
  createNipSwitchForm,
  NipSwitchConfigurationSubmission
} from './nip-switch-form.model';
import {
  NipSwitchSaveCallbacks,
  NipSwitchSaveCoordinator,
  nipSwitchWorkflowFormValue
} from './nip-switch-workflow.model';

const COMPLETE: NipSwitchConfiguration = {
  switchId: 'NIP',
  configurationStatus: 'COMPLETE',
  accounting: {
    configured: true,
    direction: 'BOTH',
    switchPayableGlAccountId: 101,
    switchFeeGlAccountId: 102,
    commissionIncomeGlAccountId: 103,
    switchReceivableGlAccountId: 104,
    active: true
  },
  transferConfiguration: {
    configured: true,
    direction: 'BOTH',
    active: true,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const MISSING_ACCOUNTING: NipSwitchConfiguration = {
  switchId: 'TRANSFER-ONLY',
  configurationStatus: 'INCOMPLETE',
  accounting: { configured: false },
  transferConfiguration: {
    configured: true,
    direction: 'OUTBOUND',
    active: false,
    switchFeeAllocations: [{ currencyCode: 'USD', switchFee: 0 }]
  }
};

const MISSING_TRANSFER: NipSwitchConfiguration = {
  switchId: 'ACCOUNTING-ONLY',
  configurationStatus: 'INCOMPLETE',
  accounting: COMPLETE.accounting,
  transferConfiguration: { configured: false }
};

const INCONSISTENT_DIRECTION: NipSwitchConfiguration = {
  ...COMPLETE,
  configurationStatus: 'INCONSISTENT',
  transferConfiguration: {
    configured: true,
    direction: 'OUTBOUND',
    active: true,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const INCONSISTENT_ACTIVE: NipSwitchConfiguration = {
  ...COMPLETE,
  configurationStatus: 'INCONSISTENT',
  transferConfiguration: {
    configured: true,
    direction: 'BOTH',
    active: false,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
  }
};

const REPLACEMENT: NipSwitchOutboundReplacement = {
  direction: 'OUTBOUND',
  switchPayableGlAccountId: 101,
  switchFeeGlAccountId: 102,
  commissionIncomeGlAccountId: 103,
  active: true,
  switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
};

const SUBMISSION: NipSwitchConfigurationSubmission = { switchId: 'NIP', replacement: REPLACEMENT };

const SUCCESS: NipSwitchConfigurationSaveResponse = {
  ...COMPLETE,
  configurationStatus: 'COMPLETE',
  operation: {
    status: 'COMPLETE',
    accounting: { status: 'SAVED', error: null },
    transferConfiguration: { status: 'SAVED', error: null }
  }
};

const RETRYABLE_PARTIAL: NipSwitchConfigurationStructuredError = {
  code: 'NIP_SWITCH_PARTIAL_SAVE',
  message: 'The switch was only partially saved.',
  retryable: true,
  operation: {
    status: 'PARTIAL',
    accounting: { status: 'SAVED', error: null },
    transferConfiguration: {
      status: 'FAILED',
      error: { code: 'ROUTE_SAVE_FAILED', message: 'Transfer configuration failed.' }
    }
  }
};

const TOTAL_FAILURE: NipSwitchConfigurationStructuredError = {
  code: 'NIP_SWITCH_SAVE_FAILED',
  message: 'The switch was not saved.',
  retryable: true,
  operation: {
    status: 'FAILED',
    accounting: {
      status: 'FAILED',
      error: { code: 'ACCOUNTING_FAILED', message: 'Accounting failed.' }
    },
    transferConfiguration: {
      status: 'NOT_ATTEMPTED',
      error: { code: 'NOT_ATTEMPTED', message: 'Transfer configuration was not attempted.' }
    }
  }
};

describe('NIP switch workflow form initialization', () => {
  it('starts Add without assuming a switch ID or direction', () => {
    expect(nipSwitchWorkflowFormValue('add')).toEqual({});
  });

  it('initializes complete Edit from each owning component', () => {
    expect(nipSwitchWorkflowFormValue('edit', COMPLETE)).toEqual({
      switchId: 'NIP',
      direction: 'BOTH',
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104,
      active: true,
      switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
    });
  });

  it('preserves transfer-owned values when accounting is missing', () => {
    const value = nipSwitchWorkflowFormValue('resolve', MISSING_ACCOUNTING);
    expect(value).toEqual(
      expect.objectContaining({
        switchId: 'TRANSFER-ONLY',
        direction: 'OUTBOUND',
        active: false,
        switchFeeAllocations: [{ currencyCode: 'USD', switchFee: 0 }],
        switchPayableGlAccountId: null
      })
    );
  });

  it('preserves accounting-owned values when transfer configuration is missing', () => {
    const value = nipSwitchWorkflowFormValue('resolve', MISSING_TRANSFER);
    expect(value).toEqual(
      expect.objectContaining({
        switchId: 'ACCOUNTING-ONLY',
        direction: 'BOTH',
        active: true,
        switchPayableGlAccountId: 101,
        switchReceivableGlAccountId: 104,
        switchFeeAllocations: []
      })
    );
  });

  it.each([
    INCONSISTENT_DIRECTION,
    INCONSISTENT_ACTIVE
  ])('requires explicit shared values for inconsistent state while preserving owned fields', (configuration) => {
    const value = nipSwitchWorkflowFormValue('resolve', configuration);
    expect(value.direction).toBeNull();
    expect(value.active).toBeNull();
    expect(value.switchPayableGlAccountId).toBe(101);
    expect(value.switchFeeAllocations).toEqual([{ currencyCode: 'NGN', switchFee: 5 }]);

    const form = createNipSwitchForm(value, 'edit', true);
    expect(form.controls.direction.value).toBeNull();
    expect(form.controls.active.value).toBeNull();
    expect(form.controls.switchPayableGlAccountId.value).toBe(101);
    expect(form.controls.switchFeeAllocations.getRawValue()).toEqual([{ currencyCode: 'NGN', switchFee: 5 }]);
    expect(form.invalid).toBe(true);
  });
});

describe('NIP switch save and exact Retry', () => {
  let callbacks: jest.Mocked<NipSwitchSaveCallbacks>;

  beforeEach(() => {
    callbacks = {
      success: jest.fn(),
      structuredError: jest.fn(),
      standardError: jest.fn()
    };
  });

  it('handles complete success and clears retry state', () => {
    const save = jest.fn(() => of(SUCCESS));
    const coordinator = new NipSwitchSaveCoordinator(save);

    coordinator.save(SUBMISSION, callbacks);

    expect(save).toHaveBeenCalledWith('NIP', REPLACEMENT);
    expect(callbacks.success).toHaveBeenCalledWith(SUCCESS);
    expect(coordinator.session.operation?.status).toBe('COMPLETE');
    expect(coordinator.session.canRetry).toBe(false);
  });

  it('submits Resolve mismatch through the ordinary composite save operation', () => {
    const form = createNipSwitchForm(nipSwitchWorkflowFormValue('resolve', INCONSISTENT_ACTIVE), 'edit', true);
    form.controls.direction.setValue('BOTH');
    form.controls.active.setValue(true);
    const save = jest.fn(() => of(SUCCESS));
    const coordinator = new NipSwitchSaveCoordinator(save);

    coordinator.save(buildNipSwitchConfigurationSubmission(form), callbacks);

    expect(save).toHaveBeenCalledWith(
      'NIP',
      expect.objectContaining({
        direction: 'BOTH',
        active: true,
        switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
      })
    );
  });

  it('offers user-action Retry for retryable partial state and replays the exact immutable snapshot', () => {
    const save = jest
      .fn()
      .mockReturnValueOnce(throwError(() => ({ error: RETRYABLE_PARTIAL })))
      .mockReturnValueOnce(of(SUCCESS));
    const coordinator = new NipSwitchSaveCoordinator(save);
    const mutableSubmission: NipSwitchConfigurationSubmission = JSON.parse(JSON.stringify(SUBMISSION));

    coordinator.save(mutableSubmission, callbacks);
    const captured = coordinator.session.retrySubmission;
    (mutableSubmission.replacement as NipSwitchOutboundReplacement).switchFeeAllocations[0].switchFee = 99;

    expect(coordinator.session.operation?.status).toBe('PARTIAL');
    expect(coordinator.session.canRetry).toBe(true);
    expect(Object.isFrozen(captured?.replacement)).toBe(true);
    expect(coordinator.retry(callbacks)).toBe(true);
    expect(save.mock.calls[1][1]).toBe(captured?.replacement);
    expect(save.mock.calls[1][1].switchFeeAllocations[0].switchFee).toBe(5);
  });

  it('does not offer Retry for a non-retryable partial result', () => {
    const error = { ...RETRYABLE_PARTIAL, retryable: false };
    const coordinator = new NipSwitchSaveCoordinator(() => throwError(() => ({ error })));

    coordinator.save(SUBMISSION, callbacks);

    expect(callbacks.structuredError).toHaveBeenCalledWith(error);
    expect(coordinator.session.canRetry).toBe(false);
    expect(coordinator.retry(callbacks)).toBe(false);
  });

  it('renders total structured failure without retaining or exposing Retry', () => {
    const coordinator = new NipSwitchSaveCoordinator(() => throwError(() => ({ error: TOTAL_FAILURE })));

    coordinator.save(SUBMISSION, callbacks);

    expect(coordinator.session.operation).toEqual(TOTAL_FAILURE.operation);
    expect(coordinator.session.structuredError).toBe(TOTAL_FAILURE);
    expect(coordinator.session.retrySubmission).toBeNull();
    expect(coordinator.session.canRetry).toBe(false);
    expect(coordinator.retry(callbacks)).toBe(false);
  });

  it('invalidates Retry after a desired edit or navigation lifecycle', () => {
    const coordinator = new NipSwitchSaveCoordinator(() => throwError(() => ({ error: RETRYABLE_PARTIAL })));
    coordinator.save(SUBMISSION, callbacks);
    expect(coordinator.session.canRetry).toBe(true);

    coordinator.invalidateRetry();

    expect(coordinator.session.canRetry).toBe(false);
    expect(coordinator.retry(callbacks)).toBe(false);
    expect(new NipSwitchSaveCoordinator(jest.fn()).session.canRetry).toBe(false);
  });

  it('uses the standard error path and preserves the caller-owned form/submission', () => {
    const standardError = { status: 400, error: { message: 'Validation failed.' } };
    const coordinator = new NipSwitchSaveCoordinator(() => throwError(() => standardError));

    coordinator.save(SUBMISSION, callbacks);

    expect(callbacks.standardError).toHaveBeenCalledWith(standardError);
    expect(callbacks.structuredError).not.toHaveBeenCalled();
    expect(SUBMISSION.replacement).toBe(REPLACEMENT);
    expect(coordinator.session.canRetry).toBe(false);
  });
});
