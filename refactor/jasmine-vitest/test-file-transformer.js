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
const BLANK_LINE_PLACEHOLDER = '// __PRESERVE_BLANK_LINE__';
function preserveBlankLines(content) {
    return content
        .split('\n')
        .map((line) => (line.trim() === '' ? BLANK_LINE_PLACEHOLDER : line))
        .join('\n');
}
function restoreBlankLines(content) {
    const regex = new RegExp(`^\\s*${BLANK_LINE_PLACEHOLDER.replace(/\//g, '\\/')}\\s*$`, 'gm');
    return content.replace(regex, '');
}
/**
 * Transforms a string of Jasmine test code to Vitest test code.
 * This is the main entry point for the transformation.
 * @param content The source code to transform.
 * @param reporter The reporter to track TODOs.
 * @returns The transformed code.
 */
function transformJasmineToVitest(filePath, content, reporter) {
    const contentWithPlaceholders = preserveBlankLines(content);
    const sourceFile = typescript_1.default.createSourceFile(filePath, contentWithPlaceholders, typescript_1.default.ScriptTarget.Latest, true, typescript_1.default.ScriptKind.TS);
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
                    // **Stage 1: High-Level & Context-Sensitive Transformations**
                    // These transformers often wrap or fundamentally change the nature of the call,
                    // so they need to run before more specific matchers.
                    jasmine_matcher_1.transformWithContext,
                    jasmine_matcher_1.transformExpectAsync,
                    jasmine_lifecycle_1.transformFocusedAndSkippedTests,
                    jasmine_lifecycle_1.transformPending,
                    jasmine_lifecycle_1.transformDoneCallback,
                    // **Stage 2: Core Matcher & Spy Transformations**
                    // This is the bulk of the `expect(...)` and `spyOn(...)` conversions.
                    jasmine_matcher_1.transformSyntacticSugarMatchers,
                    jasmine_matcher_1.transformComplexMatchers,
                    jasmine_spy_1.transformSpies,
                    jasmine_spy_1.transformCreateSpyObj,
                    jasmine_spy_1.transformSpyReset,
                    jasmine_spy_1.transformSpyCallInspection,
                    jasmine_matcher_1.transformtoHaveBeenCalledBefore,
                    jasmine_matcher_1.transformToHaveClass,
                    // **Stage 3: Global Functions & Cleanup**
                    // These handle global Jasmine functions and catch-alls for unsupported APIs.
                    jasmine_misc_1.transformTimerMocks,
                    jasmine_misc_1.transformGlobalFunctions,
                    jasmine_misc_1.transformUnsupportedJasmineCalls,
                ];
                for (const transformer of transformations) {
                    transformedNode = transformer(transformedNode, refactorCtx);
                }
            }
            else if (typescript_1.default.isPropertyAccessExpression(transformedNode)) {
                const transformations = [
                    // These transformers handle `jasmine.any()` and other `jasmine.*` properties.
                    jasmine_matcher_1.transformAsymmetricMatchers,
                    jasmine_spy_1.transformSpyCallInspection,
                    jasmine_misc_1.transformUnknownJasmineProperties,
                ];
                for (const transformer of transformations) {
                    transformedNode = transformer(transformedNode, refactorCtx);
                }
            }
            else if (typescript_1.default.isExpressionStatement(transformedNode)) {
                // Statement-level transformers are mutually exclusive. The first one that
                // matches will be applied, and then the visitor will stop for this node.
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
        return (node) => typescript_1.default.visitEachChild(node, visitor, context);
    };
    const result = typescript_1.default.transform(sourceFile, [transformer]);
    if (result.transformed[0] === sourceFile && !reporter.hasTodos) {
        return content;
    }
    const printer = typescript_1.default.createPrinter();
    const transformedContentWithPlaceholders = printer.printFile(result.transformed[0]);
    return restoreBlankLines(transformedContentWithPlaceholders);
}
//# sourceMappingURL=test-file-transformer.js.map