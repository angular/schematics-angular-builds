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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const paths_1 = require("../utility/paths");
const project_targets_1 = require("../utility/project-targets");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
function updateConfigFile(options, tsConfigDirectory) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
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
            const serverTsConfig = (0, core_1.join)(tsConfigDirectory, 'tsconfig.server.json');
            clientProject.targets.add({
                name: 'server',
                builder: workspace_models_1.Builders.Server,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${options.project}/server`,
                    main: (0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src', mainPath.endsWith('.ts') ? mainPath : mainPath + '.ts'),
                    tsConfig: serverTsConfig,
                    ...((buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.options) ? getServerOptions(buildTarget === null || buildTarget === void 0 ? void 0 : buildTarget.options) : {}),
                },
                configurations,
            });
        }
    });
}
function findBrowserModuleImport(host, modulePath) {
    const moduleBuffer = host.read(modulePath);
    if (!moduleBuffer) {
        throw new schematics_1.SchematicsException(`Module file (${modulePath}) not found`);
    }
    const moduleFileText = moduleBuffer.toString('utf-8');
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
        return host;
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
        const clientTsConfig = (0, core_1.normalize)(clientBuildOptions.tsConfig);
        const tsConfigExtends = (0, core_1.basename)(clientTsConfig);
        // this is needed because prior to version 8, tsconfig might have been in 'src'
        // and we don't want to break the 'ng add @nguniversal/express-engine schematics'
        const rootInSrc = clientProject.root === '' && clientTsConfig.includes('src/');
        const tsConfigDirectory = (0, core_1.join)((0, core_1.normalize)(clientProject.root), rootInSrc ? 'src' : '');
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files/src'), [
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                ...options,
                stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                hasLocalizePackage: !!(0, dependencies_1.getPackageJsonDependency)(host, '@angular/localize'),
            }),
            (0, schematics_1.move)((0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src')),
        ]);
        const rootSource = (0, schematics_1.apply)((0, schematics_1.url)('./files/root'), [
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                ...options,
                stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                tsConfigExtends,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(tsConfigDirectory),
                rootInSrc,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUEyRjtBQUMzRiwyREFXb0M7QUFDcEMsNERBQTBFO0FBQzFFLGtHQUFvRjtBQUNwRixvREFBc0U7QUFDdEUsOENBQWlEO0FBQ2pELDBEQUE2RjtBQUM3RiwwREFBMkY7QUFDM0YsNENBQStEO0FBQy9ELGdFQUFzRTtBQUN0RSxvREFBcUU7QUFDckUsa0VBQThFO0FBRzlFLFNBQVMsZ0JBQWdCLENBQUMsT0FBeUIsRUFBRSxpQkFBdUI7SUFDMUUsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsSUFBSSxhQUFhLEVBQUU7WUFDakIsZ0RBQWdEO1lBQ2hELG9EQUFvRDtZQUNwRCx1REFBdUQ7WUFDdkQsMkZBQTJGO1lBQzNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxVQUFpRCxFQUFFLEVBQU0sRUFBRTtnQkFDbkYsT0FBTztvQkFDTCxhQUFhLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsYUFBYSxNQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsYUFBYTtvQkFDbEYsZ0JBQWdCLEVBQUUsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLGdCQUFnQjtvQkFDM0MsWUFBWSxFQUFFLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFlBQVksTUFBSyxT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VixHQUFJLE9BQWtCO2dCQUN0QixnQkFBZ0IsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxlQUFlO2dCQUNmLDJCQUEyQixFQUFFLElBQUEsbUNBQTJCLEVBQUMsaUJBQWlCLENBQUM7Z0JBQzNFLFNBQVM7YUFDVixDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLGlCQUFpQixDQUFDO1NBQ3hCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQztZQUN6QixJQUFBLHNCQUFTLEVBQUMsVUFBVSxDQUFDO1lBQ3JCLGVBQWUsRUFBRTtZQUNqQixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDNUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQzFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBM0RELDRCQTJEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUsIFBhdGgsIGJhc2VuYW1lLCBqb2luLCBub3JtYWxpemUsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgZmluZE5vZGUsIGdldERlY29yYXRvck1ldGFkYXRhIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5LCBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbCwgZmluZEJvb3RzdHJhcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgVW5pdmVyc2FsT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeTogUGF0aCk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuXG4gICAgaWYgKGNsaWVudFByb2plY3QpIHtcbiAgICAgIC8vIEluIGNhc2UgdGhlIGJyb3dzZXIgYnVpbGRlciBoYXNoZXMgdGhlIGFzc2V0c1xuICAgICAgLy8gd2UgbmVlZCB0byBhZGQgdGhpcyBzZXR0aW5nIHRvIHRoZSBzZXJ2ZXIgYnVpbGRlclxuICAgICAgLy8gYXMgb3RoZXJ3aXNlIHdoZW4gYXNzZXRzIGl0IHdpbGwgYmUgcmVxdWVzdGVkIHR3aWNlLlxuICAgICAgLy8gT25lIGZvciB0aGUgc2VydmVyIHdoaWNoIHdpbGwgYmUgdW5oYXNoZWQsIGFuZCBvdGhlciBvbiB0aGUgY2xpZW50IHdoaWNoIHdpbGwgYmUgaGFzaGVkLlxuICAgICAgY29uc3QgZ2V0U2VydmVyT3B0aW9ucyA9IChvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBKc29uVmFsdWUgfCB1bmRlZmluZWQ+ID0ge30pOiB7fSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb3V0cHV0SGFzaGluZzogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyA9PT0gJ2FsbCcgPyAnbWVkaWEnIDogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyxcbiAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBvcHRpb25zPy5maWxlUmVwbGFjZW1lbnRzLFxuICAgICAgICAgIG9wdGltaXphdGlvbjogb3B0aW9ucz8ub3B0aW1pemF0aW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAhIW9wdGlvbnM/Lm9wdGltaXphdGlvbixcbiAgICAgICAgICBzb3VyY2VNYXA6IG9wdGlvbnM/LnNvdXJjZU1hcCxcbiAgICAgICAgICBsb2NhbGl6YXRpb246IG9wdGlvbnM/LmxvY2FsaXphdGlvbixcbiAgICAgICAgICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IG9wdGlvbnM/LnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucyxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBvcHRpb25zPy5yZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICAgIGRlcGxveVVybDogb3B0aW9ucz8uZGVwbG95VXJsLFxuICAgICAgICAgIGkxOG5NaXNzaW5nVHJhbnNsYXRpb246IG9wdGlvbnM/LmkxOG5NaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgICAgICAgcHJlc2VydmVTeW1saW5rczogb3B0aW9ucz8ucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IG9wdGlvbnM/LmV4dHJhY3RMaWNlbnNlcyxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlOiBvcHRpb25zPy5pbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgICAgaWYgKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSB7XG4gICAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMub3V0cHV0UGF0aCA9IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9icm93c2VyYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRDb25maWd1cmF0aW9ucyA9IGJ1aWxkVGFyZ2V0Py5jb25maWd1cmF0aW9ucztcbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGlmIChidWlsZENvbmZpZ3VyYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb3B0aW9uc10gb2YgT2JqZWN0LmVudHJpZXMoYnVpbGRDb25maWd1cmF0aW9ucykpIHtcbiAgICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0gZ2V0U2VydmVyT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtYWluUGF0aCA9IG9wdGlvbnMubWFpbiBhcyBzdHJpbmc7XG4gICAgICBjb25zdCBzZXJ2ZXJUc0NvbmZpZyA9IGpvaW4odHNDb25maWdEaXJlY3RvcnksICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicpO1xuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6ICdzZXJ2ZXInLFxuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5TZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyYCxcbiAgICAgICAgICBtYWluOiBqb2luKFxuICAgICAgICAgICAgbm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksXG4gICAgICAgICAgICAnc3JjJyxcbiAgICAgICAgICAgIG1haW5QYXRoLmVuZHNXaXRoKCcudHMnKSA/IG1haW5QYXRoIDogbWFpblBhdGggKyAnLnRzJyxcbiAgICAgICAgICApLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgICAuLi4oYnVpbGRUYXJnZXQ/Lm9wdGlvbnMgPyBnZXRTZXJ2ZXJPcHRpb25zKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSA6IHt9KSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnMsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0OiBUcmVlLCBtb2R1bGVQYXRoOiBzdHJpbmcpOiB0cy5Ob2RlIHtcbiAgY29uc3QgbW9kdWxlQnVmZmVyID0gaG9zdC5yZWFkKG1vZHVsZVBhdGgpO1xuICBpZiAoIW1vZHVsZUJ1ZmZlcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBNb2R1bGUgZmlsZSAoJHttb2R1bGVQYXRofSkgbm90IGZvdW5kYCk7XG4gIH1cbiAgY29uc3QgbW9kdWxlRmlsZVRleHQgPSBtb2R1bGVCdWZmZXIudG9TdHJpbmcoJ3V0Zi04Jyk7XG5cbiAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBtb2R1bGVGaWxlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgY29uc3QgZGVjb3JhdG9yTWV0YWRhdGEgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShzb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gIGNvbnN0IGJyb3dzZXJNb2R1bGVOb2RlID0gZmluZE5vZGUoZGVjb3JhdG9yTWV0YWRhdGEsIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciwgJ0Jyb3dzZXJNb2R1bGUnKTtcblxuICBpZiAoYnJvd3Nlck1vZHVsZU5vZGUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgQnJvd3Nlck1vZHVsZSBpbXBvcnQgaW4gJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJNb2R1bGVOb2RlO1xufVxuXG5mdW5jdGlvbiB3cmFwQm9vdHN0cmFwQ2FsbChtYWluRmlsZTogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1haW5QYXRoID0gbm9ybWFsaXplKCcvJyArIG1haW5GaWxlKTtcbiAgICBsZXQgYm9vdHN0cmFwQ2FsbDogdHMuTm9kZSB8IG51bGwgPSBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbChob3N0LCBtYWluUGF0aCk7XG4gICAgaWYgKGJvb3RzdHJhcENhbGwgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdCb290c3RyYXAgbW9kdWxlIG5vdCBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBsZXQgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb246IHRzLk5vZGUgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY3VycmVudENhbGwgPSBib290c3RyYXBDYWxsO1xuICAgIHdoaWxlIChib290c3RyYXBDYWxsRXhwcmVzc2lvbiA9PT0gbnVsbCAmJiBjdXJyZW50Q2FsbC5wYXJlbnQpIHtcbiAgICAgIGN1cnJlbnRDYWxsID0gY3VycmVudENhbGwucGFyZW50O1xuICAgICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChjdXJyZW50Q2FsbCkgfHwgdHMuaXNWYXJpYWJsZVN0YXRlbWVudChjdXJyZW50Q2FsbCkpIHtcbiAgICAgICAgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24gPSBjdXJyZW50Q2FsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgYm9vdHN0cmFwQ2FsbCA9IGN1cnJlbnRDYWxsO1xuXG4gICAgLy8gSW4gY2FzZSB0aGUgYm9vdHN0cmFwIGNvZGUgaXMgYSB2YXJpYWJsZSBzdGF0ZW1lbnRcbiAgICAvLyB3ZSBuZWVkIHRvIGRldGVybWluZSBpdCdzIHVzYWdlXG4gICAgaWYgKGJvb3RzdHJhcENhbGxFeHByZXNzaW9uICYmIHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGJvb3RzdHJhcENhbGxFeHByZXNzaW9uLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICBjb25zdCBib290c3RyYXBWYXIgPSAoZGVjbGFyYXRpb24ubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuICAgICAgY29uc3Qgc2YgPSBib290c3RyYXBDYWxsRXhwcmVzc2lvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBib290c3RyYXBDYWxsID0gZmluZENhbGxFeHByZXNzaW9uTm9kZShzZiwgYm9vdHN0cmFwVmFyKSB8fCBjdXJyZW50Q2FsbDtcbiAgICB9XG5cbiAgICAvLyBpbmRlbnQgY29udGVudHNcbiAgICBjb25zdCB0cml2aWFXaWR0aCA9IGJvb3RzdHJhcENhbGwuZ2V0TGVhZGluZ1RyaXZpYVdpZHRoKCk7XG4gICAgY29uc3QgYmVmb3JlVGV4dCA9XG4gICAgICBgZnVuY3Rpb24gYm9vdHN0cmFwKCkge1xcbmAgKyAnICcucmVwZWF0KHRyaXZpYVdpZHRoID4gMiA/IHRyaXZpYVdpZHRoICsgMSA6IHRyaXZpYVdpZHRoKTtcbiAgICBjb25zdCBhZnRlclRleHQgPVxuICAgICAgYFxcbiR7dHJpdmlhV2lkdGggPiAyID8gJyAnLnJlcGVhdCh0cml2aWFXaWR0aCAtIDEpIDogJyd9fTtcXG5gICtcbiAgICAgIGBcblxuaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgYm9vdHN0cmFwKCk7XG59IGVsc2Uge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgYm9vdHN0cmFwKTtcbn1cbmA7XG5cbiAgICAvLyBpbiBzb21lIGNhc2VzIHdlIG5lZWQgdG8gY2F0ZXIgZm9yIGEgdHJhaWxpbmcgc2VtaWNvbG9uIHN1Y2ggYXM7XG4gICAgLy8gYm9vdHN0cmFwKCkuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuICAgIGNvbnN0IGxhc3RUb2tlbiA9IGJvb3RzdHJhcENhbGwucGFyZW50LmdldExhc3RUb2tlbigpO1xuICAgIGxldCBlbmRQb3MgPSBib290c3RyYXBDYWxsLmdldEVuZCgpO1xuICAgIGlmIChsYXN0VG9rZW4gJiYgbGFzdFRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU2VtaWNvbG9uVG9rZW4pIHtcbiAgICAgIGVuZFBvcyA9IGxhc3RUb2tlbi5nZXRFbmQoKTtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobWFpblBhdGgpO1xuICAgIHJlY29yZGVyLmluc2VydExlZnQoYm9vdHN0cmFwQ2FsbC5nZXRTdGFydCgpLCBiZWZvcmVUZXh0KTtcbiAgICByZWNvcmRlci5pbnNlcnRSaWdodChlbmRQb3MsIGFmdGVyVGV4dCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmaW5kQ2FsbEV4cHJlc3Npb25Ob2RlKG5vZGU6IHRzLk5vZGUsIHRleHQ6IHN0cmluZyk6IHRzLk5vZGUgfCBudWxsIHtcbiAgaWYgKFxuICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiZcbiAgICB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgIG5vZGUuZXhwcmVzc2lvbi50ZXh0ID09PSB0ZXh0XG4gICkge1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgbGV0IGZvdW5kTm9kZTogdHMuTm9kZSB8IG51bGwgPSBudWxsO1xuICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgKGNoaWxkTm9kZSkgPT4ge1xuICAgIGZvdW5kTm9kZSA9IGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUoY2hpbGROb2RlLCB0ZXh0KTtcblxuICAgIGlmIChmb3VuZE5vZGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZvdW5kTm9kZTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyVHJhbnNpdGlvbihcbiAgb3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyxcbiAgbWFpbkZpbGU6IHN0cmluZyxcbiAgY2xpZW50UHJvamVjdFJvb3Q6IHN0cmluZyxcbik6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBtYWluUGF0aCA9IG5vcm1hbGl6ZSgnLycgKyBtYWluRmlsZSk7XG5cbiAgICBjb25zdCBib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGggPSBmaW5kQm9vdHN0cmFwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgYm9vdHN0cmFwTW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShcbiAgICAgIGAvJHtjbGllbnRQcm9qZWN0Um9vdH0vc3JjLyR7Ym9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRofS50c2AsXG4gICAgKTtcblxuICAgIGNvbnN0IGJyb3dzZXJNb2R1bGVJbXBvcnQgPSBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0LCBib290c3RyYXBNb2R1bGVQYXRoKTtcbiAgICBjb25zdCBhcHBJZCA9IG9wdGlvbnMuYXBwSWQ7XG4gICAgY29uc3QgdHJhbnNpdGlvbkNhbGwgPSBgLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKHsgYXBwSWQ6ICcke2FwcElkfScgfSlgO1xuICAgIGNvbnN0IHBvc2l0aW9uID0gYnJvd3Nlck1vZHVsZUltcG9ydC5wb3MgKyBicm93c2VyTW9kdWxlSW1wb3J0LmdldEZ1bGxUZXh0KCkubGVuZ3RoO1xuICAgIGNvbnN0IHRyYW5zaXRpb25DYWxsQ2hhbmdlID0gbmV3IEluc2VydENoYW5nZShib290c3RyYXBNb2R1bGVQYXRoLCBwb3NpdGlvbiwgdHJhbnNpdGlvbkNhbGwpO1xuXG4gICAgY29uc3QgdHJhbnNpdGlvbkNhbGxSZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUoYm9vdHN0cmFwTW9kdWxlUGF0aCk7XG4gICAgdHJhbnNpdGlvbkNhbGxSZWNvcmRlci5pbnNlcnRMZWZ0KHRyYW5zaXRpb25DYWxsQ2hhbmdlLnBvcywgdHJhbnNpdGlvbkNhbGxDaGFuZ2UudG9BZGQpO1xuICAgIGhvc3QuY29tbWl0VXBkYXRlKHRyYW5zaXRpb25DYWxsUmVjb3JkZXIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHBsYXRmb3JtU2VydmVyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6ICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCB8fCBjbGllbnRQcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbml2ZXJzYWwgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGllbnRCdWlsZE9wdGlvbnMgPSAoY2xpZW50QnVpbGRUYXJnZXQub3B0aW9ucyB8fFxuICAgICAge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuXG4gICAgY29uc3QgY2xpZW50VHNDb25maWcgPSBub3JtYWxpemUoY2xpZW50QnVpbGRPcHRpb25zLnRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0V4dGVuZHMgPSBiYXNlbmFtZShjbGllbnRUc0NvbmZpZyk7XG4gICAgLy8gdGhpcyBpcyBuZWVkZWQgYmVjYXVzZSBwcmlvciB0byB2ZXJzaW9uIDgsIHRzY29uZmlnIG1pZ2h0IGhhdmUgYmVlbiBpbiAnc3JjJ1xuICAgIC8vIGFuZCB3ZSBkb24ndCB3YW50IHRvIGJyZWFrIHRoZSAnbmcgYWRkIEBuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZSBzY2hlbWF0aWNzJ1xuICAgIGNvbnN0IHJvb3RJblNyYyA9IGNsaWVudFByb2plY3Qucm9vdCA9PT0gJycgJiYgY2xpZW50VHNDb25maWcuaW5jbHVkZXMoJ3NyYy8nKTtcbiAgICBjb25zdCB0c0NvbmZpZ0RpcmVjdG9yeSA9IGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksIHJvb3RJblNyYyA/ICdzcmMnIDogJycpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvc3JjJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4uKG9wdGlvbnMgYXMgb2JqZWN0KSxcbiAgICAgICAgc3RyaXBUc0V4dGVuc2lvbjogKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXC50cyQvLCAnJyksXG4gICAgICAgIGhhc0xvY2FsaXplUGFja2FnZTogISFnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2xvY2FsaXplJyksXG4gICAgICB9KSxcbiAgICAgIG1vdmUoam9pbihub3JtYWxpemUoY2xpZW50UHJvamVjdC5yb290KSwgJ3NyYycpKSxcbiAgICBdKTtcblxuICAgIGNvbnN0IHJvb3RTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLihvcHRpb25zIGFzIG9iamVjdCksXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb246IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFwudHMkLywgJycpLFxuICAgICAgICB0c0NvbmZpZ0V4dGVuZHMsXG4gICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICAgICAgcm9vdEluU3JjLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICBdKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpLFxuICAgICAgbWVyZ2VXaXRoKHJvb3RTb3VyY2UpLFxuICAgICAgYWRkRGVwZW5kZW5jaWVzKCksXG4gICAgICB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICAgIHdyYXBCb290c3RyYXBDYWxsKGNsaWVudEJ1aWxkT3B0aW9ucy5tYWluKSxcbiAgICAgIGFkZFNlcnZlclRyYW5zaXRpb24ob3B0aW9ucywgY2xpZW50QnVpbGRPcHRpb25zLm1haW4sIGNsaWVudFByb2plY3Qucm9vdCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=