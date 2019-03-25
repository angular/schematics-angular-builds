"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("../utility/config");
const project_1 = require("../utility/project");
const workspace_models_1 = require("../utility/workspace-models");
function getE2eRoot(projectRoot) {
    const root = core_1.normalize(projectRoot);
    return root ? root + '/e2e' : 'e2e';
}
function AddBuilderToWorkspace(options, workspace) {
    return (host, context) => {
        const appProject = options.relatedAppName;
        const project = project_1.getProject(workspace, appProject);
        const architect = project.architect;
        const projectRoot = getE2eRoot(project.root);
        if (architect) {
            architect.e2e = {
                builder: workspace_models_1.Builders.Protractor,
                options: {
                    protractorConfig: `${projectRoot}/protractor.conf.js`,
                    devServerTarget: `${options.relatedAppName}:serve`,
                },
                configurations: {
                    production: {
                        devServerTarget: `${options.relatedAppName}:serve:production`,
                    },
                },
            };
            const lintConfig = architect.lint;
            if (lintConfig) {
                lintConfig.options.tsConfig =
                    lintConfig.options.tsConfig.concat(`${projectRoot}/tsconfig.json`);
            }
            workspace.projects[options.relatedAppName] = project;
        }
        return config_1.updateWorkspace(workspace);
    };
}
function default_1(options) {
    return (host) => {
        const appProject = options.relatedAppName;
        const workspace = config_1.getWorkspace(host);
        const project = project_1.getProject(workspace, appProject);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${appProject}" doesn't not exist.`);
        }
        const root = getE2eRoot(project.root);
        const relativePathToWorkspaceRoot = root.split('/').map(() => '..').join('/');
        return schematics_1.chain([
            AddBuilderToWorkspace(options, workspace),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files'), [
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { relativePathToWorkspaceRoot })),
                schematics_1.move(root),
            ])),
        ]);
    };
}
exports.default = default_1;
