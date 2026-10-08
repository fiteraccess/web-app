/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DagreNodesOnlyLayout, Edge, Layout, Node, GraphModule } from '@swimlane/ngx-graph';
import * as shape from 'd3-shape';
import { Subject } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

export class JobStep {
  id: number;
  stepName: string;
  order: number;
}

@Component({
  selector: 'mifosx-workflow-diagram',
  templateUrl: './workflow-diagram.component.html',
  styleUrls: ['./workflow-diagram.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    GraphModule
  ]
})
export class WorkflowDiagramComponent implements OnChanges {
  @Input() jobStepsData: JobStep[] = [];

  diagramSize: [number, number] = [
    1024,
    300
  ];
  public nodes: Node[] = [];
  public links: Edge[] = [];
  public layoutSettings = {
    orientation: 'LR'
  };
  public curve: any = shape.curveLinear;
  public layout: Layout = new DagreNodesOnlyLayout();
  colorScheme = {
    domain: [
      '#5AA454',
      '#A10A28',
      '#C7B42C'
    ]
  };
  center$ = new Subject<any>();

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jobStepsData']) {
      this.buildGraph();
    }
  }

  /** Chains the steps in run order; orders may have gaps (e.g. 1..5 then 9), so each links to the previous step. */
  private buildGraph(): void {
    const steps = [...(this.jobStepsData ?? [])].sort((a, b) => a.order - b.order);
    this.nodes = steps.map((jobStep, index) => ({
      id: `node_${index}`,
      label: jobStep.stepName,
      data: {
        name: jobStep.stepName,
        order: jobStep.order
      }
    }));
    this.links = steps.slice(1).map((jobStep, index) => ({
      id: `link_${index}`,
      source: `node_${index}`,
      target: `node_${index + 1}`,
      label: '',
      data: {
        linkText: 'Precedes of'
      }
    }));
    // trigger center
    this.center$.next(undefined);
  }

  public getStyles(node: Node): any {
    return 'node_odd';
  }
}
