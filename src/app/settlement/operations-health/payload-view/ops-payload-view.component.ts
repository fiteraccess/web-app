/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, computed, inject, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

import { OpsHealthStore, PayloadState } from '../ops-health.store';
import { OpsMarkComponent } from '../mark/ops-mark.component';
import { Body, Call } from '../ops-health.model';
import { ShownBody, callKey, displayText, downloadFileName, isRefusal, shownBody } from '../ops-health-presentation';

type Part = 'request' | 'reply';

/** The stored request and Access's reply for one call, side by side; fetched on first open, then cached. */
@Component({
  selector: 'mifosx-ops-payload-view',
  templateUrl: './ops-payload-view.component.html',
  styleUrls: ['./ops-payload-view.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    OpsMarkComponent
  ]
})
export class OpsPayloadViewComponent {
  private store = inject(OpsHealthStore);

  readonly call = input.required<Call>();
  readonly isRefusal = isRefusal;

  readonly state = computed<PayloadState | undefined>(
    () => this.store.payloads()[callKey(this.call().kind, this.call().ref)]
  );
  readonly request = computed<ShownBody | null>(() => this.shown(this.state()?.payload?.request));
  readonly reply = computed<ShownBody | null>(() => this.shown(this.state()?.payload?.reply));

  /** Pay-window files come from Access, so the headings name the other direction. */
  readonly inbound = computed(() => this.call().direction === 'ACCESS_TO_SYNAPSE');

  downloading: Part | null = null;
  downloadFailed = false;

  retry(): void {
    this.store.loadPayload(this.call().kind, this.call().ref);
  }

  download(part: Part): void {
    const call = this.call();
    this.downloading = part;
    this.downloadFailed = false;
    this.store.fullPayload(call.kind, call.ref).subscribe({
      next: (payload) => {
        this.downloading = null;
        const body: Body | null = part === 'request' ? payload.request : payload.reply;
        if (body) {
          this.save(displayText(body), downloadFileName(payload.reference, part, body));
        }
      },
      error: () => {
        this.downloading = null;
        this.downloadFailed = true;
      }
    });
  }

  private shown(body: Body | null | undefined): ShownBody | null {
    return body ? shownBody(body) : null;
  }

  private save(text: string, fileName: string): void {
    const url = window.URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
