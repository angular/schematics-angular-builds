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
                                input: `${projectRoot}`,
                                output: './',
                            },
                            {
                                glob: '**/*',
                                input: `${projectRoot}/assets>`,
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
                                input: `${projectRoot}/`,
                                output: './',
                            },
                            {
                                glob: '**/*',
                                input: `${projectRoot}/assets`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUVyRCwyREFlb0M7QUFFcEMsOENBQW1FO0FBS25FLG9CQUFvQjtBQUNwQixzQ0FBc0M7QUFDdEMsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QiwwQkFBMEI7QUFDMUIsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQixNQUFNO0FBQ04sOERBQThEO0FBRTlELHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsZ0VBQWdFO0FBQ2hFLDJGQUEyRjtBQUMzRixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLGdDQUFnQztBQUNoQyxPQUFPO0FBQ1AsSUFBSTtBQUVKLCtCQUErQixPQUEyQixFQUFFLFNBQTBCO0lBQ3BGLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUMvQyxvQkFBb0I7UUFDcEIseUNBQXlDO1FBQ3pDLG9EQUFvRDtRQUNwRCxrQ0FBa0M7UUFDbEMsdUZBQXVGO1FBQ3ZGLElBQUk7UUFDSiwrREFBK0Q7UUFDL0Qsc0NBQXNDO1FBQ3RDLDZGQUE2RjtRQUM3RixJQUFJO1FBQ0osTUFBTSxXQUFXLEdBQUcsR0FBRyxTQUFTLENBQUMsY0FBYyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsRSxrQ0FBa0M7UUFDbEMsTUFBTSxPQUFPLEdBQVE7WUFDbkIsSUFBSSxFQUFFLFdBQVc7WUFDakIsV0FBVyxFQUFFLGFBQWE7WUFDMUIsR0FBRyxFQUFFLEVBQUU7WUFDUCxVQUFVLEVBQUUsRUFBRTtZQUNkLFNBQVMs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QjtZQUNGLHNCQUFTLENBQ1Asa0JBQUssQ0FBQyxnQkFBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUMxQixnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDbEYsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDNUUscUJBQVEsaUJBQ04sS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFjLElBQ2pCLFFBQVEsRUFBRSxlQUFlLElBQ3RCLGdCQUFnQixFQUNuQjtnQkFDRixpQkFBSSxDQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQUUsMEJBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUIsc0JBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1NBQzdCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxFRCw0QkFrRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB0ZW1wbGF0ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4uL2UyZS9zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxudHlwZSBXb3Jrc3BhY2VTY2hlbWEgPSBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYTtcblxuLy8gVE9ETzogdXNlIEpzb25BU1Rcbi8vIGZ1bmN0aW9uIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QoXG4vLyAgIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbi8vICAgbm9kZTogSnNvbkFzdE9iamVjdCxcbi8vICAgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4vLyAgIHZhbHVlOiBKc29uVmFsdWUsXG4vLyAgIGluZGVudCA9IDQsXG4vLyApIHtcbi8vICAgY29uc3QgaW5kZW50U3RyID0gJ1xcbicgKyBuZXcgQXJyYXkoaW5kZW50ICsgMSkuam9pbignICcpO1xuXG4vLyAgIGlmIChub2RlLnByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuLy8gICAgIC8vIEluc2VydCBjb21tYS5cbi8vICAgICBjb25zdCBsYXN0ID0gbm9kZS5wcm9wZXJ0aWVzW25vZGUucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbi8vICAgICByZWNvcmRlci5pbnNlcnRSaWdodChsYXN0LnN0YXJ0Lm9mZnNldCArIGxhc3QudGV4dC5yZXBsYWNlKC9cXHMrJC8sICcnKS5sZW5ndGgsICcsJyk7XG4vLyAgIH1cblxuLy8gICByZWNvcmRlci5pbnNlcnRMZWZ0KFxuLy8gICAgIG5vZGUuZW5kLm9mZnNldCAtIDEsXG4vLyAgICAgJyAgJ1xuLy8gICAgICsgYFwiJHtwcm9wZXJ0eU5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLnJlcGxhY2UoL1xcbi9nLCBpbmRlbnRTdHIpfWBcbi8vICAgICArIGluZGVudFN0ci5zbGljZSgwLCAtMiksXG4vLyAgICk7XG4vLyB9XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIHdvcmtzcGFjZSBmaWxlYCk7XG4gICAgLy8gVE9ETzogdXNlIEpzb25BU1RcbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VQYXRoID0gJy9hbmd1bGFyLmpzb24nO1xuICAgIC8vIGNvbnN0IHdvcmtzcGFjZUJ1ZmZlciA9IGhvc3QucmVhZCh3b3Jrc3BhY2VQYXRoKTtcbiAgICAvLyBpZiAod29ya3NwYWNlQnVmZmVyID09PSBudWxsKSB7XG4gICAgLy8gICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KSBub3QgZm91bmQuYCk7XG4gICAgLy8gfVxuICAgIC8vIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBwYXJzZUpzb24od29ya3NwYWNlQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAgIC8vIGlmICh3b3Jrc3BhY2VKc29uLnZhbHVlID09PSBudWxsKSB7XG4gICAgLy8gICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5hYmxlIHRvIHBhcnNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkuYCk7XG4gICAgLy8gfVxuICAgIGNvbnN0IHByb2plY3RSb290ID0gYCR7d29ya3NwYWNlLm5ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBjb25zdCBwcm9qZWN0OiBhbnkgPSB7XG4gICAgICByb290OiBwcm9qZWN0Um9vdCxcbiAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgY2xpOiB7fSxcbiAgICAgIHNjaGVtYXRpY3M6IHt9LFxuICAgICAgYXJjaGl0ZWN0OiB7XG4gICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmJyb3dzZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5uYW1lfWAsXG4gICAgICAgICAgICBpbmRleDogYCR7cHJvamVjdFJvb3R9L3NyYy9pbmRleC5odG1sYCxcbiAgICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fS9zcmMvbWFpbi50c2AsXG4gICAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fS9zcmMvcG9seWZpbGxzLnRzYCxcbiAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgYXNzZXRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnbG9iOiAnZmF2aWNvbi5pY28nLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy4vJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L2Fzc2V0cz5gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJ2Fzc2V0cycsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3NyYy9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBzZXJ2ZToge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazpkZXYtc2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgICdleHRyYWN0LWkxOG4nOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmV4dHJhY3QtaTE4bicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazprYXJtYScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9L3NyYy90ZXN0LnRzYCxcbiAgICAgICAgICAgIHBvbHlmaWxsczogYCR7cHJvamVjdFJvb3R9L3NyYy9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fS90c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fS9rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgICAgIHN0eWxlczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgICBhc3NldHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICdmYXZpY29uLmljbycsXG4gICAgICAgICAgICAgICAgaW5wdXQ6IGAke3Byb2plY3RSb290fS9gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy4vJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L2Fzc2V0c2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgbGludDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazp0c2xpbnQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICAgIGAke3Byb2plY3RSb290fS90c2NvbmZpZy5hcHAuanNvbmAsXG4gICAgICAgICAgICAgIGAke3Byb2plY3RSb290fS90c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIC8vIGNvbnN0IHByb2plY3RzOiBKc29uT2JqZWN0ID0gKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMgfHwge307XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIC8vIGlmICghKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMpIHtcbiAgICAvLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAvLyAgICg8YW55PiB3b3Jrc3BhY2VBc3QudmFsdWUpLnByb2plY3RzID0gcHJvamVjdHM7XG4gICAgLy8gfVxuXG4gICAgd29ya3NwYWNlLnByb2plY3RzW29wdGlvbnMubmFtZV0gPSBwcm9qZWN0O1xuICAgIGhvc3Qub3ZlcndyaXRlKGdldFdvcmtzcGFjZVBhdGgoaG9zdCksIEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZSwgbnVsbCwgMikpO1xuICB9O1xufVxuY29uc3QgcHJvamVjdE5hbWVSZWdleHAgPSAvXlthLXpBLVpdWy4wLTlhLXpBLVpdKigtWy4wLTlhLXpBLVpdKikqJC87XG5jb25zdCB1bnN1cHBvcnRlZFByb2plY3ROYW1lcyA9IFsndGVzdCcsICdlbWJlcicsICdlbWJlci1jbGknLCAndmVuZG9yJywgJ2FwcCddO1xuXG5mdW5jdGlvbiBnZXRSZWdFeHBGYWlsUG9zaXRpb24oc3RyOiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGFydHMgPSBzdHIuaW5kZXhPZignLScpID49IDAgPyBzdHIuc3BsaXQoJy0nKSA6IFtzdHJdO1xuICBjb25zdCBtYXRjaGVkOiBzdHJpbmdbXSA9IFtdO1xuXG4gIHBhcnRzLmZvckVhY2gocGFydCA9PiB7XG4gICAgaWYgKHBhcnQubWF0Y2gocHJvamVjdE5hbWVSZWdleHApKSB7XG4gICAgICBtYXRjaGVkLnB1c2gocGFydCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBjb21wYXJlID0gbWF0Y2hlZC5qb2luKCctJyk7XG5cbiAgcmV0dXJuIChzdHIgIT09IGNvbXBhcmUpID8gY29tcGFyZS5sZW5ndGggOiBudWxsO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZVByb2plY3ROYW1lKHByb2plY3ROYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgZXJyb3JJbmRleCA9IGdldFJlZ0V4cEZhaWxQb3NpdGlvbihwcm9qZWN0TmFtZSk7XG4gIGlmIChlcnJvckluZGV4ICE9PSBudWxsKSB7XG4gICAgY29uc3QgZmlyc3RNZXNzYWdlID0gdGFncy5vbmVMaW5lYFxuICAgICAgUHJvamVjdCBuYW1lIFwiJHtwcm9qZWN0TmFtZX1cIiBpcyBub3QgdmFsaWQuIE5ldyBwcm9qZWN0IG5hbWVzIG11c3RcbiAgICAgIHN0YXJ0IHdpdGggYSBsZXR0ZXIsIGFuZCBtdXN0IGNvbnRhaW4gb25seSBhbHBoYW51bWVyaWMgY2hhcmFjdGVycyBvciBkYXNoZXMuXG4gICAgICBXaGVuIGFkZGluZyBhIGRhc2ggdGhlIHNlZ21lbnQgYWZ0ZXIgdGhlIGRhc2ggbXVzdCBhbHNvIHN0YXJ0IHdpdGggYSBsZXR0ZXIuXG4gICAgYDtcbiAgICBjb25zdCBtc2cgPSB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgJHtmaXJzdE1lc3NhZ2V9XG4gICAgICAke3Byb2plY3ROYW1lfVxuICAgICAgJHtBcnJheShlcnJvckluZGV4ICsgMSkuam9pbignICcpICsgJ14nfVxuICAgIGA7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24obXNnKTtcbiAgfSBlbHNlIGlmICh1bnN1cHBvcnRlZFByb2plY3ROYW1lcy5pbmRleE9mKHByb2plY3ROYW1lKSAhPT0gLTEpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBuYW1lIFwiJHtwcm9qZWN0TmFtZX1cIiBpcyBub3QgYSBzdXBwb3J0ZWQgbmFtZS5gKTtcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgdmFsaWRhdGVQcm9qZWN0TmFtZShvcHRpb25zLm5hbWUpO1xuICAgIGNvbnN0IGFwcFJvb3RTZWxlY3RvciA9IGAke29wdGlvbnMucHJlZml4IHx8ICdhcHAnfS1yb290YDtcbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zID0ge1xuICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgIHNwZWM6ICFvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgIHN0eWxlZXh0OiBvcHRpb25zLnN0eWxlLFxuICAgIH07XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG4gICAgY29uc3QgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7YXBwRGlyfS9zcmMvYXBwYDtcblxuICAgIGNvbnN0IGUyZU9wdGlvbnM6IEUyZU9wdGlvbnMgPSB7XG4gICAgICBuYW1lOiBgJHtvcHRpb25zLm5hbWV9LWUyZWAsXG4gICAgICByZWxhdGVkQXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgcm9vdFNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgfTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAnZG90JzogJy4nLFxuICAgICAgICAgICAgYXBwRGlyLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSkpLFxuICAgICAgc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNwZWM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc2tpcEltcG9ydDogdHJ1ZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vb3RoZXItZmlsZXMnKSwgW1xuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPyBmaWx0ZXIocGF0aCA9PiAhcGF0aC5lbmRzV2l0aCgnLmh0bWwnKSkgOiBub29wKCksXG4gICAgICAgICAgIWNvbXBvbmVudE9wdGlvbnMuc3BlYyA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cycpKSA6IG5vb3AoKSxcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMgYXMgYW55LCAgLy8gdHNsaW50OmRpc2FibGUtbGluZTpuby1hbnlcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgICAgXSksIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlKSxcbiAgICAgIHNjaGVtYXRpYygnZTJlJywgZTJlT3B0aW9ucyksXG4gICAgXSkoaG9zdCwgY29udGV4dCk7XG4gIH07XG59XG4iXX0=