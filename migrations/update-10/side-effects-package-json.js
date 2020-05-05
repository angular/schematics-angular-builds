"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return async (host, context) => {
        const workspace = await workspace_1.getWorkspace(host);
        const logger = context.logger;
        for (const [projectName, project] of workspace.projects) {
            if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                // Only interested in application projects
                continue;
            }
            const appDir = core_1.join(core_1.normalize(project.sourceRoot || ''), 'app');
            const { subdirs, subfiles } = host.getDir(appDir);
            if (!subdirs.length && !subfiles.length) {
                logger.error(`Application directory '${appDir}' for project '${projectName}' doesn't exist.`);
                continue;
            }
            const pkgJson = core_1.join(appDir, 'package.json');
            if (!host.exists(pkgJson)) {
                const pkgJsonContent = {
                    name: core_1.strings.dasherize(projectName),
                    private: true,
                    description: `This is a special package.json file that is not used by package managers. It is however used to tell the tools and bundlers whether the code under this directory is free of code with non-local side-effect. Any code that does have non-local side-effects can't be well optimized (tree-shaken) and will result in unnecessary increased payload size. It should be safe to set this option to 'false' for new applications, but existing code bases could be broken when built with the production config if the application code does contain non-local side-effects that the application depends on.`,
                    sideEffects: true,
                };
                host.create(pkgJson, JSON.stringify(pkgJsonContent, undefined, 2));
            }
        }
    };
}
exports.default = default_1;
