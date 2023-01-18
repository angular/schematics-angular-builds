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
                    vendorChunk: options === null || options === void 0 ? void 0 : options.vendorChunk,
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
        const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
        const position = browserModuleImport.pos + browserModuleImport.getFullWidth();
        const browserModuleFullImport = browserModuleImport.parent;
        if (browserModuleFullImport.getText() === 'BrowserModule.withServerTransition') {
            // Remove any existing withServerTransition as otherwise we might have incorrect configuration.
            transitionCallRecorder.remove(position, browserModuleFullImport.parent.getFullWidth() - browserModuleImport.getFullWidth());
        }
        transitionCallRecorder.insertLeft(position, `.withServerTransition({ appId: '${options.appId}' })`);
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
                hasLocalizePackage: !!(0, dependencies_1.getPackageJsonDependency)(host, '@angular/localize'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBMkY7QUFDM0YsMkRBWW9DO0FBQ3BDLDREQUEwRTtBQUMxRSxrR0FBb0Y7QUFDcEYsb0RBQXNFO0FBQ3RFLDBEQUlpQztBQUNqQyxnRUFBNEQ7QUFDNUQsMERBQTJGO0FBQzNGLDRDQUErRDtBQUMvRCxnRUFBc0U7QUFDdEUsb0RBQXFFO0FBQ3JFLGtFQUE4RTtBQUc5RSxTQUFTLGdCQUFnQixDQUFDLE9BQXlCLEVBQUUsaUJBQXVCO0lBQzFFLE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7O1FBQ25DLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5RCxJQUFJLGFBQWEsRUFBRTtZQUNqQixnREFBZ0Q7WUFDaEQsb0RBQW9EO1lBQ3BELHVEQUF1RDtZQUN2RCwyRkFBMkY7WUFDM0YsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQWlELEVBQUUsRUFBTSxFQUFFO2dCQUNuRixPQUFPO29CQUNMLGFBQWEsRUFBRSxDQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhLE1BQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhO29CQUNsRixnQkFBZ0IsRUFBRSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsZ0JBQWdCO29CQUMzQyxZQUFZLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsWUFBWSxN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LEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxlQUFlO2dCQUNmLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQztnQkFDekUsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxpQkFBaUIsQ0FBQzthQUM1RSxDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLGlCQUFpQixDQUFDO1NBQ3hCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQztZQUN6QixJQUFBLHNCQUFTLEVBQUMsVUFBVSxDQUFDO1lBQ3JCLGVBQWUsRUFBRTtZQUNqQixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDNUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQzFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdkRELDRCQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUsIFBhdGgsIGJhc2VuYW1lLCBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgZmluZE5vZGUsIGdldERlY29yYXRvck1ldGFkYXRhIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHtcbiAgTm9kZURlcGVuZGVuY3lUeXBlLFxuICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG4gIGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbn0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbCwgZmluZEJvb3RzdHJhcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVW5pdmVyc2FsT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeTogUGF0aCk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuXG4gICAgaWYgKGNsaWVudFByb2plY3QpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIGJyb3dzZXIgYnVpbGRlciBoYXNoZXMgdGhlIGFzc2V0c1xuICAgICAgLy8gd2UgbmVlZCB0byBhZGQgdGhpcyBzZXR0aW5nIHRvIHRoZSBzZXJ2ZXIgYnVpbGRlclxuICAgICAgLy8gYXMgb3RoZXJ3aXNlIHdoZW4gYXNzZXRzIGl0IHdpbGwgYmUgcmVxdWVzdGVkIHR3aWNlLlxuICAgICAgLy8gT25lIGZvciB0aGUgc2VydmVyIHdoaWNoIHdpbGwgYmUgdW5oYXNoZWQsIGFuZCBvdGhlciBvbiB0aGUgY2xpZW50IHdoaWNoIHdpbGwgYmUgaGFzaGVkLlxuICAgICAgY29uc3QgZ2V0U2VydmVyT3B0aW9ucyA9IChvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBKc29uVmFsdWUgfCB1bmRlZmluZWQ+ID0ge30pOiB7fSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb3V0cHV0SGFzaGluZzogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyA9PT0gJ2FsbCcgPyAnbWVkaWEnIDogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyxcbiAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBvcHRpb25zPy5maWxlUmVwbGFjZW1lbnRzLFxuICAgICAgICAgIG9wdGltaXphdGlvbjogb3B0aW9ucz8ub3B0aW1pemF0aW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAhIW9wdGlvbnM/Lm9wdGltaXphdGlvbixcbiAgICAgICAgICBzb3VyY2VNYXA6IG9wdGlvbnM/LnNvdXJjZU1hcCxcbiAgICAgICAgICBsb2NhbGl6YXRpb246IG9wdGlvbnM/LmxvY2FsaXphdGlvbixcbiAgICAgICAgICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IG9wdGlvbnM/LnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucyxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBvcHRpb25zPy5yZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICAgIGRlcGxveVVybDogb3B0aW9ucz8uZGVwbG95VXJsLFxuICAgICAgICAgIGkxOG5NaXNzaW5nVHJhbnNsYXRpb246IG9wdGlvbnM/LmkxOG5NaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgICAgICAgcHJlc2VydmVTeW1saW5rczogb3B0aW9ucz8ucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IG9wdGlvbnM/LmV4dHJhY3RMaWNlbnNlcyxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlOiBvcHRpb25zPy5pbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIHZlbmRvckNodW5rOiBvcHRpb25zPy52ZW5kb3JDaHVuayxcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICAgIGlmIChidWlsZFRhcmdldD8ub3B0aW9ucykge1xuICAgICAgICBidWlsZFRhcmdldC5vcHRpb25zLm91dHB1dFBhdGggPSBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vYnJvd3NlcmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlndXJhdGlvbnMgPSBidWlsZFRhcmdldD8uY29uZmlndXJhdGlvbnM7XG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBpZiAoYnVpbGRDb25maWd1cmF0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9wdGlvbnNdIG9mIE9iamVjdC5lbnRyaWVzKGJ1aWxkQ29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IGdldFNlcnZlck9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgbWFpblBhdGggPSBvcHRpb25zLm1haW4gYXMgc3RyaW5nO1xuICAgICAgY29uc3Qgc291cmNlUm9vdCA9IGNsaWVudFByb2plY3Quc291cmNlUm9vdCA/PyBqb2luKG5vcm1hbGl6ZShjbGllbnRQcm9qZWN0LnJvb3QpLCAnc3JjJyk7XG4gICAgICBjb25zdCBzZXJ2ZXJUc0NvbmZpZyA9IGpvaW4odHNDb25maWdEaXJlY3RvcnksICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicpO1xuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6ICdzZXJ2ZXInLFxuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5TZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyYCxcbiAgICAgICAgICBtYWluOiBqb2luKG5vcm1hbGl6ZShzb3VyY2VSb290KSwgbWFpblBhdGguZW5kc1dpdGgoJy50cycpID8gbWFpblBhdGggOiBtYWluUGF0aCArICcudHMnKSxcbiAgICAgICAgICB0c0NvbmZpZzogc2VydmVyVHNDb25maWcsXG4gICAgICAgICAgLi4uKGJ1aWxkVGFyZ2V0Py5vcHRpb25zID8gZ2V0U2VydmVyT3B0aW9ucyhidWlsZFRhcmdldD8ub3B0aW9ucykgOiB7fSksXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zLFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gZmluZEJyb3dzZXJNb2R1bGVJbXBvcnQoaG9zdDogVHJlZSwgbW9kdWxlUGF0aDogc3RyaW5nKTogdHMuTm9kZSB7XG4gIGNvbnN0IG1vZHVsZUZpbGVUZXh0ID0gaG9zdC5yZWFkVGV4dChtb2R1bGVQYXRoKTtcbiAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBtb2R1bGVGaWxlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgY29uc3QgZGVjb3JhdG9yTWV0YWRhdGEgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShzb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gIGNvbnN0IGJyb3dzZXJNb2R1bGVOb2RlID0gZmluZE5vZGUoZGVjb3JhdG9yTWV0YWRhdGEsIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciwgJ0Jyb3dzZXJNb2R1bGUnKTtcblxuICBpZiAoYnJvd3Nlck1vZHVsZU5vZGUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgQnJvd3Nlck1vZHVsZSBpbXBvcnQgaW4gJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJNb2R1bGVOb2RlO1xufVxuXG5mdW5jdGlvbiB3cmFwQm9vdHN0cmFwQ2FsbChtYWluRmlsZTogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1haW5QYXRoID0gbm9ybWFsaXplKCcvJyArIG1haW5GaWxlKTtcbiAgICBsZXQgYm9vdHN0cmFwQ2FsbDogdHMuTm9kZSB8IG51bGwgPSBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbChob3N0LCBtYWluUGF0aCk7XG4gICAgaWYgKGJvb3RzdHJhcENhbGwgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdCb290c3RyYXAgbW9kdWxlIG5vdCBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBsZXQgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb246IHRzLk5vZGUgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY3VycmVudENhbGwgPSBib290c3RyYXBDYWxsO1xuICAgIHdoaWxlIChib290c3RyYXBDYWxsRXhwcmVzc2lvbiA9PT0gbnVsbCAmJiBjdXJyZW50Q2FsbC5wYXJlbnQpIHtcbiAgICAgIGN1cnJlbnRDYWxsID0gY3VycmVudENhbGwucGFyZW50O1xuICAgICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChjdXJyZW50Q2FsbCkgfHwgdHMuaXNWYXJpYWJsZVN0YXRlbWVudChjdXJyZW50Q2FsbCkpIHtcbiAgICAgICAgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24gPSBjdXJyZW50Q2FsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgYm9vdHN0cmFwQ2FsbCA9IGN1cnJlbnRDYWxsO1xuXG4gICAgLy8gSW4gY2FzZSB0aGUgYm9vdHN0cmFwIGNvZGUgaXMgYSB2YXJpYWJsZSBzdGF0ZW1lbnRcbiAgICAvLyB3ZSBuZWVkIHRvIGRldGVybWluZSBpdCdzIHVzYWdlXG4gICAgaWYgKGJvb3RzdHJhcENhbGxFeHByZXNzaW9uICYmIHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGJvb3RzdHJhcENhbGxFeHByZXNzaW9uLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICBjb25zdCBib290c3RyYXBWYXIgPSAoZGVjbGFyYXRpb24ubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuICAgICAgY29uc3Qgc2YgPSBib290c3RyYXBDYWxsRXhwcmVzc2lvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBib290c3RyYXBDYWxsID0gZmluZENhbGxFeHByZXNzaW9uTm9kZShzZiwgYm9vdHN0cmFwVmFyKSB8fCBjdXJyZW50Q2FsbDtcbiAgICB9XG5cbiAgICAvLyBpbmRlbnQgY29udGVudHNcbiAgICBjb25zdCB0cml2aWFXaWR0aCA9IGJvb3RzdHJhcENhbGwuZ2V0TGVhZGluZ1RyaXZpYVdpZHRoKCk7XG4gICAgY29uc3QgYmVmb3JlVGV4dCA9XG4gICAgICBgZnVuY3Rpb24gYm9vdHN0cmFwKCkge1xcbmAgKyAnICcucmVwZWF0KHRyaXZpYVdpZHRoID4gMiA/IHRyaXZpYVdpZHRoICsgMSA6IHRyaXZpYVdpZHRoKTtcbiAgICBjb25zdCBhZnRlclRleHQgPVxuICAgICAgYFxcbiR7dHJpdmlhV2lkdGggPiAyID8gJyAnLnJlcGVhdCh0cml2aWFXaWR0aCAtIDEpIDogJyd9fTtcXG5gICtcbiAgICAgIGBcblxuIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSB7XG4gICBib290c3RyYXAoKTtcbiB9IGVsc2Uge1xuICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGJvb3RzdHJhcCk7XG4gfVxuIGA7XG5cbiAgICAvLyBpbiBzb21lIGNhc2VzIHdlIG5lZWQgdG8gY2F0ZXIgZm9yIGEgdHJhaWxpbmcgc2VtaWNvbG9uIHN1Y2ggYXM7XG4gICAgLy8gYm9vdHN0cmFwKCkuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuICAgIGNvbnN0IGxhc3RUb2tlbiA9IGJvb3RzdHJhcENhbGwucGFyZW50LmdldExhc3RUb2tlbigpO1xuICAgIGxldCBlbmRQb3MgPSBib290c3RyYXBDYWxsLmdldEVuZCgpO1xuICAgIGlmIChsYXN0VG9rZW4gJiYgbGFzdFRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU2VtaWNvbG9uVG9rZW4pIHtcbiAgICAgIGVuZFBvcyA9IGxhc3RUb2tlbi5nZXRFbmQoKTtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobWFpblBhdGgpO1xuICAgIHJlY29yZGVyLmluc2VydExlZnQoYm9vdHN0cmFwQ2FsbC5nZXRTdGFydCgpLCBiZWZvcmVUZXh0KTtcbiAgICByZWNvcmRlci5pbnNlcnRSaWdodChlbmRQb3MsIGFmdGVyVGV4dCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmaW5kQ2FsbEV4cHJlc3Npb25Ob2RlKG5vZGU6IHRzLk5vZGUsIHRleHQ6IHN0cmluZyk6IHRzLk5vZGUgfCBudWxsIHtcbiAgaWYgKFxuICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiZcbiAgICB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSB0ZXh0XG4gICkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgbGV0IGZvdW5kTm9kZTogdHMuTm9kZSB8IG51bGwgPSBudWxsO1xuICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgKGNoaWxkTm9kZSkgPT4ge1xuICAgIGZvdW5kTm9kZSA9IGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUoY2hpbGROb2RlLCB0ZXh0KTtcblxuICAgIGlmIChmb3VuZE5vZGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZvdW5kTm9kZTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyVHJhbnNpdGlvbihcbiAgb3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyxcbiAgbWFpbkZpbGU6IHN0cmluZyxcbiAgY2xpZW50UHJvamVjdFJvb3Q6IHN0cmluZyxcbik6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBtYWluUGF0aCA9IG5vcm1hbGl6ZSgnLycgKyBtYWluRmlsZSk7XG5cbiAgICBjb25zdCBib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGggPSBmaW5kQm9vdHN0cmFwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgYm9vdHN0cmFwTW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShcbiAgICAgIGAvJHtjbGllbnRQcm9qZWN0Um9vdH0vc3JjLyR7Ym9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRofS50c2AsXG4gICAgKTtcblxuICAgIGNvbnN0IGJyb3dzZXJNb2R1bGVJbXBvcnQgPSBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0LCBib290c3RyYXBNb2R1bGVQYXRoKTtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbFJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShib290c3RyYXBNb2R1bGVQYXRoKTtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGJyb3dzZXJNb2R1bGVJbXBvcnQucG9zICsgYnJvd3Nlck1vZHVsZUltcG9ydC5nZXRGdWxsV2lkdGgoKTtcbiAgICBjb25zdCBicm93c2VyTW9kdWxlRnVsbEltcG9ydCA9IGJyb3dzZXJNb2R1bGVJbXBvcnQucGFyZW50O1xuXG4gICAgaWYgKGJyb3dzZXJNb2R1bGVGdWxsSW1wb3J0LmdldFRleHQoKSA9PT0gJ0Jyb3dzZXJNb2R1bGUud2l0aFNlcnZlclRyYW5zaXRpb24nKSB7XG4gICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHdpdGhTZXJ2ZXJUcmFuc2l0aW9uIGFzIG90aGVyd2lzZSB3ZSBtaWdodCBoYXZlIGluY29ycmVjdCBjb25maWd1cmF0aW9uLlxuICAgICAgdHJhbnNpdGlvbkNhbGxSZWNvcmRlci5yZW1vdmUoXG4gICAgICAgIHBvc2l0aW9uLFxuICAgICAgICBicm93c2VyTW9kdWxlRnVsbEltcG9ydC5wYXJlbnQuZ2V0RnVsbFdpZHRoKCkgLSBicm93c2VyTW9kdWxlSW1wb3J0LmdldEZ1bGxXaWR0aCgpLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cmFuc2l0aW9uQ2FsbFJlY29yZGVyLmluc2VydExlZnQoXG4gICAgICBwb3NpdGlvbixcbiAgICAgIGAud2l0aFNlcnZlclRyYW5zaXRpb24oeyBhcHBJZDogJyR7b3B0aW9ucy5hcHBJZH0nIH0pYCxcbiAgICApO1xuICAgIGhvc3QuY29tbWl0VXBkYXRlKHRyYW5zaXRpb25DYWxsUmVjb3JkZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHBsYXRmb3JtU2VydmVyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6ICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcblxuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCB7XG4gICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgbmFtZTogJ0B0eXBlcy9ub2RlJyxcbiAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWydAdHlwZXMvbm9kZSddLFxuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCB8fCBjbGllbnRQcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbml2ZXJzYWwgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGllbnRCdWlsZE9wdGlvbnMgPSAoY2xpZW50QnVpbGRUYXJnZXQub3B0aW9ucyB8fFxuICAgICAge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvc3JjJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgc3RyaXBUc0V4dGVuc2lvbjogKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXC50cyQvLCAnJyksXG4gICAgICB9KSxcbiAgICAgIG1vdmUoam9pbihub3JtYWxpemUoY2xpZW50UHJvamVjdC5yb290KSwgJ3NyYycpKSxcbiAgICBdKTtcblxuICAgIGNvbnN0IGNsaWVudFRzQ29uZmlnID0gbm9ybWFsaXplKGNsaWVudEJ1aWxkT3B0aW9ucy50c0NvbmZpZyk7XG4gICAgY29uc3QgdHNDb25maWdFeHRlbmRzID0gYmFzZW5hbWUoY2xpZW50VHNDb25maWcpO1xuICAgIGNvbnN0IHRzQ29uZmlnRGlyZWN0b3J5ID0gZGlybmFtZShjbGllbnRUc0NvbmZpZyk7XG5cbiAgICBjb25zdCByb290U291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgdHNDb25maWdFeHRlbmRzLFxuICAgICAgICBoYXNMb2NhbGl6ZVBhY2thZ2U6ICEhZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9sb2NhbGl6ZScpLFxuICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICB9KSxcbiAgICAgIG1vdmUodHNDb25maWdEaXJlY3RvcnkpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBtZXJnZVdpdGgocm9vdFNvdXJjZSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGUob3B0aW9ucywgdHNDb25maWdEaXJlY3RvcnkpLFxuICAgICAgd3JhcEJvb3RzdHJhcENhbGwoY2xpZW50QnVpbGRPcHRpb25zLm1haW4pLFxuICAgICAgYWRkU2VydmVyVHJhbnNpdGlvbihvcHRpb25zLCBjbGllbnRCdWlsZE9wdGlvbnMubWFpbiwgY2xpZW50UHJvamVjdC5yb290KSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==