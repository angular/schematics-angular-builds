"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const dependencies_1 = require("../utility/dependencies");
const latest_versions_1 = require("../utility/latest-versions");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const paths_1 = require("../utility/paths");
const project_targets_1 = require("../utility/project-targets");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
function updateConfigFile(options, tsConfigDirectory) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        var _a;
        const clientProject = workspace.projects.get(options.project);
        if (clientProject) {
            // In case the browser builder hashes the assets
            // we need to add this setting to the server builder
            // as otherwise when assets it will be requested twice.
            // One for the server which will be unhashed, and other on the client which will be hashed.
            const getServerOptions = (options = {}) => {
                return {
                    outputHashing: (options === null || options === void 0 ? void 0 : options.outputHashing) === 'all' ? 'media' : options === null || options === void 0 ? void 0 : options.outputHashing,
                    fileReplacements: options === null || options === void 0 ? void 0 : options.fileReplacements,
                    optimization: (options === null || options === void 0 ? void 0 : options.optimization) === undefined ? undefined : !!(options === null || options === void 0 ? void 0 : options.optimization),
                    sourceMap: options === null || options === void 0 ? void 0 : options.sourceMap,
                    localization: options === null || options === void 0 ? void 0 : options.localization,
                    stylePreprocessorOptions: options === null || options === void 0 ? void 0 : options.stylePreprocessorOptions,
                    resourcesOutputPath: options === null || options === void 0 ? void 0 : options.resourcesOutputPath,
                    deployUrl: options === null || options === void 0 ? void 0 : options.deployUrl,
                    i18nMissingTranslation: options === null || options === void 0 ? void 0 : options.i18nMissingTranslation,
                    preserveSymlinks: options === null || options === void 0 ? void 0 : options.preserveSymlinks,
                    extractLicenses: options === null || options === void 0 ? void 0 : options.extractLicenses,
                    inlineStyleLanguage: options === null || options === void 0 ? void 0 : options.inlineStyleLanguage,
                };
            };
            const buildTarget = clientProject.targets.get('build');
            if (buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.options) {
                buildTarget.options.outputPath = `dist/${options.project}/browser`;
            }
            const buildConfigurations = buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.configurations;
            const configurations = {};
            if (buildConfigurations) {
                for (const [key, options] of Object.entries(buildConfigurations)) {
                    configurations[key] = getServerOptions(options);
                }
            }
            const mainPath = options.main;
            const sourceRoot = (_a = clientProject.sourceRoot) !== null && _a !== void 0 ? _a : (0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src');
            const serverTsConfig = (0, core_1.join)(tsConfigDirectory, 'tsconfig.server.json');
            clientProject.targets.add({
                name: 'server',
                builder: workspace_models_1.Builders.Server,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${options.project}/server`,
                    main: (0, core_1.join)((0, core_1.normalize)(sourceRoot), mainPath.endsWith('.ts') ? mainPath : mainPath + '.ts'),
                    tsConfig: serverTsConfig,
                    ...((buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.options) ? getServerOptions(buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.options) : {}),
                },
                configurations,
            });
        }
    });
}
function findBrowserModuleImport(host, modulePath) {
    const moduleFileText = host.readText(modulePath);
    const source = ts.createSourceFile(modulePath, moduleFileText, ts.ScriptTarget.Latest, true);
    const decoratorMetadata = (0, ast_utils_1.getDecoratorMetadata)(source, 'NgModule', '@angular/core')[0];
    const browserModuleNode = (0, ast_utils_1.findNode)(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');
    if (browserModuleNode === null) {
        throw new schematics_1.SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
    }
    return browserModuleNode;
}
function wrapBootstrapCall(mainFile) {
    return (host) => {
        const mainPath = (0, core_1.normalize)('/' + mainFile);
        let bootstrapCall = (0, ng_ast_utils_1.findBootstrapModuleCall)(host, mainPath);
        if (bootstrapCall === null) {
            throw new schematics_1.SchematicsException('Bootstrap module not found.');
        }
        let bootstrapCallExpression = null;
        let currentCall = bootstrapCall;
        while (bootstrapCallExpression === null && currentCall.parent) {
            currentCall = currentCall.parent;
            if (ts.isExpressionStatement(currentCall) || ts.isVariableStatement(currentCall)) {
                bootstrapCallExpression = currentCall;
            }
        }
        bootstrapCall = currentCall;
        // In case the bootstrap code is a variable statement
        // we need to determine it's usage
        if (bootstrapCallExpression && ts.isVariableStatement(bootstrapCallExpression)) {
            const declaration = bootstrapCallExpression.declarationList.declarations[0];
            const bootstrapVar = declaration.name.text;
            const sf = bootstrapCallExpression.getSourceFile();
            bootstrapCall = findCallExpressionNode(sf, bootstrapVar) || currentCall;
        }
        // indent contents
        const triviaWidth = bootstrapCall.getLeadingTriviaWidth();
        const beforeText = `function bootstrap() {\n` + ' '.repeat(triviaWidth > 2 ? triviaWidth + 1 : triviaWidth);
        const afterText = `\n${triviaWidth > 2 ? ' '.repeat(triviaWidth - 1) : ''}};\n` +
            `

 if (document.readyState === 'complete') {
   bootstrap();
 } else {
   document.addEventListener('DOMContentLoaded', bootstrap);
 }
 `;
        // in some cases we need to cater for a trailing semicolon such as;
        // bootstrap().catch(err => console.log(err));
        const lastToken = bootstrapCall.parent.getLastToken();
        let endPos = bootstrapCall.getEnd();
        if (lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken) {
            endPos = lastToken.getEnd();
        }
        const recorder = host.beginUpdate(mainPath);
        recorder.insertLeft(bootstrapCall.getStart(), beforeText);
        recorder.insertRight(endPos, afterText);
        host.commitUpdate(recorder);
    };
}
function findCallExpressionNode(node, text) {
    if (ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === text) {
        return node;
    }
    let foundNode = null;
    ts.forEachChild(node, (childNode) => {
        foundNode = findCallExpressionNode(childNode, text);
        if (foundNode) {
            return true;
        }
    });
    return foundNode;
}
function addServerTransition(options, mainFile, clientProjectRoot) {
    return (host) => {
        const mainPath = (0, core_1.normalize)('/' + mainFile);
        const bootstrapModuleRelativePath = (0, ng_ast_utils_1.findBootstrapModulePath)(host, mainPath);
        const bootstrapModulePath = (0, core_1.normalize)(`/${clientProjectRoot}/src/${bootstrapModuleRelativePath}.ts`);
        const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
        const appId = options.appId;
        const transitionCall = `.withServerTransition({ appId: '${appId}' })`;
        const position = browserModuleImport.pos + browserModuleImport.getFullText().length;
        const transitionCallChange = new change_1.InsertChange(bootstrapModulePath, position, transitionCall);
        const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
        transitionCallRecorder.insertLeft(transitionCallChange.pos, transitionCallChange.toAdd);
        host.commitUpdate(transitionCallRecorder);
    };
}
function addDependencies() {
    return (host) => {
        const coreDep = (0, dependencies_1.getPackageJsonDependency)(host, '@angular/core');
        if (coreDep === null) {
            throw new schematics_1.SchematicsException('Could not find version.');
        }
        const platformServerDep = {
            ...coreDep,
            name: '@angular/platform-server',
        };
        (0, dependencies_1.addPackageJsonDependency)(host, platformServerDep);
        (0, dependencies_1.addPackageJsonDependency)(host, {
            type: dependencies_1.NodeDependencyType.Dev,
            name: '@types/node',
            version: latest_versions_1.latestVersions['@types/node'],
        });
    };
}
function default_1(options) {
    return async (host, context) => {
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const clientProject = workspace.projects.get(options.project);
        if (!clientProject || clientProject.extensions.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Universal requires a project type of "application".`);
        }
        const clientBuildTarget = clientProject.targets.get('build');
        if (!clientBuildTarget) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const clientBuildOptions = (clientBuildTarget.options ||
            {});
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files/src'), [
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                ...options,
                stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                hasLocalizePackage: !!(0, dependencies_1.getPackageJsonDependency)(host, '@angular/localize'),
            }),
            (0, schematics_1.move)((0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src')),
        ]);
        const clientTsConfig = (0, core_1.normalize)(clientBuildOptions.tsConfig);
        const tsConfigExtends = (0, core_1.basename)(clientTsConfig);
        const tsConfigDirectory = (0, core_1.dirname)(clientTsConfig);
        const rootSource = (0, schematics_1.apply)((0, schematics_1.url)('./files/root'), [
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                ...options,
                stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                tsConfigExtends,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(tsConfigDirectory),
            }),
            (0, schematics_1.move)(tsConfigDirectory),
        ]);
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(templateSource),
            (0, schematics_1.mergeWith)(rootSource),
            addDependencies(),
            updateConfigFile(options, tsConfigDirectory),
            wrapBootstrapCall(clientBuildOptions.main),
            addServerTransition(options, clientBuildOptions.main, clientProject.root),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBMkY7QUFDM0YsMkRBWW9DO0FBQ3BDLDREQUEwRTtBQUMxRSxrR0FBb0Y7QUFDcEYsb0RBQXNFO0FBQ3RFLDhDQUFpRDtBQUNqRCwwREFJaUM7QUFDakMsZ0VBQTREO0FBQzVELDBEQUEyRjtBQUMzRiw0Q0FBK0Q7QUFDL0QsZ0VBQXNFO0FBQ3RFLG9EQUFxRTtBQUNyRSxrRUFBOEU7QUFHOUUsU0FBUyxnQkFBZ0IsQ0FBQyxPQUF5QixFQUFFLGlCQUF1QjtJQUMxRSxPQUFPLElBQUEsMkJBQWUsRUFBQyxDQUFDLFNBQVMsRUFBRSxFQUFFOztRQUNuQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsSUFBSSxhQUFhLEVBQUU7WUFDakIsZ0RBQWdEO1lBQ2hELG9EQUFvRDtZQUNwRCx1REFBdUQ7WUFDdkQsMkZBQTJGO1lBQzNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxVQUFpRCxFQUFFLEVBQU0sRUFBRTtnQkFDbkYsT0FBTztvQkFDTCxhQUFhLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsYUFBYSxNQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsYUFBYTtvQkFDbEYsZ0JBQWdCLEVBQUUsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLGdCQUFnQjtvQkFDM0MsWUFBWSxFQUFFLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FB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LGVBQWU7Z0JBQ2YsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxpQkFBaUIsQ0FBQzthQUM1RSxDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLGlCQUFpQixDQUFDO1NBQ3hCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQztZQUN6QixJQUFBLHNCQUFTLEVBQUMsVUFBVSxDQUFDO1lBQ3JCLGVBQWUsRUFBRTtZQUNqQixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDNUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQzFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdkRELDRCQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUsIFBhdGgsIGJhc2VuYW1lLCBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgZmluZE5vZGUsIGdldERlY29yYXRvck1ldGFkYXRhIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHtcbiAgTm9kZURlcGVuZGVuY3lUeXBlLFxuICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG4gIGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbn0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbCwgZmluZEJvb3RzdHJhcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVW5pdmVyc2FsT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeTogUGF0aCk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuXG4gICAgaWYgKGNsaWVudFByb2plY3QpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIGJyb3dzZXIgYnVpbGRlciBoYXNoZXMgdGhlIGFzc2V0c1xuICAgICAgLy8gd2UgbmVlZCB0byBhZGQgdGhpcyBzZXR0aW5nIHRvIHRoZSBzZXJ2ZXIgYnVpbGRlclxuICAgICAgLy8gYXMgb3RoZXJ3aXNlIHdoZW4gYXNzZXRzIGl0IHdpbGwgYmUgcmVxdWVzdGVkIHR3aWNlLlxuICAgICAgLy8gT25lIGZvciB0aGUgc2VydmVyIHdoaWNoIHdpbGwgYmUgdW5oYXNoZWQsIGFuZCBvdGhlciBvbiB0aGUgY2xpZW50IHdoaWNoIHdpbGwgYmUgaGFzaGVkLlxuICAgICAgY29uc3QgZ2V0U2VydmVyT3B0aW9ucyA9IChvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBKc29uVmFsdWUgfCB1bmRlZmluZWQ+ID0ge30pOiB7fSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb3V0cHV0SGFzaGluZzogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyA9PT0gJ2FsbCcgPyAnbWVkaWEnIDogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyxcbiAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBvcHRpb25zPy5maWxlUmVwbGFjZW1lbnRzLFxuICAgICAgICAgIG9wdGltaXphdGlvbjogb3B0aW9ucz8ub3B0aW1pemF0aW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAhIW9wdGlvbnM/Lm9wdGltaXphdGlvbixcbiAgICAgICAgICBzb3VyY2VNYXA6IG9wdGlvbnM/LnNvdXJjZU1hcCxcbiAgICAgICAgICBsb2NhbGl6YXRpb246IG9wdGlvbnM/LmxvY2FsaXphdGlvbixcbiAgICAgICAgICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IG9wdGlvbnM/LnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucyxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBvcHRpb25zPy5yZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICAgIGRlcGxveVVybDogb3B0aW9ucz8uZGVwbG95VXJsLFxuICAgICAgICAgIGkxOG5NaXNzaW5nVHJhbnNsYXRpb246IG9wdGlvbnM/LmkxOG5NaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgICAgICAgcHJlc2VydmVTeW1saW5rczogb3B0aW9ucz8ucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IG9wdGlvbnM/LmV4dHJhY3RMaWNlbnNlcyxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlOiBvcHRpb25zPy5pbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgICAgaWYgKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSB7XG4gICAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMub3V0cHV0UGF0aCA9IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9icm93c2VyYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRDb25maWd1cmF0aW9ucyA9IGJ1aWxkVGFyZ2V0Py5jb25maWd1cmF0aW9ucztcbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGlmIChidWlsZENvbmZpZ3VyYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb3B0aW9uc10gb2YgT2JqZWN0LmVudHJpZXMoYnVpbGRDb25maWd1cmF0aW9ucykpIHtcbiAgICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0gZ2V0U2VydmVyT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtYWluUGF0aCA9IG9wdGlvbnMubWFpbiBhcyBzdHJpbmc7XG4gICAgICBjb25zdCBzb3VyY2VSb290ID0gY2xpZW50UHJvamVjdC5zb3VyY2VSb290ID8/IGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKTtcbiAgICAgIGNvbnN0IHNlcnZlclRzQ29uZmlnID0gam9pbih0c0NvbmZpZ0RpcmVjdG9yeSwgJ3RzY29uZmlnLnNlcnZlci5qc29uJyk7XG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ3NlcnZlcicsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9zZXJ2ZXJgLFxuICAgICAgICAgIG1haW46IGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aC5lbmRzV2l0aCgnLnRzJykgPyBtYWluUGF0aCA6IG1haW5QYXRoICsgJy50cycpLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgICAuLi4oYnVpbGRUYXJnZXQ/Lm9wdGlvbnMgPyBnZXRTZXJ2ZXJPcHRpb25zKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSA6IHt9KSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnMsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0OiBUcmVlLCBtb2R1bGVQYXRoOiBzdHJpbmcpOiB0cy5Ob2RlIHtcbiAgY29uc3QgbW9kdWxlRmlsZVRleHQgPSBob3N0LnJlYWRUZXh0KG1vZHVsZVBhdGgpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKG1vZHVsZVBhdGgsIG1vZHVsZUZpbGVUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICBjb25zdCBkZWNvcmF0b3JNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKHNvdXJjZSwgJ05nTW9kdWxlJywgJ0Bhbmd1bGFyL2NvcmUnKVswXTtcbiAgY29uc3QgYnJvd3Nlck1vZHVsZU5vZGUgPSBmaW5kTm9kZShkZWNvcmF0b3JNZXRhZGF0YSwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCAnQnJvd3Nlck1vZHVsZScpO1xuXG4gIGlmIChicm93c2VyTW9kdWxlTm9kZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDYW5ub3QgZmluZCBCcm93c2VyTW9kdWxlIGltcG9ydCBpbiAke21vZHVsZVBhdGh9YCk7XG4gIH1cblxuICByZXR1cm4gYnJvd3Nlck1vZHVsZU5vZGU7XG59XG5cbmZ1bmN0aW9uIHdyYXBCb290c3RyYXBDYWxsKG1haW5GaWxlOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgbWFpblBhdGggPSBub3JtYWxpemUoJy8nICsgbWFpbkZpbGUpO1xuICAgIGxldCBib290c3RyYXBDYWxsOiB0cy5Ob2RlIHwgbnVsbCA9IGZpbmRCb290c3RyYXBNb2R1bGVDYWxsKGhvc3QsIG1haW5QYXRoKTtcbiAgICBpZiAoYm9vdHN0cmFwQ2FsbCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0Jvb3RzdHJhcCBtb2R1bGUgbm90IGZvdW5kLicpO1xuICAgIH1cblxuICAgIGxldCBib290c3RyYXBDYWxsRXhwcmVzc2lvbjogdHMuTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIGxldCBjdXJyZW50Q2FsbCA9IGJvb3RzdHJhcENhbGw7XG4gICAgd2hpbGUgKGJvb3RzdHJhcENhbGxFeHByZXNzaW9uID09PSBudWxsICYmIGN1cnJlbnRDYWxsLnBhcmVudCkge1xuICAgICAgY3VycmVudENhbGwgPSBjdXJyZW50Q2FsbC5wYXJlbnQ7XG4gICAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGN1cnJlbnRDYWxsKSB8fCB0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KGN1cnJlbnRDYWxsKSkge1xuICAgICAgICBib290c3RyYXBDYWxsRXhwcmVzc2lvbiA9IGN1cnJlbnRDYWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBib290c3RyYXBDYWxsID0gY3VycmVudENhbGw7XG5cbiAgICAvLyBJbiBjYXNlIHRoZSBib290c3RyYXAgY29kZSBpcyBhIHZhcmlhYmxlIHN0YXRlbWVudFxuICAgIC8vIHdlIG5lZWQgdG8gZGV0ZXJtaW5lIGl0J3MgdXNhZ2VcbiAgICBpZiAoYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24gJiYgdHMuaXNWYXJpYWJsZVN0YXRlbWVudChib290c3RyYXBDYWxsRXhwcmVzc2lvbikpIHtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24uZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXTtcbiAgICAgIGNvbnN0IGJvb3RzdHJhcFZhciA9IChkZWNsYXJhdGlvbi5uYW1lIGFzIHRzLklkZW50aWZpZXIpLnRleHQ7XG4gICAgICBjb25zdCBzZiA9IGJvb3RzdHJhcENhbGxFeHByZXNzaW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGJvb3RzdHJhcENhbGwgPSBmaW5kQ2FsbEV4cHJlc3Npb25Ob2RlKHNmLCBib290c3RyYXBWYXIpIHx8IGN1cnJlbnRDYWxsO1xuICAgIH1cblxuICAgIC8vIGluZGVudCBjb250ZW50c1xuICAgIGNvbnN0IHRyaXZpYVdpZHRoID0gYm9vdHN0cmFwQ2FsbC5nZXRMZWFkaW5nVHJpdmlhV2lkdGgoKTtcbiAgICBjb25zdCBiZWZvcmVUZXh0ID1cbiAgICAgIGBmdW5jdGlvbiBib290c3RyYXAoKSB7XFxuYCArICcgJy5yZXBlYXQodHJpdmlhV2lkdGggPiAyID8gdHJpdmlhV2lkdGggKyAxIDogdHJpdmlhV2lkdGgpO1xuICAgIGNvbnN0IGFmdGVyVGV4dCA9XG4gICAgICBgXFxuJHt0cml2aWFXaWR0aCA+IDIgPyAnICcucmVwZWF0KHRyaXZpYVdpZHRoIC0gMSkgOiAnJ319O1xcbmAgK1xuICAgICAgYFxuXG4gaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgIGJvb3RzdHJhcCgpO1xuIH0gZWxzZSB7XG4gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgYm9vdHN0cmFwKTtcbiB9XG4gYDtcblxuICAgIC8vIGluIHNvbWUgY2FzZXMgd2UgbmVlZCB0byBjYXRlciBmb3IgYSB0cmFpbGluZyBzZW1pY29sb24gc3VjaCBhcztcbiAgICAvLyBib290c3RyYXAoKS5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG4gICAgY29uc3QgbGFzdFRva2VuID0gYm9vdHN0cmFwQ2FsbC5wYXJlbnQuZ2V0TGFzdFRva2VuKCk7XG4gICAgbGV0IGVuZFBvcyA9IGJvb3RzdHJhcENhbGwuZ2V0RW5kKCk7XG4gICAgaWYgKGxhc3RUb2tlbiAmJiBsYXN0VG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TZW1pY29sb25Ub2tlbikge1xuICAgICAgZW5kUG9zID0gbGFzdFRva2VuLmdldEVuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtYWluUGF0aCk7XG4gICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChib290c3RyYXBDYWxsLmdldFN0YXJ0KCksIGJlZm9yZVRleHQpO1xuICAgIHJlY29yZGVyLmluc2VydFJpZ2h0KGVuZFBvcywgYWZ0ZXJUZXh0KTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUobm9kZTogdHMuTm9kZSwgdGV4dDogc3RyaW5nKTogdHMuTm9kZSB8IG51bGwge1xuICBpZiAoXG4gICAgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSAmJlxuICAgIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09IHRleHRcbiAgKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBsZXQgZm91bmROb2RlOiB0cy5Ob2RlIHwgbnVsbCA9IG51bGw7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCAoY2hpbGROb2RlKSA9PiB7XG4gICAgZm91bmROb2RlID0gZmluZENhbGxFeHByZXNzaW9uTm9kZShjaGlsZE5vZGUsIHRleHQpO1xuXG4gICAgaWYgKGZvdW5kTm9kZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gZm91bmROb2RlO1xufVxuXG5mdW5jdGlvbiBhZGRTZXJ2ZXJUcmFuc2l0aW9uKFxuICBvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zLFxuICBtYWluRmlsZTogc3RyaW5nLFxuICBjbGllbnRQcm9qZWN0Um9vdDogc3RyaW5nLFxuKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1haW5QYXRoID0gbm9ybWFsaXplKCcvJyArIG1haW5GaWxlKTtcblxuICAgIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aCA9IGZpbmRCb290c3RyYXBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCBib290c3RyYXBNb2R1bGVQYXRoID0gbm9ybWFsaXplKFxuICAgICAgYC8ke2NsaWVudFByb2plY3RSb290fS9zcmMvJHtib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGh9LnRzYCxcbiAgICApO1xuXG4gICAgY29uc3QgYnJvd3Nlck1vZHVsZUltcG9ydCA9IGZpbmRCcm93c2VyTW9kdWxlSW1wb3J0KGhvc3QsIGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGFwcElkID0gb3B0aW9ucy5hcHBJZDtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbCA9IGAud2l0aFNlcnZlclRyYW5zaXRpb24oeyBhcHBJZDogJyR7YXBwSWR9JyB9KWA7XG4gICAgY29uc3QgcG9zaXRpb24gPSBicm93c2VyTW9kdWxlSW1wb3J0LnBvcyArIGJyb3dzZXJNb2R1bGVJbXBvcnQuZ2V0RnVsbFRleHQoKS5sZW5ndGg7XG4gICAgY29uc3QgdHJhbnNpdGlvbkNhbGxDaGFuZ2UgPSBuZXcgSW5zZXJ0Q2hhbmdlKGJvb3RzdHJhcE1vZHVsZVBhdGgsIHBvc2l0aW9uLCB0cmFuc2l0aW9uQ2FsbCk7XG5cbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbFJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShib290c3RyYXBNb2R1bGVQYXRoKTtcbiAgICB0cmFuc2l0aW9uQ2FsbFJlY29yZGVyLmluc2VydExlZnQodHJhbnNpdGlvbkNhbGxDaGFuZ2UucG9zLCB0cmFuc2l0aW9uQ2FsbENoYW5nZS50b0FkZCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUodHJhbnNpdGlvbkNhbGxSZWNvcmRlcik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgY29yZURlcCA9IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvY29yZScpO1xuICAgIGlmIChjb3JlRGVwID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgdmVyc2lvbi4nKTtcbiAgICB9XG4gICAgY29uc3QgcGxhdGZvcm1TZXJ2ZXJEZXAgPSB7XG4gICAgICAuLi5jb3JlRGVwLFxuICAgICAgbmFtZTogJ0Bhbmd1bGFyL3BsYXRmb3JtLXNlcnZlcicsXG4gICAgfTtcbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgcGxhdGZvcm1TZXJ2ZXJEZXApO1xuXG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHtcbiAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICBuYW1lOiAnQHR5cGVzL25vZGUnLFxuICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ0B0eXBlcy9ub2RlJ10sXG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcblxuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFjbGllbnRQcm9qZWN0IHx8IGNsaWVudFByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFVuaXZlcnNhbCByZXF1aXJlcyBhIHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50QnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghY2xpZW50QnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkT3B0aW9ucyA9IChjbGllbnRCdWlsZFRhcmdldC5vcHRpb25zIHx8XG4gICAgICB7fSkgYXMgdW5rbm93biBhcyBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcy9zcmMnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgaGFzTG9jYWxpemVQYWNrYWdlOiAhIWdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvbG9jYWxpemUnKSxcbiAgICAgIH0pLFxuICAgICAgbW92ZShqb2luKG5vcm1hbGl6ZShjbGllbnRQcm9qZWN0LnJvb3QpLCAnc3JjJykpLFxuICAgIF0pO1xuXG4gICAgY29uc3QgY2xpZW50VHNDb25maWcgPSBub3JtYWxpemUoY2xpZW50QnVpbGRPcHRpb25zLnRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0V4dGVuZHMgPSBiYXNlbmFtZShjbGllbnRUc0NvbmZpZyk7XG4gICAgY29uc3QgdHNDb25maWdEaXJlY3RvcnkgPSBkaXJuYW1lKGNsaWVudFRzQ29uZmlnKTtcblxuICAgIGNvbnN0IHJvb3RTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb246IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFwudHMkLywgJycpLFxuICAgICAgICB0c0NvbmZpZ0V4dGVuZHMsXG4gICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICAgIH0pLFxuICAgICAgbW92ZSh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIG1lcmdlV2l0aChyb290U291cmNlKSxcbiAgICAgIGFkZERlcGVuZGVuY2llcygpLFxuICAgICAgdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICB3cmFwQm9vdHN0cmFwQ2FsbChjbGllbnRCdWlsZE9wdGlvbnMubWFpbiksXG4gICAgICBhZGRTZXJ2ZXJUcmFuc2l0aW9uKG9wdGlvbnMsIGNsaWVudEJ1aWxkT3B0aW9ucy5tYWluLCBjbGllbnRQcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuICB9O1xufVxuIl19