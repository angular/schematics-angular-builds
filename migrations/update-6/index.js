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
const json_utils_1 = require("./json-utils");
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
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer == null) {
            throw new schematics_1.SchematicsException('Could not read package.json');
        }
        const pkgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Strict);
        if (pkgAst.kind != 'object') {
            throw new schematics_1.SchematicsException('Error reading package.json');
        }
        const devDependenciesNode = json_utils_1.findPropertyInAstObject(pkgAst, 'devDependencies');
        if (devDependenciesNode && devDependenciesNode.kind != 'object') {
            throw new schematics_1.SchematicsException('Error reading package.json; devDependency is not an object.');
        }
        const recorder = host.beginUpdate(pkgPath);
        const depName = '@angular-devkit/build-angular';
        if (!devDependenciesNode) {
            // Haven't found the devDependencies key, add it to the root of the package.json.
            json_utils_1.appendPropertyInAstObject(recorder, pkgAst, 'devDependencies', {
                [depName]: latest_versions_1.latestVersions.DevkitBuildAngular,
            });
        }
        else {
            // Check if there's a build-angular key.
            const buildAngularNode = json_utils_1.findPropertyInAstObject(devDependenciesNode, depName);
            if (!buildAngularNode) {
                // No build-angular package, add it.
                json_utils_1.appendPropertyInAstObject(recorder, devDependenciesNode, depName, latest_versions_1.latestVersions.DevkitBuildAngular);
            }
            else {
                const { end, start } = buildAngularNode;
                recorder.remove(start.offset, end.offset - start.offset);
                recorder.insertRight(start.offset, JSON.stringify(latest_versions_1.latestVersions.DevkitBuildAngular));
            }
        }
        host.commitUpdate(recorder);
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
            migrateConfiguration(config),
            updateSpecTsConfig(config),
            updatePackageJson(config),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUzhCO0FBQzlCLDJEQU1vQztBQUNwQyw0REFBMEU7QUFFMUUsbUVBQStEO0FBQy9ELDZDQUlzQjtBQUV0QixNQUFNLFFBQVEsR0FBRztJQUNmLE9BQU8sRUFBRSxLQUFLO0lBQ2QsS0FBSyxFQUFFLFlBQVk7SUFDbkIsSUFBSSxFQUFFLFNBQVM7SUFDZixTQUFTLEVBQUUsY0FBYztJQUN6QixRQUFRLEVBQUUsbUJBQW1CO0lBQzdCLElBQUksRUFBRSxTQUFTO0lBQ2YsTUFBTSxFQUFFLE9BQU87SUFDZixLQUFLLEVBQUUsZUFBZTtJQUN0QixVQUFVLEVBQUUsb0JBQW9CO0lBQ2hDLFlBQVksRUFBRSxvQkFBb0I7SUFDbEMsWUFBWSxFQUFFLGFBQWE7SUFDM0IsVUFBVSxFQUFFLGdCQUFnQjtJQUM1QixjQUFjLEVBQUUsc0JBQXNCO0NBQ3ZDLENBQUM7QUFFRix1QkFBdUIsSUFBVTtJQUMvQixJQUFJLFlBQVksR0FBRyxnQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBQ0QsWUFBWSxHQUFHLGdCQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNyRSxD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O1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3RELEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxzQ0FBc0MsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsZ0JBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsb0JBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV2RSxFQUFFLENBQUMsQ0FBQyxPQUFPLE1BQU0sSUFBSSxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxRSxNQUFNLElBQUksZ0NBQW1CLENBQUMsNkRBQTZELENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsTUFBTSxDQUFDLGtCQUFLLENBQUM7WUFDWCx5QkFBeUIsQ0FBQyxNQUFNLENBQUM7WUFDakMsb0JBQW9CLENBQUMsTUFBTSxDQUFDO1lBQzVCLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztZQUMxQixpQkFBaUIsQ0FBQyxNQUFNLENBQUM7WUFDekIsa0JBQWtCLEVBQUU7WUFDcEIsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO2dCQUN4QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBO2tGQUMwQyxDQUFDLENBQUM7Z0JBRTVFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDO1NBQ0YsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7QUFDSixDQUFDO0FBakNELDRCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEpzb25PYmplY3QsXG4gIEpzb25QYXJzZU1vZGUsXG4gIFBhdGgsXG4gIGpvaW4sXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2VKc29uLFxuICBwYXJzZUpzb25Bc3QsXG4gIHRhZ3MsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IHsgQXBwQ29uZmlnLCBDbGlDb25maWcgfSBmcm9tICcuLi8uLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7XG4gIGFwcGVuZFByb3BlcnR5SW5Bc3RPYmplY3QsXG4gIGFwcGVuZFZhbHVlSW5Bc3RBcnJheSxcbiAgZmluZFByb3BlcnR5SW5Bc3RPYmplY3QsXG59IGZyb20gJy4vanNvbi11dGlscyc7XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICBhcHBSb290OiAnc3JjJyxcbiAgaW5kZXg6ICdpbmRleC5odG1sJyxcbiAgbWFpbjogJ21haW4udHMnLFxuICBwb2x5ZmlsbHM6ICdwb2x5ZmlsbHMudHMnLFxuICB0c0NvbmZpZzogJ3RzY29uZmlnLmFwcC5qc29uJyxcbiAgdGVzdDogJ3Rlc3QudHMnLFxuICBvdXREaXI6ICdkaXN0LycsXG4gIGthcm1hOiAna2FybWEuY29uZi5qcycsXG4gIHByb3RyYWN0b3I6ICdwcm90cmFjdG9yLmNvbmYuanMnLFxuICB0ZXN0VHNDb25maWc6ICd0c2NvbmZpZy5zcGVjLmpzb24nLFxuICBzZXJ2ZXJPdXREaXI6ICdkaXN0LXNlcnZlcicsXG4gIHNlcnZlck1haW46ICdtYWluLnNlcnZlci50cycsXG4gIHNlcnZlclRzQ29uZmlnOiAndHNjb25maWcuc2VydmVyLmpzb24nLFxufTtcblxuZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCh0cmVlOiBUcmVlKTogUGF0aCB7XG4gIGxldCBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuICBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG5cbiAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZScpO1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGthcm1hIGNvbmZpZ3VyYXRpb25gKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2FybWFQYXRoID0gY29uZmlnICYmIGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hICYmIGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA6IGRlZmF1bHRzLmthcm1hO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKGthcm1hUGF0aCk7XG4gICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoIC9AYW5ndWxhclxcL2NsaS9nLCAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgncmVwb3J0cycsXG4gICAgICAgICAgYGRpcjogcmVxdWlyZSgncGF0aCcpLmpvaW4oX19kaXJuYW1lLCAnY292ZXJhZ2UnKSwgcmVwb3J0c2ApO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZShrYXJtYVBhdGgsIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICAnJHNjaGVtYSc6ICcuL25vZGVfbW9kdWxlcy9AYW5ndWxhci9jbGkvbGliL2NvbmZpZy9zY2hlbWEuanNvbicsXG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCksXG4gICAgfTtcbiAgICBjb25zdCBjbGlDb25maWcgPSBleHRyYWN0Q2xpQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGNsaUNvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmNsaSA9IGNsaUNvbmZpZztcbiAgICB9XG4gICAgY29uc3Qgc2NoZW1hdGljc0NvbmZpZyA9IGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKHNjaGVtYXRpY3NDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5zY2hlbWF0aWNzID0gc2NoZW1hdGljc0NvbmZpZztcbiAgICB9XG4gICAgY29uc3QgYXJjaGl0ZWN0Q29uZmlnID0gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChhcmNoaXRlY3RDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5hcmNoaXRlY3QgPSBhcmNoaXRlY3RDb25maWc7XG4gICAgfVxuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgUmVtb3Zpbmcgb2xkIGNvbmZpZyBmaWxlICgke29sZENvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuZGVsZXRlKG9sZENvbmZpZ1BhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFdyaXRpbmcgY29uZmlnIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5jcmVhdGUoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdENsaUNvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgY29uc3QgbmV3Q29uZmlnOiBKc29uT2JqZWN0ID0ge307XG4gIGlmIChjb25maWcucGFja2FnZU1hbmFnZXIgJiYgY29uZmlnLnBhY2thZ2VNYW5hZ2VyICE9PSAnZGVmYXVsdCcpIHtcbiAgICBuZXdDb25maWdbJ3BhY2thZ2VNYW5hZ2VyJ10gPSBjb25maWcucGFja2FnZU1hbmFnZXI7XG4gIH1cbiAgaWYgKGNvbmZpZy53YXJuaW5ncykge1xuICAgIGlmIChjb25maWcud2FybmluZ3MudmVyc2lvbk1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB2ZXJzaW9uTWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy52ZXJzaW9uTWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICAgIGlmIChjb25maWcud2FybmluZ3MudHlwZXNjcmlwdE1pc21hdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld0NvbmZpZy53YXJuaW5ncyA9IHtcbiAgICAgICAgLi4uKChuZXdDb25maWcud2FybmluZ3MgYXMgSnNvbk9iamVjdCB8IG51bGwpIHx8IHt9KSxcbiAgICAgICAgLi4ueyB0eXBlc2NyaXB0TWlzbWF0Y2g6IGNvbmZpZy53YXJuaW5ncy50eXBlc2NyaXB0TWlzbWF0Y2ggfSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG5ld0NvbmZpZykubGVuZ3RoID09IDAgPyBudWxsIDogbmV3Q29uZmlnO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgbGV0IGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gY29uc3QgY29uZmlnRGVmYXVsdHMgPSBjb25maWcuZGVmYXVsdHM7XG4gIGlmIChjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb25OYW1lID0gY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgZWFjaCBzY2hlbWF0aWNcbiAgICogIC0gZ2V0IHRoZSBjb25maWdcbiAgICogIC0gZmlsdGVyIG9uZSdzIHdpdGhvdXQgY29uZmlnXG4gICAqICAtIGNvbWJpbmUgdGhlbSBpbnRvIGFuIG9iamVjdFxuICAgKi9cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBzY2hlbWF0aWNDb25maWdzOiBhbnkgPSBbJ2NsYXNzJywgJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZ3VhcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2ludGVyZmFjZScsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ11cbiAgICAubWFwKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdHM6IEpzb25PYmplY3QgPSAoY29uZmlnLmRlZmF1bHRzIGFzIGFueSlbc2NoZW1hdGljTmFtZV0gfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29uZmlnOiBzY2hlbWF0aWNEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHNjaGVtYXRpYyA9PiBzY2hlbWF0aWMuY29uZmlnICE9PSBudWxsKVxuICAgIC5yZWR1Y2UoKGFsbDogSnNvbk9iamVjdCwgc2NoZW1hdGljKSA9PiB7XG4gICAgICBhbGxbY29sbGVjdGlvbk5hbWUgKyAnOicgKyBzY2hlbWF0aWMuc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuY29uZmlnO1xuXG4gICAgICByZXR1cm4gYWxsO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBjb21wb25lbnRVcGRhdGU6IEpzb25PYmplY3QgPSB7fTtcbiAgY29tcG9uZW50VXBkYXRlLnByZWZpeCA9ICcnO1xuXG4gIGNvbnN0IGNvbXBvbmVudEtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpjb21wb25lbnQnO1xuICBjb25zdCBkaXJlY3RpdmVLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6ZGlyZWN0aXZlJztcbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0gPSB7fTtcbiAgfVxuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSA9IHt9O1xuICB9XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgfVxuICBpZiAoY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnN0eWxlZXh0ID0gY29uZmlnLmRlZmF1bHRzLnN0eWxlRXh0O1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYXRpY0NvbmZpZ3M7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RBcmNoaXRlY3RDb25maWcoX2NvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFByb2plY3RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnLCB0cmVlOiBUcmVlKTogSnNvbk9iamVjdCB7XG4gIGNvbnN0IGJ1aWxkZXJQYWNrYWdlID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbiAgbGV0IGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gJ2FwcCc7XG4gIGlmIChjb25maWcucHJvamVjdCAmJiBjb25maWcucHJvamVjdC5uYW1lKSB7XG4gICAgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSBjb25maWcucHJvamVjdC5uYW1lO1xuICB9XG5cbiAgY29uc3QgYnVpbGREZWZhdWx0czogSnNvbk9iamVjdCA9IGNvbmZpZy5kZWZhdWx0cyAmJiBjb25maWcuZGVmYXVsdHMuYnVpbGRcbiAgICA/IHtcbiAgICAgIHNvdXJjZU1hcDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnNvdXJjZW1hcHMsXG4gICAgICBwcm9ncmVzczogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnByb2dyZXNzLFxuICAgICAgcG9sbDogY29uZmlnLmRlZmF1bHRzLmJ1aWxkLnBvbGwsXG4gICAgICBkZWxldGVPdXRwdXRQYXRoOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuZGVsZXRlT3V0cHV0UGF0aCxcbiAgICAgIHByZXNlcnZlU3ltbGlua3M6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQuc2hvd0NpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICAgICAgY29tbW9uQ2h1bms6IGNvbmZpZy5kZWZhdWx0cy5idWlsZC5jb21tb25DaHVuayxcbiAgICAgIG5hbWVkQ2h1bmtzOiBjb25maWcuZGVmYXVsdHMuYnVpbGQubmFtZWRDaHVua3MsXG4gICAgfSBhcyBKc29uT2JqZWN0XG4gICAgOiB7fTtcblxuICBjb25zdCBzZXJ2ZURlZmF1bHRzOiBKc29uT2JqZWN0ID0gY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZVxuICAgID8ge1xuICAgICAgcG9ydDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnBvcnQsXG4gICAgICBob3N0OiBjb25maWcuZGVmYXVsdHMuc2VydmUuaG9zdCxcbiAgICAgIHNzbDogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbCxcbiAgICAgIHNzbEtleTogY29uZmlnLmRlZmF1bHRzLnNlcnZlLnNzbEtleSxcbiAgICAgIHNzbENlcnQ6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5zc2xDZXJ0LFxuICAgICAgcHJveHlDb25maWc6IGNvbmZpZy5kZWZhdWx0cy5zZXJ2ZS5wcm94eUNvbmZpZyxcbiAgICB9IGFzIEpzb25PYmplY3RcbiAgICA6IHt9O1xuXG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IGJyb3dzZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSAhPT0gJ3NlcnZlcicpO1xuICBjb25zdCBzZXJ2ZXJBcHBzID0gYXBwcy5maWx0ZXIoYXBwID0+IGFwcC5wbGF0Zm9ybSA9PT0gJ3NlcnZlcicpO1xuXG4gIGNvbnN0IHByb2plY3RNYXAgPSBicm93c2VyQXBwc1xuICAgIC5tYXAoKGFwcCwgaWR4KSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gbm9ybWFsaXplKGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGFzc2V0Lm91dHB1dCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgZ2xvYjogYXNzZXQuZ2xvYixcbiAgICAgICAgICAgICAgaW5wdXQ6IG5vcm1hbGl6ZShhcHBSb290ICsgJy8nICsgYXNzZXQuaW5wdXQpLFxuICAgICAgICAgICAgICBvdXRwdXQ6IG5vcm1hbGl6ZSgnLycgKyBhc3NldC5vdXRwdXQgYXMgc3RyaW5nKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGdsb2I6IGFzc2V0Lmdsb2IsXG4gICAgICAgICAgICAgIGlucHV0OiBub3JtYWxpemUoYXBwUm9vdCArICcvJyArIGFzc2V0LmlucHV0KSxcbiAgICAgICAgICAgICAgb3V0cHV0OiAnLycsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfYnVpbGRDb25maWd1cmF0aW9ucygpOiBKc29uT2JqZWN0IHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gYXBwLmVudmlyb25tZW50U291cmNlO1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuICAgICAgICBjb25zdCBzZXJ2aWNlV29ya2VyID0gYXBwLnNlcnZpY2VXb3JrZXI7XG5cbiAgICAgICAgaWYgKCFlbnZpcm9ubWVudHMpIHtcbiAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoZW52aXJvbm1lbnRzKS5yZWR1Y2UoKGFjYywgZW52aXJvbm1lbnQpID0+IHtcbiAgICAgICAgICBpZiAoc291cmNlID09PSBlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBpc1Byb2R1Y3Rpb24gPSBmYWxzZTtcblxuICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50Q29udGVudCA9IHRyZWUucmVhZChhcHAucm9vdCArICcvJyArIGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pO1xuICAgICAgICAgIGlmIChlbnZpcm9ubWVudENvbnRlbnQpIHtcbiAgICAgICAgICAgIGlzUHJvZHVjdGlvbiA9ICEhZW52aXJvbm1lbnRDb250ZW50LnRvU3RyaW5nKCd1dGYtOCcpXG4gICAgICAgICAgICAgIC8vIEFsbG93IGZvciBgcHJvZHVjdGlvbjogdHJ1ZWAgb3IgYHByb2R1Y3Rpb24gPSB0cnVlYC4gQmVzdCB3ZSBjYW4gZG8gdG8gZ3Vlc3MuXG4gICAgICAgICAgICAgIC5tYXRjaCgvcHJvZHVjdGlvblsnXCJdP1xccypbOj1dXFxzKnRydWUvKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgY29uZmlndXJhdGlvbk5hbWU7XG4gICAgICAgICAgLy8gV2UgdXNlZCB0byB1c2UgYHByb2RgIGJ5IGRlZmF1bHQgYXMgdGhlIGtleSwgaW5zdGVhZCB3ZSBub3cgdXNlIHRoZSBmdWxsIHdvcmQuXG4gICAgICAgICAgLy8gVHJ5IG5vdCB0byBvdmVycmlkZSB0aGUgcHJvZHVjdGlvbiBrZXkgaWYgaXQncyB0aGVyZS5cbiAgICAgICAgICBpZiAoZW52aXJvbm1lbnQgPT0gJ3Byb2QnICYmICFlbnZpcm9ubWVudHNbJ3Byb2R1Y3Rpb24nXSAmJiBpc1Byb2R1Y3Rpb24pIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25OYW1lID0gJ3Byb2R1Y3Rpb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uTmFtZSA9IGVudmlyb25tZW50O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCBzd0NvbmZpZzogSnNvbk9iamVjdCB8IG51bGwgPSBudWxsO1xuICAgICAgICAgIGlmIChzZXJ2aWNlV29ya2VyKSB7XG4gICAgICAgICAgICBzd0NvbmZpZyA9IHtcbiAgICAgICAgICAgICAgc2VydmljZVdvcmtlcjogdHJ1ZSxcbiAgICAgICAgICAgICAgbmdzd0NvbmZpZ1BhdGg6ICcvc3JjL25nc3ctY29uZmlnLmpzb24nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhY2NbY29uZmlndXJhdGlvbk5hbWVdID0ge1xuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvblxuICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBvcHRpbWl6YXRpb246IHRydWUsXG4gICAgICAgICAgICAgICAgb3V0cHV0SGFzaGluZzogJ2FsbCcsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBleHRyYWN0Q3NzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG5hbWVkQ2h1bmtzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgZXh0cmFjdExpY2Vuc2VzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHZlbmRvckNodW5rOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICA6IHt9XG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgLi4uKGlzUHJvZHVjdGlvbiAmJiBzd0NvbmZpZyA/IHN3Q29uZmlnIDoge30pLFxuICAgICAgICAgICAgZmlsZVJlcGxhY2VtZW50czogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZTogYCR7YXBwLnJvb3R9LyR7c291cmNlfWAsXG4gICAgICAgICAgICAgICAgd2l0aDogYCR7YXBwLnJvb3R9LyR7ZW52aXJvbm1lbnRzW2Vudmlyb25tZW50XX1gLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9zZXJ2ZUNvbmZpZ3VyYXRpb25zKCk6IEpzb25PYmplY3Qge1xuICAgICAgICBjb25zdCBlbnZpcm9ubWVudHMgPSBhcHAuZW52aXJvbm1lbnRzO1xuXG4gICAgICAgIGlmICghZW52aXJvbm1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJjaGl0ZWN0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb25maWd1cmF0aW9ucyA9IChhcmNoaXRlY3QuYnVpbGQgYXMgSnNvbk9iamVjdCkuY29uZmlndXJhdGlvbnMgYXMgSnNvbk9iamVjdDtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGFjY1tlbnZpcm9ubWVudF0gPSB7IGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkOiR7ZW52aXJvbm1lbnR9YCB9O1xuXG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIF9leHRyYUVudHJ5TWFwcGVyKGV4dHJhRW50cnk6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgbGV0IGVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0O1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhRW50cnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgZW50cnkgPSBqb2luKGFwcC5yb290IGFzIFBhdGgsIGV4dHJhRW50cnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5LmlucHV0IGFzIHN0cmluZyB8fCAnJyk7XG4gICAgICAgICAgZW50cnkgPSB7IGlucHV0LCBsYXp5OiBleHRyYUVudHJ5LmxhenkgfTtcblxuICAgICAgICAgIGlmIChleHRyYUVudHJ5Lm91dHB1dCkge1xuICAgICAgICAgICAgZW50cnkuYnVuZGxlTmFtZSA9IGV4dHJhRW50cnkub3V0cHV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogJycsXG4gICAgICAgIHNvdXJjZVJvb3Q6ICdzcmMnLFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuICAgICAgcHJvamVjdC5hcmNoaXRlY3QgPSBhcmNoaXRlY3Q7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGAke2FwcFJvb3R9LyR7YXBwLmluZGV4IHx8IGRlZmF1bHRzLmluZGV4fWAsXG4gICAgICAgIG1haW46IGAke2FwcFJvb3R9LyR7YXBwLm1haW4gfHwgZGVmYXVsdHMubWFpbn1gLFxuICAgICAgICB0c0NvbmZpZzogYCR7YXBwUm9vdH0vJHthcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWd9YCxcbiAgICAgICAgLi4uYnVpbGREZWZhdWx0cyxcbiAgICAgIH07XG5cbiAgICAgIGlmIChhcHAucG9seWZpbGxzKSB7XG4gICAgICAgIGJ1aWxkT3B0aW9ucy5wb2x5ZmlsbHMgPSBhcHBSb290ICsgJy8nICsgYXBwLnBvbHlmaWxscztcbiAgICAgIH1cblxuICAgICAgaWYgKGFwcC5zdHlsZVByZXByb2Nlc3Nvck9wdGlvbnNcbiAgICAgICAgICAmJiBhcHAuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zLmluY2x1ZGVQYXRoc1xuICAgICAgICAgICYmIEFycmF5LmlzQXJyYXkoYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMpXG4gICAgICAgICAgJiYgYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgICBidWlsZE9wdGlvbnMuc3R5bGVQcmVwcm9jZXNzb3JPcHRpb25zID0ge1xuICAgICAgICAgIGluY2x1ZGVQYXRoczogYXBwLnN0eWxlUHJlcHJvY2Vzc29yT3B0aW9ucy5pbmNsdWRlUGF0aHNcbiAgICAgICAgICAgIC5tYXAoaW5jbHVkZVBhdGggPT4gam9pbihhcHAucm9vdCBhcyBQYXRoLCBpbmNsdWRlUGF0aCkpLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYXJjaGl0ZWN0LmJ1aWxkID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06YnJvd3NlcmAsXG4gICAgICAgIG9wdGlvbnM6IGJ1aWxkT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9idWlsZENvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBTZXJ2ZSB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgLFxuICAgICAgICAuLi5zZXJ2ZURlZmF1bHRzLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5zZXJ2ZSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmRldi1zZXJ2ZXJgLFxuICAgICAgICBvcHRpb25zOiBzZXJ2ZU9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfc2VydmVDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCB0YXJnZXRcbiAgICAgIGNvbnN0IGV4dHJhY3RJMThuT3B0aW9uczogSnNvbk9iamVjdCA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgIH07XG4gICAgICBhcmNoaXRlY3RbJ2V4dHJhY3QtaTE4biddID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZXh0cmFjdC1pMThuYCxcbiAgICAgICAgb3B0aW9uczogZXh0cmFjdEkxOG5PcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qga2FybWFDb25maWcgPSBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYVxuICAgICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnIHx8ICcnXG4gICAgICAgICAgOiAnJztcbiAgICAgICAgLy8gVGVzdCB0YXJnZXRcbiAgICAgIGNvbnN0IHRlc3RPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdCB8fCBkZWZhdWx0cy50ZXN0LFxuICAgICAgICAgIC8vIE1ha2Uga2FybWFDb25maWcgcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgICBrYXJtYUNvbmZpZyxcbiAgICAgICAgfTtcblxuICAgICAgaWYgKGFwcC5wb2x5ZmlsbHMpIHtcbiAgICAgICAgdGVzdE9wdGlvbnMucG9seWZpbGxzID0gYXBwUm9vdCArICcvJyArIGFwcC5wb2x5ZmlsbHM7XG4gICAgICB9XG5cbiAgICAgIGlmIChhcHAudGVzdFRzY29uZmlnKSB7XG4gICAgICAgICAgdGVzdE9wdGlvbnMudHNDb25maWcgPSBhcHBSb290ICsgJy8nICsgYXBwLnRlc3RUc2NvbmZpZztcbiAgICAgICAgfVxuICAgICAgdGVzdE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcblxuICAgICAgaWYgKGthcm1hQ29uZmlnKSB7XG4gICAgICAgIGFyY2hpdGVjdC50ZXN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTprYXJtYWAsXG4gICAgICAgICAgb3B0aW9uczogdGVzdE9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRzQ29uZmlnczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IGV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgaWYgKGxpbnQuZXhjbHVkZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW50LmV4Y2x1ZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIGV4Y2x1ZGVzLnB1c2gobGludC5leGNsdWRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxpbnQuZXhjbHVkZS5mb3JFYWNoKGV4ID0+IGV4Y2x1ZGVzLnB1c2goZXgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZW1vdmVEdXBlcyA9IChpdGVtczogc3RyaW5nW10pID0+IGl0ZW1zLnJlZHVjZSgobmV3SXRlbXMsIGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKG5ld0l0ZW1zLmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICAgICAgbmV3SXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdJdGVtcztcbiAgICAgIH0sIDxzdHJpbmdbXT4gW10pO1xuXG4gICAgICAgIC8vIFRzbGludCB0YXJnZXRcbiAgICAgIGNvbnN0IGxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpID09PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3QubGludCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgICBvcHRpb25zOiBsaW50T3B0aW9ucyxcbiAgICAgICAgfTtcblxuICAgICAgLy8gc2VydmVyIHRhcmdldFxuICAgICAgY29uc3Qgc2VydmVyQXBwID0gc2VydmVyQXBwc1xuICAgICAgICAuZmlsdGVyKHNlcnZlckFwcCA9PiBhcHAucm9vdCA9PT0gc2VydmVyQXBwLnJvb3QgJiYgYXBwLmluZGV4ID09PSBzZXJ2ZXJBcHAuaW5kZXgpWzBdO1xuXG4gICAgICBpZiAoc2VydmVyQXBwKSB7XG4gICAgICAgIGNvbnN0IHNlcnZlck9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgb3V0cHV0UGF0aDogc2VydmVyQXBwLm91dERpciB8fCBkZWZhdWx0cy5zZXJ2ZXJPdXREaXIsXG4gICAgICAgICAgbWFpbjogc2VydmVyQXBwLm1haW4gfHwgZGVmYXVsdHMuc2VydmVyTWFpbixcbiAgICAgICAgICB0c0NvbmZpZzogc2VydmVyQXBwLnRzY29uZmlnIHx8IGRlZmF1bHRzLnNlcnZlclRzQ29uZmlnLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBzZXJ2ZXJUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgICAgYnVpbGRlcjogJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnNlcnZlcicsXG4gICAgICAgICAgb3B0aW9uczogc2VydmVyT3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgICAgYXJjaGl0ZWN0LnNlcnZlciA9IHNlcnZlclRhcmdldDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGUyZVByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6IHByb2plY3Qucm9vdCxcbiAgICAgICAgc291cmNlUm9vdDogcHJvamVjdC5yb290LFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGUyZUFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bWF4LWxpbmUtbGVuZ3RoXG4gICAgICBjb25zdCBwcm90cmFjdG9yQ29uZmlnID0gY29uZmlnICYmIGNvbmZpZy5lMmUgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yICYmIGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgPyBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgIDogJyc7XG4gICAgICBjb25zdCBlMmVPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBwcm90cmFjdG9yQ29uZmlnLFxuICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke25hbWV9OnNlcnZlYCxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpwcm90cmFjdG9yYCxcbiAgICAgICAgb3B0aW9uczogZTJlT3B0aW9ucyxcbiAgICAgIH07XG5cbiAgICAgIGUyZUFyY2hpdGVjdC5lMmUgPSBlMmVUYXJnZXQ7XG4gICAgICBjb25zdCBlMmVMaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSAhPT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlTGludFRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgIG9wdGlvbnM6IGUyZUxpbnRPcHRpb25zLFxuICAgICAgfTtcbiAgICAgIGUyZUFyY2hpdGVjdC5saW50ID0gZTJlTGludFRhcmdldDtcbiAgICAgIGlmIChwcm90cmFjdG9yQ29uZmlnKSB7XG4gICAgICAgIGUyZVByb2plY3QuYXJjaGl0ZWN0ID0gZTJlQXJjaGl0ZWN0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0IH07XG4gICAgfSlcbiAgICAucmVkdWNlKChwcm9qZWN0cywgbWFwcGVkQXBwKSA9PiB7XG4gICAgICBjb25zdCB7bmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdH0gPSBtYXBwZWRBcHA7XG4gICAgICBwcm9qZWN0c1tuYW1lXSA9IHByb2plY3Q7XG4gICAgICBwcm9qZWN0c1tuYW1lICsgJy1lMmUnXSA9IGUyZVByb2plY3Q7XG5cbiAgICAgIHJldHVybiBwcm9qZWN0cztcbiAgICB9LCB7fSBhcyBKc29uT2JqZWN0KTtcblxuICByZXR1cm4gcHJvamVjdE1hcDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3BlY1RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgICBhcHBzLmZvckVhY2goKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgdGVzdFRzQ29uZmlnID0gYXBwLnRlc3RUc2NvbmZpZyB8fCBkZWZhdWx0cy50ZXN0VHNDb25maWc7XG4gICAgICBjb25zdCB0c1NwZWNDb25maWdQYXRoID0gam9pbihub3JtYWxpemUoYXBwLnJvb3QgfHwgJycpLCB0ZXN0VHNDb25maWcpO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRzU3BlY0NvbmZpZ1BhdGgpO1xuXG4gICAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cblxuICAgICAgY29uc3QgdHNDZmdBc3QgPSBwYXJzZUpzb25Bc3QoYnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuICAgICAgaWYgKHRzQ2ZnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgdHNjb25maWcuIFdhcyBleHBlY3RpbmcgYW4gb2JqZWN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVzQXN0Tm9kZSA9IGZpbmRQcm9wZXJ0eUluQXN0T2JqZWN0KHRzQ2ZnQXN0LCAnZmlsZXMnKTtcbiAgICAgIGlmIChmaWxlc0FzdE5vZGUgJiYgZmlsZXNBc3ROb2RlLmtpbmQgIT0gJ2FycmF5Jykge1xuICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignSW52YWxpZCB0c2NvbmZpZyBcImZpbGVzXCIgcHJvcGVydHk7IGV4cGVjdGVkIGFuIGFycmF5LicpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUodHNTcGVjQ29uZmlnUGF0aCk7XG5cbiAgICAgIGNvbnN0IHBvbHlmaWxscyA9IGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzO1xuICAgICAgaWYgKCFmaWxlc0FzdE5vZGUpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgZmlsZXMgYXJyYXkgZG9lcyBub3QgZXhpc3QuIFRoaXMgbWVhbnMgZXhjbHVkZSBvciBpbmNsdWRlIGFyZVxuICAgICAgICAvLyBzZXQgYW5kIHdlIHNob3VsZG4ndCBtZXNzIHdpdGggdGhhdC5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmaWxlc0FzdE5vZGUudmFsdWUuaW5kZXhPZihwb2x5ZmlsbHMpID09IC0xKSB7XG4gICAgICAgICAgYXBwZW5kVmFsdWVJbkFzdEFycmF5KHJlY29yZGVyLCBmaWxlc0FzdE5vZGUsIHBvbHlmaWxscyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQYWNrYWdlSnNvbihjb25maWc6IENsaUNvbmZpZykge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBwa2dQYXRoID0gJy9wYWNrYWdlLmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwa2dQYXRoKTtcbiAgICBpZiAoYnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgcmVhZCBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG4gICAgY29uc3QgcGtnQXN0ID0gcGFyc2VKc29uQXN0KGJ1ZmZlci50b1N0cmluZygpLCBKc29uUGFyc2VNb2RlLlN0cmljdCk7XG5cbiAgICBpZiAocGtnQXN0LmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdFcnJvciByZWFkaW5nIHBhY2thZ2UuanNvbicpO1xuICAgIH1cblxuICAgIGNvbnN0IGRldkRlcGVuZGVuY2llc05vZGUgPSBmaW5kUHJvcGVydHlJbkFzdE9iamVjdChwa2dBc3QsICdkZXZEZXBlbmRlbmNpZXMnKTtcbiAgICBpZiAoZGV2RGVwZW5kZW5jaWVzTm9kZSAmJiBkZXZEZXBlbmRlbmNpZXNOb2RlLmtpbmQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdFcnJvciByZWFkaW5nIHBhY2thZ2UuanNvbjsgZGV2RGVwZW5kZW5jeSBpcyBub3QgYW4gb2JqZWN0LicpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShwa2dQYXRoKTtcbiAgICBjb25zdCBkZXBOYW1lID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbiAgICBpZiAoIWRldkRlcGVuZGVuY2llc05vZGUpIHtcbiAgICAgIC8vIEhhdmVuJ3QgZm91bmQgdGhlIGRldkRlcGVuZGVuY2llcyBrZXksIGFkZCBpdCB0byB0aGUgcm9vdCBvZiB0aGUgcGFja2FnZS5qc29uLlxuICAgICAgYXBwZW5kUHJvcGVydHlJbkFzdE9iamVjdChyZWNvcmRlciwgcGtnQXN0LCAnZGV2RGVwZW5kZW5jaWVzJywge1xuICAgICAgICBbZGVwTmFtZV06IGxhdGVzdFZlcnNpb25zLkRldmtpdEJ1aWxkQW5ndWxhcixcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGEgYnVpbGQtYW5ndWxhciBrZXkuXG4gICAgICBjb25zdCBidWlsZEFuZ3VsYXJOb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QoZGV2RGVwZW5kZW5jaWVzTm9kZSwgZGVwTmFtZSk7XG5cbiAgICAgIGlmICghYnVpbGRBbmd1bGFyTm9kZSkge1xuICAgICAgICAvLyBObyBidWlsZC1hbmd1bGFyIHBhY2thZ2UsIGFkZCBpdC5cbiAgICAgICAgYXBwZW5kUHJvcGVydHlJbkFzdE9iamVjdChcbiAgICAgICAgICByZWNvcmRlcixcbiAgICAgICAgICBkZXZEZXBlbmRlbmNpZXNOb2RlLFxuICAgICAgICAgIGRlcE5hbWUsXG4gICAgICAgICAgbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRBbmd1bGFyLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeyBlbmQsIHN0YXJ0IH0gPSBidWlsZEFuZ3VsYXJOb2RlO1xuICAgICAgICByZWNvcmRlci5yZW1vdmUoc3RhcnQub2Zmc2V0LCBlbmQub2Zmc2V0IC0gc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoc3RhcnQub2Zmc2V0LCBKU09OLnN0cmluZ2lmeShsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZEFuZ3VsYXIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soe1xuICAgICAgcGFja2FnZU1hbmFnZXI6IGNvbmZpZy5wYWNrYWdlTWFuYWdlciA9PT0gJ2RlZmF1bHQnID8gdW5kZWZpbmVkIDogY29uZmlnLnBhY2thZ2VNYW5hZ2VyLFxuICAgIH0pKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc0xpbnRDb25maWcoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHRzTGludFBhdGggPSAnL3RzbGludC5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNMaW50UGF0aCk7XG4gICAgaWYgKCFidWZmZXIpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cbiAgICBjb25zdCB0c0NmZ0FzdCA9IHBhcnNlSnNvbkFzdChidWZmZXIudG9TdHJpbmcoKSwgSnNvblBhcnNlTW9kZS5Mb29zZSk7XG5cbiAgICBpZiAodHNDZmdBc3Qua2luZCAhPSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcnVsZXNOb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QodHNDZmdBc3QsICdydWxlcycpO1xuICAgIGlmICghcnVsZXNOb2RlIHx8IHJ1bGVzTm9kZS5raW5kICE9ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRCbGFja2xpc3ROb2RlID0gZmluZFByb3BlcnR5SW5Bc3RPYmplY3QocnVsZXNOb2RlLCAnaW1wb3J0LWJsYWNrbGlzdCcpO1xuICAgIGlmICghaW1wb3J0QmxhY2tsaXN0Tm9kZSB8fCBpbXBvcnRCbGFja2xpc3ROb2RlLmtpbmQgIT0gJ2FycmF5Jykge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHRzTGludFBhdGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZWxlbWVudCA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaV07XG4gICAgICBpZiAoZWxlbWVudC5raW5kID09ICdzdHJpbmcnICYmIGVsZW1lbnQudmFsdWUgPT0gJ3J4anMnKSB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gZWxlbWVudDtcbiAgICAgICAgLy8gUmVtb3ZlIHRoaXMgZWxlbWVudC5cbiAgICAgICAgaWYgKGkgPT0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgLy8gTGFzdCBlbGVtZW50LlxuICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgLy8gTm90IGZpcnN0LCB0aGVyZSdzIGEgY29tbWEgdG8gcmVtb3ZlIGJlZm9yZS5cbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzID0gaW1wb3J0QmxhY2tsaXN0Tm9kZS5lbGVtZW50c1tpIC0gMV07XG4gICAgICAgICAgICByZWNvcmRlci5yZW1vdmUocHJldmlvdXMuZW5kLm9mZnNldCwgZW5kLm9mZnNldCAtIHByZXZpb3VzLmVuZC5vZmZzZXQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBPbmx5IGVsZW1lbnQsIGp1c3QgcmVtb3ZlIHRoZSB3aG9sZSBydWxlLlxuICAgICAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBpbXBvcnRCbGFja2xpc3ROb2RlO1xuICAgICAgICAgICAgcmVjb3JkZXIucmVtb3ZlKHN0YXJ0Lm9mZnNldCwgZW5kLm9mZnNldCAtIHN0YXJ0Lm9mZnNldCk7XG4gICAgICAgICAgICByZWNvcmRlci5pbnNlcnRMZWZ0KHN0YXJ0Lm9mZnNldCwgJ1tdJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE1pZGRsZSwganVzdCByZW1vdmUgdGhlIHdob2xlIG5vZGUgKHVwIHRvIG5leHQgbm9kZSBzdGFydCkuXG4gICAgICAgICAgY29uc3QgbmV4dCA9IGltcG9ydEJsYWNrbGlzdE5vZGUuZWxlbWVudHNbaSArIDFdO1xuICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShzdGFydC5vZmZzZXQsIG5leHQuc3RhcnQub2Zmc2V0IC0gc3RhcnQub2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGlmIChob3N0LmV4aXN0cygnLy5hbmd1bGFyLmpzb24nKSB8fCBob3N0LmV4aXN0cygnL2FuZ3VsYXIuanNvbicpKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdGb3VuZCBhIG1vZGVybiBjb25maWd1cmF0aW9uIGZpbGUuIE5vdGhpbmcgdG8gYmUgZG9uZS4nKTtcblxuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ1BhdGgoaG9zdCk7XG4gICAgY29uc3QgY29uZmlnQnVmZmVyID0gaG9zdC5yZWFkKG5vcm1hbGl6ZShjb25maWdQYXRoKSk7XG4gICAgaWYgKGNvbmZpZ0J1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgY29uZmlndXJhdGlvbiBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIH1cbiAgICBjb25zdCBjb25maWcgPSBwYXJzZUpzb24oY29uZmlnQnVmZmVyLnRvU3RyaW5nKCksIEpzb25QYXJzZU1vZGUuTG9vc2UpO1xuXG4gICAgaWYgKHR5cGVvZiBjb25maWcgIT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShjb25maWcpIHx8IGNvbmZpZyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0ludmFsaWQgYW5ndWxhci1jbGkuanNvbiBjb25maWd1cmF0aW9uOyBleHBlY3RlZCBhbiBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIG1pZ3JhdGVDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnKSxcbiAgICAgIHVwZGF0ZVBhY2thZ2VKc29uKGNvbmZpZyksXG4gICAgICB1cGRhdGVUc0xpbnRDb25maWcoKSxcbiAgICAgIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4odGFncy5vbmVMaW5lYFNvbWUgY29uZmlndXJhdGlvbiBvcHRpb25zIGhhdmUgYmVlbiBjaGFuZ2VkLFxuICAgICAgICAgIHBsZWFzZSBtYWtlIHN1cmUgdG8gdXBkYXRlIGFueSBucG0gc2NyaXB0cyB3aGljaCB5b3UgbWF5IGhhdmUgbW9kaWZpZWQuYCk7XG5cbiAgICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgICB9LFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19