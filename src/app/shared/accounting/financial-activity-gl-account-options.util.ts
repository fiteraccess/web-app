/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** GL account type name (as returned by Fineract) to its bucket key in `glAccountOptions`. */
const GL_ACCOUNT_TYPE_TO_OPTIONS_KEY: Record<string, string> = {
  ASSET: 'assetAccountOptions',
  LIABILITY: 'liabilityAccountOptions',
  EQUITY: 'equityAccountOptions',
  INCOME: 'incomeAccountOptions',
  EXPENSE: 'expenseAccountOptions'
};

/**
 * Resolves the GL account options for a selected financial activity by looking up its
 * `mappedGLAccountType` (returned by Fineract for every financial activity, present or future) rather
 * than hardcoding financial activity IDs — a hardcoded ID switch silently stops working (empty or stale
 * account list) every time a new financial activity is added without updating it in lockstep.
 */
export function resolveFinancialActivityGlAccountOptions(
  glAccountOptions: Record<string, any[]>,
  financialActivityOptions: { id: number; mappedGLAccountType: string }[],
  financialActivityId: number
): any[] {
  const activity = financialActivityOptions?.find((option) => option.id === financialActivityId);
  const optionsKey = activity && GL_ACCOUNT_TYPE_TO_OPTIONS_KEY[activity.mappedGLAccountType];
  return (optionsKey && glAccountOptions?.[optionsKey]) || [];
}
