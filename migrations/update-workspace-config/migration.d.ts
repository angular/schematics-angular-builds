/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { Rule } from '@angular-devkit/schematics';
/**
 * Main entry point for the migration rule.
 *
 * This migration performs the following tasks:
 * - Loops through all application projects in the workspace.
 * - Identifies the build target for each application.
 * - If the `localize` option is enabled but the polyfill `@angular/localize/init` is not present,
 *   it adds the polyfill to the `polyfills` option of the build target.
 *
 * This migration is specifically for application projects that use either the `application` or `browser-esbuild` builders.
 */
export default function (): Rule;
