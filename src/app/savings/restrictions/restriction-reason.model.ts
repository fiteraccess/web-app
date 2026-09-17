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

/**
 * The document types that establish who a customer is or where they live. A lift must be backed by one of
 * these; `OTHERS` is a filing convenience and proves nothing, so the proxy refuses it.
 */
export const LIFT_DOCUMENT_TYPES = [
  { value: 'NIN_SLIP', label: 'NIN Slip' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVERS_LICENSE', label: 'Drivers License' },
  { value: 'UTILITY_BILL', label: 'Utility Bill' },
  { value: 'PROOF_OF_ADDRESS_CERTIFICATE', label: 'Proof of Address Certificate' }
];

/** What an upload returns — `resourceId` is the id a restriction quotes as `documentId`. */
export interface UploadedDocument {
  resourceId: number;
}

/**
 * A document on file for the account's customer. Fineract's own fields, plus the type, uploader and timestamp
 * the proxy records beside them — `documentType` is null for anything uploaded before the proxy tracked it.
 */
export interface CustomerDocument {
  id: number;
  parentEntityId: number;
  name: string;
  fileName: string;
  documentType: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
}
