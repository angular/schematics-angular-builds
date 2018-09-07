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
        catch (_a) { }
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
        const targetsConfig = extractTargetsConfig(oldConfig);
        if (targetsConfig !== null) {
            config.targets = targetsConfig;
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
function extractTargetsConfig(_config) {
    return null;
}
// This function is too big, but also really hard to refactor properly as the whole config
// depends on all parts of the config.
// tslint:disable-next-line:no-big-function
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
        // This function is too big, but also really hard to refactor properly as the whole config
        // depends on all parts of the config.
        // tslint:disable-next-line:no-big-function
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
            const productionPartial = Object.assign({ optimization: true, outputHashing: 'all', sourceMap: false, extractCss: true, namedChunks: false, aot: true, extractLicenses: true, vendorChunk: false, buildOptimizer: true }, (serviceWorker ? { serviceWorker: true, ngswConfigPath: 'src/ngsw-config.json' } : {}), (app.budgets ? { budgets: app.budgets } : {}));
            if (!environments) {
                return { production: productionPartial };
            }
            const configurations = Object.keys(environments).reduce((acc, environment) => {
                if (source === environments[environment]) {
                    return acc;
                }
                let isProduction = false;
                const environmentContent = tree.read(app.root + '/' + environments[environment]);
                if (environmentContent) {
                    isProduction = !!environmentContent.toString('utf-8')
                        // Allow for `production: true` or `production = true`. Best we can do to guess.
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
                acc[configurationName] = Object.assign({}, (isProduction ? productionPartial : {}), { fileReplacements: [
                        {
                            replace: `${app.root}/${source}`,
                            with: `${app.root}/${environments[environment]}`,
                        },
                    ] });
                return acc;
            }, {});
            if (!configurations['production']) {
                configurations['production'] = Object.assign({}, productionPartial);
            }
            return configurations;
        }
        function _serveConfigurations() {
            const environments = app.environments;
            if (!environments) {
                return {};
            }
            if (!targets) {
                throw new Error();
            }
            const configurations = targets.build.configurations;
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
        const targets = {};
        project.targets = targets;
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
        targets.build = {
            builder: `${builderPackage}:browser`,
            options: buildOptions,
            configurations: _buildConfigurations(),
        };
        // Serve target
        const serveOptions = Object.assign({ browserTarget: `${name}:build` }, serveDefaults);
        targets.serve = {
            builder: `${builderPackage}:dev-server`,
            options: serveOptions,
            configurations: _serveConfigurations(),
        };
        // Extract target
        const extractI18nOptions = { browserTarget: `${name}:build` };
        targets['extract-i18n'] = {
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
            targets.test = {
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
        targets.lint = {
            builder: `${builderPackage}:tslint`,
            options: lintOptions,
        };
        // server target
        const serverApp = serverApps
            .filter(serverApp => app.root === serverApp.root && app.index === serverApp.index)[0];
        if (serverApp) {
            const serverOptions = {
                outputPath: serverApp.outDir || defaults.serverOutDir,
                main: `${appRoot}/${serverApp.main || defaults.serverMain}`,
                tsConfig: `${appRoot}/${serverApp.tsconfig || defaults.serverTsConfig}`,
            };
            const serverTarget = {
                builder: '@angular-devkit/build-angular:server',
                options: serverOptions,
            };
            targets.server = serverTarget;
        }
        const e2eProject = {
            root: core_1.join(projectRoot, 'e2e'),
            sourceRoot: core_1.join(projectRoot, 'e2e'),
            projectType: 'application',
        };
        const e2eTargets = {};
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
        e2eTargets.e2e = e2eTarget;
        const e2eLintOptions = {
            tsConfig: removeDupes(tsConfigs).filter(t => t.indexOf('e2e') !== -1),
            exclude: removeDupes(excludes),
        };
        const e2eLintTarget = {
            builder: `${builderPackage}:tslint`,
            options: e2eLintOptions,
        };
        e2eTargets.lint = e2eLintTarget;
        if (protractorConfig) {
            e2eProject.targets = e2eTargets;
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
function updateRootTsConfig() {
    return (host, context) => {
        const tsConfigPath = '/tsconfig.json';
        const buffer = host.read(tsConfigPath);
        if (!buffer) {
            return;
        }
        const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
        if (tsCfgAst.kind !== 'object') {
            throw new schematics_1.SchematicsException('Invalid root tsconfig. Was expecting an object');
        }
        const compilerOptionsAstNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'compilerOptions');
        if (!compilerOptionsAstNode || compilerOptionsAstNode.kind != 'object') {
            throw new schematics_1.SchematicsException('Invalid root tsconfig "compilerOptions" property; expected an object.');
        }
        if (json_utils_1.findPropertyInAstObject(compilerOptionsAstNode, 'baseUrl') &&
            json_utils_1.findPropertyInAstObject(compilerOptionsAstNode, 'module')) {
            return host;
        }
        const compilerOptions = compilerOptionsAstNode.value;
        const { baseUrl = './', module = 'es2015' } = compilerOptions;
        const validBaseUrl = ['./', '', '.'];
        if (!validBaseUrl.includes(baseUrl)) {
            const formattedBaseUrl = validBaseUrl.map(x => `'${x}'`).join(', ');
            context.logger.warn(core_1.tags.oneLine `Root tsconfig option 'baseUrl' is not one of: ${formattedBaseUrl}.
        This might cause unexpected behaviour when generating libraries.`);
        }
        if (module !== 'es2015') {
            context.logger.warn(`Root tsconfig option 'module' is not 'es2015'. This might cause unexpected behaviour.`);
        }
        compilerOptions.module = module;
        compilerOptions.baseUrl = baseUrl;
        host.overwrite(tsConfigPath, JSON.stringify(tsCfgAst.value, null, 2));
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
            updateRootTsConfig(),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBVzhCO0FBQzlCLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsNkRBSW9DO0FBQ3BDLHlEQUdrQztBQUNsQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLFlBQVksRUFBRSxhQUFhO0lBQzNCLFVBQVUsRUFBRSxnQkFBZ0I7SUFDNUIsY0FBYyxFQUFFLHNCQUFzQjtDQUN2QyxDQUFDO0FBRUYsU0FBUyxhQUFhLENBQUMsSUFBVTtJQUMvQixJQUFJLFlBQVksR0FBRyxnQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQzdCLE9BQU8sWUFBWSxDQUFDO0tBQ3JCO0lBQ0QsWUFBWSxHQUFHLGdCQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDN0IsT0FBTyxZQUFZLENBQUM7S0FDckI7SUFFRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxNQUFpQjtJQUNsRCxP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QUFNLENBQUM7WUFDakMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDNUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1lBQzFCLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN6QixrQkFBa0IsRUFBRTtZQUNwQixrQkFBa0IsRUFBRTtZQUNwQixDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7Z0JBQ3hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUE7a0ZBQzBDLENBQUMsQ0FBQztnQkFFNUUsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxDRCw0QkFrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBKc29uQXJyYXksXG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIFBhdGgsXG4gIGpvaW4sXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2VKc29uLFxuICBwYXJzZUpzb25Bc3QsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBDbGlDb25maWcgfSBmcm9tICcuLi8uLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeSxcbiAgTm9kZURlcGVuZGVuY3lUeXBlLFxuICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG59IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7XG4gIGFwcGVuZFZhbHVlSW5Bc3RBcnJheSxcbiAgZmluZFByb3BlcnR5SW5Bc3RPYmplY3QsXG59IGZyb20gJy4uLy4uL3V0aWxpdHkvanNvbi11dGlscyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcblxuY29uc3QgZGVmYXVsdHMgPSB7XG4gIGFwcFJvb3Q6ICdzcmMnLFxuICBpbmRleDogJ2luZGV4Lmh0bWwnLFxuICBtYWluOiAnbWFpbi50cycsXG4gIHBvbHlmaWxsczogJ3BvbHlmaWxscy50cycsXG4gIHRzQ29uZmlnOiAndHNjb25maWcuYXBwLmpzb24nLFxuICB0ZXN0OiAndGVzdC50cycsXG4gIG91dERpcjogJ2Rpc3QvJyxcbiAga2FybWE6ICdrYXJtYS5jb25mLmpzJyxcbiAgcHJvdHJhY3RvcjogJ3Byb3RyYWN0b3IuY29uZi5qcycsXG4gIHRlc3RUc0NvbmZpZzogJ3RzY29uZmlnLnNwZWMuanNvbicsXG4gIHNlcnZlck91dERpcjogJ2Rpc3Qtc2VydmVyJyxcbiAgc2VydmVyTWFpbjogJ21haW4uc2VydmVyLnRzJyxcbiAgc2VydmVyVHNDb25maWc6ICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicsXG59O1xuXG5mdW5jdGlvbiBnZXRDb25maWdQYXRoKHRyZWU6IFRyZWUpOiBQYXRoIHtcbiAgbGV0IHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnLmFuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG4gIHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cblxuICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlJyk7XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcga2FybWEgY29uZmlndXJhdGlvbmApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBrYXJtYVBhdGggPSBjb25maWcgJiYgY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWEgJiYgY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgIDogZGVmYXVsdHMua2FybWE7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQoa2FybWFQYXRoKTtcbiAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgMS4wIGZpbGVzIGFuZCBwcmVwcm9jZXNzb3IgZW50cmllcywgd2l0aCBhbmQgd2l0aG91dCBjb21tYSBhdCB0aGUgZW5kLlxuICAgICAgICAvLyBJZiB0aGVzZSByZW1haW4sIHRoZXkgd2lsbCBjYXVzZSB0aGUgYG5nIHRlc3RgIHRvIGZhaWwuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYHsgcGF0dGVybjogJy4vc3JjL3Rlc3QudHMnLCB3YXRjaGVkOiBmYWxzZSB9LGAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShgeyBwYXR0ZXJuOiAnLi9zcmMvdGVzdC50cycsIHdhdGNoZWQ6IGZhbHNlIH1gLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYCcuL3NyYy90ZXN0LnRzJzogWydAYW5ndWxhci9jbGknXSxgLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYCcuL3NyYy90ZXN0LnRzJzogWydAYW5ndWxhci9jbGknXWAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvYW5ndWxhckNsaVtefV0qfSw/LywgJycpO1xuICAgICAgICAvLyBSZXBsYWNlIDEueCBwbHVnaW4gbmFtZXMuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL0Bhbmd1bGFyXFwvY2xpL2csICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicpO1xuICAgICAgICAvLyBSZXBsYWNlIGNvZGUgY292ZXJhZ2Ugb3V0cHV0IHBhdGguXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJ3JlcG9ydHMnLFxuICAgICAgICAgIGBkaXI6IHJlcXVpcmUoJ3BhdGgnKS5qb2luKF9fZGlybmFtZSwgJ2NvdmVyYWdlJyksIHJlcG9ydHNgKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUoa2FybWFQYXRoLCBjb250ZW50KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICAnJHNjaGVtYSc6ICcuL25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbGliL2NvbmZpZy9zY2hlbWEuanNvbicsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCwgbG9nZ2VyKSxcbiAgICB9O1xuICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0ID0gZXh0cmFjdERlZmF1bHRQcm9qZWN0KG9sZENvbmZpZyk7XG4gICAgaWYgKGRlZmF1bHRQcm9qZWN0ICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuZGVmYXVsdFByb2plY3QgPSBkZWZhdWx0UHJvamVjdDtcbiAgICB9XG4gICAgY29uc3QgY2xpQ29uZmlnID0gZXh0cmFjdENsaUNvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChjbGlDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5jbGkgPSBjbGlDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHNjaGVtYXRpY3NDb25maWcgPSBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChzY2hlbWF0aWNzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuc2NoZW1hdGljcyA9IHNjaGVtYXRpY3NDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldHNDb25maWcgPSBleHRyYWN0VGFyZ2V0c0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmICh0YXJnZXRzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcudGFyZ2V0cyA9IHRhcmdldHNDb25maWc7XG4gICAgfVxuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgUmVtb3Zpbmcgb2xkIGNvbmZpZyBmaWxlICgke29sZENvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuZGVsZXRlKG9sZENvbmZpZ1BhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFdyaXRpbmcgY29uZmlnIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5jcmVhdGUoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdENsaUNvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgY29uc3QgbmV3Q29uZmlnOiBKc29uT2JqZWN0ID0ge307XG4gIGlmIChjb25maWcucGFja2FnZU1hbmFnZXIgJiYgY29uZmlnLnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCcpIHtcbiAgICBuZXdDb25maWdbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBjb25maWcucGFja2FnZU1hbmFnZXI7XG4gIH1cbiAgaWYgKGNvbmZpZy53YXJuaW5ncykge1xuICAgIGlmIChjb25maWcud2FybmluZ3MudmVyc2lvbk1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB2ZXJzaW9uTWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChjb25maWcud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB0eXBlc2NyaXB0TWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy50eXBlc2NyaXB0TWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG5ld0NvbmZpZykubGVuZ3RoID09IDAgPyBudWxsIDogbmV3Q29uZmlnO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgbGV0IGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gY29uc3QgY29uZmlnRGVmYXVsdHMgPSBjb25maWcuZGVmYXVsdHM7XG4gIGlmIChjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb25OYW1lID0gY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgZWFjaCBzY2hlbWF0aWNcbiAgICogIC0gZ2V0IHRoZSBjb25maWdcbiAgICogIC0gZmlsdGVyIG9uZSdzIHdpdGhvdXQgY29uZmlnXG4gICAqICAtIGNvbWJpbmUgdGhlbSBpbnRvIGFuIG9iamVjdFxuICAgKi9cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBzY2hlbWF0aWNDb25maWdzOiBhbnkgPSBbJ2NsYXNzJywgJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZ3VhcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2ludGVyZmFjZScsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ11cbiAgICAubWFwKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdHM6IEpzb25PYmplY3QgPSAoY29uZmlnLmRlZmF1bHRzIGFzIGFueSlbc2NoZW1hdGljTmFtZV0gfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29uZmlnOiBzY2hlbWF0aWNEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHNjaGVtYXRpYyA9PiBzY2hlbWF0aWMuY29uZmlnICE9PSBudWxsKVxuICAgIC5yZWR1Y2UoKGFsbDogSnNvbk9iamVjdCwgc2NoZW1hdGljKSA9PiB7XG4gICAgICBhbGxbY29sbGVjdGlvbk5hbWUgKyAnOicgKyBzY2hlbWF0aWMuc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuY29uZmlnO1xuXG4gICAgICByZXR1cm4gYWxsO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBjb21wb25lbnRVcGRhdGU6IEpzb25PYmplY3QgPSB7fTtcbiAgY29tcG9uZW50VXBkYXRlLnByZWZpeCA9ICcnO1xuXG4gIGNvbnN0IGNvbXBvbmVudEtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpjb21wb25lbnQnO1xuICBjb25zdCBkaXJlY3RpdmVLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6ZGlyZWN0aXZlJztcbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0gPSB7fTtcbiAgfVxuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSA9IHt9O1xuICB9XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgfVxuICBpZiAoY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnN0eWxlZXh0ID0gY29uZmlnLmRlZmF1bHRzLnN0eWxlRXh0O1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYXRpY0NvbmZpZ3M7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RUYXJnZXRzQ29uZmlnKF9jb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgdG9vIGJpZywgYnV0IGFsc28gcmVhbGx5IGhhcmQgdG8gcmVmYWN0b3IgcHJvcGVybHkgYXMgdGhlIHdob2xlIGNvbmZpZ1xuLy8gZGVwZW5kcyBvbiBhbGwgcGFydHMgb2YgdGhlIGNvbmZpZy5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iaWctZnVuY3Rpb25cbmZ1bmN0aW9uIGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhcbiAgY29uZmlnOiBDbGlDb25maWcsIHRyZWU6IFRyZWUsIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBKc29uT2JqZWN0IHtcbiAgY29uc3QgYnVpbGRlclBhY2thZ2UgPSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuICBjb25zdCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZyk7XG5cbiAgY29uc3QgYnVpbGREZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuYnVpbGRcbiAgICA/IHtcbiAgICAgIHNvdXJjZU1hcDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNvdXJjZW1hcHMsXG4gICAgICBwcm9ncmVzczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByb2dyZXNzLFxuICAgICAgcG9sbDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnBvbGwsXG4gICAgICBkZWxldGVPdXRwdXRQYXRoOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuZGVsZXRlT3V0cHV0UGF0aCxcbiAgICAgIHByZXNlcnZlU3ltbGlua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICAgICAgY29tbW9uQ2h1bms6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5jb21tb25DaHVuayxcbiAgICAgIG5hbWVkQ2h1bmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQubmFtZWRDaHVua3MsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuICBjb25zdCBzZXJ2ZURlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZVxuICAgID8ge1xuICAgICAgcG9ydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnBvcnQsXG4gICAgICBob3N0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuaG9zdCxcbiAgICAgIHNzbDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbCxcbiAgICAgIHNzbEtleTogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbEtleSxcbiAgICAgIHNzbENlcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xDZXJ0LFxuICAgICAgcHJveHlDb25maWc6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wcm94eUNvbmZpZyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IGJyb3dzZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSAhPT0gJ3NlcnZlcicpO1xuICBjb25zdCBzZXJ2ZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSA9PT0gJ3NlcnZlcicpO1xuXG4gIGNvbnN0IHByb2plY3RNYXAgPSBicm93c2VyQXBwc1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgdG9vIGJpZywgYnV0IGFsc28gcmVhbGx5IGhhcmQgdG8gcmVmYWN0b3IgcHJvcGVybHkgYXMgdGhlIHdob2xlIGNvbmZpZ1xuICAgIC8vIGRlcGVuZHMgb24gYWxsIHBhcnRzIG9mIHRoZSBjb25maWcuXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJpZy1mdW5jdGlvblxuICAgIC5tYXAoKGFwcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGFzc2V0LmFsbG93T3V0c2lkZU91dERpcikge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICBBc3NldCB3aXRoIGlucHV0ICcke2Fzc2V0LmlucHV0fScgd2FzIG5vdCBtaWdyYXRlZCBiZWNhdXNlIGl0XG4gICAgICAgICAgICAgIHVzZXMgdGhlICdhbGxvd091dHNpZGVPdXREaXInIG9wdGlvbiB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEFuZ3VsYXIgQ0xJIDYuXG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmIChhc3NldC5vdXRwdXQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiBub3JtYWxpemUoJy8nICsgYXNzZXQub3V0cHV0IGFzIHN0cmluZyksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2J1aWxkQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGFwcC5lbnZpcm9ubWVudFNvdXJjZTtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcbiAgICAgICAgY29uc3Qgc2VydmljZVdvcmtlciA9IGFwcC5zZXJ2aWNlV29ya2VyO1xuXG4gICAgICAgIGNvbnN0IHByb2R1Y3Rpb25QYXJ0aWFsID0ge1xuICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICBvdXRwdXRIYXNoaW5nOiAnYWxsJyxcbiAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgbmFtZWRDaHVua3M6IGZhbHNlLFxuICAgICAgICAgIGFvdDogdHJ1ZSxcbiAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgdmVuZG9yQ2h1bms6IGZhbHNlLFxuICAgICAgICAgIGJ1aWxkT3B0aW1pemVyOiB0cnVlLFxuICAgICAgICAgIC4uLihzZXJ2aWNlV29ya2VyID8ge3NlcnZpY2VXb3JrZXI6IHRydWUsIG5nc3dDb25maWdQYXRoOiAnc3JjL25nc3ctY29uZmlnLmpzb24nfSA6IHt9KSxcbiAgICAgICAgICAuLi4oYXBwLmJ1ZGdldHMgPyB7IGJ1ZGdldHM6IGFwcC5idWRnZXRzIGFzIEpzb25BcnJheX0gOiB7fSksXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4geyBwcm9kdWN0aW9uOiBwcm9kdWN0aW9uUGFydGlhbCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbnMgPSBPYmplY3Qua2V5cyhlbnZpcm9ubWVudHMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2UgPT09IGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pIHtcbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGlzUHJvZHVjdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgICAgY29uc3QgZW52aXJvbm1lbnRDb250ZW50ID0gdHJlZS5yZWFkKGFwcC5yb290ICsgJy8nICsgZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSk7XG4gICAgICAgICAgaWYgKGVudmlyb25tZW50Q29udGVudCkge1xuICAgICAgICAgICAgaXNQcm9kdWN0aW9uID0gISFlbnZpcm9ubWVudENvbnRlbnQudG9TdHJpbmcoJ3V0Zi04JylcbiAgICAgICAgICAgICAgLy8gQWxsb3cgZm9yIGBwcm9kdWN0aW9uOiB0cnVlYCBvciBgcHJvZHVjdGlvbiA9IHRydWVgLiBCZXN0IHdlIGNhbiBkbyB0byBndWVzcy5cbiAgICAgICAgICAgICAgLm1hdGNoKC9wcm9kdWN0aW9uWydcIl0/XFxzKls6PV1cXHMqdHJ1ZS8pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBjb25maWd1cmF0aW9uTmFtZTtcbiAgICAgICAgICAvLyBXZSB1c2VkIHRvIHVzZSBgcHJvZGAgYnkgZGVmYXVsdCBhcyB0aGUga2V5LCBpbnN0ZWFkIHdlIG5vdyB1c2UgdGhlIGZ1bGwgd29yZC5cbiAgICAgICAgICAvLyBUcnkgbm90IHRvIG92ZXJyaWRlIHRoZSBwcm9kdWN0aW9uIGtleSBpZiBpdCdzIHRoZXJlLlxuICAgICAgICAgIGlmIChlbnZpcm9ubWVudCA9PSAncHJvZCcgJiYgIWVudmlyb25tZW50c1sncHJvZHVjdGlvbiddICYmIGlzUHJvZHVjdGlvbikge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSAncHJvZHVjdGlvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gZW52aXJvbm1lbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWNjW2NvbmZpZ3VyYXRpb25OYW1lXSA9IHtcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gPyBwcm9kdWN0aW9uUGFydGlhbCA6IHt9KSxcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJlcGxhY2U6IGAke2FwcC5yb290fS8ke3NvdXJjZX1gLFxuICAgICAgICAgICAgICAgIHdpdGg6IGAke2FwcC5yb290fS8ke2Vudmlyb25tZW50c1tlbnZpcm9ubWVudF19YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuXG4gICAgICAgIGlmICghY29uZmlndXJhdGlvbnNbJ3Byb2R1Y3Rpb24nXSkge1xuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zWydwcm9kdWN0aW9uJ10gPSB7IC4uLnByb2R1Y3Rpb25QYXJ0aWFsIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29uZmlndXJhdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGFyZ2V0cykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbnMgPSAodGFyZ2V0cy5idWlsZCBhcyBKc29uT2JqZWN0KS5jb25maWd1cmF0aW9ucyBhcyBKc29uT2JqZWN0O1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb25maWd1cmF0aW9ucykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgYWNjW2Vudmlyb25tZW50XSA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGQ6JHtlbnZpcm9ubWVudH1gIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2V4dHJhRW50cnlNYXBwZXIoZXh0cmFFbnRyeTogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBsZXQgZW50cnk6IHN0cmluZyB8IEpzb25PYmplY3Q7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmFFbnRyeSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlbnRyeSA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkuaW5wdXQgYXMgc3RyaW5nIHx8ICcnKTtcbiAgICAgICAgICBlbnRyeSA9IHsgaW5wdXQsIGxhenk6IGV4dHJhRW50cnkubGF6eSB9O1xuXG4gICAgICAgICAgaWYgKGV4dHJhRW50cnkub3V0cHV0KSB7XG4gICAgICAgICAgICBlbnRyeS5idW5kbGVOYW1lID0gZXh0cmFFbnRyeS5vdXRwdXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IGpvaW4obm9ybWFsaXplKGFwcFJvb3QpLCAnLi4nKTtcbiAgICAgIGNvbnN0IHByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6IHByb2plY3RSb290LFxuICAgICAgICBzb3VyY2VSb290OiBhcHBSb290LFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHRhcmdldHM6IEpzb25PYmplY3QgPSB7fTtcbiAgICAgIHByb2plY3QudGFyZ2V0cyA9IHRhcmdldHM7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGAke2FwcFJvb3R9LyR7YXBwLmluZGV4IHx8IGRlZmF1bHRzLmluZGV4fWAsXG4gICAgICAgIG1haW46IGAke2FwcFJvb3R9LyR7YXBwLm1haW4gfHwgZGVmYXVsdHMubWFpbn1gLFxuICAgICAgICB0c0NvbmZpZzogYCR7YXBwUm9vdH0vJHthcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWd9YCxcbiAgICAgICAgLi4uKGFwcC5iYXNlSHJlZiA/IHsgYmFzZUhyZWY6IGFwcC5iYXNlSHJlZiB9IDoge30pLFxuICAgICAgICAuLi5idWlsZERlZmF1bHRzLFxuICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgYnVpbGRPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uc1xuICAgICAgICAgICYmIGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMuaW5jbHVkZVBhdGhzXG4gICAgICAgICAgJiYgQXJyYXkuaXNBcnJheShhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocylcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMgPSB7XG4gICAgICAgICAgaW5jbHVkZVBhdGhzOiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICAgLm1hcChpbmNsdWRlUGF0aCA9PiBqb2luKGFwcC5yb290IGFzIFBhdGgsIGluY2x1ZGVQYXRoKSksXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGJ1aWxkT3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpLmZpbHRlcih4ID0+ICEheCk7XG4gICAgICBidWlsZE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBidWlsZE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRhcmdldHMuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX2J1aWxkQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNlcnZlIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAsXG4gICAgICAgIC4uLnNlcnZlRGVmYXVsdHMsXG4gICAgICB9O1xuICAgICAgdGFyZ2V0cy5zZXJ2ZSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmRldi1zZXJ2ZXJgLFxuICAgICAgICBvcHRpb25zOiBzZXJ2ZU9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfc2VydmVDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCB0YXJnZXRcbiAgICAgIGNvbnN0IGV4dHJhY3RJMThuT3B0aW9uczogSnNvbk9iamVjdCA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgIH07XG4gICAgICB0YXJnZXRzWydleHRyYWN0LWkxOG4nXSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmV4dHJhY3QtaTE4bmAsXG4gICAgICAgIG9wdGlvbnM6IGV4dHJhY3RJMThuT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGthcm1hQ29uZmlnID0gY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWFcbiAgICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZyB8fCAnJ1xuICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRlc3QgdGFyZ2V0XG4gICAgICBjb25zdCB0ZXN0T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBtYWluOiBhcHBSb290ICsgJy8nICsgYXBwLnRlc3QgfHwgZGVmYXVsdHMudGVzdCxcbiAgICAgICAgICAvLyBNYWtlIGthcm1hQ29uZmlnIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgICAga2FybWFDb25maWcsXG4gICAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIHRlc3RPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnRlc3RUc2NvbmZpZykge1xuICAgICAgICAgIHRlc3RPcHRpb25zLnRzQ29uZmlnID0gYXBwUm9vdCArICcvJyArIGFwcC50ZXN0VHNjb25maWc7XG4gICAgICAgIH1cbiAgICAgIHRlc3RPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLmFzc2V0cyA9IChhcHAuYXNzZXRzIHx8IFtdKS5tYXAoX21hcEFzc2V0cykuZmlsdGVyKHggPT4gISF4KTtcblxuICAgICAgaWYgKGthcm1hQ29uZmlnKSB7XG4gICAgICAgIHRhcmdldHMudGVzdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06a2FybWFgLFxuICAgICAgICAgIG9wdGlvbnM6IHRlc3RPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCBleGNsdWRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGxldCB3YXJuRm9yTGludCA9IGZhbHNlO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIGlmIChsaW50LnByb2plY3QpIHtcbiAgICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhcm5Gb3JMaW50ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobGludC5leGNsdWRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbnQuZXhjbHVkZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgZXhjbHVkZXMucHVzaChsaW50LmV4Y2x1ZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGludC5leGNsdWRlLmZvckVhY2goZXggPT4gZXhjbHVkZXMucHVzaChleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh3YXJuRm9yTGludCkge1xuICAgICAgICBsb2dnZXIud2FybihgXG4gICAgICAgICAgTGludCB3aXRob3V0ICdwcm9qZWN0JyB3YXMgbm90IG1pZ3JhdGVkIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gQW5ndWxhciBDTEkgNi5cbiAgICAgICAgYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbW92ZUR1cGVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gaXRlbXMucmVkdWNlKChuZXdJdGVtcywgaXRlbSkgPT4ge1xuICAgICAgICBpZiAobmV3SXRlbXMuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICBuZXdJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0l0ZW1zO1xuICAgICAgfSwgW10gYXMgc3RyaW5nW10pO1xuXG4gICAgICAgIC8vIFRzbGludCB0YXJnZXRcbiAgICAgIGNvbnN0IGxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpID09PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICB0YXJnZXRzLmxpbnQgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgICAgb3B0aW9uczogbGludE9wdGlvbnMsXG4gICAgICAgIH07XG5cbiAgICAgIC8vIHNlcnZlciB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlckFwcCA9IHNlcnZlckFwcHNcbiAgICAgICAgLmZpbHRlcihzZXJ2ZXJBcHAgPT4gYXBwLnJvb3QgPT09IHNlcnZlckFwcC5yb290ICYmIGFwcC5pbmRleCA9PT0gc2VydmVyQXBwLmluZGV4KVswXTtcblxuICAgICAgaWYgKHNlcnZlckFwcCkge1xuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG91dHB1dFBhdGg6IHNlcnZlckFwcC5vdXREaXIgfHwgZGVmYXVsdHMuc2VydmVyT3V0RGlyLFxuICAgICAgICAgIG1haW46IGAke2FwcFJvb3R9LyR7c2VydmVyQXBwLm1haW4gfHwgZGVmYXVsdHMuc2VydmVyTWFpbn1gLFxuICAgICAgICAgIHRzQ29uZmlnOiBgJHthcHBSb290fS8ke3NlcnZlckFwcC50c2NvbmZpZyB8fCBkZWZhdWx0cy5zZXJ2ZXJUc0NvbmZpZ31gLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXJ2ZXJUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnNlcnZlcicsXG4gICAgICAgICAgb3B0aW9uczogc2VydmVyT3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgICAgdGFyZ2V0cy5zZXJ2ZXIgPSBzZXJ2ZXJUYXJnZXQ7XG4gICAgICB9XG4gICAgICBjb25zdCBlMmVQcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiBqb2luKHByb2plY3RSb290LCAnZTJlJyksXG4gICAgICAgIHNvdXJjZVJvb3Q6IGpvaW4ocHJvamVjdFJvb3QsICdlMmUnKSxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlMmVUYXJnZXRzOiBKc29uT2JqZWN0ID0ge307XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIGNvbnN0IHByb3RyYWN0b3JDb25maWcgPSBjb25maWcgJiYgY29uZmlnLmUyZSAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGUyZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IHByb3RyYWN0b3JDb25maWcsXG4gICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7bmFtZX06c2VydmVgLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZVRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnByb3RyYWN0b3JgLFxuICAgICAgICBvcHRpb25zOiBlMmVPcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgZTJlVGFyZ2V0cy5lMmUgPSBlMmVUYXJnZXQ7XG4gICAgICBjb25zdCBlMmVMaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSAhPT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlTGludFRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgIG9wdGlvbnM6IGUyZUxpbnRPcHRpb25zLFxuICAgICAgfTtcbiAgICAgIGUyZVRhcmdldHMubGludCA9IGUyZUxpbnRUYXJnZXQ7XG4gICAgICBpZiAocHJvdHJhY3RvckNvbmZpZykge1xuICAgICAgICBlMmVQcm9qZWN0LnRhcmdldHMgPSBlMmVUYXJnZXRzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0IH07XG4gICAgfSlcbiAgICAucmVkdWNlKChwcm9qZWN0cywgbWFwcGVkQXBwKSA9PiB7XG4gICAgICBjb25zdCB7bmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdH0gPSBtYXBwZWRBcHA7XG4gICAgICBwcm9qZWN0c1tuYW1lXSA9IHByb2plY3Q7XG4gICAgICBwcm9qZWN0c1tuYW1lICsgJy1lMmUnXSA9IGUyZVByb2plY3Q7XG5cbiAgICAgIHJldHVybiBwcm9qZWN0cztcbiAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcblxuICByZXR1cm4gcHJvamVjdE1hcDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEFwcE5hbWVQcmVmaXgoY29uZmlnOiBDbGlDb25maWcpIHtcbiAgbGV0IGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gJ2FwcCc7XG4gIGlmIChjb25maWcucHJvamVjdCAmJiBjb25maWcucHJvamVjdC5uYW1lKSB7XG4gICAgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSBjb25maWcucHJvamVjdC5uYW1lO1xuICB9XG5cbiAgcmV0dXJuIGRlZmF1bHRBcHBOYW1lUHJlZml4O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RGVmYXVsdFByb2plY3QoY29uZmlnOiBDbGlDb25maWcpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKGNvbmZpZy5hcHBzICYmIGNvbmZpZy5hcHBzWzBdKSB7XG4gICAgY29uc3QgYXBwID0gY29uZmlnLmFwcHNbMF07XG4gICAgY29uc3QgZGVmYXVsdEFwcE5hbWUgPSBnZXREZWZhdWx0QXBwTmFtZVByZWZpeChjb25maWcpO1xuICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcblxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gICAgYXBwcy5mb3JFYWNoKChhcHA6IEFwcENvbmZpZywgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgIGNvbnN0IHRlc3RUc0NvbmZpZyA9IGFwcC50ZXN0VHNjb25maWcgfHwgZGVmYXVsdHMudGVzdFRzQ29uZmlnO1xuICAgICAgY29uc3QgdHNTcGVjQ29uZmlnUGF0aCA9IGpvaW4obm9ybWFsaXplKGFwcC5yb290IHx8ICcnKSwgdGVzdFRzQ29uZmlnKTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c1NwZWNDb25maWdQYXRoKTtcblxuICAgICAgaWYgKCFidWZmZXIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG5cbiAgICAgIGNvbnN0IHRzQ2ZnQXN0ID0gcGFyc2VKc29uQXN0KGJ1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcbiAgICAgIGlmICh0c0NmZ0FzdC5raW5kICE9ICdvYmplY3QnKSB7XG4gICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdJbnZhbGlkIHRzY29uZmlnLiBXYXMgZXhwZWN0aW5nIGFuIG9iamVjdCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlc0FzdE5vZGUgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdCh0c0NmZ0FzdCwgJ2ZpbGVzJyk7XG4gICAgICBpZiAoZmlsZXNBc3ROb2RlICYmIGZpbGVzQXN0Tm9kZS5raW5kICE9ICdhcnJheScpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgdHNjb25maWcgXCJmaWxlc1wiIHByb3BlcnR5OyBleHBlY3RlZCBhbiBhcnJheS4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHRzU3BlY0NvbmZpZ1BhdGgpO1xuXG4gICAgICBjb25zdCBwb2x5ZmlsbHMgPSBhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscztcbiAgICAgIGlmICghZmlsZXNBc3ROb2RlKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmcgaWYgdGhlIGZpbGVzIGFycmF5IGRvZXMgbm90IGV4aXN0LiBUaGlzIG1lYW5zIGV4Y2x1ZGUgb3IgaW5jbHVkZSBhcmVcbiAgICAgICAgLy8gc2V0IGFuZCB3ZSBzaG91bGRuJ3QgbWVzcyB3aXRoIHRoYXQuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZmlsZXNBc3ROb2RlLnZhbHVlLmluZGV4T2YocG9seWZpbGxzKSA9PSAtMSkge1xuICAgICAgICAgIGFwcGVuZFZhbHVlSW5Bc3RBcnJheShyZWNvcmRlciwgZmlsZXNBc3ROb2RlLCBwb2x5ZmlsbHMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUGFja2FnZUpzb24oY29uZmlnOiBDbGlDb25maWcpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgZGVwZW5kZW5jeTogTm9kZURlcGVuZGVuY3kgPSB7XG4gICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgbmFtZTogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJyxcbiAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcixcbiAgICAgIG92ZXJ3cml0ZTogdHJ1ZSxcbiAgICB9O1xuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXBlbmRlbmN5KTtcblxuICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayh7XG4gICAgICBwYWNrYWdlTWFuYWdlcjogY29uZmlnLnBhY2thZ2VNYW5hZ2VyID09PSAnZGVmYXVsdCcgPyB1bmRlZmluZWQgOiBjb25maWcucGFja2FnZU1hbmFnZXIsXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzTGludENvbmZpZygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgdHNMaW50UGF0aCA9ICcvdHNsaW50Lmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c0xpbnRQYXRoKTtcbiAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuICAgIGNvbnN0IHRzQ2ZnQXN0ID0gcGFyc2VKc29uQXN0KGJ1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcblxuICAgIGlmICh0c0NmZ0FzdC5raW5kICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBydWxlc05vZGUgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdCh0c0NmZ0FzdCwgJ3J1bGVzJyk7XG4gICAgaWYgKCFydWxlc05vZGUgfHwgcnVsZXNOb2RlLmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydEJsYWNrbGlzdE5vZGUgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdChydWxlc05vZGUsICdpbXBvcnQtYmxhY2tsaXN0Jyk7XG4gICAgaWYgKCFpbXBvcnRCbGFja2xpc3ROb2RlIHx8IGltcG9ydEJsYWNrbGlzdE5vZGUua2luZCAhPSAnYXJyYXknKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUodHNMaW50UGF0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50c1tpXTtcbiAgICAgIGlmIChlbGVtZW50LmtpbmQgPT0gJ3N0cmluZycgJiYgZWxlbWVudC52YWx1ZSA9PSAncnhqcycpIHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBlbGVtZW50O1xuICAgICAgICAvLyBSZW1vdmUgdGhpcyBlbGVtZW50LlxuICAgICAgICBpZiAoaSA9PSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAvLyBMYXN0IGVsZW1lbnQuXG4gICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAvLyBOb3QgZmlyc3QsIHRoZXJlJ3MgYSBjb21tYSB0byByZW1vdmUgYmVmb3JlLlxuICAgICAgICAgICAgY29uc3QgcHJldmlvdXMgPSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzW2kgLSAxXTtcbiAgICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShwcmV2aW91cy5lbmQub2Zmc2V0LCBlbmQub2Zmc2V0IC0gcHJldmlvdXMuZW5kLm9mZnNldCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9ubHkgZWxlbWVudCwganVzdCByZW1vdmUgdGhlIHdob2xlIHJ1bGUuXG4gICAgICAgICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IGltcG9ydEJsYWNrbGlzdE5vZGU7XG4gICAgICAgICAgICByZWNvcmRlci5yZW1vdmUoc3RhcnQub2Zmc2V0LCBlbmQub2Zmc2V0IC0gc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgICAgIHJlY29yZGVyLmluc2VydExlZnQoc3RhcnQub2Zmc2V0LCAnW10nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTWlkZGxlLCBqdXN0IHJlbW92ZSB0aGUgd2hvbGUgbm9kZSAodXAgdG8gbmV4dCBub2RlIHN0YXJ0KS5cbiAgICAgICAgICBjb25zdCBuZXh0ID0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50c1tpICsgMV07XG4gICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKHN0YXJ0Lm9mZnNldCwgbmV4dC5zdGFydC5vZmZzZXQgLSBzdGFydC5vZmZzZXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVJvb3RUc0NvbmZpZygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgdHNDb25maWdQYXRoID0gJy90c2NvbmZpZy5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNDb25maWdQYXRoKTtcbiAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRzQ2ZnQXN0ID0gcGFyc2VKc29uQXN0KGJ1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcbiAgICBpZiAodHNDZmdBc3Qua2luZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdJbnZhbGlkIHJvb3QgdHNjb25maWcuIFdhcyBleHBlY3RpbmcgYW4gb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zQXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAnY29tcGlsZXJPcHRpb25zJyk7XG4gICAgaWYgKCFjb21waWxlck9wdGlvbnNBc3ROb2RlIHx8IGNvbXBpbGVyT3B0aW9uc0FzdE5vZGUua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICAgICdJbnZhbGlkIHJvb3QgdHNjb25maWcgXCJjb21waWxlck9wdGlvbnNcIiBwcm9wZXJ0eTsgZXhwZWN0ZWQgYW4gb2JqZWN0LicsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KGNvbXBpbGVyT3B0aW9uc0FzdE5vZGUsICdiYXNlVXJsJykgJiZcbiAgICAgIGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KGNvbXBpbGVyT3B0aW9uc0FzdE5vZGUsICdtb2R1bGUnKVxuICAgICkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gY29tcGlsZXJPcHRpb25zQXN0Tm9kZS52YWx1ZTtcbiAgICBjb25zdCB7IGJhc2VVcmwgPSAnLi8nLCBtb2R1bGUgPSAnZXMyMDE1J30gPSBjb21waWxlck9wdGlvbnM7XG5cbiAgICBjb25zdCB2YWxpZEJhc2VVcmwgPSBbJy4vJywgJycsICcuJ107XG4gICAgaWYgKCF2YWxpZEJhc2VVcmwuaW5jbHVkZXMoYmFzZVVybCBhcyBzdHJpbmcpKSB7XG4gICAgICBjb25zdCBmb3JtYXR0ZWRCYXNlVXJsID0gdmFsaWRCYXNlVXJsLm1hcCh4ID0+IGAnJHt4fSdgKS5qb2luKCcsICcpO1xuICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVcbiAgICAgICAgYFJvb3QgdHNjb25maWcgb3B0aW9uICdiYXNlVXJsJyBpcyBub3Qgb25lIG9mOiAke2Zvcm1hdHRlZEJhc2VVcmx9LlxuICAgICAgICBUaGlzIG1pZ2h0IGNhdXNlIHVuZXhwZWN0ZWQgYmVoYXZpb3VyIHdoZW4gZ2VuZXJhdGluZyBsaWJyYXJpZXMuYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZSAhPT0gJ2VzMjAxNScpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgIGBSb290IHRzY29uZmlnIG9wdGlvbiAnbW9kdWxlJyBpcyBub3QgJ2VzMjAxNScuIFRoaXMgbWlnaHQgY2F1c2UgdW5leHBlY3RlZCBiZWhhdmlvdXIuYCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29tcGlsZXJPcHRpb25zLm1vZHVsZSA9IG1vZHVsZTtcbiAgICBjb21waWxlck9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmw7XG5cbiAgICBob3N0Lm92ZXJ3cml0ZSh0c0NvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KHRzQ2ZnQXN0LnZhbHVlLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoaG9zdC5leGlzdHMoJy8uYW5ndWxhci5qc29uJykgfHwgaG9zdC5leGlzdHMoJy9hbmd1bGFyLmpzb24nKSkge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnRm91bmQgYSBtb2Rlcm4gY29uZmlndXJhdGlvbiBmaWxlLiBOb3RoaW5nIHRvIGJlIGRvbmUuJyk7XG5cbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ0J1ZmZlciA9IGhvc3QucmVhZChub3JtYWxpemUoY29uZmlnUGF0aCkpO1xuICAgIGlmIChjb25maWdCdWZmZXIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICB9XG4gICAgY29uc3QgY29uZmlnID0gcGFyc2VKc29uKGNvbmZpZ0J1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLkxvb3NlKTtcblxuICAgIGlmICh0eXBlb2YgY29uZmlnICE9ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoY29uZmlnKSB8fCBjb25maWcgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdJbnZhbGlkIGFuZ3VsYXItY2xpLmpzb24gY29uZmlndXJhdGlvbjsgZXhwZWN0ZWQgYW4gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICBtaWdyYXRlQ29uZmlndXJhdGlvbihjb25maWcsIGNvbnRleHQubG9nZ2VyKSxcbiAgICAgIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWcpLFxuICAgICAgdXBkYXRlUGFja2FnZUpzb24oY29uZmlnKSxcbiAgICAgIHVwZGF0ZVJvb3RUc0NvbmZpZygpLFxuICAgICAgdXBkYXRlVHNMaW50Q29uZmlnKCksXG4gICAgICAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZWBTb21lIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBoYXZlIGJlZW4gY2hhbmdlZCxcbiAgICAgICAgICBwbGVhc2UgbWFrZSBzdXJlIHRvIHVwZGF0ZSBhbnkgbnBtIHNjcmlwdHMgd2hpY2ggeW91IG1heSBoYXZlIG1vZGlmaWVkLmApO1xuXG4gICAgICAgIHJldHVybiBob3N0O1xuICAgICAgfSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==