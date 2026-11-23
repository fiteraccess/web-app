/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Currency } from 'app/shared/models/general.model';

export interface SavingsAccountTransaction {
  id: number;
  transactionType: SavingsAccountTransactionType;
  entryType: string;
  accountId: number;
  accountNo: string;
  date: number[];
  currency: Currency;
  amount: number;
  runningBalance: number;
  reversed: boolean;
  transfer: Transfer;
  submittedOnDate: number[];
  interestedPostedAsOn: boolean;
  submittedByUsername: string;
  isManualTransaction: boolean;
  isReversal: boolean;
  originalTransactionId: number;
  lienTransaction: boolean;
  releaseTransactionId: number;
  chargesPaidByData: any[];
}

/** One page of `GET /savingsaccounts/{id}/transactions/page`. `nextCursor` is null on the last page. */
export interface SavingsAccountTransactionsPage {
  pageItems: SavingsAccountTransaction[];
  hasMore: boolean;
  nextCursor: string | null;
}

/** Filters of the paged transactions read; an omitted filter means "both". */
export interface SavingsAccountTransactionsPageRequest {
  cursor?: string | null;
  limit?: number;
  excludeTypes?: number[];
  reversed?: boolean;
  reversal?: boolean;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SavingsAccountTransactionType {
  id: number;
  code: string;
  value: string;
  deposit: boolean;
  dividendPayout: boolean;
  withdrawal: boolean;
  interestPosting: boolean;
  feeDeduction: boolean;
  initiateTransfer: boolean;
  approveTransfer: boolean;
  withdrawTransfer: boolean;
  rejectTransfer: boolean;
  overdraftInterest: boolean;
  writtenoff: boolean;
  overdraftFee: boolean;
  withholdTax: boolean;
  escheat: boolean;
  amountHold: boolean;
  amountRelease: boolean;
  accrual: boolean;
}

export interface Transfer {
  id: number;
  reversed: boolean;
  currency: Currency;
  transferAmount: number;
  transferDate: number[];
  transferDescription: string;
}
