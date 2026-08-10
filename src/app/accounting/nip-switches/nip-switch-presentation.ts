/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NipSwitchConfiguration } from './nip-switch-configuration.model';

export function nipSwitchActionLabel(configuration: NipSwitchConfiguration): 'Edit' | 'Resolve mismatch' {
  return configuration.configurationStatus === 'COMPLETE' ? 'Edit' : 'Resolve mismatch';
}

export function nipSwitchDirectionLabel(configuration: NipSwitchConfiguration): string {
  const accounting = configuration.accounting;
  const transfer = configuration.transferConfiguration;
  if (accounting.configured && transfer.configured && accounting.direction !== transfer.direction) {
    return `${accounting.direction} / ${transfer.direction}`;
  }
  if (accounting.configured) {
    return accounting.direction;
  }
  return transfer.configured ? transfer.direction : '—';
}

export function nipSwitchActiveLabel(configuration: NipSwitchConfiguration): string {
  const accounting = configuration.accounting;
  const transfer = configuration.transferConfiguration;
  if (accounting.configured && transfer.configured && accounting.active !== transfer.active) {
    return 'Mixed';
  }
  const active = accounting.configured ? accounting.active : transfer.configured ? transfer.active : null;
  return active === null ? '—' : active ? 'Yes' : 'No';
}

export function nipSwitchSharedValuesDiffer(configuration: NipSwitchConfiguration): boolean {
  const accounting = configuration.accounting;
  const transfer = configuration.transferConfiguration;
  return (
    accounting.configured &&
    transfer.configured &&
    (accounting.direction !== transfer.direction || accounting.active !== transfer.active)
  );
}
