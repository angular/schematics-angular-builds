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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBVzhCO0FBQzlCLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsNkRBSW9DO0FBQ3BDLHlEQUdrQztBQUNsQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0lBQ2xDLFlBQVksRUFBRSxhQUFhO0lBQzNCLFVBQVUsRUFBRSxnQkFBZ0I7SUFDNUIsY0FBYyxFQUFFLHNCQUFzQjtDQUN2QyxDQUFDO0FBRUYsdUJBQXVCLElBQVU7SUFDL0IsSUFBSSxZQUFZLEdBQUcsZ0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ2xELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUNELFlBQVksR0FBRyxnQkFBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDN0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTSxJQUFJLGdDQUFtQixDQUFDLG1DQUFtQyxDQUFD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QzVDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztZQUMxQixpQkFBaUIsQ0FBQyxNQUFNLENBQUM7WUFDekIsa0JBQWtCLEVBQUU7WUFDcEIsa0JBQWtCLEVBQUU7WUFDcEIsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO2dCQUN4QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBO2tGQUMwQyxDQUFDLENBQUM7Z0JBRTVFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxDRCw0QkFrQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBKc29uQXJyYXksXG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIFBhdGgsXG4gIGpvaW4sXG4gIGxvZ2dpbmcsXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2VKc29uLFxuICBwYXJzZUpzb25Bc3QsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBDbGlDb25maWcgfSBmcm9tICcuLi8uLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeSxcbiAgTm9kZURlcGVuZGVuY3lUeXBlLFxuICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG59IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7XG4gIGFwcGVuZFZhbHVlSW5Bc3RBcnJheSxcbiAgZmluZFByb3BlcnR5SW5Bc3RPYmplY3QsXG59IGZyb20gJy4uLy4uL3V0aWxpdHkvanNvbi11dGlscyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcblxuY29uc3QgZGVmYXVsdHMgPSB7XG4gIGFwcFJvb3Q6ICdzcmMnLFxuICBpbmRleDogJ2luZGV4Lmh0bWwnLFxuICBtYWluOiAnbWFpbi50cycsXG4gIHBvbHlmaWxsczogJ3BvbHlmaWxscy50cycsXG4gIHRzQ29uZmlnOiAndHNjb25maWcuYXBwLmpzb24nLFxuICB0ZXN0OiAndGVzdC50cycsXG4gIG91dERpcjogJ2Rpc3QvJyxcbiAga2FybWE6ICdrYXJtYS5jb25mLmpzJyxcbiAgcHJvdHJhY3RvcjogJ3Byb3RyYWN0b3IuY29uZi5qcycsXG4gIHRlc3RUc0NvbmZpZzogJ3RzY29uZmlnLnNwZWMuanNvbicsXG4gIHNlcnZlck91dERpcjogJ2Rpc3Qtc2VydmVyJyxcbiAgc2VydmVyTWFpbjogJ21haW4uc2VydmVyLnRzJyxcbiAgc2VydmVyVHNDb25maWc6ICd0c2NvbmZpZy5zZXJ2ZXIuanNvbicsXG59O1xuXG5mdW5jdGlvbiBnZXRDb25maWdQYXRoKHRyZWU6IFRyZWUpOiBQYXRoIHtcbiAgbGV0IHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnLmFuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG4gIHBvc3NpYmxlUGF0aCA9IG5vcm1hbGl6ZSgnYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cblxuICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlJyk7XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgVXBkYXRpbmcga2FybWEgY29uZmlndXJhdGlvbmApO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBrYXJtYVBhdGggPSBjb25maWcgJiYgY29uZmlnLnRlc3QgJiYgY29uZmlnLnRlc3Qua2FybWEgJiYgY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnXG4gICAgICAgIDogZGVmYXVsdHMua2FybWE7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQoa2FybWFQYXRoKTtcbiAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgMS4wIGZpbGVzIGFuZCBwcmVwcm9jZXNzb3IgZW50cmllcywgd2l0aCBhbmQgd2l0aG91dCBjb21tYSBhdCB0aGUgZW5kLlxuICAgICAgICAvLyBJZiB0aGVzZSByZW1haW4sIHRoZXkgd2lsbCBjYXVzZSB0aGUgYG5nIHRlc3RgIHRvIGZhaWwuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYHsgcGF0dGVybjogJy4vc3JjL3Rlc3QudHMnLCB3YXRjaGVkOiBmYWxzZSB9LGAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZShgeyBwYXR0ZXJuOiAnLi9zcmMvdGVzdC50cycsIHdhdGNoZWQ6IGZhbHNlIH1gLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYCcuL3NyYy90ZXN0LnRzJzogWydAYW5ndWxhci9jbGknXSxgLCAnJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoYCcuL3NyYy90ZXN0LnRzJzogWydAYW5ndWxhci9jbGknXWAsICcnKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvYW5ndWxhckNsaVtefV0qfSw/LywgJycpO1xuICAgICAgICAvLyBSZXBsYWNlIDEueCBwbHVnaW4gbmFtZXMuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL0Bhbmd1bGFyXFwvY2xpL2csICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcicpO1xuICAgICAgICAvLyBSZXBsYWNlIGNvZGUgY292ZXJhZ2Ugb3V0cHV0IHBhdGguXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJ3JlcG9ydHMnLFxuICAgICAgICAgIGBkaXI6IHJlcXVpcmUoJ3BhdGgnKS5qb2luKF9fZGlybmFtZSwgJ2NvdmVyYWdlJyksIHJlcG9ydHNgKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUoa2FybWFQYXRoLCBjb250ZW50KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnLCBsb2dnZXI6IGxvZ2dpbmcuTG9nZ2VyQXBpKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICAnJHNjaGVtYSc6ICcuL25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbGliL2NvbmZpZy9zY2hlbWEuanNvbicsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCwgbG9nZ2VyKSxcbiAgICB9O1xuICAgIGNvbnN0IGRlZmF1bHRQcm9qZWN0ID0gZXh0cmFjdERlZmF1bHRQcm9qZWN0KG9sZENvbmZpZyk7XG4gICAgaWYgKGRlZmF1bHRQcm9qZWN0ICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuZGVmYXVsdFByb2plY3QgPSBkZWZhdWx0UHJvamVjdDtcbiAgICB9XG4gICAgY29uc3QgY2xpQ29uZmlnID0gZXh0cmFjdENsaUNvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChjbGlDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5jbGkgPSBjbGlDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHNjaGVtYXRpY3NDb25maWcgPSBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChzY2hlbWF0aWNzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuc2NoZW1hdGljcyA9IHNjaGVtYXRpY3NDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IGFyY2hpdGVjdENvbmZpZyA9IGV4dHJhY3RBcmNoaXRlY3RDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoYXJjaGl0ZWN0Q29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0Q29uZmlnO1xuICAgIH1cblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFJlbW92aW5nIG9sZCBjb25maWcgZmlsZSAoJHtvbGRDb25maWdQYXRofSlgKTtcbiAgICBob3N0LmRlbGV0ZShvbGRDb25maWdQYXRoKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBXcml0aW5nIGNvbmZpZyBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuY3JlYXRlKGNvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RDbGlDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGNvbnN0IG5ld0NvbmZpZzogSnNvbk9iamVjdCA9IHt9O1xuICBpZiAoY29uZmlnLnBhY2thZ2VNYW5hZ2VyICYmIGNvbmZpZy5wYWNrYWdlTWFuYWdlciAhPT0gJ2RlZmF1bHQnKSB7XG4gICAgbmV3Q29uZmlnWydwYWNrYWdlTWFuYWdlciddID0gY29uZmlnLnBhY2thZ2VNYW5hZ2VyO1xuICB9XG4gIGlmIChjb25maWcud2FybmluZ3MpIHtcbiAgICBpZiAoY29uZmlnLndhcm5pbmdzLnZlcnNpb25NaXNtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdDb25maWcud2FybmluZ3MgPSB7XG4gICAgICAgIC4uLigobmV3Q29uZmlnLndhcm5pbmdzIGFzIEpzb25PYmplY3QgfCBudWxsKSB8fCB7fSksXG4gICAgICAgIC4uLnsgdmVyc2lvbk1pc21hdGNoOiBjb25maWcud2FybmluZ3MudmVyc2lvbk1pc21hdGNoIH0sXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoY29uZmlnLndhcm5pbmdzLnR5cGVzY3JpcHRNaXNtYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdDb25maWcud2FybmluZ3MgPSB7XG4gICAgICAgIC4uLigobmV3Q29uZmlnLndhcm5pbmdzIGFzIEpzb25PYmplY3QgfCBudWxsKSB8fCB7fSksXG4gICAgICAgIC4uLnsgdHlwZXNjcmlwdE1pc21hdGNoOiBjb25maWcud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhuZXdDb25maWcpLmxlbmd0aCA9PSAwID8gbnVsbCA6IG5ld0NvbmZpZztcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGxldCBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZy5kZWZhdWx0cykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIGNvbnN0IGNvbmZpZ0RlZmF1bHRzID0gY29uZmlnLmRlZmF1bHRzO1xuICBpZiAoY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb24pIHtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogRm9yIGVhY2ggc2NoZW1hdGljXG4gICAqICAtIGdldCB0aGUgY29uZmlnXG4gICAqICAtIGZpbHRlciBvbmUncyB3aXRob3V0IGNvbmZpZ1xuICAgKiAgLSBjb21iaW5lIHRoZW0gaW50byBhbiBvYmplY3RcbiAgICovXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgY29uc3Qgc2NoZW1hdGljQ29uZmlnczogYW55ID0gWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpbnRlcmZhY2UnLCAnbW9kdWxlJywgJ3BpcGUnLCAnc2VydmljZSddXG4gICAgLm1hcChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHRzOiBKc29uT2JqZWN0ID0gKGNvbmZpZy5kZWZhdWx0cyBhcyBhbnkpW3NjaGVtYXRpY05hbWVdIHx8IG51bGw7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbmZpZzogc2NoZW1hdGljRGVmYXVsdHMsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihzY2hlbWF0aWMgPT4gc2NoZW1hdGljLmNvbmZpZyAhPT0gbnVsbClcbiAgICAucmVkdWNlKChhbGw6IEpzb25PYmplY3QsIHNjaGVtYXRpYykgPT4ge1xuICAgICAgYWxsW2NvbGxlY3Rpb25OYW1lICsgJzonICsgc2NoZW1hdGljLnNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLmNvbmZpZztcblxuICAgICAgcmV0dXJuIGFsbDtcbiAgICB9LCB7fSk7XG5cbiAgY29uc3QgY29tcG9uZW50VXBkYXRlOiBKc29uT2JqZWN0ID0ge307XG4gIGNvbXBvbmVudFVwZGF0ZS5wcmVmaXggPSAnJztcblxuICBjb25zdCBjb21wb25lbnRLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6Y29tcG9uZW50JztcbiAgY29uc3QgZGlyZWN0aXZlS2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmRpcmVjdGl2ZSc7XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldID0ge307XG4gIH1cbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0gPSB7fTtcbiAgfVxuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gIH1cbiAgaWYgKGNvbmZpZy5kZWZhdWx0cykge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5zdHlsZWV4dCA9IGNvbmZpZy5kZWZhdWx0cy5zdHlsZUV4dDtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWF0aWNDb25maWdzO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKF9jb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhcbiAgY29uZmlnOiBDbGlDb25maWcsIHRyZWU6IFRyZWUsIGxvZ2dlcjogbG9nZ2luZy5Mb2dnZXJBcGksXG4pOiBKc29uT2JqZWN0IHtcbiAgY29uc3QgYnVpbGRlclBhY2thZ2UgPSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuICBjb25zdCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZyk7XG5cbiAgY29uc3QgYnVpbGREZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuYnVpbGRcbiAgICA/IHtcbiAgICAgIHNvdXJjZU1hcDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNvdXJjZW1hcHMsXG4gICAgICBwcm9ncmVzczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByb2dyZXNzLFxuICAgICAgcG9sbDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnBvbGwsXG4gICAgICBkZWxldGVPdXRwdXRQYXRoOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuZGVsZXRlT3V0cHV0UGF0aCxcbiAgICAgIHByZXNlcnZlU3ltbGlua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICAgICAgY29tbW9uQ2h1bms6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5jb21tb25DaHVuayxcbiAgICAgIG5hbWVkQ2h1bmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQubmFtZWRDaHVua3MsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuICBjb25zdCBzZXJ2ZURlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZVxuICAgID8ge1xuICAgICAgcG9ydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnBvcnQsXG4gICAgICBob3N0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuaG9zdCxcbiAgICAgIHNzbDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbCxcbiAgICAgIHNzbEtleTogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbEtleSxcbiAgICAgIHNzbENlcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xDZXJ0LFxuICAgICAgcHJveHlDb25maWc6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wcm94eUNvbmZpZyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IGJyb3dzZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSAhPT0gJ3NlcnZlcicpO1xuICBjb25zdCBzZXJ2ZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSA9PT0gJ3NlcnZlcicpO1xuXG4gIGNvbnN0IHByb2plY3RNYXAgPSBicm93c2VyQXBwc1xuICAgIC5tYXAoKGFwcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGFzc2V0LmFsbG93T3V0c2lkZU91dERpcikge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFxuICAgICAgICAgICAgICBBc3NldCB3aXRoIGlucHV0ICcke2Fzc2V0LmlucHV0fScgd2FzIG5vdCBtaWdyYXRlZCBiZWNhdXNlIGl0XG4gICAgICAgICAgICAgIHVzZXMgdGhlICdhbGxvd091dHNpZGVPdXREaXInIG9wdGlvbiB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEFuZ3VsYXIgQ0xJIDYuXG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmIChhc3NldC5vdXRwdXQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiBub3JtYWxpemUoJy8nICsgYXNzZXQub3V0cHV0IGFzIHN0cmluZyksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2J1aWxkQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGFwcC5lbnZpcm9ubWVudFNvdXJjZTtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcbiAgICAgICAgY29uc3Qgc2VydmljZVdvcmtlciA9IGFwcC5zZXJ2aWNlV29ya2VyO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGVudmlyb25tZW50cykucmVkdWNlKChhY2MsIGVudmlyb25tZW50KSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZSA9PT0gZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XSkge1xuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgaXNQcm9kdWN0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgICBjb25zdCBlbnZpcm9ubWVudENvbnRlbnQgPSB0cmVlLnJlYWQoYXBwLnJvb3QgKyAnLycgKyBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKTtcbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnRDb250ZW50KSB7XG4gICAgICAgICAgICBpc1Byb2R1Y3Rpb24gPSAhIWVudmlyb25tZW50Q29udGVudC50b1N0cmluZygndXRmLTgnKVxuICAgICAgICAgICAgICAvLyBBbGxvdyBmb3IgYHByb2R1Y3Rpb246IHRydWVgIG9yIGBwcm9kdWN0aW9uID0gdHJ1ZWAuIEJlc3Qgd2UgY2FuIGRvIHRvIGd1ZXNzLlxuICAgICAgICAgICAgICAubWF0Y2goL3Byb2R1Y3Rpb25bJ1wiXT9cXHMqWzo9XVxccyp0cnVlLyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGNvbmZpZ3VyYXRpb25OYW1lO1xuICAgICAgICAgIC8vIFdlIHVzZWQgdG8gdXNlIGBwcm9kYCBieSBkZWZhdWx0IGFzIHRoZSBrZXksIGluc3RlYWQgd2Ugbm93IHVzZSB0aGUgZnVsbCB3b3JkLlxuICAgICAgICAgIC8vIFRyeSBub3QgdG8gb3ZlcnJpZGUgdGhlIHByb2R1Y3Rpb24ga2V5IGlmIGl0J3MgdGhlcmUuXG4gICAgICAgICAgaWYgKGVudmlyb25tZW50ID09ICdwcm9kJyAmJiAhZW52aXJvbm1lbnRzWydwcm9kdWN0aW9uJ10gJiYgaXNQcm9kdWN0aW9uKSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9ICdwcm9kdWN0aW9uJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uZmlndXJhdGlvbk5hbWUgPSBlbnZpcm9ubWVudDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgc3dDb25maWc6IEpzb25PYmplY3QgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICBpZiAoc2VydmljZVdvcmtlcikge1xuICAgICAgICAgICAgc3dDb25maWcgPSB7XG4gICAgICAgICAgICAgIHNlcnZpY2VXb3JrZXI6IHRydWUsXG4gICAgICAgICAgICAgIG5nc3dDb25maWdQYXRoOiAnL3NyYy9uZ3N3LWNvbmZpZy5qc29uJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWNjW2NvbmZpZ3VyYXRpb25OYW1lXSA9IHtcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb25cbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgb3B0aW1pemF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gJiYgc3dDb25maWcgPyBzd0NvbmZpZyA6IHt9KSxcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb24gJiYgYXBwLmJ1ZGdldHMgPyB7IGJ1ZGdldHM6IGFwcC5idWRnZXRzIGFzIEpzb25BcnJheSB9IDoge30pLFxuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZTogYCR7YXBwLnJvb3R9LyR7c291cmNlfWAsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7YXBwLnJvb3R9LyR7ZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XX1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJjaGl0ZWN0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9ucyA9IChhcmNoaXRlY3QuYnVpbGQgYXMgSnNvbk9iamVjdCkuY29uZmlndXJhdGlvbnMgYXMgSnNvbk9iamVjdDtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGFjY1tlbnZpcm9ubWVudF0gPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkOiR7ZW52aXJvbm1lbnR9YCB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9leHRyYUVudHJ5TWFwcGVyKGV4dHJhRW50cnk6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgbGV0IGVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0O1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhRW50cnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgZW50cnkgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5LmlucHV0IGFzIHN0cmluZyB8fCAnJyk7XG4gICAgICAgICAgZW50cnkgPSB7IGlucHV0LCBsYXp5OiBleHRyYUVudHJ5LmxhenkgfTtcblxuICAgICAgICAgIGlmIChleHRyYUVudHJ5Lm91dHB1dCkge1xuICAgICAgICAgICAgZW50cnkuYnVuZGxlTmFtZSA9IGV4dHJhRW50cnkub3V0cHV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvamVjdFJvb3QgPSBqb2luKG5vcm1hbGl6ZShhcHBSb290KSwgJy4uJyk7XG4gICAgICBjb25zdCBwcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiBwcm9qZWN0Um9vdCxcbiAgICAgICAgc291cmNlUm9vdDogYXBwUm9vdCxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBhcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcbiAgICAgIHByb2plY3QuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0O1xuXG4gICAgICAgIC8vIEJyb3dzZXIgdGFyZ2V0XG4gICAgICBjb25zdCBidWlsZE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIC8vIE1ha2Ugb3V0cHV0UGF0aCByZWxhdGl2ZSB0byByb290LlxuICAgICAgICBvdXRwdXRQYXRoOiBvdXREaXIsXG4gICAgICAgIGluZGV4OiBgJHthcHBSb290fS8ke2FwcC5pbmRleCB8fCBkZWZhdWx0cy5pbmRleH1gLFxuICAgICAgICBtYWluOiBgJHthcHBSb290fS8ke2FwcC5tYWluIHx8IGRlZmF1bHRzLm1haW59YCxcbiAgICAgICAgdHNDb25maWc6IGAke2FwcFJvb3R9LyR7YXBwLnRzY29uZmlnIHx8IGRlZmF1bHRzLnRzQ29uZmlnfWAsXG4gICAgICAgIC4uLihhcHAuYmFzZUhyZWYgPyB7IGJhc2VIcmVmOiBhcHAuYmFzZUhyZWYgfSA6IHt9KSxcbiAgICAgICAgLi4uYnVpbGREZWZhdWx0cyxcbiAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnNcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICYmIEFycmF5LmlzQXJyYXkoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMpXG4gICAgICAgICAgJiYgYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICBidWlsZE9wdGlvbnMuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zID0ge1xuICAgICAgICAgIGluY2x1ZGVQYXRoczogYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHNcbiAgICAgICAgICAgIC5tYXAoaW5jbHVkZVBhdGggPT4gam9pbihhcHAucm9vdCBhcyBQYXRoLCBpbmNsdWRlUGF0aCkpLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKS5maWx0ZXIoeCA9PiAhIXgpO1xuICAgICAgYnVpbGRPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYnVpbGRPcHRpb25zLnNjcmlwdHMgPSAoYXBwLnNjcmlwdHMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBhcmNoaXRlY3QuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczogX2J1aWxkQ29uZmlndXJhdGlvbnMoKSxcbiAgICAgIH07XG5cbiAgICAgIC8vIFNlcnZlIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAsXG4gICAgICAgIC4uLnNlcnZlRGVmYXVsdHMsXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LnNlcnZlID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZGV2LXNlcnZlcmAsXG4gICAgICAgIG9wdGlvbnM6IHNlcnZlT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IHRhcmdldFxuICAgICAgY29uc3QgZXh0cmFjdEkxOG5PcHRpb25zOiBKc29uT2JqZWN0ID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZGAgfTtcbiAgICAgIGFyY2hpdGVjdFsnZXh0cmFjdC1pMThuJ10gPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpleHRyYWN0LWkxOG5gLFxuICAgICAgICBvcHRpb25zOiBleHRyYWN0STE4bk9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBrYXJtYUNvbmZpZyA9IGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hXG4gICAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWcgfHwgJydcbiAgICAgICAgICA6ICcnO1xuICAgICAgICAvLyBUZXN0IHRhcmdldFxuICAgICAgY29uc3QgdGVzdE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgbWFpbjogYXBwUm9vdCArICcvJyArIGFwcC50ZXN0IHx8IGRlZmF1bHRzLnRlc3QsXG4gICAgICAgICAgLy8gTWFrZSBrYXJtYUNvbmZpZyByZWxhdGl2ZSB0byByb290LlxuICAgICAgICAgIGthcm1hQ29uZmlnLFxuICAgICAgICB9O1xuXG4gICAgICBpZiAoYXBwLnBvbHlmaWxscykge1xuICAgICAgICB0ZXN0T3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC50ZXN0VHNjb25maWcpIHtcbiAgICAgICAgICB0ZXN0T3B0aW9ucy50c0NvbmZpZyA9IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdFRzY29uZmlnO1xuICAgICAgICB9XG4gICAgICB0ZXN0T3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChfZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICB0ZXN0T3B0aW9ucy5hc3NldHMgPSAoYXBwLmFzc2V0cyB8fCBbXSkubWFwKF9tYXBBc3NldHMpLmZpbHRlcih4ID0+ICEheCk7XG5cbiAgICAgIGlmIChrYXJtYUNvbmZpZykge1xuICAgICAgICBhcmNoaXRlY3QudGVzdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06a2FybWFgLFxuICAgICAgICAgIG9wdGlvbnM6IHRlc3RPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCBleGNsdWRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGxldCB3YXJuRm9yTGludCA9IGZhbHNlO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIGlmIChsaW50LnByb2plY3QpIHtcbiAgICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhcm5Gb3JMaW50ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobGludC5leGNsdWRlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpbnQuZXhjbHVkZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgZXhjbHVkZXMucHVzaChsaW50LmV4Y2x1ZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGludC5leGNsdWRlLmZvckVhY2goZXggPT4gZXhjbHVkZXMucHVzaChleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh3YXJuRm9yTGludCkge1xuICAgICAgICBsb2dnZXIud2FybihgXG4gICAgICAgICAgTGludCB3aXRob3V0ICdwcm9qZWN0JyB3YXMgbm90IG1pZ3JhdGVkIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gQW5ndWxhciBDTEkgNi5cbiAgICAgICAgYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbW92ZUR1cGVzID0gKGl0ZW1zOiBzdHJpbmdbXSkgPT4gaXRlbXMucmVkdWNlKChuZXdJdGVtcywgaXRlbSkgPT4ge1xuICAgICAgICBpZiAobmV3SXRlbXMuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgICAgICBuZXdJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld0l0ZW1zO1xuICAgICAgfSwgPHN0cmluZ1tdPiBbXSk7XG5cbiAgICAgICAgLy8gVHNsaW50IHRhcmdldFxuICAgICAgY29uc3QgbGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgPT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5saW50ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICAgIG9wdGlvbnM6IGxpbnRPcHRpb25zLFxuICAgICAgICB9O1xuXG4gICAgICAvLyBzZXJ2ZXIgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZXJBcHAgPSBzZXJ2ZXJBcHBzXG4gICAgICAgIC5maWx0ZXIoc2VydmVyQXBwID0+IGFwcC5yb290ID09PSBzZXJ2ZXJBcHAucm9vdCAmJiBhcHAuaW5kZXggPT09IHNlcnZlckFwcC5pbmRleClbMF07XG5cbiAgICAgIGlmIChzZXJ2ZXJBcHApIHtcbiAgICAgICAgY29uc3Qgc2VydmVyT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBvdXRwdXRQYXRoOiBzZXJ2ZXJBcHAub3V0RGlyIHx8IGRlZmF1bHRzLnNlcnZlck91dERpcixcbiAgICAgICAgICBtYWluOiBzZXJ2ZXJBcHAubWFpbiB8fCBkZWZhdWx0cy5zZXJ2ZXJNYWluLFxuICAgICAgICAgIHRzQ29uZmlnOiBzZXJ2ZXJBcHAudHNjb25maWcgfHwgZGVmYXVsdHMuc2VydmVyVHNDb25maWcsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHNlcnZlclRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6c2VydmVyJyxcbiAgICAgICAgICBvcHRpb25zOiBzZXJ2ZXJPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgICBhcmNoaXRlY3Quc2VydmVyID0gc2VydmVyVGFyZ2V0O1xuICAgICAgfVxuICAgICAgY29uc3QgZTJlUHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogam9pbihwcm9qZWN0Um9vdCwgJ2UyZScpLFxuICAgICAgICBzb3VyY2VSb290OiBqb2luKHByb2plY3RSb290LCAnZTJlJyksXG4gICAgICAgIHByb2plY3RUeXBlOiAnYXBwbGljYXRpb24nLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZTJlQXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIGNvbnN0IHByb3RyYWN0b3JDb25maWcgPSBjb25maWcgJiYgY29uZmlnLmUyZSAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGUyZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IHByb3RyYWN0b3JDb25maWcsXG4gICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7bmFtZX06c2VydmVgLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZVRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnByb3RyYWN0b3JgLFxuICAgICAgICBvcHRpb25zOiBlMmVPcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgZTJlQXJjaGl0ZWN0LmUyZSA9IGUyZVRhcmdldDtcbiAgICAgIGNvbnN0IGUyZUxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpICE9PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVMaW50VGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgb3B0aW9uczogZTJlTGludE9wdGlvbnMsXG4gICAgICB9O1xuICAgICAgZTJlQXJjaGl0ZWN0LmxpbnQgPSBlMmVMaW50VGFyZ2V0O1xuICAgICAgaWYgKHByb3RyYWN0b3JDb25maWcpIHtcbiAgICAgICAgZTJlUHJvamVjdC5hcmNoaXRlY3QgPSBlMmVBcmNoaXRlY3Q7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG5hbWUsIHByb2plY3QsIGUyZVByb2plY3QgfTtcbiAgICB9KVxuICAgIC5yZWR1Y2UoKHByb2plY3RzLCBtYXBwZWRBcHApID0+IHtcbiAgICAgIGNvbnN0IHtuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0fSA9IG1hcHBlZEFwcDtcbiAgICAgIHByb2plY3RzW25hbWVdID0gcHJvamVjdDtcbiAgICAgIHByb2plY3RzW25hbWUgKyAnLWUyZSddID0gZTJlUHJvamVjdDtcblxuICAgICAgcmV0dXJuIHByb2plY3RzO1xuICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuXG4gIHJldHVybiBwcm9qZWN0TWFwO1xufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QXBwTmFtZVByZWZpeChjb25maWc6IENsaUNvbmZpZykge1xuICBsZXQgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSAnYXBwJztcbiAgaWYgKGNvbmZpZy5wcm9qZWN0ICYmIGNvbmZpZy5wcm9qZWN0Lm5hbWUpIHtcbiAgICBkZWZhdWx0QXBwTmFtZVByZWZpeCA9IGNvbmZpZy5wcm9qZWN0Lm5hbWU7XG4gIH1cblxuICByZXR1cm4gZGVmYXVsdEFwcE5hbWVQcmVmaXg7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3REZWZhdWx0UHJvamVjdChjb25maWc6IENsaUNvbmZpZyk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBjb25zdCBhcHAgPSBjb25maWcuYXBwc1swXTtcbiAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGdldERlZmF1bHRBcHBOYW1lUHJlZml4KGNvbmZpZyk7XG4gICAgY29uc3QgbmFtZSA9IGFwcC5uYW1lIHx8IGRlZmF1bHRBcHBOYW1lO1xuXG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgICBhcHBzLmZvckVhY2goKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgdGVzdFRzQ29uZmlnID0gYXBwLnRlc3RUc2NvbmZpZyB8fCBkZWZhdWx0cy50ZXN0VHNDb25maWc7XG4gICAgICBjb25zdCB0c1NwZWNDb25maWdQYXRoID0gam9pbihub3JtYWxpemUoYXBwLnJvb3QgfHwgJycpLCB0ZXN0VHNDb25maWcpO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzU3BlY0NvbmZpZ1BhdGgpO1xuXG4gICAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgdHNjb25maWcuIFdhcyBleHBlY3RpbmcgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzQXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAnZmlsZXMnKTtcbiAgICAgIGlmIChmaWxlc0FzdE5vZGUgJiYgZmlsZXNBc3ROb2RlLmtpbmQgIT0gJ2FycmF5Jykge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCB0c2NvbmZpZyBcImZpbGVzXCIgcHJvcGVydHk7IGV4cGVjdGVkIGFuIGFycmF5LicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUodHNTcGVjQ29uZmlnUGF0aCk7XG5cbiAgICAgIGNvbnN0IHBvbHlmaWxscyA9IGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzO1xuICAgICAgaWYgKCFmaWxlc0FzdE5vZGUpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgZmlsZXMgYXJyYXkgZG9lcyBub3QgZXhpc3QuIFRoaXMgbWVhbnMgZXhjbHVkZSBvciBpbmNsdWRlIGFyZVxuICAgICAgICAvLyBzZXQgYW5kIHdlIHNob3VsZG4ndCBtZXNzIHdpdGggdGhhdC5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaWxlc0FzdE5vZGUudmFsdWUuaW5kZXhPZihwb2x5ZmlsbHMpID09IC0xKSB7XG4gICAgICAgICAgYXBwZW5kVmFsdWVJbkFzdEFycmF5KHJlY29yZGVyLCBmaWxlc0FzdE5vZGUsIHBvbHlmaWxscyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQYWNrYWdlSnNvbihjb25maWc6IENsaUNvbmZpZykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBkZXBlbmRlbmN5OiBOb2RlRGVwZW5kZW5jeSA9IHtcbiAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICBuYW1lOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInLFxuICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgb3ZlcndyaXRlOiB0cnVlLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcGVuZGVuY3kpO1xuXG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKHtcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBjb25maWcucGFja2FnZU1hbmFnZXIgPT09ICdkZWZhdWx0JyA/IHVuZGVmaW5lZCA6IGNvbmZpZy5wYWNrYWdlTWFuYWdlcixcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNMaW50Q29uZmlnKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB0c0xpbnRQYXRoID0gJy90c2xpbnQuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzTGludFBhdGgpO1xuICAgIGlmICghYnVmZmVyKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG4gICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuXG4gICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHJ1bGVzTm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAncnVsZXMnKTtcbiAgICBpZiAoIXJ1bGVzTm9kZSB8fCBydWxlc05vZGUua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0QmxhY2tsaXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHJ1bGVzTm9kZSwgJ2ltcG9ydC1ibGFja2xpc3QnKTtcbiAgICBpZiAoIWltcG9ydEJsYWNrbGlzdE5vZGUgfHwgaW1wb3J0QmxhY2tsaXN0Tm9kZS5raW5kICE9ICdhcnJheScpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZSh0c0xpbnRQYXRoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzW2ldO1xuICAgICAgaWYgKGVsZW1lbnQua2luZCA9PSAnc3RyaW5nJyAmJiBlbGVtZW50LnZhbHVlID09ICdyeGpzJykge1xuICAgICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IGVsZW1lbnQ7XG4gICAgICAgIC8vIFJlbW92ZSB0aGlzIGVsZW1lbnQuXG4gICAgICAgIGlmIChpID09IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIC8vIExhc3QgZWxlbWVudC5cbiAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgIC8vIE5vdCBmaXJzdCwgdGhlcmUncyBhIGNvbW1hIHRvIHJlbW92ZSBiZWZvcmUuXG4gICAgICAgICAgICBjb25zdCBwcmV2aW91cyA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaSAtIDFdO1xuICAgICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKHByZXZpb3VzLmVuZC5vZmZzZXQsIGVuZC5vZmZzZXQgLSBwcmV2aW91cy5lbmQub2Zmc2V0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gT25seSBlbGVtZW50LCBqdXN0IHJlbW92ZSB0aGUgd2hvbGUgcnVsZS5cbiAgICAgICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gaW1wb3J0QmxhY2tsaXN0Tm9kZTtcbiAgICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShzdGFydC5vZmZzZXQsIGVuZC5vZmZzZXQgLSBzdGFydC5vZmZzZXQpO1xuICAgICAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChzdGFydC5vZmZzZXQsICdbXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBNaWRkbGUsIGp1c3QgcmVtb3ZlIHRoZSB3aG9sZSBub2RlICh1cCB0byBuZXh0IG5vZGUgc3RhcnQpLlxuICAgICAgICAgIGNvbnN0IG5leHQgPSBpbXBvcnRCbGFja2xpc3ROb2RlLmVsZW1lbnRzW2kgKyAxXTtcbiAgICAgICAgICByZWNvcmRlci5yZW1vdmUoc3RhcnQub2Zmc2V0LCBuZXh0LnN0YXJ0Lm9mZnNldCAtIHN0YXJ0Lm9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUm9vdFRzQ29uZmlnKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSAnL3RzY29uZmlnLmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c0NvbmZpZ1BhdGgpO1xuICAgIGlmICghYnVmZmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgIGlmICh0c0NmZ0FzdC5raW5kICE9PSAnb2JqZWN0Jykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgcm9vdCB0c2NvbmZpZy4gV2FzIGV4cGVjdGluZyBhbiBvYmplY3QnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxlck9wdGlvbnNBc3ROb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QodHNDZmdBc3QsICdjb21waWxlck9wdGlvbnMnKTtcbiAgICBpZiAoIWNvbXBpbGVyT3B0aW9uc0FzdE5vZGUgfHwgY29tcGlsZXJPcHRpb25zQXN0Tm9kZS5raW5kICE9ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgJ0ludmFsaWQgcm9vdCB0c2NvbmZpZyBcImNvbXBpbGVyT3B0aW9uc1wiIHByb3BlcnR5OyBleHBlY3RlZCBhbiBvYmplY3QuJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgZmluZFByb3BlcnR5SW5Bc3RPYmplY3QoY29tcGlsZXJPcHRpb25zQXN0Tm9kZSwgJ2Jhc2VVcmwnKSAmJlxuICAgICAgZmluZFByb3BlcnR5SW5Bc3RPYmplY3QoY29tcGlsZXJPcHRpb25zQXN0Tm9kZSwgJ21vZHVsZScpXG4gICAgKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxlck9wdGlvbnMgPSBjb21waWxlck9wdGlvbnNBc3ROb2RlLnZhbHVlO1xuICAgIGNvbnN0IHsgYmFzZVVybCA9ICcuLycsIG1vZHVsZSA9ICdlczIwMTUnfSA9IGNvbXBpbGVyT3B0aW9ucztcblxuICAgIGNvbnN0IHZhbGlkQmFzZVVybCA9IFsnLi8nLCAnJywgJy4nXTtcbiAgICBpZiAoIXZhbGlkQmFzZVVybC5pbmNsdWRlcyhiYXNlVXJsIGFzIHN0cmluZykpIHtcbiAgICAgIGNvbnN0IGZvcm1hdHRlZEJhc2VVcmwgPSB2YWxpZEJhc2VVcmwubWFwKHggPT4gYCcke3h9J2ApLmpvaW4oJywgJyk7XG4gICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRhZ3Mub25lTGluZVxuICAgICAgICBgUm9vdCB0c2NvbmZpZyBvcHRpb24gJ2Jhc2VVcmwnIGlzIG5vdCBvbmUgb2Y6ICR7Zm9ybWF0dGVkQmFzZVVybH0uXG4gICAgICAgIFRoaXMgbWlnaHQgY2F1c2UgdW5leHBlY3RlZCBiZWhhdmlvdXIgd2hlbiBnZW5lcmF0aW5nIGxpYnJhcmllcy5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlICE9PSAnZXMyMDE1Jykge1xuICAgICAgY29udGV4dC5sb2dnZXIud2FybihcbiAgICAgICAgYFJvb3QgdHNjb25maWcgb3B0aW9uICdtb2R1bGUnIGlzIG5vdCAnZXMyMDE1Jy4gVGhpcyBtaWdodCBjYXVzZSB1bmV4cGVjdGVkIGJlaGF2aW91ci5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb21waWxlck9wdGlvbnMubW9kdWxlID0gbW9kdWxlO1xuICAgIGNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsID0gYmFzZVVybDtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHRzQ29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkodHNDZmdBc3QudmFsdWUsIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmIChob3N0LmV4aXN0cygnLy5hbmd1bGFyLmpzb24nKSB8fCBob3N0LmV4aXN0cygnL2FuZ3VsYXIuanNvbicpKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdGb3VuZCBhIG1vZGVybiBjb25maWd1cmF0aW9uIGZpbGUuIE5vdGhpbmcgdG8gYmUgZG9uZS4nKTtcblxuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnQnVmZmVyID0gaG9zdC5yZWFkKG5vcm1hbGl6ZShjb25maWdQYXRoKSk7XG4gICAgaWYgKGNvbmZpZ0J1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIH1cbiAgICBjb25zdCBjb25maWcgPSBwYXJzZUpzb24oY29uZmlnQnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuXG4gICAgaWYgKHR5cGVvZiBjb25maWcgIT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShjb25maWcpIHx8IGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgYW5ndWxhci1jbGkuanNvbiBjb25maWd1cmF0aW9uOyBleHBlY3RlZCBhbiBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIG1pZ3JhdGVDb25maWd1cmF0aW9uKGNvbmZpZywgY29udGV4dC5sb2dnZXIpLFxuICAgICAgdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZyksXG4gICAgICB1cGRhdGVQYWNrYWdlSnNvbihjb25maWcpLFxuICAgICAgdXBkYXRlUm9vdFRzQ29uZmlnKCksXG4gICAgICB1cGRhdGVUc0xpbnRDb25maWcoKSxcbiAgICAgIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFNvbWUgY29uZmlndXJhdGlvbiBvcHRpb25zIGhhdmUgYmVlbiBjaGFuZ2VkLFxuICAgICAgICAgIHBsZWFzZSBtYWtlIHN1cmUgdG8gdXBkYXRlIGFueSBucG0gc2NyaXB0cyB3aGljaCB5b3UgbWF5IGhhdmUgbW9kaWZpZWQuYCk7XG5cbiAgICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgICB9LFxuICAgIF0pO1xuICB9O1xufVxuIl19