/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Observable } from 'rxjs';

import {
  NipSwitchConfiguration,
  NipSwitchConfigurationReplacement,
  NipSwitchConfigurationSaveResponse,
  NipSwitchConfigurationStructuredError,
  NipSwitchOperationOutcome
} from './nip-switch-configuration.model';
import { NipSwitchConfigurationSubmission, NipSwitchFormValue } from './nip-switch-form.model';

export type NipSwitchWorkflowMode = 'add' | 'edit' | 'resolve';

export interface NipSwitchSaveCallbacks {
  success(response: NipSwitchConfigurationSaveResponse): void;
  structuredError(error: NipSwitchConfigurationStructuredError): void;
  standardError(error: unknown): void;
}

export type NipSwitchSave = (
  switchId: string,
  replacement: NipSwitchConfigurationReplacement
) => Observable<NipSwitchConfigurationSaveResponse>;

/** Derives editable desired values while preserving each actual component's owned fields. */
export function nipSwitchWorkflowFormValue(
  mode: NipSwitchWorkflowMode,
  configuration?: NipSwitchConfiguration
): NipSwitchFormValue {
  if (mode === 'add' || !configuration) {
    return {};
  }

  const accounting = configuration.accounting;
  const transfer = configuration.transferConfiguration;
  const inconsistent = configuration.configurationStatus === 'INCONSISTENT';

  return {
    switchId: configuration.switchId,
    direction: inconsistent
      ? null
      : accounting.configured
        ? accounting.direction
        : transfer.configured
          ? transfer.direction
          : null,
    switchPayableGlAccountId: accounting.configured ? accounting.switchPayableGlAccountId : null,
    switchFeeGlAccountId: accounting.configured ? accounting.switchFeeGlAccountId : null,
    commissionIncomeGlAccountId: accounting.configured ? accounting.commissionIncomeGlAccountId : null,
    switchReceivableGlAccountId: accounting.configured ? accounting.switchReceivableGlAccountId : null,
    active: inconsistent
      ? null
      : accounting.configured
        ? accounting.active
        : transfer.configured
          ? transfer.active
          : null,
    switchFeeAllocations: transfer.configured
      ? transfer.switchFeeAllocations.map((allocation) => ({ ...allocation }))
      : []
  };
}

/** Holds only the current component's immutable desired request and latest structured outcome. */
export class NipSwitchSaveSession {
  private snapshot: NipSwitchConfigurationSubmission | null = null;
  operation: NipSwitchOperationOutcome | null = null;
  structuredError: NipSwitchConfigurationStructuredError | null = null;

  get retrySubmission(): NipSwitchConfigurationSubmission | null {
    return this.snapshot;
  }

  get canRetry(): boolean {
    return (
      this.snapshot !== null &&
      this.structuredError?.operation.status === 'PARTIAL' &&
      this.structuredError.retryable === true
    );
  }

  capture(submission: NipSwitchConfigurationSubmission): NipSwitchConfigurationSubmission {
    this.snapshot = deepFreeze(cloneSubmission(submission));
    this.operation = null;
    this.structuredError = null;
    return this.snapshot;
  }

  complete(response: NipSwitchConfigurationSaveResponse): void {
    this.operation = response.operation;
    this.structuredError = null;
    this.snapshot = null;
  }

  fail(error: NipSwitchConfigurationStructuredError): void {
    this.operation = error.operation;
    this.structuredError = error;
    if (error.operation.status !== 'PARTIAL' || !error.retryable) {
      this.snapshot = null;
    }
  }

  invalidateRetry(): void {
    this.snapshot = null;
  }
}

/** Coordinates ordinary Save and user-triggered exact Retry through the same composite PUT. */
export class NipSwitchSaveCoordinator {
  readonly session = new NipSwitchSaveSession();
  saving = false;

  constructor(private saveRequest: NipSwitchSave) {}

  save(submission: NipSwitchConfigurationSubmission, callbacks: NipSwitchSaveCallbacks): void {
    this.execute(this.session.capture(submission), callbacks);
  }

  retry(callbacks: NipSwitchSaveCallbacks): boolean {
    const snapshot = this.session.retrySubmission;
    if (!this.session.canRetry || !snapshot) {
      return false;
    }
    this.execute(snapshot, callbacks);
    return true;
  }

  invalidateRetry(): void {
    this.session.invalidateRetry();
  }

  private execute(submission: NipSwitchConfigurationSubmission, callbacks: NipSwitchSaveCallbacks): void {
    this.saving = true;
    this.saveRequest(submission.switchId, submission.replacement).subscribe({
      next: (response) => {
        this.saving = false;
        this.session.complete(response);
        callbacks.success(response);
      },
      error: (response) => {
        this.saving = false;
        const body = response?.error ?? response;
        if (isStructuredCoordinationError(body)) {
          this.session.fail(body);
          callbacks.structuredError(body);
        } else {
          this.session.invalidateRetry();
          callbacks.standardError(response);
        }
      }
    });
  }
}

export function isStructuredCoordinationError(value: unknown): value is NipSwitchConfigurationStructuredError {
  const candidate = value as Partial<NipSwitchConfigurationStructuredError> | null;
  return (
    !!candidate &&
    typeof candidate.retryable === 'boolean' &&
    !!candidate.operation &&
    (candidate.operation.status === 'PARTIAL' || candidate.operation.status === 'FAILED')
  );
}

function cloneSubmission(submission: NipSwitchConfigurationSubmission): NipSwitchConfigurationSubmission {
  return JSON.parse(JSON.stringify(submission)) as NipSwitchConfigurationSubmission;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
