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
exports.transformSpies = transformSpies;
exports.transformCreateSpyObj = transformCreateSpyObj;
exports.transformSpyReset = transformSpyReset;
exports.transformSpyCallInspection = transformSpyCallInspection;
/**
 * @fileoverview This file contains transformers dedicated to converting Jasmine's spying
 * functionality to Vitest's mocking APIs. It handles the creation of spies (`spyOn`,
 * `createSpy`, `createSpyObj`), spy strategies (`and.returnValue`, `and.callFake`),
 * and the inspection of spy calls (`spy.calls.reset`, `spy.calls.mostRecent`).
 */
const typescript_1 = __importDefault(require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_helpers_1 = require("../utils/ast-helpers");
const ast_validation_1 = require("../utils/ast-validation");
const comment_helpers_1 = require("../utils/comment-helpers");
function transformSpies(node, refactorCtx) {
    const { sourceFile, reporter } = refactorCtx;
    if (!typescript_1.default.isCallExpression(node)) {
        return node;
    }
    if (typescript_1.default.isIdentifier(node.expression) &&
        (node.expression.text === 'spyOn' || node.expression.text === 'spyOnProperty')) {
        reporter.reportTransformation(sourceFile, node, `Transformed \`${node.expression.text}\` to \`vi.spyOn\`.`);
        return typescript_1.default.factory.updateCallExpression(node, (0, ast_helpers_1.createPropertyAccess)('vi', 'spyOn'), node.typeArguments, node.arguments);
    }
    if (typescript_1.default.isPropertyAccessExpression(node.expression)) {
        const pae = node.expression;
        if (typescript_1.default.isPropertyAccessExpression(pae.expression) &&
            typescript_1.default.isIdentifier(pae.expression.name) &&
            pae.expression.name.text === 'and') {
            const spyCall = pae.expression.expression;
            let newMethodName;
            if (typescript_1.default.isIdentifier(pae.name)) {
                const strategyName = pae.name.text;
                switch (strategyName) {
                    case 'returnValue':
                        newMethodName = 'mockReturnValue';
                        break;
                    case 'resolveTo':
                        newMethodName = 'mockResolvedValue';
                        break;
                    case 'rejectWith':
                        newMethodName = 'mockRejectedValue';
                        break;
                    case 'returnValues': {
                        reporter.reportTransformation(sourceFile, node, 'Transformed `.and.returnValues()` to chained `.mockReturnValueOnce()` calls.');
                        const returnValues = node.arguments;
                        if (returnValues.length === 0) {
                            // No values, so it's a no-op. Just transform the spyOn call.
                            return transformSpies(spyCall, refactorCtx);
                        }
                        // spy.and.returnValues(a, b) -> spy.mockReturnValueOnce(a).mockReturnValueOnce(b)
                        let chainedCall = spyCall;
                        for (const value of returnValues) {
                            const mockCall = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(chainedCall, 'mockReturnValueOnce'), undefined, [value]);
                            chainedCall = mockCall;
                        }
                        return chainedCall;
                    }
                    case 'callFake':
                        newMethodName = 'mockImplementation';
                        break;
                    case 'callThrough':
                        reporter.reportTransformation(sourceFile, node, 'Removed redundant `.and.callThrough()` call.');
                        return transformSpies(spyCall, refactorCtx); // .and.callThrough() is redundant, just transform spyOn.
                    case 'stub': {
                        reporter.reportTransformation(sourceFile, node, 'Transformed `.and.stub()` to `.mockImplementation()`.');
                        const newExpression = (0, ast_helpers_1.createPropertyAccess)(spyCall, 'mockImplementation');
                        const arrowFn = typescript_1.default.factory.createArrowFunction(undefined, undefined, [], undefined, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.factory.createBlock([], /* multiline */ true));
                        return typescript_1.default.factory.createCallExpression(newExpression, undefined, [arrowFn]);
                    }
                    case 'throwError': {
                        reporter.reportTransformation(sourceFile, node, 'Transformed `.and.throwError()` to `.mockImplementation()`.');
                        const errorArg = node.arguments[0];
                        const throwStatement = typescript_1.default.factory.createThrowStatement(typescript_1.default.isNewExpression(errorArg)
                            ? errorArg
                            : typescript_1.default.factory.createNewExpression(typescript_1.default.factory.createIdentifier('Error'), undefined, node.arguments));
                        const arrowFunction = typescript_1.default.factory.createArrowFunction(undefined, undefined, [], undefined, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.factory.createBlock([throwStatement], true));
                        const newExpression = (0, ast_helpers_1.createPropertyAccess)(spyCall, 'mockImplementation');
                        return typescript_1.default.factory.createCallExpression(newExpression, undefined, [arrowFunction]);
                    }
                    default: {
                        const category = 'unsupported-spy-strategy';
                        reporter.recordTodo(category);
                        (0, comment_helpers_1.addTodoComment)(node, category, { name: strategyName });
                        break;
                    }
                }
                if (newMethodName) {
                    reporter.reportTransformation(sourceFile, node, `Transformed spy strategy \`.and.${strategyName}()\` to \`.${newMethodName}()\`.`);
                    const newExpression = typescript_1.default.factory.updatePropertyAccessExpression(pae, spyCall, typescript_1.default.factory.createIdentifier(newMethodName));
                    return typescript_1.default.factory.updateCallExpression(node, newExpression, node.typeArguments, node.arguments);
                }
            }
        }
    }
    const jasmineMethodName = (0, ast_validation_1.getJasmineMethodName)(node);
    switch (jasmineMethodName) {
        case 'createSpy':
            reporter.reportTransformation(sourceFile, node, 'Transformed `jasmine.createSpy()` to `vi.fn()`.');
            // jasmine.createSpy(name, originalFn) -> vi.fn(originalFn)
            return (0, ast_helpers_1.createViCallExpression)('fn', node.arguments.length > 1 ? [node.arguments[1]] : []);
        case 'spyOnAllFunctions': {
            reporter.reportTransformation(sourceFile, node, 'Found unsupported `jasmine.spyOnAllFunctions()`.');
            const category = 'spyOnAllFunctions';
            reporter.recordTodo(category);
            (0, comment_helpers_1.addTodoComment)(node, category);
            return node;
        }
    }
    return node;
}
function transformCreateSpyObj(node, { sourceFile, reporter }) {
    if (!(0, ast_validation_1.isJasmineCallExpression)(node, 'createSpyObj')) {
        return node;
    }
    reporter.reportTransformation(sourceFile, node, 'Transformed `jasmine.createSpyObj()` to an object literal with `vi.fn()`.');
    if (node.arguments.length < 2) {
        const category = 'createSpyObj-single-argument';
        reporter.recordTodo(category);
        (0, comment_helpers_1.addTodoComment)(node, category);
        return node;
    }
    const methods = node.arguments[1];
    const propertiesArg = node.arguments[2];
    let properties = [];
    if (typescript_1.default.isArrayLiteralExpression(methods)) {
        properties = createSpyObjWithArray(methods);
    }
    else if (typescript_1.default.isObjectLiteralExpression(methods)) {
        properties = createSpyObjWithObject(methods);
    }
    else {
        const category = 'createSpyObj-dynamic-variable';
        reporter.recordTodo(category);
        (0, comment_helpers_1.addTodoComment)(node, category);
        return node;
    }
    if (propertiesArg) {
        if (typescript_1.default.isObjectLiteralExpression(propertiesArg)) {
            properties.push(...propertiesArg.properties);
        }
        else {
            const category = 'createSpyObj-dynamic-property-map';
            reporter.recordTodo(category);
            (0, comment_helpers_1.addTodoComment)(node, category);
        }
    }
    return typescript_1.default.factory.createObjectLiteralExpression(properties, true);
}
function createSpyObjWithArray(methods) {
    return methods.elements
        .map((element) => {
        if (typescript_1.default.isStringLiteral(element)) {
            return typescript_1.default.factory.createPropertyAssignment(typescript_1.default.factory.createIdentifier(element.text), (0, ast_helpers_1.createViCallExpression)('fn'));
        }
        return undefined;
    })
        .filter((p) => !!p);
}
function createSpyObjWithObject(methods) {
    return methods.properties
        .map((prop) => {
        if (typescript_1.default.isPropertyAssignment(prop) && typescript_1.default.isIdentifier(prop.name)) {
            const methodName = prop.name.text;
            const returnValue = prop.initializer;
            const mockFn = (0, ast_helpers_1.createViCallExpression)('fn');
            const mockReturnValue = (0, ast_helpers_1.createPropertyAccess)(mockFn, 'mockReturnValue');
            return typescript_1.default.factory.createPropertyAssignment(typescript_1.default.factory.createIdentifier(methodName), typescript_1.default.factory.createCallExpression(mockReturnValue, undefined, [returnValue]));
        }
        return undefined;
    })
        .filter((p) => !!p);
}
function transformSpyReset(node, { sourceFile, reporter }) {
    if (typescript_1.default.isCallExpression(node) &&
        typescript_1.default.isPropertyAccessExpression(node.expression) &&
        typescript_1.default.isIdentifier(node.expression.name) &&
        node.expression.name.text === 'reset' &&
        typescript_1.default.isPropertyAccessExpression(node.expression.expression)) {
        const callsPae = node.expression.expression;
        if (typescript_1.default.isIdentifier(callsPae.name) && callsPae.name.text === 'calls') {
            reporter.reportTransformation(sourceFile, node, 'Transformed `spy.calls.reset()` to `.mockClear()`.');
            const spyIdentifier = callsPae.expression;
            const newExpression = (0, ast_helpers_1.createPropertyAccess)(spyIdentifier, 'mockClear');
            return typescript_1.default.factory.updateCallExpression(node, newExpression, node.typeArguments, []);
        }
    }
    return node;
}
function getSpyIdentifierFromCalls(node) {
    if (typescript_1.default.isIdentifier(node.name) && node.name.text === 'calls') {
        return node.expression;
    }
    return undefined;
}
function createMockedSpyMockProperty(spyIdentifier) {
    const mockedSpy = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)('vi', 'mocked'), undefined, [spyIdentifier]);
    return (0, ast_helpers_1.createPropertyAccess)(mockedSpy, 'mock');
}
function transformSpyCallInspection(node, { sourceFile, reporter }) {
    // mySpy.calls.mostRecent().args -> vi.mocked(mySpy).mock.lastCall
    if (typescript_1.default.isPropertyAccessExpression(node) &&
        typescript_1.default.isIdentifier(node.name) &&
        node.name.text === 'args') {
        const mostRecentCall = node.expression;
        if (typescript_1.default.isCallExpression(mostRecentCall) &&
            typescript_1.default.isPropertyAccessExpression(mostRecentCall.expression)) {
            const mostRecentPae = mostRecentCall.expression; // mySpy.calls.mostRecent
            if (typescript_1.default.isIdentifier(mostRecentPae.name) &&
                mostRecentPae.name.text === 'mostRecent' &&
                typescript_1.default.isPropertyAccessExpression(mostRecentPae.expression)) {
                const spyIdentifier = getSpyIdentifierFromCalls(mostRecentPae.expression);
                if (spyIdentifier) {
                    reporter.reportTransformation(sourceFile, node, 'Transformed `spy.calls.mostRecent().args` to `vi.mocked(spy).mock.lastCall`.');
                    const mockProperty = createMockedSpyMockProperty(spyIdentifier);
                    return (0, ast_helpers_1.createPropertyAccess)(mockProperty, 'lastCall');
                }
            }
        }
    }
    if (typescript_1.default.isCallExpression(node) && typescript_1.default.isPropertyAccessExpression(node.expression)) {
        const pae = node.expression; // e.g., mySpy.calls.count
        const spyIdentifier = typescript_1.default.isPropertyAccessExpression(pae.expression)
            ? getSpyIdentifierFromCalls(pae.expression)
            : undefined;
        if (spyIdentifier) {
            const mockProperty = createMockedSpyMockProperty(spyIdentifier);
            const callsProperty = (0, ast_helpers_1.createPropertyAccess)(mockProperty, 'calls');
            const callName = pae.name.text;
            let newExpression;
            let message;
            switch (callName) {
                case 'any':
                    message = 'Transformed `spy.calls.any()` to a check on `mock.calls.length`.';
                    newExpression = typescript_1.default.factory.createBinaryExpression((0, ast_helpers_1.createPropertyAccess)(callsProperty, 'length'), typescript_1.default.SyntaxKind.GreaterThanToken, typescript_1.default.factory.createNumericLiteral(0));
                    break;
                case 'count':
                    message = 'Transformed `spy.calls.count()` to `mock.calls.length`.';
                    newExpression = (0, ast_helpers_1.createPropertyAccess)(callsProperty, 'length');
                    break;
                case 'first':
                    message = 'Transformed `spy.calls.first()` to `mock.calls[0]`.';
                    newExpression = typescript_1.default.factory.createElementAccessExpression(callsProperty, 0);
                    break;
                case 'all':
                case 'allArgs':
                    message = `Transformed \`spy.calls.${callName}()\` to \`mock.calls\`.`;
                    newExpression = callsProperty;
                    break;
                case 'argsFor':
                    message = 'Transformed `spy.calls.argsFor()` to `mock.calls[i]`.';
                    newExpression = typescript_1.default.factory.createElementAccessExpression(callsProperty, node.arguments[0]);
                    break;
                case 'mostRecent':
                    if (!typescript_1.default.isPropertyAccessExpression(node.parent) ||
                        !typescript_1.default.isIdentifier(node.parent.name) ||
                        node.parent.name.text !== 'args') {
                        const category = 'mostRecent-without-args';
                        reporter.recordTodo(category);
                        (0, comment_helpers_1.addTodoComment)(node, category);
                    }
                    return node;
            }
            if (newExpression && message) {
                reporter.reportTransformation(sourceFile, node, message);
                return newExpression;
            }
        }
    }
    return node;
}
//# sourceMappingURL=jasmine-spy.js.map