/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { RefactorReporter } from './utils/refactor-reporter';
/**
 * Transforms a string of Jasmine test code to Vitest test code.
 * This is the main entry point for the transformation.
 * @param content The source code to transform.
 * @param reporter The reporter to track TODOs.
 * @returns The transformed code.
 */
export declare function transformJasmineToVitest(filePath: string, content: string, reporter: RefactorReporter): string;
