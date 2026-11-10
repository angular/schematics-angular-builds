"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const schematics_1 = require("@angular-devkit/schematics");
const posix_1 = require("node:path/posix");
const entry_point_1 = __importDefault(require("../entry-point"));
const dependencies_1 = require("../utility/dependencies");
const dependency_1 = require("../utility/dependency");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const paths_1 = require("../utility/paths");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const schema_1 = require("./schema");
const LIBRARY_DEV_DEPENDENCIES = [
    { name: '@angular/compiler-cli', version: latest_versions_1.latestVersions.Angular },
    { name: '@angular/build', version: latest_versions_1.latestVersions.AngularBuild },
    { name: 'typescript', version: latest_versions_1.latestVersions['typescript'] },
];
function addTsProjectReference(...paths) {
    return (host) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        const newReferences = paths.map((path) => ({ path }));
        const file = new json_file_1.JSONFile(host, 'tsconfig.json');
        const jsonPath = ['references'];
        const value = file.get(jsonPath);
        file.modify(jsonPath, Array.isArray(value) ? [...value, ...newReferences] : newReferences);
    };
}
function addDependenciesToPackageJson({ skipInstall, testRunner }) {
    return (0, schematics_1.chain)([
        ...LIBRARY_DEV_DEPENDENCIES.map((dependency) => (0, dependency_1.addDependency)(dependency.name, dependency.version, {
            type: dependency_1.DependencyType.Dev,
            existing: dependency_1.ExistingBehavior.Skip,
            install: skipInstall ? dependency_1.InstallBehavior.None : dependency_1.InstallBehavior.Auto,
        })),
        ...(0, dependencies_1.addTestRunnerDependencies)(testRunner, !!skipInstall),
        (0, dependency_1.addDependency)('tslib', latest_versions_1.latestVersions['tslib'], {
            type: dependency_1.DependencyType.Default,
            existing: dependency_1.ExistingBehavior.Skip,
            install: skipInstall ? dependency_1.InstallBehavior.None : dependency_1.InstallBehavior.Auto,
        }),
    ]);
}
function addLibToWorkspaceFile(options, projectRoot, projectName, folderName, distRoot, hasZoneDependency) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        workspace.projects.add({
            name: projectName,
            root: projectRoot,
            sourceRoot: projectRoot,
            projectType: workspace_models_1.ProjectType.Library,
            prefix: options.prefix,
            targets: {
                build: {
                    builder: workspace_models_1.Builders.BuildLibrary,
                    defaultConfiguration: 'production',
                    options: {
                        tsConfig: `${projectRoot}/tsconfig.lib.json`,
                        ...(folderName !== projectName ? { outputPath: distRoot } : {}),
                    },
                    configurations: {
                        production: {},
                        development: {
                            compilationMode: 'full',
                            declarationMap: true,
                        },
                    },
                },
                test: options.testRunner === schema_1.TestRunner.Vitest
                    ? {
                        builder: workspace_models_1.Builders.BuildUnitTest,
                        options: {
                            tsConfig: `${projectRoot}/tsconfig.spec.json`,
                        },
                    }
                    : {
                        builder: workspace_models_1.Builders.BuildKarma,
                        options: {
                            tsConfig: `${projectRoot}/tsconfig.spec.json`,
                            polyfills: hasZoneDependency ? ['zone.js', 'zone.js/testing'] : undefined,
                        },
                    },
            },
        });
    });
}
function default_1(options) {
    return async (host) => {
        const prefix = options.prefix;
        const packageName = options.name;
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const newProjectRoot = workspace.extensions.newProjectRoot || '';
        let folderName = packageName.startsWith('@') ? packageName.slice(1) : packageName;
        if (/[A-Z]/.test(folderName)) {
            folderName = schematics_1.strings.dasherize(folderName);
        }
        const libDir = options.projectRoot !== undefined
            ? (0, posix_1.join)(options.projectRoot)
            : (0, posix_1.join)(newProjectRoot, folderName);
        const distRoot = `dist/${folderName}`;
        // If scoped project (i.e. "@foo/bar"), convert name to "bar" for templates.
        const name = /^@.*\/.*/.test(options.name) ? options.name.split('/')[1] : options.name;
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                ...options,
                name,
                packageName,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(libDir),
                angularLatestVersion: latest_versions_1.latestVersions.Angular.replace(/~|\^/, ''),
                testTypesPackage: options.testRunner === schema_1.TestRunner.Vitest ? 'vitest/globals' : 'jasmine',
            }),
            (0, schematics_1.move)(libDir),
        ]);
        const hasZoneDependency = (0, dependency_1.getDependency)(host, 'zone.js') !== null;
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(templateSource),
            addLibToWorkspaceFile(options, libDir, packageName, folderName, distRoot, hasZoneDependency),
            options.skipPackageJson ? (0, schematics_1.noop)() : addDependenciesToPackageJson(options),
            options.skipTsConfig
                ? (0, schematics_1.noop)()
                : addTsProjectReference('./' + (0, posix_1.join)(libDir, 'tsconfig.lib.json'), './' + (0, posix_1.join)(libDir, 'tsconfig.spec.json')),
            (0, entry_point_1.default)({
                name: '.',
                project: packageName,
                entryFile: options.entryFile,
                prefix,
                standalone: options.standalone,
                skipTsConfig: options.skipTsConfig,
            }),
        ]);
    };
}
//# sourceMappingURL=index.js.map