/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NIP_SWITCH_LEGACY_ROUTES } from './nip-switch-legacy-routes';

describe('NIP switch route migration', () => {
  it('redirects legacy list and identity-equivalent detail routes', () => {
    const legacy = NIP_SWITCH_LEGACY_ROUTES[0];

    expect(legacy?.children?.find((route) => route.path === '')?.redirectTo).toBe('/accounting/nip-switches');
    expect(legacy?.children?.find((route) => route.path === 'view/:switchId')?.redirectTo).toBe(
      '/accounting/nip-switches/view/:switchId'
    );
  });
});
