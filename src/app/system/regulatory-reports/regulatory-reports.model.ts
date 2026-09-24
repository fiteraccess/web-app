/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** The four CBN returns of AB-341, keyed by the Synapse route that serves each. */
export type RegulatoryReportKey =
  | 'kyc-monitoring'
  | 'kyc-monitoring-quarterly'
  | 'new-accounts-rendition'
  | 'new-accounts-weekly';

/** One displayed column: the regulator's header text and the response field behind it. */
export interface ReportColumn {
  header: string;
  key: string;
  /** Free-text address columns are long enough to crowd out every other column, so they are capped on screen. */
  wide?: boolean;
}

export interface RegulatoryReportDefinition {
  key: RegulatoryReportKey;
  name: string;
  /** Whether the report takes the KYC tier filter (Report A only). */
  supportsTierFilter: boolean;
  /** Mirrors the order Synapse renders into the workbook, so the table and the export read alike. */
  columns: ReportColumn[];
}

export interface KycMonitoringRow {
  serialNumber: number;
  accountNumber: string;
  accountName: string;
  accountHolderTier?: string;
  bvn?: string;
  accountStatus: string;
  acOpenDate: string;
  accountsBalance: string;
  accountType: string;
}

export interface QuarterlyKycBranchRow {
  branchName: string;
  tier1AccountsOpened: number;
  tier2AccountsOpened: number;
  tier3AccountsOpened: number;
  totalTier1Accounts: number;
  totalTier2Accounts: number;
  totalTier3Accounts: number;
  tier1MigratedToTier2: number;
  tier2MigratedToTier3: number;
  tier1CumulativeBalance: string;
  tier2CumulativeBalance: string;
  tier3CumulativeBalance: string;
  totalCumulativeBalance: string;
}

export interface QuarterlyKycReport {
  periodStart: string;
  periodEnd: string;
  /** Migration counts before this date are partial — tier changes were not recorded then. */
  historyStartsOn?: string;
  branches: QuarterlyKycBranchRow[];
}

export interface NewAccountsRenditionRow {
  accountName: string;
  customerAddress?: string;
  customerAccountNumber: string;
  phoneNumber?: string;
  eMail?: string;
  description?: string;
  dateOpened: string;
  branchCode?: string;
  branchName: string;
  state?: string;
}

export interface WeeklyNewAccountsRow {
  serialNumber: number;
  branchSortCode?: string;
  branchAddress?: string;
  nameOfAccountHolder: string;
  bvn?: string;
  accountNumber: string;
  typeOfAccount: string;
}

export interface WeeklyNewAccountsReport {
  reportingBank: string;
  bankCode: string;
  reportingPeriod: string;
  rows: WeeklyNewAccountsRow[];
}

export interface PagedReport<T> {
  items: T[];
  paging: { limit: number; offset: number; sortDir: string; hasNext: boolean };
}

/**
 * The filed workbook is rendered by Synapse; these drive the on-screen table only. They are still pinned
 * rather than inferred from the response so the preview shows the same columns, in the same order, as the
 * sheet the user is about to download.
 */
export const REGULATORY_REPORTS: RegulatoryReportDefinition[] = [
  {
    key: 'kyc-monitoring',
    name: 'Three-Tiered KYC Monitoring Returns',
    supportsTierFilter: true,
    columns: [
      { header: 'S/N', key: 'serialNumber' },
      { header: 'Account Number', key: 'accountNumber' },
      { header: 'Account Name', key: 'accountName' },
      { header: 'Account Holder Tier', key: 'accountHolderTier' },
      { header: 'BVN', key: 'bvn' },
      { header: 'Account Status', key: 'accountStatus' },
      { header: 'AC_OPEN_DATE', key: 'acOpenDate' },
      { header: 'Accounts Balance', key: 'accountsBalance' },
      { header: 'Account Type', key: 'accountType' }
    ]
  },
  {
    key: 'kyc-monitoring-quarterly',
    name: 'Quarterly Three-Tiered KYC Monitoring',
    supportsTierFilter: false,
    columns: [
      { header: 'Branch Name', key: 'branchName' },
      { header: 'Tier1 Accounts Opened', key: 'tier1AccountsOpened' },
      { header: 'Tier2 Accounts Opened', key: 'tier2AccountsOpened' },
      { header: 'Tier3 Accounts Opened', key: 'tier3AccountsOpened' },
      { header: 'Total Tier1 Accounts', key: 'totalTier1Accounts' },
      { header: 'Total Tier2 Accounts', key: 'totalTier2Accounts' },
      { header: 'Total Tier3 Accounts', key: 'totalTier3Accounts' },
      { header: 'Tier1 Migrated to Tier2', key: 'tier1MigratedToTier2' },
      { header: 'Tier2 Migrated to Tier3', key: 'tier2MigratedToTier3' },
      { header: 'Tier1 Cumulative Balance', key: 'tier1CumulativeBalance' },
      { header: 'Tier2 Cumulative Balance', key: 'tier2CumulativeBalance' },
      { header: 'Tier3 Cumulative Balance', key: 'tier3CumulativeBalance' },
      { header: 'Total Cumulative Balance', key: 'totalCumulativeBalance' }
    ]
  },
  {
    key: 'new-accounts-rendition',
    name: 'Quarterly Rendition of Newly Opened Accounts',
    supportsTierFilter: false,
    columns: [
      { header: 'Account Name', key: 'accountName' },
      { header: 'Customer Address', key: 'customerAddress', wide: true },
      { header: 'Customer Account Number', key: 'customerAccountNumber' },
      { header: 'Phone Number', key: 'phoneNumber' },
      { header: 'E_Mail', key: 'eMail' },
      { header: 'Description', key: 'description' },
      { header: 'Date Opened', key: 'dateOpened' },
      { header: 'Branch Code', key: 'branchCode' },
      { header: 'Branch Name', key: 'branchName' },
      { header: 'State', key: 'state' }
    ]
  },
  {
    key: 'new-accounts-weekly',
    name: 'Weekly Returns on Newly Opened Bank Accounts',
    supportsTierFilter: false,
    columns: [
      { header: 'S/No', key: 'serialNumber' },
      { header: 'Branch Sort Code', key: 'branchSortCode' },
      { header: 'Branch Address', key: 'branchAddress', wide: true },
      { header: 'Name of Account Holder', key: 'nameOfAccountHolder' },
      { header: 'BVN', key: 'bvn' },
      { header: 'Account Number', key: 'accountNumber' },
      { header: 'Type of Account', key: 'typeOfAccount' }
    ]
  }
];
