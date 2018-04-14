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
            '$schema': './node_modules/@angular-devkit/core/src/workspace/workspace-schema.json',
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
                if (tree.exists(app.root + '/' + asset)) {
                    // If it exists in the tree, then it is a file.
                    return { glob: asset, input: core_1.normalize(appRoot + '/'), output: '/' };
                }
                else {
                    // If it does not exist, it is either a folder or something we can't statically know.
                    // Folders must get a recursive star glob.
                    return { glob: '**/*', input: core_1.normalize(appRoot + '/' + asset), output: '/' + asset };
                }
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
                    : {}), (isProduction && serviceWorker ? { serviceWorker: true } : {}), { fileReplacements: [
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
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXlFO0FBQ3pFLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsbUVBQStEO0FBRS9ELE1BQU0sUUFBUSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxLQUFLLEVBQUUsWUFBWTtJQUNuQixJQUFJLEVBQUUsU0FBUztJQUNmLFNBQVMsRUFBRSxjQUFjO0lBQ3pCLFFBQVEsRUFBRSxtQkFBbUI7SUFDN0IsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLEVBQUUsT0FBTztJQUNmLEtBQUssRUFBRSxlQUFlO0lBQ3RCLFVBQVUsRUFBRSxvQkFBb0I7SUFDaEMsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyxZQUFZLEVBQUUsYUFBYTtJQUMzQixVQUFVLEVBQUUsZ0JBQWdCO0lBQzVCLGNBQWMsRUFBRSxzQkFBc0I7Q0FDdkMsQ0FBQztBQUVGLHVCQUF1QixJQUFVO0lBQy9CLElBQUksWUFBWSxHQUFHLGdCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNsRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxtQ0FB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QUMxQixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDO1lBQ3hDLGtCQUFrQixFQUFFO1NBQ3JCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZCRCw0QkF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBKc29uT2JqZWN0LCBQYXRoLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBjaGFpbixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IEFwcENvbmZpZywgQ2xpQ29uZmlnIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi8uLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICBhcHBSb290OiAnc3JjJyxcbiAgaW5kZXg6ICdpbmRleC5odG1sJyxcbiAgbWFpbjogJ21haW4udHMnLFxuICBwb2x5ZmlsbHM6ICdwb2x5ZmlsbHMudHMnLFxuICB0c0NvbmZpZzogJ3RzY29uZmlnLmFwcC5qc29uJyxcbiAgdGVzdDogJ3Rlc3QudHMnLFxuICBvdXREaXI6ICdkaXN0LycsXG4gIGthcm1hOiAna2FybWEuY29uZi5qcycsXG4gIHByb3RyYWN0b3I6ICdwcm90cmFjdG9yLmNvbmYuanMnLFxuICB0ZXN0VHNDb25maWc6ICd0c2NvbmZpZy5zcGVjLmpzb24nLFxuICBzZXJ2ZXJPdXREaXI6ICdkaXN0LXNlcnZlcicsXG4gIHNlcnZlck1haW46ICdtYWluLnNlcnZlci50cycsXG4gIHNlcnZlclRzQ29uZmlnOiAndHNjb25maWcuc2VydmVyLmpzb24nLFxufTtcblxuZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCh0cmVlOiBUcmVlKTogUGF0aCB7XG4gIGxldCBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuICBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG5cbiAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZScpO1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGthcm1hIGNvbmZpZ3VyYXRpb25gKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2FybWFQYXRoID0gY29uZmlnICYmIGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hICYmIGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA6IGRlZmF1bHRzLmthcm1hO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKGthcm1hUGF0aCk7XG4gICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoIC9AYW5ndWxhclxcL2NsaS9nLCAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgncmVwb3J0cycsXG4gICAgICAgICAgYGRpcjogcmVxdWlyZSgncGF0aCcpLmpvaW4oX19kaXJuYW1lLCAnY292ZXJhZ2UnKSwgcmVwb3J0c2ApO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZShrYXJtYVBhdGgsIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICAnJHNjaGVtYSc6ICcuL25vZGVfbW9kdWxlcy9AYW5ndWxhci1kZXZraXQvY29yZS9zcmMvd29ya3NwYWNlL3dvcmtzcGFjZS1zY2hlbWEuanNvbicsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCksXG4gICAgfTtcbiAgICBjb25zdCBjbGlDb25maWcgPSBleHRyYWN0Q2xpQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGNsaUNvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmNsaSA9IGNsaUNvbmZpZztcbiAgICB9XG4gICAgY29uc3Qgc2NoZW1hdGljc0NvbmZpZyA9IGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKHNjaGVtYXRpY3NDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5zY2hlbWF0aWNzID0gc2NoZW1hdGljc0NvbmZpZztcbiAgICB9XG4gICAgY29uc3QgYXJjaGl0ZWN0Q29uZmlnID0gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChhcmNoaXRlY3RDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5hcmNoaXRlY3QgPSBhcmNoaXRlY3RDb25maWc7XG4gICAgfVxuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgUmVtb3Zpbmcgb2xkIGNvbmZpZyBmaWxlICgke29sZENvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuZGVsZXRlKG9sZENvbmZpZ1BhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFdyaXRpbmcgY29uZmlnIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5jcmVhdGUoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdENsaUNvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgY29uc3QgbmV3Q29uZmlnOiBKc29uT2JqZWN0ID0ge307XG4gIGlmIChjb25maWcucGFja2FnZU1hbmFnZXIgJiYgY29uZmlnLnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCcpIHtcbiAgICBuZXdDb25maWdbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBjb25maWcucGFja2FnZU1hbmFnZXI7XG4gIH1cblxuICByZXR1cm4gbmV3Q29uZmlnO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgbGV0IGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gY29uc3QgY29uZmlnRGVmYXVsdHMgPSBjb25maWcuZGVmYXVsdHM7XG4gIGlmIChjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb25OYW1lID0gY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgZWFjaCBzY2hlbWF0aWNcbiAgICogIC0gZ2V0IHRoZSBjb25maWdcbiAgICogIC0gZmlsdGVyIG9uZSdzIHdpdGhvdXQgY29uZmlnXG4gICAqICAtIGNvbWJpbmUgdGhlbSBpbnRvIGFuIG9iamVjdFxuICAgKi9cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBzY2hlbWF0aWNDb25maWdzOiBhbnkgPSBbJ2NsYXNzJywgJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZ3VhcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2ludGVyZmFjZScsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ11cbiAgICAubWFwKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdHM6IEpzb25PYmplY3QgPSAoY29uZmlnLmRlZmF1bHRzIGFzIGFueSlbc2NoZW1hdGljTmFtZV0gfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29uZmlnOiBzY2hlbWF0aWNEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHNjaGVtYXRpYyA9PiBzY2hlbWF0aWMuY29uZmlnICE9PSBudWxsKVxuICAgIC5yZWR1Y2UoKGFsbDogSnNvbk9iamVjdCwgc2NoZW1hdGljKSA9PiB7XG4gICAgICBhbGxbY29sbGVjdGlvbk5hbWUgKyAnOicgKyBzY2hlbWF0aWMuc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuY29uZmlnO1xuXG4gICAgICByZXR1cm4gYWxsO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBjb21wb25lbnRVcGRhdGU6IEpzb25PYmplY3QgPSB7fTtcbiAgY29tcG9uZW50VXBkYXRlLnByZWZpeCA9ICcnO1xuXG4gIGNvbnN0IGNvbXBvbmVudEtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpjb21wb25lbnQnO1xuICBjb25zdCBkaXJlY3RpdmVLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6ZGlyZWN0aXZlJztcbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0gPSB7fTtcbiAgfVxuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSA9IHt9O1xuICB9XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgfVxuICBpZiAoY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnN0eWxlZXh0ID0gY29uZmlnLmRlZmF1bHRzLnN0eWxlRXh0O1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYXRpY0NvbmZpZ3M7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RBcmNoaXRlY3RDb25maWcoX2NvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFByb2plY3RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnLCB0cmVlOiBUcmVlKTogSnNvbk9iamVjdCB7XG4gIGNvbnN0IGJ1aWxkZXJQYWNrYWdlID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbiAgbGV0IGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gJ2FwcCc7XG4gIGlmIChjb25maWcucHJvamVjdCAmJiBjb25maWcucHJvamVjdC5uYW1lKSB7XG4gICAgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSBjb25maWcucHJvamVjdC5uYW1lO1xuICB9XG5cbiAgY29uc3QgYnVpbGREZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuYnVpbGRcbiAgICA/IHtcbiAgICAgIHNvdXJjZU1hcDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNvdXJjZW1hcHMsXG4gICAgICBwcm9ncmVzczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByb2dyZXNzLFxuICAgICAgcG9sbDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnBvbGwsXG4gICAgICBkZWxldGVPdXRwdXRQYXRoOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuZGVsZXRlT3V0cHV0UGF0aCxcbiAgICAgIHByZXNlcnZlU3ltbGlua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICAgICAgY29tbW9uQ2h1bms6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5jb21tb25DaHVuayxcbiAgICAgIG5hbWVkQ2h1bmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQubmFtZWRDaHVua3MsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuICBjb25zdCBzZXJ2ZURlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZVxuICAgID8ge1xuICAgICAgcG9ydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnBvcnQsXG4gICAgICBob3N0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuaG9zdCxcbiAgICAgIHNzbDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbCxcbiAgICAgIHNzbEtleTogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbEtleSxcbiAgICAgIHNzbENlcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xDZXJ0LFxuICAgICAgcHJveHlDb25maWc6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wcm94eUNvbmZpZyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IGJyb3dzZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSAhPT0gJ3NlcnZlcicpO1xuICBjb25zdCBzZXJ2ZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSA9PT0gJ3NlcnZlcicpO1xuXG4gIGNvbnN0IHByb2plY3RNYXAgPSBicm93c2VyQXBwc1xuICAgIC5tYXAoKGFwcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpZiAodHJlZS5leGlzdHMoYXBwLnJvb3QgKyAnLycgKyBhc3NldCkpIHtcbiAgICAgICAgICAgIC8vIElmIGl0IGV4aXN0cyBpbiB0aGUgdHJlZSwgdGhlbiBpdCBpcyBhIGZpbGUuXG4gICAgICAgICAgICByZXR1cm4geyBnbG9iOiBhc3NldCwgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nKSwgb3V0cHV0OiAnLycgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgaXQgZG9lcyBub3QgZXhpc3QsIGl0IGlzIGVpdGhlciBhIGZvbGRlciBvciBzb21ldGhpbmcgd2UgY2FuJ3Qgc3RhdGljYWxseSBrbm93LlxuICAgICAgICAgICAgLy8gRm9sZGVycyBtdXN0IGdldCBhIHJlY3Vyc2l2ZSBzdGFyIGdsb2IuXG4gICAgICAgICAgICByZXR1cm4geyBnbG9iOiAnKiovKicsIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0KSwgb3V0cHV0OiAnLycgKyBhc3NldCB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoYXNzZXQub3V0cHV0KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogbm9ybWFsaXplKCcvJyArIGFzc2V0Lm91dHB1dCBhcyBzdHJpbmcpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICAgICAgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQuaW5wdXQpLFxuICAgICAgICAgICAgICBvdXRwdXQ6ICcvJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9idWlsZENvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBhcHAuZW52aXJvbm1lbnRTb3VyY2U7XG4gICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IGFwcC5lbnZpcm9ubWVudHM7XG4gICAgICAgIGNvbnN0IHNlcnZpY2VXb3JrZXIgPSBhcHAuc2VydmljZVdvcmtlcjtcblxuICAgICAgICBpZiAoIWVudmlyb25tZW50cykge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhlbnZpcm9ubWVudHMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2UgPT09IGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pIHtcbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGlzUHJvZHVjdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgICAgY29uc3QgZW52aXJvbm1lbnRDb250ZW50ID0gdHJlZS5yZWFkKGFwcC5yb290ICsgJy8nICsgZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSk7XG4gICAgICAgICAgaWYgKGVudmlyb25tZW50Q29udGVudCkge1xuICAgICAgICAgICAgaXNQcm9kdWN0aW9uID0gISFlbnZpcm9ubWVudENvbnRlbnQudG9TdHJpbmcoJ3V0Zi04JylcbiAgICAgICAgICAgICAgLy8gQWxsb3cgZm9yIGBwcm9kdWN0aW9uOiB0cnVlYCBvciBgcHJvZHVjdGlvbiA9IHRydWVgLiBCZXN0IHdlIGNhbiBkbyB0byBndWVzcy5cbiAgICAgICAgICAgICAgLm1hdGNoKC9wcm9kdWN0aW9uWydcIl0/XFxzKls6PV1cXHMqdHJ1ZS8pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBjb25maWd1cmF0aW9uTmFtZTtcbiAgICAgICAgICAvLyBXZSB1c2VkIHRvIHVzZSBgcHJvZGAgYnkgZGVmYXVsdCBhcyB0aGUga2V5LCBpbnN0ZWFkIHdlIG5vdyB1c2UgdGhlIGZ1bGwgd29yZC5cbiAgICAgICAgICAvLyBUcnkgbm90IHRvIG92ZXJyaWRlIHRoZSBwcm9kdWN0aW9uIGtleSBpZiBpdCdzIHRoZXJlLlxuICAgICAgICAgIGlmIChlbnZpcm9ubWVudCA9PSAncHJvZCcgJiYgIWVudmlyb25tZW50c1sncHJvZHVjdGlvbiddICYmIGlzUHJvZHVjdGlvbikge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSAncHJvZHVjdGlvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gZW52aXJvbm1lbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWNjW2NvbmZpZ3VyYXRpb25OYW1lXSA9IHtcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb25cbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgb3B0aW1pemF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gJiYgc2VydmljZVdvcmtlciA/IHsgc2VydmljZVdvcmtlcjogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZTogYCR7YXBwLnJvb3R9LyR7c291cmNlfWAsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7YXBwLnJvb3R9LyR7ZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XX1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJjaGl0ZWN0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9ucyA9IChhcmNoaXRlY3QuYnVpbGQgYXMgSnNvbk9iamVjdCkuY29uZmlndXJhdGlvbnMgYXMgSnNvbk9iamVjdDtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGFjY1tlbnZpcm9ubWVudF0gPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkOiR7ZW52aXJvbm1lbnR9YCB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9leHRyYUVudHJ5TWFwcGVyKGV4dHJhRW50cnk6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgbGV0IGVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0O1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhRW50cnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgZW50cnkgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5LmlucHV0IGFzIHN0cmluZyB8fCAnJyk7XG4gICAgICAgICAgZW50cnkgPSB7IGlucHV0LCBsYXp5OiBleHRyYUVudHJ5LmxhenkgfTtcblxuICAgICAgICAgIGlmIChleHRyYUVudHJ5Lm91dHB1dCkge1xuICAgICAgICAgICAgZW50cnkuYnVuZGxlTmFtZSA9IGV4dHJhRW50cnkub3V0cHV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogJycsXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgYXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG4gICAgICBwcm9qZWN0LmFyY2hpdGVjdCA9IGFyY2hpdGVjdDtcblxuICAgICAgICAvLyBCcm93c2VyIHRhcmdldFxuICAgICAgY29uc3QgYnVpbGRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAvLyBNYWtlIG91dHB1dFBhdGggcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgb3V0cHV0UGF0aDogb3V0RGlyLFxuICAgICAgICBpbmRleDogYCR7YXBwUm9vdH0vJHthcHAuaW5kZXggfHwgZGVmYXVsdHMuaW5kZXh9YCxcbiAgICAgICAgbWFpbjogYCR7YXBwUm9vdH0vJHthcHAubWFpbiB8fCBkZWZhdWx0cy5tYWlufWAsXG4gICAgICAgIHRzQ29uZmlnOiBgJHthcHBSb290fS8ke2FwcC50c2NvbmZpZyB8fCBkZWZhdWx0cy50c0NvbmZpZ31gLFxuICAgICAgICAuLi5idWlsZERlZmF1bHRzLFxuICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgYnVpbGRPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYXJjaGl0ZWN0LmJ1aWxkID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06YnJvd3NlcmAsXG4gICAgICAgIG9wdGlvbnM6IGJ1aWxkT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9idWlsZENvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBTZXJ2ZSB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgLFxuICAgICAgICAuLi5zZXJ2ZURlZmF1bHRzLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5zZXJ2ZSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmRldi1zZXJ2ZXJgLFxuICAgICAgICBvcHRpb25zOiBzZXJ2ZU9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfc2VydmVDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCB0YXJnZXRcbiAgICAgIGNvbnN0IGV4dHJhY3RJMThuT3B0aW9uczogSnNvbk9iamVjdCA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgIH07XG4gICAgICBhcmNoaXRlY3RbJ2V4dHJhY3QtaTE4biddID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZXh0cmFjdC1pMThuYCxcbiAgICAgICAgb3B0aW9uczogZXh0cmFjdEkxOG5PcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qga2FybWFDb25maWcgPSBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYVxuICAgICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnIHx8ICcnXG4gICAgICAgICAgOiAnJztcbiAgICAgICAgLy8gVGVzdCB0YXJnZXRcbiAgICAgIGNvbnN0IHRlc3RPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdCB8fCBkZWZhdWx0cy50ZXN0LFxuICAgICAgICAgIC8vIE1ha2Uga2FybWFDb25maWcgcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgICBrYXJtYUNvbmZpZyxcbiAgICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgdGVzdE9wdGlvbnMucG9seWZpbGxzID0gYXBwUm9vdCArICcvJyArIGFwcC5wb2x5ZmlsbHM7XG4gICAgICB9XG5cbiAgICAgIGlmIChhcHAudGVzdFRzY29uZmlnKSB7XG4gICAgICAgICAgdGVzdE9wdGlvbnMudHNDb25maWcgPSBhcHBSb290ICsgJy8nICsgYXBwLnRlc3RUc2NvbmZpZztcbiAgICAgICAgfVxuICAgICAgdGVzdE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcblxuICAgICAgaWYgKGthcm1hQ29uZmlnKSB7XG4gICAgICAgIGFyY2hpdGVjdC50ZXN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTprYXJtYWAsXG4gICAgICAgICAgb3B0aW9uczogdGVzdE9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRzQ29uZmlnczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IGV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgaWYgKGxpbnQuZXhjbHVkZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW50LmV4Y2x1ZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIGV4Y2x1ZGVzLnB1c2gobGludC5leGNsdWRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxpbnQuZXhjbHVkZS5mb3JFYWNoKGV4ID0+IGV4Y2x1ZGVzLnB1c2goZXgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZW1vdmVEdXBlcyA9IChpdGVtczogc3RyaW5nW10pID0+IGl0ZW1zLnJlZHVjZSgobmV3SXRlbXMsIGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKG5ld0l0ZW1zLmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICAgICAgbmV3SXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdJdGVtcztcbiAgICAgIH0sIDxzdHJpbmdbXT4gW10pO1xuXG4gICAgICAgIC8vIFRzbGludCB0YXJnZXRcbiAgICAgIGNvbnN0IGxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpID09PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3QubGludCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgICBvcHRpb25zOiBsaW50T3B0aW9ucyxcbiAgICAgICAgfTtcblxuICAgICAgLy8gc2VydmVyIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVyQXBwID0gc2VydmVyQXBwc1xuICAgICAgICAuZmlsdGVyKHNlcnZlckFwcCA9PiBhcHAucm9vdCA9PT0gc2VydmVyQXBwLnJvb3QgJiYgYXBwLmluZGV4ID09PSBzZXJ2ZXJBcHAuaW5kZXgpWzBdO1xuXG4gICAgICBpZiAoc2VydmVyQXBwKSB7XG4gICAgICAgIGNvbnN0IHNlcnZlck9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogc2VydmVyQXBwLm91dERpciB8fCBkZWZhdWx0cy5zZXJ2ZXJPdXREaXIsXG4gICAgICAgICAgbWFpbjogc2VydmVyQXBwLm1haW4gfHwgZGVmYXVsdHMuc2VydmVyTWFpbixcbiAgICAgICAgICB0c0NvbmZpZzogc2VydmVyQXBwLnRzY29uZmlnIHx8IGRlZmF1bHRzLnNlcnZlclRzQ29uZmlnLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXJ2ZXJUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnNlcnZlcicsXG4gICAgICAgICAgb3B0aW9uczogc2VydmVyT3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgICAgYXJjaGl0ZWN0LnNlcnZlciA9IHNlcnZlclRhcmdldDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGUyZVByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6IHByb2plY3Qucm9vdCxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICAgIGNsaToge30sXG4gICAgICAgIHNjaGVtYXRpY3M6IHt9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZTJlQXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIGNvbnN0IHByb3RyYWN0b3JDb25maWcgPSBjb25maWcgJiYgY29uZmlnLmUyZSAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGUyZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IHByb3RyYWN0b3JDb25maWcsXG4gICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7bmFtZX06c2VydmVgLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZVRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnByb3RyYWN0b3JgLFxuICAgICAgICBvcHRpb25zOiBlMmVPcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgZTJlQXJjaGl0ZWN0LmUyZSA9IGUyZVRhcmdldDtcbiAgICAgIGNvbnN0IGUyZUxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpICE9PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVMaW50VGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgb3B0aW9uczogZTJlTGludE9wdGlvbnMsXG4gICAgICB9O1xuICAgICAgZTJlQXJjaGl0ZWN0LmxpbnQgPSBlMmVMaW50VGFyZ2V0O1xuICAgICAgaWYgKHByb3RyYWN0b3JDb25maWcpIHtcbiAgICAgICAgZTJlUHJvamVjdC5hcmNoaXRlY3QgPSBlMmVBcmNoaXRlY3Q7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG5hbWUsIHByb2plY3QsIGUyZVByb2plY3QgfTtcbiAgICB9KVxuICAgIC5yZWR1Y2UoKHByb2plY3RzLCBtYXBwZWRBcHApID0+IHtcbiAgICAgIGNvbnN0IHtuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0fSA9IG1hcHBlZEFwcDtcbiAgICAgIHByb2plY3RzW25hbWVdID0gcHJvamVjdDtcbiAgICAgIHByb2plY3RzW25hbWUgKyAnLWUyZSddID0gZTJlUHJvamVjdDtcblxuICAgICAgcmV0dXJuIHByb2plY3RzO1xuICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuXG4gIHJldHVybiBwcm9qZWN0TWFwO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAgIGFwcHMuZm9yRWFjaCgoYXBwOiBBcHBDb25maWcsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCB0c1NwZWNDb25maWdQYXRoID1cbiAgICAgICAgam9pbihhcHAucm9vdCBhcyBQYXRoLCBhcHAudGVzdFRzY29uZmlnIHx8IGRlZmF1bHRzLnRlc3RUc0NvbmZpZyk7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNTcGVjQ29uZmlnUGF0aCk7XG4gICAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB0c0NmZyA9IEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpO1xuICAgICAgaWYgKCF0c0NmZy5maWxlcykge1xuICAgICAgICB0c0NmZy5maWxlcyA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBFbnN1cmUgdGhlIHNwZWMgdHNjb25maWcgY29udGFpbnMgdGhlIHBvbHlmaWxscyBmaWxlXG4gICAgICBpZiAodHNDZmcuZmlsZXMuaW5kZXhPZihhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscykgPT09IC0xKSB7XG4gICAgICAgIHRzQ2ZnLmZpbGVzLnB1c2goYXBwLnBvbHlmaWxscyB8fCBkZWZhdWx0cy5wb2x5ZmlsbHMpO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZSh0c1NwZWNDb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeSh0c0NmZywgbnVsbCwgMikpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQYWNrYWdlSnNvbihwYWNrYWdlTWFuYWdlcj86IHN0cmluZykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBwa2dQYXRoID0gJy9wYWNrYWdlLmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwa2dQYXRoKTtcbiAgICBpZiAoYnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgcmVhZCBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG4gICAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoY29udGVudCk7XG5cbiAgICBpZiAocGtnID09PSBudWxsIHx8IHR5cGVvZiBwa2cgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGtnKSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0Vycm9yIHJlYWRpbmcgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGlmICghcGtnLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgcGtnLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgIH1cblxuICAgIHBrZy5kZXZEZXBlbmRlbmNpZXNbJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJ10gPSBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXI7XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwa2dQYXRoLCBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpKTtcblxuICAgIGlmIChwYWNrYWdlTWFuYWdlciAmJiAhWyducG0nLCAneWFybicsICdjbnBtJ10uaW5jbHVkZXMocGFja2FnZU1hbmFnZXIpKSB7XG4gICAgICBwYWNrYWdlTWFuYWdlciA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKHsgcGFja2FnZU1hbmFnZXIgfSkpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzTGludENvbmZpZygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgdHNMaW50UGF0aCA9ICcvdHNsaW50Lmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c0xpbnRQYXRoKTtcbiAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0c0NmZyA9IEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpO1xuXG4gICAgaWYgKHRzQ2ZnLnJ1bGVzICYmIHRzQ2ZnLnJ1bGVzWydpbXBvcnQtYmxhY2tsaXN0J10gJiZcbiAgICAgICAgdHNDZmcucnVsZXNbJ2ltcG9ydC1ibGFja2xpc3QnXS5pbmRleE9mKCdyeGpzJykgIT09IC0xKSB7XG5cbiAgICAgIHRzQ2ZnLnJ1bGVzWydpbXBvcnQtYmxhY2tsaXN0J10gPSB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddXG4gICAgICAgIC5maWx0ZXIoKHJ1bGU6IHN0cmluZyB8IGJvb2xlYW4pID0+IHJ1bGUgIT09ICdyeGpzJyk7XG5cbiAgICAgIGhvc3Qub3ZlcndyaXRlKHRzTGludFBhdGgsIEpTT04uc3RyaW5naWZ5KHRzQ2ZnLCBudWxsLCAyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKGhvc3QuZXhpc3RzKCcvLmFuZ3VsYXIuanNvbicpIHx8IGhvc3QuZXhpc3RzKCcvYW5ndWxhci5qc29uJykpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ0ZvdW5kIGEgbW9kZXJuIGNvbmZpZ3VyYXRpb24gZmlsZS4gTm90aGluZyB0byBiZSBkb25lLicpO1xuXG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdCdWZmZXIgPSBob3N0LnJlYWQobm9ybWFsaXplKGNvbmZpZ1BhdGgpKTtcbiAgICBpZiAoY29uZmlnQnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnQnVmZmVyLnRvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIG1pZ3JhdGVDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnKSxcbiAgICAgIHVwZGF0ZVBhY2thZ2VKc29uKGNvbmZpZy5wYWNrYWdlTWFuYWdlciksXG4gICAgICB1cGRhdGVUc0xpbnRDb25maWcoKSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==