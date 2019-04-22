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
const json_utils_1 = require("../../utility/json-utils");
// tslint:disable-next-line:max-line-length
const browserslistContent = `# This file is used by the build system to adjust CSS and JS output to support the specified browsers below.
# For additional information regarding the format and rule options, please see:
# https://github.com/browserslist/browserslist#queries

# Googlebot uses an older version of Chrome
# For additional information see: https://developers.google.com/search/docs/guides/rendering

> 0.5%
last 2 versions
Firefox ESR
not dead
not IE 9-11 # For IE 9-11 support, remove 'not'.
not Chrome 41 # For Googlebot support, remove 'not'.`;
function updateES5Projects() {
    return (host) => {
        const tsConfigPath = '/tsconfig.json';
        const buffer = host.read(tsConfigPath);
        if (!buffer) {
            return host;
        }
        const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
        if (tsCfgAst.kind !== 'object') {
            return host;
        }
        const compilerOptions = json_utils_1.findPropertyInAstObject(tsCfgAst, 'compilerOptions');
        if (!compilerOptions || compilerOptions.kind !== 'object') {
            return host;
        }
        const recorder = host.beginUpdate(tsConfigPath);
        const scriptTarget = json_utils_1.findPropertyInAstObject(compilerOptions, 'target');
        if (!scriptTarget) {
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'target', 'es2015', 4);
        }
        else if (scriptTarget.value !== 'es2015') {
            const { start, end } = scriptTarget;
            recorder.remove(start.offset, end.offset - start.offset);
            recorder.insertLeft(start.offset, '"es2015"');
        }
        const scriptModule = json_utils_1.findPropertyInAstObject(compilerOptions, 'module');
        if (!scriptModule) {
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, compilerOptions, 'module', 'esnext', 4);
        }
        else if (scriptModule.value !== 'esnext') {
            const { start, end } = scriptModule;
            recorder.remove(start.offset, end.offset - start.offset);
            recorder.insertLeft(start.offset, '"esnext"');
        }
        host.commitUpdate(recorder);
        return updateBrowserlist;
    };
}
exports.updateES5Projects = updateES5Projects;
function updateBrowserlist() {
    return (tree) => {
        const angularConfigContent = tree.read('angular.json') || tree.read('.angular.json');
        if (!angularConfigContent) {
            return;
        }
        const angularJson = core_1.parseJson(angularConfigContent.toString(), core_1.JsonParseMode.Loose);
        if (!core_1.isJsonObject(angularJson) || !core_1.isJsonObject(angularJson.projects)) {
            // If that field isn't there, no use...
            return;
        }
        // For all projects
        for (const [name, project] of Object.entries(angularJson.projects)) {
            if (!core_1.isJsonObject(project)) {
                continue;
            }
            if (typeof project.root != 'string' || project.projectType !== 'application') {
                continue;
            }
            if (name.endsWith('-e2e')) {
                // Skip existing separate E2E projects
                continue;
            }
            const browserslistPath = core_1.join(core_1.normalize(project.root), '/browserslist');
            const source = tree.read(browserslistPath);
            if (!source) {
                tree.create(browserslistPath, browserslistContent);
            }
            else {
                const recorder = tree.beginUpdate(browserslistPath);
                recorder.insertRight(source.length, '\nChrome 41 # Googlebot');
                tree.commitUpdate(recorder);
            }
        }
        return tree;
    };
}
