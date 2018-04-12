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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXlFO0FBQ3pFLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsbUVBQStEO0FBRS9ELE1BQU0sUUFBUSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxLQUFLLEVBQUUsWUFBWTtJQUNuQixJQUFJLEVBQUUsU0FBUztJQUNmLFNBQVMsRUFBRSxjQUFjO0lBQ3pCLFFBQVEsRUFBRSxtQkFBbUI7SUFDN0IsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLEVBQUUsT0FBTztJQUNmLEtBQUssRUFBRSxlQUFlO0lBQ3RCLFVBQVUsRUFBRSxvQkFBb0I7SUFDaEMsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyxZQUFZLEVBQUUsYUFBYTtJQUMzQixVQUFVLEVBQUUsZ0JBQWdCO0lBQzVCLGNBQWMsRUFBRSxzQkFBc0I7Q0FDdkMsQ0FBQztBQUVGLHVCQUF1QixJQUFVO0lBQy9CLElBQUksWUFBWSxHQUFHLGdCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNsRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxtQ0FB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ZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgUGF0aCwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgY2hhaW4sXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBBcHBDb25maWcsIENsaUNvbmZpZyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcbiAgYXBwUm9vdDogJ3NyYycsXG4gIGluZGV4OiAnaW5kZXguaHRtbCcsXG4gIG1haW46ICdtYWluLnRzJyxcbiAgcG9seWZpbGxzOiAncG9seWZpbGxzLnRzJyxcbiAgdHNDb25maWc6ICd0c2NvbmZpZy5hcHAuanNvbicsXG4gIHRlc3Q6ICd0ZXN0LnRzJyxcbiAgb3V0RGlyOiAnZGlzdC8nLFxuICBrYXJtYTogJ2thcm1hLmNvbmYuanMnLFxuICBwcm90cmFjdG9yOiAncHJvdHJhY3Rvci5jb25mLmpzJyxcbiAgdGVzdFRzQ29uZmlnOiAndHNjb25maWcuc3BlYy5qc29uJyxcbiAgc2VydmVyT3V0RGlyOiAnZGlzdC1zZXJ2ZXInLFxuICBzZXJ2ZXJNYWluOiAnbWFpbi5zZXJ2ZXIudHMnLFxuICBzZXJ2ZXJUc0NvbmZpZzogJ3RzY29uZmlnLnNlcnZlci5qc29uJyxcbn07XG5cbmZ1bmN0aW9uIGdldENvbmZpZ1BhdGgodHJlZTogVHJlZSk6IFBhdGgge1xuICBsZXQgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cbiAgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCdhbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuXG4gIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUnKTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyBrYXJtYSBjb25maWd1cmF0aW9uYCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGthcm1hUGF0aCA9IGNvbmZpZyAmJiBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYSAmJiBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgOiBkZWZhdWx0cy5rYXJtYTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChrYXJtYVBhdGgpO1xuICAgICAgaWYgKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICBsZXQgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCAvQGFuZ3VsYXJcXC9jbGkvZywgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJ3JlcG9ydHMnLFxuICAgICAgICAgIGBkaXI6IHJlcXVpcmUoJ3BhdGgnKS5qb2luKF9fZGlybmFtZSwgJ2NvdmVyYWdlJyksIHJlcG9ydHNgKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUoa2FybWFQYXRoLCBjb250ZW50KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7IH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlQ29uZmlndXJhdGlvbihvbGRDb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBvbGRDb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdQYXRoID0gbm9ybWFsaXplKCdhbmd1bGFyLmpzb24nKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyBjb25maWd1cmF0aW9uYCk7XG4gICAgY29uc3QgY29uZmlnOiBKc29uT2JqZWN0ID0ge1xuICAgICAgJyRzY2hlbWEnOiAnLi9ub2RlX21vZHVsZXMvQGFuZ3VsYXItZGV2a2l0L2NvcmUvc3JjL3dvcmtzcGFjZS93b3Jrc3BhY2Utc2NoZW1hLmpzb24nLFxuICAgICAgdmVyc2lvbjogMSxcbiAgICAgIG5ld1Byb2plY3RSb290OiAncHJvamVjdHMnLFxuICAgICAgcHJvamVjdHM6IGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhvbGRDb25maWcsIGhvc3QpLFxuICAgIH07XG4gICAgY29uc3QgY2xpQ29uZmlnID0gZXh0cmFjdENsaUNvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChjbGlDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5jbGkgPSBjbGlDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHNjaGVtYXRpY3NDb25maWcgPSBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChzY2hlbWF0aWNzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuc2NoZW1hdGljcyA9IHNjaGVtYXRpY3NDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IGFyY2hpdGVjdENvbmZpZyA9IGV4dHJhY3RBcmNoaXRlY3RDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoYXJjaGl0ZWN0Q29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0Q29uZmlnO1xuICAgIH1cblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFJlbW92aW5nIG9sZCBjb25maWcgZmlsZSAoJHtvbGRDb25maWdQYXRofSlgKTtcbiAgICBob3N0LmRlbGV0ZShvbGRDb25maWdQYXRoKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBXcml0aW5nIGNvbmZpZyBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuY3JlYXRlKGNvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RDbGlDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGNvbnN0IG5ld0NvbmZpZzogSnNvbk9iamVjdCA9IHt9O1xuICBpZiAoY29uZmlnLnBhY2thZ2VNYW5hZ2VyICYmIGNvbmZpZy5wYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgbmV3Q29uZmlnWydwYWNrYWdlTWFuYWdlciddID0gY29uZmlnLnBhY2thZ2VNYW5hZ2VyO1xuICB9XG5cbiAgcmV0dXJuIG5ld0NvbmZpZztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGxldCBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZy5kZWZhdWx0cykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIGNvbnN0IGNvbmZpZ0RlZmF1bHRzID0gY29uZmlnLmRlZmF1bHRzO1xuICBpZiAoY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb24pIHtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogRm9yIGVhY2ggc2NoZW1hdGljXG4gICAqICAtIGdldCB0aGUgY29uZmlnXG4gICAqICAtIGZpbHRlciBvbmUncyB3aXRob3V0IGNvbmZpZ1xuICAgKiAgLSBjb21iaW5lIHRoZW0gaW50byBhbiBvYmplY3RcbiAgICovXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgY29uc3Qgc2NoZW1hdGljQ29uZmlnczogYW55ID0gWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpbnRlcmZhY2UnLCAnbW9kdWxlJywgJ3BpcGUnLCAnc2VydmljZSddXG4gICAgLm1hcChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHRzOiBKc29uT2JqZWN0ID0gKGNvbmZpZy5kZWZhdWx0cyBhcyBhbnkpW3NjaGVtYXRpY05hbWVdIHx8IG51bGw7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbmZpZzogc2NoZW1hdGljRGVmYXVsdHMsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihzY2hlbWF0aWMgPT4gc2NoZW1hdGljLmNvbmZpZyAhPT0gbnVsbClcbiAgICAucmVkdWNlKChhbGw6IEpzb25PYmplY3QsIHNjaGVtYXRpYykgPT4ge1xuICAgICAgYWxsW2NvbGxlY3Rpb25OYW1lICsgJzonICsgc2NoZW1hdGljLnNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLmNvbmZpZztcblxuICAgICAgcmV0dXJuIGFsbDtcbiAgICB9LCB7fSk7XG5cbiAgY29uc3QgY29tcG9uZW50VXBkYXRlOiBKc29uT2JqZWN0ID0ge307XG4gIGNvbXBvbmVudFVwZGF0ZS5wcmVmaXggPSAnJztcblxuICBjb25zdCBjb21wb25lbnRLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6Y29tcG9uZW50JztcbiAgY29uc3QgZGlyZWN0aXZlS2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmRpcmVjdGl2ZSc7XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldID0ge307XG4gIH1cbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0gPSB7fTtcbiAgfVxuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gIH1cbiAgaWYgKGNvbmZpZy5kZWZhdWx0cykge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5zdHlsZWV4dCA9IGNvbmZpZy5kZWZhdWx0cy5zdHlsZUV4dDtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWF0aWNDb25maWdzO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKF9jb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhjb25maWc6IENsaUNvbmZpZywgdHJlZTogVHJlZSk6IEpzb25PYmplY3Qge1xuICBjb25zdCBidWlsZGVyUGFja2FnZSA9ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG4gIGxldCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9ICdhcHAnO1xuICBpZiAoY29uZmlnLnByb2plY3QgJiYgY29uZmlnLnByb2plY3QubmFtZSkge1xuICAgIGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gY29uZmlnLnByb2plY3QubmFtZTtcbiAgfVxuXG4gIGNvbnN0IGJ1aWxkRGVmYXVsdHM6IEpzb25PYmplY3QgPSBjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLmJ1aWxkXG4gICAgPyB7XG4gICAgICBzb3VyY2VNYXA6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5zb3VyY2VtYXBzLFxuICAgICAgcHJvZ3Jlc3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcm9ncmVzcyxcbiAgICAgIHBvbGw6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wb2xsLFxuICAgICAgZGVsZXRlT3V0cHV0UGF0aDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLmRlbGV0ZU91dHB1dFBhdGgsXG4gICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucHJlc2VydmVTeW1saW5rcyxcbiAgICAgIHNob3dDaXJjdWxhckRlcGVuZGVuY2llczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNob3dDaXJjdWxhckRlcGVuZGVuY2llcyxcbiAgICAgIGNvbW1vbkNodW5rOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuY29tbW9uQ2h1bmssXG4gICAgICBuYW1lZENodW5rczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLm5hbWVkQ2h1bmtzLFxuICAgIH0gYXMgSnNvbk9iamVjdFxuICAgIDoge307XG5cbiAgY29uc3Qgc2VydmVEZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuc2VydmVcbiAgICA/IHtcbiAgICAgIHBvcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wb3J0LFxuICAgICAgaG9zdDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLmhvc3QsXG4gICAgICBzc2w6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2wsXG4gICAgICBzc2xLZXk6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xLZXksXG4gICAgICBzc2xDZXJ0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsQ2VydCxcbiAgICAgIHByb3h5Q29uZmlnOiBjb25maWcuZGVmYXVsdHMuc2VydmUucHJveHlDb25maWcsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuXG4gIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgLy8gY29udmVydCB0aGUgYXBwcyB0byBwcm9qZWN0c1xuICBjb25zdCBicm93c2VyQXBwcyA9IGFwcHMuZmlsdGVyKGFwcCA9PiBhcHAucGxhdGZvcm0gIT09ICdzZXJ2ZXInKTtcbiAgY29uc3Qgc2VydmVyQXBwcyA9IGFwcHMuZmlsdGVyKGFwcCA9PiBhcHAucGxhdGZvcm0gPT09ICdzZXJ2ZXInKTtcblxuICBjb25zdCBwcm9qZWN0TWFwID0gYnJvd3NlckFwcHNcbiAgICAubWFwKChhcHAsIGlkeCkgPT4ge1xuICAgICAgY29uc3QgZGVmYXVsdEFwcE5hbWUgPSBpZHggPT09IDAgPyBkZWZhdWx0QXBwTmFtZVByZWZpeCA6IGAke2RlZmF1bHRBcHBOYW1lUHJlZml4fSR7aWR4fWA7XG4gICAgICBjb25zdCBuYW1lID0gYXBwLm5hbWUgfHwgZGVmYXVsdEFwcE5hbWU7XG4gICAgICBjb25zdCBvdXREaXIgPSBhcHAub3V0RGlyIHx8IGRlZmF1bHRzLm91dERpcjtcbiAgICAgIGNvbnN0IGFwcFJvb3QgPSBhcHAucm9vdCB8fCBkZWZhdWx0cy5hcHBSb290O1xuXG4gICAgICBmdW5jdGlvbiBfbWFwQXNzZXRzKGFzc2V0OiBzdHJpbmcgfCBKc29uT2JqZWN0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXNzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgaWYgKHRyZWUuZXhpc3RzKGFwcC5yb290ICsgJy8nICsgYXNzZXQpKSB7XG4gICAgICAgICAgICAvLyBJZiBpdCBleGlzdHMgaW4gdGhlIHRyZWUsIHRoZW4gaXQgaXMgYSBmaWxlLlxuICAgICAgICAgICAgcmV0dXJuIHsgZ2xvYjogYXNzZXQsIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyksIG91dHB1dDogJy8nIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIGl0IGRvZXMgbm90IGV4aXN0LCBpdCBpcyBlaXRoZXIgYSBmb2xkZXIgb3Igc29tZXRoaW5nIHdlIGNhbid0IHN0YXRpY2FsbHkga25vdy5cbiAgICAgICAgICAgIC8vIEZvbGRlcnMgbXVzdCBnZXQgYSByZWN1cnNpdmUgc3RhciBnbG9iLlxuICAgICAgICAgICAgcmV0dXJuIHsgZ2xvYjogJyoqLyonLCBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldCksIG91dHB1dDogJy8nICsgYXNzZXQgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGFzc2V0Lm91dHB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICAgICAgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQuaW5wdXQpLFxuICAgICAgICAgICAgICBvdXRwdXQ6IG5vcm1hbGl6ZSgnLycgKyBhc3NldC5vdXRwdXQgYXMgc3RyaW5nKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfYnVpbGRDb25maWd1cmF0aW9ucygpOiBKc29uT2JqZWN0IHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gYXBwLmVudmlyb25tZW50U291cmNlO1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuICAgICAgICBjb25zdCBzZXJ2aWNlV29ya2VyID0gYXBwLnNlcnZpY2VXb3JrZXI7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5yZWR1Y2UoKGFjYywgZW52aXJvbm1lbnQpID0+IHtcbiAgICAgICAgICBpZiAoc291cmNlID09PSBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBpc1Byb2R1Y3Rpb24gPSBmYWxzZTtcblxuICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50Q29udGVudCA9IHRyZWUucmVhZChhcHAucm9vdCArICcvJyArIGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pO1xuICAgICAgICAgIGlmIChlbnZpcm9ubWVudENvbnRlbnQpIHtcbiAgICAgICAgICAgIGlzUHJvZHVjdGlvbiA9ICEhZW52aXJvbm1lbnRDb250ZW50LnRvU3RyaW5nKCd1dGYtOCcpXG4gICAgICAgICAgICAgIC8vIEFsbG93IGZvciBgcHJvZHVjdGlvbjogdHJ1ZWAgb3IgYHByb2R1Y3Rpb24gPSB0cnVlYC4gQmVzdCB3ZSBjYW4gZG8gdG8gZ3Vlc3MuXG4gICAgICAgICAgICAgIC5tYXRjaCgvcHJvZHVjdGlvblsnXCJdP1xccypbOj1dXFxzKnRydWUvKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgY29uZmlndXJhdGlvbk5hbWU7XG4gICAgICAgICAgLy8gV2UgdXNlZCB0byB1c2UgYHByb2RgIGJ5IGRlZmF1bHQgYXMgdGhlIGtleSwgaW5zdGVhZCB3ZSBub3cgdXNlIHRoZSBmdWxsIHdvcmQuXG4gICAgICAgICAgLy8gVHJ5IG5vdCB0byBvdmVycmlkZSB0aGUgcHJvZHVjdGlvbiBrZXkgaWYgaXQncyB0aGVyZS5cbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnQgPT0gJ3Byb2QnICYmICFlbnZpcm9ubWVudHNbJ3Byb2R1Y3Rpb24nXSAmJiBpc1Byb2R1Y3Rpb24pIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9IGVudmlyb25tZW50O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGFjY1tjb25maWd1cmF0aW9uTmFtZV0gPSB7XG4gICAgICAgICAgICAuLi4oaXNQcm9kdWN0aW9uXG4gICAgICAgICAgICAgID8ge1xuICAgICAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiB0cnVlLFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIDoge31cbiAgICAgICAgICAgICksXG4gICAgICAgICAgICAuLi4oaXNQcm9kdWN0aW9uICYmIHNlcnZpY2VXb3JrZXIgPyB7IHNlcnZpY2VXb3JrZXI6IHRydWUgfSA6IHt9KSxcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlcGxhY2U6IGAke2FwcC5yb290fS8ke3NvdXJjZX1gLFxuICAgICAgICAgICAgICAgIHdpdGg6IGAke2FwcC5yb290fS8ke2Vudmlyb25tZW50c1tlbnZpcm9ubWVudF19YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfc2VydmVDb25maWd1cmF0aW9ucygpOiBKc29uT2JqZWN0IHtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcblxuICAgICAgICBpZiAoIWVudmlyb25tZW50cykge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyY2hpdGVjdCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbnMgPSAoYXJjaGl0ZWN0LmJ1aWxkIGFzIEpzb25PYmplY3QpLmNvbmZpZ3VyYXRpb25zIGFzIEpzb25PYmplY3Q7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbmZpZ3VyYXRpb25zKS5yZWR1Y2UoKGFjYywgZW52aXJvbm1lbnQpID0+IHtcbiAgICAgICAgICBhY2NbZW52aXJvbm1lbnRdID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZDoke2Vudmlyb25tZW50fWAgfTtcblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfZXh0cmFFbnRyeU1hcHBlcihleHRyYUVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0KSB7XG4gICAgICAgIGxldCBlbnRyeTogc3RyaW5nIHwgSnNvbk9iamVjdDtcbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYUVudHJ5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGVudHJ5ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeS5pbnB1dCBhcyBzdHJpbmcgfHwgJycpO1xuICAgICAgICAgIGVudHJ5ID0geyBpbnB1dCwgbGF6eTogZXh0cmFFbnRyeS5sYXp5IH07XG5cbiAgICAgICAgICBpZiAoZXh0cmFFbnRyeS5vdXRwdXQpIHtcbiAgICAgICAgICAgIGVudHJ5LmJ1bmRsZU5hbWUgPSBleHRyYUVudHJ5Lm91dHB1dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6ICcnLFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuICAgICAgcHJvamVjdC5hcmNoaXRlY3QgPSBhcmNoaXRlY3Q7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGAke2FwcFJvb3R9LyR7YXBwLmluZGV4IHx8IGRlZmF1bHRzLmluZGV4fWAsXG4gICAgICAgIG1haW46IGAke2FwcFJvb3R9LyR7YXBwLm1haW4gfHwgZGVmYXVsdHMubWFpbn1gLFxuICAgICAgICB0c0NvbmZpZzogYCR7YXBwUm9vdH0vJHthcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWd9YCxcbiAgICAgICAgLi4uYnVpbGREZWZhdWx0cyxcbiAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgYnVpbGRPcHRpb25zLmFzc2V0cyA9IChhcHAuYXNzZXRzIHx8IFtdKS5tYXAoX21hcEFzc2V0cyk7XG4gICAgICBidWlsZE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBidWlsZE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGFyY2hpdGVjdC5idWlsZCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmJyb3dzZXJgLFxuICAgICAgICBvcHRpb25zOiBidWlsZE9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfYnVpbGRDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gU2VydmUgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCxcbiAgICAgICAgLi4uc2VydmVEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3Quc2VydmUgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpkZXYtc2VydmVyYCxcbiAgICAgICAgb3B0aW9uczogc2VydmVPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX3NlcnZlQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgdGFyZ2V0XG4gICAgICBjb25zdCBleHRyYWN0STE4bk9wdGlvbnM6IEpzb25PYmplY3QgPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCB9O1xuICAgICAgYXJjaGl0ZWN0WydleHRyYWN0LWkxOG4nXSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmV4dHJhY3QtaTE4bmAsXG4gICAgICAgIG9wdGlvbnM6IGV4dHJhY3RJMThuT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGthcm1hQ29uZmlnID0gY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWFcbiAgICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZyB8fCAnJ1xuICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRlc3QgdGFyZ2V0XG4gICAgICBjb25zdCB0ZXN0T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBtYWluOiBhcHBSb290ICsgJy8nICsgYXBwLnRlc3QgfHwgZGVmYXVsdHMudGVzdCxcbiAgICAgICAgICAvLyBNYWtlIGthcm1hQ29uZmlnIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgICAga2FybWFDb25maWcsXG4gICAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIHRlc3RPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnRlc3RUc2NvbmZpZykge1xuICAgICAgICAgIHRlc3RPcHRpb25zLnRzQ29uZmlnID0gYXBwUm9vdCArICcvJyArIGFwcC50ZXN0VHNjb25maWc7XG4gICAgICAgIH1cbiAgICAgIHRlc3RPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLmFzc2V0cyA9IChhcHAuYXNzZXRzIHx8IFtdKS5tYXAoX21hcEFzc2V0cyk7XG5cbiAgICAgIGlmIChrYXJtYUNvbmZpZykge1xuICAgICAgICBhcmNoaXRlY3QudGVzdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06a2FybWFgLFxuICAgICAgICAgIG9wdGlvbnM6IHRlc3RPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCBleGNsdWRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmxpbnQgJiYgQXJyYXkuaXNBcnJheShjb25maWcubGludCkpIHtcbiAgICAgICAgY29uZmlnLmxpbnQuZm9yRWFjaChsaW50ID0+IHtcbiAgICAgICAgICB0c0NvbmZpZ3MucHVzaChsaW50LnByb2plY3QpO1xuICAgICAgICAgIGlmIChsaW50LmV4Y2x1ZGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGludC5leGNsdWRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBleGNsdWRlcy5wdXNoKGxpbnQuZXhjbHVkZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsaW50LmV4Y2x1ZGUuZm9yRWFjaChleCA9PiBleGNsdWRlcy5wdXNoKGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVtb3ZlRHVwZXMgPSAoaXRlbXM6IHN0cmluZ1tdKSA9PiBpdGVtcy5yZWR1Y2UoKG5ld0l0ZW1zLCBpdGVtKSA9PiB7XG4gICAgICAgIGlmIChuZXdJdGVtcy5pbmRleE9mKGl0ZW0pID09PSAtMSkge1xuICAgICAgICAgIG5ld0l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3SXRlbXM7XG4gICAgICB9LCA8c3RyaW5nW10+IFtdKTtcblxuICAgICAgICAvLyBUc2xpbnQgdGFyZ2V0XG4gICAgICBjb25zdCBsaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSA9PT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LmxpbnQgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgICAgb3B0aW9uczogbGludE9wdGlvbnMsXG4gICAgICAgIH07XG5cbiAgICAgIC8vIHNlcnZlciB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlckFwcCA9IHNlcnZlckFwcHNcbiAgICAgICAgLmZpbHRlcihzZXJ2ZXJBcHAgPT4gYXBwLnJvb3QgPT09IHNlcnZlckFwcC5yb290ICYmIGFwcC5pbmRleCA9PT0gc2VydmVyQXBwLmluZGV4KVswXTtcblxuICAgICAgaWYgKHNlcnZlckFwcCkge1xuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG91dHB1dFBhdGg6IHNlcnZlckFwcC5vdXREaXIgfHwgZGVmYXVsdHMuc2VydmVyT3V0RGlyLFxuICAgICAgICAgIG1haW46IHNlcnZlckFwcC5tYWluIHx8IGRlZmF1bHRzLnNlcnZlck1haW4sXG4gICAgICAgICAgdHNDb25maWc6IHNlcnZlckFwcC50c2NvbmZpZyB8fCBkZWZhdWx0cy5zZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2VydmVyVGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpzZXJ2ZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHNlcnZlck9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICAgIGFyY2hpdGVjdC5zZXJ2ZXIgPSBzZXJ2ZXJUYXJnZXQ7XG4gICAgICB9XG4gICAgICBjb25zdCBlMmVQcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiBwcm9qZWN0LnJvb3QsXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgICBjbGk6IHt9LFxuICAgICAgICBzY2hlbWF0aWNzOiB7fSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGUyZUFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICBjb25zdCBwcm90cmFjdG9yQ29uZmlnID0gY29uZmlnICYmIGNvbmZpZy5lMmUgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yICYmIGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgPyBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgIDogJyc7XG4gICAgICBjb25zdCBlMmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBwcm90cmFjdG9yQ29uZmlnLFxuICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke25hbWV9OnNlcnZlYCxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpwcm90cmFjdG9yYCxcbiAgICAgICAgb3B0aW9uczogZTJlT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGUyZUFyY2hpdGVjdC5lMmUgPSBlMmVUYXJnZXQ7XG4gICAgICBjb25zdCBlMmVMaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSAhPT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlTGludFRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgIG9wdGlvbnM6IGUyZUxpbnRPcHRpb25zLFxuICAgICAgfTtcbiAgICAgIGUyZUFyY2hpdGVjdC5saW50ID0gZTJlTGludFRhcmdldDtcbiAgICAgIGlmIChwcm90cmFjdG9yQ29uZmlnKSB7XG4gICAgICAgIGUyZVByb2plY3QuYXJjaGl0ZWN0ID0gZTJlQXJjaGl0ZWN0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0IH07XG4gICAgfSlcbiAgICAucmVkdWNlKChwcm9qZWN0cywgbWFwcGVkQXBwKSA9PiB7XG4gICAgICBjb25zdCB7bmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdH0gPSBtYXBwZWRBcHA7XG4gICAgICBwcm9qZWN0c1tuYW1lXSA9IHByb2plY3Q7XG4gICAgICBwcm9qZWN0c1tuYW1lICsgJy1lMmUnXSA9IGUyZVByb2plY3Q7XG5cbiAgICAgIHJldHVybiBwcm9qZWN0cztcbiAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcblxuICByZXR1cm4gcHJvamVjdE1hcDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgICBhcHBzLmZvckVhY2goKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgdHNTcGVjQ29uZmlnUGF0aCA9XG4gICAgICAgIGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgYXBwLnRlc3RUc2NvbmZpZyB8fCBkZWZhdWx0cy50ZXN0VHNDb25maWcpO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzU3BlY0NvbmZpZ1BhdGgpO1xuICAgICAgaWYgKCFidWZmZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNDZmcgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKTtcbiAgICAgIGlmICghdHNDZmcuZmlsZXMpIHtcbiAgICAgICAgdHNDZmcuZmlsZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gRW5zdXJlIHRoZSBzcGVjIHRzY29uZmlnIGNvbnRhaW5zIHRoZSBwb2x5ZmlsbHMgZmlsZVxuICAgICAgaWYgKHRzQ2ZnLmZpbGVzLmluZGV4T2YoYXBwLnBvbHlmaWxscyB8fCBkZWZhdWx0cy5wb2x5ZmlsbHMpID09PSAtMSkge1xuICAgICAgICB0c0NmZy5maWxlcy5wdXNoKGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUodHNTcGVjQ29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkodHNDZmcsIG51bGwsIDIpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUGFja2FnZUpzb24ocGFja2FnZU1hbmFnZXI/OiBzdHJpbmcpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgcGtnUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnUGF0aCk7XG4gICAgaWYgKGJ1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IHJlYWQgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuXG4gICAgaWYgKHBrZyA9PT0gbnVsbCB8fCB0eXBlb2YgcGtnICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHBrZykpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdFcnJvciByZWFkaW5nIHBhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBpZiAoIXBrZy5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIHBrZy5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBwa2cuZGV2RGVwZW5kZW5jaWVzWydAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhciddID0gbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyO1xuXG4gICAgaG9zdC5vdmVyd3JpdGUocGtnUGF0aCwgSlNPTi5zdHJpbmdpZnkocGtnLCBudWxsLCAyKSk7XG5cbiAgICBpZiAocGFja2FnZU1hbmFnZXIgJiYgIVsnbnBtJywgJ3lhcm4nLCAnY25wbSddLmluY2x1ZGVzKHBhY2thZ2VNYW5hZ2VyKSkge1xuICAgICAgcGFja2FnZU1hbmFnZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayh7IHBhY2thZ2VNYW5hZ2VyIH0pKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0xpbnRDb25maWcoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRzTGludFBhdGggPSAnL3RzbGludC5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNMaW50UGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdHNDZmcgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKTtcblxuICAgIGlmICh0c0NmZy5ydWxlcyAmJiB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddICYmXG4gICAgICAgIHRzQ2ZnLnJ1bGVzWydpbXBvcnQtYmxhY2tsaXN0J10uaW5kZXhPZigncnhqcycpICE9PSAtMSkge1xuXG4gICAgICB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddID0gdHNDZmcucnVsZXNbJ2ltcG9ydC1ibGFja2xpc3QnXVxuICAgICAgICAuZmlsdGVyKChydWxlOiBzdHJpbmcgfCBib29sZWFuKSA9PiBydWxlICE9PSAncnhqcycpO1xuXG4gICAgICBob3N0Lm92ZXJ3cml0ZSh0c0xpbnRQYXRoLCBKU09OLnN0cmluZ2lmeSh0c0NmZywgbnVsbCwgMikpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ0J1ZmZlciA9IGhvc3QucmVhZChub3JtYWxpemUoY29uZmlnUGF0aCkpO1xuICAgIGlmIChjb25maWdCdWZmZXIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICB9XG4gICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShjb25maWdCdWZmZXIudG9TdHJpbmcoKSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWcpLFxuICAgICAgbWlncmF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWcpLFxuICAgICAgdXBkYXRlUGFja2FnZUpzb24oY29uZmlnLnBhY2thZ2VNYW5hZ2VyKSxcbiAgICAgIHVwZGF0ZVRzTGludENvbmZpZygpLFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19