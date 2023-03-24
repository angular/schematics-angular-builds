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
const dependencies_1 = require("../utility/dependencies");
const latest_versions_1 = require("../utility/latest-versions");
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
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdW5pdmVyc2FsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQTJGO0FBQzNGLDJEQVlvQztBQUNwQyw0REFBMEU7QUFDMUUsMERBSWlDO0FBQ2pDLGdFQUE0RDtBQUM1RCw0Q0FBK0Q7QUFDL0QsZ0VBQXNFO0FBQ3RFLG9EQUFxRTtBQUNyRSxrRUFBOEU7QUFHOUUsU0FBUyxnQkFBZ0IsQ0FBQyxPQUF5QixFQUFFLGlCQUF1QjtJQUMxRSxPQUFPLElBQUEsMkJBQWUsRUFBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5RCxJQUFJLGFBQWEsRUFBRTtZQUNqQixnREFBZ0Q7WUFDaEQsb0RBQW9EO1lBQ3BELHVEQUF1RDtZQUN2RCwyRkFBMkY7WUFDM0YsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFVBQWlELEVBQUUsRUFBTSxFQUFFO2dCQUNuRixPQUFPO29CQUNMLGFBQWEsRUFBRSxPQUFPLEVBQUUsYUFBYSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsYUFBYTtvQkFDbEYsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLGdCQUFnQjtvQkFDM0MsWUFBWSxFQUFFLE9BQU8sRUFBRSxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWTtvQkFDdkYsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTO29CQUM3QixZQUFZLEVBQUUsT0FBTyxFQUFFLFlBQVk7b0JBQ25DLHdCQUF3QixFQUFFLE9BQU8s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LCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvblZhbHVlLCBQYXRoLCBiYXNlbmFtZSwgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeVR5cGUsXG4gIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbiAgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBVbml2ZXJzYWxPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG5cbiAgICBpZiAoY2xpZW50UHJvamVjdCkge1xuICAgICAgLy8gSW4gY2FzZSB0aGUgYnJvd3NlciBidWlsZGVyIGhhc2hlcyB0aGUgYXNzZXRzXG4gICAgICAvLyB3ZSBuZWVkIHRvIGFkZCB0aGlzIHNldHRpbmcgdG8gdGhlIHNlcnZlciBidWlsZGVyXG4gICAgICAvLyBhcyBvdGhlcndpc2Ugd2hlbiBhc3NldHMgaXQgd2lsbCBiZSByZXF1ZXN0ZWQgdHdpY2UuXG4gICAgICAvLyBPbmUgZm9yIHRoZSBzZXJ2ZXIgd2hpY2ggd2lsbCBiZSB1bmhhc2hlZCwgYW5kIG90aGVyIG9uIHRoZSBjbGllbnQgd2hpY2ggd2lsbCBiZSBoYXNoZWQuXG4gICAgICBjb25zdCBnZXRTZXJ2ZXJPcHRpb25zID0gKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIEpzb25WYWx1ZSB8IHVuZGVmaW5lZD4gPSB7fSk6IHt9ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvdXRwdXRIYXNoaW5nOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nID09PSAnYWxsJyA/ICdtZWRpYScgOiBvcHRpb25zPy5vdXRwdXRIYXNoaW5nLFxuICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IG9wdGlvbnM/LmZpbGVSZXBsYWNlbWVudHMsXG4gICAgICAgICAgb3B0aW1pemF0aW9uOiBvcHRpb25zPy5vcHRpbWl6YXRpb24gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6ICEhb3B0aW9ucz8ub3B0aW1pemF0aW9uLFxuICAgICAgICAgIHNvdXJjZU1hcDogb3B0aW9ucz8uc291cmNlTWFwLFxuICAgICAgICAgIGxvY2FsaXphdGlvbjogb3B0aW9ucz8ubG9jYWxpemF0aW9uLFxuICAgICAgICAgIHN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uczogb3B0aW9ucz8uc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLFxuICAgICAgICAgIHJlc291cmNlc091dHB1dFBhdGg6IG9wdGlvbnM/LnJlc291cmNlc091dHB1dFBhdGgsXG4gICAgICAgICAgZGVwbG95VXJsOiBvcHRpb25zPy5kZXBsb3lVcmwsXG4gICAgICAgICAgaTE4bk1pc3NpbmdUcmFuc2xhdGlvbjogb3B0aW9ucz8uaTE4bk1pc3NpbmdUcmFuc2xhdGlvbixcbiAgICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBvcHRpb25zPy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogb3B0aW9ucz8uZXh0cmFjdExpY2Vuc2VzLFxuICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2U6IG9wdGlvbnM/LmlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgICAgdmVuZG9yQ2h1bms6IG9wdGlvbnM/LnZlbmRvckNodW5rLFxuICAgICAgICB9O1xuICAgICAgfTtcblxuICAgICAgY29uc3QgYnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgICAgaWYgKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSB7XG4gICAgICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMub3V0cHV0UGF0aCA9IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9icm93c2VyYDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVpbGRDb25maWd1cmF0aW9ucyA9IGJ1aWxkVGFyZ2V0Py5jb25maWd1cmF0aW9ucztcbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGlmIChidWlsZENvbmZpZ3VyYXRpb25zKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgb3B0aW9uc10gb2YgT2JqZWN0LmVudHJpZXMoYnVpbGRDb25maWd1cmF0aW9ucykpIHtcbiAgICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0gZ2V0U2VydmVyT3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtYWluUGF0aCA9IG9wdGlvbnMubWFpbiBhcyBzdHJpbmc7XG4gICAgICBjb25zdCBzb3VyY2VSb290ID0gY2xpZW50UHJvamVjdC5zb3VyY2VSb290ID8/IGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKTtcbiAgICAgIGNvbnN0IHNlcnZlclRzQ29uZmlnID0gam9pbih0c0NvbmZpZ0RpcmVjdG9yeSwgJ3RzY29uZmlnLnNlcnZlci5qc29uJyk7XG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ3NlcnZlcicsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG91dHB1dFBhdGg6IGBkaXN0LyR7b3B0aW9ucy5wcm9qZWN0fS9zZXJ2ZXJgLFxuICAgICAgICAgIG1haW46IGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aC5lbmRzV2l0aCgnLnRzJykgPyBtYWluUGF0aCA6IG1haW5QYXRoICsgJy50cycpLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgICAuLi4oYnVpbGRUYXJnZXQ/Lm9wdGlvbnMgPyBnZXRTZXJ2ZXJPcHRpb25zKGJ1aWxkVGFyZ2V0Py5vcHRpb25zKSA6IHt9KSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnMsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHBsYXRmb3JtU2VydmVyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6ICdAYW5ndWxhci9wbGF0Zm9ybS1zZXJ2ZXInLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcblxuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCB7XG4gICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgbmFtZTogJ0B0eXBlcy9ub2RlJyxcbiAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWydAdHlwZXMvbm9kZSddLFxuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCB8fCBjbGllbnRQcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBVbml2ZXJzYWwgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbGllbnRCdWlsZE9wdGlvbnMgPSAoY2xpZW50QnVpbGRUYXJnZXQub3B0aW9ucyB8fFxuICAgICAge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvc3JjJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgc3RyaXBUc0V4dGVuc2lvbjogKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXC50cyQvLCAnJyksXG4gICAgICB9KSxcbiAgICAgIG1vdmUoam9pbihub3JtYWxpemUoY2xpZW50UHJvamVjdC5yb290KSwgJ3NyYycpKSxcbiAgICBdKTtcblxuICAgIGNvbnN0IGNsaWVudFRzQ29uZmlnID0gbm9ybWFsaXplKGNsaWVudEJ1aWxkT3B0aW9ucy50c0NvbmZpZyk7XG4gICAgY29uc3QgdHNDb25maWdFeHRlbmRzID0gYmFzZW5hbWUoY2xpZW50VHNDb25maWcpO1xuICAgIGNvbnN0IHRzQ29uZmlnRGlyZWN0b3J5ID0gZGlybmFtZShjbGllbnRUc0NvbmZpZyk7XG5cbiAgICBjb25zdCByb290U291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzdHJpcFRzRXh0ZW5zaW9uOiAoczogc3RyaW5nKSA9PiBzLnJlcGxhY2UoL1xcLnRzJC8sICcnKSxcbiAgICAgICAgdHNDb25maWdFeHRlbmRzLFxuICAgICAgICBoYXNMb2NhbGl6ZVBhY2thZ2U6ICEhZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9sb2NhbGl6ZScpLFxuICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCh0c0NvbmZpZ0RpcmVjdG9yeSksXG4gICAgICB9KSxcbiAgICAgIG1vdmUodHNDb25maWdEaXJlY3RvcnkpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBtZXJnZVdpdGgocm9vdFNvdXJjZSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGUob3B0aW9ucywgdHNDb25maWdEaXJlY3RvcnkpLFxuICAgIF0pO1xuICB9O1xufVxuIl19