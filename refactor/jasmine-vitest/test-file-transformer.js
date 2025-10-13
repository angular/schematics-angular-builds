"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformJasmineToVitest = transformJasmineToVitest;
const typescript_1 = __importDefault(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const jasmine_lifecycle_1 = require("./transformers/jasmine-lifecycle");
/**
 * Transforms a string of Jasmine test code to Vitest test code.
 * This is the main entry point for the transformation.
 * @param content The source code to transform.
 * @param reporter The reporter to track TODOs.
 * @returns The transformed code.
 */
function transformJasmineToVitest(filePath, content, reporter) {
    const sourceFile = typescript_1.default.createSourceFile(filePath, content, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
    const transformer = (context) => {
        const refactorCtx = {
            sourceFile,
            reporter,
            tsContext: context,
        };
        const visitor = (node) => {
            let transformedNode = node;
            // Transform the node itself based on its type
            if (typescript_1.default.isCallExpression(transformedNode)) {
                const transformations = [
                    jasmine_lifecycle_1.transformFocusedAndSkippedTests,
                    jasmine_lifecycle_1.transformPending,
                    jasmine_lifecycle_1.transformDoneCallback,
                ];
                for (const transformer of transformations) {
                    transformedNode = transformer(transformedNode, refactorCtx);
                }
            }
            // Visit the children of the node to ensure they are transformed
            if (Array.isArray(transformedNode)) {
                return transformedNode.map((node) => typescript_1.default.visitEachChild(node, visitor, context));
            }
            else {
                return typescript_1.default.visitEachChild(transformedNode, visitor, context);
            }
        };
        return (node) => typescript_1.default.visitNode(node, visitor);
    };
    const result = typescript_1.default.transform(sourceFile, [transformer]);
    if (result.transformed[0] === sourceFile) {
        return content;
    }
    const printer = typescript_1.default.createPrinter();
    return printer.printFile(result.transformed[0]);
}
//# sourceMappingURL=test-file-transformer.js.map