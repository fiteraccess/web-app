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
});
