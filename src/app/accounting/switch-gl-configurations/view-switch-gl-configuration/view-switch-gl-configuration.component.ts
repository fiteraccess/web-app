/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

/** Custom Services */
import { AccountingService } from '../../accounting.service';

/** Custom Components */
import { DeleteDialogComponent } from '../../../shared/delete-dialog/delete-dialog.component';
import { Location } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { GlAccountDisplayComponent } from '../../../shared/accounting/gl-account-display/gl-account-display.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Direction value for the outbound switch direction option. */
const OUTBOUND_DIRECTION_VALUE = 'OUTBOUND';

/**
 * View switch GL configuration component.
 */
@Component({
  selector: 'mifosx-view-switch-gl-configuration',
  templateUrl: './view-switch-gl-configuration.component.html',
  styleUrls: ['./view-switch-gl-configuration.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    GlAccountDisplayComponent
  ]
})
export class ViewSwitchGlConfigurationComponent {
  private accountingService = inject(AccountingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private location = inject(Location);

  /** Switch GL configuration ID. */
  switchGlConfigurationId: any;
  /** Switch GL configuration data. */
  switchGlConfiguration: any;

  /**
   * Retrieves the switch GL configuration data from `resolve`.
   * @param {AccountingService} accountingService Accounting Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Dialog reference.
   */
  constructor() {
    this.route.data.subscribe((data: { switchGlConfiguration: any }) => {
      this.switchGlConfiguration = data.switchGlConfiguration;
      this.switchGlConfigurationId = data.switchGlConfiguration.id;
    });
  }

  /**
   * True if the switch GL configuration's direction is OUTBOUND.
   */
  isOutbound(): boolean {
    return this.switchGlConfiguration?.direction?.value === OUTBOUND_DIRECTION_VALUE;
  }

  /**
   * Deletes the switch GL configuration and redirects to switch GL configurations.
   */
  deleteSwitchGlConfiguration() {
    const deleteSwitchGlConfigurationDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `switch GL configuration ${this.switchGlConfigurationId}` }
    });
    deleteSwitchGlConfigurationDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.accountingService.deleteSwitchGlConfiguration(this.switchGlConfigurationId).subscribe(() => {
          this.router.navigate(['/accounting/switch-gl-configurations']);
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
