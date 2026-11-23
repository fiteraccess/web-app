/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, Injectable, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UntypedFormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { CurrencyPipe, NgClass } from '@angular/common';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dates } from 'app/core/utils/dates';
import {
  SavingsAccountTransaction,
  SavingsAccountTransactionsPageRequest,
  SavingsAccountTransactionType
} from 'app/savings/models/savings-account-transaction.model';
import { SavingsService } from 'app/savings/savings.service';
import { SettingsService } from 'app/settings/settings.service';
import { UndoTransactionDialogComponent } from '../custom-dialogs/undo-transaction-dialog/undo-transaction-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Currency } from 'app/shared/models/general.model';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton, MatIconButton } from '@angular/material/button';
import { ExternalIdentifierComponent } from '../../../shared/external-identifier/external-identifier.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { DateFormatPipe } from '../../../pipes/date-format.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { EMPTY, Subject, merge } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

/** Fineract's SavingsAccountTransactionType.ACCRUAL. */
const ACCRUAL_TRANSACTION_TYPE_ID = 10;

/** The total is unknown under cursor paging, so the range label shows the rows on screen without "of N". */
@Injectable()
export class CursorPaginatorIntl extends MatPaginatorIntl {
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const start = page * pageSize;
    return length <= start ? '0' : `${start + 1} – ${Math.min(start + pageSize, length)}`;
  };
}

/**
 * Transactions Tab Component.
 */
@Component({
  selector: 'mifosx-transactions-tab',
  templateUrl: './transactions-tab.component.html',
  styleUrls: ['./transactions-tab.component.scss'],
  providers: [{ provide: MatPaginatorIntl, useClass: CursorPaginatorIntl }],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    NgClass,
    ExternalIdentifierComponent,
    MatIconButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    FaIconComponent,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator,
    DateFormatPipe,
    CurrencyPipe
  ]
})
export class TransactionsTabComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private savingsService = inject(SavingsService);
  private settingsService = inject(SettingsService);
  private dialog = inject(MatDialog);
  private dateUtils = inject(Dates);

  /** Savings Account Status */
  status: any;
  /** Currency */
  currency: Currency | null = null;
  /** Transactions of the page on screen. */
  transactions: SavingsAccountTransaction[] = [];
  /** Form control to handle accural parameter */
  hideAccrualsParam = new UntypedFormControl(true);
  hideReversedParam = new UntypedFormControl(false);
  hideReversalContrasParam = new UntypedFormControl(false);
  /** Columns to be displayed in transactions table. */
  displayedColumns: string[] = [
    'row',
    'id',
    'date',
    'externalId',
    'transactionType',
    'debit',
    'credit',
    'balance',
    'actions'
  ];

  pageIndex = 0;
  pageSize = 50;
  hasMore = false;
  loading = true;
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  accountId: string;

  /**
   * The server pages by cursor and never counts the account's history, so only pages already visited can be
   * revisited: entry i is the cursor that fetches page i, and the first page needs none.
   */
  private cursors: (string | null)[] = [null];
  private pageRequests = new Subject<number>();

  /**
   * Retrieves savings account data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor() {
    this.route.parent.parent.data.subscribe((data: { savingsAccountData: any }) => {
      this.status = data.savingsAccountData.status.value;
      this.currency = data.savingsAccountData.currency || null;
    });
    this.accountId = this.route.parent.parent.snapshot.params['savingAccountId'];

    // switchMap drops the response of a page the user has already moved on from.
    this.pageRequests
      .pipe(
        tap(() => (this.loading = true)),
        switchMap((index) =>
          this.savingsService.getSavingsAccountTransactionsPage(this.accountId, this.pageRequest(index)).pipe(
            map((page) => ({ index, page })),
            catchError(() => {
              this.loading = false;
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ index, page }) => {
        this.transactions = page.pageItems;
        this.pageIndex = index;
        this.hasMore = page.hasMore;
        this.cursors = this.cursors.slice(0, index + 1);
        if (page.hasMore) {
          this.cursors.push(page.nextCursor);
        }
        this.loading = false;
      });

    merge(
      this.hideAccrualsParam.valueChanges,
      this.hideReversedParam.valueChanges,
      this.hideReversalContrasParam.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadFirstPage());
  }

  ngOnInit() {
    this.loadFirstPage();
  }

  /** Paginator length: the rows known so far, plus one while the server reports more, which enables "next". */
  get knownLength(): number {
    return this.pageIndex * this.pageSize + this.transactions.length + (this.hasMore ? 1 : 0);
  }

  pageChanged(event: PageEvent): void {
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      this.loadFirstPage();
    } else {
      this.pageRequests.next(event.pageIndex);
    }
  }

  sortChanged(sort: Sort): void {
    this.sortOrder = sort.direction === 'asc' ? 'ASC' : 'DESC';
    this.loadFirstPage();
  }

  /** Cursors only hold under the filters, sort order and page size they were issued for. */
  private loadFirstPage(): void {
    this.cursors = [null];
    this.pageRequests.next(0);
  }

  private pageRequest(index: number): SavingsAccountTransactionsPageRequest {
    return {
      cursor: this.cursors[index],
      limit: this.pageSize,
      sortOrder: this.sortOrder,
      excludeTypes: this.hideAccrualsParam.value ? [ACCRUAL_TRANSACTION_TYPE_ID] : undefined,
      reversed: this.hideReversedParam.value ? false : undefined,
      reversal: this.hideReversalContrasParam.value ? false : undefined
    };
  }

  /**
   * Checks if transaction is debit.
   * @param {any} transactionType Transaction Type
   */
  isDebit(transactionType: SavingsAccountTransactionType) {
    return (
      transactionType.withdrawal === true ||
      transactionType.feeDeduction === true ||
      transactionType.overdraftInterest === true ||
      transactionType.withholdTax === true ||
      transactionType.code === 'savingsAccountTransactionType.goalPenalty' ||
      transactionType.code === 'savingsAccountTransactionType.goalForfeiture'
    );
  }

  isAccrual(transactionType: SavingsAccountTransactionType): boolean {
    return transactionType.accrual || transactionType.code === 'savingsAccountTransactionType.accrual';
  }

  /**
   * Checks transaction status.
   */
  checkStatus() {
    if (
      this.status === 'Active' ||
      this.status === 'Closed' ||
      this.status === 'Transfer in progress' ||
      this.status === 'Transfer on hold' ||
      this.status === 'Premature Closed' ||
      this.status === 'Matured'
    ) {
      return true;
    }
    return false;
  }

  /**
   * Show Transactions Details
   * @param transactionsData Transactions Data
   */
  showTransactions(transactionsData: SavingsAccountTransaction) {
    if (transactionsData.transfer) {
      this.router.navigate([`../transfer-funds/account-transfers/${transactionsData.transfer.id}`], {
        relativeTo: this.route
      });
    } else {
      this.router.navigate(
        [
          transactionsData.id,
          'general'
        ],
        { relativeTo: this.route }
      );
    }
  }

  /**
   * Stops the propagation to view pages.
   * @param $event Mouse Event
   */
  routeEdit($event: MouseEvent) {
    $event.stopPropagation();
  }

  savingsTransactionColor(transaction: SavingsAccountTransaction): string {
    if (transaction.reversed) {
      return 'strike';
    } else if (transaction.transfer) {
      return 'transfer';
    } else if (transaction.transactionType.accrual) {
      return 'accrual';
    } else {
      return '';
    }
  }

  undoTransaction(transactionData: SavingsAccountTransaction): void {
    const undoTransactionAccountDialogRef = this.dialog.open(UndoTransactionDialogComponent);
    undoTransactionAccountDialogRef.afterClosed().subscribe((response: any) => {
      if (response.confirm) {
        const locale = this.settingsService.language.code;
        const dateFormat = this.settingsService.dateFormat;
        const data = {
          transactionDate: this.dateUtils.parseDate(transactionData.date),
          transactionAmount: 0,
          dateFormat,
          locale
        };
        this.savingsService
          .executeSavingsAccountTransactionsCommand(this.accountId, 'undo', data, transactionData.id)
          .subscribe(() => {
            this.reload();
          });
      }
    });
  }

  private reload() {
    const clientId = this.route.parent.parent.snapshot.params['clientId'];
    const url: string = this.router.url;
    this.router
      .navigateByUrl(`/clients/${clientId}/savings-accounts`, { skipLocationChange: true })
      .then(() => this.router.navigate([url]));
  }
}
