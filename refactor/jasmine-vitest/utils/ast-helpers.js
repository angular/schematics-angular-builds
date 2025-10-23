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
exports.addVitestAutoImport = addVitestAutoImport;
exports.getVitestAutoImports = getVitestAutoImports;
exports.createViCallExpression = createViCallExpression;
exports.createExpectCallExpression = createExpectCallExpression;
exports.createPropertyAccess = createPropertyAccess;
const typescript_1 = __importDefault(require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
function addVitestAutoImport(imports, importName) {
    imports.add(importName);
}
function getVitestAutoImports(imports) {
    if (!imports?.size) {
        return undefined;
    }
    const importNames = [...imports];
    importNames.sort();
    const importSpecifiers = importNames.map((i) => typescript_1.default.factory.createImportSpecifier(false, undefined, typescript_1.default.factory.createIdentifier(i)));
    return typescript_1.default.factory.createImportDeclaration(undefined, typescript_1.default.factory.createImportClause(typescript_1.default.SyntaxKind.TypeKeyword, undefined, typescript_1.default.factory.createNamedImports(importSpecifiers)), typescript_1.default.factory.createStringLiteral('vitest'));
}
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