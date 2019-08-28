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
const json_utils_1 = require("../../utility/json-utils");
const workspace_models_1 = require("../../utility/workspace-models");
const utils_1 = require("./utils");
/**
 * Update ngsw-config.json to fix issue https://github.com/angular/angular-cli/pull/15277
 */
function updateNGSWConfig() {
    return (tree) => {
        const workspace = utils_1.getWorkspace(tree);
        for (const { target } of utils_1.getTargets(workspace, 'build', workspace_models_1.Builders.Browser)) {
            for (const options of utils_1.getAllOptions(target)) {
                const ngswConfigPath = json_utils_1.findPropertyInAstObject(options, 'ngswConfigPath');
                if (!ngswConfigPath || ngswConfigPath.kind !== 'string') {
                    continue;
                }
                const path = ngswConfigPath.value;
                const configBuffer = tree.read(path);
                if (!configBuffer) {
                    throw new schematics_1.SchematicsException(`Could not find (${path})`);
                }
                const content = configBuffer.toString();
                const ngswConfigAst = core_1.parseJsonAst(content, core_1.JsonParseMode.Loose);
                if (!ngswConfigAst || ngswConfigAst.kind !== 'object') {
                    continue;
                }
                const assetGroups = json_utils_1.findPropertyInAstObject(ngswConfigAst, 'assetGroups');
                if (!assetGroups || assetGroups.kind !== 'array') {
                    continue;
                }
                const prefetchElement = assetGroups.elements.find(element => {
                    const installMode = element.kind === 'object' && json_utils_1.findPropertyInAstObject(element, 'installMode');
                    return installMode && installMode.value === 'prefetch';
                });
                if (!prefetchElement || prefetchElement.kind !== 'object') {
                    continue;
                }
                const resources = json_utils_1.findPropertyInAstObject(prefetchElement, 'resources');
                if (!resources || resources.kind !== 'object') {
                    continue;
                }
                const files = json_utils_1.findPropertyInAstObject(resources, 'files');
                if (!files || files.kind !== 'array') {
                    continue;
                }
                const hasManifest = files.elements
                    .some(({ value }) => typeof value === 'string' && value.endsWith('manifest.webmanifest'));
                if (hasManifest) {
                    continue;
                }
                const recorder = tree.beginUpdate(path);
                json_utils_1.appendValueInAstArray(recorder, files, '/manifest.webmanifest', 10);
                tree.commitUpdate(recorder);
            }
        }
        return tree;
    };
}
exports.updateNGSWConfig = updateNGSWConfig;
