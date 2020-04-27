"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependencies_1 = require("../../utility/dependencies");
const latest_versions_1 = require("../../utility/latest-versions");
function default_1() {
    return (host, context) => {
        const dependenciesToUpdate = {
            'karma': '~5.0.0',
            'protractor': '~5.4.4',
            'ng-packagr': latest_versions_1.latestVersions.ngPackagr,
        };
        for (const [name, version] of Object.entries(dependenciesToUpdate)) {
            const current = dependencies_1.getPackageJsonDependency(host, name);
            if (!current || current.version === version) {
                continue;
            }
            dependencies_1.addPackageJsonDependency(host, {
                type: current.type,
                name,
                version,
                overwrite: true,
            });
        }
        // Check for @angular-devkit/schematics and @angular-devkit/core
        for (const name of ['@angular-devkit/schematics', '@angular-devkit/core']) {
            const current = dependencies_1.getPackageJsonDependency(host, name);
            if (current) {
                context.logger.info(`Package "${name}" found in the workspace package.json. ` +
                    'This package typically does not need to be installed manually. ' +
                    'If it is not being used by project code, it can be removed from the package.json.');
            }
        }
    };
}
exports.default = default_1;
