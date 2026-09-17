/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { RestrictionReason } from 'app/savings/restrictions/restriction-reason.model';
import { RestrictionsService } from 'app/savings/restrictions/restrictions.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from '../../../environments/environment';

/**
 * Rules on which Block Withdrawal (PND) reasons are legal or regulatory, and therefore make the
 * case/court/regulator reference number mandatory when the restriction is placed.
 *
 * <p>The reasons themselves are created and worded in Manage Codes — this screen does not add or rename them.
 * It records the one thing a Fineract CodeValue has nowhere to state. A reason nobody has ruled on shows the
 * proxy's fallback guess from its wording; toggling it either way replaces the guess with an answer.
 */
@Component({
  selector: 'mifosx-restriction-reasons',
  templateUrl: './restriction-reasons.component.html',
  styleUrls: ['./restriction-reasons.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatSlideToggle,
    MatTableModule
  ]
})
export class RestrictionReasonsComponent implements OnInit {
  private authenticationService = inject(AuthenticationService);
  private restrictionsService = inject(RestrictionsService);
  private router = inject(Router);

  reasons: RestrictionReason[] = [];
  canWrite = false;
  loading = true;
  errorMessage = '';
  /** Reason ids with a ruling in flight, so a row disables only itself. */
  saving = new Set<number>();

  ngOnInit(): void {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (!this.hasPermission('READ_CODEVALUE', permissions)) {
      this.router.navigate(['/not-found']);
      return;
    }
    this.canWrite = this.hasPermission('UPDATE_CODEVALUE', permissions);
    this.load();
  }

  onLegalChange(reason: RestrictionReason, change: MatSlideToggleChange): void {
    const previous = reason.legalOrRegulatory;
    const next = change.checked;
    reason.legalOrRegulatory = next;
    this.saving.add(reason.id);
    this.errorMessage = '';

    this.restrictionsService.setReasonLegal(reason.id, next).subscribe({
      next: () => this.saving.delete(reason.id),
      error: (error: HttpErrorResponse) => {
        // Put the row back to what the server still holds, so the screen never shows an unsaved answer.
        reason.legalOrRegulatory = previous;
        this.saving.delete(reason.id);
        this.errorMessage = this.serverMessage(error);
      }
    });
  }

  isSaving(reason: RestrictionReason): boolean {
    return this.saving.has(reason.id);
  }

  private load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.restrictionsService.getPndReasons().subscribe({
      next: (reasons) => {
        this.reasons = reasons;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.serverMessage(error);
        this.loading = false;
      }
    });
  }

  private hasPermission(permission: string, permissions: string[]): boolean {
    if (!environment.productionModeEnableRBAC || permissions.includes('ALL_FUNCTIONS')) {
      return true;
    }
    return (
      permissions.includes(permission) || (permission.startsWith('READ_') && permissions.includes('ALL_FUNCTIONS_READ'))
    );
  }

  private serverMessage(error: HttpErrorResponse): string {
    return (
      error.error?.errors?.[0]?.defaultUserMessage ||
      error.error?.defaultUserMessage ||
      error.error?.message ||
      'Unable to load or save the restriction reasons. Please try again.'
    );
  }
}
