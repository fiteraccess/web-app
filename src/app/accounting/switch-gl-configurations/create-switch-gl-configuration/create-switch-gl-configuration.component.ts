/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

/** Custom Services */
import { AccountingService } from '../../accounting.service';
import { GLAccount } from 'app/shared/models/general.model';
import { GlAccountSelectorComponent } from '../../../shared/accounting/gl-account-selector/gl-account-selector.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Direction code for the outbound switch direction option. */
const OUTBOUND_DIRECTION_VALUE = 'OUTBOUND';

/**
 * Create switch GL configuration component.
 */
@Component({
  selector: 'mifosx-create-switch-gl-configuration',
  templateUrl: './create-switch-gl-configuration.component.html',
  styleUrls: ['./create-switch-gl-configuration.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    GlAccountSelectorComponent
  ]
})
export class CreateSwitchGlConfigurationComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Switch GL configuration form. */
  switchGlConfigurationForm: UntypedFormGroup;
  /** GL Account options. */
  glAccountOptions: any;
  /** GL Account data, flattened across all buckets returned by the template. */
  glAccountData: GLAccount[] = [];
  /** Direction options. */
  directionOptions: any[] = [];
  /** True if the currently selected direction is OUTBOUND. */
  isOutbound = false;

  /**
   * Retrieves the gl account options and direction options from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {AccountingService} accountingService Accounting Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   */
  constructor() {
    this.route.data.subscribe((data: { switchGlConfigurationsTemplate: any }) => {
      this.glAccountOptions = data.switchGlConfigurationsTemplate.glAccountOptions;
      this.directionOptions = data.switchGlConfigurationsTemplate.directionOptions;
    });
  }

  /**
   * Creates the switch GL configuration form and sets the gl account data.
   */
  ngOnInit() {
    this.createSwitchGlConfigurationForm();
    this.setGlAccountData();
    this.setDirectionChangeHandling();
  }

  /**
   * Creates the switch GL configuration form.
   */
  createSwitchGlConfigurationForm() {
    this.switchGlConfigurationForm = this.formBuilder.group({
      switchCode: [
        '',
        Validators.required
      ],
      direction: [
        '',
        Validators.required
      ],
      principalGlAccountId: [
        '',
        Validators.required
      ],
      switchFeeGlAccountId: [
        ''
      ],
      bankCommissionGlAccountId: [
        ''
      ],
      active: [
        true
      ]
    });
  }

  /**
   * Sets the gl account data by flattening every account bucket the template provides.
   */
  setGlAccountData() {
    this.glAccountData = this.flattenGlAccountOptions(this.glAccountOptions);
  }

  /**
   * Toggles the switch fee / bank commission fields' visibility and validators
   * based on the selected direction.
   */
  setDirectionChangeHandling() {
    this.switchGlConfigurationForm.get('direction').valueChanges.subscribe((direction) => {
      const selectedDirection = this.directionOptions.find((directionOption) => directionOption.id === direction);
      this.isOutbound = !!selectedDirection && selectedDirection.value === OUTBOUND_DIRECTION_VALUE;

      const switchFeeGlAccountIdControl = this.switchGlConfigurationForm.get('switchFeeGlAccountId');
      const bankCommissionGlAccountIdControl = this.switchGlConfigurationForm.get('bankCommissionGlAccountId');

      if (this.isOutbound) {
        switchFeeGlAccountIdControl.setValidators(Validators.required);
        bankCommissionGlAccountIdControl.setValidators(Validators.required);
      } else {
        switchFeeGlAccountIdControl.clearValidators();
        bankCommissionGlAccountIdControl.clearValidators();
        switchFeeGlAccountIdControl.setValue('');
        bankCommissionGlAccountIdControl.setValue('');
      }
      switchFeeGlAccountIdControl.updateValueAndValidity();
      bankCommissionGlAccountIdControl.updateValueAndValidity();
    });
  }

  /**
   * Flattens every gl account bucket (asset, liability, equity, ...) returned by the template
   * into a single list, regardless of which buckets are present.
   * @param {any} glAccountOptions GL account options returned by the template.
   * @returns {GLAccount[]}
   */
  private flattenGlAccountOptions(glAccountOptions: any): GLAccount[] {
    if (!glAccountOptions) {
      return [];
    }
    return Object.keys(glAccountOptions)
      .filter((key) => Array.isArray(glAccountOptions[key]))
      .reduce((accounts: GLAccount[], key: string) => accounts.concat(glAccountOptions[key]), []);
  }

  /**
   * Builds the create/update payload, omitting the switch fee and bank commission
   * gl account ids when the selected direction is not OUTBOUND.
   * @returns {any}
   */
  private buildSwitchGlConfigurationData(): any {
    const formValue = this.switchGlConfigurationForm.value;
    const switchGlConfigurationData: any = {
      switchCode: formValue.switchCode,
      direction: formValue.direction,
      principalGlAccountId: formValue.principalGlAccountId,
      active: formValue.active
    };
    if (this.isOutbound) {
      switchGlConfigurationData.switchFeeGlAccountId = formValue.switchFeeGlAccountId;
      switchGlConfigurationData.bankCommissionGlAccountId = formValue.bankCommissionGlAccountId;
    }
    return switchGlConfigurationData;
  }

  /**
   * Submits the switch GL configuration form and creates the switch GL configuration,
   * if successful redirects to view created switch GL configuration.
   */
  submit() {
    this.accountingService
      .createSwitchGlConfiguration(this.buildSwitchGlConfigurationData())
      .subscribe((response: any) => {
        this.router.navigate(
          [
            '../view',
            response.resourceId
          ],
          { relativeTo: this.route }
        );
      });
  }
}
