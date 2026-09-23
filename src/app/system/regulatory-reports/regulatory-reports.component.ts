/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Custom Services */
import { Dates } from 'app/core/utils/dates';
import { RegulatoryReportsService } from './regulatory-reports.service';

/** Custom Models */
import { KYC_TIERS, formatKycTier } from '../../clients/kyc/kyc.model';
import {
  REGULATORY_REPORTS,
  RegulatoryReportDefinition,
  RegulatoryReportKey,
  QuarterlyKycReport,
  WeeklyNewAccountsReport
} from './regulatory-reports.model';
import { downloadXlsx } from '../../shared/excel/xlsx-export';

/**
 * AB-341 Regulatory Reports.
 *
 * Served by Synapse rather than the Fineract report module: KYC tier, BVN, address and the PND/Block
 * restrictions these returns need live in the Synapse database, which a Fineract stretchy report cannot read.
 */
@Component({
  selector: 'mifosx-regulatory-reports',
  templateUrl: './regulatory-reports.component.html',
  styleUrls: ['./regulatory-reports.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar
  ]
})
export class RegulatoryReportsComponent {
  private formBuilder = inject(UntypedFormBuilder);
  private reportsService = inject(RegulatoryReportsService);
  private dateUtils = inject(Dates);

  reports = REGULATORY_REPORTS;
  tiers = KYC_TIERS;
  formatTier = formatKycTier;

  minDate = new Date(2000, 0, 1);
  maxDate = new Date();

  generating = false;
  errorMessage: string | null = null;
  statusMessage: string | null = null;

  form: UntypedFormGroup = this.formBuilder.group({
    report: [
      REGULATORY_REPORTS[0].key,
      Validators.required
    ],
    startDate: [
      '',
      Validators.required
    ],
    endDate: [
      '',
      Validators.required
    ],
    tier: ['']
  });

  get selectedReport(): RegulatoryReportDefinition {
    const key: RegulatoryReportKey = this.form.get('report').value;
    return this.reports.find((report) => report.key === key);
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const startDate = this.formatDate(this.form.get('startDate').value);
    const endDate = this.formatDate(this.form.get('endDate').value);
    if (endDate < startDate) {
      this.errorMessage = 'End date cannot be before start date.';
      return;
    }

    this.generating = true;
    this.errorMessage = null;
    this.statusMessage = null;

    const report = this.selectedReport;
    switch (report.key) {
      case 'kyc-monitoring':
        this.reportsService.getKycMonitoring(startDate, endDate, this.form.get('tier').value || undefined).subscribe({
          next: (result) => this.write(report, result.items, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
      case 'kyc-monitoring-quarterly':
        this.reportsService.getQuarterlyKycMonitoring(startDate, endDate).subscribe({
          next: (result) => this.writeQuarterly(report, result, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
      case 'new-accounts-rendition':
        this.reportsService.getNewAccountsRendition(startDate, endDate).subscribe({
          next: (result) => this.write(report, result.items, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
      case 'new-accounts-weekly':
        this.reportsService.getWeeklyNewAccounts(startDate, endDate).subscribe({
          next: (result) => this.writeWeekly(report, result, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
    }
  }

  private writeQuarterly(
    report: RegulatoryReportDefinition,
    result: QuarterlyKycReport,
    startDate: string,
    endDate: string
  ): void {
    const header: string[] = [];
    // A period starting before the first recorded tier change has incomplete migration counts; say so in the
    // sheet rather than letting a partial figure be filed as final.
    if (result.historyStartsOn && result.historyStartsOn > startDate) {
      header.push(`Migration counts are partial before ${result.historyStartsOn} — tier history starts then.`);
    }
    this.write(report, result.branches, startDate, endDate, header);
  }

  private writeWeekly(
    report: RegulatoryReportDefinition,
    result: WeeklyNewAccountsReport,
    startDate: string,
    endDate: string
  ): void {
    const header = [
      `Reporting Bank: ${result.reportingBank}`,
      `Bank Code: ${result.bankCode}`,
      `Reporting Period: ${result.reportingPeriod}`
    ];
    this.write(report, result.rows, startDate, endDate, header);
  }

  private write(
    report: RegulatoryReportDefinition,
    rows: Record<string, any>[],
    startDate: string,
    endDate: string,
    headerLines: string[] = []
  ): void {
    const fileName = `${report.name} ${startDate} to ${endDate}.xlsx`;
    downloadXlsx(fileName, report.columns, rows ?? [], headerLines)
      .then(() => {
        this.generating = false;
        this.statusMessage = `Downloaded ${rows?.length ?? 0} row(s) as ${fileName}`;
      })
      .catch((error) => this.fail(error));
  }

  private fail(error: any): void {
    this.generating = false;
    this.errorMessage = error?.error?.defaultUserMessage ?? error?.message ?? 'Report generation failed.';
  }

  private formatDate(date: Date): string {
    return this.dateUtils.formatDate(date, Dates.DEFAULT_DATEFORMAT);
  }
}
