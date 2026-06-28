/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTabGroup, MatTab, MatTabChangeEvent } from '@angular/material/tabs';
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
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Components */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { TxLimitDialogComponent, TxLimitDialogData } from './tx-limit-dialog.component';
import { BalanceCapDialogComponent, BalanceCapDialogData } from './balance-cap-dialog.component';

/** Custom Services */
import { TranslateService } from '@ngx-translate/core';
import { TierPolicyService } from './tier-policy.service';

/** Custom Models */
import { KycTier, KYC_TIERS, formatKycTier } from '../../clients/kyc/kyc.model';
import { TierBalanceCap, TierPolicy, TierTxLimit } from './tier-policy.model';

/**
 * Tier Policy Component.
 */
@Component({
  selector: 'mifosx-tier-policy',
  templateUrl: './tier-policy.component.html',
  styleUrls: ['./tier-policy.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatTabGroup,
    MatTab,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatIconButton,
    MatTooltip
  ]
})
export class TierPolicyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private tierPolicyService = inject(TierPolicyService);
  private translateService = inject(TranslateService);

  /** Ordered list of tiers backing the tab group. */
  tiers = KYC_TIERS;
  /** Cached composite policies keyed by tier. */
  policies: Record<KycTier, TierPolicy | undefined> = {
    TIER_1: undefined,
    TIER_2: undefined,
    TIER_3: undefined
  };
  /** Currently selected tier. */
  selectedTier: KycTier = 'TIER_1';
  /** Resolved payment types, passed into dialogs and used for name lookup. */
  paymentTypes: { id: number; name: string }[] = [];
  /** Resolved currencies, passed into dialogs. */
  currencies: { code: string; name?: string }[] = [];
  /** i18n key for the "saved at" row stamp; held as a property to keep the
   * embedded `{{time}}` placeholder out of the template parser. */
  readonly savedAtKey = 'labels.text.Saved at {{time}}';

  /** Columns displayed in the tx-limits table. */
  txLimitColumns: string[] = [
    'paymentType',
    'currency',
    'perTxCap',
    'dailySpendCap',
    'updatedAt',
    'actions'
  ];
  /** Columns displayed in the balance-caps table. */
  balanceCapColumns: string[] = [
    'currency',
    'balanceCap',
    'updatedAt',
    'actions'
  ];

  ngOnInit() {
    const data = this.route.snapshot.data;
    this.paymentTypes = data['paymentTypes'] || [];
    this.currencies = data['currencies']?.selectedCurrencyOptions || [];
    this.loadTier(this.selectedTier);
  }

  /** Fetches the policy for `tier` if not already cached. */
  loadTier(tier: KycTier) {
    if (this.policies[tier]) {
      return;
    }
    this.tierPolicyService.getTierPolicy(tier).subscribe((policy: TierPolicy) => {
      this.policies[tier] = policy;
    });
  }

  /** Switches the active tier on tab change, fetching if not cached. */
  onTabChange(event: MatTabChangeEvent) {
    this.selectedTier = this.tiers[event.index];
    this.loadTier(this.selectedTier);
  }

  /** Display label for a tier ('TIER_1' → 'Tier 1'). */
  tierLabel(tier: KycTier): string {
    return formatKycTier(tier);
  }

  /** Resolves a payment-type display name for a row; falls back to `#<id>`. */
  paymentTypeName(row: TierTxLimit): string {
    if (row.paymentTypeName) {
      return row.paymentTypeName;
    }
    const found = this.paymentTypes.find((p) => p.id === row.paymentTypeId);
    return found ? found.name : `#${row.paymentTypeId}`;
  }

  /** Opens the tx-limit dialog for create or edit. */
  openTxLimitDialog(row?: TierTxLimit) {
    const data: TxLimitDialogData = {
      tier: this.selectedTier,
      row,
      paymentTypes: this.paymentTypes,
      currencies: this.currencies
    };
    const ref = this.dialog.open(TxLimitDialogComponent, { data });
    ref.afterClosed().subscribe((result: TierTxLimit | undefined) => {
      if (result) {
        this.tierPolicyService.putTxLimit(result).subscribe((saved: TierTxLimit) => {
          this.mergeTxLimit(saved);
        });
      }
    });
  }

  /** Opens the shared delete dialog for a tx-limit row. */
  deleteTxLimit(row: TierTxLimit) {
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: {
        deleteContext:
          this.translateService.instant('labels.inputs.Payment Type') +
          ' ' +
          this.paymentTypeName(row) +
          ' / ' +
          row.currencyCode
      }
    });
    ref.afterClosed().subscribe((response: any) => {
      if (response?.delete) {
        this.tierPolicyService
          .deleteTxLimit(this.selectedTier, row.paymentTypeId, row.currencyCode)
          .subscribe(() => this.removeTxLimit(row));
      }
    });
  }

  /** Opens the balance-cap dialog for create or edit. */
  openBalanceCapDialog(row?: TierBalanceCap) {
    const data: BalanceCapDialogData = {
      tier: this.selectedTier,
      row,
      currencies: this.currencies
    };
    const ref = this.dialog.open(BalanceCapDialogComponent, { data });
    ref.afterClosed().subscribe((result: TierBalanceCap | undefined) => {
      if (result) {
        this.tierPolicyService.putBalanceCap(result).subscribe((saved: TierBalanceCap) => {
          this.mergeBalanceCap(saved);
        });
      }
    });
  }

  /** Opens the shared delete dialog for a balance-cap row. */
  deleteBalanceCap(row: TierBalanceCap) {
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: {
        deleteContext: this.translateService.instant('labels.inputs.Balance Cap') + ' / ' + row.currencyCode
      }
    });
    ref.afterClosed().subscribe((response: any) => {
      if (response?.delete) {
        this.tierPolicyService
          .deleteBalanceCap(this.selectedTier, row.currencyCode)
          .subscribe(() => this.removeBalanceCap(row));
      }
    });
  }

  /** Merges a persisted tx-limit row into the cache (replace by key, or append). */
  private mergeTxLimit(saved: TierTxLimit) {
    const policy = this.policies[saved.tier];
    if (!policy) return;
    const idx = policy.txLimits.findIndex(
      (r) => r.paymentTypeId === saved.paymentTypeId && r.currencyCode === saved.currencyCode
    );
    policy.txLimits = idx >= 0 ? policy.txLimits.map((r, i) => (i === idx ? saved : r)) : [
            ...policy.txLimits,
            saved
          ];
  }

  /** Merges a persisted balance-cap row into the cache (replace by currency, or append). */
  private mergeBalanceCap(saved: TierBalanceCap) {
    const policy = this.policies[saved.tier];
    if (!policy) return;
    const idx = policy.balanceCaps.findIndex((r) => r.currencyCode === saved.currencyCode);
    policy.balanceCaps = idx >= 0 ? policy.balanceCaps.map((r, i) => (i === idx ? saved : r)) : [
            ...policy.balanceCaps,
            saved
          ];
  }

  private removeTxLimit(row: TierTxLimit) {
    const policy = this.policies[this.selectedTier];
    if (!policy) return;
    policy.txLimits = policy.txLimits.filter(
      (r) => !(r.paymentTypeId === row.paymentTypeId && r.currencyCode === row.currencyCode)
    );
  }

  private removeBalanceCap(row: TierBalanceCap) {
    const policy = this.policies[this.selectedTier];
    if (!policy) return;
    policy.balanceCaps = policy.balanceCaps.filter((r) => r.currencyCode !== row.currencyCode);
  }
}
