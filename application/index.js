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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwbGljYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBbUU7QUFDbkUsMkRBZW9DO0FBQ3BDLDREQUEwRTtBQUUxRSwwREFBdUY7QUFDdkYsZ0VBQTREO0FBQzVELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQW9FO0FBQ3BFLHFDQUErRDtBQUUvRCxTQUFTLDRCQUE0QixDQUFDLE9BQTJCO0lBQy9ELE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DO1lBQ0U7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSx1QkFBdUI7Z0JBQzdCLE9BQU8sRUFBRSxnQ0FBYyxDQUFDLE9BQU87YUFDaEM7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztnQkFDNUIsSUFBSSxFQUFFLCtCQUErQjtnQkFDckMsT0FBTyxFQUFFLGdDQUFjLENBQUMsa0JBQWtCO2FBQzNDO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7Z0JBQzVCLElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxZQUFZLENBQUM7YUFDdEM7U0FDRixDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUV0RSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtZQUN4QixPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLEVBQUUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FDNUIsT0FBMkIsRUFDM0IsTUFBYyxFQUNkLFVBQWtCOztJQUVsQixJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUM7SUFDekIsSUFBSSxXQUFXLEVBQUU7UUFDZixXQUFXLElBQUksR0FBRyxDQUFDO0tBQ3BCO0lBRUQsTUFBTSxVQUFVLEdBQWUsRUFBRSxDQUFDO0lBRWxDLElBQ0UsT0FBTyxDQUFDLGNBQWM7UUFDdEIsT0FBTyxDQUFDLFdBQVc7UUFDbkIsT0FBTyxDQUFDLE9BQU87UUFDZixPQUFPLENBQUMsS0FBSyxLQUFLLGNBQUssQ0FBQyxHQUFHLEVBQzNCO1FBQ0EsTUFBTSwwQkFBMEIsR0FBZSxFQUFFLENBQUM7UUFDbEQsSUFBSSxNQUFBLE9BQU8sQ0FBQyxjQUFjLG1DQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDN0MsMEJBQTBCLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztTQUNsRDtRQUNELElBQUksTUFBQSxPQUFPLENBQUMsV0FBVyxtQ0FBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQzFDLDBCQUEwQixDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDL0M7UUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLElBQUksT0FBTyxDQUFDLEtBQUssS0FBSyxjQUFLLENBQUMsR0FBRyxFQUFFO1lBQ2hELDBCQUEwQixDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ2xEO1FBRUQsVUFBVSxDQUFDLCtCQUErQixDQUFDLEdBQUcsMEJBQTBCLENBQUM7S0FDMUU7SUFFRCxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUN4QyxNQUFNLG1CQUFtQixHQUFHO1lBQzFCLE9BQU87WUFDUCxXQUFXO1lBQ1gsV0FBVztZQUNYLE9BQU87WUFDUCxhQUFhO1lBQ2IsTUFBTTtZQUNOLFVBQVU7WUFDVixTQUFTO1NBQ1YsQ0FBQztRQUVGLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ25DLElBQUksQ0FBQyxDQUFDLHVCQUF1QixJQUFJLEVBQUUsSUFBSSxVQUFVLENBQUMsRUFBRTtnQkFDbEQsVUFBVSxDQUFDLHVCQUF1QixJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUNoRDtZQUNBLFVBQVUsQ0FBQyx1QkFBdUIsSUFBSSxFQUFFLENBQWdCLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUM3RSxDQUFDLENBQUMsQ0FBQztLQUNKO0lBRUQsTUFBTSxVQUFVLEdBQUcsSUFBQSxXQUFJLEVBQUMsSUFBQSxnQkFBUyxFQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZELElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDbEIsT0FBTyxHQUFHO1lBQ1I7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsY0FBYyxFQUFFLE9BQU87Z0JBQ3ZCLFlBQVksRUFBRSxLQUFLO2FBQ3BCO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLFlBQVksRUFBRSxLQUFLO2FBQ3BCO1NBQ0YsQ0FBQztLQUNIO1NBQU07UUFDTCxPQUFPLEdBQUc7WUFDUjtnQkFDRSxJQUFJLEVBQUUsU0FBUztnQkFDZixjQUFjLEVBQUUsS0FBSztnQkFDckIsWUFBWSxFQUFFLEtBQUs7YUFDcEI7WUFDRDtnQkFDRSxJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixjQUFjLEVBQUUsS0FBSztnQkFDckIsWUFBWSxFQUFFLE1BQU07YUFDckI7U0FDRixDQUFDO0tBQ0g7SUFFRCxNQUFNLG1CQUFtQixHQUFHLENBQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLEtBQUssTUFBSyxjQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFckYsTUFBTSxPQUFPLEdBQUc7UUFDZCxJQUFJLEVBQUUsSUFBQSxnQkFBUyxFQUFDLFdBQVcsQ0FBQztRQUM1QixVQUFVO1FBQ1YsV0FBVyxFQUFFLDhCQUFXLENBQUMsV0FBVztRQUNwQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLO1FBQy9CLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxLQUFLLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFLDJCQUFRLENBQUMsT0FBTztnQkFDekIsb0JBQW9CLEVBQUUsWUFBWTtnQkFDbEMsT0FBTyxFQUFFO29CQUNQLFVBQVUsRUFBRSxRQUFRLFVBQVUsRUFBRTtvQkFDaEMsS0FBSyxFQUFFLEdBQUcsVUFBVSxhQUFhO29CQUNqQyxJQUFJLEVBQUUsR0FBRyxVQUFVLFVBQVU7b0JBQzdCLFNBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDdEIsUUFBUSxFQUFFLEdBQUcsV0FBVyxtQkFBbUI7b0JBQzNDLG1CQUFtQjtvQkFDbkIsTUFBTSxFQUFFLENBQUMsR0FBRyxVQUFVLGNBQWMsRUFBRSxHQUFHLFVBQVUsU0FBUyxDQUFDO29CQUM3RCxNQUFNLEVBQUUsQ0FBQyxHQUFHLFVBQVUsV0FBVyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ2pELE9BQU8sRUFBRSxFQUFFO2lCQUNaO2dCQUNELGNBQWMsRUFBRTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1YsT0FBTzt3QkFDUCxhQUFhLEVBQUUsS0FBSztxQkFDckI7b0JBQ0QsV0FBVyxFQUFFO3dCQUNYLGNBQWMsRUFBRSxLQUFLO3dCQUNyQixZQUFZLEVBQUUsS0FBSzt3QkFDbkIsV0FBVyxFQUFFLElBQUk7d0JBQ2pCLGVBQWUsRUFBRSxLQUFLO3dCQUN0QixTQUFTLEVBQUUsSUFBSTt3QkFDZixXQUFXLEVBQUUsSUFBSTtxQkFDbEI7aUJBQ0Y7YUFDRjtZQUNELEtBQUssRUFBRTtnQkFDTCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxTQUFTO2dCQUMzQixvQkFBb0IsRUFBRSxhQUFhO2dCQUNuQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxjQUFjLEVBQUU7b0JBQ2QsVUFBVSxFQUFFO3dCQUNWLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQjtxQkFDbEQ7b0JBQ0QsV0FBVyxFQUFFO3dCQUNYLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLG9CQUFvQjtxQkFDbkQ7aUJBQ0Y7YUFDRjtZQUNELGNBQWMsRUFBRTtnQkFDZCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxXQUFXO2dCQUM3QixPQUFPLEVBQUU7b0JBQ1AsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksUUFBUTtpQkFDdkM7YUFDRjtZQUNELElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDbkIsQ0FBQyxDQUFDLFNBQVM7Z0JBQ1gsQ0FBQyxDQUFDO29CQUNFLE9BQU8sRUFBRSwyQkFBUSxDQUFDLEtBQUs7b0JBQ3ZCLE9BQU8sRUFBRTt3QkFDUCxTQUFTLEVBQUUsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUM7d0JBQ3pDLFFBQVEsRUFBRSxHQUFHLFdBQVcsb0JBQW9CO3dCQUM1QyxtQkFBbUI7d0JBQ25CLE1BQU0sRUFBRSxDQUFDLEdBQUcsVUFBVSxjQUFjLEVBQUUsR0FBRyxVQUFVLFNBQVMsQ0FBQzt3QkFDN0QsTUFBTSxFQUFFLENBQUMsR0FBRyxVQUFVLFdBQVcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUNqRCxPQUFPLEVBQUUsRUFBRTtxQkFDWjtpQkFDRjtTQUNOO0tBQ0YsQ0FBQztJQUVGLE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7WUFDckIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLEdBQUcsT0FBTztTQUNYLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUNELFNBQVMsaUJBQWlCLENBQUMsSUFBWTtJQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3ZELENBQUM7QUFFRCxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7O1FBQzFCLE1BQU0sZUFBZSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sT0FBTyxDQUFDO1FBQ2pELE1BQU0sZ0JBQWdCLEdBQThCLENBQUMsT0FBTyxDQUFDLE9BQU87WUFDbEUsQ0FBQyxDQUFDO2dCQUNFLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDaEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO2dCQUN0QyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7Z0JBQzVCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQjthQUM3QztZQUNILENBQUMsQ0FBQztnQkFDRSxXQUFXLEVBQUUsTUFBQSxPQUFPLENBQUMsV0FBVyxtQ0FBSSxJQUFJO2dCQUN4QyxjQUFjLEVBQUUsTUFBQSxPQUFPLENBQUMsY0FBYyxtQ0FBSSxJQUFJO2dCQUM5QyxTQUFTLEVBQUUsSUFBSTtnQkFDZixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7YUFDN0MsQ0FBQztRQUVOLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSx3QkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sY0FBYyxHQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsY0FBcUMsSUFBSSxFQUFFLENBQUM7UUFDekYsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUM7UUFFcEQsaUVBQWlFO1FBQ2pFLElBQUksVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNyRixJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDNUIsVUFBVSxHQUFHLG9CQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzVDO1FBRUQsTUFBTSxNQUFNLEdBQUcsU0FBUztZQUN0QixDQUFDLENBQUMsSUFBQSxnQkFBUyxFQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsY0FBYyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsR0FBRyxNQUFNLFVBQVUsQ0FBQztRQUV0QyxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDO1lBQ2xELElBQUEsc0JBQVMsRUFDUCxJQUFBLGtCQUFLLEVBQUMsSUFBQSxnQkFBRyxFQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUNwQixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO2dCQUNwRCxJQUFBLDJCQUFjLEVBQUM7b0JBQ2IsS0FBSyxFQUFFLG9CQUFPO29CQUNkLEdBQUcsT0FBTztvQkFDViwyQkFBMkIsRUFBRSxJQUFBLG1DQUEyQixFQUFDLE1BQU0sQ0FBQztvQkFDaEUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJO29CQUNyQixTQUFTO29CQUNULFVBQVU7aUJBQ1gsQ0FBQztnQkFDRixJQUFBLGlCQUFJLEVBQUMsTUFBTSxDQUFDO2FBQ2IsQ0FBQyxFQUNGLDBCQUFhLENBQUMsU0FBUyxDQUN4QjtZQUNELElBQUEsc0JBQVMsRUFBQyxRQUFRLEVBQUU7Z0JBQ2xCLElBQUksRUFBRSxLQUFLO2dCQUNYLFlBQVksRUFBRSxLQUFLO2dCQUNuQixJQUFJLEVBQUUsSUFBSTtnQkFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87Z0JBQ3hCLFlBQVksRUFBRSxNQUFNO2dCQUNwQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUk7YUFDdEIsQ0FBQztZQUNGLElBQUEsc0JBQVMsRUFBQyxXQUFXLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxLQUFLO2dCQUNYLFFBQVEsRUFBRSxlQUFlO2dCQUN6QixJQUFJLEVBQUUsSUFBSTtnQkFDVixJQUFJLEVBQUUsU0FBUztnQkFDZixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUNyQixHQUFHLGdCQUFnQjthQUNwQixDQUFDO1lBQ0YsSUFBQSxzQkFBUyxFQUNQLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsZUFBZSxDQUFDLEVBQUU7Z0JBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRSxDQUFDLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyx3QkFBd0IsQ0FBQztnQkFDN0UsZ0JBQWdCLENBQUMsY0FBYztvQkFDN0IsQ0FBQyxDQUFDLElBQUEsbUJBQU0sRUFBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQ3BELENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7Z0JBQ1YsZ0JBQWdCLENBQUMsU0FBUztvQkFDeEIsQ0FBQyxDQUFDLElBQUEsbUJBQU0sRUFBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7b0JBQ3ZELENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7Z0JBQ1YsSUFBQSwyQkFBYyxFQUFDO29CQUNiLEtBQUssRUFBRSxvQkFBTztvQkFDZCxHQUFHLE9BQU87b0JBQ1YsUUFBUSxFQUFFLGVBQWU7b0JBQ3pCLEdBQUcsZ0JBQWdCO2lCQUNwQixDQUFDO2dCQUNGLElBQUEsaUJBQUksRUFBQyxTQUFTLENBQUM7YUFDaEIsQ0FBQyxFQUNGLDBCQUFhLENBQUMsU0FBUyxDQUN4QjtZQUNELE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRSxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7U0FDekUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTNGRCw0QkEyRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvbk9iamVjdCwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgTWVyZ2VTdHJhdGVneSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbXBvbmVudE9wdGlvbnMgfSBmcm9tICcuLi9jb21wb25lbnQvc2NoZW1hJztcbmltcG9ydCB7IE5vZGVEZXBlbmRlbmN5VHlwZSwgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFByb2plY3RUeXBlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMsIFN0eWxlIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgIG5hbWU6ICdAYW5ndWxhci9jb21waWxlci1jbGknLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5Bbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgbmFtZTogJ3R5cGVzY3JpcHQnLFxuICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1sndHlwZXNjcmlwdCddLFxuICAgICAgfSxcbiAgICBdLmZvckVhY2goKGRlcGVuZGVuY3kpID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKFxuICBvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIGFwcERpcjogc3RyaW5nLFxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXG4pOiBSdWxlIHtcbiAgbGV0IHByb2plY3RSb290ID0gYXBwRGlyO1xuICBpZiAocHJvamVjdFJvb3QpIHtcbiAgICBwcm9qZWN0Um9vdCArPSAnLyc7XG4gIH1cblxuICBjb25zdCBzY2hlbWF0aWNzOiBKc29uT2JqZWN0ID0ge307XG5cbiAgaWYgKFxuICAgIG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgfHxcbiAgICBvcHRpb25zLmlubGluZVN0eWxlIHx8XG4gICAgb3B0aW9ucy5taW5pbWFsIHx8XG4gICAgb3B0aW9ucy5zdHlsZSAhPT0gU3R5bGUuQ3NzXG4gICkge1xuICAgIGNvbnN0IGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zOiBKc29uT2JqZWN0ID0ge307XG4gICAgaWYgKG9wdGlvbnMuaW5saW5lVGVtcGxhdGUgPz8gb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgICBjb21wb25lbnRTY2hlbWF0aWNzT3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLmlubGluZVN0eWxlID8/IG9wdGlvbnMubWluaW1hbCkge1xuICAgICAgY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnMuaW5saW5lU3R5bGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5zdHlsZSAmJiBvcHRpb25zLnN0eWxlICE9PSBTdHlsZS5Dc3MpIHtcbiAgICAgIGNvbXBvbmVudFNjaGVtYXRpY3NPcHRpb25zLnN0eWxlID0gb3B0aW9ucy5zdHlsZTtcbiAgICB9XG5cbiAgICBzY2hlbWF0aWNzWydAc2NoZW1hdGljcy9hbmd1bGFyOmNvbXBvbmVudCddID0gY29tcG9uZW50U2NoZW1hdGljc09wdGlvbnM7XG4gIH1cblxuICBpZiAob3B0aW9ucy5za2lwVGVzdHMgfHwgb3B0aW9ucy5taW5pbWFsKSB7XG4gICAgY29uc3Qgc2NoZW1hdGljc1dpdGhUZXN0cyA9IFtcbiAgICAgICdjbGFzcycsXG4gICAgICAnY29tcG9uZW50JyxcbiAgICAgICdkaXJlY3RpdmUnLFxuICAgICAgJ2d1YXJkJyxcbiAgICAgICdpbnRlcmNlcHRvcicsXG4gICAgICAncGlwZScsXG4gICAgICAncmVzb2x2ZXInLFxuICAgICAgJ3NlcnZpY2UnLFxuICAgIF07XG5cbiAgICBzY2hlbWF0aWNzV2l0aFRlc3RzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgIGlmICghKGBAc2NoZW1hdGljcy9hbmd1bGFyOiR7dHlwZX1gIGluIHNjaGVtYXRpY3MpKSB7XG4gICAgICAgIHNjaGVtYXRpY3NbYEBzY2hlbWF0aWNzL2FuZ3VsYXI6JHt0eXBlfWBdID0ge307XG4gICAgICB9XG4gICAgICAoc2NoZW1hdGljc1tgQHNjaGVtYXRpY3MvYW5ndWxhcjoke3R5cGV9YF0gYXMgSnNvbk9iamVjdCkuc2tpcFRlc3RzID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHNvdXJjZVJvb3QgPSBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzcmMnKTtcbiAgbGV0IGJ1ZGdldHMgPSBbXTtcbiAgaWYgKG9wdGlvbnMuc3RyaWN0KSB7XG4gICAgYnVkZ2V0cyA9IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2luaXRpYWwnLFxuICAgICAgICBtYXhpbXVtV2FybmluZzogJzUwMGtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnMW1iJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdhbnlDb21wb25lbnRTdHlsZScsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnMmtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnNGtiJyxcbiAgICAgIH0sXG4gICAgXTtcbiAgfSBlbHNlIHtcbiAgICBidWRnZXRzID0gW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnaW5pdGlhbCcsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnMm1iJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnNW1iJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdhbnlDb21wb25lbnRTdHlsZScsXG4gICAgICAgIG1heGltdW1XYXJuaW5nOiAnNmtiJyxcbiAgICAgICAgbWF4aW11bUVycm9yOiAnMTBrYicsXG4gICAgICB9LFxuICAgIF07XG4gIH1cblxuICBjb25zdCBpbmxpbmVTdHlsZUxhbmd1YWdlID0gb3B0aW9ucz8uc3R5bGUgIT09IFN0eWxlLkNzcyA/IG9wdGlvbnMuc3R5bGUgOiB1bmRlZmluZWQ7XG5cbiAgY29uc3QgcHJvamVjdCA9IHtcbiAgICByb290OiBub3JtYWxpemUocHJvamVjdFJvb3QpLFxuICAgIHNvdXJjZVJvb3QsXG4gICAgcHJvamVjdFR5cGU6IFByb2plY3RUeXBlLkFwcGxpY2F0aW9uLFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXggfHwgJ2FwcCcsXG4gICAgc2NoZW1hdGljcyxcbiAgICB0YXJnZXRzOiB7XG4gICAgICBidWlsZDoge1xuICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Ccm93c2VyLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ3Byb2R1Y3Rpb24nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtmb2xkZXJOYW1lfWAsXG4gICAgICAgICAgaW5kZXg6IGAke3NvdXJjZVJvb3R9L2luZGV4Lmh0bWxgLFxuICAgICAgICAgIG1haW46IGAke3NvdXJjZVJvb3R9L21haW4udHNgLFxuICAgICAgICAgIHBvbHlmaWxsczogWyd6b25lLmpzJ10sXG4gICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fXRzY29uZmlnLmFwcC5qc29uYCxcbiAgICAgICAgICBpbmxpbmVTdHlsZUxhbmd1YWdlLFxuICAgICAgICAgIGFzc2V0czogW2Ake3NvdXJjZVJvb3R9L2Zhdmljb24uaWNvYCwgYCR7c291cmNlUm9vdH0vYXNzZXRzYF0sXG4gICAgICAgICAgc3R5bGVzOiBbYCR7c291cmNlUm9vdH0vc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gXSxcbiAgICAgICAgICBzY3JpcHRzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICBidWRnZXRzLFxuICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IGZhbHNlLFxuICAgICAgICAgICAgb3B0aW1pemF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHZlbmRvckNodW5rOiB0cnVlLFxuICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiBmYWxzZSxcbiAgICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VydmU6IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuRGV2U2VydmVyLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ2RldmVsb3BtZW50JyxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLm5hbWV9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgICdleHRyYWN0LWkxOG4nOiB7XG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkV4dHJhY3RJMThuLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7b3B0aW9ucy5uYW1lfTpidWlsZGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdGVzdDogb3B0aW9ucy5taW5pbWFsXG4gICAgICAgID8gdW5kZWZpbmVkXG4gICAgICAgIDoge1xuICAgICAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuS2FybWEsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgIHBvbHlmaWxsczogWyd6b25lLmpzJywgJ3pvbmUuanMvdGVzdGluZyddLFxuICAgICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuc3BlYy5qc29uYCxcbiAgICAgICAgICAgICAgaW5saW5lU3R5bGVMYW5ndWFnZSxcbiAgICAgICAgICAgICAgYXNzZXRzOiBbYCR7c291cmNlUm9vdH0vZmF2aWNvbi5pY29gLCBgJHtzb3VyY2VSb290fS9hc3NldHNgXSxcbiAgICAgICAgICAgICAgc3R5bGVzOiBbYCR7c291cmNlUm9vdH0vc3R5bGVzLiR7b3B0aW9ucy5zdHlsZX1gXSxcbiAgICAgICAgICAgICAgc2NyaXB0czogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICB3b3Jrc3BhY2UucHJvamVjdHMuYWRkKHtcbiAgICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICAgIC4uLnByb2plY3QsXG4gICAgfSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gbWluaW1hbFBhdGhGaWx0ZXIocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhcGF0aC5lbmRzV2l0aCgndHNjb25maWcuc3BlYy5qc29uLnRlbXBsYXRlJyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUm9vdFNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXh9LXJvb3RgO1xuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IFBhcnRpYWw8Q29tcG9uZW50T3B0aW9ucz4gPSAhb3B0aW9ucy5taW5pbWFsXG4gICAgICA/IHtcbiAgICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICAgICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgICBza2lwVGVzdHM6IG9wdGlvbnMuc2tpcFRlc3RzLFxuICAgICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgICB9XG4gICAgICA6IHtcbiAgICAgICAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSA/PyB0cnVlLFxuICAgICAgICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlID8/IHRydWUsXG4gICAgICAgICAgc2tpcFRlc3RzOiB0cnVlLFxuICAgICAgICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgICAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgICB9O1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IG5ld1Byb2plY3RSb290ID0gKHdvcmtzcGFjZS5leHRlbnNpb25zLm5ld1Byb2plY3RSb290IGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgJyc7XG4gICAgY29uc3QgaXNSb290QXBwID0gb3B0aW9ucy5wcm9qZWN0Um9vdCAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gSWYgc2NvcGVkIHByb2plY3QgKGkuZS4gXCJAZm9vL2JhclwiKSwgY29udmVydCBkaXIgdG8gXCJmb28vYmFyXCIuXG4gICAgbGV0IGZvbGRlck5hbWUgPSBvcHRpb25zLm5hbWUuc3RhcnRzV2l0aCgnQCcpID8gb3B0aW9ucy5uYW1lLnNsaWNlKDEpIDogb3B0aW9ucy5uYW1lO1xuICAgIGlmICgvW0EtWl0vLnRlc3QoZm9sZGVyTmFtZSkpIHtcbiAgICAgIGZvbGRlck5hbWUgPSBzdHJpbmdzLmRhc2hlcml6ZShmb2xkZXJOYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcHBEaXIgPSBpc1Jvb3RBcHBcbiAgICAgID8gbm9ybWFsaXplKG9wdGlvbnMucHJvamVjdFJvb3QgfHwgJycpXG4gICAgICA6IGpvaW4obm9ybWFsaXplKG5ld1Byb2plY3RSb290KSwgZm9sZGVyTmFtZSk7XG4gICAgY29uc3Qgc291cmNlRGlyID0gYCR7YXBwRGlyfS9zcmMvYXBwYDtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgYXBwRGlyLCBmb2xkZXJOYW1lKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBvcHRpb25zLm1pbmltYWwgPyBmaWx0ZXIobWluaW1hbFBhdGhGaWx0ZXIpIDogbm9vcCgpLFxuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KGFwcERpciksXG4gICAgICAgICAgICBhcHBOYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICAgICAgICBpc1Jvb3RBcHAsXG4gICAgICAgICAgICBmb2xkZXJOYW1lLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSksXG4gICAgICAgIE1lcmdlU3RyYXRlZ3kuT3ZlcndyaXRlLFxuICAgICAgKSxcbiAgICAgIHNjaGVtYXRpYygnbW9kdWxlJywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgY29tbW9uTW9kdWxlOiBmYWxzZSxcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgICByb3V0aW5nU2NvcGU6ICdSb290JyxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICB9KSxcbiAgICAgIHNjaGVtYXRpYygnY29tcG9uZW50Jywge1xuICAgICAgICBuYW1lOiAnYXBwJyxcbiAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgZmxhdDogdHJ1ZSxcbiAgICAgICAgcGF0aDogc291cmNlRGlyLFxuICAgICAgICBza2lwSW1wb3J0OiB0cnVlLFxuICAgICAgICBwcm9qZWN0OiBvcHRpb25zLm5hbWUsXG4gICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL290aGVyLWZpbGVzJyksIFtcbiAgICAgICAgICBvcHRpb25zLnN0cmljdCA/IG5vb3AoKSA6IGZpbHRlcigocGF0aCkgPT4gcGF0aCAhPT0gJy9wYWNrYWdlLmpzb24udGVtcGxhdGUnKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLmlubGluZVRlbXBsYXRlXG4gICAgICAgICAgICA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpXG4gICAgICAgICAgICA6IG5vb3AoKSxcbiAgICAgICAgICBjb21wb25lbnRPcHRpb25zLnNraXBUZXN0c1xuICAgICAgICAgICAgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKVxuICAgICAgICAgICAgOiBub29wKCksXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgc2VsZWN0b3I6IGFwcFJvb3RTZWxlY3RvcixcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudE9wdGlvbnMsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShzb3VyY2VEaXIpLFxuICAgICAgICBdKSxcbiAgICAgICAgTWVyZ2VTdHJhdGVneS5PdmVyd3JpdGUsXG4gICAgICApLFxuICAgICAgb3B0aW9ucy5za2lwUGFja2FnZUpzb24gPyBub29wKCkgOiBhZGREZXBlbmRlbmNpZXNUb1BhY2thZ2VKc29uKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuIl19