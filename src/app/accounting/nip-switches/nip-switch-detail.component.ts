/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { GLAccount } from 'app/shared/models/general.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { NipSwitchConfiguration } from './nip-switch-configuration.model';
import { nipSwitchGlAccountLabel } from './nip-switch-gl-accounts';
import { canWriteNipSwitches } from './nip-switch-permissions';
import { nipSwitchActionLabel, nipSwitchSharedValuesDiffer } from './nip-switch-presentation';

@Component({
  selector: 'mifosx-nip-switch-detail',
  templateUrl: './nip-switch-detail.component.html',
  styleUrl: './nip-switch-detail.component.scss',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatTableModule
  ]
})
export class NipSwitchDetailComponent {
  private authenticationService = inject(AuthenticationService);
  private route = inject(ActivatedRoute);

  readonly canWrite = canWriteNipSwitches(this.authenticationService.getCredentials()?.permissions ?? []);
  readonly allocationColumns = [
    'currencyCode',
    'switchFee'
  ];
  configuration: NipSwitchConfiguration;
  glAccounts: GLAccount[] = [];

  constructor() {
    const data = this.route.snapshot.data;
    this.configuration = data['nipSwitch'];
    this.glAccounts = data['nipSwitchGlAccounts'] ?? [];
  }

  get actionLabel(): 'Edit' | 'Resolve mismatch' {
    return nipSwitchActionLabel(this.configuration);
  }

  get sharedValuesDiffer(): boolean {
    return nipSwitchSharedValuesDiffer(this.configuration);
  }

  glAccountLabel(accountId: number | null): string {
    return nipSwitchGlAccountLabel(accountId, this.glAccounts);
  }
}
