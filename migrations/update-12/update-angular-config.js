"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const workspace_1 = require("../../utility/workspace");
function default_1() {
    return workspace_1.updateWorkspace(workspace => {
        const optionsToRemove = {
            experimentalRollupPass: undefined,
        };
        for (const [, project] of workspace.projects) {
            for (const [, target] of project.targets) {
                // Only interested in Angular Devkit builders
                if (!(target === null || target === void 0 ? void 0 : target.builder.startsWith('@angular-devkit/build-angular'))) {
                    continue;
                }
                // Check options
                if (target.options) {
                    target.options = {
                        ...optionsToRemove,
                    };
                }
                // Go through each configuration entry
                if (!target.configurations) {
                    continue;
                }
                for (const configurationName of Object.keys(target.configurations)) {
                    target.configurations[configurationName] = {
                        ...optionsToRemove,
                    };
                }
            }
        }
    });
}
exports.default = default_1;
