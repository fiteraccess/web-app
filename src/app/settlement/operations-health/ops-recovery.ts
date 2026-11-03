/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

/** rxjs Imports */
import { Observable } from 'rxjs';
import { filter, finalize } from 'rxjs/operators';

/** Custom Services */
import { OpsHealthService } from './ops-health.service';
import { OpsHealthStore } from './ops-health.store';
import { OpsConfirmDialogComponent, OpsConfirmData } from './confirm-dialog/ops-confirm-dialog.component';

/** Custom Models */
import { SettlementBatch } from './ops-health.model';
import { naira } from './ops-health-presentation';

export type RecoveryAction = 'RESEND_SETTLE_COMPLETE' | 'RESCHEDULE_BATCH' | 'RESEND_EOC_COMPLETE';

interface Recovery {
  heading: string;
  message: string;
  done: string;
  send: () => Observable<unknown>;
}

/**
 * The operator's recovery actions on Operations Health: each asks first, runs once at a time per row, says how it
 * went and reloads the day. Provided by the page shell beside {@link OpsHealthStore}.
 */
@Injectable()
export class OpsRecovery {
  private service = inject(OpsHealthService);
  private store = inject(OpsHealthStore);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  private readonly inFlight = signal<ReadonlySet<string>>(new Set());

  isPending(action: RecoveryAction, id: string): boolean {
    return this.inFlight().has(recoveryKey(action, id));
  }

  resendCompletion(batchId: string): void {
    this.confirmThenRun('RESEND_SETTLE_COMPLETE', batchId, {
      heading: this.text('labels.heading.Resend settlement completion'),
      message: this.text('labels.text.Resend settlement completion prompt', { batchId }),
      done: this.text('labels.text.Queued for resend'),
      send: () => this.service.resendCompletion(batchId)
    });
  }

  rescheduleBatch(batch: SettlementBatch): void {
    this.confirmThenRun('RESCHEDULE_BATCH', batch.batchId, {
      heading: this.text('labels.heading.Reschedule settlement batch'),
      message: this.text('labels.text.Reschedule batch prompt', {
        batchId: batch.batchId,
        count: batch.declaredCount ?? '—',
        amount: naira(batch.declaredAmount)
      }),
      done: this.text('labels.text.Rescheduled; posting shortly'),
      send: () => this.service.rescheduleBatch(batch.batchId)
    });
  }

  /** @param {string} eocId Only names the run in the prompt; the run id is what is sent. */
  resendEocCompletion(runId: string, eocId: string): void {
    this.confirmThenRun('RESEND_EOC_COMPLETE', runId, {
      heading: this.text('labels.heading.Resend EOC Complete'),
      message: this.text('labels.text.Resend EOC Complete prompt', { eocId }),
      done: this.text('labels.text.Queued for resend'),
      send: () => this.service.resendEocCompletion(runId)
    });
  }

  private confirmThenRun(action: RecoveryAction, id: string, recovery: Recovery): void {
    const key = recoveryKey(action, id);
    if (this.inFlight().has(key)) {
      return;
    }
    this.dialog
      .open<OpsConfirmDialogComponent, OpsConfirmData, boolean>(OpsConfirmDialogComponent, {
        data: { heading: recovery.heading, message: recovery.message }
      })
      .afterClosed()
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => this.run(key, recovery));
  }

  private run(key: string, recovery: Recovery): void {
    this.setInFlight(key, true);
    recovery
      .send()
      .pipe(
        finalize(() => {
          this.setInFlight(key, false);
          this.store.refresh();
        })
      )
      .subscribe({
        next: () => this.tell(recovery.done),
        error: (error: HttpErrorResponse) =>
          this.tell(error?.error?.defaultUserMessage ?? this.text('labels.text.The action could not be done'))
      });
  }

  private tell(message: string): void {
    this.snackBar.open(message, this.text('labels.buttons.Close'), { duration: 6000 });
  }

  private setInFlight(key: string, on: boolean): void {
    this.inFlight.update((keys) => {
      const next = new Set(keys);
      if (on) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  private text(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }
}

function recoveryKey(action: RecoveryAction, id: string): string {
  return `${action}|${id}`;
}
