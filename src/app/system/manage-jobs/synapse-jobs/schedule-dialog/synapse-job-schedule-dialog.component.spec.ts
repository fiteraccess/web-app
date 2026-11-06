/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import translations from '../../../../../assets/translations/en-US.json';
import { SynapseJob } from '../synapse-jobs.model';
import { LIMITS, jobsFixture } from '../testing/synapse-jobs.fixture';
import { SynapseJobScheduleDialogComponent } from './synapse-job-schedule-dialog.component';

/** 10:05 in Lagos. */
const NOW = new Date('2026-11-04T09:05:00Z');

describe('Synapse job schedule dialog', () => {
  let fixture: ComponentFixture<SynapseJobScheduleDialogComponent>;
  let close: jest.Mock;

  function open(name: string): void {
    const job: SynapseJob = jobsFixture().jobs.find((candidate) => candidate.name === name);
    close = jest.fn();
    TestBed.configureTestingModule({
      imports: [
        SynapseJobScheduleDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { job, limits: LIMITS, now: NOW } },
        { provide: MatDialogRef, useValue: { close } }]
    });
    TestBed.inject(FaIconLibrary).addIconPacks(fas);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
    fixture = TestBed.createComponent(SynapseJobScheduleDialogComponent);
    fixture.detectChanges();
  }

  function el<T extends HTMLElement>(css: string): T | null {
    return fixture.nativeElement.querySelector(css);
  }

  function text(css: string): string {
    return (el(css)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  function times(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.time')).map((time: Element) =>
      time.getAttribute('data-time')
    );
  }

  function add(time: string): void {
    fixture.componentInstance.newTime.setValue(time);
    el<HTMLButtonElement>('button.add').click();
    fixture.detectChanges();
  }

  describe('an interval job', () => {
    beforeEach(() => open('settlement-collapse'));

    it('edits the idle interval in seconds beside its default', () => {
      expect(fixture.componentInstance.seconds.value).toBe(5);
      expect(text('mat-hint')).toBe('Default: 5 s');
    });

    it('saves the interval in milliseconds', () => {
      fixture.componentInstance.seconds.setValue(60);
      fixture.detectChanges();

      el<HTMLButtonElement>('button.save').click();

      expect(close).toHaveBeenCalledWith({ idleIntervalMs: 60000 });
    });

    it('will not save an interval out of bounds, and says why', () => {
      fixture.componentInstance.seconds.setValue(0);
      fixture.detectChanges();

      expect(el<HTMLButtonElement>('button.save').disabled).toBe(true);
      expect(text('.problem')).toBe('Give a whole number of seconds between 1 and 86400.');
    });

    it('returns the job to its default', () => {
      el<HTMLButtonElement>('button.use-default').click();

      expect(close).toHaveBeenCalledWith({ idleIntervalMs: null });
    });
  });

  describe('a times-of-day job', () => {
    beforeEach(() => open('settlement-eoc'));

    it('lists the times in force, in Lagos time', () => {
      expect(times()).toEqual([
        '09:00',
        '15:00'
      ]);
      expect(text('p.muted')).toContain('it is 10:05 now');
    });

    it('keeps added times in order and says when each new one first runs', () => {
      add('09:45');
      add('11:00');

      expect(times()).toEqual([
        '09:00',
        '09:45',
        '11:00',
        '15:00'
      ]);
      expect(text('[data-time="09:45"] .first-run')).toBe('from tomorrow');
      expect(text('[data-time="11:00"] .first-run')).toBe('from today');
      expect(el('[data-time="09:00"] .first-run')).toBeNull();
    });

    it('saves the list it shows', () => {
      add('11:00');
      el<HTMLButtonElement>('[data-time="09:00"] button.remove').click();
      fixture.detectChanges();

      el<HTMLButtonElement>('button.save').click();

      expect(close).toHaveBeenCalledWith({
        timesOfDay: [
          '11:00',
          '15:00'
        ]
      });
    });

    it('will not save times too close together', () => {
      add('15:10');

      expect(el<HTMLButtonElement>('button.save').disabled).toBe(true);
      expect(text('.problem')).toBe('Times of day must be at least 15 minutes apart.');
    });

    it('returns the job to its default times', () => {
      el<HTMLButtonElement>('button.use-default').click();

      expect(close).toHaveBeenCalledWith({ timesOfDay: null });
    });
  });
});
