/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * A PND (Block Withdrawal) reason as the proxy serves it: Fineract's Manage Codes entry plus the proxy's
 * classification. A legal/regulatory reason makes the case/court/regulator reference number mandatory.
 */
export interface RestrictionReason {
  id: number;
  name: string;
  description: string | null;
  legalOrRegulatory: boolean;
}

/** A reason a restriction may be lifted with — one entry of Fineract's `SavingsAccountUnblockReasons` list. */
export interface LiftReason {
  id: number;
  name: string;
  description: string | null;
}

/** The proxy's answer after ruling on a reason — echoes the name so the caller can confirm what it ruled on. */
export interface RestrictionReasonRuling {
  reasonCode: number;
  name: string;
  legal: boolean;
}
