/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { hasAllPermissions } from 'app/accounting/nip-switches/nip-switch-permissions';
import { OpsMarkComponent } from '../mark/ops-mark.component';
import { OpsTextComponent } from '../text/ops-text.component';
import { OpsPayloadViewComponent } from '../payload-view/ops-payload-view.component';
import { OpsHealthStore } from '../ops-health.store';
import { OPS_HEALTH_PAYLOAD_PERMISSION } from '../ops-health-permissions';
import { Call, OpsHealth, StepId } from '../ops-health.model';
import { LAGOS_TZ, callKey, callRowId, callsOfStep, directionLabel } from '../ops-health-presentation';

/** Calls with Access for one step: every call of the day as stored, with its request and reply one click away. */
@Component({
  selector: 'mifosx-ops-calls-panel',
  templateUrl: './ops-calls-panel.component.html',
  styleUrls: ['./ops-calls-panel.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTableModule,
    OpsMarkComponent,
    OpsTextComponent,
    OpsPayloadViewComponent
  ]
})
export class OpsCallsPanelComponent {
  private store = inject(OpsHealthStore);
  private authenticationService = inject(AuthenticationService);

  readonly health = input.required<OpsHealth>();
  readonly step = input.required<StepId>();

  readonly calls = computed(() => callsOfStep(this.health(), this.step()));
  readonly direction = computed(() => this.calls()[0]?.direction ?? null);

  readonly columns = [
    'mark',
    'reference',
    'called',
    'at',
    'tries',
    'code',
    'message',
    'payload'
  ];
  readonly lagos = LAGOS_TZ;
  readonly directionLabel = directionLabel;
  readonly rowId = (call: Call) => callRowId(call.kind, call.ref);
  readonly byCall = (_: number, call: Call) => callKey(call.kind, call.ref);

  /** Rows whose request and reply are open, by `callKey`. */
  readonly open = new Set<string>();
  revealed: string | null = null;

  private canSeePayloads = hasAllPermissions(
    [OPS_HEALTH_PAYLOAD_PERMISSION],
    this.authenticationService.getCredentials()?.permissions ?? []
  );

  constructor() {
    effect(() => {
      const key = this.store.revealedCall();
      const call = key ? this.calls().find((candidate) => callKey(candidate.kind, candidate.ref) === key) : null;
      if (call) {
        untracked(() => this.reveal(call));
      }
    });
  }

  isOpen(call: Call): boolean {
    return this.open.has(callKey(call.kind, call.ref));
  }

  toggle(call: Call): void {
    const key = callKey(call.kind, call.ref);
    if (this.open.delete(key)) {
      return;
    }
    this.open.add(key);
    this.store.loadPayload(call.kind, call.ref);
  }

  private reveal(call: Call): void {
    const key = callKey(call.kind, call.ref);
    this.store.revealedCall.set(null);
    this.revealed = key;
    if (this.canSeePayloads && !this.isOpen(call)) {
      this.toggle(call);
    }
    // The row exists only after this change-detection pass renders it.
    setTimeout(() => document.getElementById(this.rowId(call))?.scrollIntoView?.({ block: 'center' }));
  }
}
