/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GLAccount } from 'app/shared/models/general.model';

/** Returns a GL code/name label, retaining the stored identifier when the account is unavailable. */
export function nipSwitchAccountingGlAccountLabel(
  accountId: number | null | undefined,
  accounts: readonly GLAccount[]
): string {
  if (accountId === null || accountId === undefined) {
    return '';
  }

  const account = accounts.find((option) => option.id === accountId);
  return account ? `(${account.glCode}) ${account.nameDecorated ?? account.name}` : String(accountId);
}
