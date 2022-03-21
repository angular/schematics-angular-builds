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
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const paths_1 = require("../utility/paths");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
function updateTsConfig(packageName, ...paths) {
    return (host) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        const file = new json_file_1.JSONFile(host, 'tsconfig.json');
        const jsonPath = ['compilerOptions', 'paths', packageName];
        const value = file.get(jsonPath);
        file.modify(jsonPath, Array.isArray(value) ? [...value, ...paths] : paths);
    };
}
function addDependenciesToPackageJson() {
    return (host) => {
        [
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular/compiler-cli',
                version: latest_versions_1.latestVersions.Angular,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular-devkit/build-angular',
                version: latest_versions_1.latestVersions.DevkitBuildAngular,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'ng-packagr',
                version: latest_versions_1.latestVersions['ng-packagr'],
            },
            {
                type: dependencies_1.NodeDependencyType.Default,
                name: 'tslib',
                version: latest_versions_1.latestVersions['tslib'],
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'typescript',
                version: latest_versions_1.latestVersions['typescript'],
            },
        ].forEach((dependency) => (0, dependencies_1.addPackageJsonDependency)(host, dependency));
        return host;
    };
}
function addLibToWorkspaceFile(options, projectRoot, projectName) {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        if (workspace.projects.size === 0) {
            workspace.extensions.defaultProject = projectName;
        }
        workspace.projects.add({
            name: projectName,
            root: projectRoot,
            sourceRoot: `${projectRoot}/src`,
            projectType: workspace_models_1.ProjectType.Library,
            prefix: options.prefix,
            targets: {
                build: {
                    builder: workspace_models_1.Builders.NgPackagr,
                    defaultConfiguration: 'production',
                    options: {
                        project: `${projectRoot}/ng-package.json`,
                    },
                    configurations: {
                        production: {
                            tsConfig: `${projectRoot}/tsconfig.lib.prod.json`,
                        },
                        development: {
                            tsConfig: `${projectRoot}/tsconfig.lib.json`,
                        },
                    },
                },
                test: {
                    builder: workspace_models_1.Builders.Karma,
                    options: {
                        main: `${projectRoot}/src/test.ts`,
                        tsConfig: `${projectRoot}/tsconfig.spec.json`,
                        karmaConfig: `${projectRoot}/karma.conf.js`,
                    },
                },
            },
        });
    });
}
function default_1(options) {
    return async (host) => {
        const prefix = options.prefix;
        // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
        const packageName = options.name;
        if (/^@.*\/.*/.test(options.name)) {
            const [, name] = options.name.split('/');
            options.name = name;
        }
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const newProjectRoot = workspace.extensions.newProjectRoot || '';
        let folderName = packageName.startsWith('@') ? packageName.slice(1) : packageName;
        if (/[A-Z]/.test(folderName)) {
            folderName = core_1.strings.dasherize(folderName);
        }
        const projectRoot = (0, core_1.join)((0, core_1.normalize)(newProjectRoot), folderName);
        const distRoot = `dist/${folderName}`;
        const pathImportLib = `${distRoot}/${folderName.replace('/', '-')}`;
        const sourceDir = `${projectRoot}/src/lib`;
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                ...options,
                packageName,
                projectRoot,
                distRoot,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(projectRoot),
                prefix,
                angularLatestVersion: latest_versions_1.latestVersions.Angular.replace(/~|\^/, ''),
                tsLibLatestVersion: latest_versions_1.latestVersions['tslib'].replace(/~|\^/, ''),
                folderName,
            }),
            (0, schematics_1.move)(projectRoot),
        ]);
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(templateSource),
            addLibToWorkspaceFile(options, projectRoot, packageName),
            options.skipPackageJson ? (0, schematics_1.noop)() : addDependenciesToPackageJson(),
            options.skipTsConfig ? (0, schematics_1.noop)() : updateTsConfig(packageName, pathImportLib, distRoot),
            (0, schematics_1.schematic)('module', {
                name: options.name,
                commonModule: false,
                flat: true,
                path: sourceDir,
                project: packageName,
            }),
            (0, schematics_1.schematic)('component', {
                name: options.name,
                selector: `${prefix}-${options.name}`,
                inlineStyle: true,
                inlineTemplate: true,
                flat: true,
                path: sourceDir,
                export: true,
                project: packageName,
            }),
            (0, schematics_1.schematic)('service', {
                name: options.name,
                flat: true,
                path: sourceDir,
                project: packageName,
            }),
            (_tree, context) => {
                if (!options.skipPackageJson && !options.skipInstall) {
                    context.addTask(new tasks_1.NodePackageInstallTask());
                }
            },
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbGlicmFyeS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUFnRTtBQUNoRSwyREFZb0M7QUFDcEMsNERBQTBFO0FBQzFFLDBEQUF1RjtBQUN2RixvREFBZ0Q7QUFDaEQsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBR3BFLFNBQVMsY0FBYyxDQUFDLFdBQW1CLEVBQUUsR0FBRyxLQUFlO0lBQzdELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUNqQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNqRCxNQUFNLFFBQVEsR0FBRyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsNEJBQTRCO0lBQ25DLE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQjtZQUNFO2dCQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO2dCQUM1QixJQUFJLEVBQUUsdUJBQXVC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QUFJLEVBQUUsSUFBSTtnQkFDVixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsV0FBVzthQUNyQixDQUFDO1lBQ0YsQ0FBQyxLQUFXLEVBQUUsT0FBeUIsRUFBRSxFQUFFO2dCQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7b0JBQ3BELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDLENBQUM7aUJBQy9DO1lBQ0gsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUEzRUQsNEJBMkVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFByb2plY3RUeXBlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBMaWJyYXJ5T3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gdXBkYXRlVHNDb25maWcocGFja2FnZU5hbWU6IHN0cmluZywgLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3RzY29uZmlnLmpzb24nKSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZSA9IG5ldyBKU09ORmlsZShob3N0LCAndHNjb25maWcuanNvbicpO1xuICAgIGNvbnN0IGpzb25QYXRoID0gWydjb21waWxlck9wdGlvbnMnLCAncGF0aHMnLCBwYWNrYWdlTmFtZV07XG4gICAgY29uc3QgdmFsdWUgPSBmaWxlLmdldChqc29uUGF0aCk7XG4gICAgZmlsZS5tb2RpZnkoanNvblBhdGgsIEFycmF5LmlzQXJyYXkodmFsdWUpID8gWy4uLnZhbHVlLCAuLi5wYXRoc10gOiBwYXRocyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnbmctcGFja2FncicsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWyduZy1wYWNrYWdyJ10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGVmYXVsdCxcbiAgICAgICAgbmFtZTogJ3RzbGliJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ3RzbGliJ10sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHlwZXNjcmlwdCcsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWyd0eXBlc2NyaXB0J10sXG4gICAgICB9LFxuICAgIF0uZm9yRWFjaCgoZGVwZW5kZW5jeSkgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRMaWJUb1dvcmtzcGFjZUZpbGUoXG4gIG9wdGlvbnM6IExpYnJhcnlPcHRpb25zLFxuICBwcm9qZWN0Um9vdDogc3RyaW5nLFxuICBwcm9qZWN0TmFtZTogc3RyaW5nLFxuKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMCkge1xuICAgICAgd29ya3NwYWNlLmV4dGVuc2lvbnMuZGVmYXVsdFByb2plY3QgPSBwcm9qZWN0TmFtZTtcbiAgICB9XG5cbiAgICB3b3Jrc3BhY2UucHJvamVjdHMuYWRkKHtcbiAgICAgIG5hbWU6IHByb2plY3ROYW1lLFxuICAgICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgICBzb3VyY2VSb290OiBgJHtwcm9qZWN0Um9vdH0vc3JjYCxcbiAgICAgIHByb2plY3RUeXBlOiBQcm9qZWN0VHlwZS5MaWJyYXJ5LFxuICAgICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCxcbiAgICAgIHRhcmdldHM6IHtcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5OZ1BhY2thZ3IsXG4gICAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBwcm9qZWN0OiBgJHtwcm9qZWN0Um9vdH0vbmctcGFja2FnZS5qc29uYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcubGliLnByb2QuanNvbmAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fS90c2NvbmZpZy5saWIuanNvbmAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRlc3Q6IHtcbiAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5LYXJtYSxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fS90c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fS9rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBMaWJyYXJ5T3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zLnByZWZpeDtcblxuICAgIC8vIElmIHNjb3BlZCBwcm9qZWN0IChpLmUuIFwiQGZvby9iYXJcIiksIGNvbnZlcnQgcHJvamVjdERpciB0byBcImZvby9iYXJcIi5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICBpZiAoL15ALipcXC8uKi8udGVzdChvcHRpb25zLm5hbWUpKSB7XG4gICAgICBjb25zdCBbLCBuYW1lXSA9IG9wdGlvbnMubmFtZS5zcGxpdCgnLycpO1xuICAgICAgb3B0aW9ucy5uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSAod29ya3NwYWNlLmV4dGVuc2lvbnMubmV3UHJvamVjdFJvb3QgYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAnJztcblxuICAgIGxldCBmb2xkZXJOYW1lID0gcGFja2FnZU5hbWUuc3RhcnRzV2l0aCgnQCcpID8gcGFja2FnZU5hbWUuc2xpY2UoMSkgOiBwYWNrYWdlTmFtZTtcbiAgICBpZiAoL1tBLVpdLy50ZXN0KGZvbGRlck5hbWUpKSB7XG4gICAgICBmb2xkZXJOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUoZm9sZGVyTmFtZSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdFJvb3QgPSBqb2luKG5vcm1hbGl6ZShuZXdQcm9qZWN0Um9vdCksIGZvbGRlck5hbWUpO1xuICAgIGNvbnN0IGRpc3RSb290ID0gYGRpc3QvJHtmb2xkZXJOYW1lfWA7XG4gICAgY29uc3QgcGF0aEltcG9ydExpYiA9IGAke2Rpc3RSb290fS8ke2ZvbGRlck5hbWUucmVwbGFjZSgnLycsICctJyl9YDtcbiAgICBjb25zdCBzb3VyY2VEaXIgPSBgJHtwcm9qZWN0Um9vdH0vc3JjL2xpYmA7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwcm9qZWN0Um9vdCxcbiAgICAgICAgZGlzdFJvb3QsXG4gICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHByb2plY3RSb290KSxcbiAgICAgICAgcHJlZml4LFxuICAgICAgICBhbmd1bGFyTGF0ZXN0VmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhci5yZXBsYWNlKC9+fFxcXi8sICcnKSxcbiAgICAgICAgdHNMaWJMYXRlc3RWZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1sndHNsaWInXS5yZXBsYWNlKC9+fFxcXi8sICcnKSxcbiAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwcm9qZWN0Um9vdCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIGFkZExpYlRvV29ya3NwYWNlRmlsZShvcHRpb25zLCBwcm9qZWN0Um9vdCwgcGFja2FnZU5hbWUpLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCksXG4gICAgICBvcHRpb25zLnNraXBUc0NvbmZpZyA/IG5vb3AoKSA6IHVwZGF0ZVRzQ29uZmlnKHBhY2thZ2VOYW1lLCBwYXRoSW1wb3J0TGliLCBkaXN0Um9vdCksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHByb2plY3Q6IHBhY2thZ2VOYW1lLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBzZWxlY3RvcjogYCR7cHJlZml4fS0ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICBpbmxpbmVTdHlsZTogdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IHRydWUsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgZXhwb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBwYWNrYWdlTmFtZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdzZXJ2aWNlJywge1xuICAgICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgcHJvamVjdDogcGFja2FnZU5hbWUsXG4gICAgICB9KSxcbiAgICAgIChfdHJlZTogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2tpcFBhY2thZ2VKc29uICYmICFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIF0pO1xuICB9O1xufVxuIl19