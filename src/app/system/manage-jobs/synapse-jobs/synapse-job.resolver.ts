/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

/** rxjs Imports */
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/** Custom Services */
import { SynapseJobsService } from './synapse-jobs.service';

/** Custom Models */
import { SynapseJob } from './synapse-jobs.model';
import { SynapseJobsLoadError, loadErrorOf } from './synapse-jobs-presentation';

/** One job looked up by its key; `label` names it in the breadcrumb even when the lookup failed. */
export interface SynapseJobLookup {
  name: string;
  label: string;
  job: SynapseJob | null;
  generatedAt: string | null;
  loadError: SynapseJobsLoadError | null;
}

export function lookupOf(name: string, jobs: SynapseJob[], generatedAt: string): SynapseJobLookup {
  const job = jobs.find((candidate) => candidate.name === name) ?? null;
  return { name, label: job?.displayName ?? name, job, generatedAt, loadError: null };
}

/** Resolves the job of the `:name` route; a failed read still resolves, so the page can say why. */
export const synapseJobResolver: ResolveFn<SynapseJobLookup> = (route) => {
  const name = route.paramMap.get('name');
  return inject(SynapseJobsService)
    .getJobs()
    .pipe(
      map((response) => lookupOf(name, response.jobs, response.generatedAt)),
      catchError((error: unknown) =>
        of<SynapseJobLookup>({ name, label: name, job: null, generatedAt: null, loadError: loadErrorOf(error) })
      )
    );
};
