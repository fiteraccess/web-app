/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler } from '@angular/common/http';
import { EMPTY } from 'rxjs';

import { ApiPrefixInterceptor } from './api-prefix.interceptor';
import { SettingsService } from 'app/settings/settings.service';

const SERVER_HOST = 'https://test.example.com';
const API_PROVIDER = '/fineract-provider/api';
const API_VERSION = '/v1';

const mockSettingsService = {
  serverUrl: `${SERVER_HOST}${API_PROVIDER}${API_VERSION}`,
  baseServerUrl: `${SERVER_HOST}${API_PROVIDER}`,
  serverHost: SERVER_HOST
};

describe('ApiPrefixInterceptor', () => {
  let interceptor: ApiPrefixInterceptor;
  let mockHandler: { handle: jest.Mock };

  beforeEach(() => {
    mockHandler = { handle: jest.fn().mockReturnValue(EMPTY) };

    TestBed.configureTestingModule({
      providers: [
        ApiPrefixInterceptor,
        { provide: SettingsService, useValue: mockSettingsService }]
    });
    interceptor = TestBed.inject(ApiPrefixInterceptor);
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  describe('/access/ URL escape', () => {
    it('should rewrite /access/... URLs using serverHost (bare origin), NOT the fineract prefix', () => {
      const req = new HttpRequest('GET', '/access/api/v1/admin/kyc-tiers/TIER_1/policy');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}/access/api/v1/admin/kyc-tiers/TIER_1/policy`);
    });

    it('should not prepend /fineract-provider for /access/ requests', () => {
      const req = new HttpRequest('GET', '/access/some/endpoint');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).not.toContain('/fineract-provider');
    });
  });

  describe('default fineract-style URL behaviour (regression)', () => {
    it('should rewrite plain requests with full serverUrl (host + apiProvider + apiVersion)', () => {
      const req = new HttpRequest('GET', '/clients');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}${API_PROVIDER}${API_VERSION}/clients`);
    });

    it('should rewrite nested fineract paths with full serverUrl', () => {
      const req = new HttpRequest('GET', '/loans/1/transactions');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}${API_PROVIDER}${API_VERSION}/loans/1/transactions`);
    });
  });

  describe('/actuator/ URL escape', () => {
    it('should rewrite /actuator/... URLs using serverHost (bare origin)', () => {
      const req = new HttpRequest('GET', '/actuator/health');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}/actuator/health`);
    });
  });

  describe('/vN/ versioned URL escape', () => {
    it('should rewrite /v2/... URLs using baseServerUrl (without apiVersion)', () => {
      const req = new HttpRequest('GET', '/v2/some-resource');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}${API_PROVIDER}/v2/some-resource`);
    });

    it('should rewrite /v10/... URLs using baseServerUrl', () => {
      const req = new HttpRequest('GET', '/v10/batch');
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(`${SERVER_HOST}${API_PROVIDER}/v10/batch`);
    });
  });

  describe('absolute URL passthrough', () => {
    it('should not modify URLs that already start with http:', () => {
      const absoluteUrl = 'http://i18n.example.com/translations/en.json';
      const req = new HttpRequest('GET', absoluteUrl);
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(absoluteUrl);
    });

    it('should not modify URLs that already start with https:', () => {
      const absoluteUrl = 'https://i18n.example.com/translations/fr.json';
      const req = new HttpRequest('GET', absoluteUrl);
      interceptor.intercept(req, mockHandler as unknown as HttpHandler).subscribe();

      const captured: HttpRequest<any> = mockHandler.handle.mock.calls[0][0];
      expect(captured.url).toBe(absoluteUrl);
    });
  });
});
