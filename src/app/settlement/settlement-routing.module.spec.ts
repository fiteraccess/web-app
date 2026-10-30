/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { TestBed } from '@angular/core/testing';
import { ROUTES, Route } from '@angular/router';

import translations from '../../assets/translations/en-US.json';
import { SettlementRoutingModule } from './settlement-routing.module';

/** Every route under `prefix`, with its full path. */
function flatten(routes: Route[], prefix = ''): { path: string; route: Route }[] {
  return routes.flatMap((route) => {
    const path = [
      prefix,
      route.path
    ]
      .filter(Boolean)
      .join('/');
    return [
      { path, route },
      ...flatten(route.children ?? [], path)
    ];
  });
}

describe('Settlement routes', () => {
  let routes: { path: string; route: Route }[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SettlementRoutingModule] });
    routes = flatten(TestBed.inject(ROUTES).flat());
  });

  it('serves Operations Health where the menu links to it', () => {
    expect(routes.map((entry) => entry.path)).toContain('settlement/operations-health');
  });

  it('gives every titled route a translated browser tab title', () => {
    const titles = routes.map((entry) => entry.route.data?.['title']).filter(Boolean);

    expect(titles).toContain('Operations Health');
    for (const title of titles) {
      expect((translations.labels.text as Record<string, string>)[title]).toBe(title);
    }
  });

  it('lists Operations Health in the Reports menu next to the Accounting reports, behind its permission', () => {
    const toolbar = readFileSync(join(__dirname, '../core/shell/toolbar/toolbar.component.html'), 'utf8');
    const reportsMenu = toolbar.slice(
      toolbar.indexOf('#reportsMenu="matMenu"'),
      toolbar.indexOf('#adminMenu="matMenu"')
    );
    const accounting = reportsMenu.indexOf("['/reports', 'Accounting']");
    const opsHealth = reportsMenu.indexOf("['/settlement', 'operations-health']");

    expect(accounting).toBeGreaterThan(-1);
    expect(opsHealth).toBeGreaterThan(accounting);
    expect(reportsMenu.slice(opsHealth)).toMatch(/^[^<]*\*mifosxHasPermission="'READ_OPSHEALTH'"/);
    expect(toolbar.match(/operations-health/g)).toHaveLength(1);
  });
});
