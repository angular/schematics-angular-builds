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
const json_file_1 = require("../../utility/json-file");
function* visitJsonFiles(directory) {
    for (const path of directory.subfiles) {
        if (!path.endsWith('.json')) {
            continue;
        }
        yield core_1.join(directory.path, path);
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules' || path.startsWith('.')) {
            continue;
        }
        yield* visitJsonFiles(directory.dir(path));
    }
}
function default_1() {
    return tree => {
        for (const path of visitJsonFiles(tree.root)) {
            const content = tree.read(path);
            if (content === null || content === void 0 ? void 0 : content.toString().includes('"emitDecoratorMetadata"')) {
                const json = new json_file_1.JSONFile(tree, path);
                json.remove(['compilerOptions', 'emitDecoratorMetadata']);
            }
        }
    };
}
exports.default = default_1;
