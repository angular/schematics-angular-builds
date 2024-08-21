"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
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
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        for (const project of workspace.projects.values()) {
            if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                continue;
            }
            const buildTarget = project.targets.get('build');
            if (!buildTarget ||
                (buildTarget.builder !== workspace_models_1.Builders.BuildApplication &&
                    buildTarget.builder !== workspace_models_1.Builders.Application &&
                    buildTarget.builder !== workspace_models_1.Builders.BrowserEsbuild)) {
                continue;
            }
            const polyfills = buildTarget.options?.['polyfills'];
            if (Array.isArray(polyfills) &&
                polyfills.some((polyfill) => typeof polyfill === 'string' && polyfill.startsWith('@angular/localize'))) {
                // Skip the polyfill is already added
                continue;
            }
            for (const [, options] of (0, workspace_1.allTargetOptions)(buildTarget, false)) {
                if (options['localize']) {
                    buildTarget.options ??= {};
                    (buildTarget.options['polyfills'] ??= []).push('@angular/localize/init');
                    break;
                }
            }
        }
    });
}
