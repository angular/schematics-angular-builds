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
                content = content.replace(/@angular\/cli/g, '@angular-devkit/build-webpack');
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
            projects: extractProjectsConfig(oldConfig),
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
function extractProjectsConfig(config) {
    const builderPackage = '@angular-devkit/build-webpack';
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
        const project = {
            root: '',
            projectType: 'application',
            cli: {},
            schematics: {},
        };
        const extraEntryMapper = (extraEntry) => {
            let entry;
            if (typeof extraEntry === 'string') {
                entry = { input: extraEntry };
            }
            else {
                entry = extraEntry;
            }
            entry.input = core_1.join(app.root, entry.input || '');
            return entry;
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
        buildOptions.assets = (app.assets || []).map((asset) => typeof asset === 'string'
            ? { glob: appRoot + '/' + asset }
            : appRoot + '/' + asset);
        buildOptions.styles = (app.styles || []).map(extraEntryMapper);
        buildOptions.scripts = (app.scripts || []).map(extraEntryMapper);
        architect.build = {
            builder: `${builderPackage}:browser`,
            options: buildOptions,
            configurations: {
                production: {
                    optimization: true,
                    outputHashing: 'all',
                    sourceMap: false,
                    extractCss: true,
                    namedChunks: false,
                    aot: true,
                    extractLicenses: true,
                    vendorChunk: false,
                    buildOptimizer: true,
                },
            },
        };
        // Serve target
        const serveOptions = {
            browserTarget: `${name}:build`,
        };
        architect.serve = {
            builder: `${builderPackage}:dev-server`,
            options: serveOptions,
            configurations: {
                production: {
                    browserTarget: `${name}:build`,
                },
            },
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
        testOptions.scripts = (app.scripts || []).map(extraEntryMapper);
        testOptions.styles = (app.styles || []).map(extraEntryMapper);
        testOptions.assets = (app.assets || []).map((asset) => typeof asset === 'string'
            ? { glob: appRoot + '/' + asset }
            : appRoot + '/' + asset);
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
        pkg.devDependencies['@angular-devkit/build-webpack'] = latest_versions_1.latestVersions.DevkitBuildWebpack;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS02L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQXlFO0FBQ3pFLDJEQU1vQztBQUVwQyxtRUFBK0Q7QUFFL0QsTUFBTSxRQUFRLEdBQUc7SUFDZixPQUFPLEVBQUUsS0FBSztJQUNkLEtBQUssRUFBRSxZQUFZO0lBQ25CLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLGNBQWM7SUFDekIsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixJQUFJLEVBQUUsU0FBUztJQUNmLE1BQU0sRUFBRSxPQUFPO0lBQ2YsS0FBSyxFQUFFLGVBQWU7SUFDdEIsVUFBVSxFQUFFLG9CQUFvQjtJQUNoQyxZQUFZLEVBQUUsb0JBQW9CO0NBQ25DLENBQUM7QUFFRix1QkFBdUIsSUFBVTtJQUMvQixJQUFJLFlBQVksR0FBRyxnQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDbEQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBQ0QsWUFBWSxHQUFHLGdCQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsWUFBWSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQsbUNBQW1DLE1BQWlCO0lBQ2xELE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FB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TSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsRUFBRSxDQUFDLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDekIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHNDQUFzQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sQ0FBQyxrQkFBSyxDQUFDO1lBQ1gseUJBQXlCLENBQUMsTUFBTSxDQUFDO1lBQ2pDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQztZQUM1QixrQkFBa0IsQ0FBQyxNQUFNLENBQUM7WUFDMUIsaUJBQWlCLEVBQUU7U0FDcEIsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7QUFDSixDQUFDO0FBaEJELDRCQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IEpzb25PYmplY3QsIFBhdGgsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBBcHBDb25maWcsIENsaUNvbmZpZyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuXG5jb25zdCBkZWZhdWx0cyA9IHtcbiAgYXBwUm9vdDogJ3NyYycsXG4gIGluZGV4OiAnaW5kZXguaHRtbCcsXG4gIG1haW46ICdtYWluLnRzJyxcbiAgcG9seWZpbGxzOiAncG9seWZpbGxzLnRzJyxcbiAgdHNDb25maWc6ICd0c2NvbmZpZy5hcHAuanNvbicsXG4gIHRlc3Q6ICd0ZXN0LnRzJyxcbiAgb3V0RGlyOiAnZGlzdC8nLFxuICBrYXJtYTogJ2thcm1hLmNvbmYuanMnLFxuICBwcm90cmFjdG9yOiAncHJvdHJhY3Rvci5jb25mLmpzJyxcbiAgdGVzdFRzQ29uZmlnOiAndHNjb25maWcuc3BlYy5qc29uJyxcbn07XG5cbmZ1bmN0aW9uIGdldENvbmZpZ1BhdGgodHJlZTogVHJlZSk6IFBhdGgge1xuICBsZXQgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCcuYW5ndWxhci1jbGkuanNvbicpO1xuICBpZiAodHJlZS5leGlzdHMocG9zc2libGVQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVBhdGg7XG4gIH1cbiAgcG9zc2libGVQYXRoID0gbm9ybWFsaXplKCdhbmd1bGFyLWNsaS5qc29uJyk7XG4gIGlmICh0cmVlLmV4aXN0cyhwb3NzaWJsZVBhdGgpKSB7XG4gICAgcmV0dXJuIHBvc3NpYmxlUGF0aDtcbiAgfVxuXG4gIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUnKTtcbn1cblxuZnVuY3Rpb24gbWlncmF0ZUthcm1hQ29uZmlndXJhdGlvbihjb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyBrYXJtYSBjb25maWd1cmF0aW9uYCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGthcm1hUGF0aCA9IGNvbmZpZyAmJiBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYSAmJiBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgPyBjb25maWcudGVzdC5rYXJtYS5jb25maWdcbiAgICAgICAgOiBkZWZhdWx0cy5rYXJtYTtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChrYXJtYVBhdGgpO1xuICAgICAgaWYgKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICBsZXQgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKCAvQGFuZ3VsYXJcXC9jbGkvZywgJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC13ZWJwYWNrJyk7XG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJ3JlcG9ydHMnLFxuICAgICAgICAgIGBkaXI6IHJlcXVpcmUoJ3BhdGgnKS5qb2luKF9fZGlybmFtZSwgJ2NvdmVyYWdlJyksIHJlcG9ydHNgKTtcbiAgICAgICAgaG9zdC5vdmVyd3JpdGUoa2FybWFQYXRoLCBjb250ZW50KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7IH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBtaWdyYXRlQ29uZmlndXJhdGlvbihvbGRDb25maWc6IENsaUNvbmZpZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBvbGRDb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdQYXRoID0gbm9ybWFsaXplKCdhbmd1bGFyLmpzb24nKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBVcGRhdGluZyBjb25maWd1cmF0aW9uYCk7XG4gICAgY29uc3QgY29uZmlnOiBKc29uT2JqZWN0ID0ge1xuICAgICAgdmVyc2lvbjogMSxcbiAgICAgIG5ld1Byb2plY3RSb290OiAncHJvamVjdHMnLFxuICAgICAgcHJvamVjdHM6IGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhvbGRDb25maWcpLFxuICAgIH07XG4gICAgY29uc3QgY2xpQ29uZmlnID0gZXh0cmFjdENsaUNvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChjbGlDb25maWcgIT09IG51bGwpIHtcbiAgICAgIGNvbmZpZy5jbGkgPSBjbGlDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IHNjaGVtYXRpY3NDb25maWcgPSBleHRyYWN0U2NoZW1hdGljc0NvbmZpZyhvbGRDb25maWcpO1xuICAgIGlmIChzY2hlbWF0aWNzQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuc2NoZW1hdGljcyA9IHNjaGVtYXRpY3NDb25maWc7XG4gICAgfVxuICAgIGNvbnN0IGFyY2hpdGVjdENvbmZpZyA9IGV4dHJhY3RBcmNoaXRlY3RDb25maWcob2xkQ29uZmlnKTtcbiAgICBpZiAoYXJjaGl0ZWN0Q29uZmlnICE9PSBudWxsKSB7XG4gICAgICBjb25maWcuYXJjaGl0ZWN0ID0gYXJjaGl0ZWN0Q29uZmlnO1xuICAgIH1cblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYFJlbW92aW5nIG9sZCBjb25maWcgZmlsZSAoJHtvbGRDb25maWdQYXRofSlgKTtcbiAgICBob3N0LmRlbGV0ZShvbGRDb25maWdQYXRoKTtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBXcml0aW5nIGNvbmZpZyBmaWxlICgke2NvbmZpZ1BhdGh9KWApO1xuICAgIGhvc3QuY3JlYXRlKGNvbmZpZ1BhdGgsIEpTT04uc3RyaW5naWZ5KGNvbmZpZywgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RDbGlDb25maWcoX2NvbmZpZzogQ2xpQ29uZmlnKTogSnNvbk9iamVjdCB8IG51bGwge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFNjaGVtYXRpY3NDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBKc29uT2JqZWN0IHwgbnVsbCB7XG4gIGxldCBjb2xsZWN0aW9uTmFtZSA9ICdAc2NoZW1hdGljcy9hbmd1bGFyJztcbiAgaWYgKCFjb25maWcgfHwgIWNvbmZpZy5kZWZhdWx0cykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIGNvbnN0IGNvbmZpZ0RlZmF1bHRzID0gY29uZmlnLmRlZmF1bHRzO1xuICBpZiAoY29uZmlnLmRlZmF1bHRzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzICYmIGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb24pIHtcbiAgICBjb2xsZWN0aW9uTmFtZSA9IGNvbmZpZy5kZWZhdWx0cy5zY2hlbWF0aWNzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogRm9yIGVhY2ggc2NoZW1hdGljXG4gICAqICAtIGdldCB0aGUgY29uZmlnXG4gICAqICAtIGZpbHRlciBvbmUncyB3aXRob3V0IGNvbmZpZ1xuICAgKiAgLSBjb21iaW5lIHRoZW0gaW50byBhbiBvYmplY3RcbiAgICovXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgY29uc3Qgc2NoZW1hdGljQ29uZmlnczogYW55ID0gWydjbGFzcycsICdjb21wb25lbnQnLCAnZGlyZWN0aXZlJywgJ2d1YXJkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdpbnRlcmZhY2UnLCAnbW9kdWxlJywgJ3BpcGUnLCAnc2VydmljZSddXG4gICAgLm1hcChzY2hlbWF0aWNOYW1lID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcbiAgICAgIGNvbnN0IHNjaGVtYXRpY0RlZmF1bHRzOiBKc29uT2JqZWN0ID0gKGNvbmZpZy5kZWZhdWx0cyBhcyBhbnkpW3NjaGVtYXRpY05hbWVdIHx8IG51bGw7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjaGVtYXRpY05hbWUsXG4gICAgICAgIGNvbmZpZzogc2NoZW1hdGljRGVmYXVsdHMsXG4gICAgICB9O1xuICAgIH0pXG4gICAgLmZpbHRlcihzY2hlbWF0aWMgPT4gc2NoZW1hdGljLmNvbmZpZyAhPT0gbnVsbClcbiAgICAucmVkdWNlKChhbGw6IEpzb25PYmplY3QsIHNjaGVtYXRpYykgPT4ge1xuICAgICAgYWxsW2NvbGxlY3Rpb25OYW1lICsgJzonICsgc2NoZW1hdGljLnNjaGVtYXRpY05hbWVdID0gc2NoZW1hdGljLmNvbmZpZztcblxuICAgICAgcmV0dXJuIGFsbDtcbiAgICB9LCB7fSk7XG5cbiAgY29uc3QgY29tcG9uZW50VXBkYXRlOiBKc29uT2JqZWN0ID0ge307XG4gIGNvbXBvbmVudFVwZGF0ZS5wcmVmaXggPSAnJztcblxuICBjb25zdCBjb21wb25lbnRLZXkgPSBjb2xsZWN0aW9uTmFtZSArICc6Y29tcG9uZW50JztcbiAgY29uc3QgZGlyZWN0aXZlS2V5ID0gY29sbGVjdGlvbk5hbWUgKyAnOmRpcmVjdGl2ZSc7XG4gIGlmICghc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldKSB7XG4gICAgc2NoZW1hdGljQ29uZmlnc1tjb21wb25lbnRLZXldID0ge307XG4gIH1cbiAgaWYgKCFzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2RpcmVjdGl2ZUtleV0gPSB7fTtcbiAgfVxuICBpZiAoY29uZmlnLmFwcHMgJiYgY29uZmlnLmFwcHNbMF0pIHtcbiAgICBzY2hlbWF0aWNDb25maWdzW2NvbXBvbmVudEtleV0ucHJlZml4ID0gY29uZmlnLmFwcHNbMF0ucHJlZml4O1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbZGlyZWN0aXZlS2V5XS5wcmVmaXggPSBjb25maWcuYXBwc1swXS5wcmVmaXg7XG4gIH1cbiAgaWYgKGNvbmZpZy5kZWZhdWx0cykge1xuICAgIHNjaGVtYXRpY0NvbmZpZ3NbY29tcG9uZW50S2V5XS5zdHlsZWV4dCA9IGNvbmZpZy5kZWZhdWx0cy5zdHlsZUV4dDtcbiAgfVxuXG4gIHJldHVybiBzY2hlbWF0aWNDb25maWdzO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0QXJjaGl0ZWN0Q29uZmlnKF9jb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3QgfCBudWxsIHtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RQcm9qZWN0c0NvbmZpZyhjb25maWc6IENsaUNvbmZpZyk6IEpzb25PYmplY3Qge1xuICBjb25zdCBidWlsZGVyUGFja2FnZSA9ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjayc7XG4gIGxldCBkZWZhdWx0QXBwTmFtZVByZWZpeCA9ICdhcHAnO1xuICBpZiAoY29uZmlnLnByb2plY3QgJiYgY29uZmlnLnByb2plY3QubmFtZSkge1xuICAgIGRlZmF1bHRBcHBOYW1lUHJlZml4ID0gY29uZmlnLnByb2plY3QubmFtZTtcbiAgfVxuXG4gIGNvbnN0IGFwcHMgPSBjb25maWcuYXBwcyB8fCBbXTtcbiAgLy8gY29udmVydCB0aGUgYXBwcyB0byBwcm9qZWN0c1xuICBjb25zdCBwcm9qZWN0TWFwID0gYXBwc1xuICAgIC5tYXAoKGFwcDogQXBwQ29uZmlnLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgZGVmYXVsdEFwcE5hbWUgPSBpZHggPT09IDAgPyBkZWZhdWx0QXBwTmFtZVByZWZpeCA6IGAke2RlZmF1bHRBcHBOYW1lUHJlZml4fSR7aWR4fWA7XG4gICAgICBjb25zdCBuYW1lID0gYXBwLm5hbWUgfHwgZGVmYXVsdEFwcE5hbWU7XG4gICAgICBjb25zdCBvdXREaXIgPSBhcHAub3V0RGlyIHx8IGRlZmF1bHRzLm91dERpcjtcbiAgICAgIGNvbnN0IGFwcFJvb3QgPSBhcHAucm9vdCB8fCBkZWZhdWx0cy5hcHBSb290O1xuXG4gICAgICBjb25zdCBwcm9qZWN0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICByb290OiAnJyxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICAgIGNsaToge30sXG4gICAgICAgIHNjaGVtYXRpY3M6IHt9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXh0cmFFbnRyeU1hcHBlciA9IChleHRyYUVudHJ5OiBzdHJpbmcgfCBKc29uT2JqZWN0KSA9PiB7XG4gICAgICAgIGxldCBlbnRyeTogSnNvbk9iamVjdDtcbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYUVudHJ5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGVudHJ5ID0geyBpbnB1dDogZXh0cmFFbnRyeSB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudHJ5ID0gZXh0cmFFbnRyeTtcbiAgICAgICAgfVxuICAgICAgICBlbnRyeS5pbnB1dCA9IGpvaW4oYXBwLnJvb3QgYXMgUGF0aCwgPHN0cmluZz4gZW50cnkuaW5wdXQgfHwgJycpO1xuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFyY2hpdGVjdDogSnNvbk9iamVjdCA9IHt9O1xuICAgICAgcHJvamVjdC5hcmNoaXRlY3QgPSBhcmNoaXRlY3Q7XG5cbiAgICAgICAgLy8gQnJvd3NlciB0YXJnZXRcbiAgICAgIGNvbnN0IGJ1aWxkT3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgLy8gTWFrZSBvdXRwdXRQYXRoIHJlbGF0aXZlIHRvIHJvb3QuXG4gICAgICAgIG91dHB1dFBhdGg6IG91dERpcixcbiAgICAgICAgaW5kZXg6IGFwcFJvb3QgKyAnLycgKyBhcHAuaW5kZXggfHwgZGVmYXVsdHMuaW5kZXgsXG4gICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAubWFpbiB8fCBkZWZhdWx0cy5tYWluLFxuICAgICAgICBwb2x5ZmlsbHM6IGFwcFJvb3QgKyAnLycgKyBhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscyxcbiAgICAgICAgdHNDb25maWc6IGFwcFJvb3QgKyAnLycgKyBhcHAudHNjb25maWcgfHwgZGVmYXVsdHMudHNDb25maWcsXG4gICAgICB9O1xuXG4gICAgICBidWlsZE9wdGlvbnMuYXNzZXRzID0gKGFwcC5hc3NldHMgfHwgW10pLm1hcCgoYXNzZXQ6IHN0cmluZyB8IEpzb25PYmplY3QpID0+XG4gICAgICAgIHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZydcbiAgICAgICAgICA/IHsgZ2xvYjogYXBwUm9vdCArICcvJyArIGFzc2V0IH1cbiAgICAgICAgICA6IGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG4gICAgICBidWlsZE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChleHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIGJ1aWxkT3B0aW9ucy5zY3JpcHRzID0gKGFwcC5zY3JpcHRzIHx8IFtdKS5tYXAoZXh0cmFFbnRyeU1hcHBlcik7XG4gICAgICBhcmNoaXRlY3QuYnVpbGQgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpicm93c2VyYCxcbiAgICAgICAgb3B0aW9uczogYnVpbGRPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIG9wdGltaXphdGlvbjogdHJ1ZSxcbiAgICAgICAgICAgIG91dHB1dEhhc2hpbmc6ICdhbGwnLFxuICAgICAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcbiAgICAgICAgICAgIGV4dHJhY3RDc3M6IHRydWUsXG4gICAgICAgICAgICBuYW1lZENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBhb3Q6IHRydWUsXG4gICAgICAgICAgICBleHRyYWN0TGljZW5zZXM6IHRydWUsXG4gICAgICAgICAgICB2ZW5kb3JDaHVuazogZmFsc2UsXG4gICAgICAgICAgICBidWlsZE9wdGltaXplcjogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgLy8gU2VydmUgdGFyZ2V0XG4gICAgICBjb25zdCBzZXJ2ZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCxcbiAgICAgIH07XG4gICAgICBhcmNoaXRlY3Quc2VydmUgPSB7XG4gICAgICAgIGJ1aWxkZXI6IGAke2J1aWxkZXJQYWNrYWdlfTpkZXYtc2VydmVyYCxcbiAgICAgICAgb3B0aW9uczogc2VydmVPcHRpb25zLFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke25hbWV9OmJ1aWxkYCxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCB0YXJnZXRcbiAgICAgIGNvbnN0IGV4dHJhY3RJMThuT3B0aW9uczogSnNvbk9iamVjdCA9IHsgYnJvd3NlclRhcmdldDogYCR7bmFtZX06YnVpbGRgIH07XG4gICAgICBhcmNoaXRlY3RbJ2V4dHJhY3QtaTE4biddID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06ZXh0cmFjdC1pMThuYCxcbiAgICAgICAgb3B0aW9uczogZXh0cmFjdEkxOG5PcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qga2FybWFDb25maWcgPSBjb25maWcudGVzdCAmJiBjb25maWcudGVzdC5rYXJtYVxuICAgICAgICAgID8gY29uZmlnLnRlc3Qua2FybWEuY29uZmlnIHx8ICcnXG4gICAgICAgICAgOiAnJztcbiAgICAgICAgLy8gVGVzdCB0YXJnZXRcbiAgICAgIGNvbnN0IHRlc3RPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICAgIG1haW46IGFwcFJvb3QgKyAnLycgKyBhcHAudGVzdCB8fCBkZWZhdWx0cy50ZXN0LFxuICAgICAgICAgIHBvbHlmaWxsczogYXBwUm9vdCArICcvJyArIGFwcC5wb2x5ZmlsbHMgfHwgZGVmYXVsdHMucG9seWZpbGxzLFxuICAgICAgICAgIC8vIE1ha2Uga2FybWFDb25maWcgcmVsYXRpdmUgdG8gcm9vdC5cbiAgICAgICAgICBrYXJtYUNvbmZpZyxcbiAgICAgICAgfTtcbiAgICAgIGlmIChhcHAudGVzdFRzY29uZmlnKSB7XG4gICAgICAgICAgdGVzdE9wdGlvbnMudHNDb25maWcgPSBhcHBSb290ICsgJy8nICsgYXBwLnRlc3RUc2NvbmZpZztcbiAgICAgICAgfVxuICAgICAgdGVzdE9wdGlvbnMuc2NyaXB0cyA9IChhcHAuc2NyaXB0cyB8fCBbXSkubWFwKGV4dHJhRW50cnlNYXBwZXIpO1xuICAgICAgdGVzdE9wdGlvbnMuc3R5bGVzID0gKGFwcC5zdHlsZXMgfHwgW10pLm1hcChleHRyYUVudHJ5TWFwcGVyKTtcbiAgICAgIHRlc3RPcHRpb25zLmFzc2V0cyA9IChhcHAuYXNzZXRzIHx8IFtdKS5tYXAoKGFzc2V0OiBzdHJpbmcgfCBKc29uT2JqZWN0KSA9PlxuICAgICAgICAgIHR5cGVvZiBhc3NldCA9PT0gJ3N0cmluZydcbiAgICAgICAgICA/IHsgZ2xvYjogYXBwUm9vdCArICcvJyArIGFzc2V0IH1cbiAgICAgICAgICA6IGFwcFJvb3QgKyAnLycgKyBhc3NldCk7XG5cbiAgICAgIGlmIChrYXJtYUNvbmZpZykge1xuICAgICAgICBhcmNoaXRlY3QudGVzdCA9IHtcbiAgICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06a2FybWFgLFxuICAgICAgICAgIG9wdGlvbnM6IHRlc3RPcHRpb25zLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0c0NvbmZpZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCBleGNsdWRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmxpbnQgJiYgQXJyYXkuaXNBcnJheShjb25maWcubGludCkpIHtcbiAgICAgICAgY29uZmlnLmxpbnQuZm9yRWFjaChsaW50ID0+IHtcbiAgICAgICAgICB0c0NvbmZpZ3MucHVzaChsaW50LnByb2plY3QpO1xuICAgICAgICAgIGlmIChsaW50LmV4Y2x1ZGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGludC5leGNsdWRlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBleGNsdWRlcy5wdXNoKGxpbnQuZXhjbHVkZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsaW50LmV4Y2x1ZGUuZm9yRWFjaChleCA9PiBleGNsdWRlcy5wdXNoKGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVtb3ZlRHVwZXMgPSAoaXRlbXM6IHN0cmluZ1tdKSA9PiBpdGVtcy5yZWR1Y2UoKG5ld0l0ZW1zLCBpdGVtKSA9PiB7XG4gICAgICAgIGlmIChuZXdJdGVtcy5pbmRleE9mKGl0ZW0pID09PSAtMSkge1xuICAgICAgICAgIG5ld0l0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3SXRlbXM7XG4gICAgICB9LCA8c3RyaW5nW10+IFtdKTtcblxuICAgICAgICAvLyBUc2xpbnQgdGFyZ2V0XG4gICAgICBjb25zdCBsaW50T3B0aW9uczogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgdHNDb25maWc6IHJlbW92ZUR1cGVzKHRzQ29uZmlncykuZmlsdGVyKHQgPT4gdC5pbmRleE9mKCdlMmUnKSA9PT0gLTEpLFxuICAgICAgICBleGNsdWRlOiByZW1vdmVEdXBlcyhleGNsdWRlcyksXG4gICAgICB9O1xuICAgICAgYXJjaGl0ZWN0LmxpbnQgPSB7XG4gICAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnRzbGludGAsXG4gICAgICAgICAgb3B0aW9uczogbGludE9wdGlvbnMsXG4gICAgICAgIH07XG5cbiAgICAgIGNvbnN0IGUyZVByb2plY3Q6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHJvb3Q6IHByb2plY3Qucm9vdCxcbiAgICAgICAgcHJvamVjdFR5cGU6ICdhcHBsaWNhdGlvbicsXG4gICAgICAgIGNsaToge30sXG4gICAgICAgIHNjaGVtYXRpY3M6IHt9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZTJlQXJjaGl0ZWN0OiBKc29uT2JqZWN0ID0ge307XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTptYXgtbGluZS1sZW5ndGhcbiAgICAgIGNvbnN0IHByb3RyYWN0b3JDb25maWcgPSBjb25maWcgJiYgY29uZmlnLmUyZSAmJiBjb25maWcuZTJlLnByb3RyYWN0b3IgJiYgY29uZmlnLmUyZS5wcm90cmFjdG9yLmNvbmZpZ1xuICAgICAgICA/IGNvbmZpZy5lMmUucHJvdHJhY3Rvci5jb25maWdcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGUyZU9wdGlvbnM6IEpzb25PYmplY3QgPSB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IHByb3RyYWN0b3JDb25maWcsXG4gICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7bmFtZX06c2VydmVgLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGUyZVRhcmdldDogSnNvbk9iamVjdCA9IHtcbiAgICAgICAgYnVpbGRlcjogYCR7YnVpbGRlclBhY2thZ2V9OnByb3RyYWN0b3JgLFxuICAgICAgICBvcHRpb25zOiBlMmVPcHRpb25zLFxuICAgICAgfTtcblxuICAgICAgZTJlQXJjaGl0ZWN0LmUyZSA9IGUyZVRhcmdldDtcbiAgICAgIGNvbnN0IGUyZUxpbnRPcHRpb25zOiBKc29uT2JqZWN0ID0ge1xuICAgICAgICB0c0NvbmZpZzogcmVtb3ZlRHVwZXModHNDb25maWdzKS5maWx0ZXIodCA9PiB0LmluZGV4T2YoJ2UyZScpICE9PSAtMSksXG4gICAgICAgIGV4Y2x1ZGU6IHJlbW92ZUR1cGVzKGV4Y2x1ZGVzKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBlMmVMaW50VGFyZ2V0OiBKc29uT2JqZWN0ID0ge1xuICAgICAgICBidWlsZGVyOiBgJHtidWlsZGVyUGFja2FnZX06dHNsaW50YCxcbiAgICAgICAgb3B0aW9uczogZTJlTGludE9wdGlvbnMsXG4gICAgICB9O1xuICAgICAgZTJlQXJjaGl0ZWN0LmxpbnQgPSBlMmVMaW50VGFyZ2V0O1xuICAgICAgaWYgKHByb3RyYWN0b3JDb25maWcpIHtcbiAgICAgICAgZTJlUHJvamVjdC5hcmNoaXRlY3QgPSBlMmVBcmNoaXRlY3Q7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7IG5hbWUsIHByb2plY3QsIGUyZVByb2plY3QgfTtcbiAgICB9KVxuICAgIC5yZWR1Y2UoKHByb2plY3RzLCBtYXBwZWRBcHApID0+IHtcbiAgICAgIGNvbnN0IHtuYW1lLCBwcm9qZWN0LCBlMmVQcm9qZWN0fSA9IG1hcHBlZEFwcDtcbiAgICAgIHByb2plY3RzW25hbWVdID0gcHJvamVjdDtcbiAgICAgIHByb2plY3RzW25hbWUgKyAnLWUyZSddID0gZTJlUHJvamVjdDtcblxuICAgICAgcmV0dXJuIHByb2plY3RzO1xuICAgIH0sIHt9IGFzIEpzb25PYmplY3QpO1xuXG4gIHJldHVybiBwcm9qZWN0TWFwO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnOiBDbGlDb25maWcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgYXBwcyA9IGNvbmZpZy5hcHBzIHx8IFtdO1xuICAgIGFwcHMuZm9yRWFjaCgoYXBwOiBBcHBDb25maWcsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICBjb25zdCB0c1NwZWNDb25maWdQYXRoID1cbiAgICAgICAgam9pbihhcHAucm9vdCBhcyBQYXRoLCBhcHAudGVzdFRzY29uZmlnIHx8IGRlZmF1bHRzLnRlc3RUc0NvbmZpZyk7XG4gICAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodHNTcGVjQ29uZmlnUGF0aCk7XG4gICAgICBpZiAoIWJ1ZmZlcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB0c0NmZyA9IEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpO1xuICAgICAgaWYgKCF0c0NmZy5maWxlcykge1xuICAgICAgICB0c0NmZy5maWxlcyA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBFbnN1cmUgdGhlIHNwZWMgdHNjb25maWcgY29udGFpbnMgdGhlIHBvbHlmaWxscyBmaWxlXG4gICAgICBpZiAodHNDZmcuZmlsZXMuaW5kZXhPZihhcHAucG9seWZpbGxzIHx8IGRlZmF1bHRzLnBvbHlmaWxscykgPT09IC0xKSB7XG4gICAgICAgIHRzQ2ZnLmZpbGVzLnB1c2goYXBwLnBvbHlmaWxscyB8fCBkZWZhdWx0cy5wb2x5ZmlsbHMpO1xuICAgICAgICBob3N0Lm92ZXJ3cml0ZSh0c1NwZWNDb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeSh0c0NmZywgbnVsbCwgMikpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVQYWNrYWdlSnNvbigpIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgcGtnUGF0aCA9ICcvcGFja2FnZS5qc29uJztcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGtnUGF0aCk7XG4gICAgaWYgKGJ1ZmZlciA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IHJlYWQgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuXG4gICAgaWYgKHBrZyA9PT0gbnVsbCB8fCB0eXBlb2YgcGtnICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KHBrZykpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdFcnJvciByZWFkaW5nIHBhY2thZ2UuanNvbicpO1xuICAgIH1cbiAgICBpZiAoIXBrZy5kZXZEZXBlbmRlbmNpZXMpIHtcbiAgICAgIHBrZy5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBwa2cuZGV2RGVwZW5kZW5jaWVzWydAYW5ndWxhci1kZXZraXQvYnVpbGQtd2VicGFjayddID0gbGF0ZXN0VmVyc2lvbnMuRGV2a2l0QnVpbGRXZWJwYWNrO1xuXG4gICAgaG9zdC5vdmVyd3JpdGUocGtnUGF0aCwgSlNPTi5zdHJpbmdpZnkocGtnLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBjb25maWdQYXRoID0gZ2V0Q29uZmlnUGF0aChob3N0KTtcbiAgICBjb25zdCBjb25maWdCdWZmZXIgPSBob3N0LnJlYWQobm9ybWFsaXplKGNvbmZpZ1BhdGgpKTtcbiAgICBpZiAoY29uZmlnQnVmZmVyID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCBjb25maWd1cmF0aW9uIGZpbGUgKCR7Y29uZmlnUGF0aH0pYCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnQnVmZmVyLnRvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1pZ3JhdGVLYXJtYUNvbmZpZ3VyYXRpb24oY29uZmlnKSxcbiAgICAgIG1pZ3JhdGVDb25maWd1cmF0aW9uKGNvbmZpZyksXG4gICAgICB1cGRhdGVTcGVjVHNDb25maWcoY29uZmlnKSxcbiAgICAgIHVwZGF0ZVBhY2thZ2VKc29uKCksXG4gICAgXSkoaG9zdCwgY29udGV4dCk7XG4gIH07XG59XG4iXX0=