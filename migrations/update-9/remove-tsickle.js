"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTsickle = void 0;
const dependencies_1 = require("../../utility/dependencies");
const json_file_1 = require("../../utility/json-file");
const json_utils_1 = require("../../utility/json-utils");
const workspace_models_1 = require("../../utility/workspace-models");
const utils_1 = require("./utils");
/**
 * Remove tsickle from libraries
 */
function removeTsickle() {
    return (tree, context) => {
        dependencies_1.removePackageJsonDependency(tree, 'tsickle');
        const logger = context.logger;
        const workspace = utils_1.getWorkspace(tree);
        for (const { target } of utils_1.getTargets(workspace, 'build', workspace_models_1.Builders.DeprecatedNgPackagr)) {
            for (const options of utils_1.getAllOptions(target)) {
                const tsConfigOption = json_utils_1.findPropertyInAstObject(options, 'tsConfig');
                if (!tsConfigOption || tsConfigOption.kind !== 'string') {
                    continue;
                }
                const tsConfigPath = tsConfigOption.value;
                let tsConfigJson;
                try {
                    tsConfigJson = new json_file_1.JSONFile(tree, tsConfigPath);
                }
                catch (_a) {
                    logger.warn(`Cannot find file: ${tsConfigPath}`);
                    continue;
                }
                tsConfigJson.remove(['angularCompilerOptions', 'annotateForClosureCompiler']);
            }
        }
    };
}
exports.removeTsickle = removeTsickle;
