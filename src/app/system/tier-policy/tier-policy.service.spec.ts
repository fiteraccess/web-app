/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TierPolicyService } from './tier-policy.service';
import { TierPolicy, TierTxLimit, TierBalanceCap } from './tier-policy.model';

const MOCK_POLICY: TierPolicy = {
  tier: 'TIER_1',
  txLimits: [
    { tier: 'TIER_1', paymentTypeId: 1, currencyCode: 'NGN', perTxCap: 50000, dailySpendCap: 200000 }],
  balanceCaps: [
    { tier: 'TIER_1', currencyCode: 'NGN', balanceCap: 500000 }]
};

const MOCK_TX_LIMIT: TierTxLimit = {
  tier: 'TIER_1',
  paymentTypeId: 1,
  currencyCode: 'NGN',
  perTxCap: 50000,
  dailySpendCap: 200000
};

const MOCK_BALANCE_CAP: TierBalanceCap = {
  tier: 'TIER_1',
  currencyCode: 'NGN',
  balanceCap: 500000
};

describe('TierPolicyService', () => {
  let service: TierPolicyService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TierPolicyService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TierPolicyService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTierPolicy', () => {
    it('sends GET to the correct URL', () => {
      service.getTierPolicy('TIER_1').subscribe();
      const req = httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/TIER_1/policy');
      expect(req.request.method).toBe('GET');
      req.flush(MOCK_POLICY);
    });

    it('returns the parsed TierPolicy on success', () => {
      let result: TierPolicy | undefined;
      service.getTierPolicy('TIER_1').subscribe((policy) => {
        result = policy;
      });
      httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/TIER_1/policy').flush(MOCK_POLICY);
      expect(result).toEqual(MOCK_POLICY);
      expect(result?.txLimits).toHaveLength(1);
      expect(result?.balanceCaps).toHaveLength(1);
    });

    it('propagates a 400 error to the subscriber', () => {
      let errorStatus: number | undefined;
      service.getTierPolicy('TIER_1').subscribe({
        error: (err) => {
          errorStatus = err.status;
        }
      });
      httpTestingController
        .expectOne('/access/api/v1/admin/kyc-tiers/TIER_1/policy')
        .flush(
          { errors: [{ defaultUserMessage: 'Validation failed', userMessageGlobalisationCode: 'error.400' }] },
          { status: 400, statusText: 'Bad Request' }
        );
      expect(errorStatus).toBe(400);
    });

    it('propagates a 404 error to the subscriber', () => {
      let errorStatus: number | undefined;
      service.getTierPolicy('TIER_2').subscribe({
        error: (err) => {
          errorStatus = err.status;
        }
      });
      httpTestingController
        .expectOne('/access/api/v1/admin/kyc-tiers/TIER_2/policy')
        .flush(
          { errors: [{ defaultUserMessage: 'Unknown tier', userMessageGlobalisationCode: 'error.404' }] },
          { status: 404, statusText: 'Not Found' }
        );
      expect(errorStatus).toBe(404);
    });
  });

  describe('putTxLimit', () => {
    it('sends PUT to the correct URL with the row body', () => {
      service.putTxLimit(MOCK_TX_LIMIT).subscribe();
      const req = httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/tier-tx-limits/TIER_1/1/NGN');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(MOCK_TX_LIMIT);
      req.flush(MOCK_TX_LIMIT);
    });
  });

  describe('deleteTxLimit', () => {
    it('sends DELETE to the correct URL', () => {
      service.deleteTxLimit('TIER_1', 1, 'NGN').subscribe();
      const req = httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/tier-tx-limits/TIER_1/1/NGN');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('putBalanceCap', () => {
    it('sends PUT to the correct URL with the row body', () => {
      service.putBalanceCap(MOCK_BALANCE_CAP).subscribe();
      const req = httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/tier-balance-caps/TIER_1/NGN');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(MOCK_BALANCE_CAP);
      req.flush(MOCK_BALANCE_CAP);
    });
  });

  describe('deleteBalanceCap', () => {
    it('sends DELETE to the correct URL', () => {
      service.deleteBalanceCap('TIER_1', 'NGN').subscribe();
      const req = httpTestingController.expectOne('/access/api/v1/admin/kyc-tiers/tier-balance-caps/TIER_1/NGN');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
