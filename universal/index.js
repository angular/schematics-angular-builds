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
                ...schematics_1.strings,
                ...options,
                stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                hasLocalizePackage: !!(0, dependencies_1.getPackageJsonDependency)(host, '@angular/localize'),
            }),
            (0, schematics_1.move)((0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src')),
        ]);
        const rootSource = (0, schematics_1.apply)((0, schematics_1.url)('./files/root'), [
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBa0Y7QUFDbEYsMkRBWW9DO0FBQ3BDLDREQUEwRTtBQUMxRSxrR0FBb0Y7QUFDcEYsb0RBQXNFO0FBQ3RFLDhDQUFpRDtBQUNqRCwwREFJaUM7QUFDakMsZ0VBQTREO0FBQzVELDBEQUEyRjtBQUMzRiw0Q0FBK0Q7QUFDL0QsZ0VBQXNFO0FBQ3RFLG9EQUFxRTtBQUNyRSxrRUFBOEU7QUFHOUUsU0FBUyxnQkFBZ0IsQ0FBQyxPQUF5QixFQUFFLGlCQUF1QjtJQUMxRSxPQUFPLElBQUEsMkJBQWUsRUFBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5RCxJQUFJLGFBQWEsRUFBRTtZQUNqQixnREFBZ0Q7WUFDaEQsb0RBQW9EO1lBQ3BELHVEQUF1RDtZQUN2RCwyRkFBMkY7WUFDM0YsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQWlELEVBQUUsRUFBTSxFQUFFO2dCQUNuRixPQUFPO29CQUNMLGFBQWEsRUFBRSxDQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhLE1BQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxhQUFhO29CQUNsRixnQkFBZ0IsRUFBRSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsZ0JBQWdCO29CQUMzQyxZQUFZLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFP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QUksT0FBa0I7Z0JBQ3RCLGdCQUFnQixFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3ZELGVBQWU7Z0JBQ2YsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxpQkFBaUIsQ0FBQztnQkFDM0UsU0FBUzthQUNWLENBQUM7WUFDRixJQUFBLGlCQUFJLEVBQUMsaUJBQWlCLENBQUM7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDO1lBQ3pCLElBQUEsc0JBQVMsRUFBQyxVQUFVLENBQUM7WUFDckIsZUFBZSxFQUFFO1lBQ2pCLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQztZQUM1QyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7WUFDMUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDO1NBQzFFLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUEzREQsNEJBMkRDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25WYWx1ZSwgUGF0aCwgYmFzZW5hbWUsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBmaW5kTm9kZSwgZ2V0RGVjb3JhdG9yTWV0YWRhdGEgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeVR5cGUsXG4gIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbiAgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IGZpbmRCb290c3RyYXBNb2R1bGVDYWxsLCBmaW5kQm9vdHN0cmFwTW9kdWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVbml2ZXJzYWxPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG5cbiAgICBpZiAoY2xpZW50UHJvamVjdCkge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgYnJvd3NlciBidWlsZGVyIGhhc2hlcyB0aGUgYXNzZXRzXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGlzIHNldHRpbmcgdG8gdGhlIHNlcnZlciBidWlsZGVyXG4gICAgICAvLyBhcyBvdGhlcndpc2Ugd2hlbiBhc3NldHMgaXQgd2lsbCBiZSByZXF1ZXN0ZWQgdHdpY2UuXG4gICAgICAvLyBPbmUgZm9yIHRoZSBzZXJ2ZXIgd2hpY2ggd2lsbCBiZSB1bmhhc2hlZCwgYW5kIG90aGVyIG9uIHRoZSBjbGllbnQgd2hpY2ggd2lsbCBiZSBoYXNoZWQuXG4gICAgICBjb25zdCBnZXRTZXJ2ZXJPcHRpb25zID0gKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIEpzb25WYWx1ZSB8IHVuZGVmaW5lZD4gPSB7fSk6IHt9ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvdXRwdXRIYXNoaW5nOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nID09PSAnYWxsJyA/ICdtZWRpYScgOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nLFxuICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IG9wdGlvbnM/LmZpbGVSZXBsYWNlbWVudHMsXG4gICAgICAgICAgb3B0aW1pemF0aW9uOiBvcHRpb25zPy5vcHRpbWl6YXRpb24gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6ICEhb3B0aW9ucz8ub3B0aW1pemF0aW9uLFxuICAgICAgICAgIHNvdXJjZU1hcDogb3B0aW9ucz8uc291cmNlTWFwLFxuICAgICAgICAgIGxvY2FsaXphdGlvbjogb3B0aW9ucz8ubG9jYWxpemF0aW9uLFxuICAgICAgICAgIHN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uczogb3B0aW9ucz8uc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLFxuICAgICAgICAgIHJlc291cmNlc091dHB1dFBhdGg6IG9wdGlvbnM/LnJlc291cmNlc091dHB1dFBhdGgsXG4gICAgICAgICAgZGVwbG95VXJsOiBvcHRpb25zPy5kZXBsb3lVcmwsXG4gICAgICAgICAgaTE4bk1pc3NpbmdUcmFuc2xhdGlvbjogb3B0aW9ucz8uaTE4bk1pc3NpbmdUcmFuc2xhdGlvbixcbiAgICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBvcHRpb25zPy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogb3B0aW9ucz8uZXh0cmFjdExpY2Vuc2VzLFxuICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2U6IG9wdGlvbnM/LmlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgIH07XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBidWlsZFRhcmdldCA9IGNsaWVudFByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgICBpZiAoYnVpbGRUYXJnZXQ/Lm9wdGlvbnMpIHtcbiAgICAgICAgYnVpbGRUYXJnZXQub3B0aW9ucy5vdXRwdXRQYXRoID0gYGRpc3QvJHtvcHRpb25zLnByb2plY3R9L2Jyb3dzZXJgO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidWlsZENvbmZpZ3VyYXRpb25zID0gYnVpbGRUYXJnZXQ/LmNvbmZpZ3VyYXRpb25zO1xuICAgICAgY29uc3QgY29uZmlndXJhdGlvbnM6IFJlY29yZDxzdHJpbmcsIHt9PiA9IHt9O1xuICAgICAgaWYgKGJ1aWxkQ29uZmlndXJhdGlvbnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBvcHRpb25zXSBvZiBPYmplY3QuZW50cmllcyhidWlsZENvbmZpZ3VyYXRpb25zKSkge1xuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zW2tleV0gPSBnZXRTZXJ2ZXJPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1haW5QYXRoID0gb3B0aW9ucy5tYWluIGFzIHN0cmluZztcbiAgICAgIGNvbnN0IHNlcnZlclRzQ29uZmlnID0gam9pbih0c0NvbmZpZ0RpcmVjdG9yeSwgJ3RzY29uZmlnLnNlcnZlci5qc29uJyk7XG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ3NlcnZlcicsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9zZXJ2ZXJgLFxuICAgICAgICAgIG1haW46IGpvaW4oXG4gICAgICAgICAgICBub3JtYWxpemUoY2xpZW50UHJvamVjdC5yb290KSxcbiAgICAgICAgICAgICdzcmMnLFxuICAgICAgICAgICAgbWFpblBhdGguZW5kc1dpdGgoJy50cycpID8gbWFpblBhdGggOiBtYWluUGF0aCArICcudHMnLFxuICAgICAgICAgICksXG4gICAgICAgICAgdHNDb25maWc6IHNlcnZlclRzQ29uZmlnLFxuICAgICAgICAgIC4uLihidWlsZFRhcmdldD8ub3B0aW9ucyA/IGdldFNlcnZlck9wdGlvbnMoYnVpbGRUYXJnZXQ/Lm9wdGlvbnMpIDoge30pLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9ucyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGZpbmRCcm93c2VyTW9kdWxlSW1wb3J0KGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IHRzLk5vZGUge1xuICBjb25zdCBtb2R1bGVGaWxlVGV4dCA9IGhvc3QucmVhZFRleHQobW9kdWxlUGF0aCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUobW9kdWxlUGF0aCwgbW9kdWxlRmlsZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIGNvbnN0IGRlY29yYXRvck1ldGFkYXRhID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEoc291cmNlLCAnTmdNb2R1bGUnLCAnQGFuZ3VsYXIvY29yZScpWzBdO1xuICBjb25zdCBicm93c2VyTW9kdWxlTm9kZSA9IGZpbmROb2RlKGRlY29yYXRvck1ldGFkYXRhLCB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIsICdCcm93c2VyTW9kdWxlJyk7XG5cbiAgaWYgKGJyb3dzZXJNb2R1bGVOb2RlID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENhbm5vdCBmaW5kIEJyb3dzZXJNb2R1bGUgaW1wb3J0IGluICR7bW9kdWxlUGF0aH1gKTtcbiAgfVxuXG4gIHJldHVybiBicm93c2VyTW9kdWxlTm9kZTtcbn1cblxuZnVuY3Rpb24gd3JhcEJvb3RzdHJhcENhbGwobWFpbkZpbGU6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBtYWluUGF0aCA9IG5vcm1hbGl6ZSgnLycgKyBtYWluRmlsZSk7XG4gICAgbGV0IGJvb3RzdHJhcENhbGw6IHRzLk5vZGUgfCBudWxsID0gZmluZEJvb3RzdHJhcE1vZHVsZUNhbGwoaG9zdCwgbWFpblBhdGgpO1xuICAgIGlmIChib290c3RyYXBDYWxsID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQm9vdHN0cmFwIG1vZHVsZSBub3QgZm91bmQuJyk7XG4gICAgfVxuXG4gICAgbGV0IGJvb3RzdHJhcENhbGxFeHByZXNzaW9uOiB0cy5Ob2RlIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGN1cnJlbnRDYWxsID0gYm9vdHN0cmFwQ2FsbDtcbiAgICB3aGlsZSAoYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24gPT09IG51bGwgJiYgY3VycmVudENhbGwucGFyZW50KSB7XG4gICAgICBjdXJyZW50Q2FsbCA9IGN1cnJlbnRDYWxsLnBhcmVudDtcbiAgICAgIGlmICh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoY3VycmVudENhbGwpIHx8IHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoY3VycmVudENhbGwpKSB7XG4gICAgICAgIGJvb3RzdHJhcENhbGxFeHByZXNzaW9uID0gY3VycmVudENhbGw7XG4gICAgICB9XG4gICAgfVxuICAgIGJvb3RzdHJhcENhbGwgPSBjdXJyZW50Q2FsbDtcblxuICAgIC8vIEluIGNhc2UgdGhlIGJvb3RzdHJhcCBjb2RlIGlzIGEgdmFyaWFibGUgc3RhdGVtZW50XG4gICAgLy8gd2UgbmVlZCB0byBkZXRlcm1pbmUgaXQncyB1c2FnZVxuICAgIGlmIChib290c3RyYXBDYWxsRXhwcmVzc2lvbiAmJiB0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KGJvb3RzdHJhcENhbGxFeHByZXNzaW9uKSkge1xuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBib290c3RyYXBDYWxsRXhwcmVzc2lvbi5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdO1xuICAgICAgY29uc3QgYm9vdHN0cmFwVmFyID0gKGRlY2xhcmF0aW9uLm5hbWUgYXMgdHMuSWRlbnRpZmllcikudGV4dDtcbiAgICAgIGNvbnN0IHNmID0gYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgYm9vdHN0cmFwQ2FsbCA9IGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUoc2YsIGJvb3RzdHJhcFZhcikgfHwgY3VycmVudENhbGw7XG4gICAgfVxuXG4gICAgLy8gaW5kZW50IGNvbnRlbnRzXG4gICAgY29uc3QgdHJpdmlhV2lkdGggPSBib290c3RyYXBDYWxsLmdldExlYWRpbmdUcml2aWFXaWR0aCgpO1xuICAgIGNvbnN0IGJlZm9yZVRleHQgPVxuICAgICAgYGZ1bmN0aW9uIGJvb3RzdHJhcCgpIHtcXG5gICsgJyAnLnJlcGVhdCh0cml2aWFXaWR0aCA+IDIgPyB0cml2aWFXaWR0aCArIDEgOiB0cml2aWFXaWR0aCk7XG4gICAgY29uc3QgYWZ0ZXJUZXh0ID1cbiAgICAgIGBcXG4ke3RyaXZpYVdpZHRoID4gMiA/ICcgJy5yZXBlYXQodHJpdmlhV2lkdGggLSAxKSA6ICcnfX07XFxuYCArXG4gICAgICBgXG5cbmlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSB7XG4gIGJvb3RzdHJhcCgpO1xufSBlbHNlIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGJvb3RzdHJhcCk7XG59XG5gO1xuXG4gICAgLy8gaW4gc29tZSBjYXNlcyB3ZSBuZWVkIHRvIGNhdGVyIGZvciBhIHRyYWlsaW5nIHNlbWljb2xvbiBzdWNoIGFzO1xuICAgIC8vIGJvb3RzdHJhcCgpLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbiAgICBjb25zdCBsYXN0VG9rZW4gPSBib290c3RyYXBDYWxsLnBhcmVudC5nZXRMYXN0VG9rZW4oKTtcbiAgICBsZXQgZW5kUG9zID0gYm9vdHN0cmFwQ2FsbC5nZXRFbmQoKTtcbiAgICBpZiAobGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuKSB7XG4gICAgICBlbmRQb3MgPSBsYXN0VG9rZW4uZ2V0RW5kKCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1haW5QYXRoKTtcbiAgICByZWNvcmRlci5pbnNlcnRMZWZ0KGJvb3RzdHJhcENhbGwuZ2V0U3RhcnQoKSwgYmVmb3JlVGV4dCk7XG4gICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoZW5kUG9zLCBhZnRlclRleHQpO1xuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmluZENhbGxFeHByZXNzaW9uTm9kZShub2RlOiB0cy5Ob2RlLCB0ZXh0OiBzdHJpbmcpOiB0cy5Ob2RlIHwgbnVsbCB7XG4gIGlmIChcbiAgICB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmXG4gICAgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gdGV4dFxuICApIHtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIGxldCBmb3VuZE5vZGU6IHRzLk5vZGUgfCBudWxsID0gbnVsbDtcbiAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIChjaGlsZE5vZGUpID0+IHtcbiAgICBmb3VuZE5vZGUgPSBmaW5kQ2FsbEV4cHJlc3Npb25Ob2RlKGNoaWxkTm9kZSwgdGV4dCk7XG5cbiAgICBpZiAoZm91bmROb2RlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBmb3VuZE5vZGU7XG59XG5cbmZ1bmN0aW9uIGFkZFNlcnZlclRyYW5zaXRpb24oXG4gIG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsXG4gIG1haW5GaWxlOiBzdHJpbmcsXG4gIGNsaWVudFByb2plY3RSb290OiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgbWFpblBhdGggPSBub3JtYWxpemUoJy8nICsgbWFpbkZpbGUpO1xuXG4gICAgY29uc3QgYm9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRoID0gZmluZEJvb3RzdHJhcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVBhdGggPSBub3JtYWxpemUoXG4gICAgICBgLyR7Y2xpZW50UHJvamVjdFJvb3R9L3NyYy8ke2Jvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aH0udHNgLFxuICAgICk7XG5cbiAgICBjb25zdCBicm93c2VyTW9kdWxlSW1wb3J0ID0gZmluZEJyb3dzZXJNb2R1bGVJbXBvcnQoaG9zdCwgYm9vdHN0cmFwTW9kdWxlUGF0aCk7XG4gICAgY29uc3QgYXBwSWQgPSBvcHRpb25zLmFwcElkO1xuICAgIGNvbnN0IHRyYW5zaXRpb25DYWxsID0gYC53aXRoU2VydmVyVHJhbnNpdGlvbih7IGFwcElkOiAnJHthcHBJZH0nIH0pYDtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGJyb3dzZXJNb2R1bGVJbXBvcnQucG9zICsgYnJvd3Nlck1vZHVsZUltcG9ydC5nZXRGdWxsVGV4dCgpLmxlbmd0aDtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbENoYW5nZSA9IG5ldyBJbnNlcnRDaGFuZ2UoYm9vdHN0cmFwTW9kdWxlUGF0aCwgcG9zaXRpb24sIHRyYW5zaXRpb25DYWxsKTtcblxuICAgIGNvbnN0IHRyYW5zaXRpb25DYWxsUmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIHRyYW5zaXRpb25DYWxsUmVjb3JkZXIuaW5zZXJ0TGVmdCh0cmFuc2l0aW9uQ2FsbENoYW5nZS5wb3MsIHRyYW5zaXRpb25DYWxsQ2hhbmdlLnRvQWRkKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZSh0cmFuc2l0aW9uQ2FsbFJlY29yZGVyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBjb3JlRGVwID0gZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9jb3JlJyk7XG4gICAgaWYgKGNvcmVEZXAgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCB2ZXJzaW9uLicpO1xuICAgIH1cbiAgICBjb25zdCBwbGF0Zm9ybVNlcnZlckRlcCA9IHtcbiAgICAgIC4uLmNvcmVEZXAsXG4gICAgICBuYW1lOiAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJyxcbiAgICB9O1xuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBwbGF0Zm9ybVNlcnZlckRlcCk7XG5cbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwge1xuICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgIG5hbWU6ICdAdHlwZXMvbm9kZScsXG4gICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1snQHR5cGVzL25vZGUnXSxcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuXG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIWNsaWVudFByb2plY3QgfHwgY2xpZW50UHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5pdmVyc2FsIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGllbnRCdWlsZFRhcmdldCA9IGNsaWVudFByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgaWYgKCFjbGllbnRCdWlsZFRhcmdldCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50QnVpbGRPcHRpb25zID0gKGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgfHxcbiAgICAgIHt9KSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcblxuICAgIGNvbnN0IGNsaWVudFRzQ29uZmlnID0gbm9ybWFsaXplKGNsaWVudEJ1aWxkT3B0aW9ucy50c0NvbmZpZyk7XG4gICAgY29uc3QgdHNDb25maWdFeHRlbmRzID0gYmFzZW5hbWUoY2xpZW50VHNDb25maWcpO1xuICAgIC8vIHRoaXMgaXMgbmVlZGVkIGJlY2F1c2UgcHJpb3IgdG8gdmVyc2lvbiA4LCB0c2NvbmZpZyBtaWdodCBoYXZlIGJlZW4gaW4gJ3NyYydcbiAgICAvLyBhbmQgd2UgZG9uJ3Qgd2FudCB0byBicmVhayB0aGUgJ25nIGFkZCBAbmd1bml2ZXJzYWwvZXhwcmVzcy1lbmdpbmUgc2NoZW1hdGljcydcbiAgICBjb25zdCByb290SW5TcmMgPSBjbGllbnRQcm9qZWN0LnJvb3QgPT09ICcnICYmIGNsaWVudFRzQ29uZmlnLmluY2x1ZGVzKCdzcmMvJyk7XG4gICAgY29uc3QgdHNDb25maWdEaXJlY3RvcnkgPSBqb2luKG5vcm1hbGl6ZShjbGllbnRQcm9qZWN0LnJvb3QpLCByb290SW5TcmMgPyAnc3JjJyA6ICcnKTtcblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLihvcHRpb25zIGFzIG9iamVjdCksXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb246IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFwudHMkLywgJycpLFxuICAgICAgICBoYXNMb2NhbGl6ZVBhY2thZ2U6ICEhZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9sb2NhbGl6ZScpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKSksXG4gICAgXSk7XG5cbiAgICBjb25zdCByb290U291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi4ob3B0aW9ucyBhcyBvYmplY3QpLFxuICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgdHNDb25maWdFeHRlbmRzLFxuICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgIHJvb3RJblNyYyxcbiAgICAgIH0pLFxuICAgICAgbW92ZSh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIG1lcmdlV2l0aChyb290U291cmNlKSxcbiAgICAgIGFkZERlcGVuZGVuY2llcygpLFxuICAgICAgdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICB3cmFwQm9vdHN0cmFwQ2FsbChjbGllbnRCdWlsZE9wdGlvbnMubWFpbiksXG4gICAgICBhZGRTZXJ2ZXJUcmFuc2l0aW9uKG9wdGlvbnMsIGNsaWVudEJ1aWxkT3B0aW9ucy5tYWluLCBjbGllbnRQcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuICB9O1xufVxuIl19