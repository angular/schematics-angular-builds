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
        const clientProject = workspace.projects.get(options.project);
        if (clientProject) {
            // In case the browser builder hashes the assets
            // we need to add this setting to the server builder
            // as otherwise when assets it will be requested twice.
            // One for the server which will be unhashed, and other on the client which will be hashed.
            const getServerOptions = (options = {}) => {
                return {
                    outputHashing: options?.outputHashing === 'all' ? 'media' : options?.outputHashing,
                    fileReplacements: options?.fileReplacements,
                    optimization: options?.optimization === undefined ? undefined : !!options?.optimization,
                    sourceMap: options?.sourceMap,
                    localization: options?.localization,
                    stylePreprocessorOptions: options?.stylePreprocessorOptions,
                    resourcesOutputPath: options?.resourcesOutputPath,
                    deployUrl: options?.deployUrl,
                    i18nMissingTranslation: options?.i18nMissingTranslation,
                    preserveSymlinks: options?.preserveSymlinks,
                    extractLicenses: options?.extractLicenses,
                    inlineStyleLanguage: options?.inlineStyleLanguage,
                    vendorChunk: options?.vendorChunk,
                };
            };
            const buildTarget = clientProject.targets.get('build');
            if (buildTarget?.options) {
                buildTarget.options.outputPath = `dist/${options.project}/browser`;
            }
            const buildConfigurations = buildTarget?.configurations;
            const configurations = {};
            if (buildConfigurations) {
                for (const [key, options] of Object.entries(buildConfigurations)) {
                    configurations[key] = getServerOptions(options);
                }
            }
            const mainPath = options.main;
            const sourceRoot = clientProject.sourceRoot ?? (0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src');
            const serverTsConfig = (0, core_1.join)(tsConfigDirectory, 'tsconfig.server.json');
            clientProject.targets.add({
                name: 'server',
                builder: workspace_models_1.Builders.Server,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${options.project}/server`,
                    main: (0, core_1.join)((0, core_1.normalize)(sourceRoot), mainPath.endsWith('.ts') ? mainPath : mainPath + '.ts'),
                    tsConfig: serverTsConfig,
                    ...(buildTarget?.options ? getServerOptions(buildTarget?.options) : {}),
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
            addServerTransition(options, clientBuildOptions.main, clientProject.root),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBMkY7QUFDM0YsMkRBWW9DO0FBQ3BDLDREQUEwRTtBQUMxRSxrR0FBb0Y7QUFDcEYsb0RBQXNFO0FBQ3RFLDBEQUlpQztBQUNqQyxnRUFBNEQ7QUFDNUQsMERBQWtFO0FBQ2xFLDRDQUErRDtBQUMvRCxnRUFBc0U7QUFDdEUsb0RBQXFFO0FBQ3JFLGtFQUE4RTtBQUc5RSxTQUFTLGdCQUFnQixDQUFDLE9BQXlCLEVBQUUsaUJBQXVCO0lBQzFFLE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTlELElBQUksYUFBYSxFQUFFO1lBQ2pCLGdEQUFnRDtZQUNoRCxvREFBb0Q7WUFDcEQsdURBQXVEO1lBQ3ZELDJGQUEyRjtZQUMzRixNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBaUQsRUFBRSxFQUFNLEVBQUU7Z0JBQ25GLE9BQU87b0JBQ0wsYUFBYSxFQUFFLE9BQU8sRUFBRSxhQUFhLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxhQUFhO29CQUNsRixnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCO29CQUMzQyxZQUFZLEVBQUUsT0FBTyxFQUFFLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZO29CQUN2RixTQUFTLEVBQUUsT0FBTyxFQUFF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RTtZQUM1QyxJQUFBLDJCQUFjLEVBQUM7Z0JBQ2IsR0FBRyxvQkFBTztnQkFDVixHQUFHLE9BQU87Z0JBQ1YsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsZUFBZTtnQkFDZixrQkFBa0IsRUFBRSxDQUFDLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ3pFLDJCQUEyQixFQUFFLElBQUEsbUNBQTJCLEVBQUMsaUJBQWlCLENBQUM7YUFDNUUsQ0FBQztZQUNGLElBQUEsaUJBQUksRUFBQyxpQkFBaUIsQ0FBQztTQUN4QixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsc0JBQVMsRUFBQyxjQUFjLENBQUM7WUFDekIsSUFBQSxzQkFBUyxFQUFDLFVBQVUsQ0FBQztZQUNyQixlQUFlLEVBQUU7WUFDakIsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDO1lBQzVDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQztTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdERELDRCQXNEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uVmFsdWUsIFBhdGgsIGJhc2VuYW1lLCBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgZmluZE5vZGUsIGdldERlY29yYXRvck1ldGFkYXRhIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHtcbiAgTm9kZURlcGVuZGVuY3lUeXBlLFxuICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG4gIGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbn0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBmaW5kQm9vdHN0cmFwTW9kdWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVbml2ZXJzYWxPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG5cbiAgICBpZiAoY2xpZW50UHJvamVjdCkge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgYnJvd3NlciBidWlsZGVyIGhhc2hlcyB0aGUgYXNzZXRzXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGlzIHNldHRpbmcgdG8gdGhlIHNlcnZlciBidWlsZGVyXG4gICAgICAvLyBhcyBvdGhlcndpc2Ugd2hlbiBhc3NldHMgaXQgd2lsbCBiZSByZXF1ZXN0ZWQgdHdpY2UuXG4gICAgICAvLyBPbmUgZm9yIHRoZSBzZXJ2ZXIgd2hpY2ggd2lsbCBiZSB1bmhhc2hlZCwgYW5kIG90aGVyIG9uIHRoZSBjbGllbnQgd2hpY2ggd2lsbCBiZSBoYXNoZWQuXG4gICAgICBjb25zdCBnZXRTZXJ2ZXJPcHRpb25zID0gKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIEpzb25WYWx1ZSB8IHVuZGVmaW5lZD4gPSB7fSk6IHt9ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvdXRwdXRIYXNoaW5nOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nID09PSAnYWxsJyA/ICdtZWRpYScgOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nLFxuICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IG9wdGlvbnM/LmZpbGVSZXBsYWNlbWVudHMsXG4gICAgICAgICAgb3B0aW1pemF0aW9uOiBvcHRpb25zPy5vcHRpbWl6YXRpb24gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6ICEhb3B0aW9ucz8ub3B0aW1pemF0aW9uLFxuICAgICAgICAgIHNvdXJjZU1hcDogb3B0aW9ucz8uc291cmNlTWFwLFxuICAgICAgICAgIGxvY2FsaXphdGlvbjogb3B0aW9ucz8ubG9jYWxpemF0aW9uLFxuICAgICAgICAgIHN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uczogb3B0aW9ucz8uc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLFxuICAgICAgICAgIHJlc291cmNlc091dHB1dFBhdGg6IG9wdGlvbnM/LnJlc291cmNlc091dHB1dFBhdGgsXG4gICAgICAgICAgZGVwbG95VXJsOiBvcHRpb25zPy5kZXBsb3lVcmwsXG4gICAgICAgICAgaTE4bk1pc3NpbmdUcmFuc2xhdGlvbjogb3B0aW9ucz8uaTE4bk1pc3NpbmdUcmFuc2xhdGlvbixcbiAgICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBvcHRpb25zPy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogb3B0aW9ucz8uZXh0cmFjdExpY2Vuc2VzLFxuICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2U6IG9wdGlvbnM/LmlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgICAgdmVuZG9yQ2h1bms6IG9wdGlvbnM/LnZlbmRvckNodW5rLFxuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgICAgaWYgKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSB7XG4gICAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMub3V0cHV0UGF0aCA9IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9icm93c2VyYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRDb25maWd1cmF0aW9ucyA9IGJ1aWxkVGFyZ2V0Py5jb25maWd1cmF0aW9ucztcbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGlmIChidWlsZENvbmZpZ3VyYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb3B0aW9uc10gb2YgT2JqZWN0LmVudHJpZXMoYnVpbGRDb25maWd1cmF0aW9ucykpIHtcbiAgICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0gZ2V0U2VydmVyT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtYWluUGF0aCA9IG9wdGlvbnMubWFpbiBhcyBzdHJpbmc7XG4gICAgICBjb25zdCBzb3VyY2VSb290ID0gY2xpZW50UHJvamVjdC5zb3VyY2VSb290ID8/IGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKTtcbiAgICAgIGNvbnN0IHNlcnZlclRzQ29uZmlnID0gam9pbih0c0NvbmZpZ0RpcmVjdG9yeSwgJ3RzY29uZmlnLnNlcnZlci5qc29uJyk7XG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ3NlcnZlcicsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9zZXJ2ZXJgLFxuICAgICAgICAgIG1haW46IGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aC5lbmRzV2l0aCgnLnRzJykgPyBtYWluUGF0aCA6IG1haW5QYXRoICsgJy50cycpLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgICAuLi4oYnVpbGRUYXJnZXQ/Lm9wdGlvbnMgPyBnZXRTZXJ2ZXJPcHRpb25zKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSA6IHt9KSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnMsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0OiBUcmVlLCBtb2R1bGVQYXRoOiBzdHJpbmcpOiB0cy5Ob2RlIHtcbiAgY29uc3QgbW9kdWxlRmlsZVRleHQgPSBob3N0LnJlYWRUZXh0KG1vZHVsZVBhdGgpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKG1vZHVsZVBhdGgsIG1vZHVsZUZpbGVUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICBjb25zdCBkZWNvcmF0b3JNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKHNvdXJjZSwgJ05nTW9kdWxlJywgJ0Bhbmd1bGFyL2NvcmUnKVswXTtcbiAgY29uc3QgYnJvd3Nlck1vZHVsZU5vZGUgPSBmaW5kTm9kZShkZWNvcmF0b3JNZXRhZGF0YSwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCAnQnJvd3Nlck1vZHVsZScpO1xuXG4gIGlmIChicm93c2VyTW9kdWxlTm9kZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDYW5ub3QgZmluZCBCcm93c2VyTW9kdWxlIGltcG9ydCBpbiAke21vZHVsZVBhdGh9YCk7XG4gIH1cblxuICByZXR1cm4gYnJvd3Nlck1vZHVsZU5vZGU7XG59XG5cbmZ1bmN0aW9uIGFkZFNlcnZlclRyYW5zaXRpb24oXG4gIG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsXG4gIG1haW5GaWxlOiBzdHJpbmcsXG4gIGNsaWVudFByb2plY3RSb290OiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgbWFpblBhdGggPSBub3JtYWxpemUoJy8nICsgbWFpbkZpbGUpO1xuXG4gICAgY29uc3QgYm9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRoID0gZmluZEJvb3RzdHJhcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVBhdGggPSBub3JtYWxpemUoXG4gICAgICBgLyR7Y2xpZW50UHJvamVjdFJvb3R9L3NyYy8ke2Jvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aH0udHNgLFxuICAgICk7XG5cbiAgICBjb25zdCBicm93c2VyTW9kdWxlSW1wb3J0ID0gZmluZEJyb3dzZXJNb2R1bGVJbXBvcnQoaG9zdCwgYm9vdHN0cmFwTW9kdWxlUGF0aCk7XG4gICAgY29uc3QgdHJhbnNpdGlvbkNhbGxSZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUoYm9vdHN0cmFwTW9kdWxlUGF0aCk7XG4gICAgY29uc3QgcG9zaXRpb24gPSBicm93c2VyTW9kdWxlSW1wb3J0LnBvcyArIGJyb3dzZXJNb2R1bGVJbXBvcnQuZ2V0RnVsbFdpZHRoKCk7XG4gICAgY29uc3QgYnJvd3Nlck1vZHVsZUZ1bGxJbXBvcnQgPSBicm93c2VyTW9kdWxlSW1wb3J0LnBhcmVudDtcblxuICAgIGlmIChicm93c2VyTW9kdWxlRnVsbEltcG9ydC5nZXRUZXh0KCkgPT09ICdCcm93c2VyTW9kdWxlLndpdGhTZXJ2ZXJUcmFuc2l0aW9uJykge1xuICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyB3aXRoU2VydmVyVHJhbnNpdGlvbiBhcyBvdGhlcndpc2Ugd2UgbWlnaHQgaGF2ZSBpbmNvcnJlY3QgY29uZmlndXJhdGlvbi5cbiAgICAgIHRyYW5zaXRpb25DYWxsUmVjb3JkZXIucmVtb3ZlKFxuICAgICAgICBwb3NpdGlvbixcbiAgICAgICAgYnJvd3Nlck1vZHVsZUZ1bGxJbXBvcnQucGFyZW50LmdldEZ1bGxXaWR0aCgpIC0gYnJvd3Nlck1vZHVsZUltcG9ydC5nZXRGdWxsV2lkdGgoKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdHJhbnNpdGlvbkNhbGxSZWNvcmRlci5pbnNlcnRMZWZ0KFxuICAgICAgcG9zaXRpb24sXG4gICAgICBgLndpdGhTZXJ2ZXJUcmFuc2l0aW9uKHsgYXBwSWQ6ICcke29wdGlvbnMuYXBwSWR9JyB9KWAsXG4gICAgKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZSh0cmFuc2l0aW9uQ2FsbFJlY29yZGVyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBjb3JlRGVwID0gZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9jb3JlJyk7XG4gICAgaWYgKGNvcmVEZXAgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCB2ZXJzaW9uLicpO1xuICAgIH1cbiAgICBjb25zdCBwbGF0Zm9ybVNlcnZlckRlcCA9IHtcbiAgICAgIC4uLmNvcmVEZXAsXG4gICAgICBuYW1lOiAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJyxcbiAgICB9O1xuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBwbGF0Zm9ybVNlcnZlckRlcCk7XG5cbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwge1xuICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgIG5hbWU6ICdAdHlwZXMvbm9kZScsXG4gICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1snQHR5cGVzL25vZGUnXSxcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuXG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIWNsaWVudFByb2plY3QgfHwgY2xpZW50UHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5pdmVyc2FsIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGllbnRCdWlsZFRhcmdldCA9IGNsaWVudFByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgaWYgKCFjbGllbnRCdWlsZFRhcmdldCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50QnVpbGRPcHRpb25zID0gKGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgfHxcbiAgICAgIHt9KSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3NyYycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb246IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFwudHMkLywgJycpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKSksXG4gICAgXSk7XG5cbiAgICBjb25zdCBjbGllbnRUc0NvbmZpZyA9IG5vcm1hbGl6ZShjbGllbnRCdWlsZE9wdGlvbnMudHNDb25maWcpO1xuICAgIGNvbnN0IHRzQ29uZmlnRXh0ZW5kcyA9IGJhc2VuYW1lKGNsaWVudFRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0RpcmVjdG9yeSA9IGRpcm5hbWUoY2xpZW50VHNDb25maWcpO1xuXG4gICAgY29uc3Qgcm9vdFNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcy9yb290JyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgc3RyaXBUc0V4dGVuc2lvbjogKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXC50cyQvLCAnJyksXG4gICAgICAgIHRzQ29uZmlnRXh0ZW5kcyxcbiAgICAgICAgaGFzTG9jYWxpemVQYWNrYWdlOiAhIWdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvbG9jYWxpemUnKSxcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QodHNDb25maWdEaXJlY3RvcnkpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICBdKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpLFxuICAgICAgbWVyZ2VXaXRoKHJvb3RTb3VyY2UpLFxuICAgICAgYWRkRGVwZW5kZW5jaWVzKCksXG4gICAgICB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5KSxcbiAgICAgIGFkZFNlcnZlclRyYW5zaXRpb24ob3B0aW9ucywgY2xpZW50QnVpbGRPcHRpb25zLm1haW4sIGNsaWVudFByb2plY3Qucm9vdCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=