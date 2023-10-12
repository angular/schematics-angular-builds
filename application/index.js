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
            options.ssr
                ? (0, schematics_1.schematic)('ssr', {
                    project: options.name,
                })
                : (0, schematics_1.noop)(),
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
            (schematics[`@schematics/angular:${type}`] ??= {}).skipTests = true;
        });
    }
    if (!options.standalone) {
        const schematicsWithStandalone = ['component', 'directive', 'pipe'];
        schematicsWithStandalone.forEach((type) => {
            (schematics[`@schematics/angular:${type}`] ??= {}).standalone = false;
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
                        buildTarget: `${options.name}:build:production`,
                    },
                    development: {
                        buildTarget: `${options.name}:build:development`,
                    },
                },
            },
            'extract-i18n': {
                builder: workspace_models_1.Builders.ExtractI18n,
                options: {
                    buildTarget: `${options.name}:build`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUNyRCxNQUFNLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQ3hFLE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVyQyxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxVQUFVO2dCQUNoQixDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO2dCQUNSLENBQUMsQ0FBQyxJQUFBLHNCQUFTLEVBQUMsUUFBUSxFQUFFO29CQUNsQixJQUFJLEVBQUUsS0FBSztvQkFDWCxZQUFZLEVBQUUsS0FBSztvQkFDbkIsSUFBSSxFQUFFLElBQUk7b0JBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO29CQUN4QixZQUFZLEVBQUUsTUFBTTtvQkFDcEIsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJO2lCQUN0QixDQUFDO1lBQ04sSUFBQSxzQkFBUyxFQUFDLFdBQVcsRUFBRTtnQkFDckIsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsUUFBUSxFQUFFLGVBQWU7Z0JBQ3pC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QUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEpzb25PYmplY3QsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIE1lcmdlU3RyYXRlZ3ksXG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIGZpbHRlcixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzLCBQcm9qZWN0VHlwZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zLCBTdHlsZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB7IGFwcERpciwgYXBwUm9vdFNlbGVjdG9yLCBjb21wb25lbnRPcHRpb25zLCBmb2xkZXJOYW1lLCBzb3VyY2VEaXIgfSA9XG4gICAgICBhd2FpdCBnZXRBcHBPcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCBhcHBEaXIsIGZvbGRlck5hbWUpLFxuICAgICAgb3B0aW9ucy5zdGFuZGFsb25lXG4gICAgICAgID8gbm9vcCgpXG4gICAgICAgIDogc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgICAgIGNvbW1vbk1vZHVsZTogZmFsc2UsXG4gICAgICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICAgICAgcm91dGluZ1Njb3BlOiAnUm9vdCcsXG4gICAgICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgIGZsYXQ6IHRydWUsXG4gICAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgICAgc2tpcEltcG9ydDogdHJ1ZSxcbiAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybChvcHRpb25zLnN0YW5kYWxvbmUgPyAnLi9maWxlcy9zdGFuZGFsb25lLWZpbGVzJyA6ICcuL2ZpbGVzL21vZHVsZS1maWxlcycpLCBbXG4gICAgICAgICAgb3B0aW9ucy5yb3V0aW5nID8gbm9vcCgpIDogZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnYXBwLnJvdXRlcy50cy50ZW1wbGF0ZScpKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLnNraXBUZXN0c1xuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChhcHBEaXIpLFxuICAgICAgICAgICAgYXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pLFxuICAgICAgICBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSxcbiAgICAgICksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9jb21tb24tZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbFxuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCd0c2NvbmZpZy5zcGVjLmpzb24udGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnY29tcG9uZW50Lmh0bWwudGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChhcHBEaXIpLFxuICAgICAgICAgICAgYXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICAgIF0pLFxuICAgICAgICBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSxcbiAgICAgICksXG4gICAgICBvcHRpb25zLnNzclxuICAgICAgICA/IHNjaGVtYXRpYygnc3NyJywge1xuICAgICAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgIH0pXG4gICAgICAgIDogbm9vcCgpLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ3R5cGVzY3JpcHQnLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1sndHlwZXNjcmlwdCddLFxuICAgICAgfSxcbiAgICBdLmZvckVhY2goKGRlcGVuZGVuY3kpID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKFxuICBvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIGFwcERpcjogc3RyaW5nLFxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgbGV0IHByb2plY3RSb290ID0gYXBwRGlyO1xuICBpZiAocHJvamVjdFJvb3QpIHtcbiAgICBwcm9qZWN0Um9vdCArPSAnLyc7XG4gIH1cblxuICBjb25zdCBzY2hlbWF0aWNzOiBKc29uT2JqZWN0ID0ge307XG5cbiAgaWYgKFxuICAgIG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgfHxcbiAgICBvcHRpb25zLmlubGluZVN0eWxlIHx8XG4gICAgb3B0aW9ucy5taW5pbWFsIHx8XG4gICAgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzXG4gICkge1xuICAgIGNvbnN0IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zOiBKc29uT2JqZWN0ID0ge307XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID8/IG9wdGlvbnMubWluaW1hbCkge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuaW5saW5lU3R5bGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5zdHlsZSAmJiBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3MpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLnN0eWxlID0gb3B0aW9ucy5zdHlsZTtcbiAgICB9XG5cbiAgICBzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddID0gY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM7XG4gIH1cblxuICBpZiAob3B0aW9ucy5za2lwVGVzdHMgfHwgb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljc1dpdGhUZXN0cyA9IFtcbiAgICAgICdjbGFzcycsXG4gICAgICAnY29tcG9uZW50JyxcbiAgICAgICdkaXJlY3RpdmUnLFxuICAgICAgJ2d1YXJkJyxcbiAgICAgICdpbnRlcmNlcHRvcicsXG4gICAgICAncGlwZScsXG4gICAgICAncmVzb2x2ZXInLFxuICAgICAgJ3NlcnZpY2UnLFxuICAgIF07XG5cbiAgICBzY2hlbWF0aWNzV2l0aFRlc3RzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgICgoc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gPz89IHt9KSBhcyBKc29uT2JqZWN0KS5za2lwVGVzdHMgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zLnN0YW5kYWxvbmUpIHtcbiAgICBjb25zdCBzY2hlbWF0aWNzV2l0aFN0YW5kYWxvbmUgPSBbJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAncGlwZSddO1xuICAgIHNjaGVtYXRpY3NXaXRoU3RhbmRhbG9uZS5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICAoKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID8/PSB7fSkgYXMgSnNvbk9iamVjdCkuc3RhbmRhbG9uZSA9IGZhbHNlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc291cmNlUm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycpO1xuICBsZXQgYnVkZ2V0cyA9IFtdO1xuICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNTAwa2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxbWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcya2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc0a2InLFxuICAgICAgfSxcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIGJ1ZGdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcybWInLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc1bWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICc2a2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxMGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIGNvbnN0IGlubGluZVN0eWxlTGFuZ3VhZ2UgPSBvcHRpb25zPy5zdHlsZSAhPT0gU3R5bGUuQ3NzID8gb3B0aW9ucy5zdHlsZSA6IHVuZGVmaW5lZDtcblxuICBjb25zdCBwcm9qZWN0ID0ge1xuICAgIHJvb3Q6IG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksXG4gICAgc291cmNlUm9vdCxcbiAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICBzY2hlbWF0aWNzLFxuICAgIHRhcmdldHM6IHtcbiAgICAgIGJ1aWxkOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkFwcGxpY2F0aW9uLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtmb2xkZXJOYW1lfWAsXG4gICAgICAgICAgaW5kZXg6IGAke3NvdXJjZVJvb3R9L2luZGV4Lmh0bWxgLFxuICAgICAgICAgIGJyb3dzZXI6IGAke3NvdXJjZVJvb3R9L21haW4udHNgLFxuICAgICAgICAgIHBvbHlmaWxsczogWyd6b25lLmpzJ10sXG4gICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIGFzc2V0czogW2Ake3NvdXJjZVJvb3R9L2Zhdmljb24uaWNvYCwgYCR7c291cmNlUm9vdH0vYXNzZXRzYF0sXG4gICAgICAgICAgc3R5bGVzOiBbYCR7c291cmNlUm9vdH0vc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gXSxcbiAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBidWRnZXRzLFxuICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZToge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5EZXZTZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgICBvcHRpb25zOiB7fSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBidWlsZFRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBidWlsZFRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5FeHRyYWN0STE4bixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJ1aWxkVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiBvcHRpb25zLm1pbmltYWxcbiAgICAgICAgPyB1bmRlZmluZWRcbiAgICAgICAgOiB7XG4gICAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5LYXJtYSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgcG9seWZpbGxzOiBbJ3pvbmUuanMnLCAnem9uZS5qcy90ZXN0aW5nJ10sXG4gICAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIHdvcmtzcGFjZS5wcm9qZWN0cy5hZGQoe1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgLi4ucHJvamVjdCxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEFwcE9wdGlvbnMoXG4gIGhvc3Q6IFRyZWUsXG4gIG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyxcbik6IFByb21pc2U8e1xuICBhcHBEaXI6IHN0cmluZztcbiAgYXBwUm9vdFNlbGVjdG9yOiBzdHJpbmc7XG4gIGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz47XG4gIGZvbGRlck5hbWU6IHN0cmluZztcbiAgc291cmNlRGlyOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGFwcFJvb3RTZWxlY3RvciA9IGAke29wdGlvbnMucHJlZml4fS1yb290YDtcbiAgY29uc3QgY29tcG9uZW50T3B0aW9ucyA9IGdldENvbXBvbmVudE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICBjb25zdCBuZXdQcm9qZWN0Um9vdCA9ICh3b3Jrc3BhY2UuZXh0ZW5zaW9ucy5uZXdQcm9qZWN0Um9vdCBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8ICcnO1xuXG4gIC8vIElmIHNjb3BlZCBwcm9qZWN0IChpLmUuIFwiQGZvby9iYXJcIiksIGNvbnZlcnQgZGlyIHRvIFwiZm9vL2JhclwiLlxuICBsZXQgZm9sZGVyTmFtZSA9IG9wdGlvbnMubmFtZS5zdGFydHNXaXRoKCdAJykgPyBvcHRpb25zLm5hbWUuc2xpY2UoMSkgOiBvcHRpb25zLm5hbWU7XG4gIGlmICgvW0EtWl0vLnRlc3QoZm9sZGVyTmFtZSkpIHtcbiAgICBmb2xkZXJOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUoZm9sZGVyTmFtZSk7XG4gIH1cblxuICBjb25zdCBhcHBEaXIgPVxuICAgIG9wdGlvbnMucHJvamVjdFJvb3QgPT09IHVuZGVmaW5lZFxuICAgICAgPyBqb2luKG5vcm1hbGl6ZShuZXdQcm9qZWN0Um9vdCksIGZvbGRlck5hbWUpXG4gICAgICA6IG5vcm1hbGl6ZShvcHRpb25zLnByb2plY3RSb290KTtcblxuICBjb25zdCBzb3VyY2VEaXIgPSBgJHthcHBEaXJ9L3NyYy9hcHBgO1xuXG4gIHJldHVybiB7XG4gICAgYXBwRGlyLFxuICAgIGFwcFJvb3RTZWxlY3RvcixcbiAgICBjb21wb25lbnRPcHRpb25zLFxuICAgIGZvbGRlck5hbWUsXG4gICAgc291cmNlRGlyLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDb21wb25lbnRPcHRpb25zKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4ge1xuICBjb25zdCBjb21wb25lbnRPcHRpb25zOiBQYXJ0aWFsPENvbXBvbmVudE9wdGlvbnM+ID0gIW9wdGlvbnMubWluaW1hbFxuICAgID8ge1xuICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICAgIH1cbiAgICA6IHtcbiAgICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUgPz8gdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gdHJ1ZSxcbiAgICAgICAgc2tpcFRlc3RzOiB0cnVlLFxuICAgICAgICBzdHlsZTogb3B0aW9ucy5zdHlsZSxcbiAgICAgICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgICB9O1xuXG4gIHJldHVybiBjb21wb25lbnRPcHRpb25zO1xufVxuIl19