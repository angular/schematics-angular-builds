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
const index_1 = require("../component/index");
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
function addPostInstallScript() {
    return (host) => {
        const pkgJsonPath = '/package.json';
        const buffer = host.read(pkgJsonPath);
        if (!buffer) {
            throw new schematics_1.SchematicsException('Could not read package.json.');
        }
        const packageJsonAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Strict);
        if (packageJsonAst.kind !== 'object') {
            throw new schematics_1.SchematicsException('Invalid package.json. Was expecting an object.');
        }
        const scriptsNode = json_utils_1.findPropertyInAstObject(packageJsonAst, 'scripts');
        if (scriptsNode && scriptsNode.kind === 'object') {
            const recorder = host.beginUpdate(pkgJsonPath);
            const postInstall = json_utils_1.findPropertyInAstObject(scriptsNode, 'postinstall');
            if (!postInstall) {
                // postinstall script not found, add it.
                json_utils_1.insertPropertyInAstObjectInOrder(recorder, scriptsNode, 'postinstall', 'ivy-ngcc', 4);
            }
            host.commitUpdate(recorder);
        }
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
        : `${workspace.newProjectRoot || ''}/${options.name}`;
    if (projectRoot !== '' && !projectRoot.endsWith('/')) {
        projectRoot += '/';
    }
    const rootFilesRoot = options.projectRoot === undefined
        ? projectRoot
        : projectRoot + 'src/';
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
    const styleExt = index_1.styleToFileExtention(options.style);
    const project = {
        root: projectRoot,
        sourceRoot: core_1.join(core_1.normalize(projectRoot), 'src'),
        projectType: workspace_models_1.ProjectType.Application,
        prefix: options.prefix || 'app',
        schematics,
        architect: {
            build: {
                builder: workspace_models_1.Builders.Browser,
                options: {
                    outputPath: `dist/${options.name}`,
                    index: `${projectRoot}src/index.html`,
                    main: `${projectRoot}src/main.ts`,
                    polyfills: `${projectRoot}src/polyfills.ts`,
                    tsConfig: `${rootFilesRoot}tsconfig.app.json`,
                    assets: [
                        core_1.join(core_1.normalize(projectRoot), 'src', 'favicon.ico'),
                        core_1.join(core_1.normalize(projectRoot), 'src', 'assets'),
                    ],
                    styles: [
                        `${projectRoot}src/styles.${styleExt}`,
                    ],
                    scripts: [],
                    es5BrowserSupport: true,
                },
                configurations: {
                    production: {
                        fileReplacements: [{
                                replace: `${projectRoot}src/environments/environment.ts`,
                                with: `${projectRoot}src/environments/environment.prod.ts`,
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
                    main: `${projectRoot}src/test.ts`,
                    polyfills: `${projectRoot}src/polyfills.ts`,
                    tsConfig: `${rootFilesRoot}tsconfig.spec.json`,
                    karmaConfig: `${rootFilesRoot}karma.conf.js`,
                    styles: [
                        `${projectRoot}src/styles.${styleExt}`,
                    ],
                    scripts: [],
                    assets: [
                        core_1.join(core_1.normalize(projectRoot), 'src', 'favicon.ico'),
                        core_1.join(core_1.normalize(projectRoot), 'src', 'assets'),
                    ],
                },
            },
            lint: {
                builder: workspace_models_1.Builders.TsLint,
                options: {
                    tsConfig: [
                        `${rootFilesRoot}tsconfig.app.json`,
                        `${rootFilesRoot}tsconfig.spec.json`,
                    ],
                    exclude: [
                        '**/node_modules/**',
                    ],
                },
            },
        },
    };
    // tslint:disable-next-line:no-any
    // const projects: JsonObject = (<any> workspaceAst.value).projects || {};
    // tslint:disable-next-line:no-any
    // if (!(<any> workspaceAst.value).projects) {
    //   // tslint:disable-next-line:no-any
    //   (<any> workspaceAst.value).projects = projects;
    // }
    return config_1.addProjectToWorkspace(workspace, options.name, project);
}
function minimalPathFilter(path) {
    const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js).template$/;
    return !toRemoveList.test(path);
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        validation_1.validateProjectName(options.name);
        const prefix = options.prefix || 'app';
        const appRootSelector = `${prefix}-root`;
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
        let newProjectRoot = workspace.newProjectRoot || '';
        let appDir = `${newProjectRoot}/${options.name}`;
        let sourceRoot = `${appDir}/src`;
        let sourceDir = `${sourceRoot}/app`;
        let relativePathToWorkspaceRoot = appDir.split('/').map(x => '..').join('/');
        const rootInSrc = options.projectRoot !== undefined;
        if (options.projectRoot !== undefined) {
            newProjectRoot = options.projectRoot;
            appDir = `${newProjectRoot}/src`;
            sourceRoot = appDir;
            sourceDir = `${sourceRoot}/app`;
            relativePathToWorkspaceRoot = core_1.relative(core_1.normalize('/' + sourceRoot), core_1.normalize('/'));
            if (relativePathToWorkspaceRoot === '') {
                relativePathToWorkspaceRoot = '.';
            }
        }
        const tsLintRoot = appDir;
        const e2eOptions = {
            name: `${options.name}-e2e`,
            relatedAppName: options.name,
            rootSelector: appRootSelector,
            projectRoot: newProjectRoot ? `${newProjectRoot}/${options.name}-e2e` : 'e2e',
        };
        const styleExt = index_1.styleToFileExtention(options.style);
        return schematics_1.chain([
            addAppToWorkspaceFile(options, workspace),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/src'), [
                options.minimal ? schematics_1.filter(minimalPathFilter) : schematics_1.noop(),
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativePathToWorkspaceRoot,
                    styleExt })),
                schematics_1.move(sourceRoot),
            ])),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/root'), [
                options.minimal ? schematics_1.filter(minimalPathFilter) : schematics_1.noop(),
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativePathToWorkspaceRoot,
                    rootInSrc, appName: options.name })),
                schematics_1.move(appDir),
            ])),
            options.minimal ? schematics_1.noop() : schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/lint'), [
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { tsLintRoot,
                    relativePathToWorkspaceRoot,
                    prefix })),
            ])),
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
                    ? schematics_1.filter(path => !/[.|-]spec.ts.template$/.test(path))
                    : schematics_1.noop(),
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { selector: appRootSelector }, componentOptions, { styleExt })),
                schematics_1.move(sourceDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            options.minimal ? schematics_1.noop() : schematics_1.schematic('e2e', e2eOptions),
            options.experimentalIvy ? addPostInstallScript() : schematics_1.noop(),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(options),
            options.lintFix ? lint_fix_1.applyLintFix(sourceDir) : schematics_1.noop(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVE4QjtBQUM5QiwyREFlb0M7QUFDcEMsNERBQTBFO0FBQzFFLDhDQUEwRDtBQUcxRCw4Q0FHMkI7QUFDM0IsMERBQXVGO0FBQ3ZGLHNEQUFrRztBQUNsRyxnRUFBNEQ7QUFDNUQsa0RBQW1EO0FBQ25ELHNEQUE0RDtBQUM1RCxrRUFLcUM7QUFDckMscUNBQStEO0FBRy9ELG9CQUFvQjtBQUNwQixzQ0FBc0M7QUFDdEMsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QiwwQkFBMEI7QUFDMUIsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQixNQUFNO0FBQ04sOERBQThEO0FBRTlELHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsZ0VBQWdFO0FBQ2hFLDJGQUEyRjtBQUMzRixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLGdDQUFnQztBQUNoQyxPQUFPO0FBQ1AsSUFBSTtBQUVKLFNBQVMsNEJBQTRCLENBQUMsT0FBMkI7SUFDL0QsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0M7WUFDRTtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsT0FBTyxFQUFFLGdDQUFjLENBQUMsT0FBTzthQUNoQztZQUNEO2dCQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO2dCQUM1QixJQUFJLEVBQUUsK0JBQStCO2dCQUNyQyxPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxrQkFBa0I7YUFDM0M7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFF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QUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN0RCxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDViwyQkFBYyxpQkFDWixLQUFLLEVBQUUsY0FBTyxJQUNYLE9BQWMsSUFDakIsUUFBUSxFQUFFLGVBQWUsSUFDdEIsZ0JBQWdCLElBQ25CLFFBQVEsSUFDUjtnQkFDRixpQkFBSSxDQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQUUsMEJBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxzQkFBUyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7WUFDdkQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtZQUN6RCxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxpQkFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQztZQUN4RSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx1QkFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBSSxFQUFFO1NBQ25ELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFySUQsNEJBcUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgSnNvbk9iamVjdCxcbiAgSnNvblBhcnNlTW9kZSxcbiAgam9pbixcbiAgbm9ybWFsaXplLFxuICBwYXJzZUpzb25Bc3QsXG4gIHJlbGF0aXZlLFxuICBzdHJpbmdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBNZXJnZVN0cmF0ZWd5LFxuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBzdHlsZVRvRmlsZUV4dGVudGlvbiB9IGZyb20gJy4uL2NvbXBvbmVudC9pbmRleCc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7XG4gIGFkZFByb2plY3RUb1dvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlLFxufSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0LCBpbnNlcnRQcm9wZXJ0eUluQXN0T2JqZWN0SW5PcmRlciB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi11dGlscyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IGFwcGx5TGludEZpeCB9IGZyb20gJy4uL3V0aWxpdHkvbGludC1maXgnO1xuaW1wb3J0IHsgdmFsaWRhdGVQcm9qZWN0TmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvdmFsaWRhdGlvbic7XG5pbXBvcnQge1xuICBCdWlsZGVycyxcbiAgUHJvamVjdFR5cGUsXG4gIFdvcmtzcGFjZVByb2plY3QsXG4gIFdvcmtzcGFjZVNjaGVtYSxcbn0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMsIFN0eWxlIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbi8vIFRPRE86IHVzZSBKc29uQVNUXG4vLyBmdW5jdGlvbiBhcHBlbmRQcm9wZXJ0eUluQXN0T2JqZWN0KFxuLy8gICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4vLyAgIG5vZGU6IEpzb25Bc3RPYmplY3QsXG4vLyAgIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuLy8gICB2YWx1ZTogSnNvblZhbHVlLFxuLy8gICBpbmRlbnQgPSA0LFxuLy8gKSB7XG4vLyAgIGNvbnN0IGluZGVudFN0ciA9ICdcXG4nICsgbmV3IEFycmF5KGluZGVudCArIDEpLmpvaW4oJyAnKTtcblxuLy8gICBpZiAobm9kZS5wcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcbi8vICAgICAvLyBJbnNlcnQgY29tbWEuXG4vLyAgICAgY29uc3QgbGFzdCA9IG5vZGUucHJvcGVydGllc1tub2RlLnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4vLyAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQobGFzdC5zdGFydC5vZmZzZXQgKyBsYXN0LnRleHQucmVwbGFjZSgvXFxzKyQvLCAnJykubGVuZ3RoLCAnLCcpO1xuLy8gICB9XG5cbi8vICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChcbi8vICAgICBub2RlLmVuZC5vZmZzZXQgLSAxLFxuLy8gICAgICcgICdcbi8vICAgICArIGBcIiR7cHJvcGVydHlOYW1lfVwiOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKS5yZXBsYWNlKC9cXG4vZywgaW5kZW50U3RyKX1gXG4vLyAgICAgKyBpbmRlbnRTdHIuc2xpY2UoMCwgLTIpLFxuLy8gICApO1xuLy8gfVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ3R5cGVzY3JpcHQnLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5UeXBlU2NyaXB0LFxuICAgICAgfSxcbiAgICBdLmZvckVhY2goZGVwZW5kZW5jeSA9PiBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgZGVwZW5kZW5jeSkpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZFBvc3RJbnN0YWxsU2NyaXB0KCkge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBwa2dKc29uUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnSnNvblBhdGgpO1xuICAgIGlmICghYnVmZmVyKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IHJlYWQgcGFja2FnZS5qc29uLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VKc29uQXN0ID0gcGFyc2VKc29uQXN0KGJ1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLlN0cmljdCk7XG4gICAgaWYgKHBhY2thZ2VKc29uQXN0LmtpbmQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCBwYWNrYWdlLmpzb24uIFdhcyBleHBlY3RpbmcgYW4gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjcmlwdHNOb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QocGFja2FnZUpzb25Bc3QsICdzY3JpcHRzJyk7XG4gICAgaWYgKHNjcmlwdHNOb2RlICYmIHNjcmlwdHNOb2RlLmtpbmQgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUocGtnSnNvblBhdGgpO1xuICAgICAgY29uc3QgcG9zdEluc3RhbGwgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdChzY3JpcHRzTm9kZSwgJ3Bvc3RpbnN0YWxsJyk7XG5cbiAgICAgIGlmICghcG9zdEluc3RhbGwpIHtcbiAgICAgICAgLy8gcG9zdGluc3RhbGwgc2NyaXB0IG5vdCBmb3VuZCwgYWRkIGl0LlxuICAgICAgICBpbnNlcnRQcm9wZXJ0eUluQXN0T2JqZWN0SW5PcmRlcihcbiAgICAgICAgICByZWNvcmRlcixcbiAgICAgICAgICBzY3JpcHRzTm9kZSxcbiAgICAgICAgICAncG9zdGluc3RhbGwnLFxuICAgICAgICAgICdpdnktbmdjYycsXG4gICAgICAgICAgNCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgLy8gVE9ETzogdXNlIEpzb25BU1RcbiAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgLy8gY29uc3Qgd29ya3NwYWNlQnVmZmVyID0gaG9zdC5yZWFkKHdvcmtzcGFjZVBhdGgpO1xuICAvLyBpZiAod29ya3NwYWNlQnVmZmVyID09PSBudWxsKSB7XG4gIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAvLyB9XG4gIC8vIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBwYXJzZUpzb24od29ya3NwYWNlQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbmFibGUgdG8gcGFyc2UgY29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KS5gKTtcbiAgLy8gfVxuICBsZXQgcHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWRcbiAgICA/IG9wdGlvbnMucHJvamVjdFJvb3RcbiAgICA6IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdCB8fCAnJ30vJHtvcHRpb25zLm5hbWV9YDtcbiAgaWYgKHByb2plY3RSb290ICE9PSAnJyAmJiAhcHJvamVjdFJvb3QuZW5kc1dpdGgoJy8nKSkge1xuICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgfVxuICBjb25zdCByb290RmlsZXNSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgPyBwcm9qZWN0Um9vdFxuICAgIDogcHJvamVjdFJvb3QgKyAnc3JjLyc7XG5cbiAgY29uc3Qgc2NoZW1hdGljczogSnNvbk9iamVjdCA9IHt9O1xuXG4gIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlXG4gICAgfHwgb3B0aW9ucy5pbmxpbmVTdHlsZSA9PT0gdHJ1ZVxuICAgIHx8IG9wdGlvbnMuc3R5bGUgIT09IFN0eWxlLkNzcykge1xuICAgIGNvbnN0IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zOiBKc29uT2JqZWN0ID0ge307XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPT09IHRydWUpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLmlubGluZVRlbXBsYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lU3R5bGUgPT09IHRydWUpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLmlubGluZVN0eWxlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuc3R5bGUgJiYgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5zdHlsZSA9IG9wdGlvbnMuc3R5bGU7XG4gICAgfVxuXG4gICAgc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSA9IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuc2tpcFRlc3RzID09PSB0cnVlKSB7XG4gICAgWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJywgJ21vZHVsZScsICdwaXBlJywgJ3NlcnZpY2UnXS5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICBzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSA9IHt9O1xuICAgICAgfVxuICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnNraXBUZXN0cyA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBzdHlsZUV4dCA9IHN0eWxlVG9GaWxlRXh0ZW50aW9uKG9wdGlvbnMuc3R5bGUpO1xuXG4gIGNvbnN0IHByb2plY3Q6IFdvcmtzcGFjZVByb2plY3QgPSB7XG4gICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgc291cmNlUm9vdDogam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJyksXG4gICAgcHJvamVjdFR5cGU6IFByb2plY3RUeXBlLkFwcGxpY2F0aW9uLFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCcsXG4gICAgc2NoZW1hdGljcyxcbiAgICBhcmNoaXRlY3Q6IHtcbiAgICAgIGJ1aWxkOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkJyb3dzZXIsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICAgIGluZGV4OiBgJHtwcm9qZWN0Um9vdH1zcmMvaW5kZXguaHRtbGAsXG4gICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9c3JjL21haW4udHNgLFxuICAgICAgICAgIHBvbHlmaWxsczogYCR7cHJvamVjdFJvb3R9c3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgdHNDb25maWc6IGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJywgJ2Zhdmljb24uaWNvJyksXG4gICAgICAgICAgICBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnLCAnYXNzZXRzJyksXG4gICAgICAgICAgXSxcbiAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgIGAke3Byb2plY3RSb290fXNyYy9zdHlsZXMuJHtzdHlsZUV4dH1gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgZXM1QnJvd3NlclN1cHBvcnQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW3tcbiAgICAgICAgICAgICAgcmVwbGFjZTogYCR7cHJvamVjdFJvb3R9c3JjL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC50c2AsXG4gICAgICAgICAgICAgIHdpdGg6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQucHJvZC50c2AsXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICAgIGJ1ZGdldHM6IFt7XG4gICAgICAgICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcybWInLFxuICAgICAgICAgICAgICBtYXhpbXVtRXJyb3I6ICc1bWInLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZToge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5EZXZTZXJ2ZXIsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuRXh0cmFjdEkxOG4sXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkthcm1hLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9c3JjL3Rlc3QudHNgLFxuICAgICAgICAgIHBvbHlmaWxsczogYCR7cHJvamVjdFJvb3R9c3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgdHNDb25maWc6IGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH1rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgIGAke3Byb2plY3RSb290fXNyYy9zdHlsZXMuJHtzdHlsZUV4dH1gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgYXNzZXRzOiBbXG4gICAgICAgICAgICBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnLCAnZmF2aWNvbi5pY28nKSxcbiAgICAgICAgICAgIGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycsICdhc3NldHMnKSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuVHNMaW50LFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdHNDb25maWc6IFtcbiAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyBjb25zdCBwcm9qZWN0czogSnNvbk9iamVjdCA9ICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzIHx8IHt9O1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIC8vIGlmICghKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMpIHtcbiAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIC8vICAgKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMgPSBwcm9qZWN0cztcbiAgLy8gfVxuXG4gIHJldHVybiBhZGRQcm9qZWN0VG9Xb3Jrc3BhY2Uod29ya3NwYWNlLCBvcHRpb25zLm5hbWUsIHByb2plY3QpO1xufVxuXG5mdW5jdGlvbiBtaW5pbWFsUGF0aEZpbHRlcihwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgdG9SZW1vdmVMaXN0ID0gLyh0ZXN0LnRzfHRzY29uZmlnLnNwZWMuanNvbnxrYXJtYS5jb25mLmpzKS50ZW1wbGF0ZSQvO1xuXG4gIHJldHVybiAhdG9SZW1vdmVMaXN0LnRlc3QocGF0aCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICAgIH1cbiAgICB2YWxpZGF0ZVByb2plY3ROYW1lKG9wdGlvbnMubmFtZSk7XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCc7XG4gICAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7cHJlZml4fS1yb290YDtcbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zOiBQYXJ0aWFsPENvbXBvbmVudE9wdGlvbnM+ID0gIW9wdGlvbnMubWluaW1hbCA/XG4gICAgICB7XG4gICAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgc2tpcFRlc3RzOiBvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgfSA6XG4gICAgICB7XG4gICAgICAgIGlubGluZVN0eWxlOiB0cnVlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgc2tpcFRlc3RzOiB0cnVlLFxuICAgICAgICBzdHlsZTogb3B0aW9ucy5zdHlsZSxcbiAgICAgIH07XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgbGV0IG5ld1Byb2plY3RSb290ID0gd29ya3NwYWNlLm5ld1Byb2plY3RSb290IHx8ICcnO1xuICAgIGxldCBhcHBEaXIgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICBsZXQgc291cmNlUm9vdCA9IGAke2FwcERpcn0vc3JjYDtcbiAgICBsZXQgc291cmNlRGlyID0gYCR7c291cmNlUm9vdH0vYXBwYDtcbiAgICBsZXQgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290ID0gYXBwRGlyLnNwbGl0KCcvJykubWFwKHggPT4gJy4uJykuam9pbignLycpO1xuICAgIGNvbnN0IHJvb3RJblNyYyA9IG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZDtcbiAgICBpZiAob3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdQcm9qZWN0Um9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3Q7XG4gICAgICBhcHBEaXIgPSBgJHtuZXdQcm9qZWN0Um9vdH0vc3JjYDtcbiAgICAgIHNvdXJjZVJvb3QgPSBhcHBEaXI7XG4gICAgICBzb3VyY2VEaXIgPSBgJHtzb3VyY2VSb290fS9hcHBgO1xuICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290ID0gcmVsYXRpdmUobm9ybWFsaXplKCcvJyArIHNvdXJjZVJvb3QpLCBub3JtYWxpemUoJy8nKSk7XG4gICAgICBpZiAocmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290ID09PSAnJykge1xuICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgPSAnLic7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRzTGludFJvb3QgPSBhcHBEaXI7XG5cbiAgICBjb25zdCBlMmVPcHRpb25zOiBFMmVPcHRpb25zID0ge1xuICAgICAgbmFtZTogYCR7b3B0aW9ucy5uYW1lfS1lMmVgLFxuICAgICAgcmVsYXRlZEFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgIHJvb3RTZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgcHJvamVjdFJvb3Q6IG5ld1Byb2plY3RSb290ID8gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfS1lMmVgIDogJ2UyZScsXG4gICAgfTtcblxuICAgIGNvbnN0IHN0eWxlRXh0ID0gc3R5bGVUb0ZpbGVFeHRlbnRpb24ob3B0aW9ucy5zdHlsZSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9zcmMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbCA/IGZpbHRlcihtaW5pbWFsUGF0aEZpbHRlcikgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCxcbiAgICAgICAgICAgIHN0eWxlRXh0LFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlUm9vdCksXG4gICAgICAgIF0pKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbCA/IGZpbHRlcihtaW5pbWFsUGF0aEZpbHRlcikgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCxcbiAgICAgICAgICAgIHJvb3RJblNyYyxcbiAgICAgICAgICAgIGFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pKSxcbiAgICAgIG9wdGlvbnMubWluaW1hbCA/IG5vb3AoKSA6IG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL2xpbnQnKSwgW1xuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHRzTGludFJvb3QsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QsXG4gICAgICAgICAgICBwcmVmaXgsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgLy8gVE9ETzogTW92aW5nIHNob3VsZCB3b3JrIGJ1dCBpcyBidWdnZWQgcmlnaHQgbm93LlxuICAgICAgICAgIC8vIFRoZSBfX3RzTGludFJvb3RfXyBpcyBiZWluZyB1c2VkIG1lYW53aGlsZS5cbiAgICAgICAgICAvLyBPdGhlcndpc2UgdGhlIHRzbGludC5qc29uIGZpbGUgY291bGQgYmUgaW5zaWRlIG9mIHRoZSByb290IGZvbGRlciBhbmRcbiAgICAgICAgICAvLyB0aGlzIGJsb2NrIGFuZCB0aGUgbGludCBmb2xkZXIgY291bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgXSkpLFxuICAgICAgc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vb3RoZXItZmlsZXMnKSwgW1xuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICAgID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLnNraXBUZXN0c1xuICAgICAgICAgICAgPyBmaWx0ZXIocGF0aCA9PiAhL1sufC1dc3BlYy50cy50ZW1wbGF0ZSQvLnRlc3QocGF0aCkpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMgYXMgYW55LCAgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgICAgICAgc3R5bGVFeHQsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShzb3VyY2VEaXIpLFxuICAgICAgICBdKSwgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUpLFxuICAgICAgb3B0aW9ucy5taW5pbWFsID8gbm9vcCgpIDogc2NoZW1hdGljKCdlMmUnLCBlMmVPcHRpb25zKSxcbiAgICAgIG9wdGlvbnMuZXhwZXJpbWVudGFsSXZ5ID8gYWRkUG9zdEluc3RhbGxTY3JpcHQoKSA6IG5vb3AoKSxcbiAgICAgIG9wdGlvbnMuc2tpcFBhY2thZ2VKc29uID8gbm9vcCgpIDogYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbihvcHRpb25zKSxcbiAgICAgIG9wdGlvbnMubGludEZpeCA/IGFwcGx5TGludEZpeChzb3VyY2VEaXIpIDogbm9vcCgpLFxuICAgIF0pO1xuICB9O1xufVxuIl19