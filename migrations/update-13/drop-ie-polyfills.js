"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
const assert_1 = __importDefault(require("assert"));
const ts = __importStar(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const dependencies_1 = require("../../utility/dependencies");
const workspace_1 = require("../../utility/workspace");
/**
 * Migrates all polyfills files of projects to remove two dependencies originally needed by Internet
 * Explorer, but which are no longer needed now that support for IE has been dropped (`classlist.js`
 * and `web-animations-js`).
 *
 * The polyfills file includes side-effectful imports of these dependencies with comments about
 * their usage:
 *
 * ```
 * /**
 *  * IE11 requires the following for NgClass support on SVG elements
 *  *\/
 * import 'classlist.js';
 *
 * /**
 *  * Web Animations `@angular/platform-browser/animations`
 *  * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 *  * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 *  *\/
 * import 'web-animations-js';
 * ```
 *
 * This migration removes the `import` statements as well as any preceeding comments. It also
 * removes these dependencies from `package.json` if present and schedules an `npm install` task to
 * remove them from `node_modules/`.
 *
 * Also, the polyfills file has previously been generated with these imports commented out, to not
 * include the dependencies by default, but still allow users to easily uncomment and enable them
 * when required. So the migration also looks for:
 *
 * ```
 * // import 'classlist.js';  // Run `npm install --save classlist.js`.
 * // OR
 * // import 'web-animations-js';  // Run `npm install --save web-animations-js`.
 * ```
 *
 * And removes them as well. This keeps the polyfills files clean and up to date. Whitespace is
 * handled by leaving all trailing whitespace alone, and deleting all the leading newlines until the
 * previous non-empty line of code. This means any extra lines before a removed polyfill is dropped,
 * while any extra lines after a polyfill are retained. This roughly correlates to how a real
 * developer might write such a file.
 */
function default_1() {
    return async (tree, ctx) => {
        const modulesToDrop = new Set(['classlist.js', 'web-animations-js']);
        // Remove modules from `package.json` dependencies.
        const moduleDeps = Array.from(modulesToDrop.values())
            .map((module) => (0, dependencies_1.getPackageJsonDependency)(tree, module))
            .filter((dep) => !!dep);
        for (const { name } of moduleDeps) {
            (0, dependencies_1.removePackageJsonDependency)(tree, name);
        }
        // Run `npm install` after removal. This isn't strictly necessary, as keeping the dependencies
        // in `node_modules/` doesn't break anything. however non-polyfill usages of these dependencies
        // will work while they are in `node_modules/` but then break on the next `npm install`. If any
        // such usages exist, it is better for them to fail immediately after the migration instead of
        // the next time the user happens to `npm install`. As an optimization, only run `npm install`
        // if a dependency was actually removed.
        if (moduleDeps.length > 0) {
            ctx.addTask(new tasks_1.NodePackageInstallTask());
        }
        // Find all the polyfill files in the workspace.
        const wksp = await (0, workspace_1.getWorkspace)(tree);
        const polyfills = Array.from((0, workspace_1.allWorkspaceTargets)(wksp))
            .filter(([_, target]) => { var _a; return !!((_a = target.options) === null || _a === void 0 ? void 0 : _a.polyfills); })
            .map(([_, target]) => { var _a; return (_a = target.options) === null || _a === void 0 ? void 0 : _a.polyfills; });
        const uniquePolyfills = Array.from(new Set(polyfills));
        // Drop the modules from each polyfill.
        return (0, schematics_1.chain)(uniquePolyfills.map((polyfillPath) => dropModules(polyfillPath, modulesToDrop)));
    };
}
exports.default = default_1;
/** Processes the given polyfill path and removes any `import` statements for the given modules. */
function dropModules(polyfillPath, modules) {
    return (tree, ctx) => {
        const sourceContent = tree.read(polyfillPath);
        if (!sourceContent) {
            ctx.logger.warn('Polyfill path from workspace configuration could not be read, does the file exist?', { polyfillPath });
            return;
        }
        const content = sourceContent.toString('utf8');
        const sourceFile = ts.createSourceFile(polyfillPath, content.replace(/^\uFEFF/, ''), ts.ScriptTarget.Latest, true /* setParentNodes */);
        // Remove polyfills for the given module specifiers.
        const recorder = tree.beginUpdate(polyfillPath);
        removePolyfillImports(recorder, sourceFile, modules);
        removePolyfillImportComments(recorder, sourceFile, modules);
        tree.commitUpdate(recorder);
        return tree;
    };
}
/**
 * Searches the source file for any `import '${module}';` statements and removes them along with
 * any preceeding comments.
 *
 * @param recorder The recorder to remove from.
 * @param sourceFile The source file containing the `import` statements.
 * @param modules The module specifiers to remove.
 */
function removePolyfillImports(recorder, sourceFile, modules) {
    const imports = sourceFile.statements.filter((stmt) => ts.isImportDeclaration(stmt));
    for (const i of imports) {
        // Should always be a string literal.
        (0, assert_1.default)(ts.isStringLiteral(i.moduleSpecifier));
        // Ignore other modules.
        if (!modules.has(i.moduleSpecifier.text)) {
            continue;
        }
        // Remove the module import statement.
        recorder.remove(i.getStart(), i.getWidth());
        // Remove leading comments. "Leading" comments seems to include comments within the node, so
        // even though `getFullText()` returns an index before any leading comments to a node, it will
        // still find and process them.
        ts.forEachLeadingCommentRange(sourceFile.getFullText(), i.getFullStart(), (start, end, _, hasTrailingNewLine) => {
            // Include both leading **and** trailing newlines because these are comments that *preceed*
            // the `import` statement, so "trailing" newlines here are actually in-between the `import`
            // and it's leading comments.
            const commentRangeWithoutNewLines = { start, end };
            const commentRangeWithTrailingNewLines = hasTrailingNewLine
                ? includeTrailingNewLine(sourceFile, commentRangeWithoutNewLines)
                : commentRangeWithoutNewLines;
            const commentRange = includeLeadingNewLines(sourceFile, commentRangeWithTrailingNewLines);
            if (!isProtectedComment(sourceFile, commentRange)) {
                recorder.remove(commentRange.start, commentRange.end - commentRange.start);
            }
        });
    }
}
/**
 * Searches the source file for any `// import '${module}';` comments and removes them along with
 * any preceeding comments.
 *
 * Recent `ng new` invocations generate polyfills commented out and not used by default. Ex:
 * /**
 *  * IE11 requires the following for NgClass support on SVG elements
 *  *\/
 * // import 'classlist.js';  // Run `npm install --save classlist.js`.
 *
 * This function identifies any commented out import statements for the given module specifiers and
 * removes them along with immediately preceeding comments.
 *
 * @param recorder The recorder to remove from.
 * @param sourceFile The source file containing the commented `import` statements.
 * @param modules The module specifiers to remove.
 */
function removePolyfillImportComments(recorder, sourceFile, modules) {
    // Find all comment ranges in the source file.
    const commentRanges = getCommentRanges(sourceFile);
    // Find the indexes of comments which contain `import` statements for the given modules.
    const moduleImportCommentIndexes = filterIndex(commentRanges, ({ start, end }) => {
        const comment = getCommentText(sourceFile.getFullText().slice(start, end));
        return Array.from(modules.values()).some((module) => comment.startsWith(`import '${module}';`));
    });
    // Use the module import comment **and** it's preceding comment if present.
    const commentIndexesToRemove = moduleImportCommentIndexes.flatMap((index) => {
        if (index === 0) {
            return [0];
        }
        else {
            return [index - 1, index];
        }
    });
    // Get all the ranges for the comments to remove.
    const commentRangesToRemove = commentIndexesToRemove
        .map((index) => commentRanges[index])
        // Include leading newlines but **not** trailing newlines in order to leave appropriate space
        // between any remaining polyfills.
        .map((range) => includeLeadingNewLines(sourceFile, range))
        .filter((range) => !isProtectedComment(sourceFile, range));
    // Remove the comments.
    for (const { start, end } of commentRangesToRemove) {
        recorder.remove(start, end - start);
    }
}
/**
 * Returns whether a comment range is "protected", meaning it should **not** be deleted.
 *
 * There are two comments which are considered "protected":
 * 1. The file overview doc comment previously generated by `ng new`.
 * 2. The browser polyfills header (/***** BROWSER POLYFILLS *\/).
 */
function isProtectedComment(sourceFile, { start, end }) {
    const comment = getCommentText(sourceFile.getFullText().slice(start, end));
    const isFileOverviewDocComment = comment.startsWith('This file includes polyfills needed by Angular and is loaded before the app.');
    const isBrowserPolyfillsHeader = comment.startsWith('BROWSER POLYFILLS');
    return isFileOverviewDocComment || isBrowserPolyfillsHeader;
}
/** Returns all the comments in the given source file. */
function getCommentRanges(sourceFile) {
    const commentRanges = [];
    // Comments trailing the last node are also included in this.
    ts.forEachChild(sourceFile, (node) => {
        ts.forEachLeadingCommentRange(sourceFile.getFullText(), node.getFullStart(), (start, end) => {
            commentRanges.push({ start, end });
        });
    });
    return commentRanges;
}
/** Returns a `SourceRange` with any leading newlines' characters included if present. */
function includeLeadingNewLines(sourceFile, { start, end }) {
    const text = sourceFile.getFullText();
    while (start > 0) {
        if (start > 2 && text.slice(start - 2, start) === '\r\n') {
            // Preceeded by `\r\n`, include that.
            start -= 2;
        }
        else if (start > 1 && text[start - 1] === '\n') {
            // Preceeded by `\n`, include that.
            start--;
        }
        else {
            // Not preceeded by any newline characters, don't include anything else.
            break;
        }
    }
    return { start, end };
}
/** Returns a `SourceRange` with the trailing newline characters included if present. */
function includeTrailingNewLine(sourceFile, { start, end }) {
    const newline = sourceFile.getFullText().slice(end, end + 2);
    if (newline === '\r\n') {
        return { start, end: end + 2 };
    }
    else if (newline.startsWith('\n')) {
        return { start, end: end + 1 };
    }
    else {
        throw new Error('Expected comment to end in a newline character (either `\\n` or `\\r\\n`).');
    }
}
/**
 * Extracts the text from a comment. Attempts to remove any extraneous syntax and trims the content.
 */
function getCommentText(commentInput) {
    const comment = commentInput.trim();
    if (comment.startsWith('//')) {
        return comment.slice('//'.length).trim();
    }
    else if (comment.startsWith('/*')) {
        const withoutPrefix = comment.replace(/\/\*+/, '');
        const withoutSuffix = withoutPrefix.replace(/\*+\//, '');
        const withoutNewlineAsterisks = withoutSuffix.replace(/^\s*\*\s*/, '');
        return withoutNewlineAsterisks.trim();
    }
    else {
        throw new Error(`Expected a comment, but got: "${comment}".`);
    }
}
/** Like `Array.prototype.filter`, but returns the index of each item rather than its value. */
function filterIndex(items, filter) {
    return Array.from(items.entries())
        .filter(([_, item]) => filter(item))
        .map(([index]) => index);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcC1pZS1wb2x5ZmlsbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTMvZHJvcC1pZS1wb2x5ZmlsbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILDJEQUFpRztBQUNqRyw0REFBMEU7QUFDMUUsb0RBQTRCO0FBQzVCLHFHQUF1RjtBQUN2Riw2REFJb0M7QUFDcEMsdURBQTRFO0FBRTVFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXlDRztBQUNIO0lBQ0UsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEdBQXFCLEVBQUUsRUFBRTtRQUNqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFFckUsbURBQW1EO1FBQ25ELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ2xELEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDdkQsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFxQixDQUFDO1FBQzlDLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLFVBQVUsRUFBRTtZQUNqQyxJQUFBLDBDQUEyQixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztTQUN6QztRQUVELDhGQUE4RjtRQUM5RiwrRkFBK0Y7UUFDL0YsK0ZBQStGO1FBQy9GLDhGQUE4RjtRQUM5Riw4RkFBOEY7UUFDOUYsd0NBQXdDO1FBQ3hDLElB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Z2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSwgU2NoZW1hdGljQ29udGV4dCwgVHJlZSwgVXBkYXRlUmVjb3JkZXIsIGNoYWluIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uLy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtcbiAgTm9kZURlcGVuZGVuY3ksXG4gIGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSxcbiAgcmVtb3ZlUGFja2FnZUpzb25EZXBlbmRlbmN5LFxufSBmcm9tICcuLi8uLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBhbGxXb3Jrc3BhY2VUYXJnZXRzLCBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5cbi8qKlxuICogTWlncmF0ZXMgYWxsIHBvbHlmaWxscyBmaWxlcyBvZiBwcm9qZWN0cyB0byByZW1vdmUgdHdvIGRlcGVuZGVuY2llcyBvcmlnaW5hbGx5IG5lZWRlZCBieSBJbnRlcm5ldFxuICogRXhwbG9yZXIsIGJ1dCB3aGljaCBhcmUgbm8gbG9uZ2VyIG5lZWRlZCBub3cgdGhhdCBzdXBwb3J0IGZvciBJRSBoYXMgYmVlbiBkcm9wcGVkIChgY2xhc3NsaXN0LmpzYFxuICogYW5kIGB3ZWItYW5pbWF0aW9ucy1qc2ApLlxuICpcbiAqIFRoZSBwb2x5ZmlsbHMgZmlsZSBpbmNsdWRlcyBzaWRlLWVmZmVjdGZ1bCBpbXBvcnRzIG9mIHRoZXNlIGRlcGVuZGVuY2llcyB3aXRoIGNvbW1lbnRzIGFib3V0XG4gKiB0aGVpciB1c2FnZTpcbiAqXG4gKiBgYGBcbiAqIC8qKlxuICogICogSUUxMSByZXF1aXJlcyB0aGUgZm9sbG93aW5nIGZvciBOZ0NsYXNzIHN1cHBvcnQgb24gU1ZHIGVsZW1lbnRzXG4gKiAgKlxcL1xuICogaW1wb3J0ICdjbGFzc2xpc3QuanMnO1xuICpcbiAqIC8qKlxuICogICogV2ViIEFuaW1hdGlvbnMgYEBhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXIvYW5pbWF0aW9uc2BcbiAqICAqIE9ubHkgcmVxdWlyZWQgaWYgQW5pbWF0aW9uQnVpbGRlciBpcyB1c2VkIHdpdGhpbiB0aGUgYXBwbGljYXRpb24gYW5kIHVzaW5nIElFL0VkZ2Ugb3IgU2FmYXJpLlxuICogICogU3RhbmRhcmQgYW5pbWF0aW9uIHN1cHBvcnQgaW4gQW5ndWxhciBET0VTIE5PVCByZXF1aXJlIGFueSBwb2x5ZmlsbHMgKGFzIG9mIEFuZ3VsYXIgNi4wKS5cbiAqICAqXFwvXG4gKiBpbXBvcnQgJ3dlYi1hbmltYXRpb25zLWpzJztcbiAqIGBgYFxuICpcbiAqIFRoaXMgbWlncmF0aW9uIHJlbW92ZXMgdGhlIGBpbXBvcnRgIHN0YXRlbWVudHMgYXMgd2VsbCBhcyBhbnkgcHJlY2VlZGluZyBjb21tZW50cy4gSXQgYWxzb1xuICogcmVtb3ZlcyB0aGVzZSBkZXBlbmRlbmNpZXMgZnJvbSBgcGFja2FnZS5qc29uYCBpZiBwcmVzZW50IGFuZCBzY2hlZHVsZXMgYW4gYG5wbSBpbnN0YWxsYCB0YXNrIHRvXG4gKiByZW1vdmUgdGhlbSBmcm9tIGBub2RlX21vZHVsZXMvYC5cbiAqXG4gKiBBbHNvLCB0aGUgcG9seWZpbGxzIGZpbGUgaGFzIHByZXZpb3VzbHkgYmVlbiBnZW5lcmF0ZWQgd2l0aCB0aGVzZSBpbXBvcnRzIGNvbW1lbnRlZCBvdXQsIHRvIG5vdFxuICogaW5jbHVkZSB0aGUgZGVwZW5kZW5jaWVzIGJ5IGRlZmF1bHQsIGJ1dCBzdGlsbCBhbGxvdyB1c2VycyB0byBlYXNpbHkgdW5jb21tZW50IGFuZCBlbmFibGUgdGhlbVxuICogd2hlbiByZXF1aXJlZC4gU28gdGhlIG1pZ3JhdGlvbiBhbHNvIGxvb2tzIGZvcjpcbiAqXG4gKiBgYGBcbiAqIC8vIGltcG9ydCAnY2xhc3NsaXN0LmpzJzsgIC8vIFJ1biBgbnBtIGluc3RhbGwgLS1zYXZlIGNsYXNzbGlzdC5qc2AuXG4gKiAvLyBPUlxuICogLy8gaW1wb3J0ICd3ZWItYW5pbWF0aW9ucy1qcyc7ICAvLyBSdW4gYG5wbSBpbnN0YWxsIC0tc2F2ZSB3ZWItYW5pbWF0aW9ucy1qc2AuXG4gKiBgYGBcbiAqXG4gKiBBbmQgcmVtb3ZlcyB0aGVtIGFzIHdlbGwuIFRoaXMga2VlcHMgdGhlIHBvbHlmaWxscyBmaWxlcyBjbGVhbiBhbmQgdXAgdG8gZGF0ZS4gV2hpdGVzcGFjZSBpc1xuICogaGFuZGxlZCBieSBsZWF2aW5nIGFsbCB0cmFpbGluZyB3aGl0ZXNwYWNlIGFsb25lLCBhbmQgZGVsZXRpbmcgYWxsIHRoZSBsZWFkaW5nIG5ld2xpbmVzIHVudGlsIHRoZVxuICogcHJldmlvdXMgbm9uLWVtcHR5IGxpbmUgb2YgY29kZS4gVGhpcyBtZWFucyBhbnkgZXh0cmEgbGluZXMgYmVmb3JlIGEgcmVtb3ZlZCBwb2x5ZmlsbCBpcyBkcm9wcGVkLFxuICogd2hpbGUgYW55IGV4dHJhIGxpbmVzIGFmdGVyIGEgcG9seWZpbGwgYXJlIHJldGFpbmVkLiBUaGlzIHJvdWdobHkgY29ycmVsYXRlcyB0byBob3cgYSByZWFsXG4gKiBkZXZlbG9wZXIgbWlnaHQgd3JpdGUgc3VjaCBhIGZpbGUuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jICh0cmVlOiBUcmVlLCBjdHg6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBtb2R1bGVzVG9Ecm9wID0gbmV3IFNldChbJ2NsYXNzbGlzdC5qcycsICd3ZWItYW5pbWF0aW9ucy1qcyddKTtcblxuICAgIC8vIFJlbW92ZSBtb2R1bGVzIGZyb20gYHBhY2thZ2UuanNvbmAgZGVwZW5kZW5jaWVzLlxuICAgIGNvbnN0IG1vZHVsZURlcHMgPSBBcnJheS5mcm9tKG1vZHVsZXNUb0Ryb3AudmFsdWVzKCkpXG4gICAgICAubWFwKChtb2R1bGUpID0+IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSh0cmVlLCBtb2R1bGUpKVxuICAgICAgLmZpbHRlcigoZGVwKSA9PiAhIWRlcCkgYXMgTm9kZURlcGVuZGVuY3lbXTtcbiAgICBmb3IgKGNvbnN0IHsgbmFtZSB9IG9mIG1vZHVsZURlcHMpIHtcbiAgICAgIHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSh0cmVlLCBuYW1lKTtcbiAgICB9XG5cbiAgICAvLyBSdW4gYG5wbSBpbnN0YWxsYCBhZnRlciByZW1vdmFsLiBUaGlzIGlzbid0IHN0cmljdGx5IG5lY2Vzc2FyeSwgYXMga2VlcGluZyB0aGUgZGVwZW5kZW5jaWVzXG4gICAgLy8gaW4gYG5vZGVfbW9kdWxlcy9gIGRvZXNuJ3QgYnJlYWsgYW55dGhpbmcuIGhvd2V2ZXIgbm9uLXBvbHlmaWxsIHVzYWdlcyBvZiB0aGVzZSBkZXBlbmRlbmNpZXNcbiAgICAvLyB3aWxsIHdvcmsgd2hpbGUgdGhleSBhcmUgaW4gYG5vZGVfbW9kdWxlcy9gIGJ1dCB0aGVuIGJyZWFrIG9uIHRoZSBuZXh0IGBucG0gaW5zdGFsbGAuIElmIGFueVxuICAgIC8vIHN1Y2ggdXNhZ2VzIGV4aXN0LCBpdCBpcyBiZXR0ZXIgZm9yIHRoZW0gdG8gZmFpbCBpbW1lZGlhdGVseSBhZnRlciB0aGUgbWlncmF0aW9uIGluc3RlYWQgb2ZcbiAgICAvLyB0aGUgbmV4dCB0aW1lIHRoZSB1c2VyIGhhcHBlbnMgdG8gYG5wbSBpbnN0YWxsYC4gQXMgYW4gb3B0aW1pemF0aW9uLCBvbmx5IHJ1biBgbnBtIGluc3RhbGxgXG4gICAgLy8gaWYgYSBkZXBlbmRlbmN5IHdhcyBhY3R1YWxseSByZW1vdmVkLlxuICAgIGlmIChtb2R1bGVEZXBzLmxlbmd0aCA+IDApIHtcbiAgICAgIGN0eC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuICAgIH1cblxuICAgIC8vIEZpbmQgYWxsIHRoZSBwb2x5ZmlsbCBmaWxlcyBpbiB0aGUgd29ya3NwYWNlLlxuICAgIGNvbnN0IHdrc3AgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gICAgY29uc3QgcG9seWZpbGxzID0gQXJyYXkuZnJvbShhbGxXb3Jrc3BhY2VUYXJnZXRzKHdrc3ApKVxuICAgICAgLmZpbHRlcigoW18sIHRhcmdldF0pID0+ICEhdGFyZ2V0Lm9wdGlvbnM/LnBvbHlmaWxscylcbiAgICAgIC5tYXAoKFtfLCB0YXJnZXRdKSA9PiB0YXJnZXQub3B0aW9ucz8ucG9seWZpbGxzIGFzIHN0cmluZyk7XG4gICAgY29uc3QgdW5pcXVlUG9seWZpbGxzID0gQXJyYXkuZnJvbShuZXcgU2V0KHBvbHlmaWxscykpO1xuXG4gICAgLy8gRHJvcCB0aGUgbW9kdWxlcyBmcm9tIGVhY2ggcG9seWZpbGwuXG4gICAgcmV0dXJuIGNoYWluKHVuaXF1ZVBvbHlmaWxscy5tYXAoKHBvbHlmaWxsUGF0aCkgPT4gZHJvcE1vZHVsZXMocG9seWZpbGxQYXRoLCBtb2R1bGVzVG9Ecm9wKSkpO1xuICB9O1xufVxuXG4vKiogUHJvY2Vzc2VzIHRoZSBnaXZlbiBwb2x5ZmlsbCBwYXRoIGFuZCByZW1vdmVzIGFueSBgaW1wb3J0YCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlcy4gKi9cbmZ1bmN0aW9uIGRyb3BNb2R1bGVzKHBvbHlmaWxsUGF0aDogc3RyaW5nLCBtb2R1bGVzOiBTZXQ8c3RyaW5nPik6IFJ1bGUge1xuICByZXR1cm4gKHRyZWU6IFRyZWUsIGN0eDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHNvdXJjZUNvbnRlbnQgPSB0cmVlLnJlYWQocG9seWZpbGxQYXRoKTtcbiAgICBpZiAoIXNvdXJjZUNvbnRlbnQpIHtcbiAgICAgIGN0eC5sb2dnZXIud2FybihcbiAgICAgICAgJ1BvbHlmaWxsIHBhdGggZnJvbSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBjb3VsZCBub3QgYmUgcmVhZCwgZG9lcyB0aGUgZmlsZSBleGlzdD8nLFxuICAgICAgICB7IHBvbHlmaWxsUGF0aCB9LFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjb250ZW50ID0gc291cmNlQ29udGVudC50b1N0cmluZygndXRmOCcpO1xuXG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICBwb2x5ZmlsbFBhdGgsXG4gICAgICBjb250ZW50LnJlcGxhY2UoL15cXHVGRUZGLywgJycpLFxuICAgICAgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCxcbiAgICAgIHRydWUgLyogc2V0UGFyZW50Tm9kZXMgKi8sXG4gICAgKTtcblxuICAgIC8vIFJlbW92ZSBwb2x5ZmlsbHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUgc3BlY2lmaWVycy5cbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUocG9seWZpbGxQYXRoKTtcbiAgICByZW1vdmVQb2x5ZmlsbEltcG9ydHMocmVjb3JkZXIsIHNvdXJjZUZpbGUsIG1vZHVsZXMpO1xuICAgIHJlbW92ZVBvbHlmaWxsSW1wb3J0Q29tbWVudHMocmVjb3JkZXIsIHNvdXJjZUZpbGUsIG1vZHVsZXMpO1xuICAgIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiB0cmVlO1xuICB9O1xufVxuXG4vKipcbiAqIFNlYXJjaGVzIHRoZSBzb3VyY2UgZmlsZSBmb3IgYW55IGBpbXBvcnQgJyR7bW9kdWxlfSc7YCBzdGF0ZW1lbnRzIGFuZCByZW1vdmVzIHRoZW0gYWxvbmcgd2l0aFxuICogYW55IHByZWNlZWRpbmcgY29tbWVudHMuXG4gKlxuICogQHBhcmFtIHJlY29yZGVyIFRoZSByZWNvcmRlciB0byByZW1vdmUgZnJvbS5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSBjb250YWluaW5nIHRoZSBgaW1wb3J0YCBzdGF0ZW1lbnRzLlxuICogQHBhcmFtIG1vZHVsZXMgVGhlIG1vZHVsZSBzcGVjaWZpZXJzIHRvIHJlbW92ZS5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlUG9seWZpbGxJbXBvcnRzKFxuICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gIG1vZHVsZXM6IFNldDxzdHJpbmc+LFxuKTogdm9pZCB7XG4gIGNvbnN0IGltcG9ydHMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMuZmlsdGVyKChzdG10KSA9PlxuICAgIHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCksXG4gICkgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb25bXTtcblxuICBmb3IgKGNvbnN0IGkgb2YgaW1wb3J0cykge1xuICAgIC8vIFNob3VsZCBhbHdheXMgYmUgYSBzdHJpbmcgbGl0ZXJhbC5cbiAgICBhc3NlcnQodHMuaXNTdHJpbmdMaXRlcmFsKGkubW9kdWxlU3BlY2lmaWVyKSk7XG5cbiAgICAvLyBJZ25vcmUgb3RoZXIgbW9kdWxlcy5cbiAgICBpZiAoIW1vZHVsZXMuaGFzKGkubW9kdWxlU3BlY2lmaWVyLnRleHQpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgdGhlIG1vZHVsZSBpbXBvcnQgc3RhdGVtZW50LlxuICAgIHJlY29yZGVyLnJlbW92ZShpLmdldFN0YXJ0KCksIGkuZ2V0V2lkdGgoKSk7XG5cbiAgICAvLyBSZW1vdmUgbGVhZGluZyBjb21tZW50cy4gXCJMZWFkaW5nXCIgY29tbWVudHMgc2VlbXMgdG8gaW5jbHVkZSBjb21tZW50cyB3aXRoaW4gdGhlIG5vZGUsIHNvXG4gICAgLy8gZXZlbiB0aG91Z2ggYGdldEZ1bGxUZXh0KClgIHJldHVybnMgYW4gaW5kZXggYmVmb3JlIGFueSBsZWFkaW5nIGNvbW1lbnRzIHRvIGEgbm9kZSwgaXQgd2lsbFxuICAgIC8vIHN0aWxsIGZpbmQgYW5kIHByb2Nlc3MgdGhlbS5cbiAgICB0cy5mb3JFYWNoTGVhZGluZ0NvbW1lbnRSYW5nZShcbiAgICAgIHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKSxcbiAgICAgIGkuZ2V0RnVsbFN0YXJ0KCksXG4gICAgICAoc3RhcnQsIGVuZCwgXywgaGFzVHJhaWxpbmdOZXdMaW5lKSA9PiB7XG4gICAgICAgIC8vIEluY2x1ZGUgYm90aCBsZWFkaW5nICoqYW5kKiogdHJhaWxpbmcgbmV3bGluZXMgYmVjYXVzZSB0aGVzZSBhcmUgY29tbWVudHMgdGhhdCAqcHJlY2VlZCpcbiAgICAgICAgLy8gdGhlIGBpbXBvcnRgIHN0YXRlbWVudCwgc28gXCJ0cmFpbGluZ1wiIG5ld2xpbmVzIGhlcmUgYXJlIGFjdHVhbGx5IGluLWJldHdlZW4gdGhlIGBpbXBvcnRgXG4gICAgICAgIC8vIGFuZCBpdCdzIGxlYWRpbmcgY29tbWVudHMuXG4gICAgICAgIGNvbnN0IGNvbW1lbnRSYW5nZVdpdGhvdXROZXdMaW5lcyA9IHsgc3RhcnQsIGVuZCB9O1xuICAgICAgICBjb25zdCBjb21tZW50UmFuZ2VXaXRoVHJhaWxpbmdOZXdMaW5lcyA9IGhhc1RyYWlsaW5nTmV3TGluZVxuICAgICAgICAgID8gaW5jbHVkZVRyYWlsaW5nTmV3TGluZShzb3VyY2VGaWxlLCBjb21tZW50UmFuZ2VXaXRob3V0TmV3TGluZXMpXG4gICAgICAgICAgOiBjb21tZW50UmFuZ2VXaXRob3V0TmV3TGluZXM7XG4gICAgICAgIGNvbnN0IGNvbW1lbnRSYW5nZSA9IGluY2x1ZGVMZWFkaW5nTmV3TGluZXMoc291cmNlRmlsZSwgY29tbWVudFJhbmdlV2l0aFRyYWlsaW5nTmV3TGluZXMpO1xuXG4gICAgICAgIGlmICghaXNQcm90ZWN0ZWRDb21tZW50KHNvdXJjZUZpbGUsIGNvbW1lbnRSYW5nZSkpIHtcbiAgICAgICAgICByZWNvcmRlci5yZW1vdmUoY29tbWVudFJhbmdlLnN0YXJ0LCBjb21tZW50UmFuZ2UuZW5kIC0gY29tbWVudFJhbmdlLnN0YXJ0KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICApO1xuICB9XG59XG5cbi8qKlxuICogU2VhcmNoZXMgdGhlIHNvdXJjZSBmaWxlIGZvciBhbnkgYC8vIGltcG9ydCAnJHttb2R1bGV9JztgIGNvbW1lbnRzIGFuZCByZW1vdmVzIHRoZW0gYWxvbmcgd2l0aFxuICogYW55IHByZWNlZWRpbmcgY29tbWVudHMuXG4gKlxuICogUmVjZW50IGBuZyBuZXdgIGludm9jYXRpb25zIGdlbmVyYXRlIHBvbHlmaWxscyBjb21tZW50ZWQgb3V0IGFuZCBub3QgdXNlZCBieSBkZWZhdWx0LiBFeDpcbiAqIC8qKlxuICogICogSUUxMSByZXF1aXJlcyB0aGUgZm9sbG93aW5nIGZvciBOZ0NsYXNzIHN1cHBvcnQgb24gU1ZHIGVsZW1lbnRzXG4gKiAgKlxcL1xuICogLy8gaW1wb3J0ICdjbGFzc2xpc3QuanMnOyAgLy8gUnVuIGBucG0gaW5zdGFsbCAtLXNhdmUgY2xhc3NsaXN0LmpzYC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGlkZW50aWZpZXMgYW55IGNvbW1lbnRlZCBvdXQgaW1wb3J0IHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUgc3BlY2lmaWVycyBhbmRcbiAqIHJlbW92ZXMgdGhlbSBhbG9uZyB3aXRoIGltbWVkaWF0ZWx5IHByZWNlZWRpbmcgY29tbWVudHMuXG4gKlxuICogQHBhcmFtIHJlY29yZGVyIFRoZSByZWNvcmRlciB0byByZW1vdmUgZnJvbS5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSBjb250YWluaW5nIHRoZSBjb21tZW50ZWQgYGltcG9ydGAgc3RhdGVtZW50cy5cbiAqIEBwYXJhbSBtb2R1bGVzIFRoZSBtb2R1bGUgc3BlY2lmaWVycyB0byByZW1vdmUuXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZVBvbHlmaWxsSW1wb3J0Q29tbWVudHMoXG4gIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlczogU2V0PHN0cmluZz4sXG4pOiB2b2lkIHtcbiAgLy8gRmluZCBhbGwgY29tbWVudCByYW5nZXMgaW4gdGhlIHNvdXJjZSBmaWxlLlxuICBjb25zdCBjb21tZW50UmFuZ2VzID0gZ2V0Q29tbWVudFJhbmdlcyhzb3VyY2VGaWxlKTtcblxuICAvLyBGaW5kIHRoZSBpbmRleGVzIG9mIGNvbW1lbnRzIHdoaWNoIGNvbnRhaW4gYGltcG9ydGAgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZXMuXG4gIGNvbnN0IG1vZHVsZUltcG9ydENvbW1lbnRJbmRleGVzID0gZmlsdGVySW5kZXgoY29tbWVudFJhbmdlcywgKHsgc3RhcnQsIGVuZCB9KSA9PiB7XG4gICAgY29uc3QgY29tbWVudCA9IGdldENvbW1lbnRUZXh0KHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKS5zbGljZShzdGFydCwgZW5kKSk7XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShtb2R1bGVzLnZhbHVlcygpKS5zb21lKChtb2R1bGUpID0+IGNvbW1lbnQuc3RhcnRzV2l0aChgaW1wb3J0ICcke21vZHVsZX0nO2ApKTtcbiAgfSk7XG5cbiAgLy8gVXNlIHRoZSBtb2R1bGUgaW1wb3J0IGNvbW1lbnQgKiphbmQqKiBpdCdzIHByZWNlZGluZyBjb21tZW50IGlmIHByZXNlbnQuXG4gIGNvbnN0IGNvbW1lbnRJbmRleGVzVG9SZW1vdmUgPSBtb2R1bGVJbXBvcnRDb21tZW50SW5kZXhlcy5mbGF0TWFwKChpbmRleCkgPT4ge1xuICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtpbmRleCAtIDEsIGluZGV4XTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdldCBhbGwgdGhlIHJhbmdlcyBmb3IgdGhlIGNvbW1lbnRzIHRvIHJlbW92ZS5cbiAgY29uc3QgY29tbWVudFJhbmdlc1RvUmVtb3ZlID0gY29tbWVudEluZGV4ZXNUb1JlbW92ZVxuICAgIC5tYXAoKGluZGV4KSA9PiBjb21tZW50UmFuZ2VzW2luZGV4XSlcbiAgICAvLyBJbmNsdWRlIGxlYWRpbmcgbmV3bGluZXMgYnV0ICoqbm90KiogdHJhaWxpbmcgbmV3bGluZXMgaW4gb3JkZXIgdG8gbGVhdmUgYXBwcm9wcmlhdGUgc3BhY2VcbiAgICAvLyBiZXR3ZWVuIGFueSByZW1haW5pbmcgcG9seWZpbGxzLlxuICAgIC5tYXAoKHJhbmdlKSA9PiBpbmNsdWRlTGVhZGluZ05ld0xpbmVzKHNvdXJjZUZpbGUsIHJhbmdlKSlcbiAgICAuZmlsdGVyKChyYW5nZSkgPT4gIWlzUHJvdGVjdGVkQ29tbWVudChzb3VyY2VGaWxlLCByYW5nZSkpO1xuXG4gIC8vIFJlbW92ZSB0aGUgY29tbWVudHMuXG4gIGZvciAoY29uc3QgeyBzdGFydCwgZW5kIH0gb2YgY29tbWVudFJhbmdlc1RvUmVtb3ZlKSB7XG4gICAgcmVjb3JkZXIucmVtb3ZlKHN0YXJ0LCBlbmQgLSBzdGFydCk7XG4gIH1cbn1cblxuLyoqIFJlcHJlc2VudHMgYSBzZWdtZW50IG9mIHRleHQgaW4gYSBzb3VyY2UgZmlsZSBzdGFydGluZyBhbmQgZW5kaW5nIGF0IHRoZSBnaXZlbiBvZmZzZXRzLiAqL1xuaW50ZXJmYWNlIFNvdXJjZVJhbmdlIHtcbiAgc3RhcnQ6IG51bWJlcjtcbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIGEgY29tbWVudCByYW5nZSBpcyBcInByb3RlY3RlZFwiLCBtZWFuaW5nIGl0IHNob3VsZCAqKm5vdCoqIGJlIGRlbGV0ZWQuXG4gKlxuICogVGhlcmUgYXJlIHR3byBjb21tZW50cyB3aGljaCBhcmUgY29uc2lkZXJlZCBcInByb3RlY3RlZFwiOlxuICogMS4gVGhlIGZpbGUgb3ZlcnZpZXcgZG9jIGNvbW1lbnQgcHJldmlvdXNseSBnZW5lcmF0ZWQgYnkgYG5nIG5ld2AuXG4gKiAyLiBUaGUgYnJvd3NlciBwb2x5ZmlsbHMgaGVhZGVyICgvKioqKiogQlJPV1NFUiBQT0xZRklMTFMgKlxcLykuXG4gKi9cbmZ1bmN0aW9uIGlzUHJvdGVjdGVkQ29tbWVudChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCB7IHN0YXJ0LCBlbmQgfTogU291cmNlUmFuZ2UpOiBib29sZWFuIHtcbiAgY29uc3QgY29tbWVudCA9IGdldENvbW1lbnRUZXh0KHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKS5zbGljZShzdGFydCwgZW5kKSk7XG5cbiAgY29uc3QgaXNGaWxlT3ZlcnZpZXdEb2NDb21tZW50ID0gY29tbWVudC5zdGFydHNXaXRoKFxuICAgICdUaGlzIGZpbGUgaW5jbHVkZXMgcG9seWZpbGxzIG5lZWRlZCBieSBBbmd1bGFyIGFuZCBpcyBsb2FkZWQgYmVmb3JlIHRoZSBhcHAuJyxcbiAgKTtcbiAgY29uc3QgaXNCcm93c2VyUG9seWZpbGxzSGVhZGVyID0gY29tbWVudC5zdGFydHNXaXRoKCdCUk9XU0VSIFBPTFlGSUxMUycpO1xuXG4gIHJldHVybiBpc0ZpbGVPdmVydmlld0RvY0NvbW1lbnQgfHwgaXNCcm93c2VyUG9seWZpbGxzSGVhZGVyO1xufVxuXG4vKiogUmV0dXJucyBhbGwgdGhlIGNvbW1lbnRzIGluIHRoZSBnaXZlbiBzb3VyY2UgZmlsZS4gKi9cbmZ1bmN0aW9uIGdldENvbW1lbnRSYW5nZXMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZVJhbmdlW10ge1xuICBjb25zdCBjb21tZW50UmFuZ2VzID0gW10gYXMgU291cmNlUmFuZ2VbXTtcblxuICAvLyBDb21tZW50cyB0cmFpbGluZyB0aGUgbGFzdCBub2RlIGFyZSBhbHNvIGluY2x1ZGVkIGluIHRoaXMuXG4gIHRzLmZvckVhY2hDaGlsZChzb3VyY2VGaWxlLCAobm9kZSkgPT4ge1xuICAgIHRzLmZvckVhY2hMZWFkaW5nQ29tbWVudFJhbmdlKHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKSwgbm9kZS5nZXRGdWxsU3RhcnQoKSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgIGNvbW1lbnRSYW5nZXMucHVzaCh7IHN0YXJ0LCBlbmQgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBjb21tZW50UmFuZ2VzO1xufVxuXG4vKiogUmV0dXJucyBhIGBTb3VyY2VSYW5nZWAgd2l0aCBhbnkgbGVhZGluZyBuZXdsaW5lcycgY2hhcmFjdGVycyBpbmNsdWRlZCBpZiBwcmVzZW50LiAqL1xuZnVuY3Rpb24gaW5jbHVkZUxlYWRpbmdOZXdMaW5lcyhcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgeyBzdGFydCwgZW5kIH06IFNvdXJjZVJhbmdlLFxuKTogU291cmNlUmFuZ2Uge1xuICBjb25zdCB0ZXh0ID0gc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpO1xuICB3aGlsZSAoc3RhcnQgPiAwKSB7XG4gICAgaWYgKHN0YXJ0ID4gMiAmJiB0ZXh0LnNsaWNlKHN0YXJ0IC0gMiwgc3RhcnQpID09PSAnXFxyXFxuJykge1xuICAgICAgLy8gUHJlY2VlZGVkIGJ5IGBcXHJcXG5gLCBpbmNsdWRlIHRoYXQuXG4gICAgICBzdGFydCAtPSAyO1xuICAgIH0gZWxzZSBpZiAoc3RhcnQgPiAxICYmIHRleHRbc3RhcnQgLSAxXSA9PT0gJ1xcbicpIHtcbiAgICAgIC8vIFByZWNlZWRlZCBieSBgXFxuYCwgaW5jbHVkZSB0aGF0LlxuICAgICAgc3RhcnQtLTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm90IHByZWNlZWRlZCBieSBhbnkgbmV3bGluZSBjaGFyYWN0ZXJzLCBkb24ndCBpbmNsdWRlIGFueXRoaW5nIGVsc2UuXG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyBzdGFydCwgZW5kIH07XG59XG5cbi8qKiBSZXR1cm5zIGEgYFNvdXJjZVJhbmdlYCB3aXRoIHRoZSB0cmFpbGluZyBuZXdsaW5lIGNoYXJhY3RlcnMgaW5jbHVkZWQgaWYgcHJlc2VudC4gKi9cbmZ1bmN0aW9uIGluY2x1ZGVUcmFpbGluZ05ld0xpbmUoXG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gIHsgc3RhcnQsIGVuZCB9OiBTb3VyY2VSYW5nZSxcbik6IFNvdXJjZVJhbmdlIHtcbiAgY29uc3QgbmV3bGluZSA9IHNvdXJjZUZpbGUuZ2V0RnVsbFRleHQoKS5zbGljZShlbmQsIGVuZCArIDIpO1xuICBpZiAobmV3bGluZSA9PT0gJ1xcclxcbicpIHtcbiAgICByZXR1cm4geyBzdGFydCwgZW5kOiBlbmQgKyAyIH07XG4gIH0gZWxzZSBpZiAobmV3bGluZS5zdGFydHNXaXRoKCdcXG4nKSkge1xuICAgIHJldHVybiB7IHN0YXJ0LCBlbmQ6IGVuZCArIDEgfTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIGNvbW1lbnQgdG8gZW5kIGluIGEgbmV3bGluZSBjaGFyYWN0ZXIgKGVpdGhlciBgXFxcXG5gIG9yIGBcXFxcclxcXFxuYCkuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgdGV4dCBmcm9tIGEgY29tbWVudC4gQXR0ZW1wdHMgdG8gcmVtb3ZlIGFueSBleHRyYW5lb3VzIHN5bnRheCBhbmQgdHJpbXMgdGhlIGNvbnRlbnQuXG4gKi9cbmZ1bmN0aW9uIGdldENvbW1lbnRUZXh0KGNvbW1lbnRJbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWVudCA9IGNvbW1lbnRJbnB1dC50cmltKCk7XG4gIGlmIChjb21tZW50LnN0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICByZXR1cm4gY29tbWVudC5zbGljZSgnLy8nLmxlbmd0aCkudHJpbSgpO1xuICB9IGVsc2UgaWYgKGNvbW1lbnQuc3RhcnRzV2l0aCgnLyonKSkge1xuICAgIGNvbnN0IHdpdGhvdXRQcmVmaXggPSBjb21tZW50LnJlcGxhY2UoL1xcL1xcKisvLCAnJyk7XG4gICAgY29uc3Qgd2l0aG91dFN1ZmZpeCA9IHdpdGhvdXRQcmVmaXgucmVwbGFjZSgvXFwqK1xcLy8sICcnKTtcbiAgICBjb25zdCB3aXRob3V0TmV3bGluZUFzdGVyaXNrcyA9IHdpdGhvdXRTdWZmaXgucmVwbGFjZSgvXlxccypcXCpcXHMqLywgJycpO1xuXG4gICAgcmV0dXJuIHdpdGhvdXROZXdsaW5lQXN0ZXJpc2tzLnRyaW0oKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGEgY29tbWVudCwgYnV0IGdvdDogXCIke2NvbW1lbnR9XCIuYCk7XG4gIH1cbn1cblxuLyoqIExpa2UgYEFycmF5LnByb3RvdHlwZS5maWx0ZXJgLCBidXQgcmV0dXJucyB0aGUgaW5kZXggb2YgZWFjaCBpdGVtIHJhdGhlciB0aGFuIGl0cyB2YWx1ZS4gKi9cbmZ1bmN0aW9uIGZpbHRlckluZGV4PEl0ZW0+KGl0ZW1zOiBJdGVtW10sIGZpbHRlcjogKGl0ZW06IEl0ZW0pID0+IGJvb2xlYW4pOiBudW1iZXJbXSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGl0ZW1zLmVudHJpZXMoKSlcbiAgICAuZmlsdGVyKChbXywgaXRlbV0pID0+IGZpbHRlcihpdGVtKSlcbiAgICAubWFwKChbaW5kZXhdKSA9PiBpbmRleCk7XG59XG4iXX0=