"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_1 = require("@angular-devkit/schematics/tasks");
const dependencies_1 = require("../../utility/dependencies");
const latest_versions_1 = require("../../utility/latest-versions");
function updateBuilders() {
    return (host, context) => {
        let updates = false;
        let current = dependencies_1.getPackageJsonDependency(host, '@angular-devkit/build-angular');
        if (current && current.version !== latest_versions_1.latestVersions.DevkitBuildAngular) {
            updates = true;
            dependencies_1.addPackageJsonDependency(host, {
                type: current.type,
                name: '@angular-devkit/build-angular',
                version: latest_versions_1.latestVersions.DevkitBuildAngular,
                overwrite: true,
            });
        }
        current = dependencies_1.getPackageJsonDependency(host, '@angular-devkit/build-ng-packagr');
        if (current && current.version !== latest_versions_1.latestVersions.DevkitBuildNgPackagr) {
            updates = true;
            dependencies_1.addPackageJsonDependency(host, {
                type: current.type,
                name: '@angular-devkit/build-ng-packagr',
                version: latest_versions_1.latestVersions.DevkitBuildNgPackagr,
                overwrite: true,
            });
        }
        current = dependencies_1.getPackageJsonDependency(host, 'zone.js');
        if (current && current.version !== latest_versions_1.latestVersions.ZoneJs) {
            updates = true;
            dependencies_1.addPackageJsonDependency(host, {
                type: current.type,
                name: 'zone.js',
                version: latest_versions_1.latestVersions.ZoneJs,
                overwrite: true,
            });
        }
        if (updates) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
    };
}
exports.updateBuilders = updateBuilders;
