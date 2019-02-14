/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, Tree } from '@angular-devkit/schematics';
export declare function readJsonInTree<T>(host: Tree, path: string): T;
export declare function serializeJson<T>(json: T): string;
export declare function updateJsonInTree<T, O = T>(path: string, callback: (json: T) => O): Rule;
