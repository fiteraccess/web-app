/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input, OnInit, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dates } from 'app/core/utils/dates';
import { SavingsService } from 'app/savings/savings.service';
import { SettingsService } from 'app/settings/settings.service';
import { Currency } from 'app/shared/models/general.model';
import { SystemService } from 'app/system/system.service';
import { RestrictionsService } from 'app/savings/restrictions/restrictions.service';
import { RestrictionReason } from 'app/savings/restrictions/restriction-reason.model';
import { MatCard, MatCardTitle, MatCardContent, MatCardActions } from '@angular/material/card';
import { InputAmountComponent } from '../../../shared/input-amount/input-amount.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

type TransactionCommandType = 'holdamount' | 'blockaccount' | 'blockdeposit' | 'blockwithdrawal';

interface TransactionType {
  holdamount: boolean;
  blockaccount: boolean;
  blockdeposit: boolean;
  blockwithdrawal: boolean;
}

@Component({
  selector: 'mifosx-manage-savings-account',
  templateUrl: './manage-savings-account.component.html',
  styleUrls: ['./manage-savings-account.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardTitle,
    InputAmountComponent
  ]
})
export class ManageSavingsAccountComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private savingsService = inject(SavingsService);
  private dateUtils = inject(Dates);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private systemService = inject(SystemService);
  private settingsService = inject(SettingsService);
  private restrictionsService = inject(RestrictionsService);

  @Input() currency: Currency;
  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();
  /** Manage Savings Account form. */
  manageSavingsAccountForm: UntypedFormGroup;
  /** Savings Account Id */
  savingAccountId: string;
  transactionCommand: TransactionCommandType;

  reasonOptions: any = [];
  /** PND reasons carry the proxy's legal/regulatory flag; the reference number is mandatory for those. */
  pndReasons: RestrictionReason[] = [];
  referenceNumberRequired = false;

  static readonly REASON_MAX_LENGTH = 256;
  static readonly REFERENCE_NUMBER_MAX_LENGTH = 100;
  static readonly NARRATION_MAX_LENGTH = 500;

  transactionType: TransactionType = {
    holdamount: false,
    blockaccount: false,
    blockdeposit: false,
    blockwithdrawal: false
  };

  /**
   * @param {FormBuilder} formBuilder Form Builder
   * @param {SavingsService} savingsService Savings Service
   * @param {Dates} dateUtils Date Utils
   * @param {ActivatedRoute} route Activated Route
   * @param {Router} router Router
   * @param {SettingsService} settingsService Setting service
   */
  constructor() {
    this.transactionCommand = this.route.snapshot.params['name'].toLowerCase().replaceAll(' ', '');
    this.transactionType[this.transactionCommand] = true;
    this.savingAccountId = this.route.snapshot.params['savingAccountId'];
  }

  /**
   * Creates the post interest savings form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createManageSavingsAccountForm();
    if (
      this.transactionType.holdamount ||
      this.transactionType.blockaccount ||
      this.transactionType.blockdeposit ||
      this.transactionType.blockwithdrawal
    ) {
      this.getCodeValues();
    }
  }

  getCodeValues() {
    if (this.transactionType.blockwithdrawal) {
      // PND reasons come from the proxy: same Manage Codes list, plus which of them are legal/regulatory —
      // that is what decides whether the reference number below is mandatory.
      this.restrictionsService.getPndReasons().subscribe((reasons: RestrictionReason[]) => {
        this.pndReasons = reasons;
        this.reasonOptions = reasons;
      });
      return;
    }

    let codeName = 'SavingsTransactionFreezeReasons'; // Default Hold Amount
    if (this.transactionType.blockaccount) {
      codeName = 'SavingsAccountBlockReasons';
    } else if (this.transactionType.blockdeposit) {
      codeName = 'CreditTransactionFreezeReasons';
    }

    this.systemService.getCodes().subscribe((codes: any) => {
      codes.some((code: any) => {
        if (code.name === codeName) {
          this.systemService.getCodeValues(code.id).subscribe((codeValues: any) => {
            this.reasonOptions = codeValues;
            return true;
          });
        }
        return false;
      });
    });
  }

  /**
   * Creates the manage savings account form.
   */
  createManageSavingsAccountForm() {
    if (this.transactionType.holdamount) {
      this.manageSavingsAccountForm = this.formBuilder.group({
        reasonForBlock: [
          '',
          Validators.required
        ],
        transactionDate: [
          '',
          Validators.required
        ],
        transactionAmount: [
          0.0,
          Validators.required
        ]
      });
    } else {
      this.manageSavingsAccountForm = this.formBuilder.group({
        reasonForBlock: [
          '',
          Validators.required
        ],
        narration: [
          '',
          Validators.maxLength(ManageSavingsAccountComponent.NARRATION_MAX_LENGTH)
        ]
      });
      if (this.transactionType.blockwithdrawal) {
        this.manageSavingsAccountForm.addControl(
          'referenceNumber',
          this.formBuilder.control('', Validators.maxLength(ManageSavingsAccountComponent.REFERENCE_NUMBER_MAX_LENGTH))
        );
        this.manageSavingsAccountForm.controls.reasonForBlock.valueChanges.subscribe((reasonId: number) =>
          this.requireReferenceNumberIfLegal(reasonId)
        );
      }
    }
  }

  /** A legal/regulatory PND must cite its case/court/regulator reference; any other PND may. */
  private requireReferenceNumberIfLegal(reasonId: number) {
    const reason = this.pndReasons.find((candidate) => candidate.id === Number(reasonId));
    this.referenceNumberRequired = !!reason?.legalOrRegulatory;
    const control = this.manageSavingsAccountForm.controls.referenceNumber;
    const lengthValidator = Validators.maxLength(ManageSavingsAccountComponent.REFERENCE_NUMBER_MAX_LENGTH);
    control.setValidators(
      this.referenceNumberRequired ? [
            Validators.required,
            lengthValidator
          ] : [lengthValidator]
    );
    control.updateValueAndValidity();
  }

  /** Optional text fields are omitted rather than sent as empty strings, which the proxy would validate. */
  private withoutBlankOptionals(value: { [key: string]: any }): { [key: string]: any } {
    const payload: { [key: string]: any } = {};
    Object.keys(value).forEach((key) => {
      const field = value[key];
      if (!(typeof field === 'string' && field.trim() === '')) {
        payload[key] = field;
      }
    });
    return payload;
  }

  submit() {
    let command = '';
    let payload: { transactionAmount?: number; [key: string]: any } = {};

    if (this.transactionType.holdamount) {
      const manageSavingsAccountFormData = this.manageSavingsAccountForm.value;
      const locale = this.settingsService.language.code;
      const dateFormat = this.settingsService.dateFormat;
      const prevTransactionDate: Date = this.manageSavingsAccountForm.value.transactionDate;
      if (manageSavingsAccountFormData.transactionDate instanceof Date) {
        manageSavingsAccountFormData.transactionDate = this.dateUtils.formatDate(prevTransactionDate, dateFormat);
      }
      payload = {
        ...manageSavingsAccountFormData,
        dateFormat,
        locale
      };
      command = 'holdAmount';
      payload['transactionAmount'] = payload['transactionAmount'] * 1;

      this.savingsService
        .executeSavingsAccountTransactionsCommand(this.savingAccountId, command, payload)
        .subscribe((response: any) => {
          this.router.navigate(['../../transactions'], { relativeTo: this.route });
        });
    } else {
      payload = this.withoutBlankOptionals(this.manageSavingsAccountForm.value);
      command = 'block';
      if (this.transactionType.blockdeposit) {
        command = 'blockCredit';
      } else if (this.transactionType.blockwithdrawal) {
        command = 'blockDebit';
      }

      this.savingsService
        .executeSavingsAccountCommand(this.savingAccountId, command, payload)
        .subscribe((response: any) => {
          this.router.navigate(['../../transactions'], { relativeTo: this.route });
        });
    }
  }
}
