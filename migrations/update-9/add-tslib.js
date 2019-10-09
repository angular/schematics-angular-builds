"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependencies_1 = require("../../utility/dependencies");
const latest_versions_1 = require("../../utility/latest-versions");
function addTsLib() {
    return host => {
        dependencies_1.removePackageJsonDependency(host, 'tslib');
        dependencies_1.addPackageJsonDependency(host, {
            name: 'tslib',
            version: latest_versions_1.latestVersions.TsLib,
            type: dependencies_1.NodeDependencyType.Default,
        });
    };
}
exports.addTsLib = addTsLib;
