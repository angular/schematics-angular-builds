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
const tasks_1 = require("@angular-devkit/schematics/tasks");
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const json_utils_1 = require("../utility/json-utils");
const latest_versions_1 = require("../utility/latest-versions");
const lint_fix_1 = require("../utility/lint-fix");
const validation_1 = require("../utility/validation");
const workspace_models_1 = require("../utility/workspace-models");
const schema_1 = require("./schema");
// TODO: use JsonAST
// function appendPropertyInAstObject(
//   recorder: UpdateRecorder,
//   node: JsonAstObject,
//   propertyName: string,
//   value: JsonValue,
//   indent = 4,
// ) {
//   const indentStr = '\n' + new Array(indent + 1).join(' ');
//   if (node.properties.length > 0) {
//     // Insert comma.
//     const last = node.properties[node.properties.length - 1];
//     recorder.insertRight(last.start.offset + last.text.replace(/\s+$/, '').length, ',');
//   }
//   recorder.insertLeft(
//     node.end.offset - 1,
//     '  '
//     + `"${propertyName}": ${JSON.stringify(value, null, 2).replace(/\n/g, indentStr)}`
//     + indentStr.slice(0, -2),
//   );
// }
function addDependenciesToPackageJson(options) {
    return (host, context) => {
        [
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular/compiler-cli',
                version: latest_versions_1.latestVersions.Angular,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular-devkit/build-angular',
                version: latest_versions_1.latestVersions.DevkitBuildAngular,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'typescript',
                version: latest_versions_1.latestVersions.TypeScript,
            },
        ].forEach(dependency => dependencies_1.addPackageJsonDependency(host, dependency));
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        return host;
    };
}
function readTsLintConfig(host, path) {
    const buffer = host.read(path);
    if (!buffer) {
        throw new schematics_1.SchematicsException(`Could not read ${path}.`);
    }
    const config = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
    if (config.kind !== 'object') {
        throw new schematics_1.SchematicsException(`Invalid ${path}. Was expecting an object.`);
    }
    return config;
}
/**
 * Merges the application tslint.json with the workspace tslint.json
 * when the application being created is a root application
 *
 * @param {Tree} parentHost The root host of the schematic
 */
function mergeWithRootTsLint(parentHost) {
    return (host) => {
        const tsLintPath = '/tslint.json';
        if (!host.exists(tsLintPath)) {
            return;
        }
        const rootTslintConfig = readTsLintConfig(parentHost, tsLintPath);
        const appTslintConfig = readTsLintConfig(host, tsLintPath);
        const recorder = host.beginUpdate(tsLintPath);
        rootTslintConfig.properties.forEach(prop => {
            if (json_utils_1.findPropertyInAstObject(appTslintConfig, prop.key.value)) {
                // property already exists. Skip!
                return;
            }
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, appTslintConfig, prop.key.value, prop.value.value, 2);
        });
        const rootRules = json_utils_1.findPropertyInAstObject(rootTslintConfig, 'rules');
        const appRules = json_utils_1.findPropertyInAstObject(appTslintConfig, 'rules');
        if (!appRules || appRules.kind !== 'object' || !rootRules || rootRules.kind !== 'object') {
            // rules are not valid. Skip!
            return;
        }
        rootRules.properties.forEach(prop => {
            json_utils_1.insertPropertyInAstObjectInOrder(recorder, appRules, prop.key.value, prop.value.value, 4);
        });
        host.commitUpdate(recorder);
        // this shouldn't be needed but at the moment without this formatting is not correct.
        const content = readTsLintConfig(host, tsLintPath);
        host.overwrite(tsLintPath, JSON.stringify(content.value, undefined, 2));
    };
}
function addAppToWorkspaceFile(options, workspace) {
    // TODO: use JsonAST
    // const workspacePath = '/angular.json';
    // const workspaceBuffer = host.read(workspacePath);
    // if (workspaceBuffer === null) {
    //   throw new SchematicsException(`Configuration file (${workspacePath}) not found.`);
    // }
    // const workspaceJson = parseJson(workspaceBuffer.toString());
    // if (workspaceJson.value === null) {
    //   throw new SchematicsException(`Unable to parse configuration file (${workspacePath}).`);
    // }
    let projectRoot = options.projectRoot !== undefined
        ? options.projectRoot
        : `${workspace.newProjectRoot}/${options.name}`;
    if (projectRoot !== '' && !projectRoot.endsWith('/')) {
        projectRoot += '/';
    }
    const schematics = {};
    if (options.inlineTemplate === true
        || options.inlineStyle === true
        || options.style !== schema_1.Style.Css) {
        const componentSchematicsOptions = {};
        if (options.inlineTemplate === true) {
            componentSchematicsOptions.inlineTemplate = true;
        }
        if (options.inlineStyle === true) {
            componentSchematicsOptions.inlineStyle = true;
        }
        if (options.style && options.style !== schema_1.Style.Css) {
            componentSchematicsOptions.style = options.style;
        }
        schematics['@schematics/angular:component'] = componentSchematicsOptions;
    }
    if (options.skipTests === true) {
        ['class', 'component', 'directive', 'guard', 'module', 'pipe', 'service'].forEach((type) => {
            if (!(`@schematics/angular:${type}` in schematics)) {
                schematics[`@schematics/angular:${type}`] = {};
            }
            schematics[`@schematics/angular:${type}`].skipTests = true;
        });
    }
    const sourceRoot = core_1.join(core_1.normalize(projectRoot), 'src');
    const project = {
        root: projectRoot,
        sourceRoot,
        projectType: workspace_models_1.ProjectType.Application,
        prefix: options.prefix || 'app',
        schematics,
        architect: {
            build: {
                builder: workspace_models_1.Builders.Browser,
                options: {
                    outputPath: `dist/${options.name}`,
                    index: `${sourceRoot}/index.html`,
                    main: `${sourceRoot}/main.ts`,
                    polyfills: `${sourceRoot}/polyfills.ts`,
                    tsConfig: `${projectRoot}tsconfig.app.json`,
                    assets: [
                        `${sourceRoot}/favicon.ico`,
                        `${sourceRoot}/assets`,
                    ],
                    styles: [
                        `${sourceRoot}/styles.${options.style}`,
                    ],
                    scripts: [],
                    es5BrowserSupport: true,
                },
                configurations: {
                    production: {
                        fileReplacements: [{
                                replace: `${sourceRoot}/environments/environment.ts`,
                                with: `${sourceRoot}/environments/environment.prod.ts`,
                            }],
                        optimization: true,
                        outputHashing: 'all',
                        sourceMap: false,
                        extractCss: true,
                        namedChunks: false,
                        aot: true,
                        extractLicenses: true,
                        vendorChunk: false,
                        buildOptimizer: true,
                        budgets: [{
                                type: 'initial',
                                maximumWarning: '2mb',
                                maximumError: '5mb',
                            }],
                    },
                },
            },
            serve: {
                builder: workspace_models_1.Builders.DevServer,
                options: {
                    browserTarget: `${options.name}:build`,
                },
                configurations: {
                    production: {
                        browserTarget: `${options.name}:build:production`,
                    },
                },
            },
            'extract-i18n': {
                builder: workspace_models_1.Builders.ExtractI18n,
                options: {
                    browserTarget: `${options.name}:build`,
                },
            },
            test: {
                builder: workspace_models_1.Builders.Karma,
                options: {
                    main: `${sourceRoot}/test.ts`,
                    polyfills: `${sourceRoot}/polyfills.ts`,
                    tsConfig: `${projectRoot}tsconfig.spec.json`,
                    karmaConfig: `${projectRoot}karma.conf.js`,
                    assets: [
                        `${sourceRoot}/favicon.ico`,
                        `${sourceRoot}/assets`,
                    ],
                    styles: [
                        `${sourceRoot}/styles.${options.style}`,
                    ],
                    scripts: [],
                },
            },
            lint: {
                builder: workspace_models_1.Builders.TsLint,
                options: {
                    tsConfig: [
                        `${projectRoot}tsconfig.app.json`,
                        `${projectRoot}tsconfig.spec.json`,
                    ],
                    exclude: [
                        '**/node_modules/**',
                    ],
                },
            },
        },
    };
    return config_1.addProjectToWorkspace(workspace, options.name, project);
}
function minimalPathFilter(path) {
    const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js|tslint.json).template$/;
    return !toRemoveList.test(path);
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        validation_1.validateProjectName(options.name);
        options.prefix = options.prefix || 'app';
        const appRootSelector = `${options.prefix}-root`;
        const componentOptions = !options.minimal ?
            {
                inlineStyle: options.inlineStyle,
                inlineTemplate: options.inlineTemplate,
                skipTests: options.skipTests,
                style: options.style,
                viewEncapsulation: options.viewEncapsulation,
            } :
            {
                inlineStyle: true,
                inlineTemplate: true,
                skipTests: true,
                style: options.style,
            };
        const workspace = config_1.getWorkspace(host);
        const newProjectRoot = workspace.newProjectRoot || '';
        const isRootApp = options.projectRoot !== undefined;
        const appDir = isRootApp
            ? options.projectRoot
            : `${newProjectRoot}/${options.name}`;
        const relativePathToWorkspaceRoot = appDir
            ? appDir.split('/').map(() => '..').join('/')
            : '.';
        const sourceDir = `${appDir}/src/app`;
        const e2eOptions = {
            relatedAppName: options.name,
            rootSelector: appRootSelector,
        };
        return schematics_1.chain([
            addAppToWorkspaceFile(options, workspace),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files'), [
                options.minimal ? schematics_1.filter(minimalPathFilter) : schematics_1.noop(),
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { relativePathToWorkspaceRoot, appName: options.name, isRootApp })),
                isRootApp ? mergeWithRootTsLint(host) : schematics_1.noop(),
                schematics_1.move(appDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            schematics_1.schematic('module', {
                name: 'app',
                commonModule: false,
                flat: true,
                routing: options.routing,
                routingScope: 'Root',
                path: sourceDir,
                project: options.name,
            }),
            schematics_1.schematic('component', Object.assign({ name: 'app', selector: appRootSelector, flat: true, path: sourceDir, skipImport: true, project: options.name }, componentOptions)),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./other-files'), [
                componentOptions.inlineTemplate
                    ? schematics_1.filter(path => !path.endsWith('.html.template'))
                    : schematics_1.noop(),
                componentOptions.skipTests
                    ? schematics_1.filter(path => !path.endsWith('.spec.ts.template'))
                    : schematics_1.noop(),
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { selector: appRootSelector }, componentOptions)),
                schematics_1.move(sourceDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            options.minimal ? schematics_1.noop() : schematics_1.schematic('e2e', e2eOptions),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(options),
            options.lintFix ? lint_fix_1.applyLintFix(appDir) : schematics_1.noop(),
        ]);
    };
}
exports.default = default_1;
