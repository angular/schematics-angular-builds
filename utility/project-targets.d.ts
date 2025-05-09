/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { SchematicsException } from '@angular-devkit/schematics';
import { ProjectDefinition } from './workspace';
export declare function targetBuildNotFoundError(): SchematicsException;
export declare function isUsingApplicationBuilder(project: ProjectDefinition): boolean;
