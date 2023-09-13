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
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmVyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQTJGO0FBQzNGLDJEQVlvQztBQUNwQyw0REFBMEU7QUFDMUUseUNBQWtDO0FBQ2xDLDBEQUlpQztBQUNqQyxvREFBZ0Q7QUFDaEQsZ0VBQTREO0FBQzVELDBEQUEwRDtBQUMxRCw0Q0FBK0Q7QUFDL0QsZ0VBQXNFO0FBQ3RFLHFEQUE2RDtBQUM3RCxvREFBcUU7QUFDckUsa0VBQXVEO0FBR3ZELE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUM7QUFFN0MsU0FBUyw4QkFBOEIsQ0FBQyxPQUFzQixFQUFFLGlCQUF1QjtJQUNyRixPQUFPLElBQUEsMkJBQWUsRUFBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5RCxJQUFJLGFBQWEsRUFBRTtZQUNqQixnREFBZ0Q7WUFDaEQsb0RBQW9EO1lBQ3BELHVEQUF1RDtZQUN2RCwyRkFBMkY7WUFDM0YsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQWlELEVBQUUsRUFBTSxFQUFFO2dCQUNuRixPQUFPO29CQUNMLGNBQWMsRUFBRSxPQUFPLEVBQUUsY0FBYztvQkFDdkMsYUFBYSxFQUFFLE9BQU8sRUFBRSxhQUFhLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxhQUFhO29CQUNsRixnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCO29CQUMzQyxZQUFZLEVBQUUsT0FBTyxFQUFFLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENB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aUIsR0FBRyxJQUFBLGNBQU8sRUFBQyxjQUFjLENBQUMsQ0FBQztRQUVsRCxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsc0JBQVMsRUFBQyxjQUFjLENBQUM7WUFDekIsR0FBRyxDQUFDLHlCQUF5QjtnQkFDM0IsQ0FBQyxDQUFDO29CQUNFLGtDQUFrQyxDQUFDLE9BQU8sQ0FBQztvQkFDM0Msa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDO2lCQUNoRDtnQkFDSCxDQUFDLENBQUM7b0JBQ0UsSUFBQSxzQkFBUyxFQUNQLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsY0FBYyxDQUFDLEVBQUU7d0JBQ3pCLElBQUEsMkJBQWMsRUFBQzs0QkFDYixHQUFHLG9CQUFPOzRCQUNWLEdBQUcsT0FBTzs0QkFDVixnQkFBZ0IsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDOzRCQUN2RCxlQUFlOzRCQUNmLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQzs0QkFDekUsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxpQkFBaUIsQ0FBQzt5QkFDNUUsQ0FBQzt3QkFDRixJQUFBLGlCQUFJLEVBQUMsaUJBQWlCLENBQUM7cUJBQ3hCLENBQUMsQ0FDSDtvQkFDRCw4QkFBOEIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7aUJBQzNELENBQUM7WUFDTixlQUFlLEVBQUU7U0FDbEIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQW5FRCw0QkFtRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlLCBQYXRoLCBiYXNlbmFtZSwgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBwb3NpeCB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeVR5cGUsXG4gIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbiAgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgaXNTdGFuZGFsb25lQXBwIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBnZXRNYWluRmlsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L3N0YW5kYWxvbmUvdXRpbCc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5jb25zdCBzZXJ2ZXJNYWluRW50cnlOYW1lID0gJ21haW4uc2VydmVyLnRzJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZUJyb3dzZXJCdWlsZGVyKG9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG5cbiAgICBpZiAoY2xpZW50UHJvamVjdCkge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgYnJvd3NlciBidWlsZGVyIGhhc2hlcyB0aGUgYXNzZXRzXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGlzIHNldHRpbmcgdG8gdGhlIHNlcnZlciBidWlsZGVyXG4gICAgICAvLyBhcyBvdGhlcndpc2Ugd2hlbiBhc3NldHMgaXQgd2lsbCBiZSByZXF1ZXN0ZWQgdHdpY2UuXG4gICAgICAvLyBPbmUgZm9yIHRoZSBzZXJ2ZXIgd2hpY2ggd2lsbCBiZSB1bmhhc2hlZCwgYW5kIG90aGVyIG9uIHRoZSBjbGllbnQgd2hpY2ggd2lsbCBiZSBoYXNoZWQuXG4gICAgICBjb25zdCBnZXRTZXJ2ZXJPcHRpb25zID0gKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIEpzb25WYWx1ZSB8IHVuZGVmaW5lZD4gPSB7fSk6IHt9ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBidWlsZE9wdGltaXplcjogb3B0aW9ucz8uYnVpbGRPcHRpbWl6ZXIsXG4gICAgICAgICAgb3V0cHV0SGFzaGluZzogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyA9PT0gJ2FsbCcgPyAnbWVkaWEnIDogb3B0aW9ucz8ub3V0cHV0SGFzaGluZyxcbiAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBvcHRpb25zPy5maWxlUmVwbGFjZW1lbnRzLFxuICAgICAgICAgIG9wdGltaXphdGlvbjogb3B0aW9ucz8ub3B0aW1pemF0aW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiAhIW9wdGlvbnM/Lm9wdGltaXphdGlvbixcbiAgICAgICAgICBzb3VyY2VNYXA6IG9wdGlvbnM/LnNvdXJjZU1hcCxcbiAgICAgICAgICBsb2NhbGl6YXRpb246IG9wdGlvbnM/LmxvY2FsaXphdGlvbixcbiAgICAgICAgICBzdHlsZVByZXByb2Nlc3Nvck9wdGlvbnM6IG9wdGlvbnM/LnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucyxcbiAgICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoOiBvcHRpb25zPy5yZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICAgIGRlcGxveVVybDogb3B0aW9ucz8uZGVwbG95VXJsLFxuICAgICAgICAgIGkxOG5NaXNzaW5nVHJhbnNsYXRpb246IG9wdGlvbnM/LmkxOG5NaXNzaW5nVHJhbnNsYXRpb24sXG4gICAgICAgICAgcHJlc2VydmVTeW1saW5rczogb3B0aW9ucz8ucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IG9wdGlvbnM/LmV4dHJhY3RMaWNlbnNlcyxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlOiBvcHRpb25zPy5pbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIHZlbmRvckNodW5rOiBvcHRpb25zPy52ZW5kb3JDaHVuayxcbiAgICAgICAgfTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICAgIGlmIChidWlsZFRhcmdldD8ub3B0aW9ucykge1xuICAgICAgICBidWlsZFRhcmdldC5vcHRpb25zLm91dHB1dFBhdGggPSBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vYnJvd3NlcmA7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlndXJhdGlvbnMgPSBidWlsZFRhcmdldD8uY29uZmlndXJhdGlvbnM7XG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBpZiAoYnVpbGRDb25maWd1cmF0aW9ucykge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG9wdGlvbnNdIG9mIE9iamVjdC5lbnRyaWVzKGJ1aWxkQ29uZmlndXJhdGlvbnMpKSB7XG4gICAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IGdldFNlcnZlck9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgc291cmNlUm9vdCA9IGNsaWVudFByb2plY3Quc291cmNlUm9vdCA/PyBqb2luKG5vcm1hbGl6ZShjbGllbnRQcm9qZWN0LnJvb3QpLCAnc3JjJyk7XG4gICAgICBjb25zdCBzZXJ2ZXJUc0NvbmZpZyA9IGpvaW4odHNDb25maWdEaXJlY3RvcnksICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicpO1xuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICAgIG5hbWU6ICdzZXJ2ZXInLFxuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5TZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke29wdGlvbnMucHJvamVjdH0vc2VydmVyYCxcbiAgICAgICAgICBtYWluOiBqb2luKG5vcm1hbGl6ZShzb3VyY2VSb290KSwgc2VydmVyTWFpbkVudHJ5TmFtZSksXG4gICAgICAgICAgdHNDb25maWc6IHNlcnZlclRzQ29uZmlnLFxuICAgICAgICAgIC4uLihidWlsZFRhcmdldD8ub3B0aW9ucyA/IGdldFNlcnZlck9wdGlvbnMoYnVpbGRUYXJnZXQ/Lm9wdGlvbnMpIDoge30pLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9ucyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNvbmZpZ0ZpbGVBcHBsaWNhdGlvbkJ1aWxkZXIob3B0aW9uczogU2VydmVyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoYnVpbGRUYXJnZXQ/LmJ1aWxkZXIgIT09IEJ1aWxkZXJzLkFwcGxpY2F0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgYFRoaXMgc2NoZW1hdGljIHJlcXVpcmVzIFwiJHtCdWlsZGVycy5BcHBsaWNhdGlvbn1cIiB0byBiZSB1c2VkIGFzIGEgYnVpbGQgYnVpbGRlci5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBidWlsZFRhcmdldC5vcHRpb25zID8/PSB7fTtcbiAgICBidWlsZFRhcmdldC5vcHRpb25zWydzZXJ2ZXInXSA9IHBvc2l4LmpvaW4oXG4gICAgICBwcm9qZWN0LnNvdXJjZVJvb3QgPz8gcG9zaXguam9pbihwcm9qZWN0LnJvb3QsICdzcmMnKSxcbiAgICAgIHNlcnZlck1haW5FbnRyeU5hbWUsXG4gICAgKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzQ29uZmlnRmlsZSh0c0NvbmZpZ1BhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBqc29uID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gICAgY29uc3QgZmlsZXNQYXRoID0gWydmaWxlcyddO1xuICAgIGNvbnN0IGZpbGVzID0gbmV3IFNldCgoanNvbi5nZXQoZmlsZXNQYXRoKSBhcyBzdHJpbmdbXSB8IHVuZGVmaW5lZCkgPz8gW10pO1xuICAgIGZpbGVzLmFkZCgnc3JjLycgKyBzZXJ2ZXJNYWluRW50cnlOYW1lKTtcbiAgICBqc29uLm1vZGlmeShmaWxlc1BhdGgsIFsuLi5maWxlc10pO1xuXG4gICAgY29uc3QgdHlwZVBhdGggPSBbJ2NvbXBpbGVyT3B0aW9ucycsICd0eXBlcyddO1xuICAgIGNvbnN0IHR5cGVzID0gbmV3IFNldCgoanNvbi5nZXQodHlwZVBhdGgpIGFzIHN0cmluZ1tdIHwgdW5kZWZpbmVkKSA/PyBbXSk7XG4gICAgdHlwZXMuYWRkKCdub2RlJyk7XG4gICAganNvbi5tb2RpZnkodHlwZVBhdGgsIFsuLi50eXBlc10pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHBsYXRmb3JtU2VydmVyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6ICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcblxuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCB7XG4gICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgbmFtZTogJ0B0eXBlcy9ub2RlJyxcbiAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWydAdHlwZXMvbm9kZSddLFxuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogU2VydmVyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoY2xpZW50UHJvamVjdD8uZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFNlcnZlciBzY2hlbWF0aWMgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBpc1VzaW5nQXBwbGljYXRpb25CdWlsZGVyID0gY2xpZW50QnVpbGRUYXJnZXQuYnVpbGRlciA9PT0gQnVpbGRlcnMuQXBwbGljYXRpb247XG4gICAgaWYgKFxuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmhhcygnc2VydmVyJykgfHxcbiAgICAgIChpc1VzaW5nQXBwbGljYXRpb25CdWlsZGVyICYmIGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnM/LnNlcnZlciAhPT0gdW5kZWZpbmVkKVxuICAgICkge1xuICAgICAgLy8gU2VydmVyIGhhcyBhbHJlYWR5IGJlZW4gYWRkZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudEJ1aWxkT3B0aW9ucyA9IGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgICBjb25zdCBicm93c2VyRW50cnlQb2ludCA9IGF3YWl0IGdldE1haW5GaWxlUGF0aChob3N0LCBvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IGlzU3RhbmRhbG9uZSA9IGlzU3RhbmRhbG9uZUFwcChob3N0LCBicm93c2VyRW50cnlQb2ludCk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybChpc1N0YW5kYWxvbmUgPyAnLi9maWxlcy9zdGFuZGFsb25lLXNyYycgOiAnLi9maWxlcy9zcmMnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtb3ZlKGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKSksXG4gICAgXSk7XG5cbiAgICBjb25zdCBjbGllbnRUc0NvbmZpZyA9IG5vcm1hbGl6ZShjbGllbnRCdWlsZE9wdGlvbnMudHNDb25maWcpO1xuICAgIGNvbnN0IHRzQ29uZmlnRXh0ZW5kcyA9IGJhc2VuYW1lKGNsaWVudFRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0RpcmVjdG9yeSA9IGRpcm5hbWUoY2xpZW50VHNDb25maWcpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICAuLi4oaXNVc2luZ0FwcGxpY2F0aW9uQnVpbGRlclxuICAgICAgICA/IFtcbiAgICAgICAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGVBcHBsaWNhdGlvbkJ1aWxkZXIob3B0aW9ucyksXG4gICAgICAgICAgICB1cGRhdGVUc0NvbmZpZ0ZpbGUoY2xpZW50QnVpbGRPcHRpb25zLnRzQ29uZmlnKSxcbiAgICAgICAgICBdXG4gICAgICAgIDogW1xuICAgICAgICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMvcm9vdCcpLCBbXG4gICAgICAgICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgICAgICAgICAgIHRzQ29uZmlnRXh0ZW5kcyxcbiAgICAgICAgICAgICAgICAgIGhhc0xvY2FsaXplUGFja2FnZTogISFnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2xvY2FsaXplJyksXG4gICAgICAgICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgbW92ZSh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgICAgIF0pLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGVCcm93c2VyQnVpbGRlcihvcHRpb25zLCB0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICAgICAgXSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==