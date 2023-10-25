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
const utility_1 = require("../utility");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_targets_1 = require("../utility/project-targets");
const util_1 = require("../utility/standalone/util");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';
async function getOutputPath(host, projectName, target) {
    // Generate new output paths
    const workspace = await (0, utility_1.readWorkspace)(host);
    const project = workspace.projects.get(projectName);
    const serverTarget = project?.targets.get(target);
    if (!serverTarget || !serverTarget.options) {
        throw new schematics_1.SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
    }
    const { outputPath } = serverTarget.options;
    if (typeof outputPath !== 'string') {
        throw new schematics_1.SchematicsException(`outputPath for ${projectName} ${target} target is not a string.`);
    }
    return outputPath;
}
function addScriptsRule(options) {
    return async (host) => {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer === null) {
            throw new schematics_1.SchematicsException('Could not find package.json');
        }
        const serverDist = await getOutputPath(host, options.project, 'server');
        const pkg = JSON.parse(buffer.toString());
        pkg.scripts = {
            ...pkg.scripts,
            'dev:ssr': `ng run ${options.project}:${SERVE_SSR_TARGET_NAME}`,
            'serve:ssr': `node ${serverDist}/main.js`,
            'build:ssr': `ng build && ng run ${options.project}:server`,
            'prerender': `ng run ${options.project}:${PRERENDER_TARGET_NAME}`,
        };
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
    };
}
function updateApplicationBuilderTsConfigRule(options) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        const buildTarget = project?.targets.get('build');
        if (!buildTarget || !buildTarget.options) {
            return;
        }
        const tsConfigPath = buildTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new json_file_1.JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = 'server.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    };
}
function updateApplicationBuilderWorkspaceConfigRule(projectRoot, options) {
    return (0, utility_1.updateWorkspace)((workspace) => {
        const buildTarget = workspace.projects.get(options.project)?.targets.get('build');
        if (!buildTarget) {
            return;
        }
        buildTarget.options = {
            ...buildTarget.options,
            prerender: true,
            ssr: {
                entry: (0, core_1.join)((0, core_1.normalize)(projectRoot), 'server.ts'),
            },
        };
    });
}
function updateWebpackBuilderWorkspaceConfigRule(options) {
    return (0, utility_1.updateWorkspace)((workspace) => {
        const projectName = options.project;
        const project = workspace.projects.get(projectName);
        if (!project) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const serverTarget = project.targets.get('server');
        (serverTarget.options ??= {}).main = (0, core_1.join)((0, core_1.normalize)(project.root), 'server.ts');
        const serveSSRTarget = project.targets.get(SERVE_SSR_TARGET_NAME);
        if (serveSSRTarget) {
            return;
        }
        project.targets.add({
            name: SERVE_SSR_TARGET_NAME,
            builder: '@angular-devkit/build-angular:ssr-dev-server',
            defaultConfiguration: 'development',
            options: {},
            configurations: {
                development: {
                    browserTarget: `${projectName}:build:development`,
                    serverTarget: `${projectName}:server:development`,
                },
                production: {
                    browserTarget: `${projectName}:build:production`,
                    serverTarget: `${projectName}:server:production`,
                },
            },
        });
        const prerenderTarget = project.targets.get(PRERENDER_TARGET_NAME);
        if (prerenderTarget) {
            return;
        }
        project.targets.add({
            name: PRERENDER_TARGET_NAME,
            builder: '@angular-devkit/build-angular:prerender',
            defaultConfiguration: 'production',
            options: {
                routes: ['/'],
            },
            configurations: {
                production: {
                    browserTarget: `${projectName}:build:production`,
                    serverTarget: `${projectName}:server:production`,
                },
                development: {
                    browserTarget: `${projectName}:build:development`,
                    serverTarget: `${projectName}:server:development`,
                },
            },
        });
    });
}
function updateWebpackBuilderServerTsConfigRule(options) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        const serverTarget = project?.targets.get('server');
        if (!serverTarget || !serverTarget.options) {
            return;
        }
        const tsConfigPath = serverTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new json_file_1.JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = 'server.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    };
}
function addDependencies() {
    return (0, schematics_1.chain)([
        (0, utility_1.addDependency)('@angular/ssr', latest_versions_1.latestVersions.AngularSSR, {
            type: utility_1.DependencyType.Default,
        }),
        (0, utility_1.addDependency)('express', latest_versions_1.latestVersions['express'], {
            type: utility_1.DependencyType.Default,
        }),
        (0, utility_1.addDependency)('@types/express', latest_versions_1.latestVersions['@types/express'], {
            type: utility_1.DependencyType.Dev,
        }),
    ]);
}
function addServerFile(options, isStandalone) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        const browserDistDirectory = await getOutputPath(host, options.project, 'build');
        return (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)(`./files/${project?.targets?.get('build')?.builder === workspace_models_1.Builders.Application
            ? 'application-builder'
            : 'server-builder'}`), [
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                ...options,
                browserDistDirectory,
                isStandalone,
            }),
            (0, schematics_1.move)(project.root),
        ]));
    };
}
function default_1(options) {
    return async (host) => {
        const browserEntryPoint = await (0, util_1.getMainFilePath)(host, options.project);
        const isStandalone = (0, ng_ast_utils_1.isStandaloneApp)(host, browserEntryPoint);
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const clientProject = workspace.projects.get(options.project);
        if (!clientProject) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const isUsingApplicationBuilder = clientProject.targets.get('build')?.builder === workspace_models_1.Builders.Application;
        return (0, schematics_1.chain)([
            (0, schematics_1.externalSchematic)('@schematics/angular', 'server', {
                ...options,
                skipInstall: true,
            }),
            ...(isUsingApplicationBuilder
                ? [
                    updateApplicationBuilderWorkspaceConfigRule(clientProject.root, options),
                    updateApplicationBuilderTsConfigRule(options),
                ]
                : [
                    addScriptsRule(options),
                    updateWebpackBuilderServerTsConfigRule(options),
                    updateWebpackBuilderWorkspaceConfigRule(options),
                ]),
            addServerFile(options, isStandalone),
            addDependencies(),
        ]);
    };
}
exports.default = default_1;
