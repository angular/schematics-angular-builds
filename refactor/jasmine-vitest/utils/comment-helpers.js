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
exports.addTodoComment = addTodoComment;
const typescript_1 = __importDefault(require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
function addTodoComment(node, message) {
    let statement = node;
    // Attempt to find the containing statement
    while (statement.parent && !typescript_1.default.isBlock(statement.parent) && !typescript_1.default.isSourceFile(statement.parent)) {
        if (typescript_1.default.isExpressionStatement(statement) || typescript_1.default.isVariableStatement(statement)) {
            break;
        }
        statement = statement.parent;
    }
    typescript_1.default.addSyntheticLeadingComment(statement, typescript_1.default.SyntaxKind.SingleLineCommentTrivia, ` TODO: vitest-migration: ${message}`, true);
}
//# sourceMappingURL=comment-helpers.js.map