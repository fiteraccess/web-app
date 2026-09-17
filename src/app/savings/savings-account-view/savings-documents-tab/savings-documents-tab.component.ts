/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { SavingsService } from 'app/savings/savings.service';
import { SettingsService } from 'app/settings/settings.service';
import { environment } from '../../../../environments/environment';
import { EntityDocumentsTabComponent } from '../../../shared/tabs/entity-documents-tab/entity-documents-tab.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MatTableModule } from '@angular/material/table';
import { CustomerDocument } from 'app/savings/restrictions/restriction-reason.model';
import { RestrictionsService } from 'app/savings/restrictions/restrictions.service';

@Component({
  selector: 'mifosx-savings-documents-tab',
  templateUrl: './savings-documents-tab.component.html',
  styleUrls: ['./savings-documents-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    EntityDocumentsTabComponent,
    MatTableModule
  ]
})
export class SavingsDocumentsTabComponent {
  private route = inject(ActivatedRoute);
  private savingsService = inject(SavingsService);
  private settingsService = inject(SettingsService);
  private restrictionsService = inject(RestrictionsService);
  dialog = inject(MatDialog);

  /** Stores the resolved savings documents data */
  entityDocuments: any;
  /** Stores the saving Account Id */
  entityId: string;
  entityType = 'savings';

  /**
   * The customer's own documents, shown here because a restriction's supporting evidence is filed against the
   * customer — it is identity or address paperwork, reusable across their accounts — while this tab otherwise
   * lists what is attached to this one account. Read-only: evidence is filed by the block and unblock dialogs,
   * so an upload button here would put documents somewhere the restriction could not reference.
   */
  customerDocuments: CustomerDocument[] = [];
  readonly customerDocumentColumns = [
    'name',
    'documentType',
    'uploadedBy',
    'uploadedAt'
  ];

  /**
   * Retrieves the savings data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor() {
    this.route.data.subscribe((data: { savingsDocuments: any }) => {
      this.setSavingsDocumentsData(data.savingsDocuments);
    });
    this.entityId = this.route.parent.snapshot.paramMap.get('savingAccountId');

    const accountNumber = this.route.parent.snapshot.data['savingsAccountData']?.accountNo;
    if (accountNumber) {
      this.restrictionsService.listDocuments(accountNumber).subscribe({
        next: (documents) => (this.customerDocuments = documents),
        // A customer with no documents, or a core that cannot list them, must not blank the account's own.
        error: () => (this.customerDocuments = [])
      });
    }
  }

  /** Fineract serves the file from the client it is filed against, not from this account. */
  customerDocumentUrl(document: CustomerDocument): string {
    return (
      this.settingsService.serverUrl +
      '/clients/' +
      document.parentEntityId +
      '/documents/' +
      document.id +
      '/attachment?tenantIdentifier=' +
      environment.fineractPlatformTenantId
    );
  }

  setSavingsDocumentsData(data: any) {
    data.forEach((ele: any) => {
      ele.docUrl =
        this.settingsService.serverUrl +
        '/savings/' +
        ele.parentEntityId +
        '/documents/' +
        ele.id +
        '/attachment?tenantIdentifier=' +
        environment.fineractPlatformTenantId;
      if (ele.fileName) {
        if (
          ele.fileName.toLowerCase().indexOf('.jpg') !== -1 ||
          ele.fileName.toLowerCase().indexOf('.jpeg') !== -1 ||
          ele.fileName.toLowerCase().indexOf('.png') !== -1
        ) {
          ele.fileIsImage = true;
        }
      }
      if (ele.type) {
        if (ele.type.toLowerCase().indexOf('image') !== -1) {
          ele.fileIsImage = true;
        }
      }
    });
    this.entityDocuments = data;
  }

  uploadDocument(formData: FormData): any {
    return this.savingsService.loadSavingsDocument(this.entityId, formData);
  }

  deleteDocument(documentId: any) {
    this.savingsService.deleteSavingsDocument(this.entityId, documentId).subscribe((res: any) => {});
  }
}
