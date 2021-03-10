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
        for (const [, target] of workspace_1.allWorkspaceTargets(workspace)) {
            if (!target.builder.startsWith('@angular-devkit/build-angular')) {
                continue;
            }
            for (const [, options] of workspace_1.allTargetOptions(target)) {
                delete options.experimentalRollupPass;
                delete options.lazyModules;
            }
        }
    });
}
exports.default = default_1;
