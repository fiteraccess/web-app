/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  buildAggregatorAccountingReplacement,
  createAggregatorAccountingEditForm,
  createAggregatorAccountingForm
} from './aggregator-accounting-configuration-form.model';
import { AggregatorAccountingConfiguration } from './aggregator-accounting-configuration.model';

const CONFIGURED: AggregatorAccountingConfiguration = {
  aggregatorCode: 'CORALPAY',
  aggregatorPayableGlAccountId: 101,
  commissionIncomeGlAccountId: 102,
  convenienceFeeIncomeGlAccountId: 103,
  billsBridgeGlAccountId: 104,
  active: true
};

describe('aggregator accounting form', () => {
  it('resubmits the saved bills bridge from an unchanged Edit so the full replacement does not clear it', () => {
    const form = createAggregatorAccountingEditForm(CONFIGURED);

    expect(buildAggregatorAccountingReplacement(form)).toEqual({
      aggregatorPayableGlAccountId: 101,
      commissionIncomeGlAccountId: 102,
      convenienceFeeIncomeGlAccountId: 103,
      billsBridgeGlAccountId: 104,
      active: true
    });
  });

  it('sends a null bills bridge when it is cleared or never chosen', () => {
    const cleared = createAggregatorAccountingEditForm(CONFIGURED);
    cleared.controls.billsBridgeGlAccountId.setValue(null);
    const created = createAggregatorAccountingForm({
      aggregatorCode: 'SOCHITEL',
      aggregatorPayableGlAccountId: 101,
      commissionIncomeGlAccountId: 102,
      convenienceFeeIncomeGlAccountId: 103
    });

    expect(buildAggregatorAccountingReplacement(cleared).billsBridgeGlAccountId).toBeNull();
    expect(buildAggregatorAccountingReplacement(created).billsBridgeGlAccountId).toBeNull();
  });

  it('keeps the bills bridge optional', () => {
    const form = createAggregatorAccountingForm({
      aggregatorCode: 'CORALPAY',
      aggregatorPayableGlAccountId: 101,
      commissionIncomeGlAccountId: 102,
      convenienceFeeIncomeGlAccountId: 103
    });

    expect(form.valid).toBe(true);
  });
});
