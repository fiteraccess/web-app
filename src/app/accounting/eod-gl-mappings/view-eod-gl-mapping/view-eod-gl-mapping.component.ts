/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { GLAccount } from 'app/shared/models/general.model';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AccountingService } from '../../accounting.service';
import { buildEodGlMappingRequest, createEodGlMappingEditForm } from '../eod-gl-mapping-form.model';
import { EodGlMapping, EodGlMappingPreview, MIRRORED_JOBS, ResolvedGl, synapseMessage } from '../eod-gl-mapping.model';
import { EodGlMappingOptions } from '../eod-gl-mapping-options.resolver';

/** One mapping row, what its Fineract references resolve to now, and the operator actions on it. */
@Component({
  selector: 'mifosx-view-eod-gl-mapping',
  templateUrl: './view-eod-gl-mapping.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitle,
    MatProgressBar
  ]
})
export class ViewEodGlMappingComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private accountingService = inject(AccountingService);

  mapping: EodGlMapping;
  glAccounts: GLAccount[] = [];
  preview: EodGlMappingPreview | null = null;
  previewError: string | null = null;
  actionError: string | null = null;

  constructor() {
    this.route.data.subscribe((data: { eodGlMapping: EodGlMapping; eodGlMappingOptions: EodGlMappingOptions }) => {
      this.mapping = data.eodGlMapping;
      this.glAccounts = data.eodGlMappingOptions?.glAccounts ?? [];
      this.loadPreview();
    });
  }

  get mirrored(): boolean {
    return MIRRORED_JOBS.includes(this.mapping.job);
  }

  glLabel(gl: ResolvedGl | null): string {
    if (!gl) return '—';
    const name = this.glAccounts.find((a) => a.id === gl.glId)?.name;
    return name ? `(${gl.glCode}) ${name}` : `(${gl.glCode})`;
  }

  toggleActive(): void {
    const form = createEodGlMappingEditForm(this.mapping);
    form.controls.active.setValue(!this.mapping.active);
    this.accountingService
      .putEodGlMapping(this.mapping.job, this.mapping.logicalName, buildEodGlMappingRequest(form))
      .subscribe({
        next: (saved) => {
          this.mapping = saved;
          this.actionError = null;
          this.loadPreview();
        },
        error: (e) => (this.actionError = synapseMessage(e))
      });
  }

  delete(): void {
    const ref = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `EOD GL mapping ${this.mapping.job}/${this.mapping.logicalName}` }
    });
    ref.afterClosed().subscribe((response: { delete?: boolean }) => {
      if (!response?.delete) return;
      this.accountingService.deleteEodGlMapping(this.mapping.job, this.mapping.logicalName).subscribe({
        next: () => this.router.navigate(['/accounting/eod-gl-mappings']),
        error: (e) => (this.actionError = synapseMessage(e))
      });
    });
  }

  private loadPreview(): void {
    this.preview = null;
    this.previewError = null;
    if (!this.mirrored) return;
    const request = buildEodGlMappingRequest(createEodGlMappingEditForm(this.mapping));
    this.accountingService.previewEodGlMapping(this.mapping.job, this.mapping.logicalName, request).subscribe({
      next: (preview) => (this.preview = preview),
      error: (e) => (this.previewError = synapseMessage(e))
    });
  }
}
