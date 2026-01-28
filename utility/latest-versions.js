"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestVersions = void 0;
// We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
// but ts_library doesn't support JSON inputs.
const dependencies = require('./latest-versions/package.json')['dependencies'];
exports.latestVersions = {
    ...dependencies,
    // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
    Angular: '^21.2.0-next.0',
    NgPackagr: '^21.2.0-next.0',
    DevkitBuildAngular: '^21.2.0-next.0+sha-b4a8d19',
    AngularBuild: '^21.2.0-next.0+sha-b4a8d19',
    AngularSSR: '^21.2.0-next.0+sha-b4a8d19',
};
//# sourceMappingURL=latest-versions.js.map