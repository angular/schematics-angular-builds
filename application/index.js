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
    var _a, _b;
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
        if ((_a = options.inlineTemplate) !== null && _a !== void 0 ? _a : options.minimal) {
            componentSchematicsOptions.inlineTemplate = true;
        }
        if ((_b = options.inlineStyle) !== null && _b !== void 0 ? _b : options.minimal) {
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
    if (options.strict) {
        if (!('@schematics/angular:application' in schematics)) {
            schematics['@schematics/angular:application'] = {};
        }
        schematics['@schematics/angular:application'].strict = true;
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
    const inlineStyleLanguage = (options === null || options === void 0 ? void 0 : options.style) !== schema_1.Style.Css ? options.style : undefined;
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
                    polyfills: `${sourceRoot}/polyfills.ts`,
                    tsConfig: `${projectRoot}tsconfig.app.json`,
                    inlineStyleLanguage,
                    assets: [`${sourceRoot}/favicon.ico`, `${sourceRoot}/assets`],
                    styles: [`${sourceRoot}/styles.${options.style}`],
                    scripts: [],
                },
                configurations: {
                    production: {
                        budgets,
                        fileReplacements: [
                            {
                                replace: `${sourceRoot}/environments/environment.ts`,
                                with: `${sourceRoot}/environments/environment.prod.ts`,
                            },
                        ],
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
                        main: `${sourceRoot}/test.ts`,
                        polyfills: `${sourceRoot}/polyfills.ts`,
                        tsConfig: `${projectRoot}tsconfig.spec.json`,
                        karmaConfig: `${projectRoot}karma.conf.js`,
                        inlineStyleLanguage,
                        assets: [`${sourceRoot}/favicon.ico`, `${sourceRoot}/assets`],
                        styles: [`${sourceRoot}/styles.${options.style}`],
                        scripts: [],
                    },
                },
        },
    };
    return (0, workspace_1.updateWorkspace)((workspace) => {
        if (workspace.projects.size === 0) {
            workspace.extensions.defaultProject = options.name;
        }
        workspace.projects.add({
            name: options.name,
            ...project,
        });
    });
}
function minimalPathFilter(path) {
    const toRemoveList = /(test.ts|tsconfig.spec.json|karma.conf.js).template$/;
    return !toRemoveList.test(path);
}
function default_1(options) {
    return async (host) => {
        var _a, _b;
        const appRootSelector = `${options.prefix}-root`;
        const componentOptions = !options.minimal
            ? {
                inlineStyle: options.inlineStyle,
                inlineTemplate: options.inlineTemplate,
                skipTests: options.skipTests,
                style: options.style,
                viewEncapsulation: options.viewEncapsulation,
            }
            : {
                inlineStyle: (_a = options.inlineStyle) !== null && _a !== void 0 ? _a : true,
                inlineTemplate: (_b = options.inlineTemplate) !== null && _b !== void 0 ? _b : true,
                skipTests: true,
                style: options.style,
                viewEncapsulation: options.viewEncapsulation,
            };
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const newProjectRoot = workspace.extensions.newProjectRoot || '';
        const isRootApp = options.projectRoot !== undefined;
        // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
        let folderName = options.name.startsWith('@') ? options.name.slice(1) : options.name;
        if (/[A-Z]/.test(folderName)) {
            folderName = core_1.strings.dasherize(folderName);
        }
        const appDir = isRootApp
            ? (0, core_1.normalize)(options.projectRoot || '')
            : (0, core_1.join)((0, core_1.normalize)(newProjectRoot), folderName);
        const sourceDir = `${appDir}/src/app`;
        return (0, schematics_1.chain)([
            addAppToWorkspaceFile(options, appDir, folderName),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                options.minimal ? (0, schematics_1.filter)(minimalPathFilter) : (0, schematics_1.noop)(),
                (0, schematics_1.applyTemplates)({
                    utils: core_1.strings,
                    ...options,
                    relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(appDir),
                    appName: options.name,
                    isRootApp,
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
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./other-files'), [
                options.strict ? (0, schematics_1.noop)() : (0, schematics_1.filter)((path) => path !== '/package.json.template'),
                componentOptions.inlineTemplate
                    ? (0, schematics_1.filter)((path) => !path.endsWith('.html.template'))
                    : (0, schematics_1.noop)(),
                componentOptions.skipTests
                    ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template'))
                    : (0, schematics_1.noop)(),
                (0, schematics_1.applyTemplates)({
                    utils: core_1.strings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBNEU7QUFDNUUsMkRBY29DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxTQUFTLDRCQUE0QixDQUFDLE9BQTJCO0lBQy9ELE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DO1lBQ0U7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLE9BQU8sRUFBRSxnQ0FBYyxDQUFDLE9BQU87YUFDaEM7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLCtCQUErQjtnQkFDckMsT0FBTyxFQUFFLGdDQUFjLENBQUMsa0JBQWtCO2FBQzNDO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxZQUFZLENBQUM7YUFDdEM7U0FDRixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtZQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLEVBQUUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixD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QSxtQkFBTSxFQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssd0JBQXdCLENBQUM7Z0JBQzdFLGdCQUFnQixDQUFDLGNBQWM7b0JBQzdCLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUNwRCxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO2dCQUNWLGdCQUFnQixDQUFDLFNBQVM7b0JBQ3hCLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO29CQUN2RCxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO2dCQUNWLElBQUEsMkJBQWMsRUFBQztvQkFDYixLQUFLLEVBQUUsY0FBTztvQkFDZCxHQUFHLE9BQU87b0JBQ1YsUUFBUSxFQUFFLGVBQWU7b0JBQ3pCLEdBQUcsZ0JBQWdCO2lCQUNwQixDQUFDO2dCQUNGLElBQUEsaUJBQUksRUFBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUNGLDBCQUFhLENBQUMsU0FBUyxDQUN4QjtZQUNELE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7U0FDekUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTNGRCw0QkEyRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvbk9iamVjdCwgam9pbiwgbm9ybWFsaXplLCBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbXBvbmVudE9wdGlvbnMgfSBmcm9tICcuLi9jb21wb25lbnQvc2NoZW1hJztcbmltcG9ydCB7IE5vZGVEZXBlbmRlbmN5VHlwZSwgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFByb2plY3RUeXBlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMsIFN0eWxlIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ3R5cGVzY3JpcHQnLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1sndHlwZXNjcmlwdCddLFxuICAgICAgfSxcbiAgICBdLmZvckVhY2goKGRlcGVuZGVuY3kpID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKFxuICBvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIGFwcERpcjogc3RyaW5nLFxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgbGV0IHByb2plY3RSb290ID0gYXBwRGlyO1xuICBpZiAocHJvamVjdFJvb3QpIHtcbiAgICBwcm9qZWN0Um9vdCArPSAnLyc7XG4gIH1cblxuICBjb25zdCBzY2hlbWF0aWNzOiBKc29uT2JqZWN0ID0ge307XG5cbiAgaWYgKFxuICAgIG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgfHxcbiAgICBvcHRpb25zLmlubGluZVN0eWxlIHx8XG4gICAgb3B0aW9ucy5taW5pbWFsIHx8XG4gICAgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzXG4gICkge1xuICAgIGNvbnN0IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zOiBKc29uT2JqZWN0ID0ge307XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID8/IG9wdGlvbnMubWluaW1hbCkge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuaW5saW5lU3R5bGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5zdHlsZSAmJiBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3MpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLnN0eWxlID0gb3B0aW9ucy5zdHlsZTtcbiAgICB9XG5cbiAgICBzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddID0gY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM7XG4gIH1cblxuICBpZiAob3B0aW9ucy5za2lwVGVzdHMgfHwgb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljc1dpdGhUZXN0cyA9IFtcbiAgICAgICdjbGFzcycsXG4gICAgICAnY29tcG9uZW50JyxcbiAgICAgICdkaXJlY3RpdmUnLFxuICAgICAgJ2d1YXJkJyxcbiAgICAgICdpbnRlcmNlcHRvcicsXG4gICAgICAncGlwZScsXG4gICAgICAncmVzb2x2ZXInLFxuICAgICAgJ3NlcnZpY2UnLFxuICAgIF07XG5cbiAgICBzY2hlbWF0aWNzV2l0aFRlc3RzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgIGlmICghKGBAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gIGluIHNjaGVtYXRpY3MpKSB7XG4gICAgICAgIHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID0ge307XG4gICAgICB9XG4gICAgICAoc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gYXMgSnNvbk9iamVjdCkuc2tpcFRlc3RzID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLnN0cmljdCkge1xuICAgIGlmICghKCdAc2NoZW1hdGljcy9hbmd1bGFyOmFwcGxpY2F0aW9uJyBpbiBzY2hlbWF0aWNzKSkge1xuICAgICAgc2NoZW1hdGljc1snQHNjaGVtYXRpY3MvYW5ndWxhcjphcHBsaWNhdGlvbiddID0ge307XG4gICAgfVxuXG4gICAgKHNjaGVtYXRpY3NbJ0BzY2hlbWF0aWNzL2FuZ3VsYXI6YXBwbGljYXRpb24nXSBhcyBKc29uT2JqZWN0KS5zdHJpY3QgPSB0cnVlO1xuICB9XG5cbiAgY29uc3Qgc291cmNlUm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycpO1xuICBsZXQgYnVkZ2V0cyA9IFtdO1xuICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNTAwa2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxbWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcya2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc0a2InLFxuICAgICAgfSxcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIGJ1ZGdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcybWInLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc1bWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICc2a2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxMGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIGNvbnN0IGlubGluZVN0eWxlTGFuZ3VhZ2UgPSBvcHRpb25zPy5zdHlsZSAhPT0gU3R5bGUuQ3NzID8gb3B0aW9ucy5zdHlsZSA6IHVuZGVmaW5lZDtcblxuICBjb25zdCBwcm9qZWN0ID0ge1xuICAgIHJvb3Q6IG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksXG4gICAgc291cmNlUm9vdCxcbiAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICBzY2hlbWF0aWNzLFxuICAgIHRhcmdldHM6IHtcbiAgICAgIGJ1aWxkOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkJyb3dzZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke2ZvbGRlck5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7c291cmNlUm9vdH0vaW5kZXguaHRtbGAsXG4gICAgICAgICAgbWFpbjogYCR7c291cmNlUm9vdH0vbWFpbi50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBgJHtzb3VyY2VSb290fS9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH10c2NvbmZpZy5hcHAuanNvbmAsXG4gICAgICAgICAgaW5saW5lU3R5bGVMYW5ndWFnZSxcbiAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgIHN0eWxlczogW2Ake3NvdXJjZVJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnVkZ2V0cyxcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlcGxhY2U6IGAke3NvdXJjZVJvb3R9L2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC50c2AsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7c291cmNlUm9vdH0vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnByb2QudHNgLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiBmYWxzZSxcbiAgICAgICAgICAgIG9wdGltaXphdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB2ZW5kb3JDaHVuazogdHJ1ZSxcbiAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgICBuYW1lZENodW5rczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHNlcnZlOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkRldlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdkZXZlbG9wbWVudCcsXG4gICAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5FeHRyYWN0STE4bixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRlc3Q6IG9wdGlvbnMubWluaW1hbFxuICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICA6IHtcbiAgICAgICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkthcm1hLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBtYWluOiBgJHtzb3VyY2VSb290fS90ZXN0LnRzYCxcbiAgICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtzb3VyY2VSb290fS9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fWthcm1hLmNvbmYuanNgLFxuICAgICAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGlmICh3b3Jrc3BhY2UucHJvamVjdHMuc2l6ZSA9PT0gMCkge1xuICAgICAgd29ya3NwYWNlLmV4dGVuc2lvbnMuZGVmYXVsdFByb2plY3QgPSBvcHRpb25zLm5hbWU7XG4gICAgfVxuXG4gICAgd29ya3NwYWNlLnByb2plY3RzLmFkZCh7XG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAuLi5wcm9qZWN0LFxuICAgIH0pO1xuICB9KTtcbn1cbmZ1bmN0aW9uIG1pbmltYWxQYXRoRmlsdGVyKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCB0b1JlbW92ZUxpc3QgPSAvKHRlc3QudHN8dHNjb25maWcuc3BlYy5qc29ufGthcm1hLmNvbmYuanMpLnRlbXBsYXRlJC87XG5cbiAgcmV0dXJuICF0b1JlbW92ZUxpc3QudGVzdChwYXRoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBhcHBSb290U2VsZWN0b3IgPSBgJHtvcHRpb25zLnByZWZpeH0tcm9vdGA7XG4gICAgY29uc3QgY29tcG9uZW50T3B0aW9uczogUGFydGlhbDxDb21wb25lbnRPcHRpb25zPiA9ICFvcHRpb25zLm1pbmltYWxcbiAgICAgID8ge1xuICAgICAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgICAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgICAgICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICAgICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgICAgIH1cbiAgICAgIDoge1xuICAgICAgICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlID8/IHRydWUsXG4gICAgICAgICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gdHJ1ZSxcbiAgICAgICAgICBza2lwVGVzdHM6IHRydWUsXG4gICAgICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICAgICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgICAgIH07XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgbmV3UHJvamVjdFJvb3QgPSAod29ya3NwYWNlLmV4dGVuc2lvbnMubmV3UHJvamVjdFJvb3QgYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAnJztcbiAgICBjb25zdCBpc1Jvb3RBcHAgPSBvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQ7XG5cbiAgICAvLyBJZiBzY29wZWQgcHJvamVjdCAoaS5lLiBcIkBmb28vYmFyXCIpLCBjb252ZXJ0IGRpciB0byBcImZvby9iYXJcIi5cbiAgICBsZXQgZm9sZGVyTmFtZSA9IG9wdGlvbnMubmFtZS5zdGFydHNXaXRoKCdAJykgPyBvcHRpb25zLm5hbWUuc2xpY2UoMSkgOiBvcHRpb25zLm5hbWU7XG4gICAgaWYgKC9bQS1aXS8udGVzdChmb2xkZXJOYW1lKSkge1xuICAgICAgZm9sZGVyTmFtZSA9IHN0cmluZ3MuZGFzaGVyaXplKGZvbGRlck5hbWUpO1xuICAgIH1cblxuICAgIGNvbnN0IGFwcERpciA9IGlzUm9vdEFwcFxuICAgICAgPyBub3JtYWxpemUob3B0aW9ucy5wcm9qZWN0Um9vdCB8fCAnJylcbiAgICAgIDogam9pbihub3JtYWxpemUobmV3UHJvamVjdFJvb3QpLCBmb2xkZXJOYW1lKTtcbiAgICBjb25zdCBzb3VyY2VEaXIgPSBgJHthcHBEaXJ9L3NyYy9hcHBgO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCBhcHBEaXIsIGZvbGRlck5hbWUpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMubWluaW1hbCA/IGZpbHRlcihtaW5pbWFsUGF0aEZpbHRlcikgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QoYXBwRGlyKSxcbiAgICAgICAgICAgIGFwcE5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgICAgIGlzUm9vdEFwcCxcbiAgICAgICAgICAgIGZvbGRlck5hbWUsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSxcbiAgICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgICApLFxuICAgICAgc2NoZW1hdGljKCdtb2R1bGUnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBjb21tb25Nb2R1bGU6IGZhbHNlLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgICAgIHJvdXRpbmdTY29wZTogJ1Jvb3QnLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgIH0pLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAnLFxuICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICBmbGF0OiB0cnVlLFxuICAgICAgICBwYXRoOiBzb3VyY2VEaXIsXG4gICAgICAgIHNraXBJbXBvcnQ6IHRydWUsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMubmFtZSxcbiAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vb3RoZXItZmlsZXMnKSwgW1xuICAgICAgICAgIG9wdGlvbnMuc3RyaWN0ID8gbm9vcCgpIDogZmlsdGVyKChwYXRoKSA9PiBwYXRoICE9PSAnL3BhY2thZ2UuanNvbi50ZW1wbGF0ZScpLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuaW5saW5lVGVtcGxhdGVcbiAgICAgICAgICAgID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLmh0bWwudGVtcGxhdGUnKSlcbiAgICAgICAgICAgIDogbm9vcCgpLFxuICAgICAgICAgIGNvbXBvbmVudE9wdGlvbnMuc2tpcFRlc3RzXG4gICAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5zcGVjLnRzLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBzZWxlY3RvcjogYXBwUm9vdFNlbGVjdG9yLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50T3B0aW9ucyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHNvdXJjZURpciksXG4gICAgICAgIF0pLFxuICAgICAgICBNZXJnZVN0cmF0ZWd5Lk92ZXJ3cml0ZSxcbiAgICAgICksXG4gICAgICBvcHRpb25zLnNraXBQYWNrYWdlSnNvbiA/IG5vb3AoKSA6IGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24ob3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=