/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import ts from 'typescript';

import {migrateCase} from './cases';
import {migrateFor} from './fors';
import {migrateIf} from './ifs';
import {migrateSwitch} from './switches';
import {AnalyzedFile, endMarker, MigrateError, startMarker} from './types';
import {canRemoveCommonModule, formatTemplate, processNgTemplates, removeImports} from './util';

/**
 * Actually migrates a given template to the new syntax
 */
export function migrateTemplate(
    template: string, templateType: string, node: ts.Node, file: AnalyzedFile,
    format: boolean = true,
    analyzedFiles: Map<string, AnalyzedFile>|null): {migrated: string, errors: MigrateError[]} {
  let errors: MigrateError[] = [];
  let migrated = template;
  if (templateType === 'template' || templateType === 'templateUrl') {
    const ifResult = migrateIf(template);
    const forResult = migrateFor(ifResult.migrated);
    const switchResult = migrateSwitch(forResult.migrated);
    const caseResult = migrateCase(switchResult.migrated);
    const templateResult = processNgTemplates(caseResult.migrated);
    if (templateResult.err !== undefined) {
      return {migrated: template, errors: [{type: 'template', error: templateResult.err}]};
    }
    migrated = templateResult.migrated;
    const changed =
        ifResult.changed || forResult.changed || switchResult.changed || caseResult.changed;
    if (format && changed) {
      migrated = formatTemplate(migrated, templateType);
    }
    const markerRegex = new RegExp(`${startMarker}|${endMarker}`, 'gm');
    migrated = migrated.replace(markerRegex, '');
    file.removeCommonModule = canRemoveCommonModule(template);
    file.canRemoveImports = true;

    // when migrating an external template, we have to pass back
    // whether it's safe to remove the CommonModule to the
    // original component class source file
    if (templateType === 'templateUrl' && analyzedFiles !== null &&
        analyzedFiles.has(file.sourceFilePath)) {
      const componentFile = analyzedFiles.get(file.sourceFilePath)!;
      componentFile.removeCommonModule = file.removeCommonModule;
      componentFile.canRemoveImports = file.canRemoveImports;
    }

    errors = [
      ...ifResult.errors,
      ...forResult.errors,
      ...switchResult.errors,
      ...caseResult.errors,
    ];
  } else if (file.canRemoveImports) {
    migrated = removeImports(template, node, file.removeCommonModule);
  }

  return {migrated, errors};
}
