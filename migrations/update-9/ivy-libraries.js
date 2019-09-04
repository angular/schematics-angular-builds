"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utility/config");
const json_utils_1 = require("../../utility/json-utils");
const workspace_models_1 = require("../../utility/workspace-models");
const utils_1 = require("./utils");
/**
 * Updates a pre version 9 library to version 9 Ivy library.
 *
 * The main things that this migrations does are:
 * - Creates a production configuration for VE compilations.
 * - Create a prod tsconfig for which disables Ivy and enables VE compilations.
 */
function updateLibraries() {
    return (tree) => {
        const workspacePath = config_1.getWorkspacePath(tree);
        const workspace = utils_1.getWorkspace(tree);
        const recorder = tree.beginUpdate(workspacePath);
        for (const { target, project } of utils_1.getTargets(workspace, 'build', workspace_models_1.Builders.NgPackagr)) {
            const projectRoot = json_utils_1.findPropertyInAstObject(project, 'root');
            if (!projectRoot || projectRoot.kind !== 'string') {
                break;
            }
            const configurations = json_utils_1.findPropertyInAstObject(target, 'configurations');
            const tsConfig = `${projectRoot.value}/tsconfig.lib.prod.json`;
            if (!configurations || configurations.kind !== 'object') {
                // Configurations doesn't exist.
                json_utils_1.appendPropertyInAstObject(recorder, target, 'configurations', { production: { tsConfig } }, 10);
                createTsConfig(tree, tsConfig);
                continue;
            }
            const prodConfig = json_utils_1.findPropertyInAstObject(configurations, 'production');
            if (!prodConfig || prodConfig.kind !== 'object') {
                // Production configuration doesn't exist.
                json_utils_1.insertPropertyInAstObjectInOrder(recorder, configurations, 'production', { tsConfig }, 12);
                createTsConfig(tree, tsConfig);
                continue;
            }
            const tsConfigOption = json_utils_1.findPropertyInAstObject(prodConfig, 'tsConfig');
            if (!tsConfigOption || tsConfigOption.kind !== 'string') {
                // No tsconfig for production has been defined.
                json_utils_1.insertPropertyInAstObjectInOrder(recorder, prodConfig, 'tsConfig', tsConfig, 14);
                createTsConfig(tree, tsConfig);
                continue;
            }
            // tsConfig for production already exists.
            const tsConfigAst = utils_1.readJsonFileAsAstObject(tree, tsConfigOption.value);
            const tsConfigRecorder = tree.beginUpdate(tsConfigOption.value);
            const ngCompilerOptions = json_utils_1.findPropertyInAstObject(tsConfigAst, 'angularCompilerOptions');
            if (!ngCompilerOptions) {
                // Add angularCompilerOptions to the production tsConfig
                json_utils_1.appendPropertyInAstObject(tsConfigRecorder, tsConfigAst, 'angularCompilerOptions', { enableIvy: false }, 2);
                tree.commitUpdate(tsConfigRecorder);
                continue;
            }
            if (ngCompilerOptions.kind === 'object') {
                const enableIvy = json_utils_1.findPropertyInAstObject(ngCompilerOptions, 'enableIvy');
                // Add enableIvy false
                if (!enableIvy) {
                    json_utils_1.appendPropertyInAstObject(tsConfigRecorder, ngCompilerOptions, 'enableIvy', false, 4);
                    tree.commitUpdate(tsConfigRecorder);
                    continue;
                }
                if (enableIvy.kind !== 'false') {
                    const { start, end } = enableIvy;
                    tsConfigRecorder.remove(start.offset, end.offset - start.offset);
                    tsConfigRecorder.insertLeft(start.offset, 'false');
                    tree.commitUpdate(tsConfigRecorder);
                }
            }
        }
        tree.commitUpdate(recorder);
        return tree;
    };
}
exports.updateLibraries = updateLibraries;
function createTsConfig(tree, tsConfigPath) {
    const tsConfigContent = {
        extends: './tsconfig.lib.json',
        angularCompilerOptions: {
            enableIvy: false,
        },
    };
    if (!tree.exists(tsConfigPath)) {
        tree.create(tsConfigPath, JSON.stringify(tsConfigContent, undefined, 2));
    }
}
