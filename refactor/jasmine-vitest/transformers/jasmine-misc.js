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
exports.transformTimerMocks = transformTimerMocks;
exports.transformFail = transformFail;
exports.transformDefaultTimeoutInterval = transformDefaultTimeoutInterval;
exports.transformGlobalFunctions = transformGlobalFunctions;
exports.transformUnsupportedJasmineCalls = transformUnsupportedJasmineCalls;
exports.transformUnknownJasmineProperties = transformUnknownJasmineProperties;
/**
 * @fileoverview This file contains transformers for miscellaneous Jasmine APIs that don't
 * fit into other categories. This includes timer mocks (`jasmine.clock`), the `fail()`
 * function, and configuration settings like `jasmine.DEFAULT_TIMEOUT_INTERVAL`. It also
 * includes logic to identify and add TODO comments for unsupported Jasmine features.
 */
const typescript_1 = __importDefault(require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_helpers_1 = require("../utils/ast-helpers");
const ast_validation_1 = require("../utils/ast-validation");
const comment_helpers_1 = require("../utils/comment-helpers");
function transformTimerMocks(node, { sourceFile, reporter }) {
    if (!typescript_1.default.isCallExpression(node) ||
        !typescript_1.default.isPropertyAccessExpression(node.expression) ||
        !typescript_1.default.isIdentifier(node.expression.name)) {
        return node;
    }
    const pae = node.expression;
    const clockCall = pae.expression;
    if (!(0, ast_validation_1.isJasmineCallExpression)(clockCall, 'clock')) {
        return node;
    }
    let newMethodName;
    switch (pae.name.text) {
        case 'install':
            newMethodName = 'useFakeTimers';
            break;
        case 'tick':
            newMethodName = 'advanceTimersByTime';
            break;
        case 'uninstall':
            newMethodName = 'useRealTimers';
            break;
        case 'mockDate':
            newMethodName = 'setSystemTime';
            break;
    }
    if (newMethodName) {
        reporter.reportTransformation(sourceFile, node, `Transformed \`jasmine.clock().${pae.name.text}\` to \`vi.${newMethodName}\`.`);
        const newArgs = newMethodName === 'useFakeTimers' ? [] : node.arguments;
        return (0, ast_helpers_1.createViCallExpression)(newMethodName, newArgs);
    }
    return node;
}
function transformFail(node, { sourceFile, reporter }) {
    if (typescript_1.default.isExpressionStatement(node) &&
        typescript_1.default.isCallExpression(node.expression) &&
        typescript_1.default.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'fail') {
        reporter.reportTransformation(sourceFile, node, 'Transformed `fail()` to `throw new Error()`.');
        const reason = node.expression.arguments[0];
        return typescript_1.default.factory.createThrowStatement(typescript_1.default.factory.createNewExpression(typescript_1.default.factory.createIdentifier('Error'), undefined, reason ? [reason] : []));
    }
    return node;
}
function transformDefaultTimeoutInterval(node, { sourceFile, reporter }) {
    if (typescript_1.default.isExpressionStatement(node) &&
        typescript_1.default.isBinaryExpression(node.expression) &&
        node.expression.operatorToken.kind === typescript_1.default.SyntaxKind.EqualsToken) {
        const assignment = node.expression;
        if (typescript_1.default.isPropertyAccessExpression(assignment.left) &&
            typescript_1.default.isIdentifier(assignment.left.expression) &&
            assignment.left.expression.text === 'jasmine' &&
            assignment.left.name.text === 'DEFAULT_TIMEOUT_INTERVAL') {
            reporter.reportTransformation(sourceFile, node, 'Transformed `jasmine.DEFAULT_TIMEOUT_INTERVAL` to `vi.setConfig()`.');
            const timeoutValue = assignment.right;
            const setConfigCall = (0, ast_helpers_1.createViCallExpression)('setConfig', [
                typescript_1.default.factory.createObjectLiteralExpression([typescript_1.default.factory.createPropertyAssignment('testTimeout', timeoutValue)], false),
            ]);
            return typescript_1.default.factory.createExpressionStatement(setConfigCall);
        }
    }
    return node;
}
function transformGlobalFunctions(node, { sourceFile, reporter }) {
    if (typescript_1.default.isCallExpression(node) &&
        typescript_1.default.isIdentifier(node.expression) &&
        (node.expression.text === 'setSpecProperty' || node.expression.text === 'setSuiteProperty')) {
        const functionName = node.expression.text;
        reporter.reportTransformation(sourceFile, node, `Found unsupported global function \`${functionName}\`.`);
        reporter.recordTodo(functionName);
        (0, comment_helpers_1.addTodoComment)(node, `Unsupported global function \`${functionName}\` found. This function is used for custom reporters in Jasmine ` +
            'and has no direct equivalent in Vitest.');
    }
    return node;
}
const JASMINE_UNSUPPORTED_CALLS = new Map([
    [
        'addMatchers',
        'jasmine.addMatchers is not supported. Please manually migrate to expect.extend().',
    ],
    [
        'addCustomEqualityTester',
        'jasmine.addCustomEqualityTester is not supported. Please manually migrate to expect.addEqualityTesters().',
    ],
    [
        'mapContaining',
        'jasmine.mapContaining is not supported. Vitest does not have a built-in matcher for Maps.' +
            ' Please manually assert the contents of the Map.',
    ],
    [
        'setContaining',
        'jasmine.setContaining is not supported. Vitest does not have a built-in matcher for Sets.' +
            ' Please manually assert the contents of the Set.',
    ],
]);
function transformUnsupportedJasmineCalls(node, { sourceFile, reporter }) {
    const methodName = (0, ast_validation_1.getJasmineMethodName)(node);
    if (!methodName) {
        return node;
    }
    const message = JASMINE_UNSUPPORTED_CALLS.get(methodName);
    if (message) {
        reporter.reportTransformation(sourceFile, node, `Found unsupported call \`jasmine.${methodName}\`.`);
        reporter.recordTodo(methodName);
        (0, comment_helpers_1.addTodoComment)(node, message);
    }
    return node;
}
// If any additional properties are added to transforms, they should also be added to this list.
const HANDLED_JASMINE_PROPERTIES = new Set([
    // Spies
    'createSpy',
    'createSpyObj',
    'spyOnAllFunctions',
    // Clock
    'clock',
    // Matchers
    'any',
    'anything',
    'stringMatching',
    'objectContaining',
    'arrayContaining',
    'arrayWithExactContents',
    'truthy',
    'falsy',
    'empty',
    'notEmpty',
    'mapContaining',
    'setContaining',
    // Other
    'DEFAULT_TIMEOUT_INTERVAL',
    'addMatchers',
    'addCustomEqualityTester',
]);
function transformUnknownJasmineProperties(node, { sourceFile, reporter }) {
    if (typescript_1.default.isPropertyAccessExpression(node) &&
        typescript_1.default.isIdentifier(node.expression) &&
        node.expression.text === 'jasmine') {
        const propName = node.name.text;
        if (!HANDLED_JASMINE_PROPERTIES.has(propName)) {
            reporter.reportTransformation(sourceFile, node, `Found unknown jasmine property \`jasmine.${propName}\`.`);
            reporter.recordTodo(`unknown-jasmine-property: ${propName}`);
            (0, comment_helpers_1.addTodoComment)(node, `Unsupported jasmine property "${propName}" found. Please migrate this manually.`);
        }
    }
    return node;
}
//# sourceMappingURL=jasmine-misc.js.map