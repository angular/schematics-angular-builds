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
                                input: `${projectRoot}/assets`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9hcHBsaWNhdGlvbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUFxRDtBQUVyRCwyREFlb0M7QUFFcEMsOENBQW1FO0FBS25FLG9CQUFvQjtBQUNwQixzQ0FBc0M7QUFDdEMsOEJBQThCO0FBQzlCLHlCQUF5QjtBQUN6QiwwQkFBMEI7QUFDMUIsc0JBQXNCO0FBQ3RCLGdCQUFnQjtBQUNoQixNQUFNO0FBQ04sOERBQThEO0FBRTlELHNDQUFzQztBQUN0Qyx1QkFBdUI7QUFDdkIsZ0VBQWdFO0FBQ2hFLDJGQUEyRjtBQUMzRixNQUFNO0FBRU4seUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixXQUFXO0FBQ1gseUZBQXlGO0FBQ3pGLGdDQUFnQztBQUNoQyxPQUFPO0FBQ1AsSUFBSTtBQUVKLCtCQUErQixPQUEyQixFQUFFLFNBQTBCO0lBQ3BGLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUMvQyxvQkFBb0I7UUFDcEIseUNBQXlDO1FBQ3pDLG9EQUFvRDtRQUNwRCxrQ0FBa0M7UUFDbEMsdUZBQXVGO1FBQ3ZGLElBQUk7UUFDSiwrREFBK0Q7UUFDL0Qsc0NBQXNDO1FBQ3RDLDZGQUE2RjtRQUM3RixJQUFJO1FBQ0osTUFBTSxXQUFXLEdBQUcsR0FBRyxTQUFTLENBQUMsY0FBYyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsRSxrQ0FBa0M7UUFDbEMsTUFBTSxPQUFPLEdBQVE7WUFDbkIsSUFBSSxFQUFFLFdBQVc7WUFDakIsV0FBVyxFQUFFLGFBQWE7WUFDMUIsR0FBRyxFQUFFLEVBQUU7WUFDUCxVQUFVLEVBQUUsRUFBRTtZQUNkLFNBQVMs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QjtZQUNGLHNCQUFTLENBQ1Asa0JBQUssQ0FBQyxnQkFBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUMxQixnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDbEYsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtnQkFDNUUscUJBQVEsaUJBQ04sS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFjLElBQ2pCLFFBQVEsRUFBRSxlQUFlLElBQ3RCLGdCQUFnQixFQUNuQjtnQkFDRixpQkFBSSxDQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQUUsMEJBQWEsQ0FBQyxTQUFTLENBQUM7WUFDOUIsc0JBQVMsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDO1NBQzdCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxFRCw0QkFrRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgZXhwZXJpbWVudGFsIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB0ZW1wbGF0ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4uL2UyZS9zY2hlbWEnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxudHlwZSBXb3Jrc3BhY2VTY2hlbWEgPSBleHBlcmltZW50YWwud29ya3NwYWNlLldvcmtzcGFjZVNjaGVtYTtcblxuLy8gVE9ETzogdXNlIEpzb25BU1Rcbi8vIGZ1bmN0aW9uIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QoXG4vLyAgIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbi8vICAgbm9kZTogSnNvbkFzdE9iamVjdCxcbi8vICAgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4vLyAgIHZhbHVlOiBKc29uVmFsdWUsXG4vLyAgIGluZGVudCA9IDQsXG4vLyApIHtcbi8vICAgY29uc3QgaW5kZW50U3RyID0gJ1xcbicgKyBuZXcgQXJyYXkoaW5kZW50ICsgMSkuam9pbignICcpO1xuXG4vLyAgIGlmIChub2RlLnByb3BlcnRpZXMubGVuZ3RoID4gMCkge1xuLy8gICAgIC8vIEluc2VydCBjb21tYS5cbi8vICAgICBjb25zdCBsYXN0ID0gbm9kZS5wcm9wZXJ0aWVzW25vZGUucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbi8vICAgICByZWNvcmRlci5pbnNlcnRSaWdodChsYXN0LnN0YXJ0Lm9mZnNldCArIGxhc3QudGV4dC5yZXBsYWNlKC9cXHMrJC8sICcnKS5sZW5ndGgsICcsJyk7XG4vLyAgIH1cblxuLy8gICByZWNvcmRlci5pbnNlcnRMZWZ0KFxuLy8gICAgIG5vZGUuZW5kLm9mZnNldCAtIDEsXG4vLyAgICAgJyAgJ1xuLy8gICAgICsgYFwiJHtwcm9wZXJ0eU5hbWV9XCI6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpLnJlcGxhY2UoL1xcbi9nLCBpbmRlbnRTdHIpfWBcbi8vICAgICArIGluZGVudFN0ci5zbGljZSgwLCAtMiksXG4vLyAgICk7XG4vLyB9XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIHdvcmtzcGFjZSBmaWxlYCk7XG4gICAgLy8gVE9ETzogdXNlIEpzb25BU1RcbiAgICAvLyBjb25zdCB3b3Jrc3BhY2VQYXRoID0gJy9hbmd1bGFyLmpzb24nO1xuICAgIC8vIGNvbnN0IHdvcmtzcGFjZUJ1ZmZlciA9IGhvc3QucmVhZCh3b3Jrc3BhY2VQYXRoKTtcbiAgICAvLyBpZiAod29ya3NwYWNlQnVmZmVyID09PSBudWxsKSB7XG4gICAgLy8gICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ29uZmlndXJhdGlvbiBmaWxlICgke3dvcmtzcGFjZVBhdGh9KSBub3QgZm91bmQuYCk7XG4gICAgLy8gfVxuICAgIC8vIGNvbnN0IHdvcmtzcGFjZUpzb24gPSBwYXJzZUpzb24od29ya3NwYWNlQnVmZmVyLnRvU3RyaW5nKCkpO1xuICAgIC8vIGlmICh3b3Jrc3BhY2VKc29uLnZhbHVlID09PSBudWxsKSB7XG4gICAgLy8gICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5hYmxlIHRvIHBhcnNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHt3b3Jrc3BhY2VQYXRofSkuYCk7XG4gICAgLy8gfVxuICAgIGNvbnN0IHByb2plY3RSb290ID0gYCR7d29ya3NwYWNlLm5ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBjb25zdCBwcm9qZWN0OiBhbnkgPSB7XG4gICAgICByb290OiBwcm9qZWN0Um9vdCxcbiAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgY2xpOiB7fSxcbiAgICAgIHNjaGVtYXRpY3M6IHt9LFxuICAgICAgYXJjaGl0ZWN0OiB7XG4gICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmJyb3dzZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5uYW1lfWAsXG4gICAgICAgICAgICBpbmRleDogYCR7cHJvamVjdFJvb3R9L3NyYy9pbmRleC5odG1sYCxcbiAgICAgICAgICAgIG1haW46IGAke3Byb2plY3RSb290fS9zcmMvbWFpbi50c2AsXG4gICAgICAgICAgICBwb2x5ZmlsbHM6IGAke3Byb2plY3RSb290fS9zcmMvcG9seWZpbGxzLnRzYCxcbiAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgICAgYXNzZXRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnbG9iOiAnZmF2aWNvbi5pY28nLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH1gLFxuICAgICAgICAgICAgICAgIG91dHB1dDogJy4vJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L2Fzc2V0c2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnYXNzZXRzJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzdHlsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vc3JjL3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlcnZlOiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmRldi1zZXJ2ZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2s6ZXh0cmFjdC1pMThuJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmthcm1hJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3BvbHlmaWxscy50c2AsXG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cHJvamVjdFJvb3R9L2thcm1hLmNvbmYuanNgLFxuICAgICAgICAgICAgc3R5bGVzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIGFzc2V0czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJ2Zhdmljb24uaWNvJyxcbiAgICAgICAgICAgICAgICBpbnB1dDogYCR7cHJvamVjdFJvb3R9L2AsXG4gICAgICAgICAgICAgICAgb3V0cHV0OiAnLi8nLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgICAgICAgICAgIGlucHV0OiBgJHtwcm9qZWN0Um9vdH0vYXNzZXRzYCxcbiAgICAgICAgICAgICAgICBvdXRwdXQ6ICdhc3NldHMnLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBsaW50OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOnRzbGludCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdHNDb25maWc6IFtcbiAgICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gY29uc3QgcHJvamVjdHM6IEpzb25PYmplY3QgPSAoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cyB8fCB7fTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgLy8gaWYgKCEoPGFueT4gd29ya3NwYWNlQXN0LnZhbHVlKS5wcm9qZWN0cykge1xuICAgIC8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgIC8vICAgKDxhbnk+IHdvcmtzcGFjZUFzdC52YWx1ZSkucHJvamVjdHMgPSBwcm9qZWN0cztcbiAgICAvLyB9XG5cbiAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5uYW1lXSA9IHByb2plY3Q7XG4gICAgaG9zdC5vdmVyd3JpdGUoZ2V0V29ya3NwYWNlUGF0aChob3N0KSwgSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlLCBudWxsLCAyKSk7XG4gIH07XG59XG5jb25zdCBwcm9qZWN0TmFtZVJlZ2V4cCA9IC9eW2EtekEtWl1bLjAtOWEtekEtWl0qKC1bLjAtOWEtekEtWl0qKSokLztcbmNvbnN0IHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzID0gWyd0ZXN0JywgJ2VtYmVyJywgJ2VtYmVyLWNsaScsICd2ZW5kb3InLCAnYXBwJ107XG5cbmZ1bmN0aW9uIGdldFJlZ0V4cEZhaWxQb3NpdGlvbihzdHI6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJ0cyA9IHN0ci5pbmRleE9mKCctJykgPj0gMCA/IHN0ci5zcGxpdCgnLScpIDogW3N0cl07XG4gIGNvbnN0IG1hdGNoZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgcGFydHMuZm9yRWFjaChwYXJ0ID0+IHtcbiAgICBpZiAocGFydC5tYXRjaChwcm9qZWN0TmFtZVJlZ2V4cCkpIHtcbiAgICAgIG1hdGNoZWQucHVzaChwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGNvbXBhcmUgPSBtYXRjaGVkLmpvaW4oJy0nKTtcblxuICByZXR1cm4gKHN0ciAhPT0gY29tcGFyZSkgPyBjb21wYXJlLmxlbmd0aCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUHJvamVjdE5hbWUocHJvamVjdE5hbWU6IHN0cmluZykge1xuICBjb25zdCBlcnJvckluZGV4ID0gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHByb2plY3ROYW1lKTtcbiAgaWYgKGVycm9ySW5kZXggIT09IG51bGwpIHtcbiAgICBjb25zdCBmaXJzdE1lc3NhZ2UgPSB0YWdzLm9uZUxpbmVgXG4gICAgICBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCB2YWxpZC4gTmV3IHByb2plY3QgbmFtZXMgbXVzdFxuICAgICAgc3RhcnQgd2l0aCBhIGxldHRlciwgYW5kIG11c3QgY29udGFpbiBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIG9yIGRhc2hlcy5cbiAgICAgIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbiAgICBgO1xuICAgIGNvbnN0IG1zZyA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAke2ZpcnN0TWVzc2FnZX1cbiAgICAgICR7cHJvamVjdE5hbWV9XG4gICAgICAke0FycmF5KGVycm9ySW5kZXggKyAxKS5qb2luKCcgJykgKyAnXid9XG4gICAgYDtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihtc2cpO1xuICB9IGVsc2UgaWYgKHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzLmluZGV4T2YocHJvamVjdE5hbWUpICE9PSAtMSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCBhIHN1cHBvcnRlZCBuYW1lLmApO1xuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICB2YWxpZGF0ZVByb2plY3ROYW1lKG9wdGlvbnMubmFtZSk7XG4gICAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXggfHwgJ2FwcCd9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgICAgc3BlYzogIW9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgc3R5bGVleHQ6IG9wdGlvbnMuc3R5bGUsXG4gICAgfTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBjb25zdCBhcHBEaXIgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICBjb25zdCBzb3VyY2VEaXIgPSBgJHthcHBEaXJ9L3NyYy9hcHBgO1xuXG4gICAgY29uc3QgZTJlT3B0aW9uczogRTJlT3B0aW9ucyA9IHtcbiAgICAgIG5hbWU6IGAke29wdGlvbnMubmFtZX0tZTJlYCxcbiAgICAgIHJlbGF0ZWRBcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICByb290U2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICBhcHBEaXIsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICAgICAgcm91dGluZ1Njb3BlOiAnUm9vdCcsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc3BlYzogZmFsc2UsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9vdGhlci1maWxlcycpLCBbXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuaHRtbCcpKSA6IG5vb3AoKSxcbiAgICAgICAgICAhY29tcG9uZW50T3B0aW9ucy5zcGVjID8gZmlsdGVyKHBhdGggPT4gIXBhdGguZW5kc1dpdGgoJy5zcGVjLnRzJykpIDogbm9vcCgpLFxuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyBhcyBhbnksICAvLyB0c2xpbnQ6ZGlzYWJsZS1saW5lOm5vLWFueVxuICAgICAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShzb3VyY2VEaXIpLFxuICAgICAgICBdKSwgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUpLFxuICAgICAgc2NoZW1hdGljKCdlMmUnLCBlMmVPcHRpb25zKSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==