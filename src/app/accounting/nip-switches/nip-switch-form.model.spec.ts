/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  addNipSwitchFeeAllocation,
  buildNipSwitchConfigurationSubmission,
  createNipSwitchForm,
  removeNipSwitchFeeAllocation
} from './nip-switch-form.model';

describe('NIP switch desired-state form', () => {
  it('uses an editable validated ID for create and an immutable ID for edit', () => {
    const createForm = createNipSwitchForm();
    const editForm = createNipSwitchForm({ switchId: 'NIP' }, 'edit');

    expect(createForm.controls.switchId.enabled).toBe(true);
    expect(createForm.controls.switchId.hasError('required')).toBe(true);
    createForm.controls.switchId.setValue('   ');
    expect(createForm.controls.switchId.hasError('blank')).toBe(true);
    createForm.controls.switchId.setValue('A'.repeat(65));
    expect(createForm.controls.switchId.hasError('maxlength')).toBe(true);
    createForm.controls.switchId.setValue(`  ${'A'.repeat(64)}  `);
    expect(createForm.controls.switchId.valid).toBe(true);
    expect(editForm.controls.switchId.disabled).toBe(true);
    expect(editForm.getRawValue().switchId).toBe('NIP');
  });

  it.each([
    [
      'OUTBOUND',
      {
        direction: 'OUTBOUND',
        switchPayableGlAccountId: 101,
        switchFeeGlAccountId: 102,
        commissionIncomeGlAccountId: 103,
        active: false,
        switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 0 }]
      }
    ],
    [
      'INBOUND',
      {
        direction: 'INBOUND',
        switchReceivableGlAccountId: 104,
        active: false,
        switchFeeAllocations: []
      }
    ],
    [
      'BOTH',
      {
        direction: 'BOTH',
        switchPayableGlAccountId: 101,
        switchFeeGlAccountId: 102,
        commissionIncomeGlAccountId: 103,
        switchReceivableGlAccountId: 104,
        active: false,
        switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 0 }]
      }
    ]
  ] as const)('builds the exact normalized %s submission', (direction, expected) => {
    const form = createNipSwitchForm({
      switchId: '  nip test  ',
      direction,
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104,
      active: false,
      switchFeeAllocations: [{ currencyCode: ' ngn ', switchFee: 0 }]
    });

    expect(form.valid).toBe(true);
    expect(buildNipSwitchConfigurationSubmission(form)).toEqual({ switchId: 'NIP TEST', replacement: expected });
  });

  it('requires outbound allocations and rejects duplicate canonical currencies', () => {
    const form = createNipSwitchForm({
      switchId: 'NIP',
      direction: 'OUTBOUND',
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103
    });

    expect(form.controls.switchFeeAllocations.hasError('minlength')).toBe(true);
    addNipSwitchFeeAllocation(form, { currencyCode: 'NGN', switchFee: 5 });
    addNipSwitchFeeAllocation(form, { currencyCode: ' ngn ', switchFee: 10 });

    expect(form.controls.switchFeeAllocations.hasError('duplicateCurrency')).toBe(true);
    expect(form.valid).toBe(false);
  });

  it('accepts zero switch fees and rejects negative switch fees', () => {
    const form = validOutboundForm();
    const feeControl = form.controls.switchFeeAllocations.at(0).controls.switchFee;

    feeControl.setValue(0);
    expect(feeControl.valid).toBe(true);
    feeControl.setValue(-0.01);
    expect(feeControl.hasError('min')).toBe(true);
  });

  it('clears incompatible GL values and allocations when direction changes', () => {
    const form = createNipSwitchForm({
      switchId: 'NIP',
      direction: 'BOTH',
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104,
      switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 5 }]
    });

    form.controls.direction.setValue('INBOUND');
    expect(form.controls.switchPayableGlAccountId.value).toBeNull();
    expect(form.controls.switchPayableGlAccountId.disabled).toBe(true);
    expect(form.controls.switchReceivableGlAccountId.value).toBe(104);
    expect(form.controls.switchFeeAllocations.length).toBe(0);

    form.controls.direction.setValue('OUTBOUND');
    expect(form.controls.switchReceivableGlAccountId.value).toBeNull();
    expect(form.controls.switchReceivableGlAccountId.disabled).toBe(true);
    expect(form.controls.switchFeeAllocations.hasError('minlength')).toBe(true);
  });

  it('removes allocation rows from the exact full replacement', () => {
    const form = validOutboundForm();
    addNipSwitchFeeAllocation(form, { currencyCode: 'USD', switchFee: 0.25 });

    removeNipSwitchFeeAllocation(form, 0);

    expect(buildNipSwitchConfigurationSubmission(form).replacement).toEqual({
      direction: 'OUTBOUND',
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      active: true,
      switchFeeAllocations: [{ currencyCode: 'USD', switchFee: 0.25 }]
    });
  });
});

function validOutboundForm() {
  return createNipSwitchForm({
    switchId: 'NIP',
    direction: 'OUTBOUND',
    switchPayableGlAccountId: 101,
    switchFeeGlAccountId: 102,
    commissionIncomeGlAccountId: 103,
    switchFeeAllocations: [{ currencyCode: 'NGN', switchFee: 0 }]
  });
}
