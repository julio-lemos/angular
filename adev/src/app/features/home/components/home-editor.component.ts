/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  ChangeDetectorRef,
  Component,
  EnvironmentInjector,
  inject,
  Input,
  OnInit,
} from '@angular/core';

import {injectAsync} from '../../../core/services/inject-async';
import {EmbeddedEditor} from '@angular/docs';
import {EmbeddedTutorialManager} from '@angular/docs';

@Component({
  selector: 'adev-code-editor',
  standalone: true,
  imports: [EmbeddedEditor],
  template: `
    <embedded-editor />
  `,
})
export class CodeEditorComponent implements OnInit {
  private readonly cdRef = inject(ChangeDetectorRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly embeddedTutorialManager = inject(EmbeddedTutorialManager);

  @Input({required: true}) tutorialFiles!: string;

  ngOnInit(): void {
    this.loadEmbeddedEditor();
  }

  private async loadEmbeddedEditor() {
    const nodeRuntimeSandbox = await injectAsync(this.environmentInjector, () =>
      import('@angular/docs').then(
        (c) => c.NodeRuntimeSandbox,
      ),
    );

    await this.embeddedTutorialManager.fetchAndSetTutorialFiles(this.tutorialFiles);

    this.cdRef.markForCheck();

    await nodeRuntimeSandbox.init();
  }
}
