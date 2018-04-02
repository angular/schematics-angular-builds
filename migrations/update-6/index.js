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
function extractCliConfig(_config) {
    return null;
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
    const apps = config.apps || [];
    // convert the apps to projects
    const projectMap = apps
        .map((app, idx) => {
        const defaultAppName = idx === 0 ? defaultAppNamePrefix : `${defaultAppNamePrefix}${idx}`;
        const name = app.name || defaultAppName;
        const outDir = app.outDir || defaults.outDir;
        const appRoot = app.root || defaults.appRoot;
        function _mapAssets(asset) {
            if (typeof asset === 'string') {
                return { glob: asset, input: core_1.normalize('/' + appRoot + '/'), output: '/' };
            }
            else {
                if (asset.output) {
                    return {
                        glob: asset.glob,
                        input: core_1.normalize('/' + appRoot + '/' + asset.input),
                        output: core_1.normalize('/'
                            + asset.output.startsWith(outDir)
                            ? asset.output.slice(outDir.length)
                            : asset.output),
                    };
                }
                else {
                    return {
                        glob: asset.glob,
                        input: core_1.normalize('/' + appRoot + '/' + asset.input),
                        output: '/',
                    };
                }
            }
        }
        function _buildConfigurations() {
            const source = app.environmentSource;
            const environments = app.environments;
            if (!environments) {
                return {};
            }
            return Object.keys(environments).reduce((acc, environment) => {
                let isProduction = false;
                const environmentContent = tree.read(app.root + '/' + environments[environment]);
                if (environmentContent) {
                    isProduction = !!environmentContent.toString('utf-8')
                        .match(/production['"]?\s*[:=]\s*true/);
                }
                // We used to use `prod` by default as the key, instead we now use the full word.
                // Try not to override the production key if it's there.
                if (environment == 'prod' && !environments['production'] && isProduction) {
                    environment = 'production';
                }
                acc[environment] = Object.assign({}, (isProduction
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
                    : {}), { fileReplacements: [
                        { from: `${app.root}/${source}`, to: `${outDir}/${environments[environment]}` },
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
        const buildOptions = {
            // Make outputPath relative to root.
            outputPath: outDir,
            index: appRoot + '/' + app.index || defaults.index,
            main: appRoot + '/' + app.main || defaults.main,
            polyfills: appRoot + '/' + app.polyfills || defaults.polyfills,
            tsConfig: appRoot + '/' + app.tsconfig || defaults.tsConfig,
        };
        buildOptions.assets = (app.assets || []).map(_mapAssets);
        buildOptions.styles = (app.styles || []).map(_extraEntryMapper);
        buildOptions.scripts = (app.scripts || []).map(_extraEntryMapper);
        architect.build = {
            builder: `${builderPackage}:browser`,
            options: buildOptions,
            configurations: _buildConfigurations(),
        };
        // Serve target
        const serveOptions = {
            browserTarget: `${name}:build`,
        };
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
            polyfills: appRoot + '/' + app.polyfills || defaults.polyfills,
            // Make karmaConfig relative to root.
            karmaConfig,
        };
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
function updatePackageJson() {
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
        pkg.devDependencies['@angular-devkit/build-angular'] = latest_versions_1.latestVersions.DevkitBuildWebpack;
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
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
            updatePackageJson(),
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQW1GO0FBQ25GLDJEQU1vQztBQUVwQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0NBQ25DLENBQUM7QUFFRix1QkFBdUIsSUFBVTtJQUMvQixJQUFJLFlBQVksR0FBRyxnQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBQ0QsWUFBWSxHQUFHLGdCQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsbUNBQW1DLE1BQWlCO0lBQ2xELE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FB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LENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsa0JBQUssQ0FBQztZQUNYLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztZQUNqQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUM7WUFDNUIsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1lBQzFCLGlCQUFpQixFQUFFO1NBQ3BCLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWhCRCw0QkFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBKc29uT2JqZWN0LCBQYXRoLCBiYXNlbmFtZSwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgY2hhaW4sXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEFwcENvbmZpZywgQ2xpQ29uZmlnIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi8uLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICBhcHBSb290OiAnc3JjJyxcbiAgaW5kZXg6ICdpbmRleC5odG1sJyxcbiAgbWFpbjogJ21haW4udHMnLFxuICBwb2x5ZmlsbHM6ICdwb2x5ZmlsbHMudHMnLFxuICB0c0NvbmZpZzogJ3RzY29uZmlnLmFwcC5qc29uJyxcbiAgdGVzdDogJ3Rlc3QudHMnLFxuICBvdXREaXI6ICdkaXN0LycsXG4gIGthcm1hOiAna2FybWEuY29uZi5qcycsXG4gIHByb3RyYWN0b3I6ICdwcm90cmFjdG9yLmNvbmYuanMnLFxuICB0ZXN0VHNDb25maWc6ICd0c2NvbmZpZy5zcGVjLmpzb24nLFxufTtcblxuZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCh0cmVlOiBUcmVlKTogUGF0aCB7XG4gIGxldCBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJy5hbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuICBwb3NzaWJsZVBhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXItY2xpLmpzb24nKTtcbiAgaWYgKHRyZWUuZXhpc3RzKHBvc3NpYmxlUGF0aCkpIHtcbiAgICByZXR1cm4gcG9zc2libGVQYXRoO1xuICB9XG5cbiAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZScpO1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlS2FybWFDb25maWd1cmF0aW9uKGNvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGthcm1hIGNvbmZpZ3VyYXRpb25gKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qga2FybWFQYXRoID0gY29uZmlnICYmIGNvbmZpZy50ZXN0ICYmIGNvbmZpZy50ZXN0Lmthcm1hICYmIGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy50ZXN0Lmthcm1hLmNvbmZpZ1xuICAgICAgICA6IGRlZmF1bHRzLmthcm1hO1xuICAgICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKGthcm1hUGF0aCk7XG4gICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoIC9AYW5ndWxhclxcL2NsaS9nLCAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInKTtcbiAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgncmVwb3J0cycsXG4gICAgICAgICAgYGRpcjogcmVxdWlyZSgncGF0aCcpLmpvaW4oX19kaXJuYW1lLCAnY292ZXJhZ2UnKSwgcmVwb3J0c2ApO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZShrYXJtYVBhdGgsIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG1pZ3JhdGVDb25maWd1cmF0aW9uKG9sZENvbmZpZzogQ2xpQ29uZmlnKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG9sZENvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBub3JtYWxpemUoJ2FuZ3VsYXIuanNvbicpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFVwZGF0aW5nIGNvbmZpZ3VyYXRpb25gKTtcbiAgICBjb25zdCBjb25maWc6IEpzb25PYmplY3QgPSB7XG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6ICdwcm9qZWN0cycsXG4gICAgICBwcm9qZWN0czogZXh0cmFjdFByb2plY3RzQ29uZmlnKG9sZENvbmZpZywgaG9zdCksXG4gICAgfTtcbiAgICBjb25zdCBjbGlDb25maWcgPSBleHRyYWN0Q2xpQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKGNsaUNvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgY29uZmlnLmNsaSA9IGNsaUNvbmZpZztcbiAgICB9XG4gICAgY29uc3Qgc2NoZW1hdGljc0NvbmZpZyA9IGV4dHJhY3RTY2hlbWF0aWNzQ29uZmlnKG9sZENvbmZpZyk7XG4gICAgaWYgKHNjaGVtYXRpY3NDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5zY2hlbWF0aWNzID0gc2NoZW1hdGljc0NvbmZpZztcbiAgICB9XG4gICAgY29uc3QgYXJjaGl0ZWN0Q29uZmlnID0gZXh0cmFjdEFyY2hpdGVjdENvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChhcmNoaXRlY3RDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5hcmNoaXRlY3QgPSBhcmNoaXRlY3RDb25maWc7XG4gICAgfVxuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgUmVtb3Zpbmcgb2xkIGNvbmZpZyBmaWxlICgke29sZENvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuZGVsZXRlKG9sZENvbmZpZ1BhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFdyaXRpbmcgY29uZmlnIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgaG9zdC5jcmVhdGUoY29uZmlnUGF0aCwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdENsaUNvbmZpZyhfY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgbGV0IGNvbGxlY3Rpb25OYW1lID0gJ0BzY2hlbWF0aWNzL2FuZ3VsYXInO1xuICBpZiAoIWNvbmZpZyB8fCAhY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gY29uc3QgY29uZmlnRGVmYXVsdHMgPSBjb25maWcuZGVmYXVsdHM7XG4gIGlmIChjb25maWcuZGVmYXVsdHMgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MgJiYgY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbikge1xuICAgIGNvbGxlY3Rpb25OYW1lID0gY29uZmlnLmRlZmF1bHRzLnNjaGVtYXRpY3MuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgZWFjaCBzY2hlbWF0aWNcbiAgICogIC0gZ2V0IHRoZSBjb25maWdcbiAgICogIC0gZmlsdGVyIG9uZSdzIHdpdGhvdXQgY29uZmlnXG4gICAqICAtIGNvbWJpbmUgdGhlbSBpbnRvIGFuIG9iamVjdFxuICAgKi9cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICBjb25zdCBzY2hlbWF0aWNDb25maWdzOiBhbnkgPSBbJ2NsYXNzJywgJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZ3VhcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2ludGVyZmFjZScsICdtb2R1bGUnLCAncGlwZScsICdzZXJ2aWNlJ11cbiAgICAubWFwKHNjaGVtYXRpY05hbWUgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3Qgc2NoZW1hdGljRGVmYXVsdHM6IEpzb25PYmplY3QgPSAoY29uZmlnLmRlZmF1bHRzIGFzIGFueSlbc2NoZW1hdGljTmFtZV0gfHwgbnVsbDtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NoZW1hdGljTmFtZSxcbiAgICAgICAgY29uZmlnOiBzY2hlbWF0aWNEZWZhdWx0cyxcbiAgICAgIH07XG4gICAgfSlcbiAgICAuZmlsdGVyKHNjaGVtYXRpYyA9PiBzY2hlbWF0aWMuY29uZmlnICE9PSBudWxsKVxuICAgIC5yZWR1Y2UoKGFsbDogSnNvbk9iamVjdCwgc2NoZW1hdGljKSA9PiB7XG4gICAgICBhbGxbY29sbGVjdGlvbk5hbWUgKyAnOicgKyBzY2hlbWF0aWMuc2NoZW1hdGljTmFtZV0gPSBzY2hlbWF0aWMuY29uZmlnO1xuXG4gICAgICByZXR1cm4gYWxsO1xuICAgIH0sIHt9KTtcblxuICBjb25zdCBjb21wb25lbnRVcGRhdGU6IEpzb25PYmplY3QgPSB7fTtcbiAgY29tcG9uZW50VXBkYXRlLnByZWZpeCA9ICcnO1xuXG4gIGNvbnN0IGNvbXBvbmVudEtleSA9IGNvbGxlY3Rpb25OYW1lICsgJzpjb21wb25lbnQnO1xuICBjb25zdCBkaXJlY3RpdmVLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6ZGlyZWN0aXZlJztcbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0gPSB7fTtcbiAgfVxuICBpZiAoIXNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XSA9IHt9O1xuICB9XG4gIGlmIChjb25maWcuYXBwcyAmJiBjb25maWcuYXBwc1swXSkge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tkaXJlY3RpdmVLZXldLnByZWZpeCA9IGNvbmZpZy5hcHBzWzBdLnByZWZpeDtcbiAgfVxuICBpZiAoY29uZmlnLmRlZmF1bHRzKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldLnN0eWxlZXh0ID0gY29uZmlnLmRlZmF1bHRzLnN0eWxlRXh0O1xuICB9XG5cbiAgcmV0dXJuIHNjaGVtYXRpY0NvbmZpZ3M7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RBcmNoaXRlY3RDb25maWcoX2NvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFByb2plY3RzQ29uZmlnKGNvbmZpZzogQ2xpQ29uZmlnLCB0cmVlOiBUcmVlKTogSnNvbk9iamVjdCB7XG4gIGNvbnN0IGJ1aWxkZXJQYWNrYWdlID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbiAgbGV0IGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gJ2FwcCc7XG4gIGlmIChjb25maWcucHJvamVjdCAmJiBjb25maWcucHJvamVjdC5uYW1lKSB7XG4gICAgZGVmYXVsdEFwcE5hbWVQcmVmaXggPSBjb25maWcucHJvamVjdC5uYW1lO1xuICB9XG5cbiAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAvLyBjb252ZXJ0IHRoZSBhcHBzIHRvIHByb2plY3RzXG4gIGNvbnN0IHByb2plY3RNYXAgPSBhcHBzXG4gICAgLm1hcCgoYXBwOiBBcHBDb25maWcsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCBkZWZhdWx0QXBwTmFtZSA9IGlkeCA9PT0gMCA/IGRlZmF1bHRBcHBOYW1lUHJlZml4IDogYCR7ZGVmYXVsdEFwcE5hbWVQcmVmaXh9JHtpZHh9YDtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcHAubmFtZSB8fCBkZWZhdWx0QXBwTmFtZTtcbiAgICAgIGNvbnN0IG91dERpciA9IGFwcC5vdXREaXIgfHwgZGVmYXVsdHMub3V0RGlyO1xuICAgICAgY29uc3QgYXBwUm9vdCA9IGFwcC5yb290IHx8IGRlZmF1bHRzLmFwcFJvb3Q7XG5cbiAgICAgIGZ1bmN0aW9uIF9tYXBBc3NldHMoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4geyBnbG9iOiBhc3NldCwgaW5wdXQ6IG5vcm1hbGl6ZSgnLycgKyBhcHBSb290ICsgJy8nKSwgb3V0cHV0OiAnLycgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoYXNzZXQub3V0cHV0KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKCcvJyArIGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogbm9ybWFsaXplKCcvJ1xuICAgICAgICAgICAgICAgICsgKGFzc2V0Lm91dHB1dCBhcyBzdHJpbmcpLnN0YXJ0c1dpdGgob3V0RGlyKVxuICAgICAgICAgICAgICAgID8gKGFzc2V0Lm91dHB1dCBhcyBzdHJpbmcpLnNsaWNlKG91dERpci5sZW5ndGgpXG4gICAgICAgICAgICAgICAgOiAoYXNzZXQub3V0cHV0IGFzIHN0cmluZyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBnbG9iOiBhc3NldC5nbG9iLFxuICAgICAgICAgICAgICBpbnB1dDogbm9ybWFsaXplKCcvJyArIGFwcFJvb3QgKyAnLycgKyBhc3NldC5pbnB1dCksXG4gICAgICAgICAgICAgIG91dHB1dDogJy8nLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gX2J1aWxkQ29uZmlndXJhdGlvbnMoKTogSnNvbk9iamVjdCB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGFwcC5lbnZpcm9ubWVudFNvdXJjZTtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcblxuICAgICAgICBpZiAoIWVudmlyb25tZW50cykge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhlbnZpcm9ubWVudHMpLnJlZHVjZSgoYWNjLCBlbnZpcm9ubWVudCkgPT4ge1xuICAgICAgICAgIGxldCBpc1Byb2R1Y3Rpb24gPSBmYWxzZTtcblxuICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50Q29udGVudCA9IHRyZWUucmVhZChhcHAucm9vdCArICcvJyArIGVudmlyb25tZW50c1tlbnZpcm9ubWVudF0pO1xuICAgICAgICAgIGlmIChlbnZpcm9ubWVudENvbnRlbnQpIHtcbiAgICAgICAgICAgIGlzUHJvZHVjdGlvbiA9ICEhZW52aXJvbm1lbnRDb250ZW50LnRvU3RyaW5nKCd1dGYtOCcpXG4gICAgICAgICAgICAgIC8vIEFsbG93IGZvciBgcHJvZHVjdGlvbjogdHJ1ZWAgb3IgYHByb2R1Y3Rpb24gPSB0cnVlYC4gQmVzdCB3ZSBjYW4gZG8gdG8gZ3Vlc3MuXG4gICAgICAgICAgICAgIC5tYXRjaCgvcHJvZHVjdGlvblsnXCJdP1xccypbOj1dXFxzKnRydWUvKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBXZSB1c2VkIHRvIHVzZSBgcHJvZGAgYnkgZGVmYXVsdCBhcyB0aGUga2V5LCBpbnN0ZWFkIHdlIG5vdyB1c2UgdGhlIGZ1bGwgd29yZC5cbiAgICAgICAgICAvLyBUcnkgbm90IHRvIG92ZXJyaWRlIHRoZSBwcm9kdWN0aW9uIGtleSBpZiBpdCdzIHRoZXJlLlxuICAgICAgICAgIGlmIChlbnZpcm9ubWVudCA9PSAncHJvZCcgJiYgIWVudmlyb25tZW50c1sncHJvZHVjdGlvbiddICYmIGlzUHJvZHVjdGlvbikge1xuICAgICAgICAgICAgZW52aXJvbm1lbnQgPSAncHJvZHVjdGlvbic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYWNjW2Vudmlyb25tZW50XSA9IHtcbiAgICAgICAgICAgIC4uLihpc1Byb2R1Y3Rpb25cbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgb3B0aW1pemF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXh0cmFjdENzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICAgICAgYW90OiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4dHJhY3RMaWNlbnNlczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICAgICAgYnVpbGRPcHRpbWl6ZXI6IHRydWUsXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiB7fVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IFtcbiAgICAgICAgICAgICAgeyBmcm9tOiBgJHthcHAucm9vdH0vJHtzb3VyY2V9YCwgdG86IGAke291dERpcn0vJHtlbnZpcm9ubWVudHNbZW52aXJvbm1lbnRdfWAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfc2VydmVDb25maWd1cmF0aW9ucygpOiBKc29uT2JqZWN0IHtcbiAgICAgICAgY29uc3QgZW52aXJvbm1lbnRzID0gYXBwLmVudmlyb25tZW50cztcblxuICAgICAgICBpZiAoIWVudmlyb25tZW50cykge1xuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWFyY2hpdGVjdCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29uZmlndXJhdGlvbnMgPSAoYXJjaGl0ZWN0LmJ1aWxkIGFzIEpzb25PYmplY3QpLmNvbmZpZ3VyYXRpb25zIGFzIEpzb25PYmplY3Q7XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbmZpZ3VyYXRpb25zKS5yZWR1Y2UoKGFjYywgZW52aXJvbm1lbnQpID0+IHtcbiAgICAgICAgICBhY2NbZW52aXJvbm1lbnRdID0geyBicm93c2VyVGFyZ2V0OiBgJHtuYW1lfTpidWlsZDoke2Vudmlyb25tZW50fWAgfTtcblxuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBfZXh0cmFFbnRyeU1hcHBlcihleHRyYUVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0KSB7XG4gICAgICAgIGxldCBlbnRyeTogSnNvbk9iamVjdDtcbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYUVudHJ5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGVudHJ5ID0geyBpbnB1dDogam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5KSB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gam9pbihhcHAucm9vdCBhcyBQYXRoLCBleHRyYUVudHJ5LmlucHV0IGFzIHN0cmluZyB8fCAnJyk7XG4gICAgICAgICAgY29uc3QgbGF6eSA9ICEhZXh0cmFFbnRyeS5sYXp5O1xuICAgICAgICAgIGVudHJ5ID0geyBpbnB1dCB9O1xuXG4gICAgICAgICAgaWYgKCFleHRyYUVudHJ5Lm91dHB1dCAmJiBsYXp5KSB7XG4gICAgICAgICAgICBlbnRyeS5sYXp5ID0gdHJ1ZTtcbiAgICAgICAgICAgIGVudHJ5LmJ1bmRsZU5hbWUgPSBiYXNlbmFtZShcbiAgICAgICAgICAgICAgbm9ybWFsaXplKGlucHV0LnJlcGxhY2UoL1xcLihqc3xjc3N8c2Nzc3xzYXNzfGxlc3N8c3R5bCkkL2ksICcnKSksXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZXh0cmFFbnRyeS5vdXRwdXQpIHtcbiAgICAgICAgICAgIGVudHJ5LmJ1bmRsZU5hbWUgPSBleHRyYUVudHJ5Lm91dHB1dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW50cnk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6ICcnLFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuICAgICAgcHJvamVjdC5hcmNoaXRlY3QgPSBhcmNoaXRlY3Q7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGFwcFJvb3QgKyAnLycgKyBhcHAuaW5kZXggfHwgZGVmYXVsdHMuaW5kZXgsXG4gICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAubWFpbiB8fCBkZWZhdWx0cy5tYWluLFxuICAgICAgICBwb2x5ZmlsbHM6IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscyxcbiAgICAgICAgdHNDb25maWc6IGFwcFJvb3QgKyAnLycgKyBhcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWcsXG4gICAgICB9O1xuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zdHlsZXMgPSAoYXBwLnN0eWxlcyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgYXJjaGl0ZWN0LmJ1aWxkID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06YnJvd3NlcmAsXG4gICAgICAgIG9wdGlvbnM6IGJ1aWxkT3B0aW9ucyxcbiAgICAgICAgY29uZmlndXJhdGlvbnM6IF9idWlsZENvbmZpZ3VyYXRpb25zKCksXG4gICAgICB9O1xuXG4gICAgICAvLyBTZXJ2ZSB0YXJnZXRcbiAgICAgIGNvbnN0IHNlcnZlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgLFxuICAgICAgfTtcbiAgICAgIGFyY2hpdGVjdC5zZXJ2ZSA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OmRldi1zZXJ2ZXJgLFxuICAgICAgICBvcHRpb25zOiBzZXJ2ZU9wdGlvbnMsXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zOiBfc2VydmVDb25maWd1cmF0aW9ucygpLFxuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCB0YXJnZXRcbiAgICAgIGNvbnN0IGV4dHJhY3RJMThuT3B0aW9uczogSnNvbk9iamVjdCA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgIH07XG4gICAgICBhcmNoaXRlY3RbJ2V4dHJhY3QtaTE4biddID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZXh0cmFjdC1pMThuYCxcbiAgICAgICAgb3B0aW9uczogZXh0cmFjdEkxOG5PcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qga2FybWFDb25maWcgPSBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYVxuICAgICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnIHx8ICcnXG4gICAgICAgICAgOiAnJztcbiAgICAgICAgLy8gVGVzdCB0YXJnZXRcbiAgICAgIGNvbnN0IHRlc3RPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdCB8fCBkZWZhdWx0cy50ZXN0LFxuICAgICAgICAgIHBvbHlmaWxsczogYXBwUm9vdCArICcvJyArIGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzLFxuICAgICAgICAgIC8vIE1ha2Uga2FybWFDb25maWcgcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgICBrYXJtYUNvbmZpZyxcbiAgICAgICAgfTtcbiAgICAgIGlmIChhcHAudGVzdFRzY29uZmlnKSB7XG4gICAgICAgICAgdGVzdE9wdGlvbnMudHNDb25maWcgPSBhcHBSb290ICsgJy8nICsgYXBwLnRlc3RUc2NvbmZpZztcbiAgICAgICAgfVxuICAgICAgdGVzdE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKF9leHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLnN0eWxlcyA9IChhcHAuc3R5bGVzIHx8IFtdKS5tYXAoX2V4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcChfbWFwQXNzZXRzKTtcblxuICAgICAgaWYgKGthcm1hQ29uZmlnKSB7XG4gICAgICAgIGFyY2hpdGVjdC50ZXN0ID0ge1xuICAgICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTprYXJtYWAsXG4gICAgICAgICAgb3B0aW9uczogdGVzdE9wdGlvbnMsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRzQ29uZmlnczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IGV4Y2x1ZGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcubGludCAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5saW50KSkge1xuICAgICAgICBjb25maWcubGludC5mb3JFYWNoKGxpbnQgPT4ge1xuICAgICAgICAgIHRzQ29uZmlncy5wdXNoKGxpbnQucHJvamVjdCk7XG4gICAgICAgICAgaWYgKGxpbnQuZXhjbHVkZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaW50LmV4Y2x1ZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIGV4Y2x1ZGVzLnB1c2gobGludC5leGNsdWRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxpbnQuZXhjbHVkZS5mb3JFYWNoKGV4ID0+IGV4Y2x1ZGVzLnB1c2goZXgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZW1vdmVEdXBlcyA9IChpdGVtczogc3RyaW5nW10pID0+IGl0ZW1zLnJlZHVjZSgobmV3SXRlbXMsIGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKG5ld0l0ZW1zLmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICAgICAgbmV3SXRlbXMucHVzaChpdGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXdJdGVtcztcbiAgICAgIH0sIDxzdHJpbmdbXT4gW10pO1xuXG4gICAgICAgIC8vIFRzbGludCB0YXJnZXRcbiAgICAgIGNvbnN0IGxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpID09PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3QubGludCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgICBvcHRpb25zOiBsaW50T3B0aW9ucyxcbiAgICAgICAgfTtcblxuICAgICAgY29uc3QgZTJlUHJvamVjdDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcm9vdDogcHJvamVjdC5yb290LFxuICAgICAgICBwcm9qZWN0VHlwZTogJ2FwcGxpY2F0aW9uJyxcbiAgICAgICAgY2xpOiB7fSxcbiAgICAgICAgc2NoZW1hdGljczoge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlMmVBcmNoaXRlY3Q6IEpzb25PYmplY3QgPSB7fTtcblxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm1heC1saW5lLWxlbmd0aFxuICAgICAgY29uc3QgcHJvdHJhY3RvckNvbmZpZyA9IGNvbmZpZyAmJiBjb25maWcuZTJlICYmIGNvbmZpZy5lMmUucHJvdHJhY3RvciAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IuY29uZmlnXG4gICAgICAgID8gY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgZTJlT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgcHJvdHJhY3RvckNvbmZpZzogcHJvdHJhY3RvckNvbmZpZyxcbiAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtuYW1lfTpzZXJ2ZWAsXG4gICAgICB9O1xuICAgICAgY29uc3QgZTJlVGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06cHJvdHJhY3RvcmAsXG4gICAgICAgIG9wdGlvbnM6IGUyZU9wdGlvbnMsXG4gICAgICB9O1xuXG4gICAgICBlMmVBcmNoaXRlY3QuZTJlID0gZTJlVGFyZ2V0O1xuICAgICAgY29uc3QgZTJlTGludE9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHRzQ29uZmlnOiByZW1vdmVEdXBlcyh0c0NvbmZpZ3MpLmZpbHRlcih0ID0+IHQuaW5kZXhPZignZTJlJykgIT09IC0xKSxcbiAgICAgICAgZXhjbHVkZTogcmVtb3ZlRHVwZXMoZXhjbHVkZXMpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZUxpbnRUYXJnZXQ6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTp0c2xpbnRgLFxuICAgICAgICBvcHRpb25zOiBlMmVMaW50T3B0aW9ucyxcbiAgICAgIH07XG4gICAgICBlMmVBcmNoaXRlY3QubGludCA9IGUyZUxpbnRUYXJnZXQ7XG4gICAgICBpZiAocHJvdHJhY3RvckNvbmZpZykge1xuICAgICAgICBlMmVQcm9qZWN0LmFyY2hpdGVjdCA9IGUyZUFyY2hpdGVjdDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHsgbmFtZSwgcHJvamVjdCwgZTJlUHJvamVjdCB9O1xuICAgIH0pXG4gICAgLnJlZHVjZSgocHJvamVjdHMsIG1hcHBlZEFwcCkgPT4ge1xuICAgICAgY29uc3Qge25hbWUsIHByb2plY3QsIGUyZVByb2plY3R9ID0gbWFwcGVkQXBwO1xuICAgICAgcHJvamVjdHNbbmFtZV0gPSBwcm9qZWN0O1xuICAgICAgcHJvamVjdHNbbmFtZSArICctZTJlJ10gPSBlMmVQcm9qZWN0O1xuXG4gICAgICByZXR1cm4gcHJvamVjdHM7XG4gICAgfSwge30gYXMgSnNvbk9iamVjdCk7XG5cbiAgcmV0dXJuIHByb2plY3RNYXA7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBhcHBzID0gY29uZmlnLmFwcHMgfHwgW107XG4gICAgYXBwcy5mb3JFYWNoKChhcHA6IEFwcENvbmZpZywgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgIGNvbnN0IHRzU3BlY0NvbmZpZ1BhdGggPVxuICAgICAgICBqb2luKGFwcC5yb290IGFzIFBhdGgsIGFwcC50ZXN0VHNjb25maWcgfHwgZGVmYXVsdHMudGVzdFRzQ29uZmlnKTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZCh0c1NwZWNDb25maWdQYXRoKTtcbiAgICAgIGlmICghYnVmZmVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzQ2ZnID0gSlNPTi5wYXJzZShidWZmZXIudG9TdHJpbmcoKSk7XG4gICAgICBpZiAoIXRzQ2ZnLmZpbGVzKSB7XG4gICAgICAgIHRzQ2ZnLmZpbGVzID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSB0aGUgc3BlYyB0c2NvbmZpZyBjb250YWlucyB0aGUgcG9seWZpbGxzIGZpbGVcbiAgICAgIGlmICh0c0NmZy5maWxlcy5pbmRleE9mKGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzKSA9PT0gLTEpIHtcbiAgICAgICAgdHNDZmcuZmlsZXMucHVzaChhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscyk7XG4gICAgICAgIGhvc3Qub3ZlcndyaXRlKHRzU3BlY0NvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KHRzQ2ZnLCBudWxsLCAyKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVBhY2thZ2VKc29uKCkge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBwa2dQYXRoID0gJy9wYWNrYWdlLmpzb24nO1xuICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwa2dQYXRoKTtcbiAgICBpZiAoYnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgcmVhZCBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG4gICAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoY29udGVudCk7XG5cbiAgICBpZiAocGtnID09PSBudWxsIHx8IHR5cGVvZiBwa2cgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGtnKSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0Vycm9yIHJlYWRpbmcgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGlmICghcGtnLmRldkRlcGVuZGVuY2llcykge1xuICAgICAgcGtnLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgIH1cblxuICAgIHBrZy5kZXZEZXBlbmRlbmNpZXNbJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJ10gPSBsYXRlc3RWZXJzaW9ucy5EZXZraXRCdWlsZFdlYnBhY2s7XG5cbiAgICBob3N0Lm92ZXJ3cml0ZShwa2dQYXRoLCBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBnZXRDb25maWdQYXRoKGhvc3QpO1xuICAgIGNvbnN0IGNvbmZpZ0J1ZmZlciA9IGhvc3QucmVhZChub3JtYWxpemUoY29uZmlnUGF0aCkpO1xuICAgIGlmIChjb25maWdCdWZmZXIgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kIGNvbmZpZ3VyYXRpb24gZmlsZSAoJHtjb25maWdQYXRofSlgKTtcbiAgICB9XG4gICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShjb25maWdCdWZmZXIudG9TdHJpbmcoKSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWcpLFxuICAgICAgbWlncmF0ZUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIHVwZGF0ZVNwZWNUc0NvbmZpZyhjb25maWcpLFxuICAgICAgdXBkYXRlUGFja2FnZUpzb24oKSxcbiAgICBdKShob3N0LCBjb250ZXh0KTtcbiAgfTtcbn1cbiJdfQ==