"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
const ivy_libraries_1 = require("./ivy-libraries");
const ngsw_config_1 = require("./ngsw-config");
const remove_tsickle_1 = require("./remove-tsickle");
const update_app_tsconfigs_1 = require("./update-app-tsconfigs");
const update_dependencies_1 = require("./update-dependencies");
const update_server_main_file_1 = require("./update-server-main-file");
const update_workspace_config_1 = require("./update-workspace-config");
function default_1() {
    return () => {
        return schematics_1.chain([
            update_workspace_config_1.updateWorkspaceConfig(),
            ivy_libraries_1.updateLibraries(),
            ngsw_config_1.updateNGSWConfig(),
            update_app_tsconfigs_1.updateApplicationTsConfigs(),
            update_dependencies_1.updateDependencies(),
            update_server_main_file_1.updateServerMainFile(),
            remove_tsickle_1.removeTsickle(),
            (tree, context) => {
                const packageChanges = tree.actions.some(a => a.path.endsWith('/package.json'));
                if (packageChanges) {
                    context.addTask(new tasks_1.NodePackageInstallTask());
                }
            },
        ]);
    };
}
exports.default = default_1;
