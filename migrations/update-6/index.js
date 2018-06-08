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
const dependencies_1 = require("../../utility/dependencies");
const json_utils_1 = require("../../utility/json-utils");
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
                // Replace the 1.0 files and preprocessor entries, with and without comma at the end.
                // If these remain, they will cause the `ng test` to fail.
                content = content.replace(`{ pattern: './src/test.ts', watched: false },`, '');
                content = content.replace(`{ pattern: './src/test.ts', watched: false }`, '');
                content = content.replace(`'./src/test.ts': ['@angular/cli'],`, '');
                content = content.replace(`'./src/test.ts': ['@angular/cli']`, '');
                content = content.replace(/angularCli[^}]*},?/, '');
                // Replace 1.x plugin names.
                content = content.replace(/@angular\/cli/g, '@angular-devkit/build-angular');
                // Replace code coverage output path.
                content = content.replace('reports', `dir: require('path').join(__dirname, 'coverage'), reports`);
                host.overwrite(karmaPath, content);
            }
        }
        catch (e) { }
        return host;
    };
}
function migrateConfiguration(oldConfig, logger) {
    return (host, context) => {
        const oldConfigPath = getConfigPath(host);
        const configPath = core_1.normalize('angular.json');
        context.logger.info(`Updating configuration`);
        const config = {
            '$schema': './node_modules/@angular/cli/lib/config/schema.json',
            version: 1,
            newProjectRoot: 'projects',
            projects: extractProjectsConfig(oldConfig, host, logger),
        };
        const defaultProject = extractDefaultProject(oldConfig);
        if (defaultProject !== null) {
            config.defaultProject = defaultProject;
        }
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
    if (config.warnings) {
        if (config.warnings.versionMismatch !== undefined) {
            newConfig.warnings = Object.assign({}, (newConfig.warnings || {}), { versionMismatch: config.warnings.versionMismatch });
        }
        if (config.warnings.typescriptMismatch !== undefined) {
            newConfig.warnings = Object.assign({}, (newConfig.warnings || {}), { typescriptMismatch: config.warnings.typescriptMismatch });
        }
    }
    return Object.getOwnPropertyNames(newConfig).length == 0 ? null : newConfig;
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
function extractProjectsConfig(config, tree, logger) {
    const builderPackage = '@angular-devkit/build-angular';
    const defaultAppNamePrefix = getDefaultAppNamePrefix(config);
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
                if (asset.allowOutsideOutDir) {
                    logger.warn(core_1.tags.oneLine `
              Asset with input '${asset.input}' was not migrated because it
              uses the 'allowOutsideOutDir' option which is not supported in Angular CLI 6.
            `);
                    return null;
                }
                else if (asset.output) {
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
                    : {}), (isProduction && swConfig ? swConfig : {}), (isProduction && app.budgets ? { budgets: app.budgets } : {}), { fileReplacements: [
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
        const projectRoot = core_1.join(core_1.normalize(appRoot), '..');
        const project = {
            root: projectRoot,
            sourceRoot: appRoot,
            projectType: 'application',
        };
        const architect = {};
        project.architect = architect;
        // Browser target
        const buildOptions = Object.assign({ 
            // Make outputPath relative to root.
            outputPath: outDir, index: `${appRoot}/${app.index || defaults.index}`, main: `${appRoot}/${app.main || defaults.main}`, tsConfig: `${appRoot}/${app.tsconfig || defaults.tsConfig}` }, (app.baseHref ? { baseHref: app.baseHref } : {}), buildDefaults);
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
        buildOptions.assets = (app.assets || []).map(_mapAssets).filter(x => !!x);
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
        testOptions.assets = (app.assets || []).map(_mapAssets).filter(x => !!x);
        if (karmaConfig) {
            architect.test = {
                builder: `${builderPackage}:karma`,
                options: testOptions,
            };
        }
        const tsConfigs = [];
        const excludes = [];
        let warnForLint = false;
        if (config && config.lint && Array.isArray(config.lint)) {
            config.lint.forEach(lint => {
                if (lint.project) {
                    tsConfigs.push(lint.project);
                }
                else {
                    warnForLint = true;
                }
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
        if (warnForLint) {
            logger.warn(`
          Lint without 'project' was not migrated which is not supported in Angular CLI 6.
        `);
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
            root: core_1.join(projectRoot, 'e2e'),
            sourceRoot: core_1.join(projectRoot, 'e2e'),
            projectType: 'application',
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
function getDefaultAppNamePrefix(config) {
    let defaultAppNamePrefix = 'app';
    if (config.project && config.project.name) {
        defaultAppNamePrefix = config.project.name;
    }
    return defaultAppNamePrefix;
}
function extractDefaultProject(config) {
    if (config.apps && config.apps[0]) {
        const app = config.apps[0];
        const defaultAppName = getDefaultAppNamePrefix(config);
        const name = app.name || defaultAppName;
        return name;
    }
    return null;
}
function updateSpecTsConfig(config) {
    return (host, context) => {
        const apps = config.apps || [];
        apps.forEach((app, idx) => {
            const testTsConfig = app.testTsconfig || defaults.testTsConfig;
            const tsSpecConfigPath = core_1.join(core_1.normalize(app.root || ''), testTsConfig);
            const buffer = host.read(tsSpecConfigPath);
            if (!buffer) {
                return;
            }
            const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
            if (tsCfgAst.kind != 'object') {
                throw new schematics_1.SchematicsException('Invalid tsconfig. Was expecting an object');
            }
            const filesAstNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'files');
            if (filesAstNode && filesAstNode.kind != 'array') {
                throw new schematics_1.SchematicsException('Invalid tsconfig "files" property; expected an array.');
            }
            const recorder = host.beginUpdate(tsSpecConfigPath);
            const polyfills = app.polyfills || defaults.polyfills;
            if (!filesAstNode) {
                // Do nothing if the files array does not exist. This means exclude or include are
                // set and we shouldn't mess with that.
            }
            else {
                if (filesAstNode.value.indexOf(polyfills) == -1) {
                    json_utils_1.appendValueInAstArray(recorder, filesAstNode, polyfills);
                }
            }
            host.commitUpdate(recorder);
        });
    };
}
function updatePackageJson(config) {
    return (host, context) => {
        const dependency = {
            type: dependencies_1.NodeDependencyType.Dev,
            name: '@angular-devkit/build-angular',
            version: latest_versions_1.latestVersions.DevkitBuildAngular,
            overwrite: true,
        };
        dependencies_1.addPackageJsonDependency(host, dependency);
        context.addTask(new tasks_1.NodePackageInstallTask({
            packageManager: config.packageManager === 'default' ? undefined : config.packageManager,
        }));
        return host;
    };
}
function updateTsLintConfig() {
    return (host, context) => {
        const tsLintPath = '/tslint.json';
        const buffer = host.read(tsLintPath);
        if (!buffer) {
            return host;
        }
        const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
        if (tsCfgAst.kind != 'object') {
            return host;
        }
        const rulesNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'rules');
        if (!rulesNode || rulesNode.kind != 'object') {
            return host;
        }
        const importBlacklistNode = json_utils_1.findPropertyInAstObject(rulesNode, 'import-blacklist');
        if (!importBlacklistNode || importBlacklistNode.kind != 'array') {
            return host;
        }
        const recorder = host.beginUpdate(tsLintPath);
        for (let i = 0; i < importBlacklistNode.elements.length; i++) {
            const element = importBlacklistNode.elements[i];
            if (element.kind == 'string' && element.value == 'rxjs') {
                const { start, end } = element;
                // Remove this element.
                if (i == importBlacklistNode.elements.length - 1) {
                    // Last element.
                    if (i > 0) {
                        // Not first, there's a comma to remove before.
                        const previous = importBlacklistNode.elements[i - 1];
                        recorder.remove(previous.end.offset, end.offset - previous.end.offset);
                    }
                    else {
                        // Only element, just remove the whole rule.
                        const { start, end } = importBlacklistNode;
                        recorder.remove(start.offset, end.offset - start.offset);
                        recorder.insertLeft(start.offset, '[]');
                    }
                }
                else {
                    // Middle, just remove the whole node (up to next node start).
                    const next = importBlacklistNode.elements[i + 1];
                    recorder.remove(start.offset, next.start.offset - start.offset);
                }
            }
        }
        host.commitUpdate(recorder);
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
        const config = core_1.parseJson(configBuffer.toString(), core_1.JsonParseMode.Loose);
        if (typeof config != 'object' || Array.isArray(config) || config === null) {
            throw new schematics_1.SchematicsException('Invalid angular-cli.json configuration; expected an object.');
        }
        return schematics_1.chain([
            migrateKarmaConfiguration(config),
            migrateConfiguration(config, context.logger),
            updateSpecTsConfig(config),
            updatePackageJson(config),
            updateTsLintConfig(),
            (host, context) => {
                context.logger.warn(core_1.tags.oneLine `Some configuration options have been changed,
          please make sure to update any npm scripts which you may have modified.`);
                return host;
            },
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBVzhCO0FBQzlCLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsNkRBSW9DO0FBQ3BDLHlEQUdrQztBQUNsQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLFlBQVksRUFBRSxhQUFhO0lBQzNCLFVBQVUsRUFBRSxnQkFBZ0I7SUFDNUIsY0FBYyxFQUFFLHNCQUFzQjtDQUN2QyxDQUFDO0FBRUYsdUJBQXVCLElBQVU7SUFDL0IsSUFBSSxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUNELFlBQVksR0FBRyxnQkFBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDN0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTSxJQUFJLGdDQUFtQixDQUFDLG1DQUFtQyxDQUFD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QUMsQ0FBQyxPQUFPLE1BQU0sSUFBSSxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxRSxNQUFNLElBQUksZ0NBQW1CLENBQUMsNkRBQTZELENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsTUFBTSxDQUFDLGtCQUFLLENBQUM7WUFDWCx5QkFBeUIsQ0FBQyxNQUFNLENBQUM7WUFDakMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDNUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1lBQzFCLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN6QixrQkFBa0IsRUFBRTtZQUNwQixDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7Z0JBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7a0ZBQzBDLENBQUMsQ0FBQztnQkFFNUUsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNkLENBQUM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBakNELDRCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEpzb25BcnJheSxcbiAgSnNvbk9iamVjdCxcbiAgSnNvblBhcnNlTW9kZSxcbiAgUGF0aCxcbiAgam9pbixcbiAgbG9nZ2luZyxcbiAgbm9ybWFsaXplLFxuICBwYXJzZUpzb24sXG4gIHBhcnNlSnNvbkFzdCxcbiAgdGFncyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgY2hhaW4sXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBBcHBDb25maWcsIENsaUNvbmZpZyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7XG4gIE5vZGVEZXBlbmRlbmN5LFxuICBOb2RlRGVwZW5kZW5jeVR5cGUsXG4gIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHtcbiAgYXBwZW5kVmFsdWVJbkFzdEFycmF5LFxuICBmaW5kUHJvcGVydHlJbkFzdE9iamVjdCxcbn0gZnJvbSAnLi4vLi4vdXRpbGl0eS9qc29uLXV0aWxzJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcbiAgYXBwUm9vdDogJ3NyYycsXG4gIGluZGV4OiAnaW5kZXguaHRtbCcsXG4gIG1haW46ICdtYWluLnRzJyxcbiAgcG9seWZpbGxzOiAncG9seWZpbGxzLnRzJyxcbiAgdHNDb25maWc6ICd0c2NvbmZpZy5hcHAuanNvbicsXG4gIHRlc3Q6ICd0ZXN0LnRzJyxcbiAgb3V0RGlyOiAnZGlzdC8nLFxuICBrYXJtYTogJ2thcm1hLmNvbmYuanMnLFxuICBwcm90cmFjdG9yOiAncHJvdHJhY3Rvci5jb25mLmpzJyxcbiAgdGVzdFRzQ29uZmlnOiAndHNjb25maWcuc3BlYy5qc29uJyxcbiAgc2VydmVyT3V0RGlyOiAnZGlzdC1zZXJ2ZXInLFxuICBzZXJ2ZXJNYWluOiAnbWFpbi5zZXJ2ZXIudHMnLFxuICBzZXJ2ZXJUc0NvbmZpZzogJ3RzY29uZmlnLnNlcnZlci5qc29uJyxcbn07XG5cbmZ1bmN0aW9uIGdldENvbmZpZ1BhdGgodHJlZTogVHJlZSk6IFBhdGgge1xuICBsZXQgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cbiAgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCdhbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuXG4gIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUnKTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyBrYXJtYSBjb25maWd1cmF0aW9uYCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGthcm1hUGF0aCA9IGNvbmZpZyAmJiBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYSAmJiBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgOiBkZWZhdWx0cy5rYXJtYTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChrYXJtYVBhdGgpO1xuICAgICAgaWYgKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICBsZXQgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgICAgICAvLyBSZXBsYWNlIHRoZSAxLjAgZmlsZXMgYW5kIHByZXByb2Nlc3NvciBlbnRyaWVzLCB3aXRoIGFuZCB3aXRob3V0IGNvbW1hIGF0IHRoZSBlbmQuXG4gICAgICAgIC8vIElmIHRoZXNlIHJlbWFpbiwgdGhleSB3aWxsIGNhdXNlIHRoZSBgbmcgdGVzdGAgdG8gZmFpbC5cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShgeyBwYXR0ZXJuOiAnLi9zcmMvdGVzdC50cycsIHdhdGNoZWQ6IGZhbHNlIH0sYCwgJycpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGB7IHBhdHRlcm46ICcuL3NyYy90ZXN0LnRzJywgd2F0Y2hlZDogZmFsc2UgfWAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShgJy4vc3JjL3Rlc3QudHMnOiBbJ0Bhbmd1bGFyL2NsaSddLGAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShgJy4vc3JjL3Rlc3QudHMnOiBbJ0Bhbmd1bGFyL2NsaSddYCwgJycpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9hbmd1bGFyQ2xpW159XSp9LD8vLCAnJyk7XG4gICAgICAgIC8vIFJlcGxhY2UgMS54IHBsdWdpbiBuYW1lcy5cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvQGFuZ3VsYXJcXC9jbGkvZywgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyk7XG4gICAgICAgIC8vIFJlcGxhY2UgY29kZSBjb3ZlcmFnZSBvdXRwdXQgcGF0aC5cbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgncmVwb3J0cycsXG4gICAgICAgICAgYGRpcjogcmVxdWlyZSgncGF0aCcpLmpvaW4oX19kaXJuYW1lLCAnY292ZXJhZ2UnKSwgcmVwb3J0c2ApO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZShrYXJtYVBhdGgsIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICAnJHNjaGVtYSc6ICcuL25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbGliL2NvbmZpZy9zY2hlbWEuanNvbicsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCwgbG9nZ2VyKSxcbiAgICB9O1xuICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0ID0gZXh0cmFjdERlZmF1bHRQcm9qZWN0KG9sZENvbmZpZyk7XG4gICAgaWYgKGRlZmF1bHRQcm9qZWN0ICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuZGVmYXVsdFByb2plY3QgPSBkZWZhdWx0UHJvamVjdDtcbiAgICB9XG4gICAgY29uc3QgY2xpQ29uZmlnID0gZXh0cmFjdENsaUNvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChjbGlDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5jbGkgPSBjbGlDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHNjaGVtYXRpY3NDb25maWcgPSBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChzY2hlbWF0aWNzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuc2NoZW1hdGljcyA9IHNjaGVtYXRpY3NDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IGFyY2hpdGVjdENvbmZpZyA9IGV4dHJhY3RBcmNoaXRlY3RDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoYXJjaGl0ZWN0Q29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0Q29uZmlnO1xuICAgIH1cblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFJlbW92aW5nIG9sZCBjb25maWcgZmlsZSAoJHtvbGRDb25maWdQYXRofSlgKTtcbiAgICBob3N0LmRlbGV0ZShvbGRDb25maWdQYXRoKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBXcml0aW5nIGNvbmZpZyBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuY3JlYXRlKGNvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RDbGlDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGNvbnN0IG5ld0NvbmZpZzogSnNvbk9iamVjdCA9IHt9O1xuICBpZiAoY29uZmlnLnBhY2thZ2VNYW5hZ2VyICYmIGNvbmZpZy5wYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgbmV3Q29uZmlnWydwYWNrYWdlTWFuYWdlciddID0gY29uZmlnLnBhY2thZ2VNYW5hZ2VyO1xuICB9XG4gIGlmIChjb25maWcud2FybmluZ3MpIHtcbiAgICBpZiAoY29uZmlnLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdDb25maWcud2FybmluZ3MgPSB7XG4gICAgICAgIC4uLigobmV3Q29uZmlnLndhcm5pbmdzIGFzIEpzb25PYmplY3QgfCBudWxsKSB8fCB7fSksXG4gICAgICAgIC4uLnsgdmVyc2lvbk1pc21hdGNoOiBjb25maWcud2FybmluZ3MudmVyc2lvbk1pc21hdGNoIH0sXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoY29uZmlnLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdDb25maWcud2FybmluZ3MgPSB7XG4gICAgICAgIC4uLigobmV3Q29uZmlnLndhcm5pbmdzIGFzIEpzb25PYmplY3QgfCBudWxsKSB8fCB7fSksXG4gICAgICAgIC4uLnsgdHlwZXNjcmlwdE1pc21hdGNoOiBjb25maWcud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhuZXdDb25maWcpLmxlbmd0aCA9PSAwID8gbnVsbCA6IG5ld0NvbmZpZztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGxldCBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZy5kZWZhdWx0cykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIGNvbnN0IGNvbmZpZ0RlZmF1bHRzID0gY29uZmlnLmRlZmF1bHRzO1xuICBpZiAoY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb24pIHtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogRm9yIGVhY2ggc2NoZW1hdGljXG4gICAqICAtIGdldCB0aGUgY29uZmlnXG4gICAqICAtIGZpbHRlciBvbmUncyB3aXRob3V0IGNvbmZpZ1xuICAgKiAgLSBjb21iaW5lIHRoZW0gaW50byBhbiBvYmplY3RcbiAgICovXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgY29uc3Qgc2NoZW1hdGljQ29uZmlnczogYW55ID0gWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpbnRlcmZhY2UnLCAnbW9kdWxlJywgJ3BpcGUnLCAnc2VydmljZSddXG4gICAgLm1hcChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHRzOiBKc29uT2JqZWN0ID0gKGNvbmZpZy5kZWZhdWx0cyBhcyBhbnkpW3NjaGVtYXRpY05hbWVdIHx8IG51bGw7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbmZpZzogc2NoZW1hdGljRGVmYXVsdHMsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihzY2hlbWF0aWMgPT4gc2NoZW1hdGljLmNvbmZpZyAhPT0gbnVsbClcbiAgICAucmVkdWNlKChhbGw6IEpzb25PYmplY3QsIHNjaGVtYXRpYykgPT4ge1xuICAgICAgYWxsW2NvbGxlY3Rpb25OYW1lICsgJzonICsgc2NoZW1hdGljLnNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLmNvbmZpZztcblxuICAgICAgcmV0dXJuIGFsbDtcbiAgICB9LCB7fSk7XG5cbiAgY29uc3QgY29tcG9uZW50VXBkYXRlOiBKc29uT2JqZWN0ID0ge307XG4gIGNvbXBvbmVudFVwZGF0ZS5wcmVmaXggPSAnJztcblxuICBjb25zdCBjb21wb25lbnRLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6Y29tcG9uZW50JztcbiAgY29uc3QgZGlyZWN0aXZlS2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmRpcmVjdGl2ZSc7XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldID0ge307XG4gIH1cbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0gPSB7fTtcbiAgfVxuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gIH1cbiAgaWYgKGNvbmZpZy5kZWZhdWx0cykge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5zdHlsZWV4dCA9IGNvbmZpZy5kZWZhdWx0cy5zdHlsZUV4dDtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWF0aWNDb25maWdzO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKF9jb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhcbiAgY29uZmlnOiBDbGlDb25maWcsIHRyZWU6IFRyZWUsIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBKc29uT2JqZWN0IHtcbiAgY29uc3QgYnVpbGRlclBhY2thZ2UgPSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuICBjb25zdCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZyk7XG5cbiAgY29uc3QgYnVpbGREZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuYnVpbGRcbiAgICA/IHtcbiAgICAgIHNvdXJjZU1hcDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNvdXJjZW1hcHMsXG4gICAgICBwcm9ncmVzczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByb2dyZXNzLFxuICAgICAgcG9sbDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnBvbGwsXG4gICAgICBkZWxldGVPdXRwdXRQYXRoOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuZGVsZXRlT3V0cHV0UGF0aCxcbiAgICAgIHByZXNlcnZlU3ltbGlua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICAgICAgY29tbW9uQ2h1bms6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5jb21tb25DaHVuayxcbiAgICAgIG5hbWVkQ2h1bmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQubmFtZWRDaHVua3MsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuICBjb25zdCBzZXJ2ZURlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZVxuICAgID8ge1xuICAgICAgcG9ydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnBvcnQsXG4gICAgICBob3N0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuaG9zdCxcbiAgICAgIHNzbDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbCxcbiAgICAgIHNzbEtleTogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbEtleSxcbiAgICAgIHNzbENlcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xDZXJ0LFxuICAgICAgcHJveHlDb25maWc6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wcm94eUNvbmZpZyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IGJyb3dzZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSAhPT0gJ3NlcnZlcicpO1xuICBjb25zdCBzZXJ2ZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSA9PT0gJ3NlcnZlcicpO1xuXG4gIGNvbnN0IHByb2plY3RNYXAgPSBicm93c2VyQXBwc1xuICAgIC5tYXAoKGFwcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGFzc2V0LmFsbG93T3V0c2lkZU91dERpcikge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICBBc3NldCB3aXRoIGlucHV0ICcke2Fzc2V0LmlucHV0fScgd2FzIG5vdCBtaWdyYXRlZCBiZWNhdXNlIGl0XG4gICAgICAgICAgICAgIHVzZXMgdGhlICdhbGxvd091dHNpZGVPdXREaXInIG9wdGlvbiB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEFuZ3VsYXIgQ0xJIDYuXG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmIChhc3NldC5vdXRwdXQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiBub3JtYWxpemUoJy8nICsgYXNzZXQub3V0cHV0IGFzIHN0cmluZyksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2J1aWxkQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGFwcC5lbnZpcm9ubWVudFNvdXJjZTtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcbiAgICAgICAgY29uc3Qgc2VydmljZVdvcmtlciA9IGFwcC5zZXJ2aWNlV29ya2VyO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGVudmlyb25tZW50cykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZSA9PT0gZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSkge1xuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgaXNQcm9kdWN0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudENvbnRlbnQgPSB0cmVlLnJlYWQoYXBwLnJvb3QgKyAnLycgKyBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKTtcbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnRDb250ZW50KSB7XG4gICAgICAgICAgICBpc1Byb2R1Y3Rpb24gPSAhIWVudmlyb25tZW50Q29udGVudC50b1N0cmluZygndXRmLTgnKVxuICAgICAgICAgICAgICAvLyBBbGxvdyBmb3IgYHByb2R1Y3Rpb246IHRydWVgIG9yIGBwcm9kdWN0aW9uID0gdHJ1ZWAuIEJlc3Qgd2UgY2FuIGRvIHRvIGd1ZXNzLlxuICAgICAgICAgICAgICAubWF0Y2goL3Byb2R1Y3Rpb25bJ1wiXT9cXHMqWzo9XVxccyp0cnVlLyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGNvbmZpZ3VyYXRpb25OYW1lO1xuICAgICAgICAgIC8vIFdlIHVzZWQgdG8gdXNlIGBwcm9kYCBieSBkZWZhdWx0IGFzIHRoZSBrZXksIGluc3RlYWQgd2Ugbm93IHVzZSB0aGUgZnVsbCB3b3JkLlxuICAgICAgICAgIC8vIFRyeSBub3QgdG8gb3ZlcnJpZGUgdGhlIHByb2R1Y3Rpb24ga2V5IGlmIGl0J3MgdGhlcmUuXG4gICAgICAgICAgaWYgKGVudmlyb25tZW50ID09ICdwcm9kJyAmJiAhZW52aXJvbm1lbnRzWydwcm9kdWN0aW9uJ10gJiYgaXNQcm9kdWN0aW9uKSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9ICdwcm9kdWN0aW9uJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSBlbnZpcm9ubWVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgc3dDb25maWc6IEpzb25PYmplY3QgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICBpZiAoc2VydmljZVdvcmtlcikge1xuICAgICAgICAgICAgc3dDb25maWcgPSB7XG4gICAgICAgICAgICAgIHNlcnZpY2VXb3JrZXI6IHRydWUsXG4gICAgICAgICAgICAgIG5nc3dDb25maWdQYXRoOiAnL3NyYy9uZ3N3LWNvbmZpZy5qc29uJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWNjW2NvbmZpZ3VyYXRpb25OYW1lXSA9IHtcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb25cbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgb3B0aW1pemF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gJiYgc3dDb25maWcgPyBzd0NvbmZpZyA6IHt9KSxcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gJiYgYXBwLmJ1ZGdldHMgPyB7IGJ1ZGdldHM6IGFwcC5idWRnZXRzIGFzIEpzb25BcnJheSB9IDoge30pLFxuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZTogYCR7YXBwLnJvb3R9LyR7c291cmNlfWAsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7YXBwLnJvb3R9LyR7ZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XX1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJjaGl0ZWN0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9ucyA9IChhcmNoaXRlY3QuYnVpbGQgYXMgSnNvbk9iamVjdCkuY29uZmlndXJhdGlvbnMgYXMgSnNvbk9iamVjdDtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGFjY1tlbnZpcm9ubWVudF0gPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkOiR7ZW52aXJvbm1lbnR9YCB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9leHRyYUVudHJ5TWFwcGVyKGV4dHJhRW50cnk6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgbGV0IGVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0O1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhRW50cnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgZW50cnkgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5LmlucHV0IGFzIHN0cmluZyB8fCAnJyk7XG4gICAgICAgICAgZW50cnkgPSB7IGlucHV0LCBsYXp5OiBleHRyYUVudHJ5LmxhenkgfTtcblxuICAgICAgICAgIGlmIChleHRyYUVudHJ5Lm91dHB1dCkge1xuICAgICAgICAgICAgZW50cnkuYnVuZGxlTmFtZSA9IGV4dHJhRW50cnkub3V0cHV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvamVjdFJvb3QgPSBqb2luKG5vcm1hbGl6ZShhcHBSb290KSwgJy4uJyk7XG4gICAgICBjb25zdCBwcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiBwcm9qZWN0Um9vdCxcbiAgICAgICAgc291cmNlUm9vdDogYXBwUm9vdCxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBhcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcbiAgICAgIHByb2plY3QuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0O1xuXG4gICAgICAgIC8vIEJyb3dzZXIgdGFyZ2V0XG4gICAgICBjb25zdCBidWlsZE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIC8vIE1ha2Ugb3V0cHV0UGF0aCByZWxhdGl2ZSB0byByb290LlxuICAgICAgICBvdXRwdXRQYXRoOiBvdXREaXIsXG4gICAgICAgIGluZGV4OiBgJHthcHBSb290fS8ke2FwcC5pbmRleCB8fCBkZWZhdWx0cy5pbmRleH1gLFxuICAgICAgICBtYWluOiBgJHthcHBSb290fS8ke2FwcC5tYWluIHx8IGRlZmF1bHRzLm1haW59YCxcbiAgICAgICAgdHNDb25maWc6IGAke2FwcFJvb3R9LyR7YXBwLnRzY29uZmlnIHx8IGRlZmF1bHRzLnRzQ29uZmlnfWAsXG4gICAgICAgIC4uLihhcHAuYmFzZUhyZWYgPyB7IGJhc2VIcmVmOiBhcHAuYmFzZUhyZWYgfSA6IHt9KSxcbiAgICAgICAgLi4uYnVpbGREZWZhdWx0cyxcbiAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnNcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICYmIEFycmF5LmlzQXJyYXkoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMpXG4gICAgICAgICAgJiYgYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICBidWlsZE9wdGlvbnMuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zID0ge1xuICAgICAgICAgIGluY2x1ZGVQYXRoczogYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHNcbiAgICAgICAgICAgIC5tYXAoaW5jbHVkZVBhdGggPT4gam9pbihhcHAucm9vdCBhcyBQYXRoLCBpbmNsdWRlUGF0aCkpLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKS5maWx0ZXIoeCA9PiAhIXgpO1xuICAgICAgYnVpbGRPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYnVpbGRPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBhcmNoaXRlY3QuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX2J1aWxkQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNlcnZlIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAsXG4gICAgICAgIC4uLnNlcnZlRGVmYXVsdHMsXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LnNlcnZlID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZGV2LXNlcnZlcmAsXG4gICAgICAgIG9wdGlvbnM6IHNlcnZlT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IHRhcmdldFxuICAgICAgY29uc3QgZXh0cmFjdEkxOG5PcHRpb25zOiBKc29uT2JqZWN0ID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAgfTtcbiAgICAgIGFyY2hpdGVjdFsnZXh0cmFjdC1pMThuJ10gPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpleHRyYWN0LWkxOG5gLFxuICAgICAgICBvcHRpb25zOiBleHRyYWN0STE4bk9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBrYXJtYUNvbmZpZyA9IGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hXG4gICAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWcgfHwgJydcbiAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUZXN0IHRhcmdldFxuICAgICAgY29uc3QgdGVzdE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgbWFpbjogYXBwUm9vdCArICcvJyArIGFwcC50ZXN0IHx8IGRlZmF1bHRzLnRlc3QsXG4gICAgICAgICAgLy8gTWFrZSBrYXJtYUNvbmZpZyByZWxhdGl2ZSB0byByb290LlxuICAgICAgICAgIGthcm1hQ29uZmlnLFxuICAgICAgICB9O1xuXG4gICAgICBpZiAoYXBwLnBvbHlmaWxscykge1xuICAgICAgICB0ZXN0T3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC50ZXN0VHNjb25maWcpIHtcbiAgICAgICAgICB0ZXN0T3B0aW9ucy50c0NvbmZpZyA9IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdFRzY29uZmlnO1xuICAgICAgICB9XG4gICAgICB0ZXN0T3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpLmZpbHRlcih4ID0+ICEheCk7XG5cbiAgICAgIGlmIChrYXJtYUNvbmZpZykge1xuICAgICAgICBhcmNoaXRlY3QudGVzdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06a2FybWFgLFxuICAgICAgICAgIG9wdGlvbnM6IHRlc3RPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCBleGNsdWRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGxldCB3YXJuRm9yTGludCA9IGZhbHNlO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIGlmIChsaW50LnByb2plY3QpIHtcbiAgICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhcm5Gb3JMaW50ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobGludC5leGNsdWRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbnQuZXhjbHVkZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgZXhjbHVkZXMucHVzaChsaW50LmV4Y2x1ZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGludC5leGNsdWRlLmZvckVhY2goZXggPT4gZXhjbHVkZXMucHVzaChleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh3YXJuRm9yTGludCkge1xuICAgICAgICBsb2dnZXIud2FybihgXG4gICAgICAgICAgTGludCB3aXRob3V0ICdwcm9qZWN0JyB3YXMgbm90IG1pZ3JhdGVkIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gQW5ndWxhciBDTEkgNi5cbiAgICAgICAgYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbW92ZUR1cGVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gaXRlbXMucmVkdWNlKChuZXdJdGVtcywgaXRlbSkgPT4ge1xuICAgICAgICBpZiAobmV3SXRlbXMuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICBuZXdJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0l0ZW1zO1xuICAgICAgfSwgPHN0cmluZ1tdPiBbXSk7XG5cbiAgICAgICAgLy8gVHNsaW50IHRhcmdldFxuICAgICAgY29uc3QgbGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgPT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5saW50ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICAgIG9wdGlvbnM6IGxpbnRPcHRpb25zLFxuICAgICAgICB9O1xuXG4gICAgICAvLyBzZXJ2ZXIgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZXJBcHAgPSBzZXJ2ZXJBcHBzXG4gICAgICAgIC5maWx0ZXIoc2VydmVyQXBwID0+IGFwcC5yb290ID09PSBzZXJ2ZXJBcHAucm9vdCAmJiBhcHAuaW5kZXggPT09IHNlcnZlckFwcC5pbmRleClbMF07XG5cbiAgICAgIGlmIChzZXJ2ZXJBcHApIHtcbiAgICAgICAgY29uc3Qgc2VydmVyT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBzZXJ2ZXJBcHAub3V0RGlyIHx8IGRlZmF1bHRzLnNlcnZlck91dERpcixcbiAgICAgICAgICBtYWluOiBzZXJ2ZXJBcHAubWFpbiB8fCBkZWZhdWx0cy5zZXJ2ZXJNYWluLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJBcHAudHNjb25maWcgfHwgZGVmYXVsdHMuc2VydmVyVHNDb25maWcsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlcnZlclRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6c2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiBzZXJ2ZXJPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgICBhcmNoaXRlY3Quc2VydmVyID0gc2VydmVyVGFyZ2V0O1xuICAgICAgfVxuICAgICAgY29uc3QgZTJlUHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogam9pbihwcm9qZWN0Um9vdCwgJ2UyZScpLFxuICAgICAgICBzb3VyY2VSb290OiBqb2luKHByb2plY3RSb290LCAnZTJlJyksXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZTJlQXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIGNvbnN0IHByb3RyYWN0b3JDb25maWcgPSBjb25maWcgJiYgY29uZmlnLmUyZSAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGUyZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IHByb3RyYWN0b3JDb25maWcsXG4gICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7bmFtZX06c2VydmVgLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZVRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnByb3RyYWN0b3JgLFxuICAgICAgICBvcHRpb25zOiBlMmVPcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgZTJlQXJjaGl0ZWN0LmUyZSA9IGUyZVRhcmdldDtcbiAgICAgIGNvbnN0IGUyZUxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpICE9PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVMaW50VGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgb3B0aW9uczogZTJlTGludE9wdGlvbnMsXG4gICAgICB9O1xuICAgICAgZTJlQXJjaGl0ZWN0LmxpbnQgPSBlMmVMaW50VGFyZ2V0O1xuICAgICAgaWYgKHByb3RyYWN0b3JDb25maWcpIHtcbiAgICAgICAgZTJlUHJvamVjdC5hcmNoaXRlY3QgPSBlMmVBcmNoaXRlY3Q7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG5hbWUsIHByb2plY3QsIGUyZVByb2plY3QgfTtcbiAgICB9KVxuICAgIC5yZWR1Y2UoKHByb2plY3RzLCBtYXBwZWRBcHApID0+IHtcbiAgICAgIGNvbnN0IHtuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0fSA9IG1hcHBlZEFwcDtcbiAgICAgIHByb2plY3RzW25hbWVdID0gcHJvamVjdDtcbiAgICAgIHByb2plY3RzW25hbWUgKyAnLWUyZSddID0gZTJlUHJvamVjdDtcblxuICAgICAgcmV0dXJuIHByb2plY3RzO1xuICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuXG4gIHJldHVybiBwcm9qZWN0TWFwO1xufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QXBwTmFtZVByZWZpeChjb25maWc6IENsaUNvbmZpZykge1xuICBsZXQgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSAnYXBwJztcbiAgaWYgKGNvbmZpZy5wcm9qZWN0ICYmIGNvbmZpZy5wcm9qZWN0Lm5hbWUpIHtcbiAgICBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGNvbmZpZy5wcm9qZWN0Lm5hbWU7XG4gIH1cblxuICByZXR1cm4gZGVmYXVsdEFwcE5hbWVQcmVmaXg7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3REZWZhdWx0UHJvamVjdChjb25maWc6IENsaUNvbmZpZyk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBjb25zdCBhcHAgPSBjb25maWcuYXBwc1swXTtcbiAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZyk7XG4gICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lIHx8IGRlZmF1bHRBcHBOYW1lO1xuXG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgICBhcHBzLmZvckVhY2goKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgdGVzdFRzQ29uZmlnID0gYXBwLnRlc3RUc2NvbmZpZyB8fCBkZWZhdWx0cy50ZXN0VHNDb25maWc7XG4gICAgICBjb25zdCB0c1NwZWNDb25maWdQYXRoID0gam9pbihub3JtYWxpemUoYXBwLnJvb3QgfHwgJycpLCB0ZXN0VHNDb25maWcpO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzU3BlY0NvbmZpZ1BhdGgpO1xuXG4gICAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgdHNjb25maWcuIFdhcyBleHBlY3RpbmcgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzQXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAnZmlsZXMnKTtcbiAgICAgIGlmIChmaWxlc0FzdE5vZGUgJiYgZmlsZXNBc3ROb2RlLmtpbmQgIT0gJ2FycmF5Jykge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCB0c2NvbmZpZyBcImZpbGVzXCIgcHJvcGVydHk7IGV4cGVjdGVkIGFuIGFycmF5LicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUodHNTcGVjQ29uZmlnUGF0aCk7XG5cbiAgICAgIGNvbnN0IHBvbHlmaWxscyA9IGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzO1xuICAgICAgaWYgKCFmaWxlc0FzdE5vZGUpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgZmlsZXMgYXJyYXkgZG9lcyBub3QgZXhpc3QuIFRoaXMgbWVhbnMgZXhjbHVkZSBvciBpbmNsdWRlIGFyZVxuICAgICAgICAvLyBzZXQgYW5kIHdlIHNob3VsZG4ndCBtZXNzIHdpdGggdGhhdC5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaWxlc0FzdE5vZGUudmFsdWUuaW5kZXhPZihwb2x5ZmlsbHMpID09IC0xKSB7XG4gICAgICAgICAgYXBwZW5kVmFsdWVJbkFzdEFycmF5KHJlY29yZGVyLCBmaWxlc0FzdE5vZGUsIHBvbHlmaWxscyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQYWNrYWdlSnNvbihjb25maWc6IENsaUNvbmZpZykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBkZXBlbmRlbmN5OiBOb2RlRGVwZW5kZW5jeSA9IHtcbiAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgb3ZlcndyaXRlOiB0cnVlLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpO1xuXG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBjb25maWcucGFja2FnZU1hbmFnZXIgPT09ICdkZWZhdWx0JyA/IHVuZGVmaW5lZCA6IGNvbmZpZy5wYWNrYWdlTWFuYWdlcixcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNMaW50Q29uZmlnKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB0c0xpbnRQYXRoID0gJy90c2xpbnQuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzTGludFBhdGgpO1xuICAgIGlmICghYnVmZmVyKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG4gICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuXG4gICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHJ1bGVzTm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAncnVsZXMnKTtcbiAgICBpZiAoIXJ1bGVzTm9kZSB8fCBydWxlc05vZGUua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0QmxhY2tsaXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHJ1bGVzTm9kZSwgJ2ltcG9ydC1ibGFja2xpc3QnKTtcbiAgICBpZiAoIWltcG9ydEJsYWNrbGlzdE5vZGUgfHwgaW1wb3J0QmxhY2tsaXN0Tm9kZS5raW5kICE9ICdhcnJheScpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZSh0c0xpbnRQYXRoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzW2ldO1xuICAgICAgaWYgKGVsZW1lbnQua2luZCA9PSAnc3RyaW5nJyAmJiBlbGVtZW50LnZhbHVlID09ICdyeGpzJykge1xuICAgICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IGVsZW1lbnQ7XG4gICAgICAgIC8vIFJlbW92ZSB0aGlzIGVsZW1lbnQuXG4gICAgICAgIGlmIChpID09IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIC8vIExhc3QgZWxlbWVudC5cbiAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgIC8vIE5vdCBmaXJzdCwgdGhlcmUncyBhIGNvbW1hIHRvIHJlbW92ZSBiZWZvcmUuXG4gICAgICAgICAgICBjb25zdCBwcmV2aW91cyA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaSAtIDFdO1xuICAgICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKHByZXZpb3VzLmVuZC5vZmZzZXQsIGVuZC5vZmZzZXQgLSBwcmV2aW91cy5lbmQub2Zmc2V0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gT25seSBlbGVtZW50LCBqdXN0IHJlbW92ZSB0aGUgd2hvbGUgcnVsZS5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gaW1wb3J0QmxhY2tsaXN0Tm9kZTtcbiAgICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShzdGFydC5vZmZzZXQsIGVuZC5vZmZzZXQgLSBzdGFydC5vZmZzZXQpO1xuICAgICAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChzdGFydC5vZmZzZXQsICdbXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBNaWRkbGUsIGp1c3QgcmVtb3ZlIHRoZSB3aG9sZSBub2RlICh1cCB0byBuZXh0IG5vZGUgc3RhcnQpLlxuICAgICAgICAgIGNvbnN0IG5leHQgPSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzW2kgKyAxXTtcbiAgICAgICAgICByZWNvcmRlci5yZW1vdmUoc3RhcnQub2Zmc2V0LCBuZXh0LnN0YXJ0Lm9mZnNldCAtIHN0YXJ0Lm9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoaG9zdC5leGlzdHMoJy8uYW5ndWxhci5qc29uJykgfHwgaG9zdC5leGlzdHMoJy9hbmd1bGFyLmpzb24nKSkge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnRm91bmQgYSBtb2Rlcm4gY29uZmlndXJhdGlvbiBmaWxlLiBOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG5cbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ0J1ZmZlciA9IGhvc3QucmVhZChub3JtYWxpemUoY29uZmlnUGF0aCkpO1xuICAgIGlmIChjb25maWdCdWZmZXIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICB9XG4gICAgY29uc3QgY29uZmlnID0gcGFyc2VKc29uKGNvbmZpZ0J1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcblxuICAgIGlmICh0eXBlb2YgY29uZmlnICE9ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoY29uZmlnKSB8fCBjb25maWcgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdJbnZhbGlkIGFuZ3VsYXItY2xpLmpzb24gY29uZmlndXJhdGlvbjsgZXhwZWN0ZWQgYW4gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICBtaWdyYXRlQ29uZmlndXJhdGlvbihjb25maWcsIGNvbnRleHQubG9nZ2VyKSxcbiAgICAgIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWcpLFxuICAgICAgdXBkYXRlUGFja2FnZUpzb24oY29uZmlnKSxcbiAgICAgIHVwZGF0ZVRzTGludENvbmZpZygpLFxuICAgICAgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgU29tZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgaGF2ZSBiZWVuIGNoYW5nZWQsXG4gICAgICAgICAgcGxlYXNlIG1ha2Ugc3VyZSB0byB1cGRhdGUgYW55IG5wbSBzY3JpcHRzIHdoaWNoIHlvdSBtYXkgaGF2ZSBtb2RpZmllZC5gKTtcblxuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICAgIH0sXG4gICAgXSk7XG4gIH07XG59XG4iXX0=