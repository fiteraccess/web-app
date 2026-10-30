/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { HttpContext, HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { ErrorHandlerInterceptor, HANDLED_ERROR_STATUSES } from './error-handler.interceptor';
import { AlertService } from '../alert/alert.service';

const URL = '/access/api/v1/ops/health/calls/PAY_WINDOW/1';

describe('ErrorHandlerInterceptor', () => {
  let interceptor: ErrorHandlerInterceptor;
  let alertService: { alert: jest.Mock };

  beforeEach(() => {
    alertService = { alert: jest.fn() };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerInterceptor,
        { provide: AlertService, useValue: alertService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } }]
    });
    interceptor = TestBed.inject(ErrorHandlerInterceptor);
  });

  afterEach(() => jest.restoreAllMocks());

  function failWith(status: number, context = new HttpContext()): unknown {
    const response = new HttpErrorResponse({ status, url: URL, error: { developerMessage: 'refused' } });
    const handler = { handle: () => throwError(() => response) } as unknown as HttpHandler;
    let thrown: unknown;
    interceptor.intercept(new HttpRequest('GET', URL, { context }), handler).subscribe({
      error: (error) => (thrown = error)
    });
    return thrown;
  }

  it('alerts on a 403 the caller did not claim', () => {
    const thrown = failWith(403);

    expect(alertService.alert).toHaveBeenCalledWith({ type: 'Unauthorized Request', message: 'refused' });
    expect((thrown as HttpErrorResponse).status).toBe(403);
  });

  it('stays quiet on a status the caller shows itself, and still throws it', () => {
    const thrown = failWith(
      403,
      new HttpContext().set(
        HANDLED_ERROR_STATUSES,
        [
          403,
          404
        ]
      )
    );

    expect(alertService.alert).not.toHaveBeenCalled();
    expect((thrown as HttpErrorResponse).status).toBe(403);
  });

  it('still alerts on a status the caller did not claim', () => {
    failWith(
      500,
      new HttpContext().set(
        HANDLED_ERROR_STATUSES,
        [
          403,
          404
        ]
      )
    );

    expect(alertService.alert).toHaveBeenCalledWith({
      type: 'Internal Server Error',
      message: 'Internal Server Error. Please try again later.'
    });
  });
});
