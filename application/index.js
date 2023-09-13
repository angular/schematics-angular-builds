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
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const schema_1 = require("./schema");
function default_1(options) {
    return async (host, context) => {
        const { appDir, appRootSelector, componentOptions, folderName, sourceDir } = await getAppOptions(host, options);
        if (options.standalone) {
            context.logger.warn('Standalone application structure is new and not yet supported by many existing' +
                ` 'ng add' and 'ng update' integrations with community libraries.`);
        }
        return (0, schematics_1.chain)([
            addAppToWorkspaceFile(options, appDir, folderName),
            options.standalone
                ? (0, schematics_1.noop)()
                : (0, schematics_1.schematic)('module', {
                    name: 'app',
                    commonModule: false,
                    flat: true,
                    routing: options.routing,
                    routingScope: 'Root',
                    path: sourceDir,
                    project: options.name,
                }),
            (0, schematics_1.schematic)('component', {
                name: 'app',
                selector: appRootSelector,
                flat: true,
                path: sourceDir,
                skipImport: true,
                project: options.name,
                ...componentOptions,
            }),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)(options.standalone ? './files/standalone-files' : './files/module-files'), [
                options.routing ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => !path.endsWith('app.routes.ts.template')),
                componentOptions.skipTests
                    ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template'))
                    : (0, schematics_1.noop)(),
                (0, schematics_1.applyTemplates)({
                    utils: schematics_1.strings,
                    ...options,
                    ...componentOptions,
                    selector: appRootSelector,
                    relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(appDir),
                    appName: options.name,
                    folderName,
                }),
                (0, schematics_1.move)(appDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/common-files'), [
                options.minimal
                    ? (0, schematics_1.filter)((path) => !path.endsWith('tsconfig.spec.json.template'))
                    : (0, schematics_1.noop)(),
                componentOptions.inlineTemplate
                    ? (0, schematics_1.filter)((path) => !path.endsWith('component.html.template'))
                    : (0, schematics_1.noop)(),
                (0, schematics_1.applyTemplates)({
                    utils: schematics_1.strings,
                    ...options,
                    selector: appRootSelector,
                    relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(appDir),
                    appName: options.name,
                    folderName,
                }),
                (0, schematics_1.move)(appDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            options.skipPackageJson ? (0, schematics_1.noop)() : addDependenciesToPackageJson(options),
        ]);
    };
}
exports.default = default_1;
function addDependenciesToPackageJson(options) {
    return (host, context) => {
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
                name: 'typescript',
                version: latest_versions_1.latestVersions['typescript'],
            },
        ].forEach((dependency) => (0, dependencies_1.addPackageJsonDependency)(host, dependency));
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        return host;
    };
}
function addAppToWorkspaceFile(options, appDir, folderName) {
    let projectRoot = appDir;
    if (projectRoot) {
        projectRoot += '/';
    }
    const schematics = {};
    if (options.inlineTemplate ||
        options.inlineStyle ||
        options.minimal ||
        options.style !== schema_1.Style.Css) {
        const componentSchematicsOptions = {};
        if (options.inlineTemplate ?? options.minimal) {
            componentSchematicsOptions.inlineTemplate = true;
        }
        if (options.inlineStyle ?? options.minimal) {
            componentSchematicsOptions.inlineStyle = true;
        }
        if (options.style && options.style !== schema_1.Style.Css) {
            componentSchematicsOptions.style = options.style;
        }
        schematics['@schematics/angular:component'] = componentSchematicsOptions;
    }
    if (options.skipTests || options.minimal) {
        const schematicsWithTests = [
            'class',
            'component',
            'directive',
            'guard',
            'interceptor',
            'pipe',
            'resolver',
            'service',
        ];
        schematicsWithTests.forEach((type) => {
            if (!(`@schematics/angular:${type}` in schematics)) {
                schematics[`@schematics/angular:${type}`] = {};
            }
            schematics[`@schematics/angular:${type}`].skipTests = true;
        });
    }
    if (options.standalone) {
        const schematicsWithStandalone = ['component', 'directive', 'pipe'];
        schematicsWithStandalone.forEach((type) => {
            if (!(`@schematics/angular:${type}` in schematics)) {
                schematics[`@schematics/angular:${type}`] = {};
            }
            schematics[`@schematics/angular:${type}`].standalone = true;
        });
    }
    const sourceRoot = (0, core_1.join)((0, core_1.normalize)(projectRoot), 'src');
    let budgets = [];
    if (options.strict) {
        budgets = [
            {
                type: 'initial',
                maximumWarning: '500kb',
                maximumError: '1mb',
            },
            {
                type: 'anyComponentStyle',
                maximumWarning: '2kb',
                maximumError: '4kb',
            },
        ];
    }
    else {
        budgets = [
            {
                type: 'initial',
                maximumWarning: '2mb',
                maximumError: '5mb',
            },
            {
                type: 'anyComponentStyle',
                maximumWarning: '6kb',
                maximumError: '10kb',
            },
        ];
    }
    const inlineStyleLanguage = options?.style !== schema_1.Style.Css ? options.style : undefined;
    const project = {
        root: (0, core_1.normalize)(projectRoot),
        sourceRoot,
        projectType: workspace_models_1.ProjectType.Application,
        prefix: options.prefix || 'app',
        schematics,
        targets: {
            build: {
                builder: workspace_models_1.Builders.Application,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${folderName}`,
                    index: `${sourceRoot}/index.html`,
                    browser: `${sourceRoot}/main.ts`,
                    polyfills: ['zone.js'],
                    tsConfig: `${projectRoot}tsconfig.app.json`,
                    inlineStyleLanguage,
                    assets: [`${sourceRoot}/favicon.ico`, `${sourceRoot}/assets`],
                    styles: [`${sourceRoot}/styles.${options.style}`],
                    scripts: [],
                },
                configurations: {
                    production: {
                        budgets,
                        outputHashing: 'all',
                    },
                    development: {
                        optimization: false,
                        extractLicenses: false,
                        sourceMap: true,
                    },
                },
            },
            serve: {
                builder: workspace_models_1.Builders.DevServer,
                defaultConfiguration: 'development',
                options: {},
                configurations: {
                    production: {
                        browserTarget: `${options.name}:build:production`,
                    },
                    development: {
                        browserTarget: `${options.name}:build:development`,
                    },
                },
            },
            'extract-i18n': {
                builder: workspace_models_1.Builders.ExtractI18n,
                options: {
                    browserTarget: `${options.name}:build`,
                },
            },
            test: options.minimal
                ? undefined
                : {
                    builder: workspace_models_1.Builders.Karma,
                    options: {
                        polyfills: ['zone.js', 'zone.js/testing'],
                        tsConfig: `${projectRoot}tsconfig.spec.json`,
                        inlineStyleLanguage,
                        assets: [`${sourceRoot}/favicon.ico`, `${sourceRoot}/assets`],
                        styles: [`${sourceRoot}/styles.${options.style}`],
                        scripts: [],
                    },
                },
        },
    };
    return (0, workspace_1.updateWorkspace)((workspace) => {
        workspace.projects.add({
            name: options.name,
            ...project,
        });
    });
}
async function getAppOptions(host, options) {
    const appRootSelector = `${options.prefix}-root`;
    const componentOptions = getComponentOptions(options);
    const workspace = await (0, workspace_1.getWorkspace)(host);
    const newProjectRoot = workspace.extensions.newProjectRoot || '';
    // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
    let folderName = options.name.startsWith('@') ? options.name.slice(1) : options.name;
    if (/[A-Z]/.test(folderName)) {
        folderName = schematics_1.strings.dasherize(folderName);
    }
    const appDir = options.projectRoot === undefined
        ? (0, core_1.join)((0, core_1.normalize)(newProjectRoot), folderName)
        : (0, core_1.normalize)(options.projectRoot);
    const sourceDir = `${appDir}/src/app`;
    return {
        appDir,
        appRootSelector,
        componentOptions,
        folderName,
        sourceDir,
    };
}
function getComponentOptions(options) {
    const componentOptions = !options.minimal
        ? {
            inlineStyle: options.inlineStyle,
            inlineTemplate: options.inlineTemplate,
            skipTests: options.skipTests,
            style: options.style,
            viewEncapsulation: options.viewEncapsulation,
        }
        : {
            inlineStyle: options.inlineStyle ?? true,
            inlineTemplate: options.inlineTemplate ?? true,
            skipTests: true,
            style: options.style,
            viewEncapsulation: options.viewEncapsulation,
        };
    return componentOptions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUNyRCxNQUFNLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQ3hFLE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVyQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLEVBQUU7WUFDdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2pCLGdGQUFnRjtnQkFDOUUsa0VBQWtFLENBQ3JFLENBQUM7U0FDSDtRQUVELE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gscUJBQXFCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUM7WUFDbEQsT0FBTyxDQUFDLFVBQVU7Z0JBQ2hCLENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7Z0JBQ1IsQ0FBQyxDQUFDLElBQUEsc0JBQVMsRUFBQyxRQUFRLEVBQUU7b0JBQ2xCLElBQUksRUFBRSxLQUFLO29CQUNYLFlBQVksRUFBRSxLQUFLO29CQUNuQixJQUFJLEVBQUUsSUFBSTtvQkFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87b0JBQ3hCLFlBQVksRUFBRSxNQUFNO29CQUNwQixJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsT0FB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LGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYyxJQUFJLElBQUk7WUFDOUMsU0FBUyxFQUFFLElBQUk7WUFDZixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQjtTQUM3QyxDQUFDO0lBRU4sT0FBTyxnQkFBZ0IsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25PYmplY3QsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIGZpbHRlcixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzLCBQcm9qZWN0VHlwZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zLCBTdHlsZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB7IGFwcERpciwgYXBwUm9vdFNlbGVjdG9yLCBjb21wb25lbnRPcHRpb25zLCBmb2xkZXJOYW1lLCBzb3VyY2VEaXIgfSA9XG4gICAgICBhd2FpdCBnZXRBcHBPcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuc3RhbmRhbG9uZSkge1xuICAgICAgY29udGV4dC5sb2dnZXIud2FybihcbiAgICAgICAgJ1N0YW5kYWxvbmUgYXBwbGljYXRpb24gc3RydWN0dXJlIGlzIG5ldyBhbmQgbm90IHlldCBzdXBwb3J0ZWQgYnkgbWFueSBleGlzdGluZycgK1xuICAgICAgICAgIGAgJ25nIGFkZCcgYW5kICduZyB1cGRhdGUnIGludGVncmF0aW9ucyB3aXRoIGNvbW11bml0eSBsaWJyYXJpZXMuYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCBhcHBEaXIsIGZvbGRlck5hbWUpLFxuICAgICAgb3B0aW9ucy5zdGFuZGFsb25lXG4gICAgICAgID8gbm9vcCgpXG4gICAgICAgIDogc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICAgICAgcm91dGluZ1Njb3BlOiAnUm9vdCcsXG4gICAgICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc2tpcEltcG9ydDogdHJ1ZSxcbiAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybChvcHRpb25zLnN0YW5kYWxvbmUgPyAnLi9maWxlcy9zdGFuZGFsb25lLWZpbGVzJyA6ICcuL2ZpbGVzL21vZHVsZS1maWxlcycpLCBbXG4gICAgICAgICAgb3B0aW9ucy5yb3V0aW5nID8gbm9vcCgpIDogZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnYXBwLnJvdXRlcy50cy50ZW1wbGF0ZScpKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLnNraXBUZXN0c1xuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChhcHBEaXIpLFxuICAgICAgICAgICAgYXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pLFxuICAgICAgICBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSxcbiAgICAgICksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9jb21tb24tZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbFxuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCd0c2NvbmZpZy5zcGVjLmpzb24udGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnY29tcG9uZW50Lmh0bWwudGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChhcHBEaXIpLFxuICAgICAgICAgICAgYXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pLFxuICAgICAgICBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSxcbiAgICAgICksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24ob3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24ob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHlwZXNjcmlwdCcsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWyd0eXBlc2NyaXB0J10sXG4gICAgICB9LFxuICAgIF0uZm9yRWFjaCgoZGVwZW5kZW5jeSkgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpKTtcblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUoXG4gIG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyxcbiAgYXBwRGlyOiBzdHJpbmcsXG4gIGZvbGRlck5hbWU6IHN0cmluZyxcbik6IFJ1bGUge1xuICBsZXQgcHJvamVjdFJvb3QgPSBhcHBEaXI7XG4gIGlmIChwcm9qZWN0Um9vdCkge1xuICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgfVxuXG4gIGNvbnN0IHNjaGVtYXRpY3M6IEpzb25PYmplY3QgPSB7fTtcblxuICBpZiAoXG4gICAgb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSB8fFxuICAgIG9wdGlvbnMuaW5saW5lU3R5bGUgfHxcbiAgICBvcHRpb25zLm1pbmltYWwgfHxcbiAgICBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3NcbiAgKSB7XG4gICAgY29uc3QgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM6IEpzb25PYmplY3QgPSB7fTtcbiAgICBpZiAob3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/PyBvcHRpb25zLm1pbmltYWwpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLmlubGluZVRlbXBsYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lU3R5bGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnN0eWxlICYmIG9wdGlvbnMuc3R5bGUgIT09IFN0eWxlLkNzcykge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuc3R5bGUgPSBvcHRpb25zLnN0eWxlO1xuICAgIH1cblxuICAgIHNjaGVtYXRpY3NbJ0BzY2hlbWF0aWNzL2FuZ3VsYXI6Y29tcG9uZW50J10gPSBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucztcbiAgfVxuXG4gIGlmIChvcHRpb25zLnNraXBUZXN0cyB8fCBvcHRpb25zLm1pbmltYWwpIHtcbiAgICBjb25zdCBzY2hlbWF0aWNzV2l0aFRlc3RzID0gW1xuICAgICAgJ2NsYXNzJyxcbiAgICAgICdjb21wb25lbnQnLFxuICAgICAgJ2RpcmVjdGl2ZScsXG4gICAgICAnZ3VhcmQnLFxuICAgICAgJ2ludGVyY2VwdG9yJyxcbiAgICAgICdwaXBlJyxcbiAgICAgICdyZXNvbHZlcicsXG4gICAgICAnc2VydmljZScsXG4gICAgXTtcblxuICAgIHNjaGVtYXRpY3NXaXRoVGVzdHMuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgaWYgKCEoYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWAgaW4gc2NoZW1hdGljcykpIHtcbiAgICAgICAgc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIChzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSBhcyBKc29uT2JqZWN0KS5za2lwVGVzdHMgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuc3RhbmRhbG9uZSkge1xuICAgIGNvbnN0IHNjaGVtYXRpY3NXaXRoU3RhbmRhbG9uZSA9IFsnY29tcG9uZW50JywgJ2RpcmVjdGl2ZScsICdwaXBlJ107XG4gICAgc2NoZW1hdGljc1dpdGhTdGFuZGFsb25lLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgIGlmICghKGBAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gIGluIHNjaGVtYXRpY3MpKSB7XG4gICAgICAgIHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID0ge307XG4gICAgICB9XG4gICAgICAoc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gYXMgSnNvbk9iamVjdCkuc3RhbmRhbG9uZSA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBzb3VyY2VSb290ID0gam9pbihub3JtYWxpemUocHJvamVjdFJvb3QpLCAnc3JjJyk7XG4gIGxldCBidWRnZXRzID0gW107XG4gIGlmIChvcHRpb25zLnN0cmljdCkge1xuICAgIGJ1ZGdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICc1MDBrYicsXG4gICAgICAgIG1heGltdW1FcnJvcjogJzFtYicsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYW55Q29tcG9uZW50U3R5bGUnLFxuICAgICAgICBtYXhpbXVtV2FybmluZzogJzJrYicsXG4gICAgICAgIG1heGltdW1FcnJvcjogJzRrYicsXG4gICAgICB9LFxuICAgIF07XG4gIH0gZWxzZSB7XG4gICAgYnVkZ2V0cyA9IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2luaXRpYWwnLFxuICAgICAgICBtYXhpbXVtV2FybmluZzogJzJtYicsXG4gICAgICAgIG1heGltdW1FcnJvcjogJzVtYicsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiAnYW55Q29tcG9uZW50U3R5bGUnLFxuICAgICAgICBtYXhpbXVtV2FybmluZzogJzZrYicsXG4gICAgICAgIG1heGltdW1FcnJvcjogJzEwa2InLFxuICAgICAgfSxcbiAgICBdO1xuICB9XG5cbiAgY29uc3QgaW5saW5lU3R5bGVMYW5ndWFnZSA9IG9wdGlvbnM/LnN0eWxlICE9PSBTdHlsZS5Dc3MgPyBvcHRpb25zLnN0eWxlIDogdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHByb2plY3QgPSB7XG4gICAgcm9vdDogbm9ybWFsaXplKHByb2plY3RSb290KSxcbiAgICBzb3VyY2VSb290LFxuICAgIHByb2plY3RUeXBlOiBQcm9qZWN0VHlwZS5BcHBsaWNhdGlvbixcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4IHx8ICdhcHAnLFxuICAgIHNjaGVtYXRpY3MsXG4gICAgdGFyZ2V0czoge1xuICAgICAgYnVpbGQ6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuQXBwbGljYXRpb24sXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke2ZvbGRlck5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7c291cmNlUm9vdH0vaW5kZXguaHRtbGAsXG4gICAgICAgICAgYnJvd3NlcjogYCR7c291cmNlUm9vdH0vbWFpbi50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBbJ3pvbmUuanMnXSxcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgICAgYXNzZXRzOiBbYCR7c291cmNlUm9vdH0vZmF2aWNvbi5pY29gLCBgJHtzb3VyY2VSb290fS9hc3NldHNgXSxcbiAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJ1ZGdldHMsXG4gICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBvcHRpbWl6YXRpb246IGZhbHNlLFxuICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHNlcnZlOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkRldlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdkZXZlbG9wbWVudCcsXG4gICAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5FeHRyYWN0STE4bixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRlc3Q6IG9wdGlvbnMubWluaW1hbFxuICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICA6IHtcbiAgICAgICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkthcm1hLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBwb2x5ZmlsbHM6IFsnem9uZS5qcycsICd6b25lLmpzL3Rlc3RpbmcnXSxcbiAgICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fXRzY29uZmlnLnNwZWMuanNvbmAsXG4gICAgICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgICAgICAgIGFzc2V0czogW2Ake3NvdXJjZVJvb3R9L2Zhdmljb24uaWNvYCwgYCR7c291cmNlUm9vdH0vYXNzZXRzYF0sXG4gICAgICAgICAgICAgIHN0eWxlczogW2Ake3NvdXJjZVJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YF0sXG4gICAgICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgd29ya3NwYWNlLnByb2plY3RzLmFkZCh7XG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAuLi5wcm9qZWN0LFxuICAgIH0pO1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0QXBwT3B0aW9ucyhcbiAgaG9zdDogVHJlZSxcbiAgb3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLFxuKTogUHJvbWlzZTx7XG4gIGFwcERpcjogc3RyaW5nO1xuICBhcHBSb290U2VsZWN0b3I6IHN0cmluZztcbiAgY29tcG9uZW50T3B0aW9uczogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPjtcbiAgZm9sZGVyTmFtZTogc3RyaW5nO1xuICBzb3VyY2VEaXI6IHN0cmluZztcbn0+IHtcbiAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXh9LXJvb3RgO1xuICBjb25zdCBjb21wb25lbnRPcHRpb25zID0gZ2V0Q29tcG9uZW50T3B0aW9ucyhvcHRpb25zKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gIGNvbnN0IG5ld1Byb2plY3RSb290ID0gKHdvcmtzcGFjZS5leHRlbnNpb25zLm5ld1Byb2plY3RSb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgJyc7XG5cbiAgLy8gSWYgc2NvcGVkIHByb2plY3QgKGkuZS4gXCJAZm9vL2JhclwiKSwgY29udmVydCBkaXIgdG8gXCJmb28vYmFyXCIuXG4gIGxldCBmb2xkZXJOYW1lID0gb3B0aW9ucy5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSA/IG9wdGlvbnMubmFtZS5zbGljZSgxKSA6IG9wdGlvbnMubmFtZTtcbiAgaWYgKC9bQS1aXS8udGVzdChmb2xkZXJOYW1lKSkge1xuICAgIGZvbGRlck5hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShmb2xkZXJOYW1lKTtcbiAgfVxuXG4gIGNvbnN0IGFwcERpciA9XG4gICAgb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgICA/IGpvaW4obm9ybWFsaXplKG5ld1Byb2plY3RSb290KSwgZm9sZGVyTmFtZSlcbiAgICAgIDogbm9ybWFsaXplKG9wdGlvbnMucHJvamVjdFJvb3QpO1xuXG4gIGNvbnN0IHNvdXJjZURpciA9IGAke2FwcERpcn0vc3JjL2FwcGA7XG5cbiAgcmV0dXJuIHtcbiAgICBhcHBEaXIsXG4gICAgYXBwUm9vdFNlbGVjdG9yLFxuICAgIGNvbXBvbmVudE9wdGlvbnMsXG4gICAgZm9sZGVyTmFtZSxcbiAgICBzb3VyY2VEaXIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudE9wdGlvbnMob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKTogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPiB7XG4gIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4gPSAhb3B0aW9ucy5taW5pbWFsXG4gICAgPyB7XG4gICAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgc2tpcFRlc3RzOiBvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgfVxuICAgIDoge1xuICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSA/PyB0cnVlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/PyB0cnVlLFxuICAgICAgICBza2lwVGVzdHM6IHRydWUsXG4gICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICAgIH07XG5cbiAgcmV0dXJuIGNvbXBvbmVudE9wdGlvbnM7XG59XG4iXX0=