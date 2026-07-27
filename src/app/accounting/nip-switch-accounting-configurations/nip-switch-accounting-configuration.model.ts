/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** The directions supported by the Fineract NIP switch accounting resource. */
export const NIP_SWITCH_ACCOUNTING_DIRECTIONS = [
  'OUTBOUND',
  'INBOUND',
  'BOTH'
] as const;

export type NipSwitchAccountingDirection = (typeof NIP_SWITCH_ACCOUNTING_DIRECTIONS)[number];

/** The complete outbound-only mapping accepted by Fineract. */
export interface NipSwitchAccountingOutboundRequest {
  direction: 'OUTBOUND';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  active: boolean;
}

/** The complete inbound-only mapping accepted by Fineract. */
export interface NipSwitchAccountingInboundRequest {
  direction: 'INBOUND';
  switchReceivableGlAccountId: number;
  active: boolean;
}

/** The complete bidirectional mapping accepted by Fineract. */
export interface NipSwitchAccountingBothRequest {
  direction: 'BOTH';
  switchPayableGlAccountId: number;
  switchFeeGlAccountId: number;
  commissionIncomeGlAccountId: number;
  switchReceivableGlAccountId: number;
  active: boolean;
}

/** A complete NIP switch accounting replacement request. */
export type NipSwitchAccountingConfigurationRequest =
  | NipSwitchAccountingOutboundRequest
  | NipSwitchAccountingInboundRequest
  | NipSwitchAccountingBothRequest;

/** A NIP switch accounting configuration returned by Fineract. */
export interface NipSwitchAccountingConfiguration {
  switchId: string;
  direction: NipSwitchAccountingDirection;
  switchPayableGlAccountId?: number | null;
  switchFeeGlAccountId?: number | null;
  commissionIncomeGlAccountId?: number | null;
  switchReceivableGlAccountId?: number | null;
  active: boolean;
}

/** Fineract's standard command result returned after a NIP configuration upsert. */
export interface NipSwitchAccountingCommandResult {
  commandId?: number;
  resourceId?: number;
  resourceIdentifier?: string;
}

/** Whether a direction requires the three outbound account mappings. */
export function hasOutboundNipSwitchAccountingMappings(direction: NipSwitchAccountingDirection): boolean {
  return direction === 'OUTBOUND' || direction === 'BOTH';
}

/** Whether a direction requires the inbound Receivable account mapping. */
export function hasInboundNipSwitchAccountingMappings(direction: NipSwitchAccountingDirection): boolean {
  return direction === 'INBOUND' || direction === 'BOTH';
}
