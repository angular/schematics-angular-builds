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
        json.devDependencies = Object.assign({ '@angular/compiler-cli': latest_versions_1.latestVersions.Angular, '@angular-devkit/build-webpack': latest_versions_1.latestVersions.DevkitBuildWebpack, 'typescript': latest_versions_1.latestVersions.TypeScript }, json.devDependencies);
        host.overwrite(packageJsonPath, JSON.stringify(json, null, 2));
        return host;
    };
}
function addAppToWorkspaceFile(options, workspace) {
    return (host, context) => {
        context.logger.info(`Updating workspace file`);
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
        const projectRoot = `${workspace.newProjectRoot}/${options.name}`;
        // tslint:disable-next-line:no-any
        const project = {
            root: projectRoot,
            projectType: 'application',
            architect: {
                build: {
                    builder: '@angular-devkit/build-webpack:browser',
                    options: {
                        outputPath: `dist/${options.name}`,
                        index: `${projectRoot}/src/index.html`,
                        main: `${projectRoot}/src/main.ts`,
                        polyfills: `${projectRoot}/src/polyfills.ts`,
                        tsConfig: `${projectRoot}/tsconfig.app.json`,
                        assets: [
                            {
                                glob: 'favicon.ico',
                                input: `${projectRoot}/src`,
                                output: './',
                            },
                            {
                                glob: '**/*',
                                input: `${projectRoot}/src/assets`,
                                output: 'assets',
                            },
                        ],
                        styles: [
                            {
                                input: `${projectRoot}/src/styles.${options.style}`,
                            },
                        ],
                        scripts: [],
                    },
                    configurations: {
                        production: {
                            fileReplacements: [{
                                    from: `${projectRoot}/src/environments/environment.ts`,
                                    to: `${projectRoot}/src/environments/environment.prod.ts`,
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
                    builder: '@angular-devkit/build-webpack:dev-server',
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
                    builder: '@angular-devkit/build-webpack:extract-i18n',
                    options: {
                        browserTarget: `${options.name}:build`,
                    },
                },
                test: {
                    builder: '@angular-devkit/build-webpack:karma',
                    options: {
                        main: `${projectRoot}/src/test.ts`,
                        polyfills: `${projectRoot}/src/polyfills.ts`,
                        tsConfig: `${projectRoot}/tsconfig.spec.json`,
                        karmaConfig: `${projectRoot}/karma.conf.js`,
                        styles: [
                            {
                                input: `${projectRoot}/styles.${options.style}`,
                            },
                        ],
                        scripts: [],
                        assets: [
                            {
                                glob: 'favicon.ico',
                                input: `${projectRoot}/src/`,
                                output: './',
                            },
                            {
                                glob: '**/*',
                                input: `${projectRoot}/src/assets`,
                                output: 'assets',
                            },
                        ],
                    },
                },
                lint: {
                    builder: '@angular-devkit/build-webpack:tslint',
                    options: {
                        tsConfig: [
                            `${projectRoot}/tsconfig.app.json`,
                            `${projectRoot}/tsconfig.spec.json`,
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
        const appRootSelector = `${options.prefix || 'app'}-root`;
        const componentOptions = {
            inlineStyle: options.inlineStyle,
            inlineTemplate: options.inlineTemplate,
            spec: !options.skipTests,
            styleext: options.style,
        };
        const workspace = config_1.getWorkspace(host);
        const newProjectRoot = workspace.newProjectRoot;
        const appDir = `${newProjectRoot}/${options.name}`;
        const sourceDir = `${appDir}/src/app`;
        const e2eOptions = {
            name: `${options.name}-e2e`,
            relatedAppName: options.name,
            rootSelector: appRootSelector,
        };
        return schematics_1.chain([
            addAppToWorkspaceFile(options, workspace),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', appDir })),
                schematics_1.move(appDir),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUVyRCwyREFlb0M7QUFFcEMsOENBQW1FO0FBQ25FLGdFQUE0RDtBQUs1RCxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLDhCQUE4QjtBQUM5Qix5QkFBeUI7QUFDekIsMEJBQTBCO0FBQzFCLHNCQUFzQjtBQUN0QixnQkFBZ0I7QUFDaEIsTUFBTTtBQUNOLDhEQUE4RDtBQUU5RCxzQ0FBc0M7QUFDdEMsdUJBQXVCO0FBQ3ZCLGdFQUFnRTtBQUNoRSwyRkFBMkY7QUFDM0YsTUFBTTtBQUVOLHlCQUF5QjtBQUN6QiwyQkFBMkI7QUFDM0IsV0FBVztBQUNYLHlGQUF5RjtBQUN6RixnQ0FBZ0M7QUFDaEMsT0FBTztBQUNQLElBQUk7QUFFSjtJQUNFLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQztRQUV2QyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUFDLENBQUM7UUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQztRQUU3QixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFcEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxtQkFDbEIsdUJBQXVCLEVBQUUsZ0NBQWMsQ0FBQyxPQUFPLEVBQy9DLCtCQUErQixFQUFFLGdDQUFjLENBQUMsa0JBQWtCLEVBQ2xFLFlBQVksRUFBRSxnQ0FBYyxDQUFDLFVBQVUsSUFFcEMsSUFBSSxDQUFDLGVBQWUsQ0FDeEIsQ0FBQztRQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRS9ELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsK0JBQStCLE9BQTJCLEVBQUUsU0FBMEI7SUFDcEYsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9DLG9CQUFvQjtRQUNwQix5Q0FBeUM7UUFDekMsb0RBQW9EO1FBQ3BELGtDQUFrQztRQUNsQyx1RkFBdUY7UUFDdkYsSUFBSTtRQUNKLCtEQUErRDtRQUMvRCxzQ0FBc0M7UUFDdEMsNkZBQTZGO1FBQzdGLElBQUk7UUFDSixNQUFNLFdBQVcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxjQUFjLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xFLGtDQUFrQztRQUNsQyxNQUFNLE9BQU8sR0FBUTtZQUNuQixJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUsYUFBYTtZQUMxQixTQUFTLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFO29CQUNMLE9BQU8sRUFBRSx1Q0FBdUM7b0JBQ2hELE9BQU8sRUFBRTt3QkFDUCxVQUFVLEVBQUUsUUFBUSxPQUFPLENBQUMsSUFBSSxFQUFFO3dCQUNsQyxLQUFLLEVBQUUsR0FBRyxXQUFXLGlCQUFpQjt3QkFDdEMsSUFBSSxFQUFFLEdBQUcsV0FBVyxjQUFjO3dCQUNsQyxTQUFTLEVBQUUsR0FBRyxXQUFXLG1CQUFtQjt3QkFDNUMsUUFBUSxFQUFFLEdBQUcsV0FBVyxvQkFBb0I7d0JBQzVDLE1BQU0sRUFBRTs0QkFDTjtnQ0FDRSxJQUFJLEVBQUUsYUFBYTtnQ0FDbkIsS0FBSyxFQUFFLEdBQUcsV0FBVyxNQUFNO2dDQUMzQixNQUFNLEVBQUUsSUFBSTs2QkFDYjs0QkFDRDtnQ0FDRSxJQUFJLEVBQUUsTUFBTTtnQ0FDWixLQUFLLEVBQUUsR0FBRyxXQUFXLGFBQWE7Z0NBQ2xDLE1BQU0sRUFBRSxRQUFROzZCQUNqQjt5QkFDRjt3QkFDRCxNQUFNLEVBQUU7NEJBQ047Z0NBQ0UsS0FBSyxFQUFFLEdBQUcsV0FBVyxlQUFlLE9BQU8sQ0FBQyxLQUFLLEVBQUU7NkJBQ3BEO3lCQUNGO3dCQUNELE9BQU8sRUFBRSxFQUFFO3FCQUNaO29CQUNELGNBQWMsRUFBRTt3QkFDZCxVQUFVLEVBQUU7NEJBQ1YsZ0JBQWdCLEVBQUUsQ0FBQztvQ0FDakIsSUFBSSxFQUFFLEdBQUcsV0FBVyxrQ0FBa0M7b0NBQ3RELEVBQUUsRUFBRSxHQUFHLFdBQVcsdUNBQXVDO2lDQUMxRCxDQUFDOzRCQUNGLFlBQVksRUFBRSxJQUFJOzRCQUNsQixhQUFhLEVBQUUsS0FBSzs0QkFDcEIsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLFVBQVUsRUFBRSxJQUFJOzRCQUNoQixXQUFXLEVBQUUsS0FBSzs0QkFDbEIsR0FBRyxFQUFFLElBQUk7NEJBQ1QsZUFBZSxFQUFFLElBQUk7NEJBQ3JCLFdBQVcsRUFBRSxLQUFLOzRCQUNsQixjQUFjLEVBQUUsSUFBSTt5QkFDckI7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsS0FBSyxFQUFFO29CQUNMLE9BQU8sRUFBRSwwQ0FBMEM7b0JBQ25ELE9BQU8sRUFBRTt3QkFDUCxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxRQUFRO3FCQUN2QztvQkFDRCxjQUFjLEVBQUU7d0JBQ2QsVUFBVSxFQUFFOzRCQUNWLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQjt5QkFDbEQ7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsY0FBYyxFQUFFO29CQUNkLE9BQU8sRUFBRSw0Q0FBNEM7b0JBQ3JELE9BQU8sRUFBRTt3QkFDUCxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxRQUFRO3FCQUN2QztpQkFDRjtnQkFDRCxJQUFJLEVBQUU7b0JBQ0osT0FBTyxFQUFFLHFDQUFxQztvQkFDOUMsT0FBTyxFQUFFO3dCQUNQLElBQUksRUFBRSxHQUFHLFdBQVcsY0FBYzt3QkFDbEMsU0FBUyxFQUFFLEdBQUcsV0FBVyxtQkFBbUI7d0JBQzVDLFFBQVEsRUFBRSxHQUFHLFdBQVcscUJBQXFCO3dCQUM3QyxXQUFXLEVBQUUsR0FBRyxXQUFXLGdCQUFnQjt3QkFDM0MsTUFBTSxFQUFFOzRCQUNOO2dDQUNFLEtBQUssRUFBRSxHQUFHLFdBQVcsV0FBVyxPQUFPLENBQUMsS0FBSyxFQUFFOzZCQUNoRDt5QkFDRjt3QkFDRCxPQUFPLEVBQUUsRUFBRTt3QkFDWCxNQUFNLEVBQUU7NEJBQ047Z0NBQ0UsSUFBSSxFQUFFLGFBQWE7Z0NBQ25CLEtBQUssRUFBRSxHQUFHLFdBQVcsT0FBTztnQ0FDNUIsTUFBTSxFQUFFLElBQUk7NkJBQ2I7NEJBQ0Q7Z0NBQ0UsSUFBSSxFQUFFLE1BQU07Z0NBQ1osS0FBSyxFQUFFLEdBQUcsV0FBVyxhQUFhO2dDQUNsQyxNQUFNLEVBQUUsUUFBUTs2QkFDakI7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsSUFBSSxFQUFFO29CQUNKLE9BQU8sRUFBRSxzQ0FBc0M7b0JBQy9DLE9BQU8sRUFBRTt3QkFDUCxRQUFRLEVBQUU7NEJBQ1IsR0FBRyxXQUFXLG9CQUFvQjs0QkFDbEMsR0FBRyxXQUFXLHFCQUFxQjt5QkFDcEM7d0JBQ0QsT0FBTyxFQUFFOzRCQUNQLG9CQUFvQjt5QkFDckI7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUM7UUFDRixrQ0FBa0M7UUFDbEMsMEVBQTBFO1FBQzFFLGtDQUFrQztRQUNsQyw4Q0FBOEM7UUFDOUMsdUNBQXVDO1FBQ3ZDLG9EQUFvRDtRQUNwRCxJQUFJO1FBRUosU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDO1FBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELE1BQU0saUJBQWlCLEdBQUcsMENBQTBDLENBQUM7QUFDckUsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUVoRiwrQkFBK0IsR0FBVztJQUN4QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3RCxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFFN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNuQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVsQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNuRCxDQUFDO0FBRUQsNkJBQTZCLFdBQW1CO0lBQzlDLE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELEVBQUUsQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sWUFBWSxHQUFHLFdBQUksQ0FBQyxPQUFPLENBQUE7c0JBQ2YsV0FBVzs7O0tBRzVCLENBQUM7UUFDRixNQUFNLEdBQUcsR0FBRyxXQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3hCLFlBQVk7UUFDWixXQUFXO1FBQ1gsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRztLQUN4QyxDQUFDO1FBQ0YsTUFBTSxJQUFJLGdDQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsaUJBQWlCLFdBQVcsNEJBQTRCLENBQUMsQ0FBQztJQUMxRixDQUFDO0FBRUgsQ0FBQztBQUVELG1CQUF5QixPQUEyQjtJQUNsRCxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNELG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLGVBQWUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksS0FBSyxPQUFPLENBQUM7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRztZQUN2QixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQ3RDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTO1lBQ3hCLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSztTQUN4QixDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQUcscUJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsY0FBYyxDQUFDO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEdBQUcsY0FBYyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxHQUFHLE1BQU0sVUFBVSxDQUFDO1FBRXRDLE1BQU0sVUFBVSxHQUFlO1lBQzdCLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLE1BQU07WUFDM0IsY0FBYyxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQzVCLFlBQVksRUFBRSxlQUFlO1NBQzlCLENBQUM7UUFFRixNQUFNLENBQUMsa0JBQUssQ0FBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDekMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsRUFBRTtZQUNqRSxzQkFBUyxDQUNQLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDcEIscUJBQVEsaUJBQ04sS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFPLElBQ1YsS0FBSyxFQUFFLEdBQUcsRUFDVixNQUFNLElBQ047Z0JBQ0YsaUJBQUksQ0FBQyxNQUFNLENBQUM7YUFDYixDQUFDLENBQUM7WUFDTCxzQkFBUyxDQUFDLFFBQVEsRUFBRTtnQkFDbEIsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDeEIsWUFBWSxFQUFFLE1BQU07Z0JBQ3BCLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQztZQUNGLHNCQUFTLENBQUMsV0FBVyxrQkFDbkIsSUFBSSxFQUFFLEtBQUssRUFDWCxRQUFRLEVBQUUsZUFBZSxFQUN6QixJQUFJLEVBQUUsSUFBSSxFQUNWLElBQUksRUFBRSxTQUFTLEVBQ2YsVUFBVSxFQUFFLElBQUksSUFDYixnQkFBZ0IsRUFDbkI7WUFDRixzQkFBUyxDQUNQLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDMUIsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQ2xGLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQzVFLHFCQUFRLGlCQUNOLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBYyxJQUNqQixRQUFRLEVBQUUsZUFBZSxJQUN0QixnQkFBZ0IsRUFDbkI7Z0JBQ0YsaUJBQUksQ0FBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUFFLDBCQUFhLENBQUMsU0FBUyxDQUFDO1lBQzlCLHNCQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztTQUM3QixDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQztBQUNKLENBQUM7QUF0RUQsNEJBc0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgc3RyaW5ncywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4cGVyaW1lbnRhbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxudHlwZSBXb3Jrc3BhY2VTY2hlbWEgPSBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYTtcblxuLy8gVE9ETzogdXNlIEpzb25BU1Rcbi8vIGZ1bmN0aW9uIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QoXG4vLyAgIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbi8vICAgbm9kZTogSnNvbkFzdE9iamVjdCxcbi8vICAgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4vLyAgIHZhbHVlOiBKc29uVmFsdWUsXG4vLyAgIGluZGVudCA9IDQsXG4vLyApIHtcbi8vICAgY29uc3QgaW5kZW50U3RyID0gJ1xcbicgKyBuZXcgQXJyYXkoaW5kZW50ICsgMSkuam9pbignICcpO1xuXG4vLyAgIGlmIChub2RlLnByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuLy8gICAgIC8vIEluc2VydCBjb21tYS5cbi8vICAgICBjb25zdCBsYXN0ID0gbm9kZS5wcm9wZXJ0aWVzW25vZGUucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbi8vICAgICByZWNvcmRlci5pbnNlcnRSaWdodChsYXN0LnN0YXJ0Lm9mZnNldCArIGxhc3QudGV4dC5yZXBsYWNlKC9cXHMrJC8sICcnKS5sZW5ndGgsICcsJyk7XG4vLyAgIH1cblxuLy8gICByZWNvcmRlci5pbnNlcnRMZWZ0KFxuLy8gICAgIG5vZGUuZW5kLm9mZnNldCAtIDEsXG4vLyAgICAgJyAgJ1xuLy8gICAgICsgYFwiJHtwcm9wZXJ0eU5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLnJlcGxhY2UoL1xcbi9nLCBpbmRlbnRTdHIpfWBcbi8vICAgICArIGluZGVudFN0ci5zbGljZSgwLCAtMiksXG4vLyAgICk7XG4vLyB9XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9ICdwYWNrYWdlLmpzb24nO1xuXG4gICAgaWYgKCFob3N0LmV4aXN0cygncGFja2FnZS5qc29uJykpIHsgcmV0dXJuIGhvc3Q7IH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IGhvc3QucmVhZCgncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKCFzb3VyY2UpIHsgcmV0dXJuIGhvc3Q7IH1cblxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBzb3VyY2UudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QganNvbiA9IEpTT04ucGFyc2Uoc291cmNlVGV4dCk7XG5cbiAgICBpZiAoIWpzb25bJ2RldkRlcGVuZGVuY2llcyddKSB7XG4gICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgIH1cblxuICAgIGpzb24uZGV2RGVwZW5kZW5jaWVzID0ge1xuICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2snOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZFdlYnBhY2ssXG4gICAgICAndHlwZXNjcmlwdCc6IGxhdGVzdFZlcnNpb25zLlR5cGVTY3JpcHQsXG4gICAgICAvLyBEZS1zdHJ1Y3R1cmUgbGFzdCBrZWVwcyBleGlzdGluZyB1c2VyIGRlcGVuZGVuY2llcy5cbiAgICAgIC4uLmpzb24uZGV2RGVwZW5kZW5jaWVzLFxuICAgIH07XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwYWNrYWdlSnNvblBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLCB3b3Jrc3BhY2U6IFdvcmtzcGFjZVNjaGVtYSk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyB3b3Jrc3BhY2UgZmlsZWApO1xuICAgIC8vIFRPRE86IHVzZSBKc29uQVNUXG4gICAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VCdWZmZXIgPSBob3N0LnJlYWQod29ya3NwYWNlUGF0aCk7XG4gICAgLy8gaWYgKHdvcmtzcGFjZUJ1ZmZlciA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VKc29uID0gcGFyc2VKc29uKHdvcmtzcGFjZUJ1ZmZlci50b1N0cmluZygpKTtcbiAgICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFVuYWJsZSB0byBwYXJzZSBjb25maWd1cmF0aW9uIGZpbGUgKCR7d29ya3NwYWNlUGF0aH0pLmApO1xuICAgIC8vIH1cbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgY29uc3QgcHJvamVjdDogYW55ID0ge1xuICAgICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIGFyY2hpdGVjdDoge1xuICAgICAgICBidWlsZDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazpicm93c2VyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICAgICAgaW5kZXg6IGAke3Byb2plY3RSb290fS9zcmMvaW5kZXguaHRtbGAsXG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL21haW4udHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyY2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnLi8nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vc3JjL2Fzc2V0c2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vc3JjL3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFt7XG4gICAgICAgICAgICAgICAgZnJvbTogYCR7cHJvamVjdFJvb3R9L3NyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQudHNgLFxuICAgICAgICAgICAgICAgIHRvOiBgJHtwcm9qZWN0Um9vdH0vc3JjL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC5wcm9kLnRzYCxcbiAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmRldi1zZXJ2ZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2s6ZXh0cmFjdC1pMThuJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmthcm1hJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cHJvamVjdFJvb3R9L2thcm1hLmNvbmYuanNgLFxuICAgICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyYy9gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy4vJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyYy9hc3NldHNgLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJ2Fzc2V0cycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpbnQ6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2s6dHNsaW50JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0c0NvbmZpZzogW1xuICAgICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGNsdWRlOiBbXG4gICAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBjb25zdCBwcm9qZWN0czogSnNvbk9iamVjdCA9ICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzIHx8IHt9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gICAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gICAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyA9IHByb2plY3RzO1xuICAgIC8vIH1cblxuICAgIHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLm5hbWVdID0gcHJvamVjdDtcbiAgICBob3N0Lm92ZXJ3cml0ZShnZXRXb3Jrc3BhY2VQYXRoKGhvc3QpLCBKU09OLnN0cmluZ2lmeSh3b3Jrc3BhY2UsIG51bGwsIDIpKTtcbiAgfTtcbn1cbmNvbnN0IHByb2plY3ROYW1lUmVnZXhwID0gL15bYS16QS1aXVsuMC05YS16QS1aXSooLVsuMC05YS16QS1aXSopKiQvO1xuY29uc3QgdW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMgPSBbJ3Rlc3QnLCAnZW1iZXInLCAnZW1iZXItY2xpJywgJ3ZlbmRvcicsICdhcHAnXTtcblxuZnVuY3Rpb24gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHN0cjogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnRzID0gc3RyLmluZGV4T2YoJy0nKSA+PSAwID8gc3RyLnNwbGl0KCctJykgOiBbc3RyXTtcbiAgY29uc3QgbWF0Y2hlZDogc3RyaW5nW10gPSBbXTtcblxuICBwYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuICAgIGlmIChwYXJ0Lm1hdGNoKHByb2plY3ROYW1lUmVnZXhwKSkge1xuICAgICAgbWF0Y2hlZC5wdXNoKHBhcnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgY29tcGFyZSA9IG1hdGNoZWQuam9pbignLScpO1xuXG4gIHJldHVybiAoc3RyICE9PSBjb21wYXJlKSA/IGNvbXBhcmUubGVuZ3RoIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0TmFtZShwcm9qZWN0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGVycm9ySW5kZXggPSBnZXRSZWdFeHBGYWlsUG9zaXRpb24ocHJvamVjdE5hbWUpO1xuICBpZiAoZXJyb3JJbmRleCAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGZpcnN0TWVzc2FnZSA9IHRhZ3Mub25lTGluZWBcbiAgICAgIFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IHZhbGlkLiBOZXcgcHJvamVjdCBuYW1lcyBtdXN0XG4gICAgICBzdGFydCB3aXRoIGEgbGV0dGVyLCBhbmQgbXVzdCBjb250YWluIG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMgb3IgZGFzaGVzLlxuICAgICAgV2hlbiBhZGRpbmcgYSBkYXNoIHRoZSBzZWdtZW50IGFmdGVyIHRoZSBkYXNoIG11c3QgYWxzbyBzdGFydCB3aXRoIGEgbGV0dGVyLlxuICAgIGA7XG4gICAgY29uc3QgbXNnID0gdGFncy5zdHJpcEluZGVudGBcbiAgICAgICR7Zmlyc3RNZXNzYWdlfVxuICAgICAgJHtwcm9qZWN0TmFtZX1cbiAgICAgICR7QXJyYXkoZXJyb3JJbmRleCArIDEpLmpvaW4oJyAnKSArICdeJ31cbiAgICBgO1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKG1zZyk7XG4gIH0gZWxzZSBpZiAodW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMuaW5kZXhPZihwcm9qZWN0TmFtZSkgIT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IGEgc3VwcG9ydGVkIG5hbWUuYCk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBvcHRpb25zLCBcIm5hbWVcIiBpcyByZXF1aXJlZC5gKTtcbiAgICB9XG4gICAgdmFsaWRhdGVQcm9qZWN0TmFtZShvcHRpb25zLm5hbWUpO1xuICAgIGNvbnN0IGFwcFJvb3RTZWxlY3RvciA9IGAke29wdGlvbnMucHJlZml4IHx8ICdhcHAnfS1yb290YDtcbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zID0ge1xuICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgIHNwZWM6ICFvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgIHN0eWxlZXh0OiBvcHRpb25zLnN0eWxlLFxuICAgIH07XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG4gICAgY29uc3QgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7YXBwRGlyfS9zcmMvYXBwYDtcblxuICAgIGNvbnN0IGUyZU9wdGlvbnM6IEUyZU9wdGlvbnMgPSB7XG4gICAgICBuYW1lOiBgJHtvcHRpb25zLm5hbWV9LWUyZWAsXG4gICAgICByZWxhdGVkQXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgcm9vdFNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgfTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG9wdGlvbnMuc2tpcFBhY2thZ2VKc29uID8gbm9vcCgpIDogYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbigpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICBhcHBEaXIsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICAgICAgcm91dGluZ1Njb3BlOiAnUm9vdCcsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc3BlYzogZmFsc2UsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9vdGhlci1maWxlcycpLCBbXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuaHRtbCcpKSA6IG5vb3AoKSxcbiAgICAgICAgICAhY29tcG9uZW50T3B0aW9ucy5zcGVjID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5zcGVjLnRzJykpIDogbm9vcCgpLFxuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyBhcyBhbnksICAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICAgICAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShzb3VyY2VEaXIpLFxuICAgICAgICBdKSwgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUpLFxuICAgICAgc2NoZW1hdGljKCdlMmUnLCBlMmVPcHRpb25zKSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==