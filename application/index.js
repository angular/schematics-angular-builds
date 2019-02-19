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
        : `${workspace.newProjectRoot}/${options.name}`;
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
        let newProjectRoot = workspace.newProjectRoot;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQVE4QjtBQUM5QiwyREFlb0M7QUFDcEMsNERBQTBFO0FBQzFFLDhDQUEwRDtBQUcxRCw4Q0FHMkI7QUFDM0IsMERBQXVGO0FBQ3ZGLHNEQUFrRztBQUNsRyxnRUFBNEQ7QUFDNUQsa0RBQW1EO0FBQ25ELHNEQUE0RDtBQUM1RCxrRUFLcUM7QUFDckMscUNBQStEO0FBRy9ELG9CQUFvQjtBQUNwQixzQ0FBc0M7QUFDdEMsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QiwwQkFBMEI7QUFDMUIsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQixNQUFNO0FBQ04sOERBQThEO0FBRTlELHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsZ0VBQWdFO0FBQ2hFLDJGQUEyRjtBQUMzRixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLGdDQUFnQztBQUNoQyxPQUFPO0FBQ1AsSUFBSTtBQUVKLFNBQVMsNEJBQTRCLENBQUMsT0FBMkI7SUFDL0QsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0M7WUFDRTtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsT0FBTyxFQUFFLGdDQUFjLENBQUMsT0FBTzthQUNoQztZQUNEO2dCQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO2dCQUM1QixJQUFJLEVBQUUsK0JBQStCO2dCQUNyQyxPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxrQkFBa0I7YUFDM0M7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFF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Q0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDdEQsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQ1YsMkJBQWMsaUJBQ1osS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFjLElBQ2pCLFFBQVEsRUFBRSxlQUFlLElBQ3RCLGdCQUFnQixJQUNuQixRQUFRLElBQ1I7Z0JBQ0YsaUJBQUksQ0FBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUFFLDBCQUFhLENBQUMsU0FBUyxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsc0JBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1lBQ3ZELE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7WUFDekQsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7WUFDeEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtTQUNuRCxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBcklELDRCQXFJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIGpvaW4sXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2VKc29uQXN0LFxuICByZWxhdGl2ZSxcbiAgc3RyaW5ncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgc3R5bGVUb0ZpbGVFeHRlbnRpb24gfSBmcm9tICcuLi9jb21wb25lbnQvaW5kZXgnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbXBvbmVudE9wdGlvbnMgfSBmcm9tICcuLi9jb21wb25lbnQvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBFMmVPcHRpb25zIH0gZnJvbSAnLi4vZTJlL3NjaGVtYSc7XG5pbXBvcnQge1xuICBhZGRQcm9qZWN0VG9Xb3Jrc3BhY2UsXG4gIGdldFdvcmtzcGFjZSxcbn0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBmaW5kUHJvcGVydHlJbkFzdE9iamVjdCwgaW5zZXJ0UHJvcGVydHlJbkFzdE9iamVjdEluT3JkZXIgfSBmcm9tICcuLi91dGlsaXR5L2pzb24tdXRpbHMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBhcHBseUxpbnRGaXggfSBmcm9tICcuLi91dGlsaXR5L2xpbnQtZml4JztcbmltcG9ydCB7IHZhbGlkYXRlUHJvamVjdE5hbWUgfSBmcm9tICcuLi91dGlsaXR5L3ZhbGlkYXRpb24nO1xuaW1wb3J0IHtcbiAgQnVpbGRlcnMsXG4gIFByb2plY3RUeXBlLFxuICBXb3Jrc3BhY2VQcm9qZWN0LFxuICBXb3Jrc3BhY2VTY2hlbWEsXG59IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zLCBTdHlsZSB9IGZyb20gJy4vc2NoZW1hJztcblxuXG4vLyBUT0RPOiB1c2UgSnNvbkFTVFxuLy8gZnVuY3Rpb24gYXBwZW5kUHJvcGVydHlJbkFzdE9iamVjdChcbi8vICAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuLy8gICBub2RlOiBKc29uQXN0T2JqZWN0LFxuLy8gICBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbi8vICAgdmFsdWU6IEpzb25WYWx1ZSxcbi8vICAgaW5kZW50ID0gNCxcbi8vICkge1xuLy8gICBjb25zdCBpbmRlbnRTdHIgPSAnXFxuJyArIG5ldyBBcnJheShpbmRlbnQgKyAxKS5qb2luKCcgJyk7XG5cbi8vICAgaWYgKG5vZGUucHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG4vLyAgICAgLy8gSW5zZXJ0IGNvbW1hLlxuLy8gICAgIGNvbnN0IGxhc3QgPSBub2RlLnByb3BlcnRpZXNbbm9kZS5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuLy8gICAgIHJlY29yZGVyLmluc2VydFJpZ2h0KGxhc3Quc3RhcnQub2Zmc2V0ICsgbGFzdC50ZXh0LnJlcGxhY2UoL1xccyskLywgJycpLmxlbmd0aCwgJywnKTtcbi8vICAgfVxuXG4vLyAgIHJlY29yZGVyLmluc2VydExlZnQoXG4vLyAgICAgbm9kZS5lbmQub2Zmc2V0IC0gMSxcbi8vICAgICAnICAnXG4vLyAgICAgKyBgXCIke3Byb3BlcnR5TmFtZX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikucmVwbGFjZSgvXFxuL2csIGluZGVudFN0cil9YFxuLy8gICAgICsgaW5kZW50U3RyLnNsaWNlKDAsIC0yKSxcbi8vICAgKTtcbi8vIH1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbihvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgW1xuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICd0eXBlc2NyaXB0JyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuVHlwZVNjcmlwdCxcbiAgICAgIH0sXG4gICAgXS5mb3JFYWNoKGRlcGVuZGVuY3kgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpKTtcblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRQb3N0SW5zdGFsbFNjcmlwdCgpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgcGtnSnNvblBhdGggPSAnL3BhY2thZ2UuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHBrZ0pzb25QYXRoKTtcbiAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCByZWFkIHBhY2thZ2UuanNvbi4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlSnNvbkFzdCA9IHBhcnNlSnNvbkFzdChidWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5TdHJpY3QpO1xuICAgIGlmIChwYWNrYWdlSnNvbkFzdC5raW5kICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgcGFja2FnZS5qc29uLiBXYXMgZXhwZWN0aW5nIGFuIG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY3JpcHRzTm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHBhY2thZ2VKc29uQXN0LCAnc2NyaXB0cycpO1xuICAgIGlmIChzY3JpcHRzTm9kZSAmJiBzY3JpcHRzTm9kZS5raW5kID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHBrZ0pzb25QYXRoKTtcbiAgICAgIGNvbnN0IHBvc3RJbnN0YWxsID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3Qoc2NyaXB0c05vZGUsICdwb3N0aW5zdGFsbCcpO1xuXG4gICAgICBpZiAoIXBvc3RJbnN0YWxsKSB7XG4gICAgICAgIC8vIHBvc3RpbnN0YWxsIHNjcmlwdCBub3QgZm91bmQsIGFkZCBpdC5cbiAgICAgICAgaW5zZXJ0UHJvcGVydHlJbkFzdE9iamVjdEluT3JkZXIoXG4gICAgICAgICAgcmVjb3JkZXIsXG4gICAgICAgICAgc2NyaXB0c05vZGUsXG4gICAgICAgICAgJ3Bvc3RpbnN0YWxsJyxcbiAgICAgICAgICAnaXZ5LW5nY2MnLFxuICAgICAgICAgIDQsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIC8vIFRPRE86IHVzZSBKc29uQVNUXG4gIC8vIGNvbnN0IHdvcmtzcGFjZVBhdGggPSAnL2FuZ3VsYXIuanNvbic7XG4gIC8vIGNvbnN0IHdvcmtzcGFjZUJ1ZmZlciA9IGhvc3QucmVhZCh3b3Jrc3BhY2VQYXRoKTtcbiAgLy8gaWYgKHdvcmtzcGFjZUJ1ZmZlciA9PT0gbnVsbCkge1xuICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb25maWd1cmF0aW9uIGZpbGUgKCR7d29ya3NwYWNlUGF0aH0pIG5vdCBmb3VuZC5gKTtcbiAgLy8gfVxuICAvLyBjb25zdCB3b3Jrc3BhY2VKc29uID0gcGFyc2VKc29uKHdvcmtzcGFjZUJ1ZmZlci50b1N0cmluZygpKTtcbiAgLy8gaWYgKHdvcmtzcGFjZUpzb24udmFsdWUgPT09IG51bGwpIHtcbiAgLy8gICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5hYmxlIHRvIHBhcnNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkuYCk7XG4gIC8vIH1cbiAgbGV0IHByb2plY3RSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkXG4gICAgPyBvcHRpb25zLnByb2plY3RSb290XG4gICAgOiBgJHt3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gIGlmIChwcm9qZWN0Um9vdCAhPT0gJycgJiYgIXByb2plY3RSb290LmVuZHNXaXRoKCcvJykpIHtcbiAgICBwcm9qZWN0Um9vdCArPSAnLyc7XG4gIH1cbiAgY29uc3Qgcm9vdEZpbGVzUm9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3QgPT09IHVuZGVmaW5lZFxuICAgID8gcHJvamVjdFJvb3RcbiAgICA6IHByb2plY3RSb290ICsgJ3NyYy8nO1xuXG4gIGNvbnN0IHNjaGVtYXRpY3M6IEpzb25PYmplY3QgPSB7fTtcblxuICBpZiAob3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9PT0gdHJ1ZVxuICAgIHx8IG9wdGlvbnMuaW5saW5lU3R5bGUgPT09IHRydWVcbiAgICB8fCBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3MpIHtcbiAgICBjb25zdCBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9uczogSnNvbk9iamVjdCA9IHt9O1xuICAgIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID09PSB0cnVlKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnN0eWxlICYmIG9wdGlvbnMuc3R5bGUgIT09IFN0eWxlLkNzcykge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuc3R5bGUgPSBvcHRpb25zLnN0eWxlO1xuICAgIH1cblxuICAgIHNjaGVtYXRpY3NbJ0BzY2hlbWF0aWNzL2FuZ3VsYXI6Y29tcG9uZW50J10gPSBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucztcbiAgfVxuXG4gIGlmIChvcHRpb25zLnNraXBUZXN0cyA9PT0gdHJ1ZSkge1xuICAgIFsnY2xhc3MnLCAnY29tcG9uZW50JywgJ2RpcmVjdGl2ZScsICdndWFyZCcsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ10uZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgaWYgKCEoYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWAgaW4gc2NoZW1hdGljcykpIHtcbiAgICAgICAgc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIChzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSBhcyBKc29uT2JqZWN0KS5za2lwVGVzdHMgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc3R5bGVFeHQgPSBzdHlsZVRvRmlsZUV4dGVudGlvbihvcHRpb25zLnN0eWxlKTtcblxuICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0ID0ge1xuICAgIHJvb3Q6IHByb2plY3RSb290LFxuICAgIHNvdXJjZVJvb3Q6IGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycpLFxuICAgIHByb2plY3RUeXBlOiBQcm9qZWN0VHlwZS5BcHBsaWNhdGlvbixcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4IHx8ICdhcHAnLFxuICAgIHNjaGVtYXRpY3MsXG4gICAgYXJjaGl0ZWN0OiB7XG4gICAgICBidWlsZDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Ccm93c2VyLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtvcHRpb25zLm5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7cHJvamVjdFJvb3R9c3JjL2luZGV4Lmh0bWxgLFxuICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy9tYWluLnRzYCxcbiAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fXNyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgIGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycsICdmYXZpY29uLmljbycpLFxuICAgICAgICAgICAgam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJywgJ2Fzc2V0cycpLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH1zcmMvc3R5bGVzLiR7c3R5bGVFeHR9YCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICAgIGVzNUJyb3dzZXJTdXBwb3J0OiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFt7XG4gICAgICAgICAgICAgIHJlcGxhY2U6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQudHNgLFxuICAgICAgICAgICAgICB3aXRoOiBgJHtwcm9qZWN0Um9vdH1zcmMvZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnByb2QudHNgLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICBidWRnZXRzOiBbe1xuICAgICAgICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgICAgICAgIG1heGltdW1XYXJuaW5nOiAnMm1iJyxcbiAgICAgICAgICAgICAgbWF4aW11bUVycm9yOiAnNW1iJyxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VydmU6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuRGV2U2VydmVyLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgICdleHRyYWN0LWkxOG4nOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkV4dHJhY3RJMThuLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdGVzdDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5LYXJtYSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy90ZXN0LnRzYCxcbiAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fXNyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAga2FybWFDb25maWc6IGAke3Jvb3RGaWxlc1Jvb3R9a2FybWEuY29uZi5qc2AsXG4gICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH1zcmMvc3R5bGVzLiR7c3R5bGVFeHR9YCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJywgJ2Zhdmljb24uaWNvJyksXG4gICAgICAgICAgICBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnLCAnYXNzZXRzJyksXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBsaW50OiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlRzTGludCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgLy8gY29uc3QgcHJvamVjdHM6IEpzb25PYmplY3QgPSAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyB8fCB7fTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyAgICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzID0gcHJvamVjdHM7XG4gIC8vIH1cblxuICByZXR1cm4gYWRkUHJvamVjdFRvV29ya3NwYWNlKHdvcmtzcGFjZSwgb3B0aW9ucy5uYW1lLCBwcm9qZWN0KTtcbn1cblxuZnVuY3Rpb24gbWluaW1hbFBhdGhGaWx0ZXIocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHRvUmVtb3ZlTGlzdCA9IC8odGVzdC50c3x0c2NvbmZpZy5zcGVjLmpzb258a2FybWEuY29uZi5qcykudGVtcGxhdGUkLztcblxuICByZXR1cm4gIXRvUmVtb3ZlTGlzdC50ZXN0KHBhdGgpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBvcHRpb25zLCBcIm5hbWVcIiBpcyByZXF1aXJlZC5gKTtcbiAgICB9XG4gICAgdmFsaWRhdGVQcm9qZWN0TmFtZShvcHRpb25zLm5hbWUpO1xuICAgIGNvbnN0IHByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdhcHAnO1xuICAgIGNvbnN0IGFwcFJvb3RTZWxlY3RvciA9IGAke3ByZWZpeH0tcm9vdGA7XG4gICAgY29uc3QgY29tcG9uZW50T3B0aW9uczogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPiA9ICFvcHRpb25zLm1pbmltYWwgP1xuICAgICAge1xuICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICAgIH0gOlxuICAgICAge1xuICAgICAgICBpbmxpbmVTdHlsZTogdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IHRydWUsXG4gICAgICAgIHNraXBUZXN0czogdHJ1ZSxcbiAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGxldCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgbGV0IHNvdXJjZVJvb3QgPSBgJHthcHBEaXJ9L3NyY2A7XG4gICAgbGV0IHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgbGV0IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9IGFwcERpci5zcGxpdCgnLycpLm1hcCh4ID0+ICcuLicpLmpvaW4oJy8nKTtcbiAgICBjb25zdCByb290SW5TcmMgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQ7XG4gICAgaWYgKG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3UHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290O1xuICAgICAgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9L3NyY2A7XG4gICAgICBzb3VyY2VSb290ID0gYXBwRGlyO1xuICAgICAgc291cmNlRGlyID0gYCR7c291cmNlUm9vdH0vYXBwYDtcbiAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9PT0gJycpIHtcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290ID0gJy4nO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0c0xpbnRSb290ID0gYXBwRGlyO1xuXG4gICAgY29uc3QgZTJlT3B0aW9uczogRTJlT3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IGAke29wdGlvbnMubmFtZX0tZTJlYCxcbiAgICAgIHJlbGF0ZWRBcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICByb290U2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgIHByb2plY3RSb290OiBuZXdQcm9qZWN0Um9vdCA/IGAke25ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX0tZTJlYCA6ICdlMmUnLFxuICAgIH07XG5cbiAgICBjb25zdCBzdHlsZUV4dCA9IHN0eWxlVG9GaWxlRXh0ZW50aW9uKG9wdGlvbnMuc3R5bGUpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMvc3JjJyksIFtcbiAgICAgICAgICBvcHRpb25zLm1pbmltYWwgPyBmaWx0ZXIobWluaW1hbFBhdGhGaWx0ZXIpIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QsXG4gICAgICAgICAgICBzdHlsZUV4dCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZVJvb3QpLFxuICAgICAgICBdKSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9yb290JyksIFtcbiAgICAgICAgICBvcHRpb25zLm1pbmltYWwgPyBmaWx0ZXIobWluaW1hbFBhdGhGaWx0ZXIpIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QsXG4gICAgICAgICAgICByb290SW5TcmMsXG4gICAgICAgICAgICBhcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSksXG4gICAgICBvcHRpb25zLm1pbmltYWwgPyBub29wKCkgOiBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9saW50JyksIFtcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICB0c0xpbnRSb290LFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290LFxuICAgICAgICAgICAgcHJlZml4LFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIC8vIFRPRE86IE1vdmluZyBzaG91bGQgd29yayBidXQgaXMgYnVnZ2VkIHJpZ2h0IG5vdy5cbiAgICAgICAgICAvLyBUaGUgX190c0xpbnRSb290X18gaXMgYmVpbmcgdXNlZCBtZWFud2hpbGUuXG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRoZSB0c2xpbnQuanNvbiBmaWxlIGNvdWxkIGJlIGluc2lkZSBvZiB0aGUgcm9vdCBmb2xkZXIgYW5kXG4gICAgICAgICAgLy8gdGhpcyBibG9jayBhbmQgdGhlIGxpbnQgZm9sZGVyIGNvdWxkIGJlIHJlbW92ZWQuXG4gICAgICAgIF0pKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlXG4gICAgICAgICAgICA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuaHRtbC50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5za2lwVGVzdHNcbiAgICAgICAgICAgID8gZmlsdGVyKHBhdGggPT4gIS9bLnwtXXNwZWMudHMudGVtcGxhdGUkLy50ZXN0KHBhdGgpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zIGFzIGFueSwgIC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICAgIHN0eWxlRXh0LFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgICAgXSksIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlKSxcbiAgICAgIG9wdGlvbnMubWluaW1hbCA/IG5vb3AoKSA6IHNjaGVtYXRpYygnZTJlJywgZTJlT3B0aW9ucyksXG4gICAgICBvcHRpb25zLmV4cGVyaW1lbnRhbEl2eSA/IGFkZFBvc3RJbnN0YWxsU2NyaXB0KCkgOiBub29wKCksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24ob3B0aW9ucyksXG4gICAgICBvcHRpb25zLmxpbnRGaXggPyBhcHBseUxpbnRGaXgoc291cmNlRGlyKSA6IG5vb3AoKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==