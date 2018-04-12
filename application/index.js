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
                            {
                                input: `${projectRoot}src/styles.${options.style}`,
                            },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUEwRTtBQUUxRSwyREFlb0M7QUFFcEMsOENBQW1FO0FBQ25FLGdFQUE0RDtBQUs1RCxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLDhCQUE4QjtBQUM5Qix5QkFBeUI7QUFDekIsMEJBQTBCO0FBQzFCLHNCQUFzQjtBQUN0QixnQkFBZ0I7QUFDaEIsTUFBTTtBQUNOLDhEQUE4RDtBQUU5RCxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLGdFQUFnRTtBQUNoRSwyRkFBMkY7QUFDM0YsTUFBTTtBQUVOLHlCQUF5QjtBQUN6QiwyQkFBMkI7QUFDM0IsV0FBVztBQUNYLHlGQUF5RjtBQUN6RixnQ0FBZ0M7QUFDaEMsT0FBTztBQUNQLElBQUk7QUFFSjtJQUNFLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQztRQUU3QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFcEMsRUFBRSxD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QyxXQUFXLGtCQUNuQixJQUFJLEVBQUUsS0FBSyxFQUNYLFFBQVEsRUFBRSxlQUFlLEVBQ3pCLElBQUksRUFBRSxJQUFJLEVBQ1YsSUFBSSxFQUFFLFNBQVMsRUFDZixVQUFVLEVBQUUsSUFBSSxJQUNiLGdCQUFnQixFQUNuQjtZQUNGLHNCQUFTLENBQ1Asa0JBQUssQ0FBQyxnQkFBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUMxQixnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDbEYsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDNUUscUJBQVEsaUJBQ04sS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFjLElBQ2pCLFFBQVEsRUFBRSxlQUFlLElBQ3RCLGdCQUFnQixFQUNuQjtnQkFDRixpQkFBSSxDQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQUUsMEJBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUIsc0JBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1NBQzdCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZIRCw0QkF1SEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBub3JtYWxpemUsIHJlbGF0aXZlLCBzdHJpbmdzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB0ZW1wbGF0ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4uL2UyZS9zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG50eXBlIFdvcmtzcGFjZVNjaGVtYSA9IGV4cGVyaW1lbnRhbC53b3Jrc3BhY2UuV29ya3NwYWNlU2NoZW1hO1xuXG4vLyBUT0RPOiB1c2UgSnNvbkFTVFxuLy8gZnVuY3Rpb24gYXBwZW5kUHJvcGVydHlJbkFzdE9iamVjdChcbi8vICAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuLy8gICBub2RlOiBKc29uQXN0T2JqZWN0LFxuLy8gICBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbi8vICAgdmFsdWU6IEpzb25WYWx1ZSxcbi8vICAgaW5kZW50ID0gNCxcbi8vICkge1xuLy8gICBjb25zdCBpbmRlbnRTdHIgPSAnXFxuJyArIG5ldyBBcnJheShpbmRlbnQgKyAxKS5qb2luKCcgJyk7XG5cbi8vICAgaWYgKG5vZGUucHJvcGVydGllcy5sZW5ndGggPiAwKSB7XG4vLyAgICAgLy8gSW5zZXJ0IGNvbW1hLlxuLy8gICAgIGNvbnN0IGxhc3QgPSBub2RlLnByb3BlcnRpZXNbbm9kZS5wcm9wZXJ0aWVzLmxlbmd0aCAtIDFdO1xuLy8gICAgIHJlY29yZGVyLmluc2VydFJpZ2h0KGxhc3Quc3RhcnQub2Zmc2V0ICsgbGFzdC50ZXh0LnJlcGxhY2UoL1xccyskLywgJycpLmxlbmd0aCwgJywnKTtcbi8vICAgfVxuXG4vLyAgIHJlY29yZGVyLmluc2VydExlZnQoXG4vLyAgICAgbm9kZS5lbmQub2Zmc2V0IC0gMSxcbi8vICAgICAnICAnXG4vLyAgICAgKyBgXCIke3Byb3BlcnR5TmFtZX1cIjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikucmVwbGFjZSgvXFxuL2csIGluZGVudFN0cil9YFxuLy8gICAgICsgaW5kZW50U3RyLnNsaWNlKDAsIC0yKSxcbi8vICAgKTtcbi8vIH1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbigpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gJ3BhY2thZ2UuanNvbic7XG5cbiAgICBpZiAoIWhvc3QuZXhpc3RzKCdwYWNrYWdlLmpzb24nKSkgeyByZXR1cm4gaG9zdDsgfVxuXG4gICAgY29uc3Qgc291cmNlID0gaG9zdC5yZWFkKCdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoIXNvdXJjZSkgeyByZXR1cm4gaG9zdDsgfVxuXG4gICAgY29uc3Qgc291cmNlVGV4dCA9IHNvdXJjZS50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShzb3VyY2VUZXh0KTtcblxuICAgIGlmICghanNvblsnZGV2RGVwZW5kZW5jaWVzJ10pIHtcbiAgICAgIGpzb25bJ2RldkRlcGVuZGVuY2llcyddID0ge307XG4gICAgfVxuXG4gICAganNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7XG4gICAgICAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic6IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcixcbiAgICAgICd0eXBlc2NyaXB0JzogbGF0ZXN0VmVyc2lvbnMuVHlwZVNjcmlwdCxcbiAgICAgIC8vIERlLXN0cnVjdHVyZSBsYXN0IGtlZXBzIGV4aXN0aW5nIHVzZXIgZGVwZW5kZW5jaWVzLlxuICAgICAgLi4uanNvbi5kZXZEZXBlbmRlbmNpZXMsXG4gICAgfTtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIC8vIFRPRE86IHVzZSBKc29uQVNUXG4gICAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VCdWZmZXIgPSBob3N0LnJlYWQod29ya3NwYWNlUGF0aCk7XG4gICAgLy8gaWYgKHdvcmtzcGFjZUJ1ZmZlciA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VKc29uID0gcGFyc2VKc29uKHdvcmtzcGFjZUJ1ZmZlci50b1N0cmluZygpKTtcbiAgICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFVuYWJsZSB0byBwYXJzZSBjb25maWd1cmF0aW9uIGZpbGUgKCR7d29ya3NwYWNlUGF0aH0pLmApO1xuICAgIC8vIH1cbiAgICBsZXQgcHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWRcbiAgICAgID8gb3B0aW9ucy5wcm9qZWN0Um9vdFxuICAgICAgOiBgJHt3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgaWYgKHByb2plY3RSb290ICE9PSAnJyAmJiAhcHJvamVjdFJvb3QuZW5kc1dpdGgoJy8nKSkge1xuICAgICAgcHJvamVjdFJvb3QgKz0gJy8nO1xuICAgIH1cbiAgICBjb25zdCByb290RmlsZXNSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgICA/IHByb2plY3RSb290XG4gICAgICA6IHByb2plY3RSb290ICsgJ3NyYy8nO1xuXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIGNvbnN0IHByb2plY3Q6IGFueSA9IHtcbiAgICAgIHJvb3Q6IHByb2plY3RSb290LFxuICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICBhcmNoaXRlY3Q6IHtcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6YnJvd3NlcicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtvcHRpb25zLm5hbWV9YCxcbiAgICAgICAgICAgIGluZGV4OiBgJHtwcm9qZWN0Um9vdH1zcmMvaW5kZXguaHRtbGAsXG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH1zcmMvbWFpbi50c2AsXG4gICAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fXNyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgICAgdHNDb25maWc6IGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgYXNzZXRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnbG9iOiAnZmF2aWNvbi5pY28nLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmNgLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmMvYXNzZXRzYCxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6ICcvYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmMvc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW3tcbiAgICAgICAgICAgICAgICByZXBsYWNlOiBgJHtwcm9qZWN0Um9vdH1zcmMvZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnRzYCxcbiAgICAgICAgICAgICAgICB3aXRoOiBgJHtwcm9qZWN0Um9vdH1zcmMvZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnByb2QudHNgLFxuICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgb3B0aW1pemF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAgICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAgICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgc2VydmU6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6ZGV2LXNlcnZlcicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpleHRyYWN0LWkxOG4nLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRlc3Q6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6a2FybWEnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fXNyYy90ZXN0LnRzYCxcbiAgICAgICAgICAgIHBvbHlmaWxsczogYCR7cHJvamVjdFJvb3R9c3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cm9vdEZpbGVzUm9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Jvb3RGaWxlc1Jvb3R9a2FybWEuY29uZi5qc2AsXG4gICAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICdmYXZpY29uLmljbycsXG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fXNyYy9gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1zcmMvYXNzZXRzYCxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6ICcvYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgbGludDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjp0c2xpbnQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICAgIGAke3Jvb3RGaWxlc1Jvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgICBgJHtyb290RmlsZXNSb290fXRzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gY29uc3QgcHJvamVjdHM6IEpzb25PYmplY3QgPSAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyB8fCB7fTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gaWYgKCEoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cykge1xuICAgIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIC8vICAgKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMgPSBwcm9qZWN0cztcbiAgICAvLyB9XG5cbiAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5uYW1lXSA9IHByb2plY3Q7XG4gICAgaG9zdC5vdmVyd3JpdGUoZ2V0V29ya3NwYWNlUGF0aChob3N0KSwgSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlLCBudWxsLCAyKSk7XG4gIH07XG59XG5jb25zdCBwcm9qZWN0TmFtZVJlZ2V4cCA9IC9eW2EtekEtWl1bLjAtOWEtekEtWl0qKC1bLjAtOWEtekEtWl0qKSokLztcbmNvbnN0IHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzID0gWyd0ZXN0JywgJ2VtYmVyJywgJ2VtYmVyLWNsaScsICd2ZW5kb3InLCAnYXBwJ107XG5cbmZ1bmN0aW9uIGdldFJlZ0V4cEZhaWxQb3NpdGlvbihzdHI6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJ0cyA9IHN0ci5pbmRleE9mKCctJykgPj0gMCA/IHN0ci5zcGxpdCgnLScpIDogW3N0cl07XG4gIGNvbnN0IG1hdGNoZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgcGFydHMuZm9yRWFjaChwYXJ0ID0+IHtcbiAgICBpZiAocGFydC5tYXRjaChwcm9qZWN0TmFtZVJlZ2V4cCkpIHtcbiAgICAgIG1hdGNoZWQucHVzaChwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGNvbXBhcmUgPSBtYXRjaGVkLmpvaW4oJy0nKTtcblxuICByZXR1cm4gKHN0ciAhPT0gY29tcGFyZSkgPyBjb21wYXJlLmxlbmd0aCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUHJvamVjdE5hbWUocHJvamVjdE5hbWU6IHN0cmluZykge1xuICBjb25zdCBlcnJvckluZGV4ID0gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHByb2plY3ROYW1lKTtcbiAgaWYgKGVycm9ySW5kZXggIT09IG51bGwpIHtcbiAgICBjb25zdCBmaXJzdE1lc3NhZ2UgPSB0YWdzLm9uZUxpbmVgXG4gICAgICBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCB2YWxpZC4gTmV3IHByb2plY3QgbmFtZXMgbXVzdFxuICAgICAgc3RhcnQgd2l0aCBhIGxldHRlciwgYW5kIG11c3QgY29udGFpbiBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIG9yIGRhc2hlcy5cbiAgICAgIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbiAgICBgO1xuICAgIGNvbnN0IG1zZyA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAke2ZpcnN0TWVzc2FnZX1cbiAgICAgICR7cHJvamVjdE5hbWV9XG4gICAgICAke0FycmF5KGVycm9ySW5kZXggKyAxKS5qb2luKCcgJykgKyAnXid9XG4gICAgYDtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihtc2cpO1xuICB9IGVsc2UgaWYgKHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzLmluZGV4T2YocHJvamVjdE5hbWUpICE9PSAtMSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCBhIHN1cHBvcnRlZCBuYW1lLmApO1xuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIHZhbGlkYXRlUHJvamVjdE5hbWUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnYXBwJztcbiAgICBjb25zdCBhcHBSb290U2VsZWN0b3IgPSBgJHtwcmVmaXh9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgICAgc3BlYzogIW9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgc3R5bGVleHQ6IG9wdGlvbnMuc3R5bGUsXG4gICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGxldCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgbGV0IHNvdXJjZVJvb3QgPSBgJHthcHBEaXJ9L3NyY2A7XG4gICAgbGV0IHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgbGV0IHJlbGF0aXZlVHNDb25maWdQYXRoID0gYXBwRGlyLnNwbGl0KCcvJykubWFwKHggPT4gJy4uJykuam9pbignLycpO1xuICAgIGxldCByZWxhdGl2ZVRzTGludFBhdGggPSBhcHBEaXIuc3BsaXQoJy8nKS5tYXAoeCA9PiAnLi4nKS5qb2luKCcvJyk7XG4gICAgY29uc3Qgcm9vdEluU3JjID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkO1xuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1Byb2plY3RSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdDtcbiAgICAgIGFwcERpciA9IGAke25ld1Byb2plY3RSb290fS9zcmNgO1xuICAgICAgc291cmNlUm9vdCA9IGFwcERpcjtcbiAgICAgIHNvdXJjZURpciA9IGAke3NvdXJjZVJvb3R9L2FwcGA7XG4gICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlVHNDb25maWdQYXRoID09PSAnJykge1xuICAgICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCA9ICcuJztcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlVHNMaW50UGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZSgnLycgKyBzb3VyY2VSb290KSwgbm9ybWFsaXplKCcvJykpO1xuICAgICAgaWYgKHJlbGF0aXZlVHNMaW50UGF0aCA9PT0gJycpIHtcbiAgICAgICAgcmVsYXRpdmVUc0xpbnRQYXRoID0gJy4nO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0c0xpbnRSb290ID0gYXBwRGlyO1xuXG4gICAgY29uc3QgZTJlT3B0aW9uczogRTJlT3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IGAke29wdGlvbnMubmFtZX0tZTJlYCxcbiAgICAgIHJlbGF0ZWRBcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICByb290U2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICB9O1xuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGUyZU9wdGlvbnMucHJvamVjdFJvb3QgPSAnZTJlJztcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIHJlbGF0aXZlVHNDb25maWdQYXRoLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlUm9vdCksXG4gICAgICAgIF0pKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICByZWxhdGl2ZVRzQ29uZmlnUGF0aCxcbiAgICAgICAgICAgIHJvb3RJblNyYyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL2xpbnQnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHRzTGludFJvb3QsXG4gICAgICAgICAgICByZWxhdGl2ZVRzTGludFBhdGgsXG4gICAgICAgICAgICBwcmVmaXgsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgLy8gVE9ETzogTW92aW5nIHNob3VsZCB3b3JrIGJ1dCBpcyBidWdnZWQgcmlnaHQgbm93LlxuICAgICAgICAgIC8vIFRoZSBfX3RzTGludFJvb3RfXyBpcyBiZWluZyB1c2VkIG1lYW53aGlsZS5cbiAgICAgICAgICAvLyBPdGhlcndpc2UgdGhlIHRzbGludC5qc29uIGZpbGUgY291bGQgYmUgaW5zaWRlIG9mIHRoZSByb290IGZvbGRlciBhbmRcbiAgICAgICAgICAvLyB0aGlzIGJsb2NrIGFuZCB0aGUgbGludCBmb2xkZXIgY291bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgXSkpLFxuICAgICAgc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNwZWM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc2tpcEltcG9ydDogdHJ1ZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vb3RoZXItZmlsZXMnKSwgW1xuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLmh0bWwnKSkgOiBub29wKCksXG4gICAgICAgICAgIWNvbXBvbmVudE9wdGlvbnMuc3BlYyA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cycpKSA6IG5vb3AoKSxcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMgYXMgYW55LCAgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgICAgXSksIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlKSxcbiAgICAgIHNjaGVtYXRpYygnZTJlJywgZTJlT3B0aW9ucyksXG4gICAgXSkoaG9zdCwgY29udGV4dCk7XG4gIH07XG59XG4iXX0=