/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SavingProductSettingsStepComponent } from './saving-product-settings-step.component';

describe('SavingProductSettingsStepComponent product category', () => {
  let fixture: ComponentFixture<SavingProductSettingsStepComponent>;
  let component: SavingProductSettingsStepComponent;

  async function render(template: any) {
    await TestBed.configureTestingModule({
      imports: [
        SavingProductSettingsStepComponent,
        TranslateModule.forRoot()
      ],
      providers: [provideAnimationsAsync()],
      schemas: [NO_ERRORS_SCHEMA]
    })
      // the Previous/Next directives need a parent stepper, which this step is tested without
      .overrideComponent(SavingProductSettingsStepComponent, {
        remove: { imports: [
            MatStepperPrevious,
            MatStepperNext
          ] }
      })
      .compileComponents();
    const iconList = Object.keys(solidIcons)
      .filter((key) => key !== 'fas' && key !== 'prefix' && key.startsWith('fa'))
      .map((icon) => (solidIcons as any)[icon]);
    TestBed.inject(FaIconLibrary).addIcons(...iconList);
    fixture = TestBed.createComponent(SavingProductSettingsStepComponent);
    component = fixture.componentInstance;
    component.savingProductsTemplate = template;
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('starts unselected for a new product and sends null', async () => {
    await render({ productCategoryOptions: [
        { id: 'GOAL' },
        { id: 'AUTOSAVE' },
        { id: 'DIGITAL' }] });

    expect(component.savingProductSettings.productCategory).toBeNull();
    expect(component.productCategoryOptions).toEqual([
      'GOAL',
      'AUTOSAVE',
      'DIGITAL'
    ]);
  });

  it('pre-fills the category of the product being edited', async () => {
    await render({ productCategory: 'AUTOSAVE' });

    expect(component.savingProductSettings.productCategory).toBe('AUTOSAVE');
  });

  describe('monthly withdrawal limit (AB-566)', () => {
    const allTypes = [
      'INTERBANK_TRANSFER',
      'INTRABANK_TRANSFER',
      'OWN_ACCOUNT_TRANSFER',
      'BILL_PAYMENT',
      'AIRTIME',
      'DATA'
    ];
    const optInTypes = [
      'CASH_WITHDRAWAL',
      'CARD_PURCHASE',
      'ATM_WITHDRAWAL'
    ];

    function typeCheckboxes(): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.withdrawal-types-options mat-checkbox'));
    }

    function select(category: string | null) {
      component.savingProductSettingsForm.get('productCategory').setValue(category);
      fixture.detectChanges();
    }

    function limitGroup(): HTMLElement | null {
      return fixture.nativeElement.querySelector('[formcontrolname="monthlyWithdrawalThreshold"]');
    }

    it('shows the limit only for a DIGITAL product', async () => {
      await render({});

      expect(limitGroup()).toBeNull();
      select('GOAL');
      expect(limitGroup()).toBeNull();
      select('AUTOSAVE');
      expect(limitGroup()).toBeNull();
      select('DIGITAL');
      expect(limitGroup()).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[formcontrolname="withdrawalCounterEnabled"]')).not.toBeNull();
      expect(typeCheckboxes().length).toBe(allTypes.length + optInTypes.length);
    });

    it('shows no effective-date hint', async () => {
      await render({});
      select('DIGITAL');

      expect(fixture.nativeElement.querySelector('.section-hint')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('take effect from the start of next month');
    });

    it('defaults a new product to counting the six ticket types against a threshold of four', async () => {
      await render({});
      select('DIGITAL');

      expect(component.savingProductSettings).toEqual(
        expect.objectContaining({
          withdrawalCounterEnabled: true,
          monthlyWithdrawalThreshold: 4,
          qualifyingWithdrawalTypes: allTypes
        })
      );
      expect(component.qualifyingWithdrawalTypeOptions).toEqual([
        ...allTypes,
        ...optInTypes
      ]);
    });

    it('ticks the six ticket types and leaves cash, card and ATM unticked', async () => {
      await render({});
      select('DIGITAL');

      allTypes.forEach((type) => expect(component.isWithdrawalTypeSelected(type)).toBe(true));
      optInTypes.forEach((type) => expect(component.isWithdrawalTypeSelected(type)).toBe(false));
      const checked = typeCheckboxes().filter((box) => box.querySelector('input:checked'));
      expect(checked.length).toBe(allTypes.length);
    });

    it('adds and removes a type in option order when its checkbox is toggled', async () => {
      await render({});
      select('DIGITAL');

      component.toggleWithdrawalType('CASH_WITHDRAWAL', true);
      component.toggleWithdrawalType('AIRTIME', false);

      expect(component.savingProductSettings.qualifyingWithdrawalTypes).toEqual([
        'INTERBANK_TRANSFER',
        'INTRABANK_TRANSFER',
        'OWN_ACCOUNT_TRANSFER',
        'BILL_PAYMENT',
        'DATA',
        'CASH_WITHDRAWAL'
      ]);
      expect(component.savingProductSettingsForm.get('qualifyingWithdrawalTypes').dirty).toBe(true);
    });

    it('offers the template type options when present', async () => {
      await render({ qualifyingWithdrawalTypeOptions: [
          'AIRTIME',
          'DATA'
        ] });

      expect(component.qualifyingWithdrawalTypeOptions).toEqual([
        'AIRTIME',
        'DATA'
      ]);
    });

    it('pre-fills the current rule of the product being edited', async () => {
      await render({
        productCategory: 'DIGITAL',
        withdrawalCounterEnabled: false,
        monthlyWithdrawalThreshold: 2,
        qualifyingWithdrawalTypes: ['AIRTIME'],
        withdrawalRules: [
          {
            effectiveFrom: '2000-01-01',
            withdrawalCounterEnabled: false,
            monthlyWithdrawalThreshold: 2,
            qualifyingWithdrawalTypes: ['AIRTIME']
          }
        ]
      });

      expect(component.savingProductSettings).toEqual(
        expect.objectContaining({
          withdrawalCounterEnabled: false,
          monthlyWithdrawalThreshold: 2,
          qualifyingWithdrawalTypes: ['AIRTIME']
        })
      );
    });

    it('pre-fills the scheduled rule so saving does not overwrite it with the current one', async () => {
      await render({
        productCategory: 'DIGITAL',
        withdrawalCounterEnabled: true,
        monthlyWithdrawalThreshold: 4,
        qualifyingWithdrawalTypes: allTypes,
        withdrawalRules: [
          {
            effectiveFrom: '2000-01-01',
            withdrawalCounterEnabled: true,
            monthlyWithdrawalThreshold: 4,
            qualifyingWithdrawalTypes: allTypes
          },
          {
            effectiveFrom: '2999-01-01',
            withdrawalCounterEnabled: true,
            monthlyWithdrawalThreshold: 6,
            qualifyingWithdrawalTypes: ['DATA']
          }
        ]
      });

      expect(component.savingProductSettings.monthlyWithdrawalThreshold).toBe(6);
      expect(component.savingProductSettings.qualifyingWithdrawalTypes).toEqual(['DATA']);
    });

    it('requires a whole threshold of zero or more', async () => {
      await render({ productCategory: 'DIGITAL' });
      const threshold = component.savingProductSettingsForm.get('monthlyWithdrawalThreshold');

      threshold.setValue(null);
      expect(threshold.hasError('required')).toBe(true);
      threshold.setValue(-1);
      expect(threshold.hasError('min')).toBe(true);
      threshold.setValue(1.5);
      expect(threshold.hasError('pattern')).toBe(true);
      threshold.setValue(0);
      expect(threshold.valid).toBe(true);
      expect(component.savingProductSettingsForm.valid).toBe(true);
    });

    it('disables the threshold while the counter is off and keeps it for the payload', async () => {
      await render({ productCategory: 'DIGITAL', monthlyWithdrawalThreshold: 3 });

      component.savingProductSettingsForm.get('withdrawalCounterEnabled').setValue(false);

      const threshold = component.savingProductSettingsForm.get('monthlyWithdrawalThreshold');
      expect(threshold.disabled).toBe(true);
      expect(component.savingProductSettings.withdrawalCounterEnabled).toBe(false);
      expect(component.savingProductSettings.monthlyWithdrawalThreshold).toBe(3);

      component.savingProductSettingsForm.get('withdrawalCounterEnabled').setValue(true);
      expect(threshold.enabled).toBe(true);
    });

    it('does not let a hidden invalid threshold block other categories', async () => {
      await render({ productCategory: 'DIGITAL' });
      component.savingProductSettingsForm.get('monthlyWithdrawalThreshold').setValue(null);
      expect(component.savingProductSettingsForm.valid).toBe(false);

      select('GOAL');

      expect(component.savingProductSettingsForm.valid).toBe(true);
    });

    it('sends the limit only for a DIGITAL product', async () => {
      await render({ productCategory: 'AUTOSAVE' });

      const payload = component.savingProductSettings;
      expect(payload).not.toHaveProperty('withdrawalCounterEnabled');
      expect(payload).not.toHaveProperty('monthlyWithdrawalThreshold');
      expect(payload).not.toHaveProperty('qualifyingWithdrawalTypes');

      select(null);
      expect(component.savingProductSettings).not.toHaveProperty('withdrawalCounterEnabled');
    });
  });
});
