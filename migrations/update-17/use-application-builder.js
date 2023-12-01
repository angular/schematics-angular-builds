"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const node_path_1 = require("node:path");
const json_file_1 = require("../../utility/json-file");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return async (tree, context) => {
        const rules = [];
        const workspace = await (0, workspace_1.getWorkspace)(tree);
        for (const [name, project] of workspace.projects) {
            if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                // Only interested in application projects since these changes only effects application builders
                continue;
            }
            const buildTarget = project.targets.get('build');
            if (!buildTarget || buildTarget.builder === workspace_models_1.Builders.Application) {
                continue;
            }
            if (buildTarget.builder !== workspace_models_1.Builders.BrowserEsbuild &&
                buildTarget.builder !== workspace_models_1.Builders.Browser) {
                context.logger.error(`Cannot update project "${name}" to use the application builder.` +
                    ` Only "${workspace_models_1.Builders.BrowserEsbuild}" and "${workspace_models_1.Builders.Browser}" can be automatically migrated.`);
                continue;
            }
            // Update builder target and options
            buildTarget.builder = workspace_models_1.Builders.Application;
            const hasServerTarget = project.targets.has('server');
            for (const [, options] of (0, workspace_1.allTargetOptions)(buildTarget, false)) {
                // Show warnings for using no longer supported options
                if (usesNoLongerSupportedOptions(options, context, name)) {
                    continue;
                }
                // Rename and transform options
                options['browser'] = options['main'];
                if (hasServerTarget && typeof options['browser'] === 'string') {
                    options['server'] = (0, node_path_1.dirname)(options['browser']) + '/main.server.ts';
                }
                options['serviceWorker'] = options['ngswConfigPath'] ?? options['serviceWorker'];
                if (typeof options['polyfills'] === 'string') {
                    options['polyfills'] = [options['polyfills']];
                }
                if (typeof options['outputPath'] === 'string') {
                    options['outputPath'] = options['outputPath']?.replace(/\/browser\/?$/, '');
                }
                // Delete removed options
                delete options['deployUrl'];
                delete options['vendorChunk'];
                delete options['commonChunk'];
                delete options['resourcesOutputPath'];
                delete options['buildOptimizer'];
                delete options['main'];
                delete options['ngswConfigPath'];
            }
            // Merge browser and server tsconfig
            if (hasServerTarget) {
                const browserTsConfig = buildTarget?.options?.tsConfig;
                const serverTsConfig = project.targets.get('server')?.options?.tsConfig;
                if (typeof browserTsConfig !== 'string') {
                    throw new schematics_1.SchematicsException(`Cannot update project "${name}" to use the application builder` +
                        ` as the browser tsconfig cannot be located.`);
                }
                if (typeof serverTsConfig !== 'string') {
                    throw new schematics_1.SchematicsException(`Cannot update project "${name}" to use the application builder` +
                        ` as the server tsconfig cannot be located.`);
                }
                const browserJson = new json_file_1.JSONFile(tree, browserTsConfig);
                const serverJson = new json_file_1.JSONFile(tree, serverTsConfig);
                const filesPath = ['files'];
                const files = new Set([
                    ...(browserJson.get(filesPath) ?? []),
                    ...(serverJson.get(filesPath) ?? []),
                ]);
                // Server file will be added later by the means of the ssr schematic.
                files.delete('server.ts');
                browserJson.modify(filesPath, Array.from(files));
                const typesPath = ['compilerOptions', 'types'];
                browserJson.modify(typesPath, Array.from(new Set([
                    ...(browserJson.get(typesPath) ?? []),
                    ...(serverJson.get(typesPath) ?? []),
                ])));
                // Delete server tsconfig
                tree.delete(serverTsConfig);
            }
            // Update main tsconfig
            const rootJson = new json_file_1.JSONFile(tree, 'tsconfig.json');
            rootJson.modify(['compilerOptions', 'esModuleInterop'], true);
            rootJson.modify(['compilerOptions', 'downlevelIteration'], undefined);
            rootJson.modify(['compilerOptions', 'allowSyntheticDefaultImports'], undefined);
            // Update server file
            const ssrMainFile = project.targets.get('server')?.options?.['main'];
            if (typeof ssrMainFile === 'string') {
                tree.delete(ssrMainFile);
                rules.push((0, schematics_1.externalSchematic)('@schematics/angular', 'ssr', {
                    project: name,
                    skipInstall: true,
                }));
            }
            // Delete package.json helper scripts
            const pkgJson = new json_file_1.JSONFile(tree, 'package.json');
            ['build:ssr', 'dev:ssr', 'serve:ssr', 'prerender'].forEach((s) => pkgJson.remove(['scripts', s]));
            // Delete all redundant targets
            for (const [key, target] of project.targets) {
                switch (target.builder) {
                    case workspace_models_1.Builders.Server:
                    case workspace_models_1.Builders.Prerender:
                    case workspace_models_1.Builders.AppShell:
                    case workspace_models_1.Builders.SsrDevServer:
                        project.targets.delete(key);
                        break;
                }
            }
        }
        // Save workspace changes
        await core_1.workspaces.writeWorkspace(workspace, new workspace_1.TreeWorkspaceHost(tree));
        return (0, schematics_1.chain)(rules);
    };
}
exports.default = default_1;
function usesNoLongerSupportedOptions({ deployUrl, resourcesOutputPath }, context, projectName) {
    let hasUsage = false;
    if (typeof deployUrl === 'string') {
        hasUsage = true;
        context.logger.warn(`Skipping migration for project "${projectName}". "deployUrl" option is not available in the application builder.`);
    }
    if (typeof resourcesOutputPath === 'string' && /^\/?media\/?$/.test(resourcesOutputPath)) {
        hasUsage = true;
        context.logger.warn(`Skipping migration for project "${projectName}". "resourcesOutputPath" option is not available in the application builder.` +
            `Media files will be output into a "media" directory within the output location.`);
    }
    return hasUsage;
}
