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
const jasmine_matcher_1 = require("./transformers/jasmine-matcher");
const jasmine_misc_1 = require("./transformers/jasmine-misc");
const jasmine_spy_1 = require("./transformers/jasmine-spy");
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
                    jasmine_matcher_1.transformWithContext,
                    jasmine_matcher_1.transformExpectAsync,
                    jasmine_matcher_1.transformSyntacticSugarMatchers,
                    jasmine_lifecycle_1.transformFocusedAndSkippedTests,
                    jasmine_matcher_1.transformComplexMatchers,
                    jasmine_spy_1.transformSpies,
                    jasmine_spy_1.transformCreateSpyObj,
                    jasmine_spy_1.transformSpyReset,
                    jasmine_lifecycle_1.transformFocusedAndSkippedTests,
                    jasmine_spy_1.transformSpyCallInspection,
                    jasmine_lifecycle_1.transformPending,
                    jasmine_lifecycle_1.transformDoneCallback,
                    jasmine_matcher_1.transformtoHaveBeenCalledBefore,
                    jasmine_matcher_1.transformToHaveClass,
                    jasmine_misc_1.transformTimerMocks,
                    jasmine_lifecycle_1.transformFocusedAndSkippedTests,
                    jasmine_lifecycle_1.transformPending,
                    jasmine_lifecycle_1.transformDoneCallback,
                    jasmine_misc_1.transformGlobalFunctions,
                    jasmine_misc_1.transformUnsupportedJasmineCalls,
                ];
                for (const transformer of transformations) {
                    transformedNode = transformer(transformedNode, refactorCtx);
                }
            }
            else if (typescript_1.default.isPropertyAccessExpression(transformedNode)) {
                const transformations = [
                    jasmine_matcher_1.transformAsymmetricMatchers,
                    jasmine_spy_1.transformSpyCallInspection,
                    jasmine_misc_1.transformUnknownJasmineProperties,
                ];
                for (const transformer of transformations) {
                    transformedNode = transformer(transformedNode, refactorCtx);
                }
            }
            else if (typescript_1.default.isExpressionStatement(transformedNode)) {
                const statementTransformers = [
                    jasmine_matcher_1.transformCalledOnceWith,
                    jasmine_matcher_1.transformArrayWithExactContents,
                    jasmine_matcher_1.transformExpectNothing,
                    jasmine_misc_1.transformFail,
                    jasmine_misc_1.transformDefaultTimeoutInterval,
                ];
                for (const transformer of statementTransformers) {
                    const result = transformer(transformedNode, refactorCtx);
                    if (result !== transformedNode) {
                        transformedNode = result;
                        break;
                    }
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
    if (result.transformed[0] === sourceFile && !reporter.hasTodos) {
        return content;
    }
    const printer = typescript_1.default.createPrinter();
    return printer.printFile(result.transformed[0]);
}
//# sourceMappingURL=test-file-transformer.js.map