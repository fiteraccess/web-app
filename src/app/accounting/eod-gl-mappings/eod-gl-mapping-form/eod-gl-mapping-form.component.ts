/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AccountingService } from '../../accounting.service';
import {
  buildEodGlMappingRequest,
  createEodGlMappingEditForm,
  createEodGlMappingForm,
  EodGlMappingForm,
  needsSourceKey
} from '../eod-gl-mapping-form.model';
import {
  AMOUNT_SOURCES,
  AmountSource,
  SWITCH_GLS,
  DEFAULT_BRIDGE_ACTIVITY,
  EOD_JOBS,
  EodGlMapping,
  EodGlMappingPreview,
  EodJob,
  PRODUCT_ACCOUNT_KEYS,
  PRODUCT_CATEGORIES,
  ResolvedGl,
  SOURCE_KEY_OPTIONS,
  synapseMessage
} from '../eod-gl-mapping.model';
import { EodGlMappingOptions } from '../eod-gl-mapping-options.resolver';

/** Creates or edits one mapping row; "Check mapping" shows what its Fineract references resolve to before saving. */
@Component({
  selector: 'mifosx-eod-gl-mapping-form',
  templateUrl: './eod-gl-mapping-form.component.html',
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitle,
    MatRadioGroup,
    MatRadioButton,
    MatSlideToggle
  ]
})
export class EodGlMappingFormComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountingService = inject(AccountingService);

  readonly jobs = EOD_JOBS;
  readonly amountSources = AMOUNT_SOURCES;
  readonly switchGls = SWITCH_GLS;
  readonly categories = PRODUCT_CATEGORIES;
  readonly accountKeys = PRODUCT_ACCOUNT_KEYS;

  form: EodGlMappingForm = createEodGlMappingForm();
  editing = false;
  options: EodGlMappingOptions = { activities: [], switchIds: [], aggregatorCodes: [], glAccounts: [] };
  preview: EodGlMappingPreview | null = null;
  serverError: string | null = null;

  constructor() {
    this.route.data.subscribe((data: { eodGlMapping?: EodGlMapping; eodGlMappingOptions: EodGlMappingOptions }) => {
      this.options = data.eodGlMappingOptions ?? this.options;
      if (data.eodGlMapping) {
        this.editing = true;
        this.form = createEodGlMappingEditForm(data.eodGlMapping);
      }
    });
    this.form.valueChanges.subscribe(() => (this.preview = null));
  }

  get job(): EodJob {
    return this.form.controls.job.value;
  }

  get settlement(): boolean {
    return this.job === 'SETTLEMENT';
  }

  get showsSourceKey(): boolean {
    return !this.settlement && needsSourceKey(this.form.controls.amountSource.value);
  }

  /** The keys the chosen amount source accepts; loaded lists for switch and aggregator commissions. */
  get sourceKeyOptions(): string[] {
    const source = this.form.controls.amountSource.value;
    if (source === 'NIP_COMMISSION' || source === 'SWITCH_FEE') return this.options.switchIds;
    if (source === 'BILLS_COMMISSION' || source === 'AIRTIME_COMMISSION') return this.options.aggregatorCodes;
    return SOURCE_KEY_OPTIONS[source] ?? [];
  }

  /** A switch fee row reads the switch's fee GL; a row moving off it goes back to the commission income GL. */
  amountSourceChanged(source: AmountSource): void {
    if (source === 'SWITCH_FEE') {
      this.form.patchValue({ sourceKind: 'SWITCH', switchGl: 'switchFee' });
    } else if (this.form.controls.switchGl.value === 'switchFee') {
      this.form.patchValue({ switchGl: 'commissionIncome' });
    }
  }

  /** A new row's bridge follows its job, as long as the operator has not picked another one. */
  jobChanged(job: EodJob): void {
    this.form.patchValue({
      bridgeActivityId: DEFAULT_BRIDGE_ACTIVITY[job] ?? null,
      amountSource: job === 'SETTLEMENT' ? 'NONE' : 'DEPOSIT_MOVEMENT',
      withFlexcube: job === 'SETTLEMENT'
    });
  }

  glLabel(gl: ResolvedGl | null): string {
    if (!gl) return '—';
    const name = this.options.glAccounts.find((a) => a.id === gl.glId)?.name;
    return name ? `(${gl.glCode}) ${name}` : `(${gl.glCode})`;
  }

  check(): void {
    this.serverError = null;
    const v = this.form.getRawValue();
    this.accountingService
      .previewEodGlMapping(v.job, v.logicalName || 'PREVIEW', buildEodGlMappingRequest(this.form))
      .subscribe({
        next: (preview) => (this.preview = preview),
        error: (e) => (this.serverError = synapseMessage(e))
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverError = null;
    const v = this.form.getRawValue();
    this.accountingService.putEodGlMapping(v.job, v.logicalName, buildEodGlMappingRequest(this.form)).subscribe({
      next: (saved) =>
        this.router.navigate([
          '/accounting/eod-gl-mappings/view',
          saved.job,
          saved.logicalName
        ]),
      error: (e) => (this.serverError = synapseMessage(e))
    });
  }
}
