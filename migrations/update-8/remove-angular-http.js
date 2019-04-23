"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_1 = require("@angular-devkit/schematics/tasks");
const dependencies_1 = require("../../utility/dependencies");
exports.removeAngularHttp = () => {
    return (host, context) => {
        dependencies_1.removePackageJsonDependency(host, '@angular/http');
        context.addTask(new tasks_1.NodePackageInstallTask());
        return host;
    };
};
