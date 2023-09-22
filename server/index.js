"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
const node_path_1 = require("node:path");
const utility_1 = require("../utility");
const dependencies_1 = require("../utility/dependencies");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const paths_1 = require("../utility/paths");
const project_targets_1 = require("../utility/project-targets");
const util_1 = require("../utility/standalone/util");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const serverMainEntryName = 'main.server.ts';
function updateConfigFileBrowserBuilder(options, tsConfigDirectory) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        const clientProject = workspace.projects.get(options.project);
        if (clientProject) {
            // In case the browser builder hashes the assets
            // we need to add this setting to the server builder
            // as otherwise when assets it will be requested twice.
            // One for the server which will be unhashed, and other on the client which will be hashed.
            const getServerOptions = (options = {}) => {
                return {
                    buildOptimizer: options?.buildOptimizer,
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
            const sourceRoot = clientProject.sourceRoot ?? (0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src');
            const serverTsConfig = (0, core_1.join)(tsConfigDirectory, 'tsconfig.server.json');
            clientProject.targets.add({
                name: 'server',
                builder: workspace_models_1.Builders.Server,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${options.project}/server`,
                    main: (0, core_1.join)((0, core_1.normalize)(sourceRoot), serverMainEntryName),
                    tsConfig: serverTsConfig,
                    ...(buildTarget?.options ? getServerOptions(buildTarget?.options) : {}),
                },
                configurations,
            });
        }
    });
}
function updateConfigFileApplicationBuilder(options) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        const project = workspace.projects.get(options.project);
        if (!project) {
            return;
        }
        const buildTarget = project.targets.get('build');
        if (buildTarget?.builder !== workspace_models_1.Builders.Application) {
            throw new schematics_1.SchematicsException(`This schematic requires "${workspace_models_1.Builders.Application}" to be used as a build builder.`);
        }
        buildTarget.options ??= {};
        buildTarget.options['server'] = node_path_1.posix.join(project.sourceRoot ?? node_path_1.posix.join(project.root, 'src'), serverMainEntryName);
    });
}
function updateTsConfigFile(tsConfigPath) {
    return (host) => {
        const json = new json_file_1.JSONFile(host, tsConfigPath);
        const filesPath = ['files'];
        const files = new Set(json.get(filesPath) ?? []);
        files.add('src/' + serverMainEntryName);
        json.modify(filesPath, [...files]);
        const typePath = ['compilerOptions', 'types'];
        const types = new Set(json.get(typePath) ?? []);
        types.add('node');
        json.modify(typePath, [...types]);
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
        if (clientProject?.extensions.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Server schematic requires a project type of "application".`);
        }
        const clientBuildTarget = clientProject.targets.get('build');
        if (!clientBuildTarget) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const isUsingApplicationBuilder = clientBuildTarget.builder === workspace_models_1.Builders.Application;
        if (clientProject.targets.has('server') ||
            (isUsingApplicationBuilder && clientBuildTarget.options?.server !== undefined)) {
            // Server has already been added.
            return;
        }
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        const clientBuildOptions = clientBuildTarget.options;
        const browserEntryPoint = await (0, util_1.getMainFilePath)(host, options.project);
        const isStandalone = (0, ng_ast_utils_1.isStandaloneApp)(host, browserEntryPoint);
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)(isStandalone ? './files/standalone-src' : './files/src'), [
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                ...options,
            }),
            (0, schematics_1.move)((0, core_1.join)((0, core_1.normalize)(clientProject.root), 'src')),
        ]);
        const clientTsConfig = (0, core_1.normalize)(clientBuildOptions.tsConfig);
        const tsConfigExtends = (0, core_1.basename)(clientTsConfig);
        const tsConfigDirectory = (0, core_1.dirname)(clientTsConfig);
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(templateSource),
            ...(isUsingApplicationBuilder
                ? [
                    updateConfigFileApplicationBuilder(options),
                    updateTsConfigFile(clientBuildOptions.tsConfig),
                ]
                : [
                    (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/root'), [
                        (0, schematics_1.applyTemplates)({
                            ...schematics_1.strings,
                            ...options,
                            stripTsExtension: (s) => s.replace(/\.ts$/, ''),
                            tsConfigExtends,
                            hasLocalizePackage: !!(0, dependencies_1.getPackageJsonDependency)(host, '@angular/localize'),
                            relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(tsConfigDirectory),
                        }),
                        (0, schematics_1.move)(tsConfigDirectory),
                    ])),
                    updateConfigFileBrowserBuilder(options, tsConfigDirectory),
                ]),
            addDependencies(),
            (0, utility_1.addRootProvider)(options.project, ({ code, external }) => code `${external('provideClientHydration', '@angular/platform-browser')}()`),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQTJGO0FBQzNGLDJEQVlvQztBQUNwQyw0REFBMEU7QUFDMUUseUNBQWtDO0FBQ2xDLHdDQUE2QztBQUM3QywwREFJaUM7QUFDakMsb0RBQWdEO0FBQ2hELGdFQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQsNENBQStEO0FBQy9ELGdFQUFzRTtBQUN0RSxxREFBNkQ7QUFDN0Qsb0RBQXFFO0FBQ3JFLGtFQUF1RDtBQUd2RCxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDO0FBRTdDLFNBQVMsOEJBQThCLENBQUMsT0FBc0IsRUFBRSxpQkFBdUI7SUFDckYsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFOUQsSUFBSSxhQUFhLEVBQUU7WUFDakIsZ0RBQWdEO1lBQ2hELG9EQUFvRDtZQUNwRCx1REFBdUQ7WUFDdkQsMkZBQTJGO1lBQzNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxVQUFpRCxFQUFFLEVBQU0sRUFBRTtnQkFDbkYsT0FBTztvQkFDTCxjQUFjLEVBQUUsT0FBTyxFQUFFLGNBQWM7b0JBQ3ZDLGFBQWEsRUFBRSxPQUFPLEVBQUUsYUFBYSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYTtvQkFDbEYsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLGdCQUFnQjtvQkFDM0MsWUFBWSxFQUFFLE9BQU8sRUFBRSxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFT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NEJBd0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25WYWx1ZSwgUGF0aCwgYmFzZW5hbWUsIGRpcm5hbWUsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgcG9zaXggfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgYWRkUm9vdFByb3ZpZGVyIH0gZnJvbSAnLi4vdXRpbGl0eSc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeVR5cGUsXG4gIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbiAgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgaXNTdGFuZGFsb25lQXBwIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBnZXRNYWluRmlsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L3N0YW5kYWxvbmUvdXRpbCc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5jb25zdCBzZXJ2ZXJNYWluRW50cnlOYW1lID0gJ21haW4uc2VydmVyLnRzJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZUJyb3dzZXJCdWlsZGVyKG9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG5cbiAgICBpZiAoY2xpZW50UHJvamVjdCkge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgYnJvd3NlciBidWlsZGVyIGhhc2hlcyB0aGUgYXNzZXRzXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGlzIHNldHRpbmcgdG8gdGhlIHNlcnZlciBidWlsZGVyXG4gICAgICAvLyBhcyBvdGhlcndpc2Ugd2hlbiBhc3NldHMgaXQgd2lsbCBiZSByZXF1ZXN0ZWQgdHdpY2UuXG4gICAgICAvLyBPbmUgZm9yIHRoZSBzZXJ2ZXIgd2hpY2ggd2lsbCBiZSB1bmhhc2hlZCwgYW5kIG90aGVyIG9uIHRoZSBjbGllbnQgd2hpY2ggd2lsbCBiZSBoYXNoZWQuXG4gICAgICBjb25zdCBnZXRTZXJ2ZXJPcHRpb25zID0gKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIEpzb25WYWx1ZSB8IHVuZGVmaW5lZD4gPSB7fSk6IHt9ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBidWlsZE9wdGltaXplcjogb3B0aW9ucz8uYnVpbGRPcHRpbWl6ZXIsXG4gICAgICAgICAgb3V0cHV0SGFzaGluZzogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyA9PT0gJ2FsbCcgPyAnbWVkaWEnIDogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyxcbiAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBvcHRpb25zPy5maWxlUmVwbGFjZW1lbnRzLFxuICAgICAgICAgIG9wdGltaXphdGlvbjogb3B0aW9ucz8ub3B0aW1pemF0aW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAhIW9wdGlvbnM/Lm9wdGltaXphdGlvbixcbiAgICAgICAgICBzb3VyY2VNYXA6IG9wdGlvbnM/LnNvdXJjZU1hcCxcbiAgICAgICAgICBsb2NhbGl6YXRpb246IG9wdGlvbnM/LmxvY2FsaXphdGlvbixcbiAgICAgICAgICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IG9wdGlvbnM/LnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucyxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBvcHRpb25zPy5yZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICAgIGRlcGxveVVybDogb3B0aW9ucz8uZGVwbG95VXJsLFxuICAgICAgICAgIGkxOG5NaXNzaW5nVHJhbnNsYXRpb246IG9wdGlvbnM/LmkxOG5NaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgICAgICAgcHJlc2VydmVTeW1saW5rczogb3B0aW9ucz8ucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IG9wdGlvbnM/LmV4dHJhY3RMaWNlbnNlcyxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlOiBvcHRpb25zPy5pbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIHZlbmRvckNodW5rOiBvcHRpb25zPy52ZW5kb3JDaHVuayxcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICAgIGlmIChidWlsZFRhcmdldD8ub3B0aW9ucykge1xuICAgICAgICBidWlsZFRhcmdldC5vcHRpb25zLm91dHB1dFBhdGggPSBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vYnJvd3NlcmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlndXJhdGlvbnMgPSBidWlsZFRhcmdldD8uY29uZmlndXJhdGlvbnM7XG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBpZiAoYnVpbGRDb25maWd1cmF0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9wdGlvbnNdIG9mIE9iamVjdC5lbnRyaWVzKGJ1aWxkQ29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IGdldFNlcnZlck9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgc291cmNlUm9vdCA9IGNsaWVudFByb2plY3Quc291cmNlUm9vdCA/PyBqb2luKG5vcm1hbGl6ZShjbGllbnRQcm9qZWN0LnJvb3QpLCAnc3JjJyk7XG4gICAgICBjb25zdCBzZXJ2ZXJUc0NvbmZpZyA9IGpvaW4odHNDb25maWdEaXJlY3RvcnksICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicpO1xuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6ICdzZXJ2ZXInLFxuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5TZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyYCxcbiAgICAgICAgICBtYWluOiBqb2luKG5vcm1hbGl6ZShzb3VyY2VSb290KSwgc2VydmVyTWFpbkVudHJ5TmFtZSksXG4gICAgICAgICAgdHNDb25maWc6IHNlcnZlclRzQ29uZmlnLFxuICAgICAgICAgIC4uLihidWlsZFRhcmdldD8ub3B0aW9ucyA/IGdldFNlcnZlck9wdGlvbnMoYnVpbGRUYXJnZXQ/Lm9wdGlvbnMpIDoge30pLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9ucyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNvbmZpZ0ZpbGVBcHBsaWNhdGlvbkJ1aWxkZXIob3B0aW9uczogU2VydmVyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoYnVpbGRUYXJnZXQ/LmJ1aWxkZXIgIT09IEJ1aWxkZXJzLkFwcGxpY2F0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgYFRoaXMgc2NoZW1hdGljIHJlcXVpcmVzIFwiJHtCdWlsZGVycy5BcHBsaWNhdGlvbn1cIiB0byBiZSB1c2VkIGFzIGEgYnVpbGQgYnVpbGRlci5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBidWlsZFRhcmdldC5vcHRpb25zID8/PSB7fTtcbiAgICBidWlsZFRhcmdldC5vcHRpb25zWydzZXJ2ZXInXSA9IHBvc2l4LmpvaW4oXG4gICAgICBwcm9qZWN0LnNvdXJjZVJvb3QgPz8gcG9zaXguam9pbihwcm9qZWN0LnJvb3QsICdzcmMnKSxcbiAgICAgIHNlcnZlck1haW5FbnRyeU5hbWUsXG4gICAgKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzQ29uZmlnRmlsZSh0c0NvbmZpZ1BhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBqc29uID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gICAgY29uc3QgZmlsZXNQYXRoID0gWydmaWxlcyddO1xuICAgIGNvbnN0IGZpbGVzID0gbmV3IFNldCgoanNvbi5nZXQoZmlsZXNQYXRoKSBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPz8gW10pO1xuICAgIGZpbGVzLmFkZCgnc3JjLycgKyBzZXJ2ZXJNYWluRW50cnlOYW1lKTtcbiAgICBqc29uLm1vZGlmeShmaWxlc1BhdGgsIFsuLi5maWxlc10pO1xuXG4gICAgY29uc3QgdHlwZVBhdGggPSBbJ2NvbXBpbGVyT3B0aW9ucycsICd0eXBlcyddO1xuICAgIGNvbnN0IHR5cGVzID0gbmV3IFNldCgoanNvbi5nZXQodHlwZVBhdGgpIGFzIHN0cmluZ1tdIHwgdW5kZWZpbmVkKSA/PyBbXSk7XG4gICAgdHlwZXMuYWRkKCdub2RlJyk7XG4gICAganNvbi5tb2RpZnkodHlwZVBhdGgsIFsuLi50eXBlc10pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHBsYXRmb3JtU2VydmVyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6ICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcblxuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCB7XG4gICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgbmFtZTogJ0B0eXBlcy9ub2RlJyxcbiAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWydAdHlwZXMvbm9kZSddLFxuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogU2VydmVyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoY2xpZW50UHJvamVjdD8uZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFNlcnZlciBzY2hlbWF0aWMgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBpc1VzaW5nQXBwbGljYXRpb25CdWlsZGVyID0gY2xpZW50QnVpbGRUYXJnZXQuYnVpbGRlciA9PT0gQnVpbGRlcnMuQXBwbGljYXRpb247XG4gICAgaWYgKFxuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmhhcygnc2VydmVyJykgfHxcbiAgICAgIChpc1VzaW5nQXBwbGljYXRpb25CdWlsZGVyICYmIGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnM/LnNlcnZlciAhPT0gdW5kZWZpbmVkKVxuICAgICkge1xuICAgICAgLy8gU2VydmVyIGhhcyBhbHJlYWR5IGJlZW4gYWRkZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudEJ1aWxkT3B0aW9ucyA9IGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICBjb25zdCBicm93c2VyRW50cnlQb2ludCA9IGF3YWl0IGdldE1haW5GaWxlUGF0aChob3N0LCBvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IGlzU3RhbmRhbG9uZSA9IGlzU3RhbmRhbG9uZUFwcChob3N0LCBicm93c2VyRW50cnlQb2ludCk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybChpc1N0YW5kYWxvbmUgPyAnLi9maWxlcy9zdGFuZGFsb25lLXNyYycgOiAnLi9maWxlcy9zcmMnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtb3ZlKGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKSksXG4gICAgXSk7XG5cbiAgICBjb25zdCBjbGllbnRUc0NvbmZpZyA9IG5vcm1hbGl6ZShjbGllbnRCdWlsZE9wdGlvbnMudHNDb25maWcpO1xuICAgIGNvbnN0IHRzQ29uZmlnRXh0ZW5kcyA9IGJhc2VuYW1lKGNsaWVudFRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0RpcmVjdG9yeSA9IGRpcm5hbWUoY2xpZW50VHNDb25maWcpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICAuLi4oaXNVc2luZ0FwcGxpY2F0aW9uQnVpbGRlclxuICAgICAgICA/IFtcbiAgICAgICAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGVBcHBsaWNhdGlvbkJ1aWxkZXIob3B0aW9ucyksXG4gICAgICAgICAgICB1cGRhdGVUc0NvbmZpZ0ZpbGUoY2xpZW50QnVpbGRPcHRpb25zLnRzQ29uZmlnKSxcbiAgICAgICAgICBdXG4gICAgICAgIDogW1xuICAgICAgICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICAgICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgICAgICAgICAgIHRzQ29uZmlnRXh0ZW5kcyxcbiAgICAgICAgICAgICAgICAgIGhhc0xvY2FsaXplUGFja2FnZTogISFnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2xvY2FsaXplJyksXG4gICAgICAgICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgbW92ZSh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGVCcm93c2VyQnVpbGRlcihvcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgXSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIGFkZFJvb3RQcm92aWRlcihcbiAgICAgICAgb3B0aW9ucy5wcm9qZWN0LFxuICAgICAgICAoeyBjb2RlLCBleHRlcm5hbCB9KSA9PlxuICAgICAgICAgIGNvZGVgJHtleHRlcm5hbCgncHJvdmlkZUNsaWVudEh5ZHJhdGlvbicsICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJyl9KClgLFxuICAgICAgKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==