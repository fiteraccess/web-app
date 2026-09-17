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
import { HttpErrorResponse } from '@angular/common/http';
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
  /** The same reasons that demand a reference demand the order behind it. */
  documentRequired = false;
  /** Resolved only where a document can be needed; the action route does not carry the account itself. */
  accountNumber = '';
  file: File | null = null;
  uploading = false;
  errorMessage = '';

  static readonly REASON_MAX_LENGTH = 256;
  static readonly REFERENCE_NUMBER_MAX_LENGTH = 100;
  static readonly NARRATION_MAX_LENGTH = 500;
  /** A court order or regulator directive is neither an identity nor an address document. */
  static readonly ORDER_DOCUMENT_TYPE = 'OTHERS';

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
      // that is what decides whether the reference number and the supporting document below are mandatory.
      this.restrictionsService.getPndReasons().subscribe((reasons: RestrictionReason[]) => {
        this.pndReasons = reasons;
        this.reasonOptions = reasons;
      });
      this.savingsService
        .getSavingsAccountData(this.savingAccountId)
        .subscribe((account: any) => (this.accountNumber = account.accountNo));
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

  /**
   * A legal/regulatory PND must cite its case/court/regulator reference and file the order behind it; any
   * other PND may do neither.
   */
  private requireReferenceNumberIfLegal(reasonId: number) {
    const reason = this.pndReasons.find((candidate) => candidate.id === Number(reasonId));
    this.referenceNumberRequired = !!reason?.legalOrRegulatory;
    this.documentRequired = this.referenceNumberRequired;
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

  private placeRestriction(command: string, payload: { [key: string]: any }): void {
    this.savingsService.executeSavingsAccountCommand(this.savingAccountId, command, payload).subscribe({
      next: () => this.router.navigate(['../../transactions'], { relativeTo: this.route }),
      error: (error: HttpErrorResponse) => (this.errorMessage = this.serverMessage(error))
    });
  }

  private serverMessage(error: HttpErrorResponse): string {
    return (
      error.error?.errors?.[0]?.defaultUserMessage ||
      error.error?.defaultUserMessage ||
      error.error?.message ||
      'The restriction could not be placed. Please try again.'
    );
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.length ? input.files[0] : null;
    this.errorMessage = '';
  }

  get submitDisabled(): boolean {
    return this.manageSavingsAccountForm.invalid || this.uploading || (this.documentRequired && !this.file);
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

      if (!this.documentRequired || !this.file) {
        this.placeRestriction(command, payload);
        return;
      }
      // File the order first: the restriction quotes the id this returns, and a failure here changes nothing.
      this.uploading = true;
      this.errorMessage = '';
      this.restrictionsService
        .uploadDocument(this.accountNumber, this.file, ManageSavingsAccountComponent.ORDER_DOCUMENT_TYPE)
        .subscribe({
          next: (uploaded) => {
            this.uploading = false;
            this.placeRestriction(command, { ...payload, documentId: uploaded.resourceId });
          },
          error: (error: HttpErrorResponse) => {
            this.uploading = false;
            this.errorMessage = this.serverMessage(error);
          }
        });
    }
  }
}
