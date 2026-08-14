/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GLAccount } from 'app/shared/models/general.model';

import { nipSwitchGlAccountLabel, nipSwitchGlAccountOptions } from './nip-switch-gl-accounts';

const ACCOUNTS = [
  { id: 1, glCode: '101', name: 'Asset detail', disabled: false, usage: { id: 1 }, type: { id: 1 } },
  { id: 2, glCode: '201', name: 'Liability detail', disabled: false, usage: { id: 1 }, type: { id: 2 } },
  { id: 3, glCode: '301', name: 'Disabled detail', disabled: true, usage: { id: 1 }, type: { id: 1 } },
  { id: 4, glCode: '401', name: 'Asset header', disabled: false, usage: { id: 2 }, type: { id: 1 } }
] as GLAccount[];

describe('NIP switch GL account presentation', () => {
  it('offers enabled detail accounts for non-receivable mappings', () => {
    expect(nipSwitchGlAccountOptions(ACCOUNTS, 'switchPayableGlAccountId').map(({ id }) => id)).toEqual([
      1,
      2
    ]);
  });

  it('offers only enabled asset detail accounts for receivable mappings', () => {
    expect(nipSwitchGlAccountOptions(ACCOUNTS, 'switchReceivableGlAccountId').map(({ id }) => id)).toEqual([1]);
  });

  it('labels known accounts and preserves an unknown account ID', () => {
    expect(nipSwitchGlAccountLabel(1, ACCOUNTS)).toBe('101 - Asset detail');
    expect(nipSwitchGlAccountLabel(99, ACCOUNTS)).toBe('99');
    expect(nipSwitchGlAccountLabel(null, ACCOUNTS)).toBe('—');
  });
});
