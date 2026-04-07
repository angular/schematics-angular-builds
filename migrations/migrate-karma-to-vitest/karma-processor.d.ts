/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import type { json } from '@angular-devkit/core';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
export declare function processKarmaConfig(karmaConfig: string, options: Record<string, json.JsonValue | undefined>, projectName: string, context: SchematicContext, tree: Tree, removableKarmaConfigs: Map<string, boolean>, needDevkitPlugin: boolean, manualMigrationFiles: string[]): Promise<void>;
