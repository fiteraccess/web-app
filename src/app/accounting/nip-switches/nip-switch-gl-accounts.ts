/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GLAccount } from 'app/shared/models/general.model';

const ASSET_ACCOUNT_TYPE = 1;

export type NipSwitchGlAccountField =
  | 'switchPayableGlAccountId'
  | 'switchFeeGlAccountId'
  | 'commissionIncomeGlAccountId'
  | 'switchReceivableGlAccountId';

export function nipSwitchGlAccountOptions(accounts: readonly GLAccount[], field: NipSwitchGlAccountField): GLAccount[] {
  return accounts.filter(
    (account) =>
      !account.disabled &&
      account.usage.id === 1 &&
      (field !== 'switchReceivableGlAccountId' || account.type.id === ASSET_ACCOUNT_TYPE)
  );
}

export function nipSwitchGlAccountLabel(accountId: number | null | undefined, accounts: readonly GLAccount[]): string {
  if (accountId === null || accountId === undefined) {
    return '—';
  }
  const account = accounts.find(({ id }) => id === accountId);
  return account ? `${account.glCode} - ${account.name}` : String(accountId);
}
