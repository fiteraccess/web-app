/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, input, signal } from '@angular/core';

/**
 * A stored message or error, as stored: two lines at most until clicked, the whole text on hover. Clicking it again
 * folds it back; a click that ends a text selection leaves it as it is, so the text can still be copied.
 */
@Component({
  selector: 'mifosx-ops-text',
  templateUrl: './ops-text.component.html',
  styleUrls: ['./ops-text.component.scss']
})
export class OpsTextComponent {
  readonly text = input<string | null>(null);

  readonly open = signal(false);

  toggle(): void {
    if (window.getSelection()?.toString()) {
      return;
    }
    this.open.update((open) => !open);
  }
}
