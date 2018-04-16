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
    return (host, context) => {
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
        // tslint:disable-next-line:no-any
        const project = {
            root: projectRoot,
            projectType: 'application',
            prefix: options.prefix || 'app',
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
                            {
                                input: `${projectRoot}styles.${options.style}`,
                            },
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
        workspace.projects[options.name] = project;
        const schematics = {};
        if (options.inlineTemplate === true
            || options.inlineStyle === true
            || options.style !== undefined) {
            schematics['@schematics/angular:component'] = {};
            if (options.inlineTemplate === true) {
                schematics['@schematics/angular:component'].inlineTemplate = true;
            }
            if (options.inlineStyle === true) {
                schematics['@schematics/angular:component'].inlineStyle = true;
            }
            if (options.style !== undefined) {
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
        workspace.schematics = schematics;
        host.overwrite(config_1.getWorkspacePath(host), JSON.stringify(workspace, null, 2));
    };
}
const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];
function getRegExpFailPosition(str) {
    const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
    const matched = [];
    parts.forEach(part => {
        if (part.match(projectNameRegexp)) {
            matched.push(part);
        }
    });
    const compare = matched.join('-');
    return (str !== compare) ? compare.length : null;
}
function validateProjectName(projectName) {
    const errorIndex = getRegExpFailPosition(projectName);
    if (errorIndex !== null) {
        const firstMessage = core_1.tags.oneLine `
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters or dashes.
      When adding a dash the segment after the dash must also start with a letter.
    `;
        const msg = core_1.tags.stripIndent `
      ${firstMessage}
      ${projectName}
      ${Array(errorIndex + 1).join(' ') + '^'}
    `;
        throw new schematics_1.SchematicsException(msg);
    }
    else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
        throw new schematics_1.SchematicsException(`Project name "${projectName}" is not a supported name.`);
    }
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        validateProjectName(options.name);
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
            }),
            schematics_1.schematic('component', Object.assign({ name: 'app', selector: appRootSelector, flat: true, path: sourceDir, skipImport: true }, componentOptions)),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFzRjtBQUV0RiwyREFlb0M7QUFFcEMsOENBQW1FO0FBQ25FLGdFQUE0RDtBQUs1RCxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLDhCQUE4QjtBQUM5Qix5QkFBeUI7QUFDekIsMEJBQTBCO0FBQzFCLHNCQUFzQjtBQUN0QixnQkFBZ0I7QUFDaEIsTUFBTTtBQUNOLDhEQUE4RDtBQUU5RCxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLGdFQUFnRTtBQUNoRSwyRkFBMkY7QUFDM0YsTUFBTTtBQUVOLHlCQUF5QjtBQUN6QiwyQkFBMkI7QUFDM0IsV0FBVztBQUNYLHlGQUF5RjtBQUN6RixnQ0FBZ0M7QUFDaEMsT0FBTztBQUNQLElBQUk7QUFFSjtJQUNFLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQztRQUU3QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFcEMsRUFBRSxD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bnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgbm9ybWFsaXplLCByZWxhdGl2ZSwgc3RyaW5ncywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4cGVyaW1lbnRhbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxudHlwZSBXb3Jrc3BhY2VTY2hlbWEgPSBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYTtcblxuLy8gVE9ETzogdXNlIEpzb25BU1Rcbi8vIGZ1bmN0aW9uIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QoXG4vLyAgIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbi8vICAgbm9kZTogSnNvbkFzdE9iamVjdCxcbi8vICAgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4vLyAgIHZhbHVlOiBKc29uVmFsdWUsXG4vLyAgIGluZGVudCA9IDQsXG4vLyApIHtcbi8vICAgY29uc3QgaW5kZW50U3RyID0gJ1xcbicgKyBuZXcgQXJyYXkoaW5kZW50ICsgMSkuam9pbignICcpO1xuXG4vLyAgIGlmIChub2RlLnByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuLy8gICAgIC8vIEluc2VydCBjb21tYS5cbi8vICAgICBjb25zdCBsYXN0ID0gbm9kZS5wcm9wZXJ0aWVzW25vZGUucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbi8vICAgICByZWNvcmRlci5pbnNlcnRSaWdodChsYXN0LnN0YXJ0Lm9mZnNldCArIGxhc3QudGV4dC5yZXBsYWNlKC9cXHMrJC8sICcnKS5sZW5ndGgsICcsJyk7XG4vLyAgIH1cblxuLy8gICByZWNvcmRlci5pbnNlcnRMZWZ0KFxuLy8gICAgIG5vZGUuZW5kLm9mZnNldCAtIDEsXG4vLyAgICAgJyAgJ1xuLy8gICAgICsgYFwiJHtwcm9wZXJ0eU5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLnJlcGxhY2UoL1xcbi9nLCBpbmRlbnRTdHIpfWBcbi8vICAgICArIGluZGVudFN0ci5zbGljZSgwLCAtMiksXG4vLyAgICk7XG4vLyB9XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9ICdwYWNrYWdlLmpzb24nO1xuXG4gICAgaWYgKCFob3N0LmV4aXN0cygncGFja2FnZS5qc29uJykpIHsgcmV0dXJuIGhvc3Q7IH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IGhvc3QucmVhZCgncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKCFzb3VyY2UpIHsgcmV0dXJuIGhvc3Q7IH1cblxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBzb3VyY2UudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QganNvbiA9IEpTT04ucGFyc2Uoc291cmNlVGV4dCk7XG5cbiAgICBpZiAoIWpzb25bJ2RldkRlcGVuZGVuY2llcyddKSB7XG4gICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgIH1cblxuICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzID0ge1xuICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICAndHlwZXNjcmlwdCc6IGxhdGVzdFZlcnNpb25zLlR5cGVTY3JpcHQsXG4gICAgICAvLyBEZS1zdHJ1Y3R1cmUgbGFzdCBrZWVwcyBleGlzdGluZyB1c2VyIGRlcGVuZGVuY2llcy5cbiAgICAgIC4uLmpzb24uZGV2RGVwZW5kZW5jaWVzLFxuICAgIH07XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwYWNrYWdlSnNvblBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLCB3b3Jrc3BhY2U6IFdvcmtzcGFjZVNjaGVtYSk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAvLyBUT0RPOiB1c2UgSnNvbkFTVFxuICAgIC8vIGNvbnN0IHdvcmtzcGFjZVBhdGggPSAnL2FuZ3VsYXIuanNvbic7XG4gICAgLy8gY29uc3Qgd29ya3NwYWNlQnVmZmVyID0gaG9zdC5yZWFkKHdvcmtzcGFjZVBhdGgpO1xuICAgIC8vIGlmICh3b3Jrc3BhY2VCdWZmZXIgPT09IG51bGwpIHtcbiAgICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb25maWd1cmF0aW9uIGZpbGUgKCR7d29ya3NwYWNlUGF0aH0pIG5vdCBmb3VuZC5gKTtcbiAgICAvLyB9XG4gICAgLy8gY29uc3Qgd29ya3NwYWNlSnNvbiA9IHBhcnNlSnNvbih3b3Jrc3BhY2VCdWZmZXIudG9TdHJpbmcoKSk7XG4gICAgLy8gaWYgKHdvcmtzcGFjZUpzb24udmFsdWUgPT09IG51bGwpIHtcbiAgICAvLyAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbmFibGUgdG8gcGFyc2UgY29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KS5gKTtcbiAgICAvLyB9XG4gICAgbGV0IHByb2plY3RSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IG9wdGlvbnMucHJvamVjdFJvb3RcbiAgICAgIDogYCR7d29ya3NwYWNlLm5ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIGlmIChwcm9qZWN0Um9vdCAhPT0gJycgJiYgIXByb2plY3RSb290LmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgICB9XG4gICAgY29uc3Qgcm9vdEZpbGVzUm9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3QgPT09IHVuZGVmaW5lZFxuICAgICAgPyBwcm9qZWN0Um9vdFxuICAgICAgOiBwcm9qZWN0Um9vdCArICdzcmMvJztcblxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBjb25zdCBwcm9qZWN0OiBhbnkgPSB7XG4gICAgICByb290OiBwcm9qZWN0Um9vdCxcbiAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICAgIGFyY2hpdGVjdDoge1xuICAgICAgICBidWlsZDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpicm93c2VyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICAgICAgaW5kZXg6IGAke3Byb2plY3RSb290fXNyYy9pbmRleC5odG1sYCxcbiAgICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy9tYWluLnRzYCxcbiAgICAgICAgICAgIHBvbHlmaWxsczogYCR7cHJvamVjdFJvb3R9c3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5hcHAuanNvbmAsXG4gICAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICdmYXZpY29uLmljbycsXG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXNyY2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnbG9iOiAnKiovKicsXG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXNyYy9hc3NldHNgLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy9hc3NldHMnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgIGAke3Byb2plY3RSb290fXNyYy9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBbe1xuICAgICAgICAgICAgICAgIHJlcGxhY2U6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQudHNgLFxuICAgICAgICAgICAgICAgIHdpdGg6IGAke3Byb2plY3RSb290fXNyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQucHJvZC50c2AsXG4gICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBzZXJ2ZToge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpkZXYtc2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgICdleHRyYWN0LWkxOG4nOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOmV4dHJhY3QtaTE4bicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjprYXJtYScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9c3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH1zcmMvcG9seWZpbGxzLnRzYCxcbiAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH1rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXN0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9c3JjL2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnbG9iOiAnKiovKicsXG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXNyYy9hc3NldHNgLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy9hc3NldHMnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBsaW50OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnRzbGludCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdHNDb25maWc6IFtcbiAgICAgICAgICAgICAgYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5hcHAuanNvbmAsXG4gICAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGNsdWRlOiBbXG4gICAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBjb25zdCBwcm9qZWN0czogSnNvbk9iamVjdCA9ICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzIHx8IHt9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gICAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gICAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyA9IHByb2plY3RzO1xuICAgIC8vIH1cblxuICAgIHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLm5hbWVdID0gcHJvamVjdDtcblxuICAgIGNvbnN0IHNjaGVtYXRpY3M6IEpzb25PYmplY3QgPSB7fTtcblxuICAgIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID09PSB0cnVlXG4gICAgICAgIHx8IG9wdGlvbnMuaW5saW5lU3R5bGUgPT09IHRydWVcbiAgICAgICAgfHwgb3B0aW9ucy5zdHlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddID0ge307XG4gICAgICBpZiAob3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5pbmxpbmVTdHlsZSA9PT0gdHJ1ZSkge1xuICAgICAgICAoc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSBhcyBKc29uT2JqZWN0KS5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5zdHlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIChzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddIGFzIEpzb25PYmplY3QpLnN0eWxlZXh0ID0gb3B0aW9ucy5zdHlsZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5za2lwVGVzdHMgPT09IHRydWUpIHtcbiAgICAgIFsnY2xhc3MnLCAnY29tcG9uZW50JywgJ2RpcmVjdGl2ZScsICdndWFyZCcsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ10uZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICAgIHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID0ge307XG4gICAgICAgIH1cbiAgICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnNwZWMgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHdvcmtzcGFjZS5zY2hlbWF0aWNzID0gc2NoZW1hdGljcztcblxuICAgIGhvc3Qub3ZlcndyaXRlKGdldFdvcmtzcGFjZVBhdGgoaG9zdCksIEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZSwgbnVsbCwgMikpO1xuICB9O1xufVxuY29uc3QgcHJvamVjdE5hbWVSZWdleHAgPSAvXlthLXpBLVpdWy4wLTlhLXpBLVpdKigtWy4wLTlhLXpBLVpdKikqJC87XG5jb25zdCB1bnN1cHBvcnRlZFByb2plY3ROYW1lcyA9IFsndGVzdCcsICdlbWJlcicsICdlbWJlci1jbGknLCAndmVuZG9yJywgJ2FwcCddO1xuXG5mdW5jdGlvbiBnZXRSZWdFeHBGYWlsUG9zaXRpb24oc3RyOiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGFydHMgPSBzdHIuaW5kZXhPZignLScpID49IDAgPyBzdHIuc3BsaXQoJy0nKSA6IFtzdHJdO1xuICBjb25zdCBtYXRjaGVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gIHBhcnRzLmZvckVhY2gocGFydCA9PiB7XG4gICAgaWYgKHBhcnQubWF0Y2gocHJvamVjdE5hbWVSZWdleHApKSB7XG4gICAgICBtYXRjaGVkLnB1c2gocGFydCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBjb21wYXJlID0gbWF0Y2hlZC5qb2luKCctJyk7XG5cbiAgcmV0dXJuIChzdHIgIT09IGNvbXBhcmUpID8gY29tcGFyZS5sZW5ndGggOiBudWxsO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZVByb2plY3ROYW1lKHByb2plY3ROYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgZXJyb3JJbmRleCA9IGdldFJlZ0V4cEZhaWxQb3NpdGlvbihwcm9qZWN0TmFtZSk7XG4gIGlmIChlcnJvckluZGV4ICE9PSBudWxsKSB7XG4gICAgY29uc3QgZmlyc3RNZXNzYWdlID0gdGFncy5vbmVMaW5lYFxuICAgICAgUHJvamVjdCBuYW1lIFwiJHtwcm9qZWN0TmFtZX1cIiBpcyBub3QgdmFsaWQuIE5ldyBwcm9qZWN0IG5hbWVzIG11c3RcbiAgICAgIHN0YXJ0IHdpdGggYSBsZXR0ZXIsIGFuZCBtdXN0IGNvbnRhaW4gb25seSBhbHBoYW51bWVyaWMgY2hhcmFjdGVycyBvciBkYXNoZXMuXG4gICAgICBXaGVuIGFkZGluZyBhIGRhc2ggdGhlIHNlZ21lbnQgYWZ0ZXIgdGhlIGRhc2ggbXVzdCBhbHNvIHN0YXJ0IHdpdGggYSBsZXR0ZXIuXG4gICAgYDtcbiAgICBjb25zdCBtc2cgPSB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgJHtmaXJzdE1lc3NhZ2V9XG4gICAgICAke3Byb2plY3ROYW1lfVxuICAgICAgJHtBcnJheShlcnJvckluZGV4ICsgMSkuam9pbignICcpICsgJ14nfVxuICAgIGA7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24obXNnKTtcbiAgfSBlbHNlIGlmICh1bnN1cHBvcnRlZFByb2plY3ROYW1lcy5pbmRleE9mKHByb2plY3ROYW1lKSAhPT0gLTEpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBuYW1lIFwiJHtwcm9qZWN0TmFtZX1cIiBpcyBub3QgYSBzdXBwb3J0ZWQgbmFtZS5gKTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICAgIH1cbiAgICB2YWxpZGF0ZVByb2plY3ROYW1lKG9wdGlvbnMubmFtZSk7XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCc7XG4gICAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7cHJlZml4fS1yb290YDtcbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zID0ge1xuICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgIHNwZWM6ICFvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgIHN0eWxlZXh0OiBvcHRpb25zLnN0eWxlLFxuICAgICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgfTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBsZXQgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG4gICAgbGV0IGFwcERpciA9IGAke25ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIGxldCBzb3VyY2VSb290ID0gYCR7YXBwRGlyfS9zcmNgO1xuICAgIGxldCBzb3VyY2VEaXIgPSBgJHtzb3VyY2VSb290fS9hcHBgO1xuICAgIGxldCByZWxhdGl2ZVRzQ29uZmlnUGF0aCA9IGFwcERpci5zcGxpdCgnLycpLm1hcCh4ID0+ICcuLicpLmpvaW4oJy8nKTtcbiAgICBsZXQgcmVsYXRpdmVUc0xpbnRQYXRoID0gYXBwRGlyLnNwbGl0KCcvJykubWFwKHggPT4gJy4uJykuam9pbignLycpO1xuICAgIGNvbnN0IHJvb3RJblNyYyA9IG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZDtcbiAgICBpZiAob3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdQcm9qZWN0Um9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3Q7XG4gICAgICBhcHBEaXIgPSBgJHtuZXdQcm9qZWN0Um9vdH0vc3JjYDtcbiAgICAgIHNvdXJjZVJvb3QgPSBhcHBEaXI7XG4gICAgICBzb3VyY2VEaXIgPSBgJHtzb3VyY2VSb290fS9hcHBgO1xuICAgICAgcmVsYXRpdmVUc0NvbmZpZ1BhdGggPSByZWxhdGl2ZShub3JtYWxpemUoJy8nICsgc291cmNlUm9vdCksIG5vcm1hbGl6ZSgnLycpKTtcbiAgICAgIGlmIChyZWxhdGl2ZVRzQ29uZmlnUGF0aCA9PT0gJycpIHtcbiAgICAgICAgcmVsYXRpdmVUc0NvbmZpZ1BhdGggPSAnLic7XG4gICAgICB9XG4gICAgICByZWxhdGl2ZVRzTGludFBhdGggPSByZWxhdGl2ZShub3JtYWxpemUoJy8nICsgc291cmNlUm9vdCksIG5vcm1hbGl6ZSgnLycpKTtcbiAgICAgIGlmIChyZWxhdGl2ZVRzTGludFBhdGggPT09ICcnKSB7XG4gICAgICAgIHJlbGF0aXZlVHNMaW50UGF0aCA9ICcuJztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgdHNMaW50Um9vdCA9IGFwcERpcjtcblxuICAgIGNvbnN0IGUyZU9wdGlvbnM6IEUyZU9wdGlvbnMgPSB7XG4gICAgICBuYW1lOiBgJHtvcHRpb25zLm5hbWV9LWUyZWAsXG4gICAgICByZWxhdGVkQXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgcm9vdFNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgfTtcbiAgICBpZiAob3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBlMmVPcHRpb25zLnByb2plY3RSb290ID0gJ2UyZSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UpLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9zcmMnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZVJvb3QpLFxuICAgICAgICBdKSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9yb290JyksIFtcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAnZG90JzogJy4nLFxuICAgICAgICAgICAgcmVsYXRpdmVUc0NvbmZpZ1BhdGgsXG4gICAgICAgICAgICByb290SW5TcmMsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9saW50JyksIFtcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICB0c0xpbnRSb290LFxuICAgICAgICAgICAgcmVsYXRpdmVUc0xpbnRQYXRoLFxuICAgICAgICAgICAgcHJlZml4LFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIC8vIFRPRE86IE1vdmluZyBzaG91bGQgd29yayBidXQgaXMgYnVnZ2VkIHJpZ2h0IG5vdy5cbiAgICAgICAgICAvLyBUaGUgX190c0xpbnRSb290X18gaXMgYmVpbmcgdXNlZCBtZWFud2hpbGUuXG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIHRoZSB0c2xpbnQuanNvbiBmaWxlIGNvdWxkIGJlIGluc2lkZSBvZiB0aGUgcm9vdCBmb2xkZXIgYW5kXG4gICAgICAgICAgLy8gdGhpcyBibG9jayBhbmQgdGhlIGxpbnQgZm9sZGVyIGNvdWxkIGJlIHJlbW92ZWQuXG4gICAgICAgIF0pKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBzcGVjOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sJykpIDogbm9vcCgpLFxuICAgICAgICAgICFjb21wb25lbnRPcHRpb25zLnNwZWMgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMnKSkgOiBub29wKCksXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zIGFzIGFueSwgIC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZURpciksXG4gICAgICAgIF0pLCBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSksXG4gICAgICBzY2hlbWF0aWMoJ2UyZScsIGUyZU9wdGlvbnMpLFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19