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
exports.createViCallExpression = createViCallExpression;
exports.createExpectCallExpression = createExpectCallExpression;
exports.createPropertyAccess = createPropertyAccess;
const typescript_1 = __importDefault(require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
function createViCallExpression(methodName, args = [], typeArgs = undefined) {
    const callee = typescript_1.default.factory.createPropertyAccessExpression(typescript_1.default.factory.createIdentifier('vi'), methodName);
    return typescript_1.default.factory.createCallExpression(callee, typeArgs, args);
}
function createExpectCallExpression(args, typeArgs = undefined) {
    return typescript_1.default.factory.createCallExpression(typescript_1.default.factory.createIdentifier('expect'), typeArgs, args);
}
function createPropertyAccess(expressionOrIndentifierText, name) {
    return typescript_1.default.factory.createPropertyAccessExpression(typeof expressionOrIndentifierText === 'string'
        ? typescript_1.default.factory.createIdentifier(expressionOrIndentifierText)
        : expressionOrIndentifierText, name);
}
//# sourceMappingURL=ast-helpers.js.map