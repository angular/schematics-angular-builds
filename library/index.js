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
                    tsConfig: `${projectRoot}/tsconfig.lib.json`,
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
            (_tree, context) => {
                context.addTask(new tasks_1.NodePackageInstallTask());
            },
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9saWJyYXJ5L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQStDO0FBQy9DLDJEQWFvQztBQUNwQyw0REFBMEU7QUFDMUUsOENBSzJCO0FBQzNCLGdFQUE0RDtBQUM1RCxzREFBNEQ7QUE2QjVELHdCQUEyQixJQUFVLEVBQUUsSUFBWSxFQUFFLFFBQXlCO0lBQzVFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCx3QkFBd0IsY0FBc0I7SUFFNUMsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLFFBQTZCLEVBQUUsRUFBRTtZQUM3RSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFB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R29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGJyYW5jaEFuZE1lcmdlLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHRlbXBsYXRlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQge1xuICBXb3Jrc3BhY2VQcm9qZWN0LFxuICBXb3Jrc3BhY2VTY2hlbWEsXG4gIGFkZFByb2plY3RUb1dvcmtzcGFjZSxcbiAgZ2V0V29ya3NwYWNlLFxufSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHZhbGlkYXRlUHJvamVjdE5hbWUgfSBmcm9tICcuLi91dGlsaXR5L3ZhbGlkYXRpb24nO1xuaW1wb3J0IHsgU2NoZW1hIGFzIExpYnJhcnlPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbnR5cGUgUGFja2FnZUpzb25QYXJ0aWFsVHlwZSA9IHtcbiAgc2NyaXB0czoge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVXBkYXRlSnNvbkZuPFQ+IHtcbiAgKG9iajogVCk6IFQgfCB2b2lkO1xufVxuXG50eXBlIFRzQ29uZmlnUGFydGlhbFR5cGUgPSB7XG4gIGNvbXBpbGVyT3B0aW9uczoge1xuICAgIGJhc2VVcmw6IHN0cmluZyxcbiAgICBwYXRoczoge1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW107XG4gICAgfSxcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIHVwZGF0ZUpzb25GaWxlPFQ+KGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IFVwZGF0ZUpzb25GbjxUPik6IFRyZWUge1xuICBjb25zdCBzb3VyY2UgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmIChzb3VyY2UpIHtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gc291cmNlLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHNvdXJjZVRleHQpO1xuICAgIGNhbGxiYWNrKGpzb24pO1xuICAgIGhvc3Qub3ZlcndyaXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsIDIpKTtcbiAgfVxuXG4gIHJldHVybiBob3N0O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0NvbmZpZyhucG1QYWNrYWdlTmFtZTogc3RyaW5nKSB7XG5cbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFob3N0LmV4aXN0cygndHNjb25maWcuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3RzY29uZmlnLmpzb24nLCAodHNjb25maWc6IFRzQ29uZmlnUGFydGlhbFR5cGUpID0+IHtcbiAgICAgIGlmICghdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKCF0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHNbbnBtUGFja2FnZU5hbWVdKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0ucHVzaChgZGlzdC8ke25wbVBhY2thZ2VOYW1lfWApO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCkge1xuXG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3BhY2thZ2UuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicsIChqc29uOiBQYWNrYWdlSnNvblBhcnRpYWxUeXBlKSA9PiB7XG5cblxuICAgICAgaWYgKCFqc29uWydkZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbW1vbic6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci9jb3JlJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgLy8gRGUtc3RydWN0dXJlIGxhc3Qga2VlcHMgZXhpc3RpbmcgdXNlciBkZXBlbmRlbmNpZXMuXG4gICAgICAgIC4uLmpzb24uZGVwZW5kZW5jaWVzLFxuICAgICAgfTtcblxuICAgICAgaWYgKCFqc29uWydkZXZEZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2Fncic6IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkTmdQYWNrYWdyLFxuICAgICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZE5nUGFja2FncixcbiAgICAgICAgJ25nLXBhY2thZ3InOiAnXjIuNC4xJyxcbiAgICAgICAgJ3RzaWNrbGUnOiAnPj0wLjI1LjUnLFxuICAgICAgICAndHNsaWInOiAnXjEuNy4xJyxcbiAgICAgICAgJ3R5cGVzY3JpcHQnOiBsYXRlc3RWZXJzaW9ucy5UeXBlU2NyaXB0LFxuICAgICAgICAvLyBEZS1zdHJ1Y3R1cmUgbGFzdCBrZWVwcyBleGlzdGluZyB1c2VyIGRlcGVuZGVuY2llcy5cbiAgICAgICAgLi4uanNvbi5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogTGlicmFyeU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RSb290OiBzdHJpbmcsIHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBSdWxlIHtcblxuICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0ID0ge1xuICAgIHJvb3Q6IGAke3Byb2plY3RSb290fWAsXG4gICAgcHJvamVjdFR5cGU6ICdsaWJyYXJ5JyxcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4IHx8ICdsaWInLFxuICAgIGFyY2hpdGVjdDoge1xuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1uZy1wYWNrYWdyOmJ1aWxkJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcubGliLmpzb25gLFxuICAgICAgICAgIHByb2plY3Q6IGAke3Byb2plY3RSb290fS9uZy1wYWNrYWdlLmpzb25gLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIHByb2plY3Q6IGAke3Byb2plY3RSb290fS9uZy1wYWNrYWdlLnByb2QuanNvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiB7XG4gICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjprYXJtYScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICBrYXJtYUNvbmZpZzogYCR7cHJvamVjdFJvb3R9L2thcm1hLmNvbmYuanNgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnRzbGludCcsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB0c0NvbmZpZzogW1xuICAgICAgICAgICAgYCR7cHJvamVjdFJvb3R9L3RzY29uZmlnLmxpYi5qc29uYCxcbiAgICAgICAgICAgIGAke3Byb2plY3RSb290fS90c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gYWRkUHJvamVjdFRvV29ya3NwYWNlKHdvcmtzcGFjZSwgcGFja2FnZU5hbWUsIHByb2plY3QpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogTGlicmFyeU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICAgIH1cbiAgICBjb25zdCBwcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnbGliJztcblxuICAgIHZhbGlkYXRlUHJvamVjdE5hbWUob3B0aW9ucy5uYW1lKTtcblxuICAgIC8vIElmIHNjb3BlZCBwcm9qZWN0IChpLmUuIFwiQGZvby9iYXJcIiksIGNvbnZlcnQgcHJvamVjdERpciB0byBcImZvby9iYXJcIi5cbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICBsZXQgc2NvcGVOYW1lID0gJyc7XG4gICAgaWYgKC9eQC4qXFwvLiovLnRlc3Qob3B0aW9ucy5uYW1lKSkge1xuICAgICAgY29uc3QgW3Njb3BlLCBuYW1lXSA9IG9wdGlvbnMubmFtZS5zcGxpdCgnLycpO1xuICAgICAgc2NvcGVOYW1lID0gc2NvcGUucmVwbGFjZSgvXkAvLCAnJyk7XG4gICAgICBvcHRpb25zLm5hbWUgPSBuYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgcHJvamVjdFJvb3QgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpfWA7XG4gICAgaWYgKHNjb3BlTmFtZSkge1xuICAgICAgcHJvamVjdFJvb3QgPVxuICAgICAgICBgJHtuZXdQcm9qZWN0Um9vdH0vJHtzdHJpbmdzLmRhc2hlcml6ZShzY29wZU5hbWUpfS8ke3N0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSl9YDtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2VEaXIgPSBgJHtwcm9qZWN0Um9vdH0vc3JjL2xpYmA7XG4gICAgY29uc3QgcmVsYXRpdmVUc0xpbnRQYXRoID0gcHJvamVjdFJvb3Quc3BsaXQoJy8nKS5tYXAoeCA9PiAnLi4nKS5qb2luKCcvJyk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHBhY2thZ2VOYW1lLFxuICAgICAgICBwcm9qZWN0Um9vdCxcbiAgICAgICAgcmVsYXRpdmVUc0xpbnRQYXRoLFxuICAgICAgICBwcmVmaXgsXG4gICAgICB9KSxcbiAgICAgIC8vIFRPRE86IE1vdmluZyBpbnNpZGUgYGJyYW5jaEFuZE1lcmdlYCBzaG91bGQgd29yayBidXQgaXMgYnVnZ2VkIHJpZ2h0IG5vdy5cbiAgICAgIC8vIFRoZSBfX3Byb2plY3RSb290X18gaXMgYmVpbmcgdXNlZCBtZWFud2hpbGUuXG4gICAgICAvLyBtb3ZlKHByb2plY3RSb290KSxcbiAgICBdKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBicmFuY2hBbmRNZXJnZShtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpKSxcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UsIHByb2plY3RSb290LCBwYWNrYWdlTmFtZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG9wdGlvbnMuc2tpcFRzQ29uZmlnID8gbm9vcCgpIDogdXBkYXRlVHNDb25maWcob3B0aW9ucy5uYW1lKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc3BlYzogZmFsc2UsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgc2VsZWN0b3I6IGAke3ByZWZpeH0tJHtvcHRpb25zLm5hbWV9YCxcbiAgICAgICAgaW5saW5lU3R5bGU6IHRydWUsXG4gICAgICAgIGlubGluZVRlbXBsYXRlOiB0cnVlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIGV4cG9ydDogdHJ1ZSxcbiAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ3NlcnZpY2UnLCB7XG4gICAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIChfdHJlZTogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgICB9LFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19