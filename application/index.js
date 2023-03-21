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
    return async (host) => {
        const { appDir, appRootSelector, componentOptions, folderName, sourceDir } = await getAppOptions(host, options);
        const appTypeRules = options.standalone
            ? getStandaloneAppRules(options, appDir, folderName, sourceDir, appRootSelector, componentOptions)
            : getModuleAppRules(options, appDir, folderName, sourceDir, appRootSelector, componentOptions);
        return (0, schematics_1.chain)([
            addAppToWorkspaceFile(options, appDir, folderName),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/common-files'), [
                options.minimal ? (0, schematics_1.filter)(minimalPathFilter) : (0, schematics_1.noop)(),
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
            ...appTypeRules,
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/common-other-files'), [
                options.strict ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => path !== '/package.json.template'),
                componentOptions.inlineTemplate
                    ? (0, schematics_1.filter)((path) => !path.endsWith('.html.template'))
                    : (0, schematics_1.noop)(),
                componentOptions.skipTests
                    ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template'))
                    : (0, schematics_1.noop)(),
                (0, schematics_1.applyTemplates)({
                    utils: schematics_1.strings,
                    ...options,
                    selector: appRootSelector,
                    ...componentOptions,
                }),
                (0, schematics_1.move)(sourceDir),
            ]), schematics_1.MergeStrategy.Overwrite),
            options.skipPackageJson ? (0, schematics_1.noop)() : addDependenciesToPackageJson(options),
        ]);
    };
}
exports.default = default_1;
function getModuleAppRules(options, appDir, folderName, sourceDir, appRootSelector, componentOptions) {
    return [
        (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/module-files'), [
            options.minimal ? (0, schematics_1.filter)(minimalPathFilter) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                utils: schematics_1.strings,
                ...options,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(appDir),
                appName: options.name,
                folderName,
            }),
            (0, schematics_1.move)(appDir),
        ]), schematics_1.MergeStrategy.Overwrite),
        (0, schematics_1.schematic)('module', {
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
        (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/other-module-files'), [
            options.strict ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => path !== '/package.json.template'),
            componentOptions.inlineTemplate
                ? (0, schematics_1.filter)((path) => !path.endsWith('.html.template'))
                : (0, schematics_1.noop)(),
            componentOptions.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                utils: schematics_1.strings,
                ...options,
                selector: appRootSelector,
                ...componentOptions,
            }),
            (0, schematics_1.move)(sourceDir),
        ]), schematics_1.MergeStrategy.Overwrite),
    ];
}
function getStandaloneAppRules(options, appDir, folderName, sourceDir, appRootSelector, componentOptions) {
    return [
        (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/standalone-files'), [
            options.minimal ? (0, schematics_1.filter)(minimalPathFilter) : (0, schematics_1.noop)(),
            options.routing ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => !path.endsWith('app.routes.ts.template')),
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
        (0, schematics_1.schematic)('component', {
            name: 'app',
            selector: appRootSelector,
            flat: true,
            path: sourceDir,
            skipImport: true,
            project: options.name,
            standalone: true,
            ...componentOptions,
        }),
        (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files/other-standalone-files'), [
            options.strict ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => path !== '/package.json.template'),
            componentOptions.inlineTemplate
                ? (0, schematics_1.filter)((path) => !path.endsWith('.html.template'))
                : (0, schematics_1.noop)(),
            componentOptions.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                utils: schematics_1.strings,
                ...options,
                selector: appRootSelector,
                ...componentOptions,
            }),
            (0, schematics_1.move)(sourceDir),
        ]), schematics_1.MergeStrategy.Overwrite),
    ];
}
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
                builder: workspace_models_1.Builders.Browser,
                defaultConfiguration: 'production',
                options: {
                    outputPath: `dist/${folderName}`,
                    index: `${sourceRoot}/index.html`,
                    main: `${sourceRoot}/main.ts`,
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
                        buildOptimizer: false,
                        optimization: false,
                        vendorChunk: true,
                        extractLicenses: false,
                        sourceMap: true,
                        namedChunks: true,
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
function minimalPathFilter(path) {
    return !path.endsWith('tsconfig.spec.json.template');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxHQUN4RSxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFckMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFVBQVU7WUFDckMsQ0FBQyxDQUFDLHFCQUFxQixDQUNuQixPQUFPLEVBQ1AsTUFBTSxFQUNOLFVBQVUsRUFDVixTQUFTLEVBQ1QsZUFBZSxFQUNmLGdCQUFnQixDQUNqQjtZQUNILENBQUMsQ0FBQyxpQkFBaUIsQ0FDZixPQUFPLEVBQ1AsTUFBTSxFQUNOLFVBQVUsRUFDVixTQUFTLEVBQ1QsZUFBZSxFQUNmLGdCQUFnQixDQUNqQixDQUFDO1FBRU4sT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQztZQUNsRCxJQUFBLHNCQUFTLEVBQ1AsSUFBQSxrQkFBSyxFQUFDLElBQUEsZ0JBQUcsRUFBQyxzQkFBc0IsQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENB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QzdDO1FBQ0gsQ0FBQyxDQUFDO1lBQ0UsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksSUFBSTtZQUN4QyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWMsSUFBSSxJQUFJO1lBQzlDLFNBQVMsRUFBRSxJQUFJO1lBQ2YsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ3BCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7U0FDN0MsQ0FBQztJQUVOLE9BQU8sZ0JBQWdCLENBQUM7QUFDMUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uT2JqZWN0LCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBNZXJnZVN0cmF0ZWd5LFxuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycywgUHJvamVjdFR5cGUgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucywgU3R5bGUgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgeyBhcHBEaXIsIGFwcFJvb3RTZWxlY3RvciwgY29tcG9uZW50T3B0aW9ucywgZm9sZGVyTmFtZSwgc291cmNlRGlyIH0gPVxuICAgICAgYXdhaXQgZ2V0QXBwT3B0aW9ucyhob3N0LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IGFwcFR5cGVSdWxlcyA9IG9wdGlvbnMuc3RhbmRhbG9uZVxuICAgICAgPyBnZXRTdGFuZGFsb25lQXBwUnVsZXMoXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBhcHBEaXIsXG4gICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICBzb3VyY2VEaXIsXG4gICAgICAgICAgYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgIClcbiAgICAgIDogZ2V0TW9kdWxlQXBwUnVsZXMoXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICBhcHBEaXIsXG4gICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgICBzb3VyY2VEaXIsXG4gICAgICAgICAgYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnMsIGFwcERpciwgZm9sZGVyTmFtZSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9jb21tb24tZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbCA/IGZpbHRlcihtaW5pbWFsUGF0aEZpbHRlcikgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KGFwcERpciksXG4gICAgICAgICAgICBhcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgICBmb2xkZXJOYW1lLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSksXG4gICAgICAgIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlLFxuICAgICAgKSxcbiAgICAgIC4uLmFwcFR5cGVSdWxlcyxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL2NvbW1vbi1vdGhlci1maWxlcycpLCBbXG4gICAgICAgICAgb3B0aW9ucy5zdHJpY3QgPyBub29wKCkgOiBmaWx0ZXIoKHBhdGgpID0+IHBhdGggIT09ICcvcGFja2FnZS5qc29uLnRlbXBsYXRlJyksXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5pbmxpbmVUZW1wbGF0ZVxuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuaHRtbC50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5za2lwVGVzdHNcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMudGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgICAgXSksXG4gICAgICAgIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlLFxuICAgICAgKSxcbiAgICAgIG9wdGlvbnMuc2tpcFBhY2thZ2VKc29uID8gbm9vcCgpIDogYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbihvcHRpb25zKSxcbiAgICBdKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0TW9kdWxlQXBwUnVsZXMoXG4gIG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyxcbiAgYXBwRGlyOiBzdHJpbmcsXG4gIGZvbGRlck5hbWU6IHN0cmluZyxcbiAgc291cmNlRGlyOiBzdHJpbmcsXG4gIGFwcFJvb3RTZWxlY3Rvcjogc3RyaW5nLFxuICBjb21wb25lbnRPcHRpb25zOiBQYXJ0aWFsPENvbXBvbmVudE9wdGlvbnM+LFxuKTogUnVsZVtdIHtcbiAgcmV0dXJuIFtcbiAgICBtZXJnZVdpdGgoXG4gICAgICBhcHBseSh1cmwoJy4vZmlsZXMvbW9kdWxlLWZpbGVzJyksIFtcbiAgICAgICAgb3B0aW9ucy5taW5pbWFsID8gZmlsdGVyKG1pbmltYWxQYXRoRmlsdGVyKSA6IG5vb3AoKSxcbiAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QoYXBwRGlyKSxcbiAgICAgICAgICBhcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgZm9sZGVyTmFtZSxcbiAgICAgICAgfSksXG4gICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgIF0pLFxuICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgKSxcbiAgICBzY2hlbWF0aWMoJ21vZHVsZScsIHtcbiAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgIGZsYXQ6IHRydWUsXG4gICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgIHBhdGg6IHNvdXJjZURpcixcbiAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICB9KSxcbiAgICBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIHtcbiAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgIGZsYXQ6IHRydWUsXG4gICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICB9KSxcbiAgICBtZXJnZVdpdGgoXG4gICAgICBhcHBseSh1cmwoJy4vZmlsZXMvb3RoZXItbW9kdWxlLWZpbGVzJyksIFtcbiAgICAgICAgb3B0aW9ucy5zdHJpY3QgPyBub29wKCkgOiBmaWx0ZXIoKHBhdGgpID0+IHBhdGggIT09ICcvcGFja2FnZS5qc29uLnRlbXBsYXRlJyksXG4gICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgOiBub29wKCksXG4gICAgICAgIGNvbXBvbmVudE9wdGlvbnMuc2tpcFRlc3RzID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMudGVtcGxhdGUnKSkgOiBub29wKCksXG4gICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgfSksXG4gICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgIF0pLFxuICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgKSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhbmRhbG9uZUFwcFJ1bGVzKFxuICBvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIGFwcERpcjogc3RyaW5nLFxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXG4gIHNvdXJjZURpcjogc3RyaW5nLFxuICBhcHBSb290U2VsZWN0b3I6IHN0cmluZyxcbiAgY29tcG9uZW50T3B0aW9uczogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPixcbik6IFJ1bGVbXSB7XG4gIHJldHVybiBbXG4gICAgbWVyZ2VXaXRoKFxuICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzL3N0YW5kYWxvbmUtZmlsZXMnKSwgW1xuICAgICAgICBvcHRpb25zLm1pbmltYWwgPyBmaWx0ZXIobWluaW1hbFBhdGhGaWx0ZXIpIDogbm9vcCgpLFxuICAgICAgICBvcHRpb25zLnJvdXRpbmcgPyBub29wKCkgOiBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCdhcHAucm91dGVzLnRzLnRlbXBsYXRlJykpLFxuICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KGFwcERpciksXG4gICAgICAgICAgYXBwTmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgIGZvbGRlck5hbWUsXG4gICAgICAgIH0pLFxuICAgICAgICBtb3ZlKGFwcERpciksXG4gICAgICBdKSxcbiAgICAgIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlLFxuICAgICksXG4gICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICBuYW1lOiAnYXBwJyxcbiAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICBmbGF0OiB0cnVlLFxuICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgc2tpcEltcG9ydDogdHJ1ZSxcbiAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgICAuLi5jb21wb25lbnRPcHRpb25zLFxuICAgIH0pLFxuICAgIG1lcmdlV2l0aChcbiAgICAgIGFwcGx5KHVybCgnLi9maWxlcy9vdGhlci1zdGFuZGFsb25lLWZpbGVzJyksIFtcbiAgICAgICAgb3B0aW9ucy5zdHJpY3QgPyBub29wKCkgOiBmaWx0ZXIoKHBhdGgpID0+IHBhdGggIT09ICcvcGFja2FnZS5qc29uLnRlbXBsYXRlJyksXG4gICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgOiBub29wKCksXG4gICAgICAgIGNvbXBvbmVudE9wdGlvbnMuc2tpcFRlc3RzID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMudGVtcGxhdGUnKSkgOiBub29wKCksXG4gICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIHNlbGVjdG9yOiBhcHBSb290U2VsZWN0b3IsXG4gICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgfSksXG4gICAgICAgIG1vdmUoc291cmNlRGlyKSxcbiAgICAgIF0pLFxuICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgKSxcbiAgXTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzVG9QYWNrYWdlSnNvbihvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgW1xuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuQW5ndWxhcixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICd0eXBlc2NyaXB0JyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ3R5cGVzY3JpcHQnXSxcbiAgICAgIH0sXG4gICAgXS5mb3JFYWNoKChkZXBlbmRlbmN5KSA9PiBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgZGVwZW5kZW5jeSkpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFRvV29ya3NwYWNlRmlsZShcbiAgb3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLFxuICBhcHBEaXI6IHN0cmluZyxcbiAgZm9sZGVyTmFtZTogc3RyaW5nLFxuKTogUnVsZSB7XG4gIGxldCBwcm9qZWN0Um9vdCA9IGFwcERpcjtcbiAgaWYgKHByb2plY3RSb290KSB7XG4gICAgcHJvamVjdFJvb3QgKz0gJy8nO1xuICB9XG5cbiAgY29uc3Qgc2NoZW1hdGljczogSnNvbk9iamVjdCA9IHt9O1xuXG4gIGlmIChcbiAgICBvcHRpb25zLmlubGluZVRlbXBsYXRlIHx8XG4gICAgb3B0aW9ucy5pbmxpbmVTdHlsZSB8fFxuICAgIG9wdGlvbnMubWluaW1hbCB8fFxuICAgIG9wdGlvbnMuc3R5bGUgIT09IFN0eWxlLkNzc1xuICApIHtcbiAgICBjb25zdCBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9uczogSnNvbk9iamVjdCA9IHt9O1xuICAgIGlmIChvcHRpb25zLmlubGluZVRlbXBsYXRlID8/IG9wdGlvbnMubWluaW1hbCkge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuaW5saW5lVGVtcGxhdGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5pbmxpbmVTdHlsZSA/PyBvcHRpb25zLm1pbmltYWwpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLmlubGluZVN0eWxlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuc3R5bGUgJiYgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5zdHlsZSA9IG9wdGlvbnMuc3R5bGU7XG4gICAgfVxuXG4gICAgc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjpjb21wb25lbnQnXSA9IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuc2tpcFRlc3RzIHx8IG9wdGlvbnMubWluaW1hbCkge1xuICAgIGNvbnN0IHNjaGVtYXRpY3NXaXRoVGVzdHMgPSBbXG4gICAgICAnY2xhc3MnLFxuICAgICAgJ2NvbXBvbmVudCcsXG4gICAgICAnZGlyZWN0aXZlJyxcbiAgICAgICdndWFyZCcsXG4gICAgICAnaW50ZXJjZXB0b3InLFxuICAgICAgJ3BpcGUnLFxuICAgICAgJ3Jlc29sdmVyJyxcbiAgICAgICdzZXJ2aWNlJyxcbiAgICBdO1xuXG4gICAgc2NoZW1hdGljc1dpdGhUZXN0cy5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICBzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSA9IHt9O1xuICAgICAgfVxuICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnNraXBUZXN0cyA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5zdGFuZGFsb25lKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljc1dpdGhTdGFuZGFsb25lID0gWydjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ3BpcGUnXTtcbiAgICBzY2hlbWF0aWNzV2l0aFN0YW5kYWxvbmUuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgaWYgKCEoYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWAgaW4gc2NoZW1hdGljcykpIHtcbiAgICAgICAgc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIChzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSBhcyBKc29uT2JqZWN0KS5zdGFuZGFsb25lID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHNvdXJjZVJvb3QgPSBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnKTtcbiAgbGV0IGJ1ZGdldHMgPSBbXTtcbiAgaWYgKG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgYnVkZ2V0cyA9IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2luaXRpYWwnLFxuICAgICAgICBtYXhpbXVtV2FybmluZzogJzUwMGtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnMW1iJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdhbnlDb21wb25lbnRTdHlsZScsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnMmtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnNGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfSBlbHNlIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnMm1iJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnNW1iJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdhbnlDb21wb25lbnRTdHlsZScsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNmtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnMTBrYicsXG4gICAgICB9LFxuICAgIF07XG4gIH1cblxuICBjb25zdCBpbmxpbmVTdHlsZUxhbmd1YWdlID0gb3B0aW9ucz8uc3R5bGUgIT09IFN0eWxlLkNzcyA/IG9wdGlvbnMuc3R5bGUgOiB1bmRlZmluZWQ7XG5cbiAgY29uc3QgcHJvamVjdCA9IHtcbiAgICByb290OiBub3JtYWxpemUocHJvamVjdFJvb3QpLFxuICAgIHNvdXJjZVJvb3QsXG4gICAgcHJvamVjdFR5cGU6IFByb2plY3RUeXBlLkFwcGxpY2F0aW9uLFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCcsXG4gICAgc2NoZW1hdGljcyxcbiAgICB0YXJnZXRzOiB7XG4gICAgICBidWlsZDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Ccm93c2VyLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtmb2xkZXJOYW1lfWAsXG4gICAgICAgICAgaW5kZXg6IGAke3NvdXJjZVJvb3R9L2luZGV4Lmh0bWxgLFxuICAgICAgICAgIG1haW46IGAke3NvdXJjZVJvb3R9L21haW4udHNgLFxuICAgICAgICAgIHBvbHlmaWxsczogWyd6b25lLmpzJ10sXG4gICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIGFzc2V0czogW2Ake3NvdXJjZVJvb3R9L2Zhdmljb24uaWNvYCwgYCR7c291cmNlUm9vdH0vYXNzZXRzYF0sXG4gICAgICAgICAgc3R5bGVzOiBbYCR7c291cmNlUm9vdH0vc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gXSxcbiAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBidWRnZXRzLFxuICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IGZhbHNlLFxuICAgICAgICAgICAgb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHZlbmRvckNodW5rOiB0cnVlLFxuICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VydmU6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuRGV2U2VydmVyLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ2RldmVsb3BtZW50JyxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgICdleHRyYWN0LWkxOG4nOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkV4dHJhY3RJMThuLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdGVzdDogb3B0aW9ucy5taW5pbWFsXG4gICAgICAgID8gdW5kZWZpbmVkXG4gICAgICAgIDoge1xuICAgICAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuS2FybWEsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIHBvbHlmaWxsczogWyd6b25lLmpzJywgJ3pvbmUuanMvdGVzdGluZyddLFxuICAgICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgICAgaW5saW5lU3R5bGVMYW5ndWFnZSxcbiAgICAgICAgICAgICAgYXNzZXRzOiBbYCR7c291cmNlUm9vdH0vZmF2aWNvbi5pY29gLCBgJHtzb3VyY2VSb290fS9hc3NldHNgXSxcbiAgICAgICAgICAgICAgc3R5bGVzOiBbYCR7c291cmNlUm9vdH0vc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gXSxcbiAgICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICB3b3Jrc3BhY2UucHJvamVjdHMuYWRkKHtcbiAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgIC4uLnByb2plY3QsXG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtaW5pbWFsUGF0aEZpbHRlcihwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICFwYXRoLmVuZHNXaXRoKCd0c2NvbmZpZy5zcGVjLmpzb24udGVtcGxhdGUnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0QXBwT3B0aW9ucyhcbiAgaG9zdDogVHJlZSxcbiAgb3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zLFxuKTogUHJvbWlzZTx7XG4gIGFwcERpcjogc3RyaW5nO1xuICBhcHBSb290U2VsZWN0b3I6IHN0cmluZztcbiAgY29tcG9uZW50T3B0aW9uczogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPjtcbiAgZm9sZGVyTmFtZTogc3RyaW5nO1xuICBzb3VyY2VEaXI6IHN0cmluZztcbn0+IHtcbiAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXh9LXJvb3RgO1xuICBjb25zdCBjb21wb25lbnRPcHRpb25zID0gZ2V0Q29tcG9uZW50T3B0aW9ucyhvcHRpb25zKTtcblxuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gIGNvbnN0IG5ld1Byb2plY3RSb290ID0gKHdvcmtzcGFjZS5leHRlbnNpb25zLm5ld1Byb2plY3RSb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgJyc7XG5cbiAgLy8gSWYgc2NvcGVkIHByb2plY3QgKGkuZS4gXCJAZm9vL2JhclwiKSwgY29udmVydCBkaXIgdG8gXCJmb28vYmFyXCIuXG4gIGxldCBmb2xkZXJOYW1lID0gb3B0aW9ucy5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSA/IG9wdGlvbnMubmFtZS5zbGljZSgxKSA6IG9wdGlvbnMubmFtZTtcbiAgaWYgKC9bQS1aXS8udGVzdChmb2xkZXJOYW1lKSkge1xuICAgIGZvbGRlck5hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShmb2xkZXJOYW1lKTtcbiAgfVxuXG4gIGNvbnN0IGFwcERpciA9XG4gICAgb3B0aW9ucy5wcm9qZWN0Um9vdCA9PT0gdW5kZWZpbmVkXG4gICAgICA/IGpvaW4obm9ybWFsaXplKG5ld1Byb2plY3RSb290KSwgZm9sZGVyTmFtZSlcbiAgICAgIDogbm9ybWFsaXplKG9wdGlvbnMucHJvamVjdFJvb3QpO1xuXG4gIGNvbnN0IHNvdXJjZURpciA9IGAke2FwcERpcn0vc3JjL2FwcGA7XG5cbiAgcmV0dXJuIHtcbiAgICBhcHBEaXIsXG4gICAgYXBwUm9vdFNlbGVjdG9yLFxuICAgIGNvbXBvbmVudE9wdGlvbnMsXG4gICAgZm9sZGVyTmFtZSxcbiAgICBzb3VyY2VEaXIsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudE9wdGlvbnMob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKTogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPiB7XG4gIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4gPSAhb3B0aW9ucy5taW5pbWFsXG4gICAgPyB7XG4gICAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgc2tpcFRlc3RzOiBvcHRpb25zLnNraXBUZXN0cyxcbiAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgfVxuICAgIDoge1xuICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSA/PyB0cnVlLFxuICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/PyB0cnVlLFxuICAgICAgICBza2lwVGVzdHM6IHRydWUsXG4gICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICAgIH07XG5cbiAgcmV0dXJuIGNvbXBvbmVudE9wdGlvbnM7XG59XG4iXX0=