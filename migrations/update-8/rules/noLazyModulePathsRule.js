"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tsquery_1 = require("@phenomnomnominal/tsquery");
const tslint_1 = require("tslint"); // tslint:disable-line:no-implicit-dependencies
// Constants:
const LOAD_CHILDREN_SPLIT = '#';
const NOT_CHILDREN_QUERY = `:not(:has(Identifier[name="children"]))`;
const HAS_LOAD_CHILDREN_QUERY = `:has(Identifier[name="loadChildren"])`;
const LAZY_VALUE_QUERY = `StringLiteral[value=/.*${LOAD_CHILDREN_SPLIT}.*/]`;
const LOAD_CHILDREN_ASSIGNMENT_QUERY = `PropertyAssignment${NOT_CHILDREN_QUERY}${HAS_LOAD_CHILDREN_QUERY}:has(${LAZY_VALUE_QUERY})`;
const FAILURE_MESSAGE = 'Found magic `loadChildren` string. Use a function with `import` instead.';
class Rule extends tslint_1.Rules.AbstractRule {
    apply(ast) {
        return tsquery_1.tsquery(ast, LOAD_CHILDREN_ASSIGNMENT_QUERY).map(result => {
            const [valueNode] = tsquery_1.tsquery(result, LAZY_VALUE_QUERY);
            let fix = this._promiseReplacement(valueNode.text);
            // Try to fix indentation in replacement:
            const { character } = ast.getLineAndCharacterOfPosition(result.getStart());
            fix = fix.replace(/\n/g, `\n${' '.repeat(character)}`);
            const replacement = new tslint_1.Replacement(valueNode.getStart(), valueNode.getWidth(), fix);
            const start = result.getStart();
            const end = result.getEnd();
            return new tslint_1.RuleFailure(ast, start, end, FAILURE_MESSAGE, this.ruleName, replacement);
        });
    }
    _promiseReplacement(loadChildren) {
        const [path, moduleName] = this._getChunks(loadChildren);
        return `() => import('${path}').then(m => m.${moduleName})`;
    }
    _getChunks(loadChildren) {
        return loadChildren.split(LOAD_CHILDREN_SPLIT);
    }
}
exports.Rule = Rule;
