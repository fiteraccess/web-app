/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Component, effect, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { ActivatedRoute, NavigationEnd, Router, RouterLinkActive, RouterOutlet } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** rxjs Imports */
import { filter } from 'rxjs/operators';

/** Custom Components */
import { OpsMarkComponent } from './mark/ops-mark.component';

/** Custom Services */
import { OpsHealthStore } from './ops-health.store';

/** Custom Models */
import { Mark, OpsHealth, StepId } from './ops-health.model';
import { LAGOS_TZ, MAX_DAYS_BACK, OPS_TABS, isoDate, parseIsoDate } from './ops-health-presentation';

/**
 * Operations Health: the stored settlement and end-of-day rows of one business date and the calls exchanged with
 * Access, as they are. The shell owns the date, the refresh and the tabs; each tab reads the shared {@link OpsHealthStore}.
 */
@Component({
  selector: 'mifosx-operations-health',
  templateUrl: './operations-health.component.html',
  styleUrls: ['./operations-health.component.scss'],
  providers: [OpsHealthStore],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    RouterLinkActive,
    RouterOutlet,
    OpsMarkComponent
  ]
})
export class OperationsHealthComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly store = inject(OpsHealthStore);

  readonly tabs = OPS_TABS;
  readonly lagos = LAGOS_TZ;

  readonly dateControl = new FormControl<Date | null>(null);
  private readonly picker = viewChild<MatDatepicker<Date>>('businessDatePicker');
  maxDate = new Date();
  minDate = this.daysBefore(this.maxDate, MAX_DAYS_BACK);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const date = params.get('businessDate') || null;
      if (date) {
        this.dateControl.setValue(parseIsoDate(date), { emitEvent: false });
      }
      this.store.selectDate(date);
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.closePicker();
        this.store.revisit();
      });

    // A load (refresh, the minute's refresh or a new date) can move the field; the calendar must not float away.
    effect(() => {
      if (this.store.loading()) {
        this.closePicker();
      }
    });

    effect(() => {
      const health = this.store.health();
      if (health) {
        this.showDay(health);
      }
    });
  }

  stepMark(health: OpsHealth, step: StepId): Mark {
    return health.steps.find((candidate) => candidate.id === step)?.mark ?? 'NONE';
  }

  onDatePicked(date: Date | null): void {
    if (!date) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { businessDate: isoDate(date) },
      queryParamsHandling: 'merge'
    });
  }

  refresh(): void {
    this.store.refresh();
  }

  /** Keeps the picker, its bounds and the URL on the day the server assessed. */
  private showDay(health: OpsHealth): void {
    const today = parseIsoDate(health.today);
    if (today) {
      this.maxDate = today;
      this.minDate = this.daysBefore(today, MAX_DAYS_BACK);
    }
    this.dateControl.setValue(parseIsoDate(health.businessDate), { emitEvent: false });
    if (!this.route.snapshot.queryParamMap.get('businessDate')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { businessDate: health.businessDate },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  private closePicker(): void {
    this.picker()?.close();
  }

  private daysBefore(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
  }
}
