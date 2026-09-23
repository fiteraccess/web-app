/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { HttpResponse } from '@angular/common/http';

/**
 * Saves a binary response the backend rendered, keeping the name the backend chose.
 *
 * @param {HttpResponse<Blob>} response A response whose body is the file.
 * @param {string} fallbackName Used when Content-Disposition is absent, which is what a cross-origin
 *   deployment looks like if the server stops exposing that header.
 */
export function downloadAttachment(response: HttpResponse<Blob>, fallbackName: string): void {
  const url = window.URL.createObjectURL(response.body);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileNameOf(response.headers.get('Content-Disposition')) ?? fallbackName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/** Reads `attachment; filename="..."`, preferring RFC 5987 `filename*` when the server sends one. */
export function fileNameOf(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encoded) {
    return decodeURIComponent(encoded[1].trim());
  }
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted) {
    return quoted[1];
  }
  const bare = /filename=([^;]+)/i.exec(contentDisposition);
  return bare ? bare[1].trim() : null;
}
