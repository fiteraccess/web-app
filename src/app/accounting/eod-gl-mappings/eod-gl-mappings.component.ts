/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource
} from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { EOD_JOBS, EodGlMapping, FlexGl } from './eod-gl-mapping.model';

/** Lists the EOD GL mirror mapping rows, grouped by job in mirror order. */
@Component({
  selector: 'mifosx-eod-gl-mappings',
  templateUrl: './eod-gl-mappings.component.html',
  styleUrls: ['./eod-gl-mappings.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
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
    MatPaginator
  ]
})
export class EodGlMappingsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  mappings: EodGlMapping[] = [];
  displayedColumns = [
    'job',
    'logicalName',
    'amountSource',
    'source',
    'bridge',
    'flexcube',
    'mirroredThrough',
    'active'
  ];
  dataSource = new MatTableDataSource<EodGlMapping>();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  constructor() {
    this.route.data.subscribe((data: { eodGlMappings: EodGlMapping[] }) => {
      this.mappings = [...(data.eodGlMappings ?? [])].sort(
        (a, b) => EOD_JOBS.indexOf(a.job) - EOD_JOBS.indexOf(b.job) || a.logicalName.localeCompare(b.logicalName)
      );
    });
  }

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource(this.mappings);
    this.dataSource.paginator = this.paginator;
  }

  /** Lets the browser wrap a long reference after its separators instead of overflowing the table. */
  breakable(value: string | null | undefined): string {
    return value ? value.replace(/([:_@])/g, '$1\u200B') : '—';
  }

  flexLabel(source: FlexGl | null, bridge: FlexGl | null): string {
    return source && bridge ? this.breakable(`${source.gl}@${source.branch} → ${bridge.gl}@${bridge.branch}`) : '—';
  }
}
