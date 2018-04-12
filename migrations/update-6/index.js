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
                            src: `${app.root}/${source}`,
                            replaceWith: `${app.root}/${environments[environment]}`,
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
                entry = { input: core_1.join(app.root, extraEntry) };
            }
            else {
                const input = core_1.join(app.root, extraEntry.input || '');
                const lazy = !!extraEntry.lazy;
                entry = { input };
                if (!extraEntry.output && lazy) {
                    entry.lazy = true;
                    entry.bundleName = core_1.basename(core_1.normalize(input.replace(/\.(js|css|scss|sass|less|styl)$/i, '')));
                }
                else if (extraEntry.output) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQW1GO0FBQ25GLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsbUVBQStEO0FBRS9ELE1BQU0sUUFBUSxHQUFHO0lBQ2YsT0FBTyxFQUFFLEtBQUs7SUFDZCxLQUFLLEVBQUUsWUFBWTtJQUNuQixJQUFJLEVBQUUsU0FBUztJQUNmLFNBQVMsRUFBRSxjQUFjO0lBQ3pCLFFBQVEsRUFBRSxtQkFBbUI7SUFDN0IsSUFBSSxFQUFFLFNBQVM7SUFDZixNQUFNLEVBQUUsT0FBTztJQUNmLEtBQUssRUFBRSxlQUFlO0lBQ3RCLFVBQVUsRUFBRSxvQkFBb0I7SUFDaEMsWUFBWSxFQUFFLG9CQUFvQjtJQUNsQyxZQUFZLEVBQUUsYUFBYTtJQUMzQixVQUFVLEVBQUUsZ0JBQWdCO0lBQzVCLGNBQWMsRUFBRSxzQkFBc0I7Q0FDdkMsQ0FBQztBQUVGLHVCQUF1QixJQUFVO0lBQy9CLElBQUksWUFBWSxHQUFHLGdCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNsRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxtQ0FB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Q1gseUJBQXlCLENBQUMsTUFBTSxDQUFDO1lBQ2pDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQztZQUM1QixrQkFBa0IsQ0FBQyxNQUFNLENBQUM7WUFDMUIsaUJBQWlCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztZQUN4QyxrQkFBa0IsRUFBRTtTQUNyQixDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFqQkQsNEJBaUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgSnNvbk9iamVjdCwgUGF0aCwgYmFzZW5hbWUsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBDbGlDb25maWcgfSBmcm9tICcuLi8uLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcblxuY29uc3QgZGVmYXVsdHMgPSB7XG4gIGFwcFJvb3Q6ICdzcmMnLFxuICBpbmRleDogJ2luZGV4Lmh0bWwnLFxuICBtYWluOiAnbWFpbi50cycsXG4gIHBvbHlmaWxsczogJ3BvbHlmaWxscy50cycsXG4gIHRzQ29uZmlnOiAndHNjb25maWcuYXBwLmpzb24nLFxuICB0ZXN0OiAndGVzdC50cycsXG4gIG91dERpcjogJ2Rpc3QvJyxcbiAga2FybWE6ICdrYXJtYS5jb25mLmpzJyxcbiAgcHJvdHJhY3RvcjogJ3Byb3RyYWN0b3IuY29uZi5qcycsXG4gIHRlc3RUc0NvbmZpZzogJ3RzY29uZmlnLnNwZWMuanNvbicsXG4gIHNlcnZlck91dERpcjogJ2Rpc3Qtc2VydmVyJyxcbiAgc2VydmVyTWFpbjogJ21haW4uc2VydmVyLnRzJyxcbiAgc2VydmVyVHNDb25maWc6ICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicsXG59O1xuXG5mdW5jdGlvbiBnZXRDb25maWdQYXRoKHRyZWU6IFRyZWUpOiBQYXRoIHtcbiAgbGV0IHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnLmFuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG4gIHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cblxuICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlJyk7XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcga2FybWEgY29uZmlndXJhdGlvbmApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBrYXJtYVBhdGggPSBjb25maWcgJiYgY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWEgJiYgY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgIDogZGVmYXVsdHMua2FybWE7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQoa2FybWFQYXRoKTtcbiAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSggL0Bhbmd1bGFyXFwvY2xpL2csICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCdyZXBvcnRzJyxcbiAgICAgICAgICBgZGlyOiByZXF1aXJlKCdwYXRoJykuam9pbihfX2Rpcm5hbWUsICdjb3ZlcmFnZScpLCByZXBvcnRzYCk7XG4gICAgICAgIGhvc3Qub3ZlcndyaXRlKGthcm1hUGF0aCwgY29udGVudCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkgeyB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUNvbmZpZ3VyYXRpb24ob2xkQ29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgb2xkQ29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci5qc29uJyk7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcgY29uZmlndXJhdGlvbmApO1xuICAgIGNvbnN0IGNvbmZpZzogSnNvbk9iamVjdCA9IHtcbiAgICAgICckc2NoZW1hJzogJy4vbm9kZV9tb2R1bGVzL0Bhbmd1bGFyLWRldmtpdC9jb3JlL3NyYy93b3Jrc3BhY2Uvd29ya3NwYWNlLXNjaGVtYS5qc29uJyxcbiAgICAgIHZlcnNpb246IDEsXG4gICAgICBuZXdQcm9qZWN0Um9vdDogJ3Byb2plY3RzJyxcbiAgICAgIHByb2plY3RzOiBleHRyYWN0UHJvamVjdHNDb25maWcob2xkQ29uZmlnLCBob3N0KSxcbiAgICB9O1xuICAgIGNvbnN0IGNsaUNvbmZpZyA9IGV4dHJhY3RDbGlDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoY2xpQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuY2xpID0gY2xpQ29uZmlnO1xuICAgIH1cbiAgICBjb25zdCBzY2hlbWF0aWNzQ29uZmlnID0gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoc2NoZW1hdGljc0NvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLnNjaGVtYXRpY3MgPSBzY2hlbWF0aWNzQ29uZmlnO1xuICAgIH1cbiAgICBjb25zdCBhcmNoaXRlY3RDb25maWcgPSBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGFyY2hpdGVjdENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmFyY2hpdGVjdCA9IGFyY2hpdGVjdENvbmZpZztcbiAgICB9XG5cbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBSZW1vdmluZyBvbGQgY29uZmlnIGZpbGUgKCR7b2xkQ29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5kZWxldGUob2xkQ29uZmlnUGF0aCk7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgV3JpdGluZyBjb25maWcgZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICBob3N0LmNyZWF0ZShjb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0Q2xpQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICBjb25zdCBuZXdDb25maWc6IEpzb25PYmplY3QgPSB7fTtcbiAgaWYgKGNvbmZpZy5wYWNrYWdlTWFuYWdlciAmJiBjb25maWcucGFja2FnZU1hbmFnZXIgIT09ICdkZWZhdWx0Jykge1xuICAgIG5ld0NvbmZpZ1sncGFja2FnZU1hbmFnZXInXSA9IGNvbmZpZy5wYWNrYWdlTWFuYWdlcjtcbiAgfVxuXG4gIHJldHVybiBuZXdDb25maWc7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICBsZXQgY29sbGVjdGlvbk5hbWUgPSAnQHNjaGVtYXRpY3MvYW5ndWxhcic7XG4gIGlmICghY29uZmlnIHx8ICFjb25maWcuZGVmYXVsdHMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyBjb25zdCBjb25maWdEZWZhdWx0cyA9IGNvbmZpZy5kZWZhdWx0cztcbiAgaWYgKGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcyAmJiBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcy5jb2xsZWN0aW9uKSB7XG4gICAgY29sbGVjdGlvbk5hbWUgPSBjb25maWcuZGVmYXVsdHMuc2NoZW1hdGljcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvciBlYWNoIHNjaGVtYXRpY1xuICAgKiAgLSBnZXQgdGhlIGNvbmZpZ1xuICAgKiAgLSBmaWx0ZXIgb25lJ3Mgd2l0aG91dCBjb25maWdcbiAgICogIC0gY29tYmluZSB0aGVtIGludG8gYW4gb2JqZWN0XG4gICAqL1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gIGNvbnN0IHNjaGVtYXRpY0NvbmZpZ3M6IGFueSA9IFsnY2xhc3MnLCAnY29tcG9uZW50JywgJ2RpcmVjdGl2ZScsICdndWFyZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnaW50ZXJmYWNlJywgJ21vZHVsZScsICdwaXBlJywgJ3NlcnZpY2UnXVxuICAgIC5tYXAoc2NoZW1hdGljTmFtZSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgICBjb25zdCBzY2hlbWF0aWNEZWZhdWx0czogSnNvbk9iamVjdCA9IChjb25maWcuZGVmYXVsdHMgYXMgYW55KVtzY2hlbWF0aWNOYW1lXSB8fCBudWxsO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzY2hlbWF0aWNOYW1lLFxuICAgICAgICBjb25maWc6IHNjaGVtYXRpY0RlZmF1bHRzLFxuICAgICAgfTtcbiAgICB9KVxuICAgIC5maWx0ZXIoc2NoZW1hdGljID0+IHNjaGVtYXRpYy5jb25maWcgIT09IG51bGwpXG4gICAgLnJlZHVjZSgoYWxsOiBKc29uT2JqZWN0LCBzY2hlbWF0aWMpID0+IHtcbiAgICAgIGFsbFtjb2xsZWN0aW9uTmFtZSArICc6JyArIHNjaGVtYXRpYy5zY2hlbWF0aWNOYW1lXSA9IHNjaGVtYXRpYy5jb25maWc7XG5cbiAgICAgIHJldHVybiBhbGw7XG4gICAgfSwge30pO1xuXG4gIGNvbnN0IGNvbXBvbmVudFVwZGF0ZTogSnNvbk9iamVjdCA9IHt9O1xuICBjb21wb25lbnRVcGRhdGUucHJlZml4ID0gJyc7XG5cbiAgY29uc3QgY29tcG9uZW50S2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmNvbXBvbmVudCc7XG4gIGNvbnN0IGRpcmVjdGl2ZUtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpkaXJlY3RpdmUnO1xuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XSA9IHt9O1xuICB9XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldID0ge307XG4gIH1cbiAgaWYgKGNvbmZpZy5hcHBzICYmIGNvbmZpZy5hcHBzWzBdKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICB9XG4gIGlmIChjb25maWcuZGVmYXVsdHMpIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0uc3R5bGVleHQgPSBjb25maWcuZGVmYXVsdHMuc3R5bGVFeHQ7XG4gIH1cblxuICByZXR1cm4gc2NoZW1hdGljQ29uZmlncztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhfY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0UHJvamVjdHNDb25maWcoY29uZmlnOiBDbGlDb25maWcsIHRyZWU6IFRyZWUpOiBKc29uT2JqZWN0IHtcbiAgY29uc3QgYnVpbGRlclBhY2thZ2UgPSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuICBsZXQgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSAnYXBwJztcbiAgaWYgKGNvbmZpZy5wcm9qZWN0ICYmIGNvbmZpZy5wcm9qZWN0Lm5hbWUpIHtcbiAgICBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGNvbmZpZy5wcm9qZWN0Lm5hbWU7XG4gIH1cblxuICBjb25zdCBidWlsZERlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5idWlsZFxuICAgID8ge1xuICAgICAgc291cmNlTWFwOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc291cmNlbWFwcyxcbiAgICAgIHByb2dyZXNzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucHJvZ3Jlc3MsXG4gICAgICBwb2xsOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucG9sbCxcbiAgICAgIGRlbGV0ZU91dHB1dFBhdGg6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5kZWxldGVPdXRwdXRQYXRoLFxuICAgICAgcHJlc2VydmVTeW1saW5rczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByZXNlcnZlU3ltbGlua3MsXG4gICAgICBzaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXM6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5zaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXMsXG4gICAgICBjb21tb25DaHVuazogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLmNvbW1vbkNodW5rLFxuICAgICAgbmFtZWRDaHVua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5uYW1lZENodW5rcyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG4gIGNvbnN0IHNlcnZlRGVmYXVsdHM6IEpzb25PYmplY3QgPSBjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNlcnZlXG4gICAgPyB7XG4gICAgICBwb3J0OiBjb25maWcuZGVmYXVsdHMuc2VydmUucG9ydCxcbiAgICAgIGhvc3Q6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5ob3N0LFxuICAgICAgc3NsOiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsLFxuICAgICAgc3NsS2V5OiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsS2V5LFxuICAgICAgc3NsQ2VydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbENlcnQsXG4gICAgICBwcm94eUNvbmZpZzogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnByb3h5Q29uZmlnLFxuICAgIH0gYXMgSnNvbk9iamVjdFxuICAgIDoge307XG5cblxuICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gIC8vIGNvbnZlcnQgdGhlIGFwcHMgdG8gcHJvamVjdHNcbiAgY29uc3QgYnJvd3NlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtICE9PSAnc2VydmVyJyk7XG4gIGNvbnN0IHNlcnZlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtID09PSAnc2VydmVyJyk7XG5cbiAgY29uc3QgcHJvamVjdE1hcCA9IGJyb3dzZXJBcHBzXG4gICAgLm1hcCgoYXBwLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IGRlZmF1bHRBcHBOYW1lID0gaWR4ID09PSAwID8gZGVmYXVsdEFwcE5hbWVQcmVmaXggOiBgJHtkZWZhdWx0QXBwTmFtZVByZWZpeH0ke2lkeH1gO1xuICAgICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lIHx8IGRlZmF1bHRBcHBOYW1lO1xuICAgICAgY29uc3Qgb3V0RGlyID0gYXBwLm91dERpciB8fCBkZWZhdWx0cy5vdXREaXI7XG4gICAgICBjb25zdCBhcHBSb290ID0gYXBwLnJvb3QgfHwgZGVmYXVsdHMuYXBwUm9vdDtcblxuICAgICAgZnVuY3Rpb24gX21hcEFzc2V0cyhhc3NldDogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBpZiAodHlwZW9mIGFzc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGlmICh0cmVlLmV4aXN0cyhhcHAucm9vdCArICcvJyArIGFzc2V0KSkge1xuICAgICAgICAgICAgLy8gSWYgaXQgZXhpc3RzIGluIHRoZSB0cmVlLCB0aGVuIGl0IGlzIGEgZmlsZS5cbiAgICAgICAgICAgIHJldHVybiB7IGdsb2I6IGFzc2V0LCBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycpLCBvdXRwdXQ6ICcvJyB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBpdCBkb2VzIG5vdCBleGlzdCwgaXQgaXMgZWl0aGVyIGEgZm9sZGVyIG9yIHNvbWV0aGluZyB3ZSBjYW4ndCBzdGF0aWNhbGx5IGtub3cuXG4gICAgICAgICAgICAvLyBGb2xkZXJzIG11c3QgZ2V0IGEgcmVjdXJzaXZlIHN0YXIgZ2xvYi5cbiAgICAgICAgICAgIHJldHVybiB7IGdsb2I6ICcqKi8qJywgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQpLCBvdXRwdXQ6ICcvJyArIGFzc2V0IH07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChhc3NldC5vdXRwdXQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiBub3JtYWxpemUoJy8nICsgYXNzZXQub3V0cHV0IGFzIHN0cmluZyksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2J1aWxkQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGFwcC5lbnZpcm9ubWVudFNvdXJjZTtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcbiAgICAgICAgY29uc3Qgc2VydmljZVdvcmtlciA9IGFwcC5zZXJ2aWNlV29ya2VyO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGVudmlyb25tZW50cykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZSA9PT0gZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSkge1xuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgaXNQcm9kdWN0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudENvbnRlbnQgPSB0cmVlLnJlYWQoYXBwLnJvb3QgKyAnLycgKyBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKTtcbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnRDb250ZW50KSB7XG4gICAgICAgICAgICBpc1Byb2R1Y3Rpb24gPSAhIWVudmlyb25tZW50Q29udGVudC50b1N0cmluZygndXRmLTgnKVxuICAgICAgICAgICAgICAvLyBBbGxvdyBmb3IgYHByb2R1Y3Rpb246IHRydWVgIG9yIGBwcm9kdWN0aW9uID0gdHJ1ZWAuIEJlc3Qgd2UgY2FuIGRvIHRvIGd1ZXNzLlxuICAgICAgICAgICAgICAubWF0Y2goL3Byb2R1Y3Rpb25bJ1wiXT9cXHMqWzo9XVxccyp0cnVlLyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGNvbmZpZ3VyYXRpb25OYW1lO1xuICAgICAgICAgIC8vIFdlIHVzZWQgdG8gdXNlIGBwcm9kYCBieSBkZWZhdWx0IGFzIHRoZSBrZXksIGluc3RlYWQgd2Ugbm93IHVzZSB0aGUgZnVsbCB3b3JkLlxuICAgICAgICAgIC8vIFRyeSBub3QgdG8gb3ZlcnJpZGUgdGhlIHByb2R1Y3Rpb24ga2V5IGlmIGl0J3MgdGhlcmUuXG4gICAgICAgICAgaWYgKGVudmlyb25tZW50ID09ICdwcm9kJyAmJiAhZW52aXJvbm1lbnRzWydwcm9kdWN0aW9uJ10gJiYgaXNQcm9kdWN0aW9uKSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9ICdwcm9kdWN0aW9uJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSBlbnZpcm9ubWVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhY2NbY29uZmlndXJhdGlvbk5hbWVdID0ge1xuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvblxuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IHt9XG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvbiAmJiBzZXJ2aWNlV29ya2VyID8geyBzZXJ2aWNlV29ya2VyOiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzcmM6IGAke2FwcC5yb290fS8ke3NvdXJjZX1gLFxuICAgICAgICAgICAgICAgIHJlcGxhY2VXaXRoOiBgJHthcHAucm9vdH0vJHtlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX3NlcnZlQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IGFwcC5lbnZpcm9ubWVudHM7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmNoaXRlY3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zID0gKGFyY2hpdGVjdC5idWlsZCBhcyBKc29uT2JqZWN0KS5jb25maWd1cmF0aW9ucyBhcyBKc29uT2JqZWN0O1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb25maWd1cmF0aW9ucykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgYWNjW2Vudmlyb25tZW50XSA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGQ6JHtlbnZpcm9ubWVudH1gIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2V4dHJhRW50cnlNYXBwZXIoZXh0cmFFbnRyeTogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBsZXQgZW50cnk6IEpzb25PYmplY3Q7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmFFbnRyeSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlbnRyeSA9IHsgaW5wdXQ6IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeSkgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeS5pbnB1dCBhcyBzdHJpbmcgfHwgJycpO1xuICAgICAgICAgIGNvbnN0IGxhenkgPSAhIWV4dHJhRW50cnkubGF6eTtcbiAgICAgICAgICBlbnRyeSA9IHsgaW5wdXQgfTtcblxuICAgICAgICAgIGlmICghZXh0cmFFbnRyeS5vdXRwdXQgJiYgbGF6eSkge1xuICAgICAgICAgICAgZW50cnkubGF6eSA9IHRydWU7XG4gICAgICAgICAgICBlbnRyeS5idW5kbGVOYW1lID0gYmFzZW5hbWUoXG4gICAgICAgICAgICAgIG5vcm1hbGl6ZShpbnB1dC5yZXBsYWNlKC9cXC4oanN8Y3NzfHNjc3N8c2Fzc3xsZXNzfHN0eWwpJC9pLCAnJykpLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGV4dHJhRW50cnkub3V0cHV0KSB7XG4gICAgICAgICAgICBlbnRyeS5idW5kbGVOYW1lID0gZXh0cmFFbnRyeS5vdXRwdXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiAnJyxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBhcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcbiAgICAgIHByb2plY3QuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0O1xuXG4gICAgICAgIC8vIEJyb3dzZXIgdGFyZ2V0XG4gICAgICBjb25zdCBidWlsZE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIC8vIE1ha2Ugb3V0cHV0UGF0aCByZWxhdGl2ZSB0byByb290LlxuICAgICAgICBvdXRwdXRQYXRoOiBvdXREaXIsXG4gICAgICAgIGluZGV4OiBgJHthcHBSb290fS8ke2FwcC5pbmRleCB8fCBkZWZhdWx0cy5pbmRleH1gLFxuICAgICAgICBtYWluOiBgJHthcHBSb290fS8ke2FwcC5tYWluIHx8IGRlZmF1bHRzLm1haW59YCxcbiAgICAgICAgdHNDb25maWc6IGAke2FwcFJvb3R9LyR7YXBwLnRzY29uZmlnIHx8IGRlZmF1bHRzLnRzQ29uZmlnfWAsXG4gICAgICAgIC4uLmJ1aWxkRGVmYXVsdHMsXG4gICAgICB9O1xuXG4gICAgICBpZiAoYXBwLnBvbHlmaWxscykge1xuICAgICAgICBidWlsZE9wdGlvbnMucG9seWZpbGxzID0gYXBwUm9vdCArICcvJyArIGFwcC5wb2x5ZmlsbHM7XG4gICAgICB9XG5cbiAgICAgIGJ1aWxkT3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpO1xuICAgICAgYnVpbGRPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYnVpbGRPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBhcmNoaXRlY3QuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX2J1aWxkQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNlcnZlIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAsXG4gICAgICAgIC4uLnNlcnZlRGVmYXVsdHMsXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LnNlcnZlID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZGV2LXNlcnZlcmAsXG4gICAgICAgIG9wdGlvbnM6IHNlcnZlT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IHRhcmdldFxuICAgICAgY29uc3QgZXh0cmFjdEkxOG5PcHRpb25zOiBKc29uT2JqZWN0ID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAgfTtcbiAgICAgIGFyY2hpdGVjdFsnZXh0cmFjdC1pMThuJ10gPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpleHRyYWN0LWkxOG5gLFxuICAgICAgICBvcHRpb25zOiBleHRyYWN0STE4bk9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBrYXJtYUNvbmZpZyA9IGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hXG4gICAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWcgfHwgJydcbiAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUZXN0IHRhcmdldFxuICAgICAgY29uc3QgdGVzdE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgbWFpbjogYXBwUm9vdCArICcvJyArIGFwcC50ZXN0IHx8IGRlZmF1bHRzLnRlc3QsXG4gICAgICAgICAgLy8gTWFrZSBrYXJtYUNvbmZpZyByZWxhdGl2ZSB0byByb290LlxuICAgICAgICAgIGthcm1hQ29uZmlnLFxuICAgICAgICB9O1xuXG4gICAgICBpZiAoYXBwLnBvbHlmaWxscykge1xuICAgICAgICB0ZXN0T3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC50ZXN0VHNjb25maWcpIHtcbiAgICAgICAgICB0ZXN0T3B0aW9ucy50c0NvbmZpZyA9IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdFRzY29uZmlnO1xuICAgICAgICB9XG4gICAgICB0ZXN0T3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpO1xuXG4gICAgICBpZiAoa2FybWFDb25maWcpIHtcbiAgICAgICAgYXJjaGl0ZWN0LnRlc3QgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9Omthcm1hYCxcbiAgICAgICAgICBvcHRpb25zOiB0ZXN0T3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdHNDb25maWdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3QgZXhjbHVkZXM6IHN0cmluZ1tdID0gW107XG4gICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5saW50ICYmIEFycmF5LmlzQXJyYXkoY29uZmlnLmxpbnQpKSB7XG4gICAgICAgIGNvbmZpZy5saW50LmZvckVhY2gobGludCA9PiB7XG4gICAgICAgICAgdHNDb25maWdzLnB1c2gobGludC5wcm9qZWN0KTtcbiAgICAgICAgICBpZiAobGludC5leGNsdWRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbnQuZXhjbHVkZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgZXhjbHVkZXMucHVzaChsaW50LmV4Y2x1ZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGludC5leGNsdWRlLmZvckVhY2goZXggPT4gZXhjbHVkZXMucHVzaChleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbW92ZUR1cGVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gaXRlbXMucmVkdWNlKChuZXdJdGVtcywgaXRlbSkgPT4ge1xuICAgICAgICBpZiAobmV3SXRlbXMuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICBuZXdJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0l0ZW1zO1xuICAgICAgfSwgPHN0cmluZ1tdPiBbXSk7XG5cbiAgICAgICAgLy8gVHNsaW50IHRhcmdldFxuICAgICAgY29uc3QgbGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgPT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5saW50ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICAgIG9wdGlvbnM6IGxpbnRPcHRpb25zLFxuICAgICAgICB9O1xuXG4gICAgICAvLyBzZXJ2ZXIgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZXJBcHAgPSBzZXJ2ZXJBcHBzXG4gICAgICAgIC5maWx0ZXIoc2VydmVyQXBwID0+IGFwcC5yb290ID09PSBzZXJ2ZXJBcHAucm9vdCAmJiBhcHAuaW5kZXggPT09IHNlcnZlckFwcC5pbmRleClbMF07XG5cbiAgICAgIGlmIChzZXJ2ZXJBcHApIHtcbiAgICAgICAgY29uc3Qgc2VydmVyT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBzZXJ2ZXJBcHAub3V0RGlyIHx8IGRlZmF1bHRzLnNlcnZlck91dERpcixcbiAgICAgICAgICBtYWluOiBzZXJ2ZXJBcHAubWFpbiB8fCBkZWZhdWx0cy5zZXJ2ZXJNYWluLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJBcHAudHNjb25maWcgfHwgZGVmYXVsdHMuc2VydmVyVHNDb25maWcsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlcnZlclRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6c2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiBzZXJ2ZXJPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgICBhcmNoaXRlY3Quc2VydmVyID0gc2VydmVyVGFyZ2V0O1xuICAgICAgfVxuICAgICAgY29uc3QgZTJlUHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogcHJvamVjdC5yb290LFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgICAgY2xpOiB7fSxcbiAgICAgICAgc2NoZW1hdGljczoge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlMmVBcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcblxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgY29uc3QgcHJvdHJhY3RvckNvbmZpZyA9IGNvbmZpZyAmJiBjb25maWcuZTJlICYmIGNvbmZpZy5lMmUucHJvdHJhY3RvciAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgID8gY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgZTJlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcHJvdHJhY3RvckNvbmZpZzogcHJvdHJhY3RvckNvbmZpZyxcbiAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtuYW1lfTpzZXJ2ZWAsXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlVGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06cHJvdHJhY3RvcmAsXG4gICAgICAgIG9wdGlvbnM6IGUyZU9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBlMmVBcmNoaXRlY3QuZTJlID0gZTJlVGFyZ2V0O1xuICAgICAgY29uc3QgZTJlTGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgIT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZUxpbnRUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICBvcHRpb25zOiBlMmVMaW50T3B0aW9ucyxcbiAgICAgIH07XG4gICAgICBlMmVBcmNoaXRlY3QubGludCA9IGUyZUxpbnRUYXJnZXQ7XG4gICAgICBpZiAocHJvdHJhY3RvckNvbmZpZykge1xuICAgICAgICBlMmVQcm9qZWN0LmFyY2hpdGVjdCA9IGUyZUFyY2hpdGVjdDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgbmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdCB9O1xuICAgIH0pXG4gICAgLnJlZHVjZSgocHJvamVjdHMsIG1hcHBlZEFwcCkgPT4ge1xuICAgICAgY29uc3Qge25hbWUsIHByb2plY3QsIGUyZVByb2plY3R9ID0gbWFwcGVkQXBwO1xuICAgICAgcHJvamVjdHNbbmFtZV0gPSBwcm9qZWN0O1xuICAgICAgcHJvamVjdHNbbmFtZSArICctZTJlJ10gPSBlMmVQcm9qZWN0O1xuXG4gICAgICByZXR1cm4gcHJvamVjdHM7XG4gICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG5cbiAgcmV0dXJuIHByb2plY3RNYXA7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gICAgYXBwcy5mb3JFYWNoKChhcHA6IEFwcENvbmZpZywgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgIGNvbnN0IHRzU3BlY0NvbmZpZ1BhdGggPVxuICAgICAgICBqb2luKGFwcC5yb290IGFzIFBhdGgsIGFwcC50ZXN0VHNjb25maWcgfHwgZGVmYXVsdHMudGVzdFRzQ29uZmlnKTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c1NwZWNDb25maWdQYXRoKTtcbiAgICAgIGlmICghYnVmZmVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzQ2ZnID0gSlNPTi5wYXJzZShidWZmZXIudG9TdHJpbmcoKSk7XG4gICAgICBpZiAoIXRzQ2ZnLmZpbGVzKSB7XG4gICAgICAgIHRzQ2ZnLmZpbGVzID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSB0aGUgc3BlYyB0c2NvbmZpZyBjb250YWlucyB0aGUgcG9seWZpbGxzIGZpbGVcbiAgICAgIGlmICh0c0NmZy5maWxlcy5pbmRleE9mKGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzKSA9PT0gLTEpIHtcbiAgICAgICAgdHNDZmcuZmlsZXMucHVzaChhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscyk7XG4gICAgICAgIGhvc3Qub3ZlcndyaXRlKHRzU3BlY0NvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KHRzQ2ZnLCBudWxsLCAyKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVBhY2thZ2VKc29uKHBhY2thZ2VNYW5hZ2VyPzogc3RyaW5nKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHBrZ1BhdGggPSAnL3BhY2thZ2UuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHBrZ1BhdGgpO1xuICAgIGlmIChidWZmZXIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCByZWFkIHBhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBjb25zdCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgY29uc3QgcGtnID0gSlNPTi5wYXJzZShjb250ZW50KTtcblxuICAgIGlmIChwa2cgPT09IG51bGwgfHwgdHlwZW9mIHBrZyAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShwa2cpKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignRXJyb3IgcmVhZGluZyBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG4gICAgaWYgKCFwa2cuZGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgICBwa2cuZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgfVxuXG4gICAgcGtnLmRldkRlcGVuZGVuY2llc1snQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInXSA9IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcjtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHBrZ1BhdGgsIEpTT04uc3RyaW5naWZ5KHBrZywgbnVsbCwgMikpO1xuXG4gICAgaWYgKHBhY2thZ2VNYW5hZ2VyICYmICFbJ25wbScsICd5YXJuJywgJ2NucG0nXS5pbmNsdWRlcyhwYWNrYWdlTWFuYWdlcikpIHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soeyBwYWNrYWdlTWFuYWdlciB9KSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNMaW50Q29uZmlnKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB0c0xpbnRQYXRoID0gJy90c2xpbnQuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzTGludFBhdGgpO1xuICAgIGlmICghYnVmZmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRzQ2ZnID0gSlNPTi5wYXJzZShidWZmZXIudG9TdHJpbmcoKSk7XG5cbiAgICBpZiAodHNDZmcucnVsZXMgJiYgdHNDZmcucnVsZXNbJ2ltcG9ydC1ibGFja2xpc3QnXSAmJlxuICAgICAgICB0c0NmZy5ydWxlc1snaW1wb3J0LWJsYWNrbGlzdCddLmluZGV4T2YoJ3J4anMnKSAhPT0gLTEpIHtcblxuICAgICAgdHNDZmcucnVsZXNbJ2ltcG9ydC1ibGFja2xpc3QnXSA9IHRzQ2ZnLnJ1bGVzWydpbXBvcnQtYmxhY2tsaXN0J11cbiAgICAgICAgLmZpbHRlcigocnVsZTogc3RyaW5nIHwgYm9vbGVhbikgPT4gcnVsZSAhPT0gJ3J4anMnKTtcblxuICAgICAgaG9zdC5vdmVyd3JpdGUodHNMaW50UGF0aCwgSlNPTi5zdHJpbmdpZnkodHNDZmcsIG51bGwsIDIpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBjb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdCdWZmZXIgPSBob3N0LnJlYWQobm9ybWFsaXplKGNvbmZpZ1BhdGgpKTtcbiAgICBpZiAoY29uZmlnQnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnQnVmZmVyLnRvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIG1pZ3JhdGVDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnKSxcbiAgICAgIHVwZGF0ZVBhY2thZ2VKc29uKGNvbmZpZy5wYWNrYWdlTWFuYWdlciksXG4gICAgICB1cGRhdGVUc0xpbnRDb25maWcoKSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==