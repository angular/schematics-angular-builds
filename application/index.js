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
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const latest_versions_1 = require("../utility/latest-versions");
const validation_1 = require("../utility/validation");
const workspace_models_1 = require("../utility/workspace-models");
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
function addDependenciesToPackageJson() {
    return (host) => {
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
        return host;
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
        || options.style !== 'css') {
        schematics['@schematics/angular:component'] = {};
        if (options.inlineTemplate === true) {
            schematics['@schematics/angular:component'].inlineTemplate = true;
        }
        if (options.inlineStyle === true) {
            schematics['@schematics/angular:component'].inlineStyle = true;
        }
        if (options.style && options.style !== 'css') {
            schematics['@schematics/angular:component'].styleext = options.style;
        }
    }
    if (options.skipTests === true) {
        ['class', 'component', 'directive', 'guard', 'module', 'pipe', 'service'].forEach((type) => {
            if (!(`@schematics/angular:${type}` in schematics)) {
                schematics[`@schematics/angular:${type}`] = {};
            }
            schematics[`@schematics/angular:${type}`].spec = false;
        });
    }
    const project = {
        root: projectRoot,
        sourceRoot: core_1.join(core_1.normalize(projectRoot), 'src'),
        projectType: workspace_models_1.ProjectType.Application,
        prefix: options.prefix || 'app',
        schematics,
        targets: {
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
                        `${projectRoot}src/styles.${options.style}`,
                    ],
                    scripts: [],
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
                        `${projectRoot}src/styles.${options.style}`,
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
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        validation_1.validateProjectName(options.name);
        const prefix = options.prefix || 'app';
        const appRootSelector = `${prefix}-root`;
        const componentOptions = {
            inlineStyle: options.inlineStyle,
            inlineTemplate: options.inlineTemplate,
            spec: !options.skipTests,
            styleext: options.style,
            viewEncapsulation: options.viewEncapsulation,
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
        };
        if (options.projectRoot !== undefined) {
            e2eOptions.projectRoot = 'e2e';
        }
        return schematics_1.chain([
            addAppToWorkspaceFile(options, workspace),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/src'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativePathToWorkspaceRoot })),
                schematics_1.move(sourceRoot),
            ])),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/root'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativePathToWorkspaceRoot,
                    rootInSrc })),
                schematics_1.move(appDir),
            ])),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/lint'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { tsLintRoot,
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
                spec: false,
                project: options.name,
            }),
            schematics_1.schematic('component', Object.assign({ name: 'app', selector: appRootSelector, flat: true, path: sourceDir, skipImport: true, project: options.name }, componentOptions)),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./other-files'), [
                componentOptions.inlineTemplate ? schematics_1.filter(path => !path.endsWith('.html')) : schematics_1.noop(),
                !componentOptions.spec ? schematics_1.filter(path => !path.endsWith('.spec.ts')) : schematics_1.noop(),
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { selector: appRootSelector }, componentOptions)),
                schematics_1.move(sourceDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            schematics_1.schematic('e2e', e2eOptions),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFzRjtBQUN0RiwyREFlb0M7QUFFcEMsOENBRzJCO0FBQzNCLDBEQUF1RjtBQUN2RixnRUFBNEQ7QUFDNUQsc0RBQTREO0FBQzVELGtFQUtxQztBQUlyQyxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLDhCQUE4QjtBQUM5Qix5QkFBeUI7QUFDekIsMEJBQTBCO0FBQzFCLHNCQUFzQjtBQUN0QixnQkFBZ0I7QUFDaEIsTUFBTTtBQUNOLDhEQUE4RDtBQUU5RCxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLGdFQUFnRTtBQUNoRSwyRkFBMkY7QUFDM0YsTUFBTTtBQUVOLHlCQUF5QjtBQUN6QiwyQkFBMkI7QUFDM0IsV0FBVztBQUNYLHlGQUF5RjtBQUN6RixnQ0FBZ0M7QUFDaEMsT0FBTztBQUNQLElBQUk7QUFFSixTQUFTLDRCQUE0QjtJQUNuQyxPQUFPLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEI7WUFDRTtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsT0FBTyxFQUFFLGdDQUFjLENBQUMsT0FBTzthQUNoQztZQUNEO2dCQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO2dCQUM1QixJQUFJLEVBQUUsK0JBQStCO2dCQUNyQyxPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxrQkFBa0I7YUFDM0M7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLE9BQU8sRUFBRSxnQ0FBYyxDQUFDLFVBQVU7YUFDbkM7U0FDRixDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLHVD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TyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDbEYsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDNUUscUJBQVEsaUJBQ04sS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFjLElBQ2pCLFFBQVEsRUFBRSxlQUFlLElBQ3RCLGdCQUFnQixFQUNuQjtnQkFDRixpQkFBSSxDQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQUUsMEJBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUIsc0JBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1NBQzdCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFwSEQsNEJBb0hDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7XG4gIGFkZFByb2plY3RUb1dvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlLFxufSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgdmFsaWRhdGVQcm9qZWN0TmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvdmFsaWRhdGlvbic7XG5pbXBvcnQge1xuICBCdWlsZGVycyxcbiAgUHJvamVjdFR5cGUsXG4gIFdvcmtzcGFjZVByb2plY3QsXG4gIFdvcmtzcGFjZVNjaGVtYSxcbn0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuLy8gVE9ETzogdXNlIEpzb25BU1Rcbi8vIGZ1bmN0aW9uIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QoXG4vLyAgIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbi8vICAgbm9kZTogSnNvbkFzdE9iamVjdCxcbi8vICAgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4vLyAgIHZhbHVlOiBKc29uVmFsdWUsXG4vLyAgIGluZGVudCA9IDQsXG4vLyApIHtcbi8vICAgY29uc3QgaW5kZW50U3RyID0gJ1xcbicgKyBuZXcgQXJyYXkoaW5kZW50ICsgMSkuam9pbignICcpO1xuXG4vLyAgIGlmIChub2RlLnByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuLy8gICAgIC8vIEluc2VydCBjb21tYS5cbi8vICAgICBjb25zdCBsYXN0ID0gbm9kZS5wcm9wZXJ0aWVzW25vZGUucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbi8vICAgICByZWNvcmRlci5pbnNlcnRSaWdodChsYXN0LnN0YXJ0Lm9mZnNldCArIGxhc3QudGV4dC5yZXBsYWNlKC9cXHMrJC8sICcnKS5sZW5ndGgsICcsJyk7XG4vLyAgIH1cblxuLy8gICByZWNvcmRlci5pbnNlcnRMZWZ0KFxuLy8gICAgIG5vZGUuZW5kLm9mZnNldCAtIDEsXG4vLyAgICAgJyAgJ1xuLy8gICAgICsgYFwiJHtwcm9wZXJ0eU5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLnJlcGxhY2UoL1xcbi9nLCBpbmRlbnRTdHIpfWBcbi8vICAgICArIGluZGVudFN0ci5zbGljZSgwLCAtMiksXG4vLyAgICk7XG4vLyB9XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHlwZXNjcmlwdCcsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLlR5cGVTY3JpcHQsXG4gICAgICB9LFxuICAgIF0uZm9yRWFjaChkZXBlbmRlbmN5ID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgLy8gVE9ETzogdXNlIEpzb25BU1RcbiAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgLy8gY29uc3Qgd29ya3NwYWNlQnVmZmVyID0gaG9zdC5yZWFkKHdvcmtzcGFjZVBhdGgpO1xuICAvLyBpZiAod29ya3NwYWNlQnVmZmVyID09PSBudWxsKSB7XG4gIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAvLyB9XG4gIC8vIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBwYXJzZUpzb24od29ya3NwYWNlQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbmFibGUgdG8gcGFyc2UgY29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KS5gKTtcbiAgLy8gfVxuICBsZXQgcHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWRcbiAgICA/IG9wdGlvbnMucHJvamVjdFJvb3RcbiAgICA6IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgaWYgKHByb2plY3RSb290ICE9PSAnJyAmJiAhcHJvamVjdFJvb3QuZW5kc1dpdGgoJy8nKSkge1xuICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgfVxuICBjb25zdCByb290RmlsZXNSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgPyBwcm9qZWN0Um9vdFxuICAgIDogcHJvamVjdFJvb3QgKyAnc3JjLyc7XG5cbiAgY29uc3Qgc2NoZW1hdGljczogSnNvbk9iamVjdCA9IHt9O1xuXG4gIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlXG4gICAgfHwgb3B0aW9ucy5pbmxpbmVTdHlsZSA9PT0gdHJ1ZVxuICAgIHx8IG9wdGlvbnMuc3R5bGUgIT09ICdjc3MnKSB7XG4gICAgc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSA9IHt9O1xuICAgIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID09PSB0cnVlKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnN0eWxlICYmIG9wdGlvbnMuc3R5bGUgIT09ICdjc3MnKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5zdHlsZWV4dCA9IG9wdGlvbnMuc3R5bGU7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdGlvbnMuc2tpcFRlc3RzID09PSB0cnVlKSB7XG4gICAgWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJywgJ21vZHVsZScsICdwaXBlJywgJ3NlcnZpY2UnXS5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICBzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSA9IHt9O1xuICAgICAgfVxuICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnNwZWMgPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3Q6IFdvcmtzcGFjZVByb2plY3QgPSB7XG4gICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgc291cmNlUm9vdDogam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJyksXG4gICAgcHJvamVjdFR5cGU6IFByb2plY3RUeXBlLkFwcGxpY2F0aW9uLFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCcsXG4gICAgc2NoZW1hdGljcyxcbiAgICB0YXJnZXRzOiB7XG4gICAgICBidWlsZDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Ccm93c2VyLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtvcHRpb25zLm5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7cHJvamVjdFJvb3R9c3JjL2luZGV4Lmh0bWxgLFxuICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy9tYWluLnRzYCxcbiAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fXNyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgIGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycsICdmYXZpY29uLmljbycpLFxuICAgICAgICAgICAgam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJywgJ2Fzc2V0cycpLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH1zcmMvc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW3tcbiAgICAgICAgICAgICAgcmVwbGFjZTogYCR7cHJvamVjdFJvb3R9c3JjL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC50c2AsXG4gICAgICAgICAgICAgIHdpdGg6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQucHJvZC50c2AsXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHNlcnZlOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkRldlNlcnZlcixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5FeHRyYWN0STE4bixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRlc3Q6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuS2FybWEsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH1zcmMvdGVzdC50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH1zcmMvcG9seWZpbGxzLnRzYCxcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgIGthcm1hQ29uZmlnOiBgJHtyb290RmlsZXNSb290fWthcm1hLmNvbmYuanNgLFxuICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9c3JjL3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJywgJ2Zhdmljb24uaWNvJyksXG4gICAgICAgICAgICBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnLCAnYXNzZXRzJyksXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBsaW50OiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlRzTGludCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgLy8gY29uc3QgcHJvamVjdHM6IEpzb25PYmplY3QgPSAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyB8fCB7fTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyAgICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzID0gcHJvamVjdHM7XG4gIC8vIH1cblxuICByZXR1cm4gYWRkUHJvamVjdFRvV29ya3NwYWNlKHdvcmtzcGFjZSwgb3B0aW9ucy5uYW1lLCBwcm9qZWN0KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIHZhbGlkYXRlUHJvamVjdE5hbWUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnYXBwJztcbiAgICBjb25zdCBhcHBSb290U2VsZWN0b3IgPSBgJHtwcmVmaXh9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgICAgc3BlYzogIW9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgc3R5bGVleHQ6IG9wdGlvbnMuc3R5bGUsXG4gICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGxldCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgbGV0IHNvdXJjZVJvb3QgPSBgJHthcHBEaXJ9L3NyY2A7XG4gICAgbGV0IHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgbGV0IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9IGFwcERpci5zcGxpdCgnLycpLm1hcCh4ID0+ICcuLicpLmpvaW4oJy8nKTtcbiAgICBjb25zdCByb290SW5TcmMgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQ7XG4gICAgaWYgKG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3UHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290O1xuICAgICAgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9L3NyY2A7XG4gICAgICBzb3VyY2VSb290ID0gYXBwRGlyO1xuICAgICAgc291cmNlRGlyID0gYCR7c291cmNlUm9vdH0vYXBwYDtcbiAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9PT0gJycpIHtcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290ID0gJy4nO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0c0xpbnRSb290ID0gYXBwRGlyO1xuXG4gICAgY29uc3QgZTJlT3B0aW9uczogRTJlT3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IGAke29wdGlvbnMubmFtZX0tZTJlYCxcbiAgICAgIHJlbGF0ZWRBcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICByb290U2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICB9O1xuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGUyZU9wdGlvbnMucHJvamVjdFJvb3QgPSAnZTJlJztcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZVJvb3QpLFxuICAgICAgICBdKSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9yb290JyksIFtcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAnZG90JzogJy4nLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290LFxuICAgICAgICAgICAgcm9vdEluU3JjLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSkpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMvbGludCcpLCBbXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgdHNMaW50Um9vdCxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCxcbiAgICAgICAgICAgIHByZWZpeCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICAvLyBUT0RPOiBNb3Zpbmcgc2hvdWxkIHdvcmsgYnV0IGlzIGJ1Z2dlZCByaWdodCBub3cuXG4gICAgICAgICAgLy8gVGhlIF9fdHNMaW50Um9vdF9fIGlzIGJlaW5nIHVzZWQgbWVhbndoaWxlLlxuICAgICAgICAgIC8vIE90aGVyd2lzZSB0aGUgdHNsaW50Lmpzb24gZmlsZSBjb3VsZCBiZSBpbnNpZGUgb2YgdGhlIHJvb3QgZm9sZGVyIGFuZFxuICAgICAgICAgIC8vIHRoaXMgYmxvY2sgYW5kIHRoZSBsaW50IGZvbGRlciBjb3VsZCBiZSByZW1vdmVkLlxuICAgICAgICBdKSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICAgICAgcm91dGluZ1Njb3BlOiAnUm9vdCcsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc3BlYzogZmFsc2UsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vb3RoZXItZmlsZXMnKSwgW1xuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLmh0bWwnKSkgOiBub29wKCksXG4gICAgICAgICAgIWNvbXBvbmVudE9wdGlvbnMuc3BlYyA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cycpKSA6IG5vb3AoKSxcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMgYXMgYW55LCAgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgICAgXSksIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlKSxcbiAgICAgIHNjaGVtYXRpYygnZTJlJywgZTJlT3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=