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
const latest_versions_1 = require("../../utility/latest-versions");
const defaults = {
    appRoot: 'src',
    index: 'index.html',
    main: 'main.ts',
    polyfills: 'polyfills.ts',
    tsConfig: 'tsconfig.app.json',
    test: 'test.ts',
    outDir: 'dist/',
    karma: 'karma.conf.js',
    protractor: 'protractor.conf.js',
    testTsConfig: 'tsconfig.spec.json',
    serverOutDir: 'dist-server',
    serverMain: 'main.server.ts',
    serverTsConfig: 'tsconfig.server.json',
};
function getConfigPath(tree) {
    let possiblePath = core_1.normalize('.angular-cli.json');
    if (tree.exists(possiblePath)) {
        return possiblePath;
    }
    possiblePath = core_1.normalize('angular-cli.json');
    if (tree.exists(possiblePath)) {
        return possiblePath;
    }
    throw new schematics_1.SchematicsException('Could not find configuration file');
}
function migrateKarmaConfiguration(config) {
    return (host, context) => {
        context.logger.info(`Updating karma configuration`);
        try {
            const karmaPath = config && config.test && config.test.karma && config.test.karma.config
                ? config.test.karma.config
                : defaults.karma;
            const buffer = host.read(karmaPath);
            if (buffer !== null) {
                let content = buffer.toString();
                content = content.replace(/@angular\/cli/g, '@angular-devkit/build-angular');
                content = content.replace('reports', `dir: require('path').join(__dirname, 'coverage'), reports`);
                host.overwrite(karmaPath, content);
            }
        }
        catch (e) { }
        return host;
    };
}
function migrateConfiguration(oldConfig) {
    return (host, context) => {
        const oldConfigPath = getConfigPath(host);
        const configPath = core_1.normalize('angular.json');
        context.logger.info(`Updating configuration`);
        const config = {
            '$schema': './node_modules/@angular/cli/lib/config/schema.json',
            version: 1,
            newProjectRoot: 'projects',
            projects: extractProjectsConfig(oldConfig, host),
        };
        const cliConfig = extractCliConfig(oldConfig);
        if (cliConfig !== null) {
            config.cli = cliConfig;
        }
        const schematicsConfig = extractSchematicsConfig(oldConfig);
        if (schematicsConfig !== null) {
            config.schematics = schematicsConfig;
        }
        const architectConfig = extractArchitectConfig(oldConfig);
        if (architectConfig !== null) {
            config.architect = architectConfig;
        }
        context.logger.info(`Removing old config file (${oldConfigPath})`);
        host.delete(oldConfigPath);
        context.logger.info(`Writing config file (${configPath})`);
        host.create(configPath, JSON.stringify(config, null, 2));
        return host;
    };
}
function extractCliConfig(config) {
    const newConfig = {};
    if (config.packageManager && config.packageManager !== 'default') {
        newConfig['packageManager'] = config.packageManager;
    }
    return newConfig;
}
function extractSchematicsConfig(config) {
    let collectionName = '@schematics/angular';
    if (!config || !config.defaults) {
        return null;
    }
    // const configDefaults = config.defaults;
    if (config.defaults && config.defaults.schematics && config.defaults.schematics.collection) {
        collectionName = config.defaults.schematics.collection;
    }
    /**
     * For each schematic
     *  - get the config
     *  - filter one's without config
     *  - combine them into an object
     */
    // tslint:disable-next-line:no-any
    const schematicConfigs = ['class', 'component', 'directive', 'guard',
        'interface', 'module', 'pipe', 'service']
        .map(schematicName => {
        // tslint:disable-next-line:no-any
        const schematicDefaults = config.defaults[schematicName] || null;
        return {
            schematicName,
            config: schematicDefaults,
        };
    })
        .filter(schematic => schematic.config !== null)
        .reduce((all, schematic) => {
        all[collectionName + ':' + schematic.schematicName] = schematic.config;
        return all;
    }, {});
    const componentUpdate = {};
    componentUpdate.prefix = '';
    const componentKey = collectionName + ':component';
    const directiveKey = collectionName + ':directive';
    if (!schematicConfigs[componentKey]) {
        schematicConfigs[componentKey] = {};
    }
    if (!schematicConfigs[directiveKey]) {
        schematicConfigs[directiveKey] = {};
    }
    if (config.apps && config.apps[0]) {
        schematicConfigs[componentKey].prefix = config.apps[0].prefix;
        schematicConfigs[directiveKey].prefix = config.apps[0].prefix;
    }
    if (config.defaults) {
        schematicConfigs[componentKey].styleext = config.defaults.styleExt;
    }
    return schematicConfigs;
}
function extractArchitectConfig(_config) {
    return null;
}
function extractProjectsConfig(config, tree) {
    const builderPackage = '@angular-devkit/build-angular';
    let defaultAppNamePrefix = 'app';
    if (config.project && config.project.name) {
        defaultAppNamePrefix = config.project.name;
    }
    const buildDefaults = config.defaults && config.defaults.build
        ? {
            sourceMap: config.defaults.build.sourcemaps,
            progress: config.defaults.build.progress,
            poll: config.defaults.build.poll,
            deleteOutputPath: config.defaults.build.deleteOutputPath,
            preserveSymlinks: config.defaults.build.preserveSymlinks,
            showCircularDependencies: config.defaults.build.showCircularDependencies,
            commonChunk: config.defaults.build.commonChunk,
            namedChunks: config.defaults.build.namedChunks,
        }
        : {};
    const serveDefaults = config.defaults && config.defaults.serve
        ? {
            port: config.defaults.serve.port,
            host: config.defaults.serve.host,
            ssl: config.defaults.serve.ssl,
            sslKey: config.defaults.serve.sslKey,
            sslCert: config.defaults.serve.sslCert,
            proxyConfig: config.defaults.serve.proxyConfig,
        }
        : {};
    const apps = config.apps || [];
    // convert the apps to projects
    const browserApps = apps.filter(app => app.platform !== 'server');
    const serverApps = apps.filter(app => app.platform === 'server');
    const projectMap = browserApps
        .map((app, idx) => {
        const defaultAppName = idx === 0 ? defaultAppNamePrefix : `${defaultAppNamePrefix}${idx}`;
        const name = app.name || defaultAppName;
        const outDir = app.outDir || defaults.outDir;
        const appRoot = app.root || defaults.appRoot;
        function _mapAssets(asset) {
            if (typeof asset === 'string') {
                return core_1.normalize(appRoot + '/' + asset);
            }
            else {
                if (asset.output) {
                    return {
                        glob: asset.glob,
                        input: core_1.normalize(appRoot + '/' + asset.input),
                        output: core_1.normalize('/' + asset.output),
                    };
                }
                else {
                    return {
                        glob: asset.glob,
                        input: core_1.normalize(appRoot + '/' + asset.input),
                        output: '/',
                    };
                }
            }
        }
        function _buildConfigurations() {
            const source = app.environmentSource;
            const environments = app.environments;
            const serviceWorker = app.serviceWorker;
            if (!environments) {
                return {};
            }
            return Object.keys(environments).reduce((acc, environment) => {
                if (source === environments[environment]) {
                    return acc;
                }
                let isProduction = false;
                const environmentContent = tree.read(app.root + '/' + environments[environment]);
                if (environmentContent) {
                    isProduction = !!environmentContent.toString('utf-8')
                        .match(/production['"]?\s*[:=]\s*true/);
                }
                let configurationName;
                // We used to use `prod` by default as the key, instead we now use the full word.
                // Try not to override the production key if it's there.
                if (environment == 'prod' && !environments['production'] && isProduction) {
                    configurationName = 'production';
                }
                else {
                    configurationName = environment;
                }
                let swConfig = null;
                if (serviceWorker) {
                    swConfig = {
                        serviceWorker: true,
                        ngswConfigPath: '/src/ngsw-config.json',
                    };
                }
                acc[configurationName] = Object.assign({}, (isProduction
                    ? {
                        optimization: true,
                        outputHashing: 'all',
                        sourceMap: false,
                        extractCss: true,
                        namedChunks: false,
                        aot: true,
                        extractLicenses: true,
                        vendorChunk: false,
                        buildOptimizer: true,
                    }
                    : {}), (isProduction && swConfig ? swConfig : {}), { fileReplacements: [
                        {
                            replace: `${app.root}/${source}`,
                            with: `${app.root}/${environments[environment]}`,
                        },
                    ] });
                return acc;
            }, {});
        }
        function _serveConfigurations() {
            const environments = app.environments;
            if (!environments) {
                return {};
            }
            if (!architect) {
                throw new Error();
            }
            const configurations = architect.build.configurations;
            return Object.keys(configurations).reduce((acc, environment) => {
                acc[environment] = { browserTarget: `${name}:build:${environment}` };
                return acc;
            }, {});
        }
        function _extraEntryMapper(extraEntry) {
            let entry;
            if (typeof extraEntry === 'string') {
                entry = core_1.join(app.root, extraEntry);
            }
            else {
                const input = core_1.join(app.root, extraEntry.input || '');
                entry = { input, lazy: extraEntry.lazy };
                if (extraEntry.output) {
                    entry.bundleName = extraEntry.output;
                }
            }
            return entry;
        }
        const project = {
            root: '',
            sourceRoot: 'src',
            projectType: 'application',
        };
        const architect = {};
        project.architect = architect;
        // Browser target
        const buildOptions = Object.assign({ 
            // Make outputPath relative to root.
            outputPath: outDir, index: `${appRoot}/${app.index || defaults.index}`, main: `${appRoot}/${app.main || defaults.main}`, tsConfig: `${appRoot}/${app.tsconfig || defaults.tsConfig}` }, buildDefaults);
        if (app.polyfills) {
            buildOptions.polyfills = appRoot + '/' + app.polyfills;
        }
        if (app.stylePreprocessorOptions
            && app.stylePreprocessorOptions.includePaths
            && Array.isArray(app.stylePreprocessorOptions.includePaths)
            && app.stylePreprocessorOptions.includePaths.length > 0) {
            buildOptions.stylePreprocessorOptions = {
                includePaths: app.stylePreprocessorOptions.includePaths
                    .map(includePath => core_1.join(app.root, includePath)),
            };
        }
        buildOptions.assets = (app.assets || []).map(_mapAssets);
        buildOptions.styles = (app.styles || []).map(_extraEntryMapper);
        buildOptions.scripts = (app.scripts || []).map(_extraEntryMapper);
        architect.build = {
            builder: `${builderPackage}:browser`,
            options: buildOptions,
            configurations: _buildConfigurations(),
        };
        // Serve target
        const serveOptions = Object.assign({ browserTarget: `${name}:build` }, serveDefaults);
        architect.serve = {
            builder: `${builderPackage}:dev-server`,
            options: serveOptions,
            configurations: _serveConfigurations(),
        };
        // Extract target
        const extractI18nOptions = { browserTarget: `${name}:build` };
        architect['extract-i18n'] = {
            builder: `${builderPackage}:extract-i18n`,
            options: extractI18nOptions,
        };
        const karmaConfig = config.test && config.test.karma
            ? config.test.karma.config || ''
            : '';
        // Test target
        const testOptions = {
            main: appRoot + '/' + app.test || defaults.test,
            // Make karmaConfig relative to root.
            karmaConfig,
        };
        if (app.polyfills) {
            testOptions.polyfills = appRoot + '/' + app.polyfills;
        }
        if (app.testTsconfig) {
            testOptions.tsConfig = appRoot + '/' + app.testTsconfig;
        }
        testOptions.scripts = (app.scripts || []).map(_extraEntryMapper);
        testOptions.styles = (app.styles || []).map(_extraEntryMapper);
        testOptions.assets = (app.assets || []).map(_mapAssets);
        if (karmaConfig) {
            architect.test = {
                builder: `${builderPackage}:karma`,
                options: testOptions,
            };
        }
        const tsConfigs = [];
        const excludes = [];
        if (config && config.lint && Array.isArray(config.lint)) {
            config.lint.forEach(lint => {
                tsConfigs.push(lint.project);
                if (lint.exclude) {
                    if (typeof lint.exclude === 'string') {
                        excludes.push(lint.exclude);
                    }
                    else {
                        lint.exclude.forEach(ex => excludes.push(ex));
                    }
                }
            });
        }
        const removeDupes = (items) => items.reduce((newItems, item) => {
            if (newItems.indexOf(item) === -1) {
                newItems.push(item);
            }
            return newItems;
        }, []);
        // Tslint target
        const lintOptions = {
            tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') === -1),
            exclude: removeDupes(excludes),
        };
        architect.lint = {
            builder: `${builderPackage}:tslint`,
            options: lintOptions,
        };
        // server target
        const serverApp = serverApps
            .filter(serverApp => app.root === serverApp.root && app.index === serverApp.index)[0];
        if (serverApp) {
            const serverOptions = {
                outputPath: serverApp.outDir || defaults.serverOutDir,
                main: serverApp.main || defaults.serverMain,
                tsConfig: serverApp.tsconfig || defaults.serverTsConfig,
            };
            const serverTarget = {
                builder: '@angular-devkit/build-angular:server',
                options: serverOptions,
            };
            architect.server = serverTarget;
        }
        const e2eProject = {
            root: project.root,
            sourceRoot: project.root,
            projectType: 'application',
            cli: {},
            schematics: {},
        };
        const e2eArchitect = {};
        // tslint:disable-next-line:max-line-length
        const protractorConfig = config && config.e2e && config.e2e.protractor && config.e2e.protractor.config
            ? config.e2e.protractor.config
            : '';
        const e2eOptions = {
            protractorConfig: protractorConfig,
            devServerTarget: `${name}:serve`,
        };
        const e2eTarget = {
            builder: `${builderPackage}:protractor`,
            options: e2eOptions,
        };
        e2eArchitect.e2e = e2eTarget;
        const e2eLintOptions = {
            tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') !== -1),
            exclude: removeDupes(excludes),
        };
        const e2eLintTarget = {
            builder: `${builderPackage}:tslint`,
            options: e2eLintOptions,
        };
        e2eArchitect.lint = e2eLintTarget;
        if (protractorConfig) {
            e2eProject.architect = e2eArchitect;
        }
        return { name, project, e2eProject };
    })
        .reduce((projects, mappedApp) => {
        const { name, project, e2eProject } = mappedApp;
        projects[name] = project;
        projects[name + '-e2e'] = e2eProject;
        return projects;
    }, {});
    return projectMap;
}
function updateSpecTsConfig(config) {
    return (host, context) => {
        const apps = config.apps || [];
        apps.forEach((app, idx) => {
            const tsSpecConfigPath = core_1.join(app.root, app.testTsconfig || defaults.testTsConfig);
            const buffer = host.read(tsSpecConfigPath);
            if (!buffer) {
                return;
            }
            const tsCfg = JSON.parse(buffer.toString());
            if (!tsCfg.files) {
                tsCfg.files = [];
            }
            // Ensure the spec tsconfig contains the polyfills file
            if (tsCfg.files.indexOf(app.polyfills || defaults.polyfills) === -1) {
                tsCfg.files.push(app.polyfills || defaults.polyfills);
                host.overwrite(tsSpecConfigPath, JSON.stringify(tsCfg, null, 2));
            }
        });
    };
}
function updatePackageJson(packageManager) {
    return (host, context) => {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer == null) {
            throw new schematics_1.SchematicsException('Could not read package.json');
        }
        const content = buffer.toString();
        const pkg = JSON.parse(content);
        if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
            throw new schematics_1.SchematicsException('Error reading package.json');
        }
        if (!pkg.devDependencies) {
            pkg.devDependencies = {};
        }
        pkg.devDependencies['@angular-devkit/build-angular'] = latest_versions_1.latestVersions.DevkitBuildAngular;
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
        if (packageManager && !['npm', 'yarn', 'cnpm'].includes(packageManager)) {
            packageManager = undefined;
        }
        context.addTask(new tasks_1.NodePackageInstallTask({ packageManager }));
        return host;
    };
}
function updateTsLintConfig() {
    return (host, context) => {
        const tsLintPath = '/tslint.json';
        const buffer = host.read(tsLintPath);
        if (!buffer) {
            return;
        }
        const tsCfg = JSON.parse(buffer.toString());
        if (tsCfg.rules && tsCfg.rules['import-blacklist'] &&
            tsCfg.rules['import-blacklist'].indexOf('rxjs') !== -1) {
            tsCfg.rules['import-blacklist'] = tsCfg.rules['import-blacklist']
                .filter((rule) => rule !== 'rxjs');
            host.overwrite(tsLintPath, JSON.stringify(tsCfg, null, 2));
        }
        return host;
    };
}
function default_1() {
    return (host, context) => {
        if (host.exists('/.angular.json') || host.exists('/angular.json')) {
            context.logger.info('Found a modern configuration file. Nothing to be done.');
            return host;
        }
        const configPath = getConfigPath(host);
        const configBuffer = host.read(core_1.normalize(configPath));
        if (configBuffer == null) {
            throw new schematics_1.SchematicsException(`Could not find configuration file (${configPath})`);
        }
        const config = JSON.parse(configBuffer.toString());
        return schematics_1.chain([
            migrateKarmaConfiguration(config),
            migrateConfiguration(config),
            updateSpecTsConfig(config),
            updatePackageJson(config.packageManager),
            updateTsLintConfig(),
            (host, context) => {
                context.logger.warn(core_1.tags.oneLine `Some configuration options have been changed,
          please make sure to update any npm scripts which you may have modified.`);
                return host;
            },
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQStFO0FBQy9FLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsbUVBQStEO0FBRS9ELE1BQU0sUUFBUSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxLQUFLLEVBQUUsWUFBWTtJQUNuQixJQUFJLEVBQUUsU0FBUztJQUNmLFNBQVMsRUFBRSxjQUFjO0lBQ3pCLFFBQVEsRUFBRSxtQkFBbUI7SUFDN0IsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLEVBQUUsT0FBTztJQUNmLEtBQUssRUFBRSxlQUFlO0lBQ3RCLFVBQVUsRUFBRSxvQkFBb0I7SUFDaEMsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyxZQUFZLEVBQUUsYUFBYTtJQUMzQixVQUFVLEVBQUUsZ0JBQWdCO0lBQzVCLGNBQWMsRUFBRSxzQkFBc0I7Q0FDdkMsQ0FBQztBQUVGLHVCQUF1QixJQUFVO0lBQy9CLElBQUksWUFBWSxHQUFHLGdCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNsRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxtQ0FB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Q0FBQztRQUNyRixDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsa0JBQUssQ0FBQztZQUNYLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztZQUNqQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUM7WUFDNUIsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1lBQzFCLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7WUFDeEMsa0JBQWtCLEVBQUU7WUFDcEIsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO2dCQUN4QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBO2tGQUMwQyxDQUFDLENBQUM7Z0JBRTVFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDO1NBQ0YsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7QUFDSixDQUFDO0FBN0JELDRCQTZCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IEpzb25PYmplY3QsIFBhdGgsIGpvaW4sIG5vcm1hbGl6ZSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBDbGlDb25maWcgfSBmcm9tICcuLi8uLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcblxuY29uc3QgZGVmYXVsdHMgPSB7XG4gIGFwcFJvb3Q6ICdzcmMnLFxuICBpbmRleDogJ2luZGV4Lmh0bWwnLFxuICBtYWluOiAnbWFpbi50cycsXG4gIHBvbHlmaWxsczogJ3BvbHlmaWxscy50cycsXG4gIHRzQ29uZmlnOiAndHNjb25maWcuYXBwLmpzb24nLFxuICB0ZXN0OiAndGVzdC50cycsXG4gIG91dERpcjogJ2Rpc3QvJyxcbiAga2FybWE6ICdrYXJtYS5jb25mLmpzJyxcbiAgcHJvdHJhY3RvcjogJ3Byb3RyYWN0b3IuY29uZi5qcycsXG4gIHRlc3RUc0NvbmZpZzogJ3RzY29uZmlnLnNwZWMuanNvbicsXG4gIHNlcnZlck91dERpcjogJ2Rpc3Qtc2VydmVyJyxcbiAgc2VydmVyTWFpbjogJ21haW4uc2VydmVyLnRzJyxcbiAgc2VydmVyVHNDb25maWc6ICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicsXG59O1xuXG5mdW5jdGlvbiBnZXRDb25maWdQYXRoKHRyZWU6IFRyZWUpOiBQYXRoIHtcbiAgbGV0IHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnLmFuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG4gIHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cblxuICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlJyk7XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcga2FybWEgY29uZmlndXJhdGlvbmApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBrYXJtYVBhdGggPSBjb25maWcgJiYgY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWEgJiYgY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgIDogZGVmYXVsdHMua2FybWE7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQoa2FybWFQYXRoKTtcbiAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSggL0Bhbmd1bGFyXFwvY2xpL2csICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCdyZXBvcnRzJyxcbiAgICAgICAgICBgZGlyOiByZXF1aXJlKCdwYXRoJykuam9pbihfX2Rpcm5hbWUsICdjb3ZlcmFnZScpLCByZXBvcnRzYCk7XG4gICAgICAgIGhvc3Qub3ZlcndyaXRlKGthcm1hUGF0aCwgY29udGVudCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkgeyB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUNvbmZpZ3VyYXRpb24ob2xkQ29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgb2xkQ29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci5qc29uJyk7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcgY29uZmlndXJhdGlvbmApO1xuICAgIGNvbnN0IGNvbmZpZzogSnNvbk9iamVjdCA9IHtcbiAgICAgICckc2NoZW1hJzogJy4vbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS9saWIvY29uZmlnL3NjaGVtYS5qc29uJyxcbiAgICAgIHZlcnNpb246IDEsXG4gICAgICBuZXdQcm9qZWN0Um9vdDogJ3Byb2plY3RzJyxcbiAgICAgIHByb2plY3RzOiBleHRyYWN0UHJvamVjdHNDb25maWcob2xkQ29uZmlnLCBob3N0KSxcbiAgICB9O1xuICAgIGNvbnN0IGNsaUNvbmZpZyA9IGV4dHJhY3RDbGlDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoY2xpQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuY2xpID0gY2xpQ29uZmlnO1xuICAgIH1cbiAgICBjb25zdCBzY2hlbWF0aWNzQ29uZmlnID0gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoc2NoZW1hdGljc0NvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLnNjaGVtYXRpY3MgPSBzY2hlbWF0aWNzQ29uZmlnO1xuICAgIH1cbiAgICBjb25zdCBhcmNoaXRlY3RDb25maWcgPSBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGFyY2hpdGVjdENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmFyY2hpdGVjdCA9IGFyY2hpdGVjdENvbmZpZztcbiAgICB9XG5cbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBSZW1vdmluZyBvbGQgY29uZmlnIGZpbGUgKCR7b2xkQ29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5kZWxldGUob2xkQ29uZmlnUGF0aCk7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgV3JpdGluZyBjb25maWcgZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICBob3N0LmNyZWF0ZShjb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0Q2xpQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICBjb25zdCBuZXdDb25maWc6IEpzb25PYmplY3QgPSB7fTtcbiAgaWYgKGNvbmZpZy5wYWNrYWdlTWFuYWdlciAmJiBjb25maWcucGFja2FnZU1hbmFnZXIgIT09ICdkZWZhdWx0Jykge1xuICAgIG5ld0NvbmZpZ1sncGFja2FnZU1hbmFnZXInXSA9IGNvbmZpZy5wYWNrYWdlTWFuYWdlcjtcbiAgfVxuXG4gIHJldHVybiBuZXdDb25maWc7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICBsZXQgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWcuZGVmYXVsdHMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBjb25zdCBjb25maWdEZWZhdWx0cyA9IGNvbmZpZy5kZWZhdWx0cztcbiAgaWYgKGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcyAmJiBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcy5jb2xsZWN0aW9uKSB7XG4gICAgY29sbGVjdGlvbk5hbWUgPSBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvciBlYWNoIHNjaGVtYXRpY1xuICAgKiAgLSBnZXQgdGhlIGNvbmZpZ1xuICAgKiAgLSBmaWx0ZXIgb25lJ3Mgd2l0aG91dCBjb25maWdcbiAgICogIC0gY29tYmluZSB0aGVtIGludG8gYW4gb2JqZWN0XG4gICAqL1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIGNvbnN0IHNjaGVtYXRpY0NvbmZpZ3M6IGFueSA9IFsnY2xhc3MnLCAnY29tcG9uZW50JywgJ2RpcmVjdGl2ZScsICdndWFyZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaW50ZXJmYWNlJywgJ21vZHVsZScsICdwaXBlJywgJ3NlcnZpY2UnXVxuICAgIC5tYXAoc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICBjb25zdCBzY2hlbWF0aWNEZWZhdWx0czogSnNvbk9iamVjdCA9IChjb25maWcuZGVmYXVsdHMgYXMgYW55KVtzY2hlbWF0aWNOYW1lXSB8fCBudWxsO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb25maWc6IHNjaGVtYXRpY0RlZmF1bHRzLFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoc2NoZW1hdGljID0+IHNjaGVtYXRpYy5jb25maWcgIT09IG51bGwpXG4gICAgLnJlZHVjZSgoYWxsOiBKc29uT2JqZWN0LCBzY2hlbWF0aWMpID0+IHtcbiAgICAgIGFsbFtjb2xsZWN0aW9uTmFtZSArICc6JyArIHNjaGVtYXRpYy5zY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpYy5jb25maWc7XG5cbiAgICAgIHJldHVybiBhbGw7XG4gICAgfSwge30pO1xuXG4gIGNvbnN0IGNvbXBvbmVudFVwZGF0ZTogSnNvbk9iamVjdCA9IHt9O1xuICBjb21wb25lbnRVcGRhdGUucHJlZml4ID0gJyc7XG5cbiAgY29uc3QgY29tcG9uZW50S2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmNvbXBvbmVudCc7XG4gIGNvbnN0IGRpcmVjdGl2ZUtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpkaXJlY3RpdmUnO1xuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XSA9IHt9O1xuICB9XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldID0ge307XG4gIH1cbiAgaWYgKGNvbmZpZy5hcHBzICYmIGNvbmZpZy5hcHBzWzBdKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICB9XG4gIGlmIChjb25maWcuZGVmYXVsdHMpIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0uc3R5bGVleHQgPSBjb25maWcuZGVmYXVsdHMuc3R5bGVFeHQ7XG4gIH1cblxuICByZXR1cm4gc2NoZW1hdGljQ29uZmlncztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhfY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0UHJvamVjdHNDb25maWcoY29uZmlnOiBDbGlDb25maWcsIHRyZWU6IFRyZWUpOiBKc29uT2JqZWN0IHtcbiAgY29uc3QgYnVpbGRlclBhY2thZ2UgPSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuICBsZXQgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSAnYXBwJztcbiAgaWYgKGNvbmZpZy5wcm9qZWN0ICYmIGNvbmZpZy5wcm9qZWN0Lm5hbWUpIHtcbiAgICBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGNvbmZpZy5wcm9qZWN0Lm5hbWU7XG4gIH1cblxuICBjb25zdCBidWlsZERlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5idWlsZFxuICAgID8ge1xuICAgICAgc291cmNlTWFwOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc291cmNlbWFwcyxcbiAgICAgIHByb2dyZXNzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucHJvZ3Jlc3MsXG4gICAgICBwb2xsOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucG9sbCxcbiAgICAgIGRlbGV0ZU91dHB1dFBhdGg6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5kZWxldGVPdXRwdXRQYXRoLFxuICAgICAgcHJlc2VydmVTeW1saW5rczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByZXNlcnZlU3ltbGlua3MsXG4gICAgICBzaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXM6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5zaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXMsXG4gICAgICBjb21tb25DaHVuazogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLmNvbW1vbkNodW5rLFxuICAgICAgbmFtZWRDaHVua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5uYW1lZENodW5rcyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG4gIGNvbnN0IHNlcnZlRGVmYXVsdHM6IEpzb25PYmplY3QgPSBjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNlcnZlXG4gICAgPyB7XG4gICAgICBwb3J0OiBjb25maWcuZGVmYXVsdHMuc2VydmUucG9ydCxcbiAgICAgIGhvc3Q6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5ob3N0LFxuICAgICAgc3NsOiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsLFxuICAgICAgc3NsS2V5OiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsS2V5LFxuICAgICAgc3NsQ2VydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbENlcnQsXG4gICAgICBwcm94eUNvbmZpZzogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnByb3h5Q29uZmlnLFxuICAgIH0gYXMgSnNvbk9iamVjdFxuICAgIDoge307XG5cblxuICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gIC8vIGNvbnZlcnQgdGhlIGFwcHMgdG8gcHJvamVjdHNcbiAgY29uc3QgYnJvd3NlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtICE9PSAnc2VydmVyJyk7XG4gIGNvbnN0IHNlcnZlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtID09PSAnc2VydmVyJyk7XG5cbiAgY29uc3QgcHJvamVjdE1hcCA9IGJyb3dzZXJBcHBzXG4gICAgLm1hcCgoYXBwLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IGRlZmF1bHRBcHBOYW1lID0gaWR4ID09PSAwID8gZGVmYXVsdEFwcE5hbWVQcmVmaXggOiBgJHtkZWZhdWx0QXBwTmFtZVByZWZpeH0ke2lkeH1gO1xuICAgICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lIHx8IGRlZmF1bHRBcHBOYW1lO1xuICAgICAgY29uc3Qgb3V0RGlyID0gYXBwLm91dERpciB8fCBkZWZhdWx0cy5vdXREaXI7XG4gICAgICBjb25zdCBhcHBSb290ID0gYXBwLnJvb3QgfHwgZGVmYXVsdHMuYXBwUm9vdDtcblxuICAgICAgZnVuY3Rpb24gX21hcEFzc2V0cyhhc3NldDogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBpZiAodHlwZW9mIGFzc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoYXNzZXQub3V0cHV0KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogbm9ybWFsaXplKCcvJyArIGFzc2V0Lm91dHB1dCBhcyBzdHJpbmcpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICAgICAgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQuaW5wdXQpLFxuICAgICAgICAgICAgICBvdXRwdXQ6ICcvJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9idWlsZENvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBhcHAuZW52aXJvbm1lbnRTb3VyY2U7XG4gICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IGFwcC5lbnZpcm9ubWVudHM7XG4gICAgICAgIGNvbnN0IHNlcnZpY2VXb3JrZXIgPSBhcHAuc2VydmljZVdvcmtlcjtcblxuICAgICAgICBpZiAoIWVudmlyb25tZW50cykge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhlbnZpcm9ubWVudHMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2UgPT09IGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pIHtcbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGlzUHJvZHVjdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgICAgY29uc3QgZW52aXJvbm1lbnRDb250ZW50ID0gdHJlZS5yZWFkKGFwcC5yb290ICsgJy8nICsgZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSk7XG4gICAgICAgICAgaWYgKGVudmlyb25tZW50Q29udGVudCkge1xuICAgICAgICAgICAgaXNQcm9kdWN0aW9uID0gISFlbnZpcm9ubWVudENvbnRlbnQudG9TdHJpbmcoJ3V0Zi04JylcbiAgICAgICAgICAgICAgLy8gQWxsb3cgZm9yIGBwcm9kdWN0aW9uOiB0cnVlYCBvciBgcHJvZHVjdGlvbiA9IHRydWVgLiBCZXN0IHdlIGNhbiBkbyB0byBndWVzcy5cbiAgICAgICAgICAgICAgLm1hdGNoKC9wcm9kdWN0aW9uWydcIl0/XFxzKls6PV1cXHMqdHJ1ZS8pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBjb25maWd1cmF0aW9uTmFtZTtcbiAgICAgICAgICAvLyBXZSB1c2VkIHRvIHVzZSBgcHJvZGAgYnkgZGVmYXVsdCBhcyB0aGUga2V5LCBpbnN0ZWFkIHdlIG5vdyB1c2UgdGhlIGZ1bGwgd29yZC5cbiAgICAgICAgICAvLyBUcnkgbm90IHRvIG92ZXJyaWRlIHRoZSBwcm9kdWN0aW9uIGtleSBpZiBpdCdzIHRoZXJlLlxuICAgICAgICAgIGlmIChlbnZpcm9ubWVudCA9PSAncHJvZCcgJiYgIWVudmlyb25tZW50c1sncHJvZHVjdGlvbiddICYmIGlzUHJvZHVjdGlvbikge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSAncHJvZHVjdGlvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gZW52aXJvbm1lbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHN3Q29uZmlnOiBKc29uT2JqZWN0IHwgbnVsbCA9IG51bGw7XG4gICAgICAgICAgaWYgKHNlcnZpY2VXb3JrZXIpIHtcbiAgICAgICAgICAgIHN3Q29uZmlnID0ge1xuICAgICAgICAgICAgICBzZXJ2aWNlV29ya2VyOiB0cnVlLFxuICAgICAgICAgICAgICBuZ3N3Q29uZmlnUGF0aDogJy9zcmMvbmdzdy1jb25maWcuanNvbicsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGFjY1tjb25maWd1cmF0aW9uTmFtZV0gPSB7XG4gICAgICAgICAgICAuLi4oaXNQcm9kdWN0aW9uXG4gICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiB0cnVlLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgICksXG4gICAgICAgICAgICAuLi4oaXNQcm9kdWN0aW9uICYmIHN3Q29uZmlnID8gc3dDb25maWcgOiB7fSksXG4gICAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXBsYWNlOiBgJHthcHAucm9vdH0vJHtzb3VyY2V9YCxcbiAgICAgICAgICAgICAgICB3aXRoOiBgJHthcHAucm9vdH0vJHtlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX3NlcnZlQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IGFwcC5lbnZpcm9ubWVudHM7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmNoaXRlY3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zID0gKGFyY2hpdGVjdC5idWlsZCBhcyBKc29uT2JqZWN0KS5jb25maWd1cmF0aW9ucyBhcyBKc29uT2JqZWN0O1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb25maWd1cmF0aW9ucykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgYWNjW2Vudmlyb25tZW50XSA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGQ6JHtlbnZpcm9ubWVudH1gIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2V4dHJhRW50cnlNYXBwZXIoZXh0cmFFbnRyeTogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBsZXQgZW50cnk6IHN0cmluZyB8IEpzb25PYmplY3Q7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmFFbnRyeSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlbnRyeSA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkuaW5wdXQgYXMgc3RyaW5nIHx8ICcnKTtcbiAgICAgICAgICBlbnRyeSA9IHsgaW5wdXQsIGxhenk6IGV4dHJhRW50cnkubGF6eSB9O1xuXG4gICAgICAgICAgaWYgKGV4dHJhRW50cnkub3V0cHV0KSB7XG4gICAgICAgICAgICBlbnRyeS5idW5kbGVOYW1lID0gZXh0cmFFbnRyeS5vdXRwdXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiAnJyxcbiAgICAgICAgc291cmNlUm9vdDogJ3NyYycsXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgYXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG4gICAgICBwcm9qZWN0LmFyY2hpdGVjdCA9IGFyY2hpdGVjdDtcblxuICAgICAgICAvLyBCcm93c2VyIHRhcmdldFxuICAgICAgY29uc3QgYnVpbGRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAvLyBNYWtlIG91dHB1dFBhdGggcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgb3V0cHV0UGF0aDogb3V0RGlyLFxuICAgICAgICBpbmRleDogYCR7YXBwUm9vdH0vJHthcHAuaW5kZXggfHwgZGVmYXVsdHMuaW5kZXh9YCxcbiAgICAgICAgbWFpbjogYCR7YXBwUm9vdH0vJHthcHAubWFpbiB8fCBkZWZhdWx0cy5tYWlufWAsXG4gICAgICAgIHRzQ29uZmlnOiBgJHthcHBSb290fS8ke2FwcC50c2NvbmZpZyB8fCBkZWZhdWx0cy50c0NvbmZpZ31gLFxuICAgICAgICAuLi5idWlsZERlZmF1bHRzLFxuICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgYnVpbGRPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uc1xuICAgICAgICAgICYmIGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMuaW5jbHVkZVBhdGhzXG4gICAgICAgICAgJiYgQXJyYXkuaXNBcnJheShhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocylcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMgPSB7XG4gICAgICAgICAgaW5jbHVkZVBhdGhzOiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICAgLm1hcChpbmNsdWRlUGF0aCA9PiBqb2luKGFwcC5yb290IGFzIFBhdGgsIGluY2x1ZGVQYXRoKSksXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGJ1aWxkT3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpO1xuICAgICAgYnVpbGRPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYnVpbGRPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBhcmNoaXRlY3QuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX2J1aWxkQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNlcnZlIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAsXG4gICAgICAgIC4uLnNlcnZlRGVmYXVsdHMsXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LnNlcnZlID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZGV2LXNlcnZlcmAsXG4gICAgICAgIG9wdGlvbnM6IHNlcnZlT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IHRhcmdldFxuICAgICAgY29uc3QgZXh0cmFjdEkxOG5PcHRpb25zOiBKc29uT2JqZWN0ID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAgfTtcbiAgICAgIGFyY2hpdGVjdFsnZXh0cmFjdC1pMThuJ10gPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpleHRyYWN0LWkxOG5gLFxuICAgICAgICBvcHRpb25zOiBleHRyYWN0STE4bk9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBrYXJtYUNvbmZpZyA9IGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hXG4gICAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWcgfHwgJydcbiAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUZXN0IHRhcmdldFxuICAgICAgY29uc3QgdGVzdE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgbWFpbjogYXBwUm9vdCArICcvJyArIGFwcC50ZXN0IHx8IGRlZmF1bHRzLnRlc3QsXG4gICAgICAgICAgLy8gTWFrZSBrYXJtYUNvbmZpZyByZWxhdGl2ZSB0byByb290LlxuICAgICAgICAgIGthcm1hQ29uZmlnLFxuICAgICAgICB9O1xuXG4gICAgICBpZiAoYXBwLnBvbHlmaWxscykge1xuICAgICAgICB0ZXN0T3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC50ZXN0VHNjb25maWcpIHtcbiAgICAgICAgICB0ZXN0T3B0aW9ucy50c0NvbmZpZyA9IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdFRzY29uZmlnO1xuICAgICAgICB9XG4gICAgICB0ZXN0T3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpO1xuXG4gICAgICBpZiAoa2FybWFDb25maWcpIHtcbiAgICAgICAgYXJjaGl0ZWN0LnRlc3QgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9Omthcm1hYCxcbiAgICAgICAgICBvcHRpb25zOiB0ZXN0T3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdHNDb25maWdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3QgZXhjbHVkZXM6IHN0cmluZ1tdID0gW107XG4gICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5saW50ICYmIEFycmF5LmlzQXJyYXkoY29uZmlnLmxpbnQpKSB7XG4gICAgICAgIGNvbmZpZy5saW50LmZvckVhY2gobGludCA9PiB7XG4gICAgICAgICAgdHNDb25maWdzLnB1c2gobGludC5wcm9qZWN0KTtcbiAgICAgICAgICBpZiAobGludC5leGNsdWRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbnQuZXhjbHVkZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgZXhjbHVkZXMucHVzaChsaW50LmV4Y2x1ZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGludC5leGNsdWRlLmZvckVhY2goZXggPT4gZXhjbHVkZXMucHVzaChleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbW92ZUR1cGVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gaXRlbXMucmVkdWNlKChuZXdJdGVtcywgaXRlbSkgPT4ge1xuICAgICAgICBpZiAobmV3SXRlbXMuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICBuZXdJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0l0ZW1zO1xuICAgICAgfSwgPHN0cmluZ1tdPiBbXSk7XG5cbiAgICAgICAgLy8gVHNsaW50IHRhcmdldFxuICAgICAgY29uc3QgbGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgPT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5saW50ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICAgIG9wdGlvbnM6IGxpbnRPcHRpb25zLFxuICAgICAgICB9O1xuXG4gICAgICAvLyBzZXJ2ZXIgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZXJBcHAgPSBzZXJ2ZXJBcHBzXG4gICAgICAgIC5maWx0ZXIoc2VydmVyQXBwID0+IGFwcC5yb290ID09PSBzZXJ2ZXJBcHAucm9vdCAmJiBhcHAuaW5kZXggPT09IHNlcnZlckFwcC5pbmRleClbMF07XG5cbiAgICAgIGlmIChzZXJ2ZXJBcHApIHtcbiAgICAgICAgY29uc3Qgc2VydmVyT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBzZXJ2ZXJBcHAub3V0RGlyIHx8IGRlZmF1bHRzLnNlcnZlck91dERpcixcbiAgICAgICAgICBtYWluOiBzZXJ2ZXJBcHAubWFpbiB8fCBkZWZhdWx0cy5zZXJ2ZXJNYWluLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJBcHAudHNjb25maWcgfHwgZGVmYXVsdHMuc2VydmVyVHNDb25maWcsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlcnZlclRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6c2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiBzZXJ2ZXJPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgICBhcmNoaXRlY3Quc2VydmVyID0gc2VydmVyVGFyZ2V0O1xuICAgICAgfVxuICAgICAgY29uc3QgZTJlUHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogcHJvamVjdC5yb290LFxuICAgICAgICBzb3VyY2VSb290OiBwcm9qZWN0LnJvb3QsXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgICBjbGk6IHt9LFxuICAgICAgICBzY2hlbWF0aWNzOiB7fSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGUyZUFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICBjb25zdCBwcm90cmFjdG9yQ29uZmlnID0gY29uZmlnICYmIGNvbmZpZy5lMmUgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yICYmIGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgPyBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgIDogJyc7XG4gICAgICBjb25zdCBlMmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBwcm90cmFjdG9yQ29uZmlnLFxuICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke25hbWV9OnNlcnZlYCxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpwcm90cmFjdG9yYCxcbiAgICAgICAgb3B0aW9uczogZTJlT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGUyZUFyY2hpdGVjdC5lMmUgPSBlMmVUYXJnZXQ7XG4gICAgICBjb25zdCBlMmVMaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSAhPT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlTGludFRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgIG9wdGlvbnM6IGUyZUxpbnRPcHRpb25zLFxuICAgICAgfTtcbiAgICAgIGUyZUFyY2hpdGVjdC5saW50ID0gZTJlTGludFRhcmdldDtcbiAgICAgIGlmIChwcm90cmFjdG9yQ29uZmlnKSB7XG4gICAgICAgIGUyZVByb2plY3QuYXJjaGl0ZWN0ID0gZTJlQXJjaGl0ZWN0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0IH07XG4gICAgfSlcbiAgICAucmVkdWNlKChwcm9qZWN0cywgbWFwcGVkQXBwKSA9PiB7XG4gICAgICBjb25zdCB7bmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdH0gPSBtYXBwZWRBcHA7XG4gICAgICBwcm9qZWN0c1tuYW1lXSA9IHByb2plY3Q7XG4gICAgICBwcm9qZWN0c1tuYW1lICsgJy1lMmUnXSA9IGUyZVByb2plY3Q7XG5cbiAgICAgIHJldHVybiBwcm9qZWN0cztcbiAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcblxuICByZXR1cm4gcHJvamVjdE1hcDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgICBhcHBzLmZvckVhY2goKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgdHNTcGVjQ29uZmlnUGF0aCA9XG4gICAgICAgIGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgYXBwLnRlc3RUc2NvbmZpZyB8fCBkZWZhdWx0cy50ZXN0VHNDb25maWcpO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzU3BlY0NvbmZpZ1BhdGgpO1xuICAgICAgaWYgKCFidWZmZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNDZmcgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKTtcbiAgICAgIGlmICghdHNDZmcuZmlsZXMpIHtcbiAgICAgICAgdHNDZmcuZmlsZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gRW5zdXJlIHRoZSBzcGVjIHRzY29uZmlnIGNvbnRhaW5zIHRoZSBwb2x5ZmlsbHMgZmlsZVxuICAgICAgaWYgKHRzQ2ZnLmZpbGVzLmluZGV4T2YoYXBwLnBvbHlmaWxscyB8fCBkZWZhdWx0cy5wb2x5ZmlsbHMpID09PSAtMSkge1xuICAgICAgICB0c0NmZy5maWxlcy5wdXNoKGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUodHNTcGVjQ29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkodHNDZmcsIG51bGwsIDIpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUGFja2FnZUpzb24ocGFja2FnZU1hbmFnZXI/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgcGtnUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnUGF0aCk7XG4gICAgaWYgKGJ1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IHJlYWQgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuXG4gICAgaWYgKHBrZyA9PT0gbnVsbCB8fCB0eXBlb2YgcGtnICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHBrZykpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdFcnJvciByZWFkaW5nIHBhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBpZiAoIXBrZy5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIHBrZy5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBwa2cuZGV2RGVwZW5kZW5jaWVzWydAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhciddID0gbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyO1xuXG4gICAgaG9zdC5vdmVyd3JpdGUocGtnUGF0aCwgSlNPTi5zdHJpbmdpZnkocGtnLCBudWxsLCAyKSk7XG5cbiAgICBpZiAocGFja2FnZU1hbmFnZXIgJiYgIVsnbnBtJywgJ3lhcm4nLCAnY25wbSddLmluY2x1ZGVzKHBhY2thZ2VNYW5hZ2VyKSkge1xuICAgICAgcGFja2FnZU1hbmFnZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayh7IHBhY2thZ2VNYW5hZ2VyIH0pKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0xpbnRDb25maWcoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRzTGludFBhdGggPSAnL3RzbGludC5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNMaW50UGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdHNDZmcgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKTtcblxuICAgIGlmICh0c0NmZy5ydWxlcyAmJiB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddICYmXG4gICAgICAgIHRzQ2ZnLnJ1bGVzWydpbXBvcnQtYmxhY2tsaXN0J10uaW5kZXhPZigncnhqcycpICE9PSAtMSkge1xuXG4gICAgICB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddID0gdHNDZmcucnVsZXNbJ2ltcG9ydC1ibGFja2xpc3QnXVxuICAgICAgICAuZmlsdGVyKChydWxlOiBzdHJpbmcgfCBib29sZWFuKSA9PiBydWxlICE9PSAncnhqcycpO1xuXG4gICAgICBob3N0Lm92ZXJ3cml0ZSh0c0xpbnRQYXRoLCBKU09OLnN0cmluZ2lmeSh0c0NmZywgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmIChob3N0LmV4aXN0cygnLy5hbmd1bGFyLmpzb24nKSB8fCBob3N0LmV4aXN0cygnL2FuZ3VsYXIuanNvbicpKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdGb3VuZCBhIG1vZGVybiBjb25maWd1cmF0aW9uIGZpbGUuIE5vdGhpbmcgdG8gYmUgZG9uZS4nKTtcblxuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnQnVmZmVyID0gaG9zdC5yZWFkKG5vcm1hbGl6ZShjb25maWdQYXRoKSk7XG4gICAgaWYgKGNvbmZpZ0J1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIH1cbiAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZ0J1ZmZlci50b1N0cmluZygpKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICBtaWdyYXRlQ29uZmlndXJhdGlvbihjb25maWcpLFxuICAgICAgdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZyksXG4gICAgICB1cGRhdGVQYWNrYWdlSnNvbihjb25maWcucGFja2FnZU1hbmFnZXIpLFxuICAgICAgdXBkYXRlVHNMaW50Q29uZmlnKCksXG4gICAgICAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBTb21lIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBoYXZlIGJlZW4gY2hhbmdlZCxcbiAgICAgICAgICBwbGVhc2UgbWFrZSBzdXJlIHRvIHVwZGF0ZSBhbnkgbnBtIHNjcmlwdHMgd2hpY2ggeW91IG1heSBoYXZlIG1vZGlmaWVkLmApO1xuXG4gICAgICAgIHJldHVybiBob3N0O1xuICAgICAgfSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==