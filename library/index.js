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
const config_1 = require("../utility/config");
const latest_versions_1 = require("../utility/latest-versions");
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
            json.devDependencies = Object.assign({ '@angular/compiler-cli': latest_versions_1.latestVersions.Angular, '@angular-devkit/build-ng-packagr': latest_versions_1.latestVersions.DevkitBuildNgPackagr, '@angular-devkit/build-webpack': latest_versions_1.latestVersions.DevkitBuildNgPackagr, 'ng-packagr': '^2.4.1', 'tsickle': '>=0.25.5', 'tslib': '^1.7.1', 'typescript': latest_versions_1.latestVersions.TypeScript }, json.devDependencies);
        });
    };
}
function addAppToWorkspaceFile(options, workspace) {
    return (host, context) => {
        context.logger.info(`Updating workspace file`);
        const projectRoot = `${workspace.newProjectRoot}/${options.name}`;
        // tslint:disable-next-line:no-any
        const project = {
            root: `${projectRoot}`,
            projectType: 'library',
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
                    builder: '@angular-devkit/build-webpack:karma',
                    options: {
                        main: `${projectRoot}/src/test.ts`,
                        tsConfig: `${projectRoot}/tsconfig.spec.json`,
                        karmaConfig: `${projectRoot}/karma.conf.js`,
                    },
                },
                lint: {
                    builder: '@angular-devkit/build-webpack:lint',
                    options: {
                        tsConfig: [
                            'projects/lib/tsconfig.lint.json',
                            'projects/lib/tsconfig.spec.json',
                        ],
                        exclude: [
                            '**/node_modules/**',
                        ],
                    },
                },
            },
        };
        workspace.projects[options.name] = project;
        host.overwrite(config_1.getWorkspacePath(host), JSON.stringify(workspace, null, 2));
    };
}
function default_1(options) {
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        const name = options.name;
        const workspace = config_1.getWorkspace(host);
        const newProjectRoot = workspace.newProjectRoot;
        const projectRoot = `${newProjectRoot}/${options.name}`;
        const sourceDir = `${projectRoot}/src/lib`;
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.template(Object.assign({}, core_1.strings, options, { projectRoot })),
        ]);
        return schematics_1.chain([
            schematics_1.branchAndMerge(schematics_1.mergeWith(templateSource)),
            addAppToWorkspaceFile(options, workspace),
            options.skipPackageJson ? schematics_1.noop() : addDependenciesToPackageJson(),
            options.skipTsConfig ? schematics_1.noop() : updateTsConfig(name),
            schematics_1.schematic('module', {
                name: name,
                commonModule: false,
                flat: true,
                path: sourceDir,
                spec: false,
            }),
            schematics_1.schematic('component', {
                name: name,
                inlineStyle: true,
                inlineTemplate: true,
                flat: true,
                path: sourceDir,
                export: true,
            }),
            schematics_1.schematic('service', {
                name: name,
                flat: true,
                path: sourceDir,
                module: `${name}.module.ts`,
            }),
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9saWJyYXJ5L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQStDO0FBQy9DLDJEQWFvQztBQUNwQyw4Q0FBb0Y7QUFDcEYsZ0VBQTREO0FBNkI1RCx3QkFBMkIsSUFBVSxFQUFFLElBQVksRUFBRSxRQUF5QjtJQUM1RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsd0JBQXdCLGNBQXNCO0lBRTVDLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxRQUE2QixFQUFFLEVBQUU7WUFDN0UsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FB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XG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBicmFuY2hBbmRNZXJnZSxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB0ZW1wbGF0ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBXb3Jrc3BhY2VTY2hlbWEsIGdldFdvcmtzcGFjZSwgZ2V0V29ya3NwYWNlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIExpYnJhcnlPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbnR5cGUgUGFja2FnZUpzb25QYXJ0aWFsVHlwZSA9IHtcbiAgc2NyaXB0czoge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVXBkYXRlSnNvbkZuPFQ+IHtcbiAgKG9iajogVCk6IFQgfCB2b2lkO1xufVxuXG50eXBlIFRzQ29uZmlnUGFydGlhbFR5cGUgPSB7XG4gIGNvbXBpbGVyT3B0aW9uczoge1xuICAgIGJhc2VVcmw6IHN0cmluZyxcbiAgICBwYXRoczoge1xuICAgICAgW2tleTogc3RyaW5nXTogc3RyaW5nW107XG4gICAgfSxcbiAgfSxcbn07XG5cbmZ1bmN0aW9uIHVwZGF0ZUpzb25GaWxlPFQ+KGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IFVwZGF0ZUpzb25GbjxUPik6IFRyZWUge1xuICBjb25zdCBzb3VyY2UgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmIChzb3VyY2UpIHtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gc291cmNlLnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHNvdXJjZVRleHQpO1xuICAgIGNhbGxiYWNrKGpzb24pO1xuICAgIGhvc3Qub3ZlcndyaXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsIDIpKTtcbiAgfVxuXG4gIHJldHVybiBob3N0O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0NvbmZpZyhucG1QYWNrYWdlTmFtZTogc3RyaW5nKSB7XG5cbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFob3N0LmV4aXN0cygndHNjb25maWcuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3RzY29uZmlnLmpzb24nLCAodHNjb25maWc6IFRzQ29uZmlnUGFydGlhbFR5cGUpID0+IHtcbiAgICAgIGlmICghdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRocyA9IHt9O1xuICAgICAgfVxuICAgICAgaWYgKCF0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHNbbnBtUGFja2FnZU5hbWVdKSB7XG4gICAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgIH1cbiAgICAgIHRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0ucHVzaChgZGlzdC8ke25wbVBhY2thZ2VOYW1lfWApO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKCkge1xuXG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3BhY2thZ2UuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicsIChqc29uOiBQYWNrYWdlSnNvblBhcnRpYWxUeXBlKSA9PiB7XG5cblxuICAgICAgaWYgKCFqc29uWydkZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbW1vbic6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci9jb3JlJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgLy8gRGUtc3RydWN0dXJlIGxhc3Qga2VlcHMgZXhpc3RpbmcgdXNlciBkZXBlbmRlbmNpZXMuXG4gICAgICAgIC4uLmpzb24uZGVwZW5kZW5jaWVzLFxuICAgICAgfTtcblxuICAgICAgaWYgKCFqc29uWydkZXZEZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2Fncic6IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkTmdQYWNrYWdyLFxuICAgICAgICAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLXdlYnBhY2snOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZE5nUGFja2FncixcbiAgICAgICAgJ25nLXBhY2thZ3InOiAnXjIuNC4xJyxcbiAgICAgICAgJ3RzaWNrbGUnOiAnPj0wLjI1LjUnLFxuICAgICAgICAndHNsaWInOiAnXjEuNy4xJyxcbiAgICAgICAgJ3R5cGVzY3JpcHQnOiBsYXRlc3RWZXJzaW9ucy5UeXBlU2NyaXB0LFxuICAgICAgICAvLyBEZS1zdHJ1Y3R1cmUgbGFzdCBrZWVwcyBleGlzdGluZyB1c2VyIGRlcGVuZGVuY2llcy5cbiAgICAgICAgLi4uanNvbi5kZXZEZXBlbmRlbmNpZXMsXG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9uczogTGlicmFyeU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIHdvcmtzcGFjZSBmaWxlYCk7XG5cbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgY29uc3QgcHJvamVjdDogYW55ID0ge1xuICAgICAgcm9vdDogYCR7cHJvamVjdFJvb3R9YCxcbiAgICAgIHByb2plY3RUeXBlOiAnbGlicmFyeScsXG4gICAgICBhcmNoaXRlY3Q6IHtcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW5nLXBhY2thZ3I6YnVpbGQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2plY3Q6IGAke3Byb2plY3RSb290fS9uZy1wYWNrYWdlLmpzb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgcHJvamVjdDogYCR7cHJvamVjdFJvb3R9L25nLXBhY2thZ2UucHJvZC5qc29uYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdGVzdDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazprYXJtYScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgbWFpbjogYCR7cHJvamVjdFJvb3R9L3NyYy90ZXN0LnRzYCxcbiAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgIGthcm1hQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH0va2FybWEuY29uZi5qc2AsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgbGludDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjazpsaW50JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0c0NvbmZpZzogW1xuICAgICAgICAgICAgICAncHJvamVjdHMvbGliL3RzY29uZmlnLmxpbnQuanNvbicsXG4gICAgICAgICAgICAgICdwcm9qZWN0cy9saWIvdHNjb25maWcuc3BlYy5qc29uJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGNsdWRlOiBbXG4gICAgICAgICAgICAgICcqKi9ub2RlX21vZHVsZXMvKionLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgd29ya3NwYWNlLnByb2plY3RzW29wdGlvbnMubmFtZV0gPSBwcm9qZWN0O1xuICAgIGhvc3Qub3ZlcndyaXRlKGdldFdvcmtzcGFjZVBhdGgoaG9zdCksIEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZSwgbnVsbCwgMikpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogTGlicmFyeU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICAgIH1cbiAgICBjb25zdCBuYW1lID0gb3B0aW9ucy5uYW1lO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IG5ld1Byb2plY3RSb290ID0gd29ya3NwYWNlLm5ld1Byb2plY3RSb290O1xuICAgIGNvbnN0IHByb2plY3RSb290ID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7cHJvamVjdFJvb3R9L3NyYy9saWJgO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgdGVtcGxhdGUoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBwcm9qZWN0Um9vdCxcbiAgICAgIH0pLFxuICAgICAgLy8gVE9ETzogTW92aW5nIGluc2lkZSBgYnJhbmNoQW5kTWVyZ2VgIHNob3VsZCB3b3JrIGJ1dCBpcyBidWdnZWQgcmlnaHQgbm93LlxuICAgICAgLy8gVGhlIF9fcHJvamVjdFJvb3RfXyBpcyBiZWluZyB1c2VkIG1lYW53aGlsZS5cbiAgICAgIC8vIG1vdmUocHJvamVjdFJvb3QpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGJyYW5jaEFuZE1lcmdlKG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSkpLFxuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIHdvcmtzcGFjZSksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG9wdGlvbnMuc2tpcFRzQ29uZmlnID8gbm9vcCgpIDogdXBkYXRlVHNDb25maWcobmFtZSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBzcGVjOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGlubGluZVN0eWxlOiB0cnVlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBleHBvcnQ6IHRydWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnc2VydmljZScsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBtb2R1bGU6IGAke25hbWV9Lm1vZHVsZS50c2AsXG4gICAgICB9KSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==