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
function addDependenciesAndScriptsToPackageJson() {
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
            json.devDependencies = Object.assign({ '@angular/compiler-cli': latest_versions_1.latestVersions.Angular, '@angular-devkit/build-ng-packagr': 'latest', 'ng-packagr': '^2.4.1', 'tsickle': '>=0.25.5', 'tslib': '^1.7.1', 'typescript': latest_versions_1.latestVersions.TypeScript }, json.devDependencies);
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
            options.skipPackageJson ? schematics_1.noop() : addDependenciesAndScriptsToPackageJson(),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9saWJyYXJ5L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQStDO0FBQy9DLDJEQWFvQztBQUNwQyw4Q0FBb0Y7QUFDcEYsZ0VBQTREO0FBNkI1RCx3QkFBMkIsSUFBVSxFQUFFLElBQVksRUFBRSxRQUF5QjtJQUM1RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDWCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsd0JBQXdCLGNBQXNCO0lBRTVDLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxRQUE2QixFQUFFLEVBQUU7WUFDN0UsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FB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LGNBQU8sRUFDUCxPQUFPLElBQ1YsV0FBVyxJQUNYO1NBSUgsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLGtCQUFLLENBQUM7WUFDWCwyQkFBYyxDQUFDLHNCQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDekMscUJBQXFCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUN6QyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxpQkFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLHNDQUFzQyxFQUFFO1lBQzNFLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNwRCxzQkFBUyxDQUFDLFFBQVEsRUFBRTtnQkFDbEIsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxLQUFLO2FBQ1osQ0FBQztZQUNGLHNCQUFTLENBQUMsV0FBVyxFQUFFO2dCQUNyQixJQUFJLEVBQUUsSUFBSTtnQkFDVixXQUFXLEVBQUUsSUFBSTtnQkFDakIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLElBQUksRUFBRSxJQUFJO2dCQUNWLElBQUksRUFBRSxTQUFTO2dCQUNmLE1BQU0sRUFBRSxJQUFJO2FBQ2IsQ0FBQztZQUNGLHNCQUFTLENBQUMsU0FBUyxFQUFFO2dCQUNuQixJQUFJLEVBQUUsSUFBSTtnQkFDVixJQUFJLEVBQUUsSUFBSTtnQkFDVixJQUFJLEVBQUUsU0FBUztnQkFDZixNQUFNLEVBQUUsR0FBRyxJQUFJLFlBQVk7YUFDNUIsQ0FBQztTQUNILENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQW5ERCw0QkFtREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGJyYW5jaEFuZE1lcmdlLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHRlbXBsYXRlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFdvcmtzcGFjZVNjaGVtYSwgZ2V0V29ya3NwYWNlLCBnZXRXb3Jrc3BhY2VQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgTGlicmFyeU9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxudHlwZSBQYWNrYWdlSnNvblBhcnRpYWxUeXBlID0ge1xuICBzY3JpcHRzOiB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xuICB9LFxuICBkZXBlbmRlbmNpZXM6IHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmc7XG4gIH0sXG4gIGRldkRlcGVuZGVuY2llczoge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZztcbiAgfSxcbn07XG5cbmludGVyZmFjZSBVcGRhdGVKc29uRm48VD4ge1xuICAob2JqOiBUKTogVCB8IHZvaWQ7XG59XG5cbnR5cGUgVHNDb25maWdQYXJ0aWFsVHlwZSA9IHtcbiAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgYmFzZVVybDogc3RyaW5nLFxuICAgIHBhdGhzOiB7XG4gICAgICBba2V5OiBzdHJpbmddOiBzdHJpbmdbXTtcbiAgICB9LFxuICB9LFxufTtcblxuZnVuY3Rpb24gdXBkYXRlSnNvbkZpbGU8VD4oaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nLCBjYWxsYmFjazogVXBkYXRlSnNvbkZuPFQ+KTogVHJlZSB7XG4gIGNvbnN0IHNvdXJjZSA9IGhvc3QucmVhZChwYXRoKTtcbiAgaWYgKHNvdXJjZSkge1xuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBzb3VyY2UudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgY29uc3QganNvbiA9IEpTT04ucGFyc2Uoc291cmNlVGV4dCk7XG4gICAgY2FsbGJhY2soanNvbik7XG4gICAgaG9zdC5vdmVyd3JpdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgMikpO1xuICB9XG5cbiAgcmV0dXJuIGhvc3Q7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzQ29uZmlnKG5wbVBhY2thZ2VOYW1lOiBzdHJpbmcpIHtcblxuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBpZiAoIWhvc3QuZXhpc3RzKCd0c2NvbmZpZy5qc29uJykpIHsgcmV0dXJuIGhvc3Q7IH1cblxuICAgIHJldHVybiB1cGRhdGVKc29uRmlsZShob3N0LCAndHNjb25maWcuanNvbicsICh0c2NvbmZpZzogVHNDb25maWdQYXJ0aWFsVHlwZSkgPT4ge1xuICAgICAgaWYgKCF0c2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMpIHtcbiAgICAgICAgdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzID0ge307XG4gICAgICB9XG4gICAgICBpZiAoIXRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1tucG1QYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzW25wbVBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgfVxuICAgICAgdHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzW25wbVBhY2thZ2VOYW1lXS5wdXNoKGBkaXN0LyR7bnBtUGFja2FnZU5hbWV9YCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc0FuZFNjcmlwdHNUb1BhY2thZ2VKc29uKCkge1xuXG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghaG9zdC5leGlzdHMoJ3BhY2thZ2UuanNvbicpKSB7IHJldHVybiBob3N0OyB9XG5cbiAgICByZXR1cm4gdXBkYXRlSnNvbkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicsIChqc29uOiBQYWNrYWdlSnNvblBhcnRpYWxUeXBlKSA9PiB7XG5cblxuICAgICAgaWYgKCFqc29uWydkZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbW1vbic6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci9jb3JlJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyJzogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgICAgLy8gRGUtc3RydWN0dXJlIGxhc3Qga2VlcHMgZXhpc3RpbmcgdXNlciBkZXBlbmRlbmNpZXMuXG4gICAgICAgIC4uLmpzb24uZGVwZW5kZW5jaWVzLFxuICAgICAgfTtcblxuICAgICAgaWYgKCFqc29uWydkZXZEZXBlbmRlbmNpZXMnXSkge1xuICAgICAgICBqc29uWydkZXZEZXBlbmRlbmNpZXMnXSA9IHt9O1xuICAgICAgfVxuXG4gICAgICBqc29uLmRldkRlcGVuZGVuY2llcyA9IHtcbiAgICAgICAgJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaSc6IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2Fncic6ICdsYXRlc3QnLFxuICAgICAgICAnbmctcGFja2Fncic6ICdeMi40LjEnLFxuICAgICAgICAndHNpY2tsZSc6ICc+PTAuMjUuNScsXG4gICAgICAgICd0c2xpYic6ICdeMS43LjEnLFxuICAgICAgICAndHlwZXNjcmlwdCc6IGxhdGVzdFZlcnNpb25zLlR5cGVTY3JpcHQsXG4gICAgICAgIC8vIERlLXN0cnVjdHVyZSBsYXN0IGtlZXBzIGV4aXN0aW5nIHVzZXIgZGVwZW5kZW5jaWVzLlxuICAgICAgICAuLi5qc29uLmRldkRlcGVuZGVuY2llcyxcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zOiBMaWJyYXJ5T3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcgd29ya3NwYWNlIGZpbGVgKTtcblxuICAgIGNvbnN0IHByb2plY3RSb290ID0gYCR7d29ya3NwYWNlLm5ld1Byb2plY3RSb290fS8ke29wdGlvbnMubmFtZX1gO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICBjb25zdCBwcm9qZWN0OiBhbnkgPSB7XG4gICAgICByb290OiBgJHtwcm9qZWN0Um9vdH1gLFxuICAgICAgcHJvamVjdFR5cGU6ICdsaWJyYXJ5JyxcbiAgICAgIGFyY2hpdGVjdDoge1xuICAgICAgICBidWlsZDoge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtbmctcGFja2FncjpidWlsZCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgcHJvamVjdDogYCR7cHJvamVjdFJvb3R9L25nLXBhY2thZ2UuanNvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgICBwcm9qZWN0OiBgJHtwcm9qZWN0Um9vdH0vbmctcGFja2FnZS5wcm9kLmpzb25gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmthcm1hJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBtYWluOiBgJHtwcm9qZWN0Um9vdH0vc3JjL3Rlc3QudHNgLFxuICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fS90c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fS9rYXJtYS5jb25mLmpzYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBsaW50OiB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrOmxpbnQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHRzQ29uZmlnOiBbXG4gICAgICAgICAgICAgICdwcm9qZWN0cy9saWIvdHNjb25maWcubGludC5qc29uJyxcbiAgICAgICAgICAgICAgJ3Byb2plY3RzL2xpYi90c2NvbmZpZy5zcGVjLmpzb24nLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5uYW1lXSA9IHByb2plY3Q7XG4gICAgaG9zdC5vdmVyd3JpdGUoZ2V0V29ya3NwYWNlUGF0aChob3N0KSwgSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlLCBudWxsLCAyKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBMaWJyYXJ5T3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIGNvbnN0IG5hbWUgPSBvcHRpb25zLm5hbWU7XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSB3b3Jrc3BhY2UubmV3UHJvamVjdFJvb3Q7XG4gICAgY29uc3QgcHJvamVjdFJvb3QgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcbiAgICBjb25zdCBzb3VyY2VEaXIgPSBgJHtwcm9qZWN0Um9vdH0vc3JjL2xpYmA7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHByb2plY3RSb290LFxuICAgICAgfSksXG4gICAgICAvLyBUT0RPOiBNb3ZpbmcgaW5zaWRlIGBicmFuY2hBbmRNZXJnZWAgc2hvdWxkIHdvcmsgYnV0IGlzIGJ1Z2dlZCByaWdodCBub3cuXG4gICAgICAvLyBUaGUgX19wcm9qZWN0Um9vdF9fIGlzIGJlaW5nIHVzZWQgbWVhbndoaWxlLlxuICAgICAgLy8gbW92ZShwcm9qZWN0Um9vdCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYnJhbmNoQW5kTWVyZ2UobWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSksXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG9wdGlvbnMuc2tpcFBhY2thZ2VKc29uID8gbm9vcCgpIDogYWRkRGVwZW5kZW5jaWVzQW5kU2NyaXB0c1RvUGFja2FnZUpzb24oKSxcbiAgICAgIG9wdGlvbnMuc2tpcFRzQ29uZmlnID8gbm9vcCgpIDogdXBkYXRlVHNDb25maWcobmFtZSksXG4gICAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBzcGVjOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGlubGluZVN0eWxlOiB0cnVlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogdHJ1ZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBleHBvcnQ6IHRydWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnc2VydmljZScsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBtb2R1bGU6IGAke25hbWV9Lm1vZHVsZS50c2AsXG4gICAgICB9KSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==