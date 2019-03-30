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
const codelyzer_5_1 = require("./codelyzer-5");
const drop_es6_polyfills_1 = require("./drop-es6-polyfills");
function default_1() {
    return () => {
        return schematics_1.chain([
            codelyzer_5_1.updateTsLintConfig(),
            codelyzer_5_1.updatePackageJson(),
            drop_es6_polyfills_1.dropES2015Polyfills(),
        ]);
    };
}
exports.default = default_1;
