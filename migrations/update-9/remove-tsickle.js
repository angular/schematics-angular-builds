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
const dependencies_1 = require("../../utility/dependencies");
const json_utils_1 = require("../../utility/json-utils");
const workspace_models_1 = require("../../utility/workspace-models");
const utils_1 = require("./utils");
/**
 * Remove tsickle from libraries
 */
function removeTsickle() {
    return (tree) => {
        dependencies_1.removePackageJsonDependency(tree, 'tsickle');
        const workspace = utils_1.getWorkspace(tree);
        for (const { target } of utils_1.getTargets(workspace, 'build', workspace_models_1.Builders.NgPackagr)) {
            for (const options of utils_1.getAllOptions(target)) {
                const tsConfigOption = json_utils_1.findPropertyInAstObject(options, 'tsConfig');
                if (!tsConfigOption || tsConfigOption.kind !== 'string') {
                    continue;
                }
                const tsConfigContent = tree.read(tsConfigOption.value);
                if (!tsConfigContent) {
                    continue;
                }
                const tsConfigAst = core_1.parseJsonAst(tsConfigContent.toString(), core_1.JsonParseMode.Loose);
                if (!tsConfigAst || tsConfigAst.kind !== 'object') {
                    continue;
                }
                const ngCompilerOptions = json_utils_1.findPropertyInAstObject(tsConfigAst, 'angularCompilerOptions');
                if (ngCompilerOptions && ngCompilerOptions.kind === 'object') {
                    // remove annotateForClosureCompiler option
                    const recorder = tree.beginUpdate(tsConfigOption.value);
                    json_utils_1.removePropertyInAstObject(recorder, ngCompilerOptions, 'annotateForClosureCompiler');
                    tree.commitUpdate(recorder);
                }
            }
        }
        return tree;
    };
}
exports.removeTsickle = removeTsickle;
