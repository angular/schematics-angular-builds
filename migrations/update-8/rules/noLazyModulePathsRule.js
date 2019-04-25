"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const tslint_1 = require("tslint"); // tslint:disable-line:no-implicit-dependencies
const ts = require("../../../third_party/github.com/Microsoft/TypeScript/lib/typescript");
// Constants:
const LOAD_CHILDREN_SPLIT = '#';
const FAILURE_MESSAGE = 'Found magic `loadChildren` string. Use a function with `import` instead.';
class Rule extends tslint_1.Rules.AbstractRule {
    apply(ast) {
        const ruleName = this.ruleName;
        const changes = [];
        ts.forEachChild(ast, function analyze(node) {
            if (ts.isPropertyAssignment(node) &&
                (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
                node.name.text === 'loadChildren' &&
                ts.isStringLiteral(node.initializer)) {
                const valueNode = node.initializer;
                const parts = valueNode.text.split(LOAD_CHILDREN_SPLIT);
                const path = parts[0];
                const moduleName = parts[1] || 'default';
                let fix = `() => import('${path}').then(m => m.${moduleName})`;
                // Try to fix indentation in replacement:
                const { character } = ast.getLineAndCharacterOfPosition(node.getStart());
                fix = fix.replace(/\n/g, `\n${' '.repeat(character)}`);
                const replacement = new tslint_1.Replacement(valueNode.getStart(), valueNode.getWidth(), fix);
                const start = node.getStart();
                const end = node.getEnd();
                const change = new tslint_1.RuleFailure(ast, start, end, FAILURE_MESSAGE, ruleName, replacement);
                change.setRuleSeverity('warning');
                changes.push(change);
            }
            ts.forEachChild(node, analyze);
        });
        return changes;
    }
}
exports.Rule = Rule;
