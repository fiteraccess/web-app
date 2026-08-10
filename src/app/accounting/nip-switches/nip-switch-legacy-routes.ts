/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Routes } from '@angular/router';

export const NIP_SWITCH_LEGACY_ROUTES: Routes = [
  {
    path: 'nip-switch-accounting-configurations',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: '/accounting/nip-switches'
      },
      {
        path: 'view/:switchId',
        redirectTo: '/accounting/nip-switches/view/:switchId'
      }
    ]
  }
];
