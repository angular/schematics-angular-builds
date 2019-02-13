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
const tasks_1 = require("@angular-devkit/schematics/tasks");
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const latest_versions_1 = require("../utility/latest-versions");
const lint_fix_1 = require("../utility/lint-fix");
const validation_1 = require("../utility/validation");
const workspace_models_1 = require("../utility/workspace-models");
function updateJsonFile(host, path, callback) {
    const source = host.read(path);
    if (source) {
        const sourceText = source.toString('utf-8');
        const json = core_1.parseJson(sourceText, core_1.JsonParseMode.Loose);
        callback(json);
        host.overwrite(path, JSON.stringify(json, null, 2));
    }
    return host;
}
function updateTsConfig(packageName, distRoot) {
    return (host) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        return updateJsonFile(host, 'tsconfig.json', (tsconfig) => {
            if (!tsconfig.compilerOptions.paths) {
                tsconfig.compilerOptions.paths = {};
            }
            if (!tsconfig.compilerOptions.paths[packageName]) {
                tsconfig.compilerOptions.paths[packageName] = [];
            }
            tsconfig.compilerOptions.paths[packageName].push(distRoot);
            // deep import & secondary entrypoint support
            const deepPackagePath = packageName + '/*';
            if (!tsconfig.compilerOptions.paths[deepPackagePath]) {
                tsconfig.compilerOptions.paths[deepPackagePath] = [];
            }
            tsconfig.compilerOptions.paths[deepPackagePath].push(distRoot + '/*');
        });
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
                name: '@angular-devkit/build-ng-packagr',
                version: latest_versions_1.latestVersions.DevkitBuildNgPackagr,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular-devkit/build-angular',
                version: latest_versions_1.latestVersions.DevkitBuildNgPackagr,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'ng-packagr',
                version: '^4.2.0',
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'tsickle',
                version: '>=0.34.0',
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'tslib',
                version: latest_versions_1.latestVersions.TsLib,
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'typescript',
                version: latest_versions_1.latestVersions.TypeScript,
            },
        ].forEach(dependency => dependencies_1.addPackageJsonDependency(host, dependency));
        return host;
    };
}
function addAppToWorkspaceFile(options, workspace, projectRoot, projectName) {
    const project = {
        root: projectRoot,
        sourceRoot: `${projectRoot}/src`,
        projectType: workspace_models_1.ProjectType.Library,
        prefix: options.prefix || 'lib',
        architect: {
            build: {
                builder: workspace_models_1.Builders.NgPackagr,
                options: {
                    tsConfig: `${projectRoot}/tsconfig.lib.json`,
                    project: `${projectRoot}/ng-package.json`,
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
            lint: {
                builder: workspace_models_1.Builders.TsLint,
                options: {
                    tsConfig: [
                        `${projectRoot}/tsconfig.lib.json`,
                        `${projectRoot}/tsconfig.spec.json`,
                    ],
                    exclude: [
                        '**/node_modules/**',
                    ],
                },
            },
        },
    };
    return config_1.addProjectToWorkspace(workspace, projectName, project);
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        const prefix = options.prefix || 'lib';
        validation_1.validateProjectName(options.name);
        // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
        const projectName = options.name;
        const packageName = core_1.strings.dasherize(projectName);
        let scopeName = null;
        if (/^@.*\/.*/.test(options.name)) {
            const [scope, name] = options.name.split('/');
            scopeName = scope.replace(/^@/, '');
            options.name = name;
        }
        const workspace = config_1.getWorkspace(host);
        const newProjectRoot = workspace.newProjectRoot;
        const scopeFolder = scopeName ? core_1.strings.dasherize(scopeName) + '/' : '';
        const folderName = `${scopeFolder}${core_1.strings.dasherize(options.name)}`;
        const projectRoot = `${newProjectRoot}/${folderName}`;
        const distRoot = `dist/${folderName}`;
        const sourceDir = `${projectRoot}/src/lib`;
        const relativePathToWorkspaceRoot = projectRoot.split('/').map(x => '..').join('/');
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.applyTemplates(Object.assign({}, core_1.strings, options, { packageName,
                projectRoot,
                distRoot,
                relativePathToWorkspaceRoot,
                prefix, angularLatestVersion: latest_versions_1.latestVersions.Angular.replace('~', '').replace('^', ''), folderName })),
            schematics_1.move(projectRoot),
        ]);
        return schematics_1.chain([
            schematics_1.mergeWith(templateSource),
            addAppToWorkspaceFile(options, workspace, projectRoot, projectName),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(),
            options.skipTsConfig ? schematics_1.noop() : updateTsConfig(packageName, distRoot),
            schematics_1.schematic('module', {
                name: options.name,
                commonModule: false,
                flat: true,
                path: sourceDir,
                project: options.name,
            }),
            schematics_1.schematic('component', {
                name: options.name,
                selector: `${prefix}-${options.name}`,
                inlineStyle: true,
                inlineTemplate: true,
                flat: true,
                path: sourceDir,
                export: true,
                project: options.name,
            }),
            schematics_1.schematic('service', {
                name: options.name,
                flat: true,
                path: sourceDir,
                project: options.name,
            }),
            options.lintFix ? lint_fix_1.applyLintFix(sourceDir) : schematics_1.noop(),
            (_tree, context) => {
                if (!options.skipPackageJson && !options.skipInstall) {
                    context.addTask(new tasks_1.NodePackageInstallTask());
                }
            },
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9saWJyYXJ5L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXlFO0FBQ3pFLDJEQWFvQztBQUNwQyw0REFBMEU7QUFDMUUsOENBRzJCO0FBQzNCLDBEQUF1RjtBQUN2RixnRUFBNEQ7QUFDNUQsa0RBQW1EO0FBQ25ELHNEQUE0RDtBQUM1RCxrRUFLcUM7QUFnQnJDLFNBQVMsY0FBYyxDQUFJLElBQVUsRUFBRSxJQUFZLEVBQUUsUUFBeUI7SUFDNUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixJQUFJLE1BQU0sRUFBRTtRQUNWLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsZ0JBQVMsQ0FBQyxVQUFVLEVBQUUsb0JBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4RCxRQUFRLENBQUMsSUFBZSxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckQ7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxXQUFtQixFQUFFLFFBQWdCO0lBRTNELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1NBQUU7UUFFbkQsT0FBTyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLFFBQTZCLEVBQUUsRUFBRTtZQUM3RSxJQUFJLENBQUMsUUFB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QixJQUFJLEVBQUUsSUFBSTtnQkFDVixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUk7YUFDdEIsQ0FBQztZQUNGLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLHVCQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7WUFDbEQsQ0FBQyxLQUFXLEVBQUUsT0FBeUIsRUFBRSxFQUFFO2dCQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7b0JBQ3BELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDLENBQUM7aUJBQy9DO1lBQ0gsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFqRkQsNEJBaUZDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvblBhcnNlTW9kZSwgcGFyc2VKc29uLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7XG4gIGFkZFByb2plY3RUb1dvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlLFxufSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgYXBwbHlMaW50Rml4IH0gZnJvbSAnLi4vdXRpbGl0eS9saW50LWZpeCc7XG5pbXBvcnQgeyB2YWxpZGF0ZVByb2plY3ROYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS92YWxpZGF0aW9uJztcbmltcG9ydCB7XG4gIEJ1aWxkZXJzLFxuICBQcm9qZWN0VHlwZSxcbiAgV29ya3NwYWNlUHJvamVjdCxcbiAgV29ya3NwYWNlU2NoZW1hLFxufSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIExpYnJhcnlPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5pbnRlcmZhY2UgVXBkYXRlSnNvbkZuPFQ+IHtcbiAgKG9iajogVCk6IFQgfCB2b2lkO1xufVxuXG50eXBlIFRzQ29uZmlnUGFydGlhbFR5cGUgPSB7XG4gIGNvbXBpbGVyT3B0aW9uczoge1xuICAgIGJhc2VVcmw6IHN0cmluZyxcbiAgICBwYXRoczoge1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW107XG4gICAgfSxcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIHVwZGF0ZUpzb25GaWxlPFQ+KGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IFVwZGF0ZUpzb25GbjxUPik6IFRyZWUge1xuICBjb25zdCBzb3VyY2UgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmIChzb3VyY2UpIHtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gc291cmNlLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGpzb24gPSBwYXJzZUpzb24oc291cmNlVGV4dCwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG4gICAgY2FsbGJhY2soanNvbiBhcyB7fSBhcyBUKTtcbiAgICBob3N0Lm92ZXJ3cml0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAyKSk7XG4gIH1cblxuICByZXR1cm4gaG9zdDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNDb25maWcocGFja2FnZU5hbWU6IHN0cmluZywgZGlzdFJvb3Q6IHN0cmluZykge1xuXG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3RzY29uZmlnLmpzb24nKSkgeyByZXR1cm4gaG9zdDsgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZUpzb25GaWxlKGhvc3QsICd0c2NvbmZpZy5qc29uJywgKHRzY29uZmlnOiBUc0NvbmZpZ1BhcnRpYWxUeXBlKSA9PiB7XG4gICAgICBpZiAoIXRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRocykge1xuICAgICAgICB0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMgPSB7fTtcbiAgICAgIH1cbiAgICAgIGlmICghdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzW3BhY2thZ2VOYW1lXSkge1xuICAgICAgICB0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHNbcGFja2FnZU5hbWVdID0gW107XG4gICAgICB9XG4gICAgICB0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHNbcGFja2FnZU5hbWVdLnB1c2goZGlzdFJvb3QpO1xuXG4gICAgICAvLyBkZWVwIGltcG9ydCAmIHNlY29uZGFyeSBlbnRyeXBvaW50IHN1cHBvcnRcbiAgICAgIGNvbnN0IGRlZXBQYWNrYWdlUGF0aCA9IHBhY2thZ2VOYW1lICsgJy8qJztcbiAgICAgIGlmICghdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzW2RlZXBQYWNrYWdlUGF0aF0pIHtcbiAgICAgICAgdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzW2RlZXBQYWNrYWdlUGF0aF0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tkZWVwUGFja2FnZVBhdGhdLnB1c2goZGlzdFJvb3QgKyAnLyonKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbigpIHtcblxuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1uZy1wYWNrYWdyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGROZ1BhY2thZ3IsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZE5nUGFja2FncixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICduZy1wYWNrYWdyJyxcbiAgICAgICAgdmVyc2lvbjogJ140LjIuMCcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHNpY2tsZScsXG4gICAgICAgIHZlcnNpb246ICc+PTAuMzQuMCcsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHNsaWInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Uc0xpYixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICd0eXBlc2NyaXB0JyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuVHlwZVNjcmlwdCxcbiAgICAgIH0sXG4gICAgXS5mb3JFYWNoKGRlcGVuZGVuY3kgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogTGlicmFyeU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RSb290OiBzdHJpbmcsIHByb2plY3ROYW1lOiBzdHJpbmcpOiBSdWxlIHtcblxuICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0PFByb2plY3RUeXBlLkxpYnJhcnk+ID0ge1xuICAgIHJvb3Q6IHByb2plY3RSb290LFxuICAgIHNvdXJjZVJvb3Q6IGAke3Byb2plY3RSb290fS9zcmNgLFxuICAgIHByb2plY3RUeXBlOiBQcm9qZWN0VHlwZS5MaWJyYXJ5LFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXggfHwgJ2xpYicsXG4gICAgYXJjaGl0ZWN0OiB7XG4gICAgICBidWlsZDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5OZ1BhY2thZ3IsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmxpYi5qc29uYCxcbiAgICAgICAgICBwcm9qZWN0OiBgJHtwcm9qZWN0Um9vdH0vbmctcGFja2FnZS5qc29uYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkthcm1hLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9L3NyYy90ZXN0LnRzYCxcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fS9rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBsaW50OiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlRzTGludCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcubGliLmpzb25gLFxuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBleGNsdWRlOiBbXG4gICAgICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiBhZGRQcm9qZWN0VG9Xb3Jrc3BhY2Uod29ya3NwYWNlLCBwcm9qZWN0TmFtZSwgcHJvamVjdCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBMaWJyYXJ5T3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIGNvbnN0IHByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdsaWInO1xuXG4gICAgdmFsaWRhdGVQcm9qZWN0TmFtZShvcHRpb25zLm5hbWUpO1xuXG4gICAgLy8gSWYgc2NvcGVkIHByb2plY3QgKGkuZS4gXCJAZm9vL2JhclwiKSwgY29udmVydCBwcm9qZWN0RGlyIHRvIFwiZm9vL2JhclwiLlxuICAgIGNvbnN0IHByb2plY3ROYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUocHJvamVjdE5hbWUpO1xuICAgIGxldCBzY29wZU5hbWUgPSBudWxsO1xuICAgIGlmICgvXkAuKlxcLy4qLy50ZXN0KG9wdGlvbnMubmFtZSkpIHtcbiAgICAgIGNvbnN0IFtzY29wZSwgbmFtZV0gPSBvcHRpb25zLm5hbWUuc3BsaXQoJy8nKTtcbiAgICAgIHNjb3BlTmFtZSA9IHNjb3BlLnJlcGxhY2UoL15ALywgJycpO1xuICAgICAgb3B0aW9ucy5uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG5cbiAgICBjb25zdCBzY29wZUZvbGRlciA9IHNjb3BlTmFtZSA/IHN0cmluZ3MuZGFzaGVyaXplKHNjb3BlTmFtZSkgKyAnLycgOiAnJztcbiAgICBjb25zdCBmb2xkZXJOYW1lID0gYCR7c2NvcGVGb2xkZXJ9JHtzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpfWA7XG4gICAgY29uc3QgcHJvamVjdFJvb3QgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtmb2xkZXJOYW1lfWA7XG4gICAgY29uc3QgZGlzdFJvb3QgPSBgZGlzdC8ke2ZvbGRlck5hbWV9YDtcblxuICAgIGNvbnN0IHNvdXJjZURpciA9IGAke3Byb2plY3RSb290fS9zcmMvbGliYDtcbiAgICBjb25zdCByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgPSBwcm9qZWN0Um9vdC5zcGxpdCgnLycpLm1hcCh4ID0+ICcuLicpLmpvaW4oJy8nKTtcblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgcGFja2FnZU5hbWUsXG4gICAgICAgIHByb2plY3RSb290LFxuICAgICAgICBkaXN0Um9vdCxcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290LFxuICAgICAgICBwcmVmaXgsXG4gICAgICAgIGFuZ3VsYXJMYXRlc3RWZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLnJlcGxhY2UoJ34nLCAnJykucmVwbGFjZSgnXicsICcnKSxcbiAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwcm9qZWN0Um9vdCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UsIHByb2plY3RSb290LCBwcm9qZWN0TmFtZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG9wdGlvbnMuc2tpcFRzQ29uZmlnID8gbm9vcCgpIDogdXBkYXRlVHNDb25maWcocGFja2FnZU5hbWUsIGRpc3RSb290KSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBzZWxlY3RvcjogYCR7cHJlZml4fS0ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICBpbmxpbmVTdHlsZTogdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IHRydWUsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgZXhwb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnc2VydmljZScsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIH0pLFxuICAgICAgb3B0aW9ucy5saW50Rml4ID8gYXBwbHlMaW50Rml4KHNvdXJjZURpcikgOiBub29wKCksXG4gICAgICAoX3RyZWU6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNraXBQYWNrYWdlSnNvbiAmJiAhb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==