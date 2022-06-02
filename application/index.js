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
            folderName = schematics_1.strings.dasherize(folderName);
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
                    utils: schematics_1.strings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxTQUFTLDRCQUE0QixDQUFDLE9BQTJCO0lBQy9ELE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DO1lBQ0U7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLE9BQU8sRUFBRSxnQ0FBYyxDQUFDLE9BQU87YUFDaEM7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLCtCQUErQjtnQkFDckMsT0FBTyxFQUFFLGdDQUFjLENBQUMsa0JBQWtCO2FBQzNDO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxZQUFZLENBQUM7YUFDdEM7U0FDRixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtZQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLEVBQUUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixD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QyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDdkQsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtnQkFDVixJQUFBLDJCQUFjLEVBQUM7b0JBQ2IsS0FBSyxFQUFFLG9CQUFPO29CQUNkLEdBQUcsT0FBTztvQkFDVixRQUFRLEVBQUUsZUFBZTtvQkFDekIsR0FBRyxnQkFBZ0I7aUJBQ3BCLENBQUM7Z0JBQ0YsSUFBQSxpQkFBSSxFQUFDLFNBQVMsQ0FBQzthQUNoQixDQUFDLEVBQ0YsMEJBQWEsQ0FBQyxTQUFTLENBQ3hCO1lBQ0QsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLE9BQU8sQ0FBQztTQUN6RSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBM0ZELDRCQTJGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uT2JqZWN0LCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBNZXJnZVN0cmF0ZWd5LFxuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycywgUHJvamVjdFR5cGUgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcGxpY2F0aW9uT3B0aW9ucywgU3R5bGUgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llc1RvUGFja2FnZUpzb24ob3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICBuYW1lOiAndHlwZXNjcmlwdCcsXG4gICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWyd0eXBlc2NyaXB0J10sXG4gICAgICB9LFxuICAgIF0uZm9yRWFjaCgoZGVwZW5kZW5jeSkgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpKTtcblxuICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBUb1dvcmtzcGFjZUZpbGUoXG4gIG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyxcbiAgYXBwRGlyOiBzdHJpbmcsXG4gIGZvbGRlck5hbWU6IHN0cmluZyxcbik6IFJ1bGUge1xuICBsZXQgcHJvamVjdFJvb3QgPSBhcHBEaXI7XG4gIGlmIChwcm9qZWN0Um9vdCkge1xuICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgfVxuXG4gIGNvbnN0IHNjaGVtYXRpY3M6IEpzb25PYmplY3QgPSB7fTtcblxuICBpZiAoXG4gICAgb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSB8fFxuICAgIG9wdGlvbnMuaW5saW5lU3R5bGUgfHxcbiAgICBvcHRpb25zLm1pbmltYWwgfHxcbiAgICBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3NcbiAgKSB7XG4gICAgY29uc3QgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM6IEpzb25PYmplY3QgPSB7fTtcbiAgICBpZiAob3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/PyBvcHRpb25zLm1pbmltYWwpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLmlubGluZVRlbXBsYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lU3R5bGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVTdHlsZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnN0eWxlICYmIG9wdGlvbnMuc3R5bGUgIT09IFN0eWxlLkNzcykge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuc3R5bGUgPSBvcHRpb25zLnN0eWxlO1xuICAgIH1cblxuICAgIHNjaGVtYXRpY3NbJ0BzY2hlbWF0aWNzL2FuZ3VsYXI6Y29tcG9uZW50J10gPSBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucztcbiAgfVxuXG4gIGlmIChvcHRpb25zLnNraXBUZXN0cyB8fCBvcHRpb25zLm1pbmltYWwpIHtcbiAgICBjb25zdCBzY2hlbWF0aWNzV2l0aFRlc3RzID0gW1xuICAgICAgJ2NsYXNzJyxcbiAgICAgICdjb21wb25lbnQnLFxuICAgICAgJ2RpcmVjdGl2ZScsXG4gICAgICAnZ3VhcmQnLFxuICAgICAgJ2ludGVyY2VwdG9yJyxcbiAgICAgICdwaXBlJyxcbiAgICAgICdyZXNvbHZlcicsXG4gICAgICAnc2VydmljZScsXG4gICAgXTtcblxuICAgIHNjaGVtYXRpY3NXaXRoVGVzdHMuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgaWYgKCEoYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWAgaW4gc2NoZW1hdGljcykpIHtcbiAgICAgICAgc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gPSB7fTtcbiAgICAgIH1cbiAgICAgIChzY2hlbWF0aWNzW2BAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gXSBhcyBKc29uT2JqZWN0KS5za2lwVGVzdHMgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qgc291cmNlUm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3RSb290KSwgJ3NyYycpO1xuICBsZXQgYnVkZ2V0cyA9IFtdO1xuICBpZiAob3B0aW9ucy5zdHJpY3QpIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNTAwa2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxbWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcya2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc0a2InLFxuICAgICAgfSxcbiAgICBdO1xuICB9IGVsc2Uge1xuICAgIGJ1ZGdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdpbml0aWFsJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICcybWInLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICc1bWInLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2FueUNvbXBvbmVudFN0eWxlJyxcbiAgICAgICAgbWF4aW11bVdhcm5pbmc6ICc2a2InLFxuICAgICAgICBtYXhpbXVtRXJyb3I6ICcxMGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIGNvbnN0IGlubGluZVN0eWxlTGFuZ3VhZ2UgPSBvcHRpb25zPy5zdHlsZSAhPT0gU3R5bGUuQ3NzID8gb3B0aW9ucy5zdHlsZSA6IHVuZGVmaW5lZDtcblxuICBjb25zdCBwcm9qZWN0ID0ge1xuICAgIHJvb3Q6IG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksXG4gICAgc291cmNlUm9vdCxcbiAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCB8fCAnYXBwJyxcbiAgICBzY2hlbWF0aWNzLFxuICAgIHRhcmdldHM6IHtcbiAgICAgIGJ1aWxkOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkJyb3dzZXIsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBgZGlzdC8ke2ZvbGRlck5hbWV9YCxcbiAgICAgICAgICBpbmRleDogYCR7c291cmNlUm9vdH0vaW5kZXguaHRtbGAsXG4gICAgICAgICAgbWFpbjogYCR7c291cmNlUm9vdH0vbWFpbi50c2AsXG4gICAgICAgICAgcG9seWZpbGxzOiBgJHtzb3VyY2VSb290fS9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHtwcm9qZWN0Um9vdH10c2NvbmZpZy5hcHAuanNvbmAsXG4gICAgICAgICAgaW5saW5lU3R5bGVMYW5ndWFnZSxcbiAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgIHN0eWxlczogW2Ake3NvdXJjZVJvb3R9L3N0eWxlcy4ke29wdGlvbnMuc3R5bGV9YF0sXG4gICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnVkZ2V0cyxcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlcGxhY2U6IGAke3NvdXJjZVJvb3R9L2Vudmlyb25tZW50cy9lbnZpcm9ubWVudC50c2AsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7c291cmNlUm9vdH0vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50LnByb2QudHNgLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiBmYWxzZSxcbiAgICAgICAgICAgIG9wdGltaXphdGlvbjogZmFsc2UsXG4gICAgICAgICAgICB2ZW5kb3JDaHVuazogdHJ1ZSxcbiAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogZmFsc2UsXG4gICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgICBuYW1lZENodW5rczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHNlcnZlOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkRldlNlcnZlcixcbiAgICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdkZXZlbG9wbWVudCcsXG4gICAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpkZXZlbG9wbWVudGAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAnZXh0cmFjdC1pMThuJzoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5FeHRyYWN0STE4bixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMubmFtZX06YnVpbGRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHRlc3Q6IG9wdGlvbnMubWluaW1hbFxuICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICA6IHtcbiAgICAgICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkthcm1hLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICBtYWluOiBgJHtzb3VyY2VSb290fS90ZXN0LnRzYCxcbiAgICAgICAgICAgICAgcG9seWZpbGxzOiBgJHtzb3VyY2VSb290fS9wb2x5ZmlsbHMudHNgLFxuICAgICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgICAga2FybWFDb25maWc6IGAke3Byb2plY3RSb290fWthcm1hLmNvbmYuanNgLFxuICAgICAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgICAgICBhc3NldHM6IFtgJHtzb3VyY2VSb290fS9mYXZpY29uLmljb2AsIGAke3NvdXJjZVJvb3R9L2Fzc2V0c2BdLFxuICAgICAgICAgICAgICBzdHlsZXM6IFtgJHtzb3VyY2VSb290fS9zdHlsZXMuJHtvcHRpb25zLnN0eWxlfWBdLFxuICAgICAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIHdvcmtzcGFjZS5wcm9qZWN0cy5hZGQoe1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgLi4ucHJvamVjdCxcbiAgICB9KTtcbiAgfSk7XG59XG5mdW5jdGlvbiBtaW5pbWFsUGF0aEZpbHRlcihwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgdG9SZW1vdmVMaXN0ID0gLyh0ZXN0LnRzfHRzY29uZmlnLnNwZWMuanNvbnxrYXJtYS5jb25mLmpzKS50ZW1wbGF0ZSQvO1xuXG4gIHJldHVybiAhdG9SZW1vdmVMaXN0LnRlc3QocGF0aCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXh9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4gPSAhb3B0aW9ucy5taW5pbWFsXG4gICAgICA/IHtcbiAgICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgICBza2lwVGVzdHM6IG9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgICB9XG4gICAgICA6IHtcbiAgICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSA/PyB0cnVlLFxuICAgICAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlID8/IHRydWUsXG4gICAgICAgICAgc2tpcFRlc3RzOiB0cnVlLFxuICAgICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IG5ld1Byb2plY3RSb290ID0gKHdvcmtzcGFjZS5leHRlbnNpb25zLm5ld1Byb2plY3RSb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgJyc7XG4gICAgY29uc3QgaXNSb290QXBwID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gSWYgc2NvcGVkIHByb2plY3QgKGkuZS4gXCJAZm9vL2JhclwiKSwgY29udmVydCBkaXIgdG8gXCJmb28vYmFyXCIuXG4gICAgbGV0IGZvbGRlck5hbWUgPSBvcHRpb25zLm5hbWUuc3RhcnRzV2l0aCgnQCcpID8gb3B0aW9ucy5uYW1lLnNsaWNlKDEpIDogb3B0aW9ucy5uYW1lO1xuICAgIGlmICgvW0EtWl0vLnRlc3QoZm9sZGVyTmFtZSkpIHtcbiAgICAgIGZvbGRlck5hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShmb2xkZXJOYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcHBEaXIgPSBpc1Jvb3RBcHBcbiAgICAgID8gbm9ybWFsaXplKG9wdGlvbnMucHJvamVjdFJvb3QgfHwgJycpXG4gICAgICA6IGpvaW4obm9ybWFsaXplKG5ld1Byb2plY3RSb290KSwgZm9sZGVyTmFtZSk7XG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7YXBwRGlyfS9zcmMvYXBwYDtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgYXBwRGlyLCBmb2xkZXJOYW1lKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBvcHRpb25zLm1pbmltYWwgPyBmaWx0ZXIobWluaW1hbFBhdGhGaWx0ZXIpIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KGFwcERpciksXG4gICAgICAgICAgICBhcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgICBpc1Jvb3RBcHAsXG4gICAgICAgICAgICBmb2xkZXJOYW1lLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSksXG4gICAgICAgIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlLFxuICAgICAgKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBvcHRpb25zLnN0cmljdCA/IG5vb3AoKSA6IGZpbHRlcigocGF0aCkgPT4gcGF0aCAhPT0gJy9wYWNrYWdlLmpzb24udGVtcGxhdGUnKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlXG4gICAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLnNraXBUZXN0c1xuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShzb3VyY2VEaXIpLFxuICAgICAgICBdKSxcbiAgICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgICApLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuIl19