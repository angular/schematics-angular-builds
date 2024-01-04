"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestVersions = void 0;
exports.latestVersions = {
    // We could have used TypeScripts' `resolveJsonModule` to make the `latestVersion` object typesafe,
    // but ts_library doesn't support JSON inputs.
    ...require('./latest-versions/package.json')['dependencies'],
    // As Angular CLI works with same minor versions of Angular Framework, a tilde match for the current
    Angular: '^17.1.0-next.0',
    DevkitBuildAngular: '^17.1.0-rc.0+sha-1d68685',
    AngularSSR: '^17.1.0-rc.0+sha-1d68685',
};
