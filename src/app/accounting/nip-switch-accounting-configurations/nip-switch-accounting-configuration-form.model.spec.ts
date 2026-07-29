/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GLAccount } from 'app/shared/models/general.model';

import {
  buildNipSwitchAccountingReplacement,
  createNipSwitchAccountingForm,
  getNipSwitchAccountingGlAccountOptions
} from './nip-switch-accounting-configuration-form.model';

describe('NIP switch accounting form', () => {
  it.each([
    [
      'OUTBOUND',
      {
        direction: 'OUTBOUND',
        switchPayableGlAccountId: 101,
        switchFeeGlAccountId: 102,
        commissionIncomeGlAccountId: 103,
        active: false
      }
    ],
    [
      'INBOUND',
      {
        direction: 'INBOUND',
        switchReceivableGlAccountId: 104,
        active: false
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
        active: false
      }
    ]
  ] as const)('builds the exact %s replacement shape', (direction, expected) => {
    const form = createNipSwitchAccountingForm({ switchId: 'NIBSS', direction, active: false });
    form.patchValue({
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104
    });

    expect(form.valid).toBe(true);
    expect(buildNipSwitchAccountingReplacement(form)).toEqual(expected);
  });

  it.each([
    [
      'OUTBOUND',
      'switchPayableGlAccountId'
    ],
    [
      'OUTBOUND',
      'switchFeeGlAccountId'
    ],
    [
      'OUTBOUND',
      'commissionIncomeGlAccountId'
    ],
    [
      'INBOUND',
      'switchReceivableGlAccountId'
    ],
    [
      'BOTH',
      'switchPayableGlAccountId'
    ],
    [
      'BOTH',
      'switchFeeGlAccountId'
    ],
    [
      'BOTH',
      'commissionIncomeGlAccountId'
    ],
    [
      'BOTH',
      'switchReceivableGlAccountId'
    ]
  ] as const)('requires %s mappings for %s', (direction, missingField) => {
    const form = createNipSwitchAccountingForm({ switchId: 'NIBSS', direction });
    form.patchValue({
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104
    });
    form.controls[missingField].setValue(null);

    expect(form.controls[missingField].hasError('required')).toBe(true);
    expect(form.valid).toBe(false);
  });

  it.each([
    [
      'OUTBOUND',
      'INBOUND'
    ],
    [
      'OUTBOUND',
      'BOTH'
    ],
    [
      'INBOUND',
      'OUTBOUND'
    ],
    [
      'INBOUND',
      'BOTH'
    ],
    [
      'BOTH',
      'OUTBOUND'
    ],
    [
      'BOTH',
      'INBOUND'
    ]
  ] as const)('clears stale mappings and omits them when changing from %s to %s', (from, to) => {
    const form = createNipSwitchAccountingForm({ switchId: 'NIBSS', direction: from });
    form.patchValue({
      switchPayableGlAccountId: 101,
      switchFeeGlAccountId: 102,
      commissionIncomeGlAccountId: 103,
      switchReceivableGlAccountId: 104
    });

    form.controls.direction.setValue(to);

    const replacement = buildNipSwitchAccountingReplacement(form);
    if (to === 'INBOUND') {
      expect(form.controls.switchPayableGlAccountId.disabled).toBe(true);
      expect(form.controls.switchFeeGlAccountId.value).toBeNull();
      expect(form.controls.commissionIncomeGlAccountId.value).toBeNull();
      expect(replacement).toEqual({ direction: 'INBOUND', switchReceivableGlAccountId: 104, active: true });
    } else if (to === 'OUTBOUND') {
      expect(form.controls.switchReceivableGlAccountId.disabled).toBe(true);
      expect(form.controls.switchReceivableGlAccountId.value).toBeNull();
      expect(replacement).toEqual({
        direction: 'OUTBOUND',
        switchPayableGlAccountId: 101,
        switchFeeGlAccountId: 102,
        commissionIncomeGlAccountId: 103,
        active: true
      });
    } else {
      expect(form.controls.switchPayableGlAccountId.enabled).toBe(true);
      expect(form.controls.switchReceivableGlAccountId.enabled).toBe(true);
      expect(replacement).toEqual({
        direction: 'BOTH',
        switchPayableGlAccountId: 101,
        switchFeeGlAccountId: 102,
        commissionIncomeGlAccountId: 103,
        switchReceivableGlAccountId: 104,
        active: true
      });
    }
  });

  it('limits Receivable choices to enabled detail asset accounts', () => {
    const accounts: GLAccount[] = [
      glAccount(1, 1, false, 1),
      glAccount(2, 2, false, 1),
      glAccount(3, 1, true, 1),
      glAccount(4, 1, false, 2)
    ];

    expect(
      getNipSwitchAccountingGlAccountOptions(accounts, 'switchReceivableGlAccountId').map((account) => account.id)
    ).toEqual([1]);
    expect(
      getNipSwitchAccountingGlAccountOptions(accounts, 'switchPayableGlAccountId').map((account) => account.id)
    ).toEqual([
      1,
      2
    ]);
  });
});

function glAccount(id: number, typeId: number, disabled: boolean, usageId: number): GLAccount {
  return {
    id,
    name: `Account ${id}`,
    glCode: `${id}`,
    description: '',
    disabled,
    manualEntriesAllowed: false,
    type: { id: typeId, code: 'Type', value: 'Type' },
    usage: { id: usageId, code: 'Usage', value: 'Usage' }
  };
}
