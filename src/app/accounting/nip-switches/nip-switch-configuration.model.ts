/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Directions supported by the composite NIP switch administration resource. */
export const NIP_SWITCH_DIRECTIONS = [
  'OUTBOUND',
  'INBOUND',
  'BOTH'
] as const;

export type NipSwitchDirection = (typeof NIP_SWITCH_DIRECTIONS)[number];

export type NipSwitchConfigurationStatus = 'COMPLETE' | 'INCOMPLETE' | 'INCONSISTENT';

/** One fixed switch-fee allocation owned by transfer configuration. */
export interface NipSwitchFeeAllocation {
  currencyCode: string;
  switchFee: number;
}

export interface NipSwitchComponentNotConfigured {
  configured: false;
}

interface NipSwitchAccountingConfiguredBase {
  configured: true;
  active: boolean;
}

/** Actual configured accounting state with direction-compatible GL nullability. */
export interface NipSwitchAccountingOutboundActual extends NipSwitchAccountingConfiguredBase {
  direction: 'OUTBOUND';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  switchReceivableGlAccountId: null;
}

export interface NipSwitchAccountingInboundActual extends NipSwitchAccountingConfiguredBase {
  direction: 'INBOUND';
  switchPayableGlAccountId: null;
  switchFeeGlAccountId: null;
  commissionIncomeGlAccountId: null;
  switchReceivableGlAccountId: number;
}

export interface NipSwitchAccountingBothActual extends NipSwitchAccountingConfiguredBase {
  direction: 'BOTH';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  switchReceivableGlAccountId: number;
}

export type NipSwitchAccountingConfigured =
  | NipSwitchAccountingOutboundActual
  | NipSwitchAccountingInboundActual
  | NipSwitchAccountingBothActual;

export type NipSwitchAccountingActual = NipSwitchAccountingConfigured | NipSwitchComponentNotConfigured;

interface NipSwitchTransferConfigurationConfiguredBase {
  configured: true;
  active: boolean;
}

export type NipSwitchFeeAllocations = [NipSwitchFeeAllocation, ...NipSwitchFeeAllocation[]];

/** Actual routing and allocation state with direction-compatible allocation cardinality. */
export interface NipSwitchTransferConfigurationOutboundActual extends NipSwitchTransferConfigurationConfiguredBase {
  direction: 'OUTBOUND';
  switchFeeAllocations: NipSwitchFeeAllocations;
}

export interface NipSwitchTransferConfigurationInboundActual extends NipSwitchTransferConfigurationConfiguredBase {
  direction: 'INBOUND';
  switchFeeAllocations: [];
}

export interface NipSwitchTransferConfigurationBothActual extends NipSwitchTransferConfigurationConfiguredBase {
  direction: 'BOTH';
  switchFeeAllocations: NipSwitchFeeAllocations;
}

export type NipSwitchTransferConfigurationConfigured =
  | NipSwitchTransferConfigurationOutboundActual
  | NipSwitchTransferConfigurationInboundActual
  | NipSwitchTransferConfigurationBothActual;

export type NipSwitchTransferConfigurationActual =
  | NipSwitchTransferConfigurationConfigured
  | NipSwitchComponentNotConfigured;

/** List/detail representation derived from the two actual components. */
export interface NipSwitchConfiguration {
  switchId: string;
  configurationStatus: NipSwitchConfigurationStatus;
  accounting: NipSwitchAccountingActual;
  transferConfiguration: NipSwitchTransferConfigurationActual;
}

/** Wire envelope returned by the collection GET. */
export interface NipSwitchConfigurationCollection {
  switches: NipSwitchConfiguration[];
}

export interface NipSwitchComponentError {
  code: string;
  message: string;
}

export interface NipSwitchComponentSavedOutcome {
  status: 'SAVED';
  error: null;
}

export interface NipSwitchComponentUnsuccessfulOutcome {
  status: 'FAILED' | 'NOT_ATTEMPTED';
  error: NipSwitchComponentError;
}

export type NipSwitchComponentOutcome = NipSwitchComponentSavedOutcome | NipSwitchComponentUnsuccessfulOutcome;

export interface NipSwitchCompleteOperationOutcome {
  status: 'COMPLETE';
  accounting: NipSwitchComponentSavedOutcome;
  transferConfiguration: NipSwitchComponentSavedOutcome;
}

export type NipSwitchPartialOperationOutcome =
  | {
      status: 'PARTIAL';
      accounting: NipSwitchComponentSavedOutcome;
      transferConfiguration: NipSwitchComponentUnsuccessfulOutcome;
    }
  | {
      status: 'PARTIAL';
      accounting: NipSwitchComponentUnsuccessfulOutcome;
      transferConfiguration: NipSwitchComponentSavedOutcome;
    };

export interface NipSwitchFailedOperationOutcome {
  status: 'FAILED';
  accounting: NipSwitchComponentUnsuccessfulOutcome;
  transferConfiguration: NipSwitchComponentUnsuccessfulOutcome;
}

export type NipSwitchOperationOutcome =
  | NipSwitchCompleteOperationOutcome
  | NipSwitchPartialOperationOutcome
  | NipSwitchFailedOperationOutcome;

/** Composite item returned after a successful create-or-reconcile PUT. */
export type NipSwitchConfigurationSaveResponse = Omit<NipSwitchConfiguration, 'configurationStatus'> & {
  configurationStatus: 'COMPLETE';
  operation: NipSwitchCompleteOperationOutcome;
};

/** Structured error body returned after coordination has begun. */
export interface NipSwitchConfigurationStructuredError {
  code: string;
  message: string;
  retryable: boolean;
  operation: NipSwitchPartialOperationOutcome | NipSwitchFailedOperationOutcome;
}

interface NipSwitchReplacementBase {
  active: boolean;
}

export interface NipSwitchOutboundReplacement extends NipSwitchReplacementBase {
  direction: 'OUTBOUND';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  switchFeeAllocations: NipSwitchFeeAllocations;
}

export interface NipSwitchInboundReplacement extends NipSwitchReplacementBase {
  direction: 'INBOUND';
  switchReceivableGlAccountId: number;
  switchFeeAllocations: [];
}

export interface NipSwitchBothReplacement extends NipSwitchReplacementBase {
  direction: 'BOTH';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  switchReceivableGlAccountId: number;
  switchFeeAllocations: NipSwitchFeeAllocations;
}

/** Full desired-state replacement sent by the unified Add/Edit/Resolve workflow. */
export type NipSwitchConfigurationReplacement =
  | NipSwitchOutboundReplacement
  | NipSwitchInboundReplacement
  | NipSwitchBothReplacement;
