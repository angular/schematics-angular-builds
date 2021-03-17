"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDependencies = void 0;
const dependencies_1 = require("../../utility/dependencies");
function updateDependencies() {
    return (host) => {
        const dependenciesToUpdate = {
            '@angular/pwa': '^0.803.9',
            '@angular-devkit/build-angular': '~0.803.9',
            '@angular-devkit/build-ng-packagr': '~0.803.9',
            '@angular-devkit/build-webpack': '~0.803.9',
            'zone.js': '~0.10.0',
            tsickle: '^0.37.0',
            'ng-packagr': '^5.0.0',
            'web-animations-js': '^2.3.2',
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
    };
}
exports.updateDependencies = updateDependencies;
