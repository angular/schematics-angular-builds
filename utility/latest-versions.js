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
    DevkitBuildAngular: '^21.2.0-next.2+sha-9c5901e',
    AngularBuild: '^21.2.0-next.2+sha-9c5901e',
    AngularSSR: '^21.2.0-next.2+sha-9c5901e',
};
//# sourceMappingURL=latest-versions.js.map