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
const todo_notes_1 = require("./todo-notes");
// Implementation that covers both overloads.
function addTodoComment(node, category, context) {
    const note = todo_notes_1.TODO_NOTES[category];
    // The type assertion is safe here because the overloads guarantee the correct context is passed.
    const message = typeof note.message === 'function' ? note.message(context) : note.message;
    const url = 'url' in note && note.url ? ` See: ${note.url}` : '';
    const commentText = ` TODO: vitest-migration: ${message}${url}`;
    let statement = node;
    // Traverse up the AST to find the containing statement for the node.
    // This ensures that the comment is placed before the entire statement,
    // rather than being attached to a deeply nested node. For example, if the
    // node is an `Identifier`, we want the comment on the `VariableStatement`
    // or `ExpressionStatement` that contains it.
    while (statement.parent && !typescript_1.default.isBlock(statement.parent) && !typescript_1.default.isSourceFile(statement.parent)) {
        if (typescript_1.default.isExpressionStatement(statement) || typescript_1.default.isVariableStatement(statement)) {
            break;
        }
        statement = statement.parent;
    }
    typescript_1.default.addSyntheticLeadingComment(statement, typescript_1.default.SyntaxKind.SingleLineCommentTrivia, commentText, true);
}
//# sourceMappingURL=comment-helpers.js.map