/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, ViewChild, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
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
import { downloadAttachment } from '../../shared/excel/download-attachment';

/** A generated return, held so Export Excel can only ever file what is on screen. */
interface RenderedReport {
  report: RegulatoryReportDefinition;
  startDate: string;
  endDate: string;
  tier?: string;
  columnKeys: string[];
  headerLines: string[];
  rowCount: number;
  dataSource: MatTableDataSource<Record<string, any>>;
}

/**
 * AB-341 Regulatory Reports. Generate renders the return as a table; Export Excel asks Synapse for the filed
 * workbook, so the sheet is produced by one implementation rather than by whichever client asked for it.
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
    MatProgressBar,
    MatTableModule,
    MatPaginatorModule
  ]
})
export class RegulatoryReportsComponent {
  private formBuilder = inject(UntypedFormBuilder);
  private reportsService = inject(RegulatoryReportsService);
  private dateUtils = inject(Dates);

  @ViewChild(MatPaginator) paginator: MatPaginator;

  reports = REGULATORY_REPORTS;
  tiers = KYC_TIERS;
  formatTier = formatKycTier;

  minDate = new Date(2000, 0, 1);
  maxDate = new Date();

  pageSizeOptions = [
    25,
    50,
    100
  ];

  generating = false;
  exporting = false;
  errorMessage: string | null = null;
  statusMessage: string | null = null;

  /** Null until Generate has run, which is what keeps the table and the Export button hidden. */
  result: RenderedReport | null = null;

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

  /** Drops a rendered return once its parameters change, so Export cannot file a sheet nobody reviewed. */
  onParametersChanged(): void {
    this.result = null;
    this.statusMessage = null;
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

    const report = this.selectedReport;
    const tier = report.supportsTierFilter ? this.form.get('tier').value || undefined : undefined;

    this.generating = true;
    this.errorMessage = null;
    this.statusMessage = null;
    this.result = null;

    switch (report.key) {
      case 'kyc-monitoring':
        this.reportsService.getKycMonitoring(startDate, endDate, tier).subscribe({
          next: (response) => this.render(report, response.items, startDate, endDate, [], tier),
          error: (error) => this.fail(error)
        });
        break;
      case 'kyc-monitoring-quarterly':
        this.reportsService.getQuarterlyKycMonitoring(startDate, endDate).subscribe({
          next: (response) => this.renderQuarterly(report, response, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
      case 'new-accounts-rendition':
        this.reportsService.getNewAccountsRendition(startDate, endDate).subscribe({
          next: (response) => this.render(report, response.items, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
      case 'new-accounts-weekly':
        this.reportsService.getWeeklyNewAccounts(startDate, endDate).subscribe({
          next: (response) => this.renderWeekly(report, response, startDate, endDate),
          error: (error) => this.fail(error)
        });
        break;
    }
  }

  /** Downloads the workbook Synapse renders for the return currently on screen. */
  exportExcel(): void {
    if (!this.result) {
      return;
    }
    const { report, startDate, endDate, tier } = this.result;

    this.exporting = true;
    this.errorMessage = null;
    this.statusMessage = null;

    this.reportsService.exportXlsx(report.key, startDate, endDate, tier).subscribe({
      next: (response) => {
        downloadAttachment(response, `${report.name} ${startDate} to ${endDate}.xlsx`);
        this.exporting = false;
        this.statusMessage = `Exported ${report.name} for ${startDate} to ${endDate}.`;
      },
      error: (error) => this.failExport(error)
    });
  }

  private renderQuarterly(
    report: RegulatoryReportDefinition,
    response: QuarterlyKycReport,
    startDate: string,
    endDate: string
  ): void {
    const headerLines: string[] = [];
    // A period starting before the first recorded tier change has incomplete migration counts; say so on
    // screen rather than letting a partial figure be read as final.
    if (response.historyStartsOn && response.historyStartsOn > startDate) {
      headerLines.push(`Migration counts are partial before ${response.historyStartsOn} - tier history starts then.`);
    }
    this.render(report, response.branches, startDate, endDate, headerLines);
  }

  private renderWeekly(
    report: RegulatoryReportDefinition,
    response: WeeklyNewAccountsReport,
    startDate: string,
    endDate: string
  ): void {
    const headerLines = [
      `Reporting Bank: ${response.reportingBank}`,
      `Bank Code: ${response.bankCode}`,
      `Reporting Period: ${response.reportingPeriod}`
    ];
    this.render(report, response.rows, startDate, endDate, headerLines);
  }

  private render(
    report: RegulatoryReportDefinition,
    rows: Record<string, any>[],
    startDate: string,
    endDate: string,
    headerLines: string[] = [],
    tier?: string
  ): void {
    const dataSource = new MatTableDataSource(rows ?? []);
    this.result = {
      report,
      startDate,
      endDate,
      tier,
      columnKeys: report.columns.map((column) => column.key),
      headerLines,
      rowCount: rows?.length ?? 0,
      dataSource
    };
    this.generating = false;
    this.statusMessage = `${this.result.rowCount} row(s) for ${startDate} to ${endDate}.`;
    // The paginator is rendered by this same change-detection pass, so it does not exist until after it.
    setTimeout(() => (dataSource.paginator = this.paginator));
  }

  private fail(error: any): void {
    this.generating = false;
    this.errorMessage = this.messageOf(error) ?? 'Report generation failed.';
  }

  private failExport(error: any): void {
    this.exporting = false;
    // The request asked for a Blob, so an error body arrives as one too and has to be read back as text.
    if (error?.error instanceof Blob) {
      error.error
        .text()
        .then((text: string) => (this.errorMessage = this.parseUserMessage(text) ?? 'Excel export failed.'))
        .catch(() => (this.errorMessage = 'Excel export failed.'));
      return;
    }
    this.errorMessage = this.messageOf(error) ?? 'Excel export failed.';
  }

  private parseUserMessage(body: string): string | null {
    try {
      return JSON.parse(body)?.defaultUserMessage ?? null;
    } catch {
      return null;
    }
  }

  private messageOf(error: any): string | null {
    return error?.error?.defaultUserMessage ?? error?.message ?? null;
  }

  private formatDate(date: Date): string {
    return this.dateUtils.formatDate(date, Dates.DEFAULT_DATEFORMAT);
  }
}
