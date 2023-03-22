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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxHQUN4RSxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFckMsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQztZQUNsRCxPQUFPLENBQUMsVUFBVTtnQkFDaEIsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtnQkFDUixDQUFDLENBQUMsSUFBQSxzQkFBUyxFQUFDLFFBQVEsRUFBRTtvQkFDbEIsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLElBQUksRUFBRSxJQUFJO29CQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztvQkFDeEIsWUFBWSxFQUFFLE1BQU07b0JBQ3BCLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSTtpQkFDdEIsQ0FBQztZQUNOLElBQUEsc0JBQVMsRUFBQyxXQUFXLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2dCQUNYLFFBQVEsRUFBRSxlQUFlO2dCQUN6QixJQUFJLEVBQUUs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RSxJQUFJO1lBQ2YsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ3BCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7U0FDN0MsQ0FBQztJQUVOLE9BQU8sZ0JBQWdCLENBQUM7QUFDMUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uT2JqZWN0LCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBNZXJnZVN0cmF0ZWd5LFxuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycywgUHJvamVjdFR5cGUgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucywgU3R5bGUgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgeyBhcHBEaXIsIGFwcFJvb3RTZWxlY3RvciwgY29tcG9uZW50T3B0aW9ucywgZm9sZGVyTmFtZSwgc291cmNlRGlyIH0gPVxuICAgICAgYXdhaXQgZ2V0QXBwT3B0aW9ucyhob3N0LCBvcHRpb25zKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgYXBwRGlyLCBmb2xkZXJOYW1lKSxcbiAgICAgIG9wdGlvbnMuc3RhbmRhbG9uZVxuICAgICAgICA/IG5vb3AoKVxuICAgICAgICA6IHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICAgICAgbmFtZTogJ2FwcCcsXG4gICAgICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICAgICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICAgICAgcHJvamVjdDogb3B0aW9ucy5uYW1lLFxuICAgICAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwob3B0aW9ucy5zdGFuZGFsb25lID8gJy4vZmlsZXMvc3RhbmRhbG9uZS1maWxlcycgOiAnLi9maWxlcy9tb2R1bGUtZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMucm91dGluZyA/IG5vb3AoKSA6IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJ2FwcC5yb3V0ZXMudHMudGVtcGxhdGUnKSksXG4gICAgICAgICAgY29tcG9uZW50T3B0aW9ucy5za2lwVGVzdHNcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMudGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QoYXBwRGlyKSxcbiAgICAgICAgICAgIGFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgICAgIGZvbGRlck5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSxcbiAgICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgICApLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMvY29tbW9uLWZpbGVzJyksIFtcbiAgICAgICAgICBvcHRpb25zLm1pbmltYWxcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgndHNjb25maWcuc3BlYy5qc29uLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlXG4gICAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJ2NvbXBvbmVudC5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QoYXBwRGlyKSxcbiAgICAgICAgICAgIGFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgICAgIGZvbGRlck5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSxcbiAgICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgICApLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ3R5cGVzY3JpcHQnLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1sndHlwZXNjcmlwdCddLFxuICAgICAgfSxcbiAgICBdLmZvckVhY2goKGRlcGVuZGVuY3kpID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKFxuICBvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIGFwcERpcjogc3RyaW5nLFxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgbGV0IHByb2plY3RSb290ID0gYXBwRGlyO1xuICBpZiAocHJvamVjdFJvb3QpIHtcbiAgICBwcm9qZWN0Um9vdCArPSAnLyc7XG4gIH1cblxuICBjb25zdCBzY2hlbWF0aWNzOiBKc29uT2JqZWN0ID0ge307XG5cbiAgaWYgKFxuICAgIG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgfHxcbiAgICBvcHRpb25zLmlubGluZVN0eWxlIHx8XG4gICAgb3B0aW9ucy5taW5pbWFsIHx8XG4gICAgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzXG4gICkge1xuICAgIGNvbnN0IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zOiBKc29uT2JqZWN0ID0ge307XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID8/IG9wdGlvbnMubWluaW1hbCkge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuaW5saW5lU3R5bGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5zdHlsZSAmJiBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3MpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLnN0eWxlID0gb3B0aW9ucy5zdHlsZTtcbiAgICB9XG5cbiAgICBzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddID0gY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM7XG4gIH1cblxuICBpZiAob3B0aW9ucy5za2lwVGVzdHMgfHwgb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljc1dpdGhUZXN0cyA9IFtcbiAgICAgICdjbGFzcycsXG4gICAgICAnY29tcG9uZW50JyxcbiAgICAgICdkaXJlY3RpdmUnLFxuICAgICAgJ2d1YXJkJyxcbiAgICAgICdpbnRlcmNlcHRvcicsXG4gICAgICAncGlwZScsXG4gICAgICAncmVzb2x2ZXInLFxuICAgICAgJ3NlcnZpY2UnLFxuICAgIF07XG5cbiAgICBzY2hlbWF0aWNzV2l0aFRlc3RzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgIGlmICghKGBAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gIGluIHNjaGVtYXRpY3MpKSB7XG4gICAgICAgIHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID0ge307XG4gICAgICB9XG4gICAgICAoc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gYXMgSnNvbk9iamVjdCkuc2tpcFRlc3RzID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLnN0YW5kYWxvbmUpIHtcbiAgICBjb25zdCBzY2hlbWF0aWNzV2l0aFN0YW5kYWxvbmUgPSBbJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAncGlwZSddO1xuICAgIHNjaGVtYXRpY3NXaXRoU3RhbmRhbG9uZS5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICBpZiAoIShgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YCBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgICBzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSA9IHt9O1xuICAgICAgfVxuICAgICAgKHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdIGFzIEpzb25PYmplY3QpLnN0YW5kYWxvbmUgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc291cmNlUm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycpO1xuICBsZXQgYnVkZ2V0cyA9IFtdO1xuICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNTAwa2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxbWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcya2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc0a2InLFxuICAgICAgfSxcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIGJ1ZGdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcybWInLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc1bWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICc2a2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxMGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIGNvbnN0IGlubGluZVN0eWxlTGFuZ3VhZ2UgPSBvcHRpb25zPy5zdHlsZSAhPT0gU3R5bGUuQ3NzID8gb3B0aW9ucy5zdHlsZSA6IHVuZGVmaW5lZDtcblxuICBjb25zdCBwcm9qZWN0ID0ge1xuICAgIHJvb3Q6IG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksXG4gICAgc291cmNlUm9vdCxcbiAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICBzY2hlbWF0aWNzLFxuICAgIHRhcmdldHM6IHtcbiAgICAgIGJ1aWxkOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkJyb3dzZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke2ZvbGRlck5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7c291cmNlUm9vdH0vaW5kZXguaHRtbGAsXG4gICAgICAgICAgbWFpbjogYCR7c291cmNlUm9vdH0vbWFpbi50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBbJ3pvbmUuanMnXSxcbiAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuYXBwLmpzb25gLFxuICAgICAgICAgIGlubGluZVN0eWxlTGFuZ3VhZ2UsXG4gICAgICAgICAgYXNzZXRzOiBbYCR7c291cmNlUm9vdH0vZmF2aWNvbi5pY29gLCBgJHtzb3VyY2VSb290fS9hc3NldHNgXSxcbiAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgIHNjcmlwdHM6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJ1ZGdldHMsXG4gICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBidWlsZE9wdGltaXplcjogZmFsc2UsXG4gICAgICAgICAgICBvcHRpbWl6YXRpb246IGZhbHNlLFxuICAgICAgICAgICAgdmVuZG9yQ2h1bms6IHRydWUsXG4gICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IGZhbHNlLFxuICAgICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICAgICAgbmFtZWRDaHVua3M6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBzZXJ2ZToge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5EZXZTZXJ2ZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgICBvcHRpb25zOiB7fSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOnByb2R1Y3Rpb25gLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgJ2V4dHJhY3QtaTE4bic6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuRXh0cmFjdEkxOG4sXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkYCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB0ZXN0OiBvcHRpb25zLm1pbmltYWxcbiAgICAgICAgPyB1bmRlZmluZWRcbiAgICAgICAgOiB7XG4gICAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5LYXJtYSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgcG9seWZpbGxzOiBbJ3pvbmUuanMnLCAnem9uZS5qcy90ZXN0aW5nJ10sXG4gICAgICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH10c2NvbmZpZy5zcGVjLmpzb25gLFxuICAgICAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIHdvcmtzcGFjZS5wcm9qZWN0cy5hZGQoe1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgLi4ucHJvamVjdCxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEFwcE9wdGlvbnMoXG4gIGhvc3Q6IFRyZWUsXG4gIG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyxcbik6IFByb21pc2U8e1xuICBhcHBEaXI6IHN0cmluZztcbiAgYXBwUm9vdFNlbGVjdG9yOiBzdHJpbmc7XG4gIGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz47XG4gIGZvbGRlck5hbWU6IHN0cmluZztcbiAgc291cmNlRGlyOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IGFwcFJvb3RTZWxlY3RvciA9IGAke29wdGlvbnMucHJlZml4fS1yb290YDtcbiAgY29uc3QgY29tcG9uZW50T3B0aW9ucyA9IGdldENvbXBvbmVudE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICBjb25zdCBuZXdQcm9qZWN0Um9vdCA9ICh3b3Jrc3BhY2UuZXh0ZW5zaW9ucy5uZXdQcm9qZWN0Um9vdCBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8ICcnO1xuXG4gIC8vIElmIHNjb3BlZCBwcm9qZWN0IChpLmUuIFwiQGZvby9iYXJcIiksIGNvbnZlcnQgZGlyIHRvIFwiZm9vL2JhclwiLlxuICBsZXQgZm9sZGVyTmFtZSA9IG9wdGlvbnMubmFtZS5zdGFydHNXaXRoKCdAJykgPyBvcHRpb25zLm5hbWUuc2xpY2UoMSkgOiBvcHRpb25zLm5hbWU7XG4gIGlmICgvW0EtWl0vLnRlc3QoZm9sZGVyTmFtZSkpIHtcbiAgICBmb2xkZXJOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUoZm9sZGVyTmFtZSk7XG4gIH1cblxuICBjb25zdCBhcHBEaXIgPVxuICAgIG9wdGlvbnMucHJvamVjdFJvb3QgPT09IHVuZGVmaW5lZFxuICAgICAgPyBqb2luKG5vcm1hbGl6ZShuZXdQcm9qZWN0Um9vdCksIGZvbGRlck5hbWUpXG4gICAgICA6IG5vcm1hbGl6ZShvcHRpb25zLnByb2plY3RSb290KTtcblxuICBjb25zdCBzb3VyY2VEaXIgPSBgJHthcHBEaXJ9L3NyYy9hcHBgO1xuXG4gIHJldHVybiB7XG4gICAgYXBwRGlyLFxuICAgIGFwcFJvb3RTZWxlY3RvcixcbiAgICBjb21wb25lbnRPcHRpb25zLFxuICAgIGZvbGRlck5hbWUsXG4gICAgc291cmNlRGlyLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDb21wb25lbnRPcHRpb25zKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4ge1xuICBjb25zdCBjb21wb25lbnRPcHRpb25zOiBQYXJ0aWFsPENvbXBvbmVudE9wdGlvbnM+ID0gIW9wdGlvbnMubWluaW1hbFxuICAgID8ge1xuICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICAgIH1cbiAgICA6IHtcbiAgICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUgPz8gdHJ1ZSxcbiAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gdHJ1ZSxcbiAgICAgICAgc2tpcFRlc3RzOiB0cnVlLFxuICAgICAgICBzdHlsZTogb3B0aW9ucy5zdHlsZSxcbiAgICAgICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgICB9O1xuXG4gIHJldHVybiBjb21wb25lbnRPcHRpb25zO1xufVxuIl19