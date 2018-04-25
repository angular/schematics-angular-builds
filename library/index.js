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
const latest_versions_1 = require("../utility/latest-versions");
const validation_1 = require("../utility/validation");
function updateJsonFile(host, path, callback) {
    const source = host.read(path);
    if (source) {
        const sourceText = source.toString('utf-8');
        const json = JSON.parse(sourceText);
        callback(json);
        host.overwrite(path, JSON.stringify(json, null, 2));
    }
    return host;
}
function updateTsConfig(npmPackageName) {
    return (host) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        return updateJsonFile(host, 'tsconfig.json', (tsconfig) => {
            if (!tsconfig.compilerOptions.paths) {
                tsconfig.compilerOptions.paths = {};
            }
            if (!tsconfig.compilerOptions.paths[npmPackageName]) {
                tsconfig.compilerOptions.paths[npmPackageName] = [];
            }
            tsconfig.compilerOptions.paths[npmPackageName].push(`dist/${npmPackageName}`);
        });
    };
}
function addDependenciesToPackageJson() {
    return (host) => {
        if (!host.exists('package.json')) {
            return host;
        }
        return updateJsonFile(host, 'package.json', (json) => {
            if (!json['dependencies']) {
                json['dependencies'] = {};
            }
            json.dependencies = Object.assign({ '@angular/common': latest_versions_1.latestVersions.Angular, '@angular/core': latest_versions_1.latestVersions.Angular, '@angular/compiler': latest_versions_1.latestVersions.Angular }, json.dependencies);
            if (!json['devDependencies']) {
                json['devDependencies'] = {};
            }
            json.devDependencies = Object.assign({ '@angular/compiler-cli': latest_versions_1.latestVersions.Angular, '@angular-devkit/build-ng-packagr': latest_versions_1.latestVersions.DevkitBuildNgPackagr, '@angular-devkit/build-angular': latest_versions_1.latestVersions.DevkitBuildNgPackagr, 'ng-packagr': '^2.4.1', 'tsickle': '>=0.25.5', 'tslib': '^1.7.1', 'typescript': latest_versions_1.latestVersions.TypeScript }, json.devDependencies);
        });
    };
}
function addAppToWorkspaceFile(options, workspace, projectRoot, packageName) {
    const project = {
        root: `${projectRoot}`,
        projectType: 'library',
        prefix: options.prefix || 'lib',
        architect: {
            build: {
                builder: '@angular-devkit/build-ng-packagr:build',
                options: {
                    project: `${projectRoot}/ng-package.json`,
                },
                configurations: {
                    production: {
                        project: `${projectRoot}/ng-package.prod.json`,
                    },
                },
            },
            test: {
                builder: '@angular-devkit/build-angular:karma',
                options: {
                    main: `${projectRoot}/src/test.ts`,
                    tsConfig: `${projectRoot}/tsconfig.spec.json`,
                    karmaConfig: `${projectRoot}/karma.conf.js`,
                },
            },
            lint: {
                builder: '@angular-devkit/build-angular:tslint',
                options: {
                    tsConfig: [
                        `${projectRoot}/tsconfig.lint.json`,
                        `${projectRoot}/tsconfig.spec.json`,
                    ],
                    exclude: [
                        '**/node_modules/**',
                    ],
                },
            },
        },
    };
    return config_1.addProjectToWorkspace(workspace, packageName, project);
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        const prefix = options.prefix || 'lib';
        validation_1.validateProjectName(options.name);
        // If scoped project (i.e. "@foo/bar"), convert projectDir to "foo/bar".
        const packageName = options.name;
        let scopeName = '';
        if (/^@.*\/.*/.test(options.name)) {
            const [scope, name] = options.name.split('/');
            scopeName = scope.replace(/^@/, '');
            options.name = name;
        }
        const workspace = config_1.getWorkspace(host);
        const newProjectRoot = workspace.newProjectRoot;
        let projectRoot = `${newProjectRoot}/${core_1.strings.dasherize(options.name)}`;
        if (scopeName) {
            projectRoot =
                `${newProjectRoot}/${core_1.strings.dasherize(scopeName)}/${core_1.strings.dasherize(options.name)}`;
        }
        const sourceDir = `${projectRoot}/src/lib`;
        const relativeTsLintPath = projectRoot.split('/').map(x => '..').join('/');
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.template(Object.assign({}, core_1.strings, options, { packageName,
                projectRoot,
                relativeTsLintPath,
                prefix })),
        ]);
        return schematics_1.chain([
            schematics_1.branchAndMerge(schematics_1.mergeWith(templateSource)),
            addAppToWorkspaceFile(options, workspace, projectRoot, packageName),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(),
            options.skipTsConfig ? schematics_1.noop() : updateTsConfig(options.name),
            schematics_1.schematic('module', {
                name: options.name,
                commonModule: false,
                flat: true,
                path: sourceDir,
                spec: false,
            }),
            schematics_1.schematic('component', {
                name: options.name,
                selector: `${prefix}-${options.name}`,
                inlineStyle: true,
                inlineTemplate: true,
                flat: true,
                path: sourceDir,
                export: true,
            }),
            schematics_1.schematic('service', {
                name: options.name,
                flat: true,
                path: sourceDir,
            }),
            (_tree, context) => {
                context.addTask(new tasks_1.NodePackageInstallTask());
            },
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9saWJyYXJ5L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQStDO0FBQy9DLDJEQWFvQztBQUNwQyw0REFBMEU7QUFDMUUsOENBSzJCO0FBQzNCLGdFQUE0RDtBQUM1RCxzREFBNEQ7QUE2QjVELHdCQUEyQixJQUFVLEVBQUUsSUFBWSxFQUFFLFFBQXlCO0lBQzVFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCx3QkFBd0IsY0FBc0I7SUFFNUMsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLFFBQTZCLEVBQUUsRUFBRTtZQUM3RSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFB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Q0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDNUQsc0JBQVMsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQztZQUNGLHNCQUFTLENBQUMsV0FBVyxFQUFFO2dCQUNyQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO2dCQUNyQyxXQUFXLEVBQUUsSUFBSTtnQkFDakIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxTQUFTO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2FBQ2IsQ0FBQztZQUNGLHNCQUFTLENBQUMsU0FBUyxFQUFFO2dCQUNuQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxTQUFTO2FBQ2hCLENBQUM7WUFDRixDQUFDLEtBQVcsRUFBRSxPQUF5QixFQUFFLEVBQUU7Z0JBQ3pDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDLENBQUM7WUFDaEQsQ0FBQztTQUNGLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTFFRCw0QkEwRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGJyYW5jaEFuZE1lcmdlLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHRlbXBsYXRlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQge1xuICBXb3Jrc3BhY2VQcm9qZWN0LFxuICBXb3Jrc3BhY2VTY2hlbWEsXG4gIGFkZFByb2plY3RUb1dvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlLFxufSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHZhbGlkYXRlUHJvamVjdE5hbWUgfSBmcm9tICcuLi91dGlsaXR5L3ZhbGlkYXRpb24nO1xuaW1wb3J0IHsgU2NoZW1hIGFzIExpYnJhcnlPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbnR5cGUgUGFja2FnZUpzb25QYXJ0aWFsVHlwZSA9IHtcbiAgc2NyaXB0czoge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVXBkYXRlSnNvbkZuPFQ+IHtcbiAgKG9iajogVCk6IFQgfCB2b2lkO1xufVxuXG50eXBlIFRzQ29uZmlnUGFydGlhbFR5cGUgPSB7XG4gIGNvbXBpbGVyT3B0aW9uczoge1xuICAgIGJhc2VVcmw6IHN0cmluZyxcbiAgICBwYXRoczoge1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW107XG4gICAgfSxcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIHVwZGF0ZUpzb25GaWxlPFQ+KGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IFVwZGF0ZUpzb25GbjxUPik6IFRyZWUge1xuICBjb25zdCBzb3VyY2UgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmIChzb3VyY2UpIHtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gc291cmNlLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHNvdXJjZVRleHQpO1xuICAgIGNhbGxiYWNrKGpzb24pO1xuICAgIGhvc3Qub3ZlcndyaXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsIDIpKTtcbiAgfVxuXG4gIHJldHVybiBob3N0O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0NvbmZpZyhucG1QYWNrYWdlTmFtZTogc3RyaW5nKSB7XG5cbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFob3N0LmV4aXN0cygndHNjb25maWcuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3RzY29uZmlnLmpzb24nLCAodHNjb25maWc6IFRzQ29uZmlnUGFydGlhbFR5cGUpID0+IHtcbiAgICAgIGlmICghdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKCF0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHNbbnBtUGFja2FnZU5hbWVdKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0ucHVzaChgZGlzdC8ke25wbVBhY2thZ2VOYW1lfWApO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCkge1xuXG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3BhY2thZ2UuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicsIChqc29uOiBQYWNrYWdlSnNvblBhcnRpYWxUeXBlKSA9PiB7XG5cblxuICAgICAgaWYgKCFqc29uWydkZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbW1vbic6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci9jb3JlJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgLy8gRGUtc3RydWN0dXJlIGxhc3Qga2VlcHMgZXhpc3RpbmcgdXNlciBkZXBlbmRlbmNpZXMuXG4gICAgICAgIC4uLmpzb24uZGVwZW5kZW5jaWVzLFxuICAgICAgfTtcblxuICAgICAgaWYgKCFqc29uWydkZXZEZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2Fncic6IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkTmdQYWNrYWdyLFxuICAgICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZE5nUGFja2FncixcbiAgICAgICAgJ25nLXBhY2thZ3InOiAnXjIuNC4xJyxcbiAgICAgICAgJ3RzaWNrbGUnOiAnPj0wLjI1LjUnLFxuICAgICAgICAndHNsaWInOiAnXjEuNy4xJyxcbiAgICAgICAgJ3R5cGVzY3JpcHQnOiBsYXRlc3RWZXJzaW9ucy5UeXBlU2NyaXB0LFxuICAgICAgICAvLyBEZS1zdHJ1Y3R1cmUgbGFzdCBrZWVwcyBleGlzdGluZyB1c2VyIGRlcGVuZGVuY2llcy5cbiAgICAgICAgLi4uanNvbi5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogTGlicmFyeU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RSb290OiBzdHJpbmcsIHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBSdWxlIHtcblxuICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0ID0ge1xuICAgIHJvb3Q6IGAke3Byb2plY3RSb290fWAsXG4gICAgcHJvamVjdFR5cGU6ICdsaWJyYXJ5JyxcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4IHx8ICdsaWInLFxuICAgIGFyY2hpdGVjdDoge1xuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1uZy1wYWNrYWdyOmJ1aWxkJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHByb2plY3Q6IGAke3Byb2plY3RSb290fS9uZy1wYWNrYWdlLmpzb25gLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIHByb2plY3Q6IGAke3Byb2plY3RSb290fS9uZy1wYWNrYWdlLnByb2QuanNvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiB7XG4gICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjprYXJtYScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cHJvamVjdFJvb3R9L2thcm1hLmNvbmYuanNgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnRzbGludCcsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB0c0NvbmZpZzogW1xuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmxpbnQuanNvbmAsXG4gICAgICAgICAgICBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIGFkZFByb2plY3RUb1dvcmtzcGFjZSh3b3Jrc3BhY2UsIHBhY2thZ2VOYW1lLCBwcm9qZWN0KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IExpYnJhcnlPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBvcHRpb25zLCBcIm5hbWVcIiBpcyByZXF1aXJlZC5gKTtcbiAgICB9XG4gICAgY29uc3QgcHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2xpYic7XG5cbiAgICB2YWxpZGF0ZVByb2plY3ROYW1lKG9wdGlvbnMubmFtZSk7XG5cbiAgICAvLyBJZiBzY29wZWQgcHJvamVjdCAoaS5lLiBcIkBmb28vYmFyXCIpLCBjb252ZXJ0IHByb2plY3REaXIgdG8gXCJmb28vYmFyXCIuXG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgbGV0IHNjb3BlTmFtZSA9ICcnO1xuICAgIGlmICgvXkAuKlxcLy4qLy50ZXN0KG9wdGlvbnMubmFtZSkpIHtcbiAgICAgIGNvbnN0IFtzY29wZSwgbmFtZV0gPSBvcHRpb25zLm5hbWUuc3BsaXQoJy8nKTtcbiAgICAgIHNjb3BlTmFtZSA9IHNjb3BlLnJlcGxhY2UoL15ALywgJycpO1xuICAgICAgb3B0aW9ucy5uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG4gICAgbGV0IHByb2plY3RSb290ID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7c3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy5uYW1lKX1gO1xuICAgIGlmIChzY29wZU5hbWUpIHtcbiAgICAgIHByb2plY3RSb290ID1cbiAgICAgICAgYCR7bmV3UHJvamVjdFJvb3R9LyR7c3RyaW5ncy5kYXNoZXJpemUoc2NvcGVOYW1lKX0vJHtzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpfWA7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7cHJvamVjdFJvb3R9L3NyYy9saWJgO1xuICAgIGNvbnN0IHJlbGF0aXZlVHNMaW50UGF0aCA9IHByb2plY3RSb290LnNwbGl0KCcvJykubWFwKHggPT4gJy4uJykuam9pbignLycpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBwYWNrYWdlTmFtZSxcbiAgICAgICAgcHJvamVjdFJvb3QsXG4gICAgICAgIHJlbGF0aXZlVHNMaW50UGF0aCxcbiAgICAgICAgcHJlZml4LFxuICAgICAgfSksXG4gICAgICAvLyBUT0RPOiBNb3ZpbmcgaW5zaWRlIGBicmFuY2hBbmRNZXJnZWAgc2hvdWxkIHdvcmsgYnV0IGlzIGJ1Z2dlZCByaWdodCBub3cuXG4gICAgICAvLyBUaGUgX19wcm9qZWN0Um9vdF9fIGlzIGJlaW5nIHVzZWQgbWVhbndoaWxlLlxuICAgICAgLy8gbW92ZShwcm9qZWN0Um9vdCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYnJhbmNoQW5kTWVyZ2UobWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSksXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgd29ya3NwYWNlLCBwcm9qZWN0Um9vdCwgcGFja2FnZU5hbWUpLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCksXG4gICAgICBvcHRpb25zLnNraXBUc0NvbmZpZyA/IG5vb3AoKSA6IHVwZGF0ZVRzQ29uZmlnKG9wdGlvbnMubmFtZSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNwZWM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICBzZWxlY3RvcjogYCR7cHJlZml4fS0ke29wdGlvbnMubmFtZX1gLFxuICAgICAgICBpbmxpbmVTdHlsZTogdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IHRydWUsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgZXhwb3J0OiB0cnVlLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ3NlcnZpY2UnLCB7XG4gICAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgfSksXG4gICAgICAoX3RyZWU6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgICAgfSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==