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
const latest_versions_1 = require("../utility/latest-versions");
const validation_1 = require("../utility/validation");
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
        const packageJsonPath = 'package.json';
        if (!host.exists('package.json')) {
            return host;
        }
        const source = host.read('package.json');
        if (!source) {
            return host;
        }
        const sourceText = source.toString('utf-8');
        const json = JSON.parse(sourceText);
        if (!json['devDependencies']) {
            json['devDependencies'] = {};
        }
        json.devDependencies = Object.assign({ '@angular/compiler-cli': latest_versions_1.latestVersions.Angular, '@angular-devkit/build-angular': latest_versions_1.latestVersions.DevkitBuildAngular, 'typescript': latest_versions_1.latestVersions.TypeScript }, json.devDependencies);
        host.overwrite(packageJsonPath, JSON.stringify(json, null, 2));
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
        sourceRoot: `${projectRoot}/src`,
        projectType: 'application',
        prefix: options.prefix || 'app',
        schematics,
        architect: {
            build: {
                builder: '@angular-devkit/build-angular:browser',
                options: {
                    outputPath: `dist/${options.name}`,
                    index: `${projectRoot}src/index.html`,
                    main: `${projectRoot}src/main.ts`,
                    polyfills: `${projectRoot}src/polyfills.ts`,
                    tsConfig: `${rootFilesRoot}tsconfig.app.json`,
                    assets: [
                        {
                            glob: 'favicon.ico',
                            input: `${projectRoot}src`,
                            output: '/',
                        },
                        {
                            glob: '**/*',
                            input: `${projectRoot}src/assets`,
                            output: '/assets',
                        },
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
                builder: '@angular-devkit/build-angular:dev-server',
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
                builder: '@angular-devkit/build-angular:extract-i18n',
                options: {
                    browserTarget: `${options.name}:build`,
                },
            },
            test: {
                builder: '@angular-devkit/build-angular:karma',
                options: {
                    main: `${projectRoot}src/test.ts`,
                    polyfills: `${projectRoot}src/polyfills.ts`,
                    tsConfig: `${rootFilesRoot}tsconfig.spec.json`,
                    karmaConfig: `${rootFilesRoot}karma.conf.js`,
                    styles: [
                        `${projectRoot}styles.${options.style}`,
                    ],
                    scripts: [],
                    assets: [
                        {
                            glob: 'favicon.ico',
                            input: `${projectRoot}src/`,
                            output: '/',
                        },
                        {
                            glob: '**/*',
                            input: `${projectRoot}src/assets`,
                            output: '/assets',
                        },
                    ],
                },
            },
            lint: {
                builder: '@angular-devkit/build-angular:tslint',
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
        let relativeTsConfigPath = appDir.split('/').map(x => '..').join('/');
        let relativeTsLintPath = appDir.split('/').map(x => '..').join('/');
        const rootInSrc = options.projectRoot !== undefined;
        if (options.projectRoot !== undefined) {
            newProjectRoot = options.projectRoot;
            appDir = `${newProjectRoot}/src`;
            sourceRoot = appDir;
            sourceDir = `${sourceRoot}/app`;
            relativeTsConfigPath = core_1.relative(core_1.normalize('/' + sourceRoot), core_1.normalize('/'));
            if (relativeTsConfigPath === '') {
                relativeTsConfigPath = '.';
            }
            relativeTsLintPath = core_1.relative(core_1.normalize('/' + sourceRoot), core_1.normalize('/'));
            if (relativeTsLintPath === '') {
                relativeTsLintPath = '.';
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
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativeTsConfigPath })),
                schematics_1.move(sourceRoot),
            ])),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/root'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', relativeTsConfigPath,
                    rootInSrc })),
                schematics_1.move(appDir),
            ])),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/lint'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { tsLintRoot,
                    relativeTsLintPath,
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
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFnRjtBQUNoRiwyREFlb0M7QUFFcEMsOENBSzJCO0FBQzNCLGdFQUE0RDtBQUM1RCxzREFBNEQ7QUFJNUQsb0JBQW9CO0FBQ3BCLHNDQUFzQztBQUN0Qyw4QkFBOEI7QUFDOUIseUJBQXlCO0FBQ3pCLDBCQUEwQjtBQUMxQixzQkFBc0I7QUFDdEIsZ0JBQWdCO0FBQ2hCLE1BQU07QUFDTiw4REFBOEQ7QUFFOUQsc0NBQXNDO0FBQ3RDLHVCQUF1QjtBQUN2QixnRUFBZ0U7QUFDaEUsMkZBQTJGO0FBQzNGLE1BQU07QUFFTix5QkFBeUI7QUFDekIsMkJBQTJCO0FBQzNCLFdBQVc7QUFDWCx5RkFBeUY7QUFDekYsZ0NBQWdDO0FBQ2hDLE9BQU87QUFDUCxJQUFJO0FBRUo7SUFDRSxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUM7UUFFdkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDO1FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDekMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFFN0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFD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QUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQ2xGLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQzVFLHFCQUFRLGlCQUNOLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBYyxJQUNqQixRQUFRLEVBQUUsZUFBZSxJQUN0QixnQkFBZ0IsRUFDbkI7Z0JBQ0YsaUJBQUksQ0FBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUFFLDBCQUFhLENBQUMsU0FBUyxDQUFDO1lBQzlCLHNCQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztTQUM3QixDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQztBQUNKLENBQUM7QUF6SEQsNEJBeUhDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgbm9ybWFsaXplLCByZWxhdGl2ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7XG4gIFdvcmtzcGFjZVByb2plY3QsXG4gIFdvcmtzcGFjZVNjaGVtYSxcbiAgYWRkUHJvamVjdFRvV29ya3NwYWNlLFxuICBnZXRXb3Jrc3BhY2UsXG59IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgdmFsaWRhdGVQcm9qZWN0TmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvdmFsaWRhdGlvbic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbi8vIFRPRE86IHVzZSBKc29uQVNUXG4vLyBmdW5jdGlvbiBhcHBlbmRQcm9wZXJ0eUluQXN0T2JqZWN0KFxuLy8gICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4vLyAgIG5vZGU6IEpzb25Bc3RPYmplY3QsXG4vLyAgIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuLy8gICB2YWx1ZTogSnNvblZhbHVlLFxuLy8gICBpbmRlbnQgPSA0LFxuLy8gKSB7XG4vLyAgIGNvbnN0IGluZGVudFN0ciA9ICdcXG4nICsgbmV3IEFycmF5KGluZGVudCArIDEpLmpvaW4oJyAnKTtcblxuLy8gICBpZiAobm9kZS5wcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcbi8vICAgICAvLyBJbnNlcnQgY29tbWEuXG4vLyAgICAgY29uc3QgbGFzdCA9IG5vZGUucHJvcGVydGllc1tub2RlLnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4vLyAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQobGFzdC5zdGFydC5vZmZzZXQgKyBsYXN0LnRleHQucmVwbGFjZSgvXFxzKyQvLCAnJykubGVuZ3RoLCAnLCcpO1xuLy8gICB9XG5cbi8vICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChcbi8vICAgICBub2RlLmVuZC5vZmZzZXQgLSAxLFxuLy8gICAgICcgICdcbi8vICAgICArIGBcIiR7cHJvcGVydHlOYW1lfVwiOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKS5yZXBsYWNlKC9cXG4vZywgaW5kZW50U3RyKX1gXG4vLyAgICAgKyBpbmRlbnRTdHIuc2xpY2UoMCwgLTIpLFxuLy8gICApO1xuLy8gfVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCkge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSAncGFja2FnZS5qc29uJztcblxuICAgIGlmICghaG9zdC5leGlzdHMoJ3BhY2thZ2UuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICBjb25zdCBzb3VyY2UgPSBob3N0LnJlYWQoJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmICghc291cmNlKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gc291cmNlLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHNvdXJjZVRleHQpO1xuXG4gICAgaWYgKCFqc29uWydkZXZEZXBlbmRlbmNpZXMnXSkge1xuICAgICAganNvblsnZGV2RGVwZW5kZW5jaWVzJ10gPSB7fTtcbiAgICB9XG5cbiAgICBqc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgICAgICdAYW5ndWxhci9jb21waWxlci1jbGknOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJzogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgJ3R5cGVzY3JpcHQnOiBsYXRlc3RWZXJzaW9ucy5UeXBlU2NyaXB0LFxuICAgICAgLy8gRGUtc3RydWN0dXJlIGxhc3Qga2VlcHMgZXhpc3RpbmcgdXNlciBkZXBlbmRlbmNpZXMuXG4gICAgICAuLi5qc29uLmRldkRlcGVuZGVuY2llcyxcbiAgICB9O1xuXG4gICAgaG9zdC5vdmVyd3JpdGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgLy8gVE9ETzogdXNlIEpzb25BU1RcbiAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgLy8gY29uc3Qgd29ya3NwYWNlQnVmZmVyID0gaG9zdC5yZWFkKHdvcmtzcGFjZVBhdGgpO1xuICAvLyBpZiAod29ya3NwYWNlQnVmZmVyID09PSBudWxsKSB7XG4gIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAvLyB9XG4gIC8vIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBwYXJzZUpzb24od29ya3NwYWNlQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbmFibGUgdG8gcGFyc2UgY29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KS5gKTtcbiAgLy8gfVxuICBsZXQgcHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWRcbiAgICA/IG9wdGlvbnMucHJvamVjdFJvb3RcbiAgICA6IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgaWYgKHByb2plY3RSb290ICE9PSAnJyAmJiAhcHJvamVjdFJvb3QuZW5kc1dpdGgoJy8nKSkge1xuICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgfVxuICBjb25zdCByb290RmlsZXNSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgPyBwcm9qZWN0Um9vdFxuICAgIDogcHJvamVjdFJvb3QgKyAnc3JjLyc7XG5cbiAgY29uc3Qgc2NoZW1hdGljczogSnNvbk9iamVjdCA9IHt9O1xuXG4gIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlXG4gICAgfHwgb3B0aW9ucy5pbmxpbmVTdHlsZSA9PT0gdHJ1ZVxuICAgIHx8IG9wdGlvbnMuc3R5bGUgIT09ICdjc3MnKSB7XG4gICAgc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSA9IHt9O1xuICAgIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID09PSB0cnVlKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnN0eWxlICYmIG9wdGlvbnMuc3R5bGUgIT09ICdjc3MnKSB7XG4gICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5zdHlsZWV4dCA9IG9wdGlvbnMuc3R5bGU7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdGlvbnMuc2tpcFRlc3RzID09PSB0cnVlKSB7XG4gICAgWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJywgJ21vZHVsZScsICdwaXBlJywgJ3NlcnZpY2UnXS5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICBzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSA9IHt9O1xuICAgICAgfVxuICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnNwZWMgPSBmYWxzZTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3Q6IFdvcmtzcGFjZVByb2plY3QgPSB7XG4gICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgc291cmNlUm9vdDogYCR7cHJvamVjdFJvb3R9L3NyY2AsXG4gICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICBzY2hlbWF0aWNzLFxuICAgIGFyY2hpdGVjdDoge1xuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOmJyb3dzZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtvcHRpb25zLm5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7cHJvamVjdFJvb3R9c3JjL2luZGV4Lmh0bWxgLFxuICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy9tYWluLnRzYCxcbiAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fXNyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXNyY2AsXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9c3JjL2Fzc2V0c2AsXG4gICAgICAgICAgICAgIG91dHB1dDogJy9hc3NldHMnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9c3JjL3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFt7XG4gICAgICAgICAgICAgIHJlcGxhY2U6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQudHNgLFxuICAgICAgICAgICAgICB3aXRoOiBgJHtwcm9qZWN0Um9vdH1zcmMvZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnByb2QudHNgLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZToge1xuICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6ZGV2LXNlcnZlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOmV4dHJhY3QtaTE4bicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiB7XG4gICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjprYXJtYScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH1zcmMvdGVzdC50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH1zcmMvcG9seWZpbGxzLnRzYCxcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgIGthcm1hQ29uZmlnOiBgJHtyb290RmlsZXNSb290fWthcm1hLmNvbmYuanNgLFxuICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9c3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgYXNzZXRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGdsb2I6ICdmYXZpY29uLmljbycsXG4gICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmMvYCxcbiAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBnbG9iOiAnKiovKicsXG4gICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmMvYXNzZXRzYCxcbiAgICAgICAgICAgICAgb3V0cHV0OiAnL2Fzc2V0cycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgbGludDoge1xuICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6dHNsaW50JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgLy8gY29uc3QgcHJvamVjdHM6IEpzb25PYmplY3QgPSAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyB8fCB7fTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAvLyAgICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzID0gcHJvamVjdHM7XG4gIC8vIH1cblxuICByZXR1cm4gYWRkUHJvamVjdFRvV29ya3NwYWNlKHdvcmtzcGFjZSwgb3B0aW9ucy5uYW1lLCBwcm9qZWN0KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIHZhbGlkYXRlUHJvamVjdE5hbWUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnYXBwJztcbiAgICBjb25zdCBhcHBSb290U2VsZWN0b3IgPSBgJHtwcmVmaXh9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgICAgc3BlYzogIW9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgc3R5bGVleHQ6IG9wdGlvbnMuc3R5bGUsXG4gICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGxldCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgbGV0IHNvdXJjZVJvb3QgPSBgJHthcHBEaXJ9L3NyY2A7XG4gICAgbGV0IHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgbGV0IHJlbGF0aXZlVHNDb25maWdQYXRoID0gYXBwRGlyLnNwbGl0KCcvJykubWFwKHggPT4gJy4uJykuam9pbignLycpO1xuICAgIGxldCByZWxhdGl2ZVRzTGludFBhdGggPSBhcHBEaXIuc3BsaXQoJy8nKS5tYXAoeCA9PiAnLi4nKS5qb2luKCcvJyk7XG4gICAgY29uc3Qgcm9vdEluU3JjID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkO1xuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1Byb2plY3RSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdDtcbiAgICAgIGFwcERpciA9IGAke25ld1Byb2plY3RSb290fS9zcmNgO1xuICAgICAgc291cmNlUm9vdCA9IGFwcERpcjtcbiAgICAgIHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlVHNDb25maWdQYXRoID09PSAnJykge1xuICAgICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCA9ICcuJztcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlVHNMaW50UGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlVHNMaW50UGF0aCA9PT0gJycpIHtcbiAgICAgICAgcmVsYXRpdmVUc0xpbnRQYXRoID0gJy4nO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0c0xpbnRSb290ID0gYXBwRGlyO1xuXG4gICAgY29uc3QgZTJlT3B0aW9uczogRTJlT3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IGAke29wdGlvbnMubmFtZX0tZTJlYCxcbiAgICAgIHJlbGF0ZWRBcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICByb290U2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICB9O1xuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGUyZU9wdGlvbnMucHJvamVjdFJvb3QgPSAnZTJlJztcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIHJlbGF0aXZlVHNDb25maWdQYXRoLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlUm9vdCksXG4gICAgICAgIF0pKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCxcbiAgICAgICAgICAgIHJvb3RJblNyYyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL2xpbnQnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHRzTGludFJvb3QsXG4gICAgICAgICAgICByZWxhdGl2ZVRzTGludFBhdGgsXG4gICAgICAgICAgICBwcmVmaXgsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgLy8gVE9ETzogTW92aW5nIHNob3VsZCB3b3JrIGJ1dCBpcyBidWdnZWQgcmlnaHQgbm93LlxuICAgICAgICAgIC8vIFRoZSBfX3RzTGludFJvb3RfXyBpcyBiZWluZyB1c2VkIG1lYW53aGlsZS5cbiAgICAgICAgICAvLyBPdGhlcndpc2UgdGhlIHRzbGludC5qc29uIGZpbGUgY291bGQgYmUgaW5zaWRlIG9mIHRoZSByb290IGZvbGRlciBhbmRcbiAgICAgICAgICAvLyB0aGlzIGJsb2NrIGFuZCB0aGUgbGludCBmb2xkZXIgY291bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgXSkpLFxuICAgICAgc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNwZWM6IGZhbHNlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sJykpIDogbm9vcCgpLFxuICAgICAgICAgICFjb21wb25lbnRPcHRpb25zLnNwZWMgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMnKSkgOiBub29wKCksXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zIGFzIGFueSwgIC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZURpciksXG4gICAgICAgIF0pLCBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSksXG4gICAgICBzY2hlbWF0aWMoJ2UyZScsIGUyZU9wdGlvbnMpLFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19