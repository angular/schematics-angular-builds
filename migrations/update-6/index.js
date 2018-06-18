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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBVzhCO0FBQzlCLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsNkRBSW9DO0FBQ3BDLHlEQUdrQztBQUNsQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLFlBQVksRUFBRSxhQUFhO0lBQzNCLFVBQVUsRUFBRSxnQkFBZ0I7SUFDNUIsY0FBYyxFQUFFLHNCQUFzQjtDQUN2QyxDQUFDO0FBRUYsdUJBQXVCLElBQVU7SUFDL0IsSUFBSSxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUNELFlBQVksR0FBRyxnQkFBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDN0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTSxJQUFJLGdDQUFtQixDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDckUsQ0FBQztBQUVELG1DQUFtQyxNQUFpQjtJQUNsRCxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtnQkFDdEYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07Z0JBQzFCLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ25CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEMsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDaEMscUZBQXFGO2dCQUNyRiwwREFBMEQ7Z0JBQzFELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLCtDQUErQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMvRSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4Q0FBOEMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDOUUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsNEJBQTRCO2dCQUM1QixPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO2dCQUM3RSxxQ0FBcUM7Z0JBQ3JDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFDakMsMkRBQTJELENBQUMsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckMsQ0FBQztRQUNILENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVmLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsOEJBQThCLFNBQW9CLEVBQUUsTUFBeUI7SUFDM0UsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsZ0JBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFlO1lBQ3pCLFNBQVMsRUFBRSxvREFBb0Q7WUFDL0QsT0FBTyxFQUFFLENBQUM7WUFDVixjQUFjLEVBQUUsVUFBVTtZQUMxQixRQUFRLEVBQUUscUJBQXFCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7U0FDekQsQ0FBQztRQUNGLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELEVBQUUsQ0FBQyxDQUFDLGNBQWMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxFQUFFLENBQUMsQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztRQUN6QixDQUFDO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RCxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUM7UUFDdkMsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFELEVBQUUsQ0FBQyxDQUFDLGVBQWUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDO1FBQ3JDLENBQUM7UUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsYUFBYSxHQUFHLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsMEJBQTBCLE1BQWlCO0lBQ3pDLE1BQU0sU0FBUyxHQUFlLEVBQUUsQ0FBQztJQUNqQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNqRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO0lBQ3RELENBQUM7SUFDRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNwQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2xELFNBQVMsQ0FBQyxRQUFRLHFCQUNiLENBQUUsU0FBUyxDQUFDLFFBQThCLElBQUksRUFBRSxDQUFDLEVBQ2pELEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQ3hELENBQUM7UUFDSixDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3JELFNBQVMsQ0FBQyxRQUFRLHFCQUNiLENBQUUsU0FBUyxDQUFDLFFBQThCLElBQUksRUFBRSxDQUFDLEVBQ2pELEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUM5RCxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQzlFLENBQUM7QUFFRCxpQ0FBaUMsTUFBaUI7SUFDaEQsSUFBSSxjQUFjLEdBQUcscUJBQXFCLENBQUM7SUFDM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELDBDQUEwQztJQUMxQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0YsY0FBYyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxrQ0FBa0M7SUFDbEMsTUFBTSxnQkFBZ0IsR0FBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE9BQU87UUFDMUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDO1NBQ3JFLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUNuQixrQ0FBa0M7UUFDbEMsTUFBTSxpQkFBaUIsR0FBZ0IsTUFBTSxDQUFDLFFBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxDQUFDO1FBRXRGLE1BQU0sQ0FBQztZQUNMLGFBQWE7WUFDYixNQUFNLEVBQUUsaUJBQWlCO1NBQzFCLENBQUM7SUFDSixDQUFDLENBQUM7U0FDRCxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQztTQUM5QyxNQUFNLENBQUMsQ0FBQyxHQUFlLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDckMsR0FBRyxDQUFDLGNBQWMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFFdkUsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVULE1BQU0sZUFBZSxHQUFlLEVBQUUsQ0FBQztJQUN2QyxlQUFlLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUU1QixNQUFNLFlBQVksR0FBRyxjQUFjLEdBQUcsWUFBWSxDQUFDO0lBQ25ELE1BQU0sWUFBWSxHQUFHLGNBQWMsR0FBRyxZQUFZLENBQUM7SUFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQzlELGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNoRSxDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDcEIsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0lBQ3JFLENBQUM7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQUM7QUFDMUIsQ0FBQztBQUVELGdDQUFnQyxPQUFrQjtJQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELCtCQUNFLE1BQWlCLEVBQUUsSUFBVSxFQUFFLE1BQXlCO0lBRXhELE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDO0lBQ3ZELE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFN0QsTUFBTSxhQUFhLEdBQWUsTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUs7UUFDeEUsQ0FBQyxDQUFDO1lBQ0EsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVU7WUFDM0MsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVE7WUFDeEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDaEMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCO1lBQ3hELGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGdCQUFnQjtZQUN4RCx3QkFBd0IsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyx3QkFBd0I7WUFDeEUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVc7WUFDOUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVc7U0FDakM7UUFDZixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRVAsTUFBTSxhQUFhLEdBQWUsTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUs7UUFDeEUsQ0FBQyxDQUFDO1lBQ0EsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDaEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDaEMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUc7WUFDOUIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU07WUFDcEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDdEMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVc7U0FDakM7UUFDZixDQUFDLENBQUMsRUFBRSxDQUFDO0lBR1AsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7SUFDL0IsK0JBQStCO0lBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sVUFBVSxHQUFHLFdBQVc7U0FDM0IsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2hCLE1BQU0sY0FBYyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLG9CQUFvQixHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQzFGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDO1FBQ3hDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFFN0Msb0JBQW9CLEtBQTBCO1lBQzVDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sQ0FBQyxnQkFBUyxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDMUMsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7b0JBQzdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTtrQ0FDRixLQUFLLENBQUMsS0FBSzs7YUFFaEMsQ0FBQyxDQUFDO29CQUVILE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ2QsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ3hCLE1BQU0sQ0FBQzt3QkFDTCxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7d0JBQ2hCLEtBQUssRUFBRSxnQkFBUyxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQzt3QkFDN0MsTUFBTSxFQUFFLGdCQUFTLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFnQixDQUFDO3FCQUNoRCxDQUFDO2dCQUNKLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sTUFBTSxDQUFDO3dCQUNMLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTt3QkFDaEIsS0FBSyxFQUFFLGdCQUFTLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO3dCQUM3QyxNQUFNLEVBQUUsR0FBRztxQkFDWixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVEO1lBQ0UsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1lBQ3JDLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDdEMsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQztZQUV4QyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDWixDQUFDO1lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUMzRCxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekMsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDYixDQUFDO2dCQUVELElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztnQkFFekIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZCLFlBQVksR0FBRyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQzt5QkFFbEQsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7Z0JBQzVDLENBQUM7Z0JBRUQsSUFBSSxpQkFBaUIsQ0FBQztnQkFDdEIsaUZBQWlGO2dCQUNqRix3REFBd0Q7Z0JBQ3hELEVBQUUsQ0FBQyxDQUFDLFdBQVcsSUFBSSxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFDekUsaUJBQWlCLEdBQUcsWUFBWSxDQUFDO2dCQUNuQyxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLGlCQUFpQixHQUFHLFdBQVcsQ0FBQztnQkFDbEMsQ0FBQztnQkFFRCxJQUFJLFFBQVEsR0FBc0IsSUFBSSxDQUFDO2dCQUN2QyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO29CQUNsQixRQUFRLEdBQUc7d0JBQ1QsYUFBYSxFQUFFLElBQUk7d0JBQ25CLGNBQWMsRUFBRSx1QkFBdUI7cUJBQ3hDLENBQUM7Z0JBQ0osQ0FBQztnQkFFRCxHQUFHLENBQUMsaUJBQWlCLENBQUMscUJBQ2pCLENBQUMsWUFBWTtvQkFDZCxDQUFDLENBQUM7d0JBQ0EsWUFBWSxFQUFFLElBQUk7d0JBQ2xCLGFBQWEsRUFBRSxLQUFLO3dCQUNwQixTQUFTLEVBQUUsS0FBSzt3QkFDaEIsVUFBVSxFQUFFLElBQUk7d0JBQ2hCLFdBQVcsRUFBRSxLQUFLO3dCQUNsQixHQUFHLEVBQUUsSUFBSTt3QkFDVCxlQUFlLEVBQUUsSUFBSTt3QkFDckIsV0FBVyxFQUFFLEtBQUs7d0JBQ2xCLGNBQWMsRUFBRSxJQUFJO3FCQUNyQjtvQkFDRCxDQUFDLENBQUMsRUFBRSxDQUNMLEVBQ0UsQ0FBQyxZQUFZLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUMxQyxDQUFDLFlBQVksSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFDN0UsZ0JBQWdCLEVBQUU7d0JBQ2hCOzRCQUNFLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxFQUFFOzRCQUNoQyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRTt5QkFDakQ7cUJBQ0YsR0FDRixDQUFDO2dCQUVGLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDYixDQUFDLEVBQUUsRUFBZ0IsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7UUFFRDtZQUNFLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFFdEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ1osQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDZixNQUFNLElBQUksS0FBSyxFQUFFLENBQUM7WUFDcEIsQ0FBQztZQUVELE1BQU0sY0FBYyxHQUFJLFNBQVMsQ0FBQyxLQUFvQixDQUFDLGNBQTRCLENBQUM7WUFFcEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFO2dCQUM3RCxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsR0FBRyxJQUFJLFVBQVUsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFFckUsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNiLENBQUMsRUFBRSxFQUFnQixDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUVELDJCQUEyQixVQUErQjtZQUN4RCxJQUFJLEtBQTBCLENBQUM7WUFDL0IsRUFBRSxDQUFDLENBQUMsT0FBTyxVQUFVLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsS0FBSyxHQUFHLFdBQUksQ0FBQyxHQUFHLENBQUMsSUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixNQUFNLEtBQUssR0FBRyxXQUFJLENBQUMsR0FBRyxDQUFDLElBQVksRUFBRSxVQUFVLENBQUMsS0FBZSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RSxLQUFLLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFekMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDdkMsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLFdBQUksQ0FBQyxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sT0FBTyxHQUFlO1lBQzFCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFVBQVUsRUFBRSxPQUFPO1lBQ25CLFdBQVcsRUFBRSxhQUFhO1NBQzNCLENBQUM7UUFFRixNQUFNLFNBQVMsR0FBZSxFQUFFLENBQUM7UUFDakMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFNUIsaUJBQWlCO1FBQ25CLE1BQU0sWUFBWTtZQUNoQixvQ0FBb0M7WUFDcEMsVUFBVSxFQUFFLE1BQU0sRUFDbEIsS0FBSyxFQUFFLEdBQUcsT0FBTyxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxFQUNsRCxJQUFJLEVBQUUsR0FBRyxPQUFPLElBQUksR0FBRyxDQUFDLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQy9DLFFBQVEsRUFBRSxHQUFHLE9BQU8sSUFBSSxHQUFHLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFDeEQsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUNoRCxhQUFhLENBQ2pCLENBQUM7UUFFRixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNsQixZQUFZLENBQUMsU0FBUyxHQUFHLE9BQU8sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtlQUN6QixHQUFHLENBQUMsd0JBQXdCLENBQUMsWUFBWTtlQUN6QyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLENBQUM7ZUFDeEQsR0FBRyxDQUFDLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxZQUFZLENBQUMsd0JBQXdCLEdBQUc7Z0JBQ3RDLFlBQVksRUFBRSxHQUFHLENBQUMsd0JBQXdCLENBQUMsWUFBWTtxQkFDcEQsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDM0QsQ0FBQztRQUNKLENBQUM7UUFFRCxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2hFLFlBQVksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2xFLFNBQVMsQ0FBQyxLQUFLLEdBQUc7WUFDaEIsT0FBTyxFQUFFLEdBQUcsY0FBYyxVQUFVO1lBQ3BDLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLGNBQWMsRUFBRSxvQkFBb0IsRUFBRTtTQUN2QyxDQUFDO1FBRUYsZUFBZTtRQUNmLE1BQU0sWUFBWSxtQkFDaEIsYUFBYSxFQUFFLEdBQUcsSUFBSSxRQUFRLElBQzNCLGFBQWEsQ0FDakIsQ0FBQztRQUNGLFNBQVMsQ0FBQyxLQUFLLEdBQUc7WUFDaEIsT0FBTyxFQUFFLEdBQUcsY0FBYyxhQUFhO1lBQ3ZDLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLGNBQWMsRUFBRSxvQkFBb0IsRUFBRTtTQUN2QyxDQUFDO1FBRUYsaUJBQWlCO1FBQ2pCLE1BQU0sa0JBQWtCLEdBQWUsRUFBRSxhQUFhLEVBQUUsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzFFLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRztZQUMxQixPQUFPLEVBQUUsR0FBRyxjQUFjLGVBQWU7WUFDekMsT0FBTyxFQUFFLGtCQUFrQjtTQUM1QixDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDaEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxFQUFFO1lBQ2hDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDUCxjQUFjO1FBQ2hCLE1BQU0sV0FBVyxHQUFlO1lBQzVCLElBQUksRUFBRSxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLElBQUk7WUFDL0MscUNBQXFDO1lBQ3JDLFdBQVc7U0FDWixDQUFDO1FBRUosRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsV0FBVyxDQUFDLFNBQVMsR0FBRyxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7UUFDeEQsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ25CLFdBQVcsQ0FBQyxRQUFRLEdBQUcsT0FBTyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDO1FBQzFELENBQUM7UUFDSCxXQUFXLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMvRCxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDaEIsU0FBUyxDQUFDLElBQUksR0FBRztnQkFDZixPQUFPLEVBQUUsR0FBRyxjQUFjLFFBQVE7Z0JBQ2xDLE9BQU8sRUFBRSxXQUFXO2FBQ3JCLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1FBQy9CLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDeEIsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN6QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDakIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQy9CLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sV0FBVyxHQUFHLElBQUksQ0FBQztnQkFDckIsQ0FBQztnQkFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDakIsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUM5QixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNoRCxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUM7O1NBRVgsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBZSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RCLENBQUM7WUFFRCxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xCLENBQUMsRUFBYSxFQUFFLENBQUMsQ0FBQztRQUVoQixnQkFBZ0I7UUFDbEIsTUFBTSxXQUFXLEdBQWU7WUFDOUIsUUFBUSxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7UUFDRixTQUFTLENBQUMsSUFBSSxHQUFHO1lBQ2IsT0FBTyxFQUFFLEdBQUcsY0FBYyxTQUFTO1lBQ25DLE9BQU8sRUFBRSxXQUFXO1NBQ3JCLENBQUM7UUFFSixnQkFBZ0I7UUFDaEIsTUFBTSxTQUFTLEdBQUcsVUFBVTthQUN6QixNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFeEYsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNkLE1BQU0sYUFBYSxHQUFlO2dCQUNoQyxVQUFVLEVBQUUsU0FBUyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsWUFBWTtnQkFDckQsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLFVBQVU7Z0JBQzNDLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxjQUFjO2FBQ3hELENBQUM7WUFDRixNQUFNLFlBQVksR0FBZTtnQkFDL0IsT0FBTyxFQUFFLHNDQUFzQztnQkFDL0MsT0FBTyxFQUFFLGFBQWE7YUFDdkIsQ0FBQztZQUNGLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBQ2xDLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBZTtZQUM3QixJQUFJLEVBQUUsV0FBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUM7WUFDOUIsVUFBVSxFQUFFLFdBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxhQUFhO1NBQzNCLENBQUM7UUFFRixNQUFNLFlBQVksR0FBZSxFQUFFLENBQUM7UUFFcEMsMkNBQTJDO1FBQzNDLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtZQUNwRyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtZQUM5QixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1AsTUFBTSxVQUFVLEdBQWU7WUFDN0IsZ0JBQWdCLEVBQUUsZ0JBQWdCO1lBQ2xDLGVBQWUsRUFBRSxHQUFHLElBQUksUUFBUTtTQUNqQyxDQUFDO1FBQ0YsTUFBTSxTQUFTLEdBQWU7WUFDNUIsT0FBTyxFQUFFLEdBQUcsY0FBYyxhQUFhO1lBQ3ZDLE9BQU8sRUFBRSxVQUFVO1NBQ3BCLENBQUM7UUFFRixZQUFZLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQztRQUM3QixNQUFNLGNBQWMsR0FBZTtZQUNqQyxRQUFRLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDckUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztRQUNGLE1BQU0sYUFBYSxHQUFlO1lBQ2hDLE9BQU8sRUFBRSxHQUFHLGNBQWMsU0FBUztZQUNuQyxPQUFPLEVBQUUsY0FBYztTQUN4QixDQUFDO1FBQ0YsWUFBWSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7UUFDbEMsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLFVBQVUsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDO1FBQ3RDLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ3ZDLENBQUMsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUM5QixNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUMsR0FBRyxTQUFTLENBQUM7UUFDOUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUN6QixRQUFRLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUVyQyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUMsRUFBRSxFQUFnQixDQUFDLENBQUM7SUFFdkIsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBRUQsaUNBQWlDLE1BQWlCO0lBQ2hELElBQUksb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0lBQ2pDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQzdDLENBQUM7SUFFRCxNQUFNLENBQUMsb0JBQW9CLENBQUM7QUFDOUIsQ0FBQztBQUVELCtCQUErQixNQUFpQjtJQUM5QyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksSUFBSSxjQUFjLENBQUM7UUFFeEMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELDRCQUE0QixNQUFpQjtJQUMzQyxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFjLEVBQUUsR0FBVyxFQUFFLEVBQUU7WUFDM0MsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFlBQVksSUFBSSxRQUFRLENBQUMsWUFBWSxDQUFDO1lBQy9ELE1BQU0sZ0JBQWdCLEdBQUcsV0FBSSxDQUFDLGdCQUFTLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN2RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNaLE1BQU0sQ0FBQztZQUNULENBQUM7WUFHRCxNQUFNLFFBQVEsR0FBRyxtQkFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLDJDQUEyQyxDQUFDLENBQUM7WUFDN0UsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLG9DQUF1QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNoRSxFQUFFLENBQUMsQ0FBQyxZQUFZLElBQUksWUFBWSxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsdURBQXVELENBQUMsQ0FBQztZQUN6RixDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRXBELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUN0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLGtGQUFrRjtnQkFDbEYsdUNBQXVDO1lBQ3pDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hELGtDQUFxQixDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzNELENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCwyQkFBMkIsTUFBaUI7SUFDMUMsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxNQUFNLFVBQVUsR0FBbUI7WUFDakMsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7WUFDNUIsSUFBSSxFQUFFLCtCQUErQjtZQUNyQyxPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxrQkFBa0I7WUFDMUMsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQztRQUNGLHVDQUF3QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLENBQUM7WUFDekMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjO1NBQ3hGLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDtJQUNFLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxtQkFBWSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXRFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLG9DQUF1QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLG9DQUF1QixDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ25GLEVBQUUsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLElBQUksbUJBQW1CLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEUsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdELE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsSUFBSSxPQUFPLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFDO2dCQUMvQix1QkFBdUI7Z0JBQ3ZCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pELGdCQUFnQjtvQkFDaEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ1YsK0NBQStDO3dCQUMvQyxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDekUsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDTiw0Q0FBNEM7d0JBQzVDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsbUJBQW1CLENBQUM7d0JBQzNDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDekQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMxQyxDQUFDO2dCQUNILENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sOERBQThEO29CQUM5RCxNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNqRCxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7SUFDRSxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDO1FBQ1QsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLG1CQUFZLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLG9CQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFFRCxNQUFNLHNCQUFzQixHQUFHLG9DQUF1QixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BGLEVBQUUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLElBQUksc0JBQXNCLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdkUsTUFBTSxJQUFJLGdDQUFtQixDQUMzQix1RUFBdUUsQ0FDeEUsQ0FBQztRQUNKLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FDRCxvQ0FBdUIsQ0FBQyxzQkFBc0IsRUFBRSxTQUFTLENBQUM7WUFDMUQsb0NBQXVCLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUMxRCxDQUFDLENBQUMsQ0FBQztZQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxPQUFPLEdBQUcsSUFBSSxFQUFFLE1BQU0sR0FBRyxRQUFRLEVBQUMsR0FBRyxlQUFlLENBQUM7UUFFN0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FDOUIsaURBQWlELGdCQUFnQjt5RUFDQSxDQUNsRSxDQUFDO1FBQ0osQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNqQix1RkFBdUYsQ0FDeEYsQ0FBQztRQUNKLENBQUM7UUFFRCxlQUFlLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNoQyxlQUFlLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUVsQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEUsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDtJQUNFLE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHdEQUF3RCxDQUFDLENBQUM7WUFFOUUsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHNDQUFzQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxnQkFBUyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxvQkFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sTUFBTSxJQUFJLFFBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1FBQy9GLENBQUM7UUFFRCxNQUFNLENBQUMsa0JBQUssQ0FBQztZQUNYLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztZQUNqQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztZQUM1QyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7WUFDMUIsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1lBQ3pCLGtCQUFrQixFQUFFO1lBQ3BCLGtCQUFrQixFQUFFO1lBQ3BCLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtnQkFDeEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQTtrRkFDMEMsQ0FBQyxDQUFDO2dCQUU1RSxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2QsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFsQ0QsNEJBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgSnNvbkFycmF5LFxuICBKc29uT2JqZWN0LFxuICBKc29uUGFyc2VNb2RlLFxuICBQYXRoLFxuICBqb2luLFxuICBsb2dnaW5nLFxuICBub3JtYWxpemUsXG4gIHBhcnNlSnNvbixcbiAgcGFyc2VKc29uQXN0LFxuICB0YWdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBjaGFpbixcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IEFwcENvbmZpZywgQ2xpQ29uZmlnIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHtcbiAgTm9kZURlcGVuZGVuY3ksXG4gIE5vZGVEZXBlbmRlbmN5VHlwZSxcbiAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi8uLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQge1xuICBhcHBlbmRWYWx1ZUluQXN0QXJyYXksXG4gIGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0LFxufSBmcm9tICcuLi8uLi91dGlsaXR5L2pzb24tdXRpbHMnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi8uLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICBhcHBSb290OiAnc3JjJyxcbiAgaW5kZXg6ICdpbmRleC5odG1sJyxcbiAgbWFpbjogJ21haW4udHMnLFxuICBwb2x5ZmlsbHM6ICdwb2x5ZmlsbHMudHMnLFxuICB0c0NvbmZpZzogJ3RzY29uZmlnLmFwcC5qc29uJyxcbiAgdGVzdDogJ3Rlc3QudHMnLFxuICBvdXREaXI6ICdkaXN0LycsXG4gIGthcm1hOiAna2FybWEuY29uZi5qcycsXG4gIHByb3RyYWN0b3I6ICdwcm90cmFjdG9yLmNvbmYuanMnLFxuICB0ZXN0VHNDb25maWc6ICd0c2NvbmZpZy5zcGVjLmpzb24nLFxuICBzZXJ2ZXJPdXREaXI6ICdkaXN0LXNlcnZlcicsXG4gIHNlcnZlck1haW46ICdtYWluLnNlcnZlci50cycsXG4gIHNlcnZlclRzQ29uZmlnOiAndHNjb25maWcuc2VydmVyLmpzb24nLFxufTtcblxuZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCh0cmVlOiBUcmVlKTogUGF0aCB7XG4gIGxldCBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuICBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG5cbiAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZScpO1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGthcm1hIGNvbmZpZ3VyYXRpb25gKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2FybWFQYXRoID0gY29uZmlnICYmIGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hICYmIGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA6IGRlZmF1bHRzLmthcm1hO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKGthcm1hUGF0aCk7XG4gICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIDEuMCBmaWxlcyBhbmQgcHJlcHJvY2Vzc29yIGVudHJpZXMsIHdpdGggYW5kIHdpdGhvdXQgY29tbWEgYXQgdGhlIGVuZC5cbiAgICAgICAgLy8gSWYgdGhlc2UgcmVtYWluLCB0aGV5IHdpbGwgY2F1c2UgdGhlIGBuZyB0ZXN0YCB0byBmYWlsLlxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGB7IHBhdHRlcm46ICcuL3NyYy90ZXN0LnRzJywgd2F0Y2hlZDogZmFsc2UgfSxgLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYHsgcGF0dGVybjogJy4vc3JjL3Rlc3QudHMnLCB3YXRjaGVkOiBmYWxzZSB9YCwgJycpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGAnLi9zcmMvdGVzdC50cyc6IFsnQGFuZ3VsYXIvY2xpJ10sYCwgJycpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKGAnLi9zcmMvdGVzdC50cyc6IFsnQGFuZ3VsYXIvY2xpJ11gLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL2FuZ3VsYXJDbGlbXn1dKn0sPy8sICcnKTtcbiAgICAgICAgLy8gUmVwbGFjZSAxLnggcGx1Z2luIG5hbWVzLlxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9AYW5ndWxhclxcL2NsaS9nLCAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInKTtcbiAgICAgICAgLy8gUmVwbGFjZSBjb2RlIGNvdmVyYWdlIG91dHB1dCBwYXRoLlxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCdyZXBvcnRzJyxcbiAgICAgICAgICBgZGlyOiByZXF1aXJlKCdwYXRoJykuam9pbihfX2Rpcm5hbWUsICdjb3ZlcmFnZScpLCByZXBvcnRzYCk7XG4gICAgICAgIGhvc3Qub3ZlcndyaXRlKGthcm1hUGF0aCwgY29udGVudCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkgeyB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUNvbmZpZ3VyYXRpb24ob2xkQ29uZmlnOiBDbGlDb25maWcsIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGkpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgb2xkQ29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci5qc29uJyk7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcgY29uZmlndXJhdGlvbmApO1xuICAgIGNvbnN0IGNvbmZpZzogSnNvbk9iamVjdCA9IHtcbiAgICAgICckc2NoZW1hJzogJy4vbm9kZV9tb2R1bGVzL0Bhbmd1bGFyL2NsaS9saWIvY29uZmlnL3NjaGVtYS5qc29uJyxcbiAgICAgIHZlcnNpb246IDEsXG4gICAgICBuZXdQcm9qZWN0Um9vdDogJ3Byb2plY3RzJyxcbiAgICAgIHByb2plY3RzOiBleHRyYWN0UHJvamVjdHNDb25maWcob2xkQ29uZmlnLCBob3N0LCBsb2dnZXIpLFxuICAgIH07XG4gICAgY29uc3QgZGVmYXVsdFByb2plY3QgPSBleHRyYWN0RGVmYXVsdFByb2plY3Qob2xkQ29uZmlnKTtcbiAgICBpZiAoZGVmYXVsdFByb2plY3QgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5kZWZhdWx0UHJvamVjdCA9IGRlZmF1bHRQcm9qZWN0O1xuICAgIH1cbiAgICBjb25zdCBjbGlDb25maWcgPSBleHRyYWN0Q2xpQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGNsaUNvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmNsaSA9IGNsaUNvbmZpZztcbiAgICB9XG4gICAgY29uc3Qgc2NoZW1hdGljc0NvbmZpZyA9IGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKHNjaGVtYXRpY3NDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5zY2hlbWF0aWNzID0gc2NoZW1hdGljc0NvbmZpZztcbiAgICB9XG4gICAgY29uc3QgYXJjaGl0ZWN0Q29uZmlnID0gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChhcmNoaXRlY3RDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5hcmNoaXRlY3QgPSBhcmNoaXRlY3RDb25maWc7XG4gICAgfVxuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgUmVtb3Zpbmcgb2xkIGNvbmZpZyBmaWxlICgke29sZENvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuZGVsZXRlKG9sZENvbmZpZ1BhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFdyaXRpbmcgY29uZmlnIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5jcmVhdGUoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdENsaUNvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgY29uc3QgbmV3Q29uZmlnOiBKc29uT2JqZWN0ID0ge307XG4gIGlmIChjb25maWcucGFja2FnZU1hbmFnZXIgJiYgY29uZmlnLnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCcpIHtcbiAgICBuZXdDb25maWdbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBjb25maWcucGFja2FnZU1hbmFnZXI7XG4gIH1cbiAgaWYgKGNvbmZpZy53YXJuaW5ncykge1xuICAgIGlmIChjb25maWcud2FybmluZ3MudmVyc2lvbk1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB2ZXJzaW9uTWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChjb25maWcud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB0eXBlc2NyaXB0TWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy50eXBlc2NyaXB0TWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG5ld0NvbmZpZykubGVuZ3RoID09IDAgPyBudWxsIDogbmV3Q29uZmlnO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgbGV0IGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gY29uc3QgY29uZmlnRGVmYXVsdHMgPSBjb25maWcuZGVmYXVsdHM7XG4gIGlmIChjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb25OYW1lID0gY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgZWFjaCBzY2hlbWF0aWNcbiAgICogIC0gZ2V0IHRoZSBjb25maWdcbiAgICogIC0gZmlsdGVyIG9uZSdzIHdpdGhvdXQgY29uZmlnXG4gICAqICAtIGNvbWJpbmUgdGhlbSBpbnRvIGFuIG9iamVjdFxuICAgKi9cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBzY2hlbWF0aWNDb25maWdzOiBhbnkgPSBbJ2NsYXNzJywgJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZ3VhcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2ludGVyZmFjZScsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ11cbiAgICAubWFwKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdHM6IEpzb25PYmplY3QgPSAoY29uZmlnLmRlZmF1bHRzIGFzIGFueSlbc2NoZW1hdGljTmFtZV0gfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29uZmlnOiBzY2hlbWF0aWNEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHNjaGVtYXRpYyA9PiBzY2hlbWF0aWMuY29uZmlnICE9PSBudWxsKVxuICAgIC5yZWR1Y2UoKGFsbDogSnNvbk9iamVjdCwgc2NoZW1hdGljKSA9PiB7XG4gICAgICBhbGxbY29sbGVjdGlvbk5hbWUgKyAnOicgKyBzY2hlbWF0aWMuc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuY29uZmlnO1xuXG4gICAgICByZXR1cm4gYWxsO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBjb21wb25lbnRVcGRhdGU6IEpzb25PYmplY3QgPSB7fTtcbiAgY29tcG9uZW50VXBkYXRlLnByZWZpeCA9ICcnO1xuXG4gIGNvbnN0IGNvbXBvbmVudEtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpjb21wb25lbnQnO1xuICBjb25zdCBkaXJlY3RpdmVLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6ZGlyZWN0aXZlJztcbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0gPSB7fTtcbiAgfVxuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSA9IHt9O1xuICB9XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgfVxuICBpZiAoY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnN0eWxlZXh0ID0gY29uZmlnLmRlZmF1bHRzLnN0eWxlRXh0O1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYXRpY0NvbmZpZ3M7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RBcmNoaXRlY3RDb25maWcoX2NvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFByb2plY3RzQ29uZmlnKFxuICBjb25maWc6IENsaUNvbmZpZywgdHJlZTogVHJlZSwgbG9nZ2VyOiBsb2dnaW5nLkxvZ2dlckFwaSxcbik6IEpzb25PYmplY3Qge1xuICBjb25zdCBidWlsZGVyUGFja2FnZSA9ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG4gIGNvbnN0IGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gZ2V0RGVmYXVsdEFwcE5hbWVQcmVmaXgoY29uZmlnKTtcblxuICBjb25zdCBidWlsZERlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5idWlsZFxuICAgID8ge1xuICAgICAgc291cmNlTWFwOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc291cmNlbWFwcyxcbiAgICAgIHByb2dyZXNzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucHJvZ3Jlc3MsXG4gICAgICBwb2xsOiBjb25maWcuZGVmYXVsdHMuYnVpbGQucG9sbCxcbiAgICAgIGRlbGV0ZU91dHB1dFBhdGg6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5kZWxldGVPdXRwdXRQYXRoLFxuICAgICAgcHJlc2VydmVTeW1saW5rczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByZXNlcnZlU3ltbGlua3MsXG4gICAgICBzaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXM6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5zaG93Q2lyY3VsYXJEZXBlbmRlbmNpZXMsXG4gICAgICBjb21tb25DaHVuazogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLmNvbW1vbkNodW5rLFxuICAgICAgbmFtZWRDaHVua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5uYW1lZENodW5rcyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG4gIGNvbnN0IHNlcnZlRGVmYXVsdHM6IEpzb25PYmplY3QgPSBjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNlcnZlXG4gICAgPyB7XG4gICAgICBwb3J0OiBjb25maWcuZGVmYXVsdHMuc2VydmUucG9ydCxcbiAgICAgIGhvc3Q6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5ob3N0LFxuICAgICAgc3NsOiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsLFxuICAgICAgc3NsS2V5OiBjb25maWcuZGVmYXVsdHMuc2VydmUuc3NsS2V5LFxuICAgICAgc3NsQ2VydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbENlcnQsXG4gICAgICBwcm94eUNvbmZpZzogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnByb3h5Q29uZmlnLFxuICAgIH0gYXMgSnNvbk9iamVjdFxuICAgIDoge307XG5cblxuICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gIC8vIGNvbnZlcnQgdGhlIGFwcHMgdG8gcHJvamVjdHNcbiAgY29uc3QgYnJvd3NlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtICE9PSAnc2VydmVyJyk7XG4gIGNvbnN0IHNlcnZlckFwcHMgPSBhcHBzLmZpbHRlcihhcHAgPT4gYXBwLnBsYXRmb3JtID09PSAnc2VydmVyJyk7XG5cbiAgY29uc3QgcHJvamVjdE1hcCA9IGJyb3dzZXJBcHBzXG4gICAgLm1hcCgoYXBwLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IGRlZmF1bHRBcHBOYW1lID0gaWR4ID09PSAwID8gZGVmYXVsdEFwcE5hbWVQcmVmaXggOiBgJHtkZWZhdWx0QXBwTmFtZVByZWZpeH0ke2lkeH1gO1xuICAgICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lIHx8IGRlZmF1bHRBcHBOYW1lO1xuICAgICAgY29uc3Qgb3V0RGlyID0gYXBwLm91dERpciB8fCBkZWZhdWx0cy5vdXREaXI7XG4gICAgICBjb25zdCBhcHBSb290ID0gYXBwLnJvb3QgfHwgZGVmYXVsdHMuYXBwUm9vdDtcblxuICAgICAgZnVuY3Rpb24gX21hcEFzc2V0cyhhc3NldDogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBpZiAodHlwZW9mIGFzc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHJldHVybiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoYXNzZXQuYWxsb3dPdXRzaWRlT3V0RGlyKSB7XG4gICAgICAgICAgICBsb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgXG4gICAgICAgICAgICAgIEFzc2V0IHdpdGggaW5wdXQgJyR7YXNzZXQuaW5wdXR9JyB3YXMgbm90IG1pZ3JhdGVkIGJlY2F1c2UgaXRcbiAgICAgICAgICAgICAgdXNlcyB0aGUgJ2FsbG93T3V0c2lkZU91dERpcicgb3B0aW9uIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gQW5ndWxhciBDTEkgNi5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFzc2V0Lm91dHB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICAgICAgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQuaW5wdXQpLFxuICAgICAgICAgICAgICBvdXRwdXQ6IG5vcm1hbGl6ZSgnLycgKyBhc3NldC5vdXRwdXQgYXMgc3RyaW5nKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfYnVpbGRDb25maWd1cmF0aW9ucygpOiBKc29uT2JqZWN0IHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gYXBwLmVudmlyb25tZW50U291cmNlO1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuICAgICAgICBjb25zdCBzZXJ2aWNlV29ya2VyID0gYXBwLnNlcnZpY2VXb3JrZXI7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5yZWR1Y2UoKGFjYywgZW52aXJvbm1lbnQpID0+IHtcbiAgICAgICAgICBpZiAoc291cmNlID09PSBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBpc1Byb2R1Y3Rpb24gPSBmYWxzZTtcblxuICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50Q29udGVudCA9IHRyZWUucmVhZChhcHAucm9vdCArICcvJyArIGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pO1xuICAgICAgICAgIGlmIChlbnZpcm9ubWVudENvbnRlbnQpIHtcbiAgICAgICAgICAgIGlzUHJvZHVjdGlvbiA9ICEhZW52aXJvbm1lbnRDb250ZW50LnRvU3RyaW5nKCd1dGYtOCcpXG4gICAgICAgICAgICAgIC8vIEFsbG93IGZvciBgcHJvZHVjdGlvbjogdHJ1ZWAgb3IgYHByb2R1Y3Rpb24gPSB0cnVlYC4gQmVzdCB3ZSBjYW4gZG8gdG8gZ3Vlc3MuXG4gICAgICAgICAgICAgIC5tYXRjaCgvcHJvZHVjdGlvblsnXCJdP1xccypbOj1dXFxzKnRydWUvKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgY29uZmlndXJhdGlvbk5hbWU7XG4gICAgICAgICAgLy8gV2UgdXNlZCB0byB1c2UgYHByb2RgIGJ5IGRlZmF1bHQgYXMgdGhlIGtleSwgaW5zdGVhZCB3ZSBub3cgdXNlIHRoZSBmdWxsIHdvcmQuXG4gICAgICAgICAgLy8gVHJ5IG5vdCB0byBvdmVycmlkZSB0aGUgcHJvZHVjdGlvbiBrZXkgaWYgaXQncyB0aGVyZS5cbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnQgPT0gJ3Byb2QnICYmICFlbnZpcm9ubWVudHNbJ3Byb2R1Y3Rpb24nXSAmJiBpc1Byb2R1Y3Rpb24pIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9IGVudmlyb25tZW50O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBzd0NvbmZpZzogSnNvbk9iamVjdCB8IG51bGwgPSBudWxsO1xuICAgICAgICAgIGlmIChzZXJ2aWNlV29ya2VyKSB7XG4gICAgICAgICAgICBzd0NvbmZpZyA9IHtcbiAgICAgICAgICAgICAgc2VydmljZVdvcmtlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgbmdzd0NvbmZpZ1BhdGg6ICcvc3JjL25nc3ctY29uZmlnLmpzb24nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhY2NbY29uZmlndXJhdGlvbk5hbWVdID0ge1xuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvblxuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IHt9XG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvbiAmJiBzd0NvbmZpZyA/IHN3Q29uZmlnIDoge30pLFxuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvbiAmJiBhcHAuYnVkZ2V0cyA/IHsgYnVkZ2V0czogYXBwLmJ1ZGdldHMgYXMgSnNvbkFycmF5IH0gOiB7fSksXG4gICAgICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXBsYWNlOiBgJHthcHAucm9vdH0vJHtzb3VyY2V9YCxcbiAgICAgICAgICAgICAgICB3aXRoOiBgJHthcHAucm9vdH0vJHtlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdfWAsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX3NlcnZlQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IGVudmlyb25tZW50cyA9IGFwcC5lbnZpcm9ubWVudHM7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmNoaXRlY3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zID0gKGFyY2hpdGVjdC5idWlsZCBhcyBKc29uT2JqZWN0KS5jb25maWd1cmF0aW9ucyBhcyBKc29uT2JqZWN0O1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjb25maWd1cmF0aW9ucykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgYWNjW2Vudmlyb25tZW50XSA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGQ6JHtlbnZpcm9ubWVudH1gIH07XG5cbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2V4dHJhRW50cnlNYXBwZXIoZXh0cmFFbnRyeTogc3RyaW5nIHwgSnNvbk9iamVjdCkge1xuICAgICAgICBsZXQgZW50cnk6IHN0cmluZyB8IEpzb25PYmplY3Q7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmFFbnRyeSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBlbnRyeSA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgZXh0cmFFbnRyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkuaW5wdXQgYXMgc3RyaW5nIHx8ICcnKTtcbiAgICAgICAgICBlbnRyeSA9IHsgaW5wdXQsIGxhenk6IGV4dHJhRW50cnkubGF6eSB9O1xuXG4gICAgICAgICAgaWYgKGV4dHJhRW50cnkub3V0cHV0KSB7XG4gICAgICAgICAgICBlbnRyeS5idW5kbGVOYW1lID0gZXh0cmFFbnRyeS5vdXRwdXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IGpvaW4obm9ybWFsaXplKGFwcFJvb3QpLCAnLi4nKTtcbiAgICAgIGNvbnN0IHByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6IHByb2plY3RSb290LFxuICAgICAgICBzb3VyY2VSb290OiBhcHBSb290LFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuICAgICAgcHJvamVjdC5hcmNoaXRlY3QgPSBhcmNoaXRlY3Q7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGAke2FwcFJvb3R9LyR7YXBwLmluZGV4IHx8IGRlZmF1bHRzLmluZGV4fWAsXG4gICAgICAgIG1haW46IGAke2FwcFJvb3R9LyR7YXBwLm1haW4gfHwgZGVmYXVsdHMubWFpbn1gLFxuICAgICAgICB0c0NvbmZpZzogYCR7YXBwUm9vdH0vJHthcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWd9YCxcbiAgICAgICAgLi4uKGFwcC5iYXNlSHJlZiA/IHsgYmFzZUhyZWY6IGFwcC5iYXNlSHJlZiB9IDoge30pLFxuICAgICAgICAuLi5idWlsZERlZmF1bHRzLFxuICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgYnVpbGRPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9uc1xuICAgICAgICAgICYmIGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMuaW5jbHVkZVBhdGhzXG4gICAgICAgICAgJiYgQXJyYXkuaXNBcnJheShhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocylcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnMgPSB7XG4gICAgICAgICAgaW5jbHVkZVBhdGhzOiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICAgLm1hcChpbmNsdWRlUGF0aCA9PiBqb2luKGFwcC5yb290IGFzIFBhdGgsIGluY2x1ZGVQYXRoKSksXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGJ1aWxkT3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpLmZpbHRlcih4ID0+ICEheCk7XG4gICAgICBidWlsZE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBidWlsZE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGFyY2hpdGVjdC5idWlsZCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmJyb3dzZXJgLFxuICAgICAgICBvcHRpb25zOiBidWlsZE9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfYnVpbGRDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gU2VydmUgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCxcbiAgICAgICAgLi4uc2VydmVEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3Quc2VydmUgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpkZXYtc2VydmVyYCxcbiAgICAgICAgb3B0aW9uczogc2VydmVPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX3NlcnZlQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgdGFyZ2V0XG4gICAgICBjb25zdCBleHRyYWN0STE4bk9wdGlvbnM6IEpzb25PYmplY3QgPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCB9O1xuICAgICAgYXJjaGl0ZWN0WydleHRyYWN0LWkxOG4nXSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmV4dHJhY3QtaTE4bmAsXG4gICAgICAgIG9wdGlvbnM6IGV4dHJhY3RJMThuT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGthcm1hQ29uZmlnID0gY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWFcbiAgICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZyB8fCAnJ1xuICAgICAgICAgIDogJyc7XG4gICAgICAgIC8vIFRlc3QgdGFyZ2V0XG4gICAgICBjb25zdCB0ZXN0T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBtYWluOiBhcHBSb290ICsgJy8nICsgYXBwLnRlc3QgfHwgZGVmYXVsdHMudGVzdCxcbiAgICAgICAgICAvLyBNYWtlIGthcm1hQ29uZmlnIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgICAga2FybWFDb25maWcsXG4gICAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIHRlc3RPcHRpb25zLnBvbHlmaWxscyA9IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXBwLnRlc3RUc2NvbmZpZykge1xuICAgICAgICAgIHRlc3RPcHRpb25zLnRzQ29uZmlnID0gYXBwUm9vdCArICcvJyArIGFwcC50ZXN0VHNjb25maWc7XG4gICAgICAgIH1cbiAgICAgIHRlc3RPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLmFzc2V0cyA9IChhcHAuYXNzZXRzIHx8IFtdKS5tYXAoX21hcEFzc2V0cykuZmlsdGVyKHggPT4gISF4KTtcblxuICAgICAgaWYgKGthcm1hQ29uZmlnKSB7XG4gICAgICAgIGFyY2hpdGVjdC50ZXN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTprYXJtYWAsXG4gICAgICAgICAgb3B0aW9uczogdGVzdE9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRzQ29uZmlnczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IGV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgbGV0IHdhcm5Gb3JMaW50ID0gZmFsc2U7XG4gICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5saW50ICYmIEFycmF5LmlzQXJyYXkoY29uZmlnLmxpbnQpKSB7XG4gICAgICAgIGNvbmZpZy5saW50LmZvckVhY2gobGludCA9PiB7XG4gICAgICAgICAgaWYgKGxpbnQucHJvamVjdCkge1xuICAgICAgICAgICAgdHNDb25maWdzLnB1c2gobGludC5wcm9qZWN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FybkZvckxpbnQgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChsaW50LmV4Y2x1ZGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGludC5leGNsdWRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBleGNsdWRlcy5wdXNoKGxpbnQuZXhjbHVkZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsaW50LmV4Y2x1ZGUuZm9yRWFjaChleCA9PiBleGNsdWRlcy5wdXNoKGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHdhcm5Gb3JMaW50KSB7XG4gICAgICAgIGxvZ2dlci53YXJuKGBcbiAgICAgICAgICBMaW50IHdpdGhvdXQgJ3Byb2plY3QnIHdhcyBub3QgbWlncmF0ZWQgd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBpbiBBbmd1bGFyIENMSSA2LlxuICAgICAgICBgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVtb3ZlRHVwZXMgPSAoaXRlbXM6IHN0cmluZ1tdKSA9PiBpdGVtcy5yZWR1Y2UoKG5ld0l0ZW1zLCBpdGVtKSA9PiB7XG4gICAgICAgIGlmIChuZXdJdGVtcy5pbmRleE9mKGl0ZW0pID09PSAtMSkge1xuICAgICAgICAgIG5ld0l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3SXRlbXM7XG4gICAgICB9LCA8c3RyaW5nW10+IFtdKTtcblxuICAgICAgICAvLyBUc2xpbnQgdGFyZ2V0XG4gICAgICBjb25zdCBsaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSA9PT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LmxpbnQgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgICAgb3B0aW9uczogbGludE9wdGlvbnMsXG4gICAgICAgIH07XG5cbiAgICAgIC8vIHNlcnZlciB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlckFwcCA9IHNlcnZlckFwcHNcbiAgICAgICAgLmZpbHRlcihzZXJ2ZXJBcHAgPT4gYXBwLnJvb3QgPT09IHNlcnZlckFwcC5yb290ICYmIGFwcC5pbmRleCA9PT0gc2VydmVyQXBwLmluZGV4KVswXTtcblxuICAgICAgaWYgKHNlcnZlckFwcCkge1xuICAgICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG91dHB1dFBhdGg6IHNlcnZlckFwcC5vdXREaXIgfHwgZGVmYXVsdHMuc2VydmVyT3V0RGlyLFxuICAgICAgICAgIG1haW46IHNlcnZlckFwcC5tYWluIHx8IGRlZmF1bHRzLnNlcnZlck1haW4sXG4gICAgICAgICAgdHNDb25maWc6IHNlcnZlckFwcC50c2NvbmZpZyB8fCBkZWZhdWx0cy5zZXJ2ZXJUc0NvbmZpZyxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgc2VydmVyVGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpzZXJ2ZXInLFxuICAgICAgICAgIG9wdGlvbnM6IHNlcnZlck9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICAgIGFyY2hpdGVjdC5zZXJ2ZXIgPSBzZXJ2ZXJUYXJnZXQ7XG4gICAgICB9XG4gICAgICBjb25zdCBlMmVQcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiBqb2luKHByb2plY3RSb290LCAnZTJlJyksXG4gICAgICAgIHNvdXJjZVJvb3Q6IGpvaW4ocHJvamVjdFJvb3QsICdlMmUnKSxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlMmVBcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcblxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgY29uc3QgcHJvdHJhY3RvckNvbmZpZyA9IGNvbmZpZyAmJiBjb25maWcuZTJlICYmIGNvbmZpZy5lMmUucHJvdHJhY3RvciAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgID8gY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgZTJlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcHJvdHJhY3RvckNvbmZpZzogcHJvdHJhY3RvckNvbmZpZyxcbiAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtuYW1lfTpzZXJ2ZWAsXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlVGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06cHJvdHJhY3RvcmAsXG4gICAgICAgIG9wdGlvbnM6IGUyZU9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBlMmVBcmNoaXRlY3QuZTJlID0gZTJlVGFyZ2V0O1xuICAgICAgY29uc3QgZTJlTGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgIT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZUxpbnRUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICBvcHRpb25zOiBlMmVMaW50T3B0aW9ucyxcbiAgICAgIH07XG4gICAgICBlMmVBcmNoaXRlY3QubGludCA9IGUyZUxpbnRUYXJnZXQ7XG4gICAgICBpZiAocHJvdHJhY3RvckNvbmZpZykge1xuICAgICAgICBlMmVQcm9qZWN0LmFyY2hpdGVjdCA9IGUyZUFyY2hpdGVjdDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgbmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdCB9O1xuICAgIH0pXG4gICAgLnJlZHVjZSgocHJvamVjdHMsIG1hcHBlZEFwcCkgPT4ge1xuICAgICAgY29uc3Qge25hbWUsIHByb2plY3QsIGUyZVByb2plY3R9ID0gbWFwcGVkQXBwO1xuICAgICAgcHJvamVjdHNbbmFtZV0gPSBwcm9qZWN0O1xuICAgICAgcHJvamVjdHNbbmFtZSArICctZTJlJ10gPSBlMmVQcm9qZWN0O1xuXG4gICAgICByZXR1cm4gcHJvamVjdHM7XG4gICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG5cbiAgcmV0dXJuIHByb2plY3RNYXA7XG59XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZzogQ2xpQ29uZmlnKSB7XG4gIGxldCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9ICdhcHAnO1xuICBpZiAoY29uZmlnLnByb2plY3QgJiYgY29uZmlnLnByb2plY3QubmFtZSkge1xuICAgIGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gY29uZmlnLnByb2plY3QubmFtZTtcbiAgfVxuXG4gIHJldHVybiBkZWZhdWx0QXBwTmFtZVByZWZpeDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdERlZmF1bHRQcm9qZWN0KGNvbmZpZzogQ2xpQ29uZmlnKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIGNvbnN0IGFwcCA9IGNvbmZpZy5hcHBzWzBdO1xuICAgIGNvbnN0IGRlZmF1bHRBcHBOYW1lID0gZ2V0RGVmYXVsdEFwcE5hbWVQcmVmaXgoY29uZmlnKTtcbiAgICBjb25zdCBuYW1lID0gYXBwLm5hbWUgfHwgZGVmYXVsdEFwcE5hbWU7XG5cbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAgIGFwcHMuZm9yRWFjaCgoYXBwOiBBcHBDb25maWcsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCB0ZXN0VHNDb25maWcgPSBhcHAudGVzdFRzY29uZmlnIHx8IGRlZmF1bHRzLnRlc3RUc0NvbmZpZztcbiAgICAgIGNvbnN0IHRzU3BlY0NvbmZpZ1BhdGggPSBqb2luKG5vcm1hbGl6ZShhcHAucm9vdCB8fCAnJyksIHRlc3RUc0NvbmZpZyk7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNTcGVjQ29uZmlnUGF0aCk7XG5cbiAgICAgIGlmICghYnVmZmVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuXG4gICAgICBjb25zdCB0c0NmZ0FzdCA9IHBhcnNlSnNvbkFzdChidWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG4gICAgICBpZiAodHNDZmdBc3Qua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCB0c2NvbmZpZy4gV2FzIGV4cGVjdGluZyBhbiBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZXNBc3ROb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QodHNDZmdBc3QsICdmaWxlcycpO1xuICAgICAgaWYgKGZpbGVzQXN0Tm9kZSAmJiBmaWxlc0FzdE5vZGUua2luZCAhPSAnYXJyYXknKSB7XG4gICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdJbnZhbGlkIHRzY29uZmlnIFwiZmlsZXNcIiBwcm9wZXJ0eTsgZXhwZWN0ZWQgYW4gYXJyYXkuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZSh0c1NwZWNDb25maWdQYXRoKTtcblxuICAgICAgY29uc3QgcG9seWZpbGxzID0gYXBwLnBvbHlmaWxscyB8fCBkZWZhdWx0cy5wb2x5ZmlsbHM7XG4gICAgICBpZiAoIWZpbGVzQXN0Tm9kZSkge1xuICAgICAgICAvLyBEbyBub3RoaW5nIGlmIHRoZSBmaWxlcyBhcnJheSBkb2VzIG5vdCBleGlzdC4gVGhpcyBtZWFucyBleGNsdWRlIG9yIGluY2x1ZGUgYXJlXG4gICAgICAgIC8vIHNldCBhbmQgd2Ugc2hvdWxkbid0IG1lc3Mgd2l0aCB0aGF0LlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZpbGVzQXN0Tm9kZS52YWx1ZS5pbmRleE9mKHBvbHlmaWxscykgPT0gLTEpIHtcbiAgICAgICAgICBhcHBlbmRWYWx1ZUluQXN0QXJyYXkocmVjb3JkZXIsIGZpbGVzQXN0Tm9kZSwgcG9seWZpbGxzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVBhY2thZ2VKc29uKGNvbmZpZzogQ2xpQ29uZmlnKSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGRlcGVuZGVuY3k6IE5vZGVEZXBlbmRlbmN5ID0ge1xuICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgIG5hbWU6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicsXG4gICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIsXG4gICAgICBvdmVyd3JpdGU6IHRydWUsXG4gICAgfTtcbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgZGVwZW5kZW5jeSk7XG5cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soe1xuICAgICAgcGFja2FnZU1hbmFnZXI6IGNvbmZpZy5wYWNrYWdlTWFuYWdlciA9PT0gJ2RlZmF1bHQnID8gdW5kZWZpbmVkIDogY29uZmlnLnBhY2thZ2VNYW5hZ2VyLFxuICAgIH0pKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0xpbnRDb25maWcoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRzTGludFBhdGggPSAnL3RzbGludC5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNMaW50UGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cbiAgICBjb25zdCB0c0NmZ0FzdCA9IHBhcnNlSnNvbkFzdChidWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG5cbiAgICBpZiAodHNDZmdBc3Qua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcnVsZXNOb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QodHNDZmdBc3QsICdydWxlcycpO1xuICAgIGlmICghcnVsZXNOb2RlIHx8IHJ1bGVzTm9kZS5raW5kICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRCbGFja2xpc3ROb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QocnVsZXNOb2RlLCAnaW1wb3J0LWJsYWNrbGlzdCcpO1xuICAgIGlmICghaW1wb3J0QmxhY2tsaXN0Tm9kZSB8fCBpbXBvcnRCbGFja2xpc3ROb2RlLmtpbmQgIT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHRzTGludFBhdGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZWxlbWVudCA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaV07XG4gICAgICBpZiAoZWxlbWVudC5raW5kID09ICdzdHJpbmcnICYmIGVsZW1lbnQudmFsdWUgPT0gJ3J4anMnKSB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gZWxlbWVudDtcbiAgICAgICAgLy8gUmVtb3ZlIHRoaXMgZWxlbWVudC5cbiAgICAgICAgaWYgKGkgPT0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgLy8gTGFzdCBlbGVtZW50LlxuICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgLy8gTm90IGZpcnN0LCB0aGVyZSdzIGEgY29tbWEgdG8gcmVtb3ZlIGJlZm9yZS5cbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzID0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50c1tpIC0gMV07XG4gICAgICAgICAgICByZWNvcmRlci5yZW1vdmUocHJldmlvdXMuZW5kLm9mZnNldCwgZW5kLm9mZnNldCAtIHByZXZpb3VzLmVuZC5vZmZzZXQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBPbmx5IGVsZW1lbnQsIGp1c3QgcmVtb3ZlIHRoZSB3aG9sZSBydWxlLlxuICAgICAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBpbXBvcnRCbGFja2xpc3ROb2RlO1xuICAgICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKHN0YXJ0Lm9mZnNldCwgZW5kLm9mZnNldCAtIHN0YXJ0Lm9mZnNldCk7XG4gICAgICAgICAgICByZWNvcmRlci5pbnNlcnRMZWZ0KHN0YXJ0Lm9mZnNldCwgJ1tdJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE1pZGRsZSwganVzdCByZW1vdmUgdGhlIHdob2xlIG5vZGUgKHVwIHRvIG5leHQgbm9kZSBzdGFydCkuXG4gICAgICAgICAgY29uc3QgbmV4dCA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaSArIDFdO1xuICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShzdGFydC5vZmZzZXQsIG5leHQuc3RhcnQub2Zmc2V0IC0gc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVSb290VHNDb25maWcoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRzQ29uZmlnUGF0aCA9ICcvdHNjb25maWcuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzQ29uZmlnUGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0c0NmZ0FzdCA9IHBhcnNlSnNvbkFzdChidWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG4gICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCByb290IHRzY29uZmlnLiBXYXMgZXhwZWN0aW5nIGFuIG9iamVjdCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGVyT3B0aW9uc0FzdE5vZGUgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdCh0c0NmZ0FzdCwgJ2NvbXBpbGVyT3B0aW9ucycpO1xuICAgIGlmICghY29tcGlsZXJPcHRpb25zQXN0Tm9kZSB8fCBjb21waWxlck9wdGlvbnNBc3ROb2RlLmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgICAnSW52YWxpZCByb290IHRzY29uZmlnIFwiY29tcGlsZXJPcHRpb25zXCIgcHJvcGVydHk7IGV4cGVjdGVkIGFuIG9iamVjdC4nLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICBmaW5kUHJvcGVydHlJbkFzdE9iamVjdChjb21waWxlck9wdGlvbnNBc3ROb2RlLCAnYmFzZVVybCcpICYmXG4gICAgICBmaW5kUHJvcGVydHlJbkFzdE9iamVjdChjb21waWxlck9wdGlvbnNBc3ROb2RlLCAnbW9kdWxlJylcbiAgICApIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyT3B0aW9uc0FzdE5vZGUudmFsdWU7XG4gICAgY29uc3QgeyBiYXNlVXJsID0gJy4vJywgbW9kdWxlID0gJ2VzMjAxNSd9ID0gY29tcGlsZXJPcHRpb25zO1xuXG4gICAgY29uc3QgdmFsaWRCYXNlVXJsID0gWycuLycsICcnLCAnLiddO1xuICAgIGlmICghdmFsaWRCYXNlVXJsLmluY2x1ZGVzKGJhc2VVcmwgYXMgc3RyaW5nKSkge1xuICAgICAgY29uc3QgZm9ybWF0dGVkQmFzZVVybCA9IHZhbGlkQmFzZVVybC5tYXAoeCA9PiBgJyR7eH0nYCkuam9pbignLCAnKTtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4odGFncy5vbmVMaW5lXG4gICAgICAgIGBSb290IHRzY29uZmlnIG9wdGlvbiAnYmFzZVVybCcgaXMgbm90IG9uZSBvZjogJHtmb3JtYXR0ZWRCYXNlVXJsfS5cbiAgICAgICAgVGhpcyBtaWdodCBjYXVzZSB1bmV4cGVjdGVkIGJlaGF2aW91ciB3aGVuIGdlbmVyYXRpbmcgbGlicmFyaWVzLmAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUgIT09ICdlczIwMTUnKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICBgUm9vdCB0c2NvbmZpZyBvcHRpb24gJ21vZHVsZScgaXMgbm90ICdlczIwMTUnLiBUaGlzIG1pZ2h0IGNhdXNlIHVuZXhwZWN0ZWQgYmVoYXZpb3VyLmAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbXBpbGVyT3B0aW9ucy5tb2R1bGUgPSBtb2R1bGU7XG4gICAgY29tcGlsZXJPcHRpb25zLmJhc2VVcmwgPSBiYXNlVXJsO1xuXG4gICAgaG9zdC5vdmVyd3JpdGUodHNDb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeSh0c0NmZ0FzdC52YWx1ZSwgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgaWYgKGhvc3QuZXhpc3RzKCcvLmFuZ3VsYXIuanNvbicpIHx8IGhvc3QuZXhpc3RzKCcvYW5ndWxhci5qc29uJykpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ0ZvdW5kIGEgbW9kZXJuIGNvbmZpZ3VyYXRpb24gZmlsZS4gTm90aGluZyB0byBiZSBkb25lLicpO1xuXG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBjb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdCdWZmZXIgPSBob3N0LnJlYWQobm9ybWFsaXplKGNvbmZpZ1BhdGgpKTtcbiAgICBpZiAoY29uZmlnQnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZyA9IHBhcnNlSnNvbihjb25maWdCdWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG5cbiAgICBpZiAodHlwZW9mIGNvbmZpZyAhPSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KGNvbmZpZykgfHwgY29uZmlnID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCBhbmd1bGFyLWNsaS5qc29uIGNvbmZpZ3VyYXRpb247IGV4cGVjdGVkIGFuIG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWcpLFxuICAgICAgbWlncmF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnLCBjb250ZXh0LmxvZ2dlciksXG4gICAgICB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnKSxcbiAgICAgIHVwZGF0ZVBhY2thZ2VKc29uKGNvbmZpZyksXG4gICAgICB1cGRhdGVSb290VHNDb25maWcoKSxcbiAgICAgIHVwZGF0ZVRzTGludENvbmZpZygpLFxuICAgICAgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0YWdzLm9uZUxpbmVgU29tZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgaGF2ZSBiZWVuIGNoYW5nZWQsXG4gICAgICAgICAgcGxlYXNlIG1ha2Ugc3VyZSB0byB1cGRhdGUgYW55IG5wbSBzY3JpcHRzIHdoaWNoIHlvdSBtYXkgaGF2ZSBtb2RpZmllZC5gKTtcblxuICAgICAgICByZXR1cm4gaG9zdDtcbiAgICAgIH0sXG4gICAgXSk7XG4gIH07XG59XG4iXX0=