/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PersonalDataTabComponent } from './personal-data-tab.component';

describe('PersonalDataTabComponent - AB-553 AML declarations', () => {
  let fixture: ComponentFixture<PersonalDataTabComponent>;
  let parentData: BehaviorSubject<any>;

  const baseClient = {
    id: 42,
    displayName: 'Jane Doe',
    legalForm: { id: 1, value: 'PERSON' },
    kyc: { tier: 'TIER_1', bvn: '22345678901' }
  };

  const withAml = (kyc: Record<string, unknown>) => ({
    ...baseClient,
    kyc: { ...baseClient.kyc, ...kyc }
  });

  async function render(clientViewData: any): Promise<void> {
    parentData = new BehaviorSubject({ clientViewData });

    await TestBed.configureTestingModule({
      imports: [
        PersonalDataTabComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        // The component subscribes to route.parent.data in its constructor, not route.data.
        {
          provide: ActivatedRoute,
          useValue: { parent: { data: parentData.asObservable() } }
        },
        provideNativeDateAdapter(),
        provideAnimationsAsync()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PersonalDataTabComponent);
    fixture.detectChanges();
  }

  const text = () => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the display value of each declaration, not its code', async () => {
    await render(
      withAml({
        pepIndicator: { id: 2, code: 'NO', value: 'No' },
        sourceOfFunds: {
          id: 2,
          code: 'BUSINESS_INCOME',
          value: 'Business Income',
          description: 'Income derived from ownership or operation of a business'
        },
        annualIncome: { id: 2, code: 'NGN_2M_TO_10M', value: '₦2 Million – less than ₦10 Million' }
      })
    );

    expect(text()).toContain('Business Income');
    expect(text()).toContain('₦2 Million – less than ₦10 Million');
    expect(text()).not.toContain('BUSINESS_INCOME');
    expect(text()).not.toContain('NGN_2M_TO_10M');
  });

  it('shows the labels the ticket specifies', async () => {
    await render(withAml({ pepIndicator: { id: 1, code: 'YES', value: 'Yes' } }));

    expect(text()).toContain('PEP Indicator');
  });

  // The template renders raw keys here because TestBed loads no translations, so the only meaningful
  // guard against a missing key is the locale file itself - a missing one shows as "labels.inputs.X" in the UI.
  it('has an en-US label for every declaration it renders', () => {
    const labels = require('../../../../assets/translations/en-US.json').labels.inputs;

    expect(labels['PEP Indicator']).toBe('PEP Indicator');
    expect(labels['Source of Funds']).toBe('Source of Funds');
    expect(labels['Annual Income']).toBe('Annual Income');
  });

  it('hides a declaration the client has never set', async () => {
    await render(withAml({ sourceOfFunds: { id: 6, code: 'PENSION', value: 'Pension' } }));

    expect(text()).toContain('Pension');
    expect(text()).not.toContain('PEP Indicator');
    expect(text()).not.toContain('Annual Income');
  });

  it('shows the KYC section for a client carrying only the AML declarations', async () => {
    await render({
      ...baseClient,
      kyc: { annualIncome: { id: 6, code: 'NGN_5B_AND_ABOVE', value: '₦5 Billion and above' } }
    });

    expect(text()).toContain('Annual Income');
    expect(text()).toContain('₦5 Billion and above');
  });

  it('renders no declaration rows and no edit control when the block is absent', async () => {
    await render({ ...baseClient, kyc: undefined });

    expect(text()).not.toContain('PEP Indicator');
    expect(text()).not.toContain('Source of Funds');
    expect(fixture.nativeElement.querySelectorAll('button, input, mat-select').length).toBe(0);
  });
});
