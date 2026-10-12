/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  buildEodGlMappingRequest,
  createEodGlMappingEditForm,
  createEodGlMappingForm,
  fromSourceRef,
  toSourceRef
} from './eod-gl-mapping-form.model';
import { EodGlMapping } from './eod-gl-mapping.model';

const DEPOSIT_ROW: EodGlMapping = {
  id: 1,
  job: 'DEPOSIT',
  logicalName: 'CUSTOMER_REGULAR_SAVINGS_DEPOSIT',
  amountSource: 'DEPOSIT_MOVEMENT',
  sourceKey: null,
  finSourceRef: 'PRODUCT:DIGITAL:savingsControlAccount',
  finBridgeRef: 'ACTIVITY:205',
  normalSide: 'CREDIT',
  flexSource: null,
  flexBridge: null,
  mirroredThrough: null,
  active: true
};

describe('EOD GL mapping form', () => {
  describe('source references', () => {
    it.each([
      'PRODUCT:DIGITAL:savingsControlAccount',
      'ACTIVITY:203',
      'SWITCH:NIBSS:commissionIncome',
      'AGGREGATOR:CORALPAY:commissionIncome'
    ])('round-trips %s through the pickers', (ref) => {
      expect(toSourceRef(fromSourceRef(ref))).toBe(ref);
    });

    it('stays null while a picker is incomplete', () => {
      expect(toSourceRef({ ...fromSourceRef(null), productCategory: 'GOAL' })).toBeNull();
    });
  });

  describe('validation', () => {
    it('asks for a source key where the amount source reads through one', () => {
      const form = createEodGlMappingForm('TAX');
      form.patchValue({
        logicalName: 'VAT_PAYABLE',
        amountSource: 'REFERENCE_TYPE',
        sourceKind: 'ACTIVITY',
        sourceActivityId: 203
      });

      expect(form.errors?.['sourceKeyRequired']).toBe(true);

      form.patchValue({ sourceKey: 'VAT' });
      expect(form.valid).toBe(true);
    });

    it('requires a product GL for deposit movement', () => {
      const form = createEodGlMappingForm('DEPOSIT');
      form.patchValue({
        logicalName: 'X',
        amountSource: 'DEPOSIT_MOVEMENT',
        sourceKind: 'ACTIVITY',
        sourceActivityId: 202
      });

      expect(form.errors?.['depositNeedsProduct']).toBe(true);
    });

    it('takes Flexcube codes all together or not at all, and never the same GL twice', () => {
      const form = createEodGlMappingEditForm(DEPOSIT_ROW);
      form.patchValue({ withFlexcube: true, flexSourceGl: '0760261888', flexSourceBranch: '014' });
      expect(form.errors?.['flexcubeIncomplete']).toBe(true);

      form.patchValue({ flexBridgeGl: '0760261888', flexBridgeBranch: '014' });
      expect(form.errors?.['flexcubeSame']).toBe(true);

      form.patchValue({ flexBridgeGl: '0823345692' });
      expect(form.valid).toBe(true);
    });
  });

  describe('request', () => {
    it('resubmits an unchanged edit exactly as stored', () => {
      expect(buildEodGlMappingRequest(createEodGlMappingEditForm(DEPOSIT_ROW))).toEqual({
        amountSource: 'DEPOSIT_MOVEMENT',
        sourceKey: null,
        finSourceRef: 'PRODUCT:DIGITAL:savingsControlAccount',
        finBridgeRef: 'ACTIVITY:205',
        normalSide: 'CREDIT',
        flexSource: null,
        flexBridge: null,
        active: true
      });
    });

    it('drops a stale source key once the amount source no longer reads one', () => {
      const form = createEodGlMappingEditForm({ ...DEPOSIT_ROW, sourceKey: 'VAT' });

      expect(buildEodGlMappingRequest(form).sourceKey).toBeNull();
    });

    it('defaults a new row to its job bridge and sends a settlement row as Flexcube codes only', () => {
      expect(createEodGlMappingForm('INTEREST').controls.bridgeActivityId.value).toBe(208);

      const settlement = createEodGlMappingForm('SETTLEMENT');
      settlement.patchValue({
        logicalName: 'CBN_MIRROR',
        flexSourceGl: 'A',
        flexSourceBranch: '1',
        flexBridgeGl: 'B',
        flexBridgeBranch: '1'
      });
      expect(buildEodGlMappingRequest(settlement)).toMatchObject({
        amountSource: 'NONE',
        finSourceRef: null,
        finBridgeRef: null
      });
      expect(settlement.valid).toBe(true);
    });

    it('keeps the job and logical name of a stored row fixed', () => {
      const form = createEodGlMappingEditForm(DEPOSIT_ROW);

      expect(form.controls.job.disabled && form.controls.logicalName.disabled).toBe(true);
    });
  });
});
