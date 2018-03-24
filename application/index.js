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
            cli: {},
            schematics: {},
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUVyRCwyREFlb0M7QUFFcEMsOENBQW1FO0FBS25FLG9CQUFvQjtBQUNwQixzQ0FBc0M7QUFDdEMsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QiwwQkFBMEI7QUFDMUIsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQixNQUFNO0FBQ04sOERBQThEO0FBRTlELHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsZ0VBQWdFO0FBQ2hFLDJGQUEyRjtBQUMzRixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLGdDQUFnQztBQUNoQyxPQUFPO0FBQ1AsSUFBSTtBQUVKLCtCQUErQixPQUEyQixFQUFFLFNBQTBCO0lBQ3BGLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUMvQyxvQkFBb0I7UUFDcEIseUNBQXlDO1FBQ3pDLG9EQUFvRDtRQUNwRCxrQ0FBa0M7UUFDbEMsdUZBQXVGO1FBQ3ZGLElBQUk7UUFDSiwrREFBK0Q7UUFDL0Qsc0NBQXNDO1FBQ3RDLDZGQUE2RjtRQUM3RixJQUFJO1FBQ0osTUFBTSxXQUFXLEdBQUcsR0FBRyxTQUFTLENBQUMsY0FBYyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsRSxrQ0FBa0M7UUFDbEMsTUFBTSxPQUFPLEdBQVE7WUFDbkIsSUFBSSxFQUFFLFdBQVc7WUFDakIsV0FBVyxFQUFFLGFBQWE7WUFDMUIsR0FBRyxFQUFFLEVBQUU7WUFDUCxVQUFVLEVBQUUsRUFBRTtZQUNkLFNBQVMs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LEtBQUssRUFDWCxRQUFRLEVBQUUsZUFBZSxFQUN6QixJQUFJLEVBQUUsSUFBSSxFQUNWLElBQUksRUFBRSxTQUFTLEVBQ2YsVUFBVSxFQUFFLElBQUksSUFDYixnQkFBZ0IsRUFDbkI7WUFDRixzQkFBUyxDQUNQLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDMUIsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQ2xGLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7Z0JBQzVFLHFCQUFRLGlCQUNOLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBYyxJQUNqQixRQUFRLEVBQUUsZUFBZSxJQUN0QixnQkFBZ0IsRUFDbkI7Z0JBQ0YsaUJBQUksQ0FBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUFFLDBCQUFhLENBQUMsU0FBUyxDQUFDO1lBQzlCLHNCQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztTQUM3QixDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFsRUQsNEJBa0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgc3RyaW5ncywgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IGV4cGVyaW1lbnRhbCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuLi9lMmUvc2NoZW1hJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbnR5cGUgV29ya3NwYWNlU2NoZW1hID0gZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VTY2hlbWE7XG5cbi8vIFRPRE86IHVzZSBKc29uQVNUXG4vLyBmdW5jdGlvbiBhcHBlbmRQcm9wZXJ0eUluQXN0T2JqZWN0KFxuLy8gICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4vLyAgIG5vZGU6IEpzb25Bc3RPYmplY3QsXG4vLyAgIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuLy8gICB2YWx1ZTogSnNvblZhbHVlLFxuLy8gICBpbmRlbnQgPSA0LFxuLy8gKSB7XG4vLyAgIGNvbnN0IGluZGVudFN0ciA9ICdcXG4nICsgbmV3IEFycmF5KGluZGVudCArIDEpLmpvaW4oJyAnKTtcblxuLy8gICBpZiAobm9kZS5wcm9wZXJ0aWVzLmxlbmd0aCA+IDApIHtcbi8vICAgICAvLyBJbnNlcnQgY29tbWEuXG4vLyAgICAgY29uc3QgbGFzdCA9IG5vZGUucHJvcGVydGllc1tub2RlLnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4vLyAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQobGFzdC5zdGFydC5vZmZzZXQgKyBsYXN0LnRleHQucmVwbGFjZSgvXFxzKyQvLCAnJykubGVuZ3RoLCAnLCcpO1xuLy8gICB9XG5cbi8vICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChcbi8vICAgICBub2RlLmVuZC5vZmZzZXQgLSAxLFxuLy8gICAgICcgICdcbi8vICAgICArIGBcIiR7cHJvcGVydHlOYW1lfVwiOiAke0pTT04uc3RyaW5naWZ5KHZhbHVlLCBudWxsLCAyKS5yZXBsYWNlKC9cXG4vZywgaW5kZW50U3RyKX1gXG4vLyAgICAgKyBpbmRlbnRTdHIuc2xpY2UoMCwgLTIpLFxuLy8gICApO1xuLy8gfVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLCB3b3Jrc3BhY2U6IFdvcmtzcGFjZVNjaGVtYSk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyB3b3Jrc3BhY2UgZmlsZWApO1xuICAgIC8vIFRPRE86IHVzZSBKc29uQVNUXG4gICAgLy8gY29uc3Qgd29ya3NwYWNlUGF0aCA9ICcvYW5ndWxhci5qc29uJztcbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VCdWZmZXIgPSBob3N0LnJlYWQod29ya3NwYWNlUGF0aCk7XG4gICAgLy8gaWYgKHdvcmtzcGFjZUJ1ZmZlciA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkgbm90IGZvdW5kLmApO1xuICAgIC8vIH1cbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VKc29uID0gcGFyc2VKc29uKHdvcmtzcGFjZUJ1ZmZlci50b1N0cmluZygpKTtcbiAgICAvLyBpZiAod29ya3NwYWNlSnNvbi52YWx1ZSA9PT0gbnVsbCkge1xuICAgIC8vICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFVuYWJsZSB0byBwYXJzZSBjb25maWd1cmF0aW9uIGZpbGUgKCR7d29ya3NwYWNlUGF0aH0pLmApO1xuICAgIC8vIH1cbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgY29uc3QgcHJvamVjdDogYW55ID0ge1xuICAgICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIGNsaToge30sXG4gICAgICBzY2hlbWF0aWNzOiB7fSxcbiAgICAgIGFyY2hpdGVjdDoge1xuICAgICAgICBidWlsZDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazpicm93c2VyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICAgICAgaW5kZXg6IGAke3Byb2plY3RSb290fS9zcmMvaW5kZXguaHRtbGAsXG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL21haW4udHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyY2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnLi8nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vc3JjL2Fzc2V0c2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vc3JjL3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFt7XG4gICAgICAgICAgICAgICAgZnJvbTogYCR7cHJvamVjdFJvb3R9L3NyYy9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQudHNgLFxuICAgICAgICAgICAgICAgIHRvOiBgJHtwcm9qZWN0Um9vdH0vc3JjL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC5wcm9kLnRzYCxcbiAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmRldi1zZXJ2ZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2s6ZXh0cmFjdC1pMThuJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmthcm1hJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cHJvamVjdFJvb3R9L2thcm1hLmNvbmYuanNgLFxuICAgICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyYy9gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy4vJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyYy9hc3NldHNgLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJ2Fzc2V0cycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpbnQ6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2s6dHNsaW50JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0c0NvbmZpZzogW1xuICAgICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGNsdWRlOiBbXG4gICAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBjb25zdCBwcm9qZWN0czogSnNvbk9iamVjdCA9ICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzIHx8IHt9O1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyBpZiAoISg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzKSB7XG4gICAgLy8gICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gICAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyA9IHByb2plY3RzO1xuICAgIC8vIH1cblxuICAgIHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLm5hbWVdID0gcHJvamVjdDtcbiAgICBob3N0Lm92ZXJ3cml0ZShnZXRXb3Jrc3BhY2VQYXRoKGhvc3QpLCBKU09OLnN0cmluZ2lmeSh3b3Jrc3BhY2UsIG51bGwsIDIpKTtcbiAgfTtcbn1cbmNvbnN0IHByb2plY3ROYW1lUmVnZXhwID0gL15bYS16QS1aXVsuMC05YS16QS1aXSooLVsuMC05YS16QS1aXSopKiQvO1xuY29uc3QgdW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMgPSBbJ3Rlc3QnLCAnZW1iZXInLCAnZW1iZXItY2xpJywgJ3ZlbmRvcicsICdhcHAnXTtcblxuZnVuY3Rpb24gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHN0cjogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnRzID0gc3RyLmluZGV4T2YoJy0nKSA+PSAwID8gc3RyLnNwbGl0KCctJykgOiBbc3RyXTtcbiAgY29uc3QgbWF0Y2hlZDogc3RyaW5nW10gPSBbXTtcblxuICBwYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuICAgIGlmIChwYXJ0Lm1hdGNoKHByb2plY3ROYW1lUmVnZXhwKSkge1xuICAgICAgbWF0Y2hlZC5wdXNoKHBhcnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgY29tcGFyZSA9IG1hdGNoZWQuam9pbignLScpO1xuXG4gIHJldHVybiAoc3RyICE9PSBjb21wYXJlKSA/IGNvbXBhcmUubGVuZ3RoIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0TmFtZShwcm9qZWN0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGVycm9ySW5kZXggPSBnZXRSZWdFeHBGYWlsUG9zaXRpb24ocHJvamVjdE5hbWUpO1xuICBpZiAoZXJyb3JJbmRleCAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGZpcnN0TWVzc2FnZSA9IHRhZ3Mub25lTGluZWBcbiAgICAgIFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IHZhbGlkLiBOZXcgcHJvamVjdCBuYW1lcyBtdXN0XG4gICAgICBzdGFydCB3aXRoIGEgbGV0dGVyLCBhbmQgbXVzdCBjb250YWluIG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMgb3IgZGFzaGVzLlxuICAgICAgV2hlbiBhZGRpbmcgYSBkYXNoIHRoZSBzZWdtZW50IGFmdGVyIHRoZSBkYXNoIG11c3QgYWxzbyBzdGFydCB3aXRoIGEgbGV0dGVyLlxuICAgIGA7XG4gICAgY29uc3QgbXNnID0gdGFncy5zdHJpcEluZGVudGBcbiAgICAgICR7Zmlyc3RNZXNzYWdlfVxuICAgICAgJHtwcm9qZWN0TmFtZX1cbiAgICAgICR7QXJyYXkoZXJyb3JJbmRleCArIDEpLmpvaW4oJyAnKSArICdeJ31cbiAgICBgO1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKG1zZyk7XG4gIH0gZWxzZSBpZiAodW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMuaW5kZXhPZihwcm9qZWN0TmFtZSkgIT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IGEgc3VwcG9ydGVkIG5hbWUuYCk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIHZhbGlkYXRlUHJvamVjdE5hbWUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBhcHBSb290U2VsZWN0b3IgPSBgJHtvcHRpb25zLnByZWZpeCB8fCAnYXBwJ30tcm9vdGA7XG4gICAgY29uc3QgY29tcG9uZW50T3B0aW9ucyA9IHtcbiAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgICBzcGVjOiAhb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgICBzdHlsZWV4dDogb3B0aW9ucy5zdHlsZSxcbiAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IG5ld1Byb2plY3RSb290ID0gd29ya3NwYWNlLm5ld1Byb2plY3RSb290O1xuICAgIGNvbnN0IGFwcERpciA9IGAke25ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIGNvbnN0IHNvdXJjZURpciA9IGAke2FwcERpcn0vc3JjL2FwcGA7XG5cbiAgICBjb25zdCBlMmVPcHRpb25zOiBFMmVPcHRpb25zID0ge1xuICAgICAgbmFtZTogYCR7b3B0aW9ucy5uYW1lfS1lMmVgLFxuICAgICAgcmVsYXRlZEFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgIHJvb3RTZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgIH07XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgJ2RvdCc6ICcuJyxcbiAgICAgICAgICAgIGFwcERpcixcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBzcGVjOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sJykpIDogbm9vcCgpLFxuICAgICAgICAgICFjb21wb25lbnRPcHRpb25zLnNwZWMgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMnKSkgOiBub29wKCksXG4gICAgICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zIGFzIGFueSwgIC8vIHRzbGludDpkaXNhYmxlLWxpbmU6bm8tYW55XG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZURpciksXG4gICAgICAgIF0pLCBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSksXG4gICAgICBzY2hlbWF0aWMoJ2UyZScsIGUyZU9wdGlvbnMpLFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19