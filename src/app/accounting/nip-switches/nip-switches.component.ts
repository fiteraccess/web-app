/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import { canWriteNipSwitches } from './nip-switch-permissions';
import { nipSwitchActionLabel, nipSwitchActiveLabel, nipSwitchDirectionLabel } from './nip-switch-presentation';

@Component({
  selector: 'mifosx-nip-switches',
  templateUrl: './nip-switches.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink
  ]
})
export class NipSwitchesComponent {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);

  readonly canWrite = canWriteNipSwitches(this.authenticationService.getCredentials()?.permissions ?? []);
  switches: NipSwitchConfiguration[] = [];

  constructor() {
    this.route.data.subscribe((data) => (this.switches = data['nipSwitches'] ?? []));
  }

  direction(configuration: NipSwitchConfiguration): string {
    return nipSwitchDirectionLabel(configuration);
  }

  active(configuration: NipSwitchConfiguration): string {
    return nipSwitchActiveLabel(configuration);
  }

  actionLabel(configuration: NipSwitchConfiguration): 'Edit' | 'Resolve mismatch' {
    return nipSwitchActionLabel(configuration);
  }
}
