/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { runFixture } from '../testing/synapse-jobs.fixture';
import { SynapseRunErrorDialogComponent } from './synapse-run-error-dialog.component';

describe('Synapse run error dialog', () => {
  function render(errorDetail: string | null): HTMLElement {
    TestBed.configureTestingModule({
      imports: [
        SynapseRunErrorDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: runFixture({ outcome: 'FAILED', errorMessage: 'Connection refused', errorDetail })
        }
      ]
    });
    const fixture = TestBed.createComponent(SynapseRunErrorDialogComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('shows the error message and the stored detail, each in a pre block', () => {
    const element = render('java.net.ConnectException: Connection refused\n\tat Foo.bar(Foo.java:1)');

    expect(element.querySelector('pre.error-message').textContent).toBe('Connection refused');
    expect(element.querySelector('pre.error-detail').textContent).toBe(
      'java.net.ConnectException: Connection refused\n\tat Foo.bar(Foo.java:1)'
    );
  });

  it('leaves the detail out when the run stored none', () => {
    expect(render(null).querySelector('pre.error-detail')).toBeNull();
  });
});
