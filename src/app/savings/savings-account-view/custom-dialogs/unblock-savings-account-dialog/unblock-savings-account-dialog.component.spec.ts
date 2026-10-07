/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { UnblockSavingsAccountDialogComponent } from './unblock-savings-account-dialog.component';
import { RestrictionsService } from 'app/savings/restrictions/restrictions.service';

describe('UnblockSavingsAccountDialogComponent', () => {
  let component: UnblockSavingsAccountDialogComponent;
  let fixture: ComponentFixture<UnblockSavingsAccountDialogComponent>;
  let dialogRef: { close: jest.Mock };
  let restrictionsService: { getLiftReasons: jest.Mock; uploadDocument: jest.Mock };

  const file = new File(['id'], 'nin.pdf', { type: 'application/pdf' });

  beforeEach(async () => {
    dialogRef = { close: jest.fn() };
    restrictionsService = {
      getLiftReasons: jest.fn(() => of([{ id: 7, name: 'Investigation concluded' }])),
      uploadDocument: jest.fn(() => of({ resourceId: 4001 }))
    };

    await TestBed.configureTestingModule({
      imports: [
        UnblockSavingsAccountDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { heading: 'Unblock Withdrawal', accountNumber: '0012345678' } },
        { provide: RestrictionsService, useValue: restrictionsService }]
    }).compileComponents();

    fixture = TestBed.createComponent(UnblockSavingsAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('confirms an empty lift without uploading anything', () => {
    expect(component.canConfirm).toBe(true);

    component.confirm();

    expect(restrictionsService.uploadDocument).not.toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith({ confirm: true, reasonCode: undefined, narration: undefined });
  });

  it('forwards only the fields the operator supplied', () => {
    component.unblockForm.patchValue({ reasonCode: 7, narration: '  case closed  ' });

    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith({ confirm: true, reasonCode: '7', narration: 'case closed' });
  });

  it('treats a whitespace-only narration as none', () => {
    component.unblockForm.patchValue({ narration: '   ' });

    component.confirm();

    expect(dialogRef.close).toHaveBeenCalledWith({ confirm: true, reasonCode: undefined, narration: undefined });
  });

  it('uploads a chosen file first and forwards its document id', () => {
    component.file = file;
    component.unblockForm.patchValue({ documentType: 'NIN_SLIP' });

    component.confirm();

    expect(restrictionsService.uploadDocument).toHaveBeenCalledWith('0012345678', file, 'NIN_SLIP');
    expect(dialogRef.close).toHaveBeenCalledWith({
      confirm: true,
      reasonCode: undefined,
      narration: undefined,
      documentId: 4001
    });
  });

  it('will not confirm a chosen file whose document type is missing', () => {
    component.file = file;

    expect(component.documentTypeMissing).toBe(true);
    expect(component.canConfirm).toBe(false);
    component.confirm();

    expect(restrictionsService.uploadDocument).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('keeps the dialog open with the server message when the upload fails, and allows a retry', () => {
    component.file = file;
    component.unblockForm.patchValue({ documentType: 'NIN_SLIP' });
    restrictionsService.uploadDocument.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { errors: [{ defaultUserMessage: 'File too large' }] } })
      )
    );

    component.confirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('File too large');
    expect(component.uploading).toBe(false);
    expect(component.canConfirm).toBe(true);
  });

  it('still rejects a narration over the length limit', () => {
    component.unblockForm.patchValue({
      narration: 'n'.repeat(UnblockSavingsAccountDialogComponent.NARRATION_MAX_LENGTH + 1)
    });

    expect(component.canConfirm).toBe(false);
  });
});
