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
exports.transformCreateSpy = transformCreateSpy;
exports.transformCreateSpyObj = transformCreateSpyObj;
exports.transformSpyReset = transformSpyReset;
exports.transformSpyCallInspection = transformSpyCallInspection;
/**
 * @fileoverview This file contains transformers dedicated to converting Jasmine's spying
 * functionality to Vitest's mocking APIs. It handles the creation of spies (`spyOn`,
 * `createSpy`, `createSpyObj`), spy strategies (`and.returnValue`, `and.callFake`),
 * and the inspection of spy calls (`spy.calls.reset`, `spy.calls.first`, `spy.calls.mostRecent`,
 * `spy.calls.all`, and the `args`, `returnValue`, and `object` properties of their results).
 */
const typescript_1 = __importDefault(require("typescript"));
const ast_helpers_1 = require("../utils/ast-helpers");
const ast_validation_1 = require("../utils/ast-validation");
const comment_helpers_1 = require("../utils/comment-helpers");
const refactor_helpers_1 = require("../utils/refactor-helpers");
function isTransparentWrapper(node) {
    return (typescript_1.default.isParenthesizedExpression(node) ||
        typescript_1.default.isAsExpression(node) ||
        typescript_1.default.isNonNullExpression(node) ||
        typescript_1.default.isTypeAssertionExpression(node) ||
        typescript_1.default.isSatisfiesExpression(node));
}
/**
 * Returns the innermost expression after removing any transparent wrappers
 * (parentheses, non-null assertions, and type assertions).
 */
function unwrapExpression(expression) {
    let current = expression;
    while (isTransparentWrapper(current)) {
        current = current.expression;
    }
    return current;
}
/**
 * Returns the nearest ancestor of a node that is not a transparent wrapper.
 */
function getUnwrappedParent(node) {
    let parent = node.parent;
    while (parent && isTransparentWrapper(parent)) {
        parent = parent.parent;
    }
    return parent;
}
function isChainedWithAnd(node) {
    let parent = node.parent;
    while (parent) {
        if (typescript_1.default.isPropertyAccessExpression(parent)) {
            if (typescript_1.default.isIdentifier(parent.name) && parent.name.text === 'and') {
                return true;
            }
        }
        else if (typescript_1.default.isElementAccessExpression(parent)) {
            if (typescript_1.default.isStringLiteralLike(parent.argumentExpression) &&
                parent.argumentExpression.text === 'and') {
                return true;
            }
        }
        else if (isTransparentWrapper(parent)) {
            parent = parent.parent;
            continue;
        }
        break;
    }
    return false;
}
function transformPrimarySpy(node, refactorCtx) {
    const { sourceFile, reporter, pendingVitestValueImports } = refactorCtx;
    if (typescript_1.default.isIdentifier(node.expression) &&
        (node.expression.text === 'spyOn' || node.expression.text === 'spyOnProperty')) {
        (0, ast_helpers_1.addVitestValueImport)(pendingVitestValueImports, 'vi');
        // `spyOnProperty` defaults to the getter while `vi.spyOn` needs the access type to spy on
        // a property instead of a method.
        const args = node.expression.text === 'spyOnProperty' && node.arguments.length === 2
            ? [...node.arguments, typescript_1.default.factory.createStringLiteral('get', true)]
            : node.arguments;
        const viSpyOnCall = typescript_1.default.factory.updateCallExpression(node, (0, ast_helpers_1.createPropertyAccess)('vi', 'spyOn'), node.typeArguments, args);
        if (isChainedWithAnd(node)) {
            reporter.reportTransformation(sourceFile, node, `Transformed \`${node.expression.text}\` to \`vi.spyOn\`.`);
            return viSpyOnCall;
        }
        reporter.reportTransformation(sourceFile, node, `Transformed \`${node.expression.text}\` to \`vi.spyOn\`, ` +
            `appending \`.mockReturnValue(undefined)\` to preserve stub-by-default semantics.`);
        return typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(viSpyOnCall, 'mockReturnValue'), undefined, [typescript_1.default.factory.createIdentifier('undefined')]);
    }
    return node;
}
function transformSpyStrategy(node, refactorCtx) {
    const { sourceFile, reporter } = refactorCtx;
    if (!typescript_1.default.isPropertyAccessExpression(node.expression)) {
        return node;
    }
    const pae = node.expression;
    let spyCall;
    if (typescript_1.default.isPropertyAccessExpression(pae.expression) &&
        typescript_1.default.isIdentifier(pae.expression.name) &&
        pae.expression.name.text === 'and') {
        spyCall = pae.expression.expression;
    }
    else if (typescript_1.default.isElementAccessExpression(pae.expression) &&
        typescript_1.default.isStringLiteralLike(pae.expression.argumentExpression) &&
        pae.expression.argumentExpression.text === 'and') {
        spyCall = pae.expression.expression;
    }
    if (spyCall) {
        let newMethodName;
        let args = node.arguments;
        if (typescript_1.default.isIdentifier(pae.name)) {
            const strategyName = pae.name.text;
            switch (strategyName) {
                case 'returnValue':
                    {
                        const firstArg = args[0];
                        const result = firstArg ? (0, ast_helpers_1.getPromiseResolveRejectMethod)(firstArg) : null;
                        if (result) {
                            const methodMapping = {
                                'resolve': 'mockResolvedValue',
                                'reject': 'mockRejectedValue',
                            };
                            newMethodName = methodMapping[result.methodName];
                            args = result.arguments;
                        }
                        else {
                            newMethodName = 'mockReturnValue';
                        }
                    }
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
                    const throwStatement = typescript_1.default.factory.createThrowStatement(errorArg && typescript_1.default.isNewExpression(errorArg)
                        ? errorArg
                        : typescript_1.default.factory.createNewExpression(typescript_1.default.factory.createIdentifier('Error'), undefined, errorArg ? [errorArg] : []));
                    const arrowFunction = typescript_1.default.factory.createArrowFunction(undefined, undefined, [], undefined, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), typescript_1.default.factory.createBlock([throwStatement], true));
                    const newExpression = (0, ast_helpers_1.createPropertyAccess)(spyCall, 'mockImplementation');
                    return typescript_1.default.factory.createCallExpression(newExpression, undefined, [arrowFunction]);
                }
                case 'identity': {
                    reporter.reportTransformation(sourceFile, node, 'Transformed `.and.identity()` to `.getMockName()`.');
                    const newExpression = (0, ast_helpers_1.createPropertyAccess)(spyCall, 'getMockName');
                    return typescript_1.default.factory.createCallExpression(newExpression, undefined, undefined);
                }
                default: {
                    const category = 'unsupported-spy-strategy';
                    reporter.recordTodo(category, sourceFile, node);
                    (0, comment_helpers_1.addTodoComment)(node, category, { name: strategyName });
                    break;
                }
            }
            if (newMethodName) {
                reporter.reportTransformation(sourceFile, node, `Transformed spy strategy \`.and.${strategyName}()\` to \`.${newMethodName}()\`.`);
                const newExpression = typescript_1.default.factory.updatePropertyAccessExpression(pae, spyCall, typescript_1.default.factory.createIdentifier(newMethodName));
                return typescript_1.default.factory.updateCallExpression(node, newExpression, node.typeArguments, args);
            }
        }
    }
    return node;
}
function transformSpyOnAllFunctions(node, refactorCtx) {
    const { sourceFile, reporter } = refactorCtx;
    if ((0, ast_validation_1.getJasmineMethodName)(node) === 'spyOnAllFunctions') {
        reporter.reportTransformation(sourceFile, node, 'Found unsupported `jasmine.spyOnAllFunctions()`.');
        const category = 'spyOnAllFunctions';
        reporter.recordTodo(category, sourceFile, node);
        (0, comment_helpers_1.addTodoComment)(node, category);
        return node;
    }
    return node;
}
function transformSpies(node, refactorCtx) {
    if (!typescript_1.default.isCallExpression(node)) {
        return node;
    }
    const primaryResult = transformPrimarySpy(node, refactorCtx);
    if (primaryResult !== node) {
        return primaryResult;
    }
    const strategyResult = transformSpyStrategy(node, refactorCtx);
    if (strategyResult !== node) {
        return strategyResult;
    }
    return transformSpyOnAllFunctions(node, refactorCtx);
}
function transformCreateSpy(node, ctx) {
    const { reporter, sourceFile, pendingVitestValueImports } = ctx;
    if (!(0, ast_validation_1.isJasmineCallExpression)(node, 'createSpy')) {
        return node;
    }
    (0, ast_helpers_1.addVitestValueImport)(pendingVitestValueImports, 'vi');
    reporter.reportTransformation(sourceFile, node, 'Transformed `jasmine.createSpy()` to `vi.fn()`.');
    const spyName = node.arguments[0];
    const viFnCallExpression = (0, refactor_helpers_1.createViCallExpression)(ctx, 'fn', node.arguments.length > 1 ? [node.arguments[1]] : []);
    // jasmine.createSpy() -> vi.fn()
    // jasmine.createSpy(name, originalFn) -> vi.fn(originalFn).mockName(name)
    return !spyName
        ? viFnCallExpression
        : typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(viFnCallExpression, 'mockName'), undefined, [node.arguments[0]]);
}
function transformCreateSpyObj(node, ctx) {
    const { reporter, sourceFile, pendingVitestValueImports } = ctx;
    if (!(0, ast_validation_1.isJasmineCallExpression)(node, 'createSpyObj')) {
        return node;
    }
    (0, ast_helpers_1.addVitestValueImport)(pendingVitestValueImports, 'vi');
    reporter.reportTransformation(sourceFile, node, 'Transformed `jasmine.createSpyObj()` to an object literal with `vi.fn()`.');
    const firstArg = node.arguments[0];
    const hasBaseName = typescript_1.default.isStringLiteral(firstArg);
    const baseName = hasBaseName ? firstArg.text : undefined;
    const methods = hasBaseName ? node.arguments[1] : firstArg;
    const propertiesArg = hasBaseName ? node.arguments[2] : node.arguments[1];
    let properties;
    if (node.arguments.length < 2 && hasBaseName) {
        const category = 'createSpyObj-single-argument';
        reporter.recordTodo(category, sourceFile, node);
        (0, comment_helpers_1.addTodoComment)(node, category);
        return node;
    }
    if (typescript_1.default.isArrayLiteralExpression(methods)) {
        properties = createSpyObjWithArray(ctx, methods, baseName);
    }
    else if (typescript_1.default.isObjectLiteralExpression(methods)) {
        properties = createSpyObjWithObject(ctx, methods, baseName);
    }
    else {
        const category = 'createSpyObj-dynamic-variable';
        reporter.recordTodo(category, sourceFile, node);
        (0, comment_helpers_1.addTodoComment)(node, category);
        return node;
    }
    if (propertiesArg) {
        if (typescript_1.default.isObjectLiteralExpression(propertiesArg)) {
            properties.push(...propertiesArg.properties);
        }
        else {
            const category = 'createSpyObj-dynamic-property-map';
            reporter.recordTodo(category, sourceFile, node);
            (0, comment_helpers_1.addTodoComment)(node, category);
        }
    }
    return typescript_1.default.factory.createObjectLiteralExpression(properties, true);
}
function createSpyObjWithArray(ctx, methods, baseName) {
    return methods.elements
        .map((element) => {
        if (typescript_1.default.isStringLiteral(element)) {
            const mockFn = (0, refactor_helpers_1.createViCallExpression)(ctx, 'fn');
            const methodName = element.text;
            let finalExpression = mockFn;
            if (baseName) {
                finalExpression = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(finalExpression, 'mockName'), undefined, [typescript_1.default.factory.createStringLiteral(`${baseName}.${methodName}`)]);
            }
            return typescript_1.default.factory.createPropertyAssignment(typescript_1.default.factory.createIdentifier(methodName), finalExpression);
        }
        return undefined;
    })
        .filter((p) => !!p);
}
function createSpyObjWithObject(ctx, methods, baseName) {
    return methods.properties
        .map((prop) => {
        if (typescript_1.default.isPropertyAssignment(prop) && typescript_1.default.isIdentifier(prop.name)) {
            const methodName = prop.name.text;
            const returnValue = prop.initializer;
            let mockFn = (0, refactor_helpers_1.createViCallExpression)(ctx, 'fn');
            if (baseName) {
                mockFn = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(mockFn, 'mockName'), undefined, [typescript_1.default.factory.createStringLiteral(`${baseName}.${methodName}`)]);
            }
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
function createMockedSpyMockProperty(spyIdentifier, pendingVitestValueImports) {
    (0, ast_helpers_1.addVitestValueImport)(pendingVitestValueImports, 'vi');
    const mockedSpy = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)('vi', 'mocked'), undefined, [spyIdentifier]);
    return (0, ast_helpers_1.createPropertyAccess)(mockedSpy, 'mock');
}
/**
 * Maps the properties of a Jasmine `CallInfo` object to the corresponding property on
 * Vitest's `MockContext`. The optional `valueAccess` is a trailing property that must be
 * accessed on the resulting element (e.g. `mock.results[i].value`).
 */
const CALL_INFO_PROPERTIES = new Map([
    ['args', { mockProperty: 'calls' }],
    ['returnValue', { mockProperty: 'results', valueAccess: 'value' }],
    ['object', { mockProperty: 'contexts' }],
]);
/**
 * Attempts to match an expression that yields a Jasmine `CallInfo` object:
 * `spy.calls.first()`, `spy.calls.mostRecent()`, or `spy.calls.all()[i]`.
 */
function getCallInfoAccess(expression) {
    const unwrapped = unwrapExpression(expression);
    let indexExpression;
    let callExpression = unwrapped;
    if (typescript_1.default.isElementAccessExpression(unwrapped)) {
        indexExpression = unwrapped.argumentExpression;
        callExpression = unwrapExpression(unwrapped.expression);
    }
    if (!typescript_1.default.isCallExpression(callExpression) ||
        !typescript_1.default.isPropertyAccessExpression(callExpression.expression)) {
        return undefined;
    }
    const methodPae = callExpression.expression;
    if (!typescript_1.default.isIdentifier(methodPae.name) || !typescript_1.default.isPropertyAccessExpression(methodPae.expression)) {
        return undefined;
    }
    const spyIdentifier = getSpyIdentifierFromCalls(methodPae.expression);
    if (!spyIdentifier) {
        return undefined;
    }
    const methodName = methodPae.name.text;
    if (indexExpression) {
        // Only `spy.calls.all()[i]` is supported when an element access is present.
        return methodName === 'all'
            ? { spyIdentifier, index: indexExpression, sourceText: 'spy.calls.all()[i]', indexText: 'i' }
            : undefined;
    }
    switch (methodName) {
        case 'first':
            return {
                spyIdentifier,
                index: typescript_1.default.factory.createNumericLiteral(0),
                sourceText: 'spy.calls.first()',
                indexText: '0',
            };
        case 'mostRecent':
            return { spyIdentifier, index: 'last', sourceText: 'spy.calls.mostRecent()', indexText: '' };
    }
    return undefined;
}
/**
 * Transforms property accesses on a Jasmine `CallInfo` object (`.args`, `.returnValue`,
 * `.object`) obtained via `spy.calls.first()`, `spy.calls.mostRecent()`, or `spy.calls.all()[i]`
 * into the equivalent Vitest `MockContext` access.
 *
 * @example
 * spy.calls.first().args              -> vi.mocked(spy).mock.calls[0]
 * spy.calls.mostRecent().args         -> vi.mocked(spy).mock.lastCall
 * spy.calls.all()[i].args             -> vi.mocked(spy).mock.calls[i]
 * spy.calls.first().returnValue       -> vi.mocked(spy).mock.results[0].value
 * spy.calls.mostRecent().returnValue  -> vi.mocked(spy).mock.results.at(-1)?.value
 * spy.calls.all()[i].object           -> vi.mocked(spy).mock.contexts[i]
 * spy.calls.mostRecent().object       -> vi.mocked(spy).mock.contexts.at(-1)
 */
function transformCallInfoProperty(node, { sourceFile, reporter, pendingVitestValueImports }) {
    if (!typescript_1.default.isPropertyAccessExpression(node) || !typescript_1.default.isIdentifier(node.name)) {
        return node;
    }
    const propertyName = node.name.text;
    const mapping = CALL_INFO_PROPERTIES.get(propertyName);
    if (!mapping) {
        return node;
    }
    const callInfo = getCallInfoAccess(node.expression);
    if (!callInfo) {
        return node;
    }
    const mockProperty = createMockedSpyMockProperty(callInfo.spyIdentifier, pendingVitestValueImports);
    const mockCollection = (0, ast_helpers_1.createPropertyAccess)(mockProperty, mapping.mockProperty);
    // Note: for `args` and `object`, an optional access (`?.`) in the source is intentionally
    // not carried over. The replacement is a plain element access (e.g. `mock.calls[0]`), which
    // already evaluates to `undefined` when the spy has not been called, so the result of the
    // transformed expression itself is unchanged. Only `returnValue` has a trailing `.value`
    // access that must remain optional to avoid throwing on a missing call.
    const accessOperator = node.questionDotToken ? '?.' : '.';
    let replacement;
    let replacementText;
    if (callInfo.index === 'last') {
        if (propertyName === 'args') {
            // Vitest provides a dedicated shorthand for the arguments of the last call.
            replacement = (0, ast_helpers_1.createPropertyAccess)(mockProperty, 'lastCall');
            replacementText = 'vi.mocked(spy).mock.lastCall';
        }
        else {
            // `mock.<collection>.at(-1)`; the result may be `undefined` if the spy was never called,
            // so a trailing value access must always be optional.
            replacement = typescript_1.default.factory.createCallExpression((0, ast_helpers_1.createPropertyAccess)(mockCollection, 'at'), undefined, [
                typescript_1.default.factory.createPrefixUnaryExpression(typescript_1.default.SyntaxKind.MinusToken, typescript_1.default.factory.createNumericLiteral(1)),
            ]);
            replacementText = `vi.mocked(spy).mock.${mapping.mockProperty}.at(-1)`;
            if (mapping.valueAccess) {
                replacement = typescript_1.default.factory.createPropertyAccessChain(replacement, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), mapping.valueAccess);
                replacementText += `?.${mapping.valueAccess}`;
            }
        }
    }
    else {
        replacement = typescript_1.default.factory.createElementAccessExpression(mockCollection, callInfo.index);
        replacementText = `vi.mocked(spy).mock.${mapping.mockProperty}[${callInfo.indexText}]`;
        if (mapping.valueAccess) {
            replacement = node.questionDotToken
                ? typescript_1.default.factory.createPropertyAccessChain(replacement, typescript_1.default.factory.createToken(typescript_1.default.SyntaxKind.QuestionDotToken), mapping.valueAccess)
                : (0, ast_helpers_1.createPropertyAccess)(replacement, mapping.valueAccess);
            replacementText += `${accessOperator}${mapping.valueAccess}`;
        }
    }
    reporter.reportTransformation(sourceFile, node, `Transformed \`${callInfo.sourceText}${accessOperator}${propertyName}\` to \`${replacementText}\`.`);
    return replacement;
}
function transformThisFor(node, { sourceFile, reporter, pendingVitestValueImports }) {
    // Check 1: Is the node is a call expression?
    if (!typescript_1.default.isCallExpression(node) || !typescript_1.default.isPropertyAccessExpression(node.expression)) {
        return node;
    }
    // Check 2: Is it a call to `.thisFor`?
    const thisForPae = node.expression;
    if (!typescript_1.default.isIdentifier(thisForPae.name) ||
        thisForPae.name.text !== 'thisFor' ||
        !typescript_1.default.isPropertyAccessExpression(thisForPae.expression)) {
        return node;
    }
    // Check 3: Can we get the spy identifier from `spy.calls`?
    const spyIdentifier = getSpyIdentifierFromCalls(thisForPae.expression);
    if (!spyIdentifier) {
        return node;
    }
    // If all checks pass, perform the transformation.
    reporter.reportTransformation(sourceFile, node, 'Transformed `spy.calls.thisFor(index)` to `vi.mocked(spy).mock.contexts[index]`.');
    const mockProperty = createMockedSpyMockProperty(spyIdentifier, pendingVitestValueImports);
    return typescript_1.default.factory.createElementAccessExpression((0, ast_helpers_1.createPropertyAccess)(mockProperty, 'contexts'), node.arguments[0] ?? typescript_1.default.factory.createNumericLiteral(0));
}
function transformSpyCallInspection(node, refactorCtx) {
    const callInfoPropertyTransformed = transformCallInfoProperty(node, refactorCtx);
    if (callInfoPropertyTransformed !== node) {
        return callInfoPropertyTransformed;
    }
    const thisForTransformed = transformThisFor(node, refactorCtx);
    if (thisForTransformed !== node) {
        return thisForTransformed;
    }
    if (!typescript_1.default.isCallExpression(node) || !typescript_1.default.isPropertyAccessExpression(node.expression)) {
        return node;
    }
    const { sourceFile, reporter, pendingVitestValueImports } = refactorCtx;
    const pae = node.expression; // e.g., mySpy.calls.count
    const spyIdentifier = typescript_1.default.isPropertyAccessExpression(pae.expression)
        ? getSpyIdentifierFromCalls(pae.expression)
        : undefined;
    if (spyIdentifier) {
        const mockProperty = createMockedSpyMockProperty(spyIdentifier, pendingVitestValueImports);
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
            case 'saveArgumentsByValue':
                {
                    const category = 'saveArgumentsByValue';
                    reporter.recordTodo(category, sourceFile, node);
                    (0, comment_helpers_1.addTodoComment)(node, category);
                }
                break;
            case 'mostRecent': {
                // Accesses such as `.args`, `.returnValue`, and `.object` are handled by
                // `transformCallInfoProperty`; only a bare `mostRecent()` requires manual migration.
                const parent = getUnwrappedParent(node);
                if (!parent ||
                    !typescript_1.default.isPropertyAccessExpression(parent) ||
                    !typescript_1.default.isIdentifier(parent.name) ||
                    !CALL_INFO_PROPERTIES.has(parent.name.text)) {
                    const category = 'mostRecent-without-args';
                    reporter.recordTodo(category, sourceFile, node);
                    (0, comment_helpers_1.addTodoComment)(node, category);
                }
                return node;
            }
        }
        if (newExpression && message) {
            reporter.reportTransformation(sourceFile, node, message);
            return newExpression;
        }
    }
    return node;
}
//# sourceMappingURL=jasmine-spy.js.map