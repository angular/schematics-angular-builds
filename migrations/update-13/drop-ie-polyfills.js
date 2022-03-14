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
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcC1pZS1wb2x5ZmlsbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTMvZHJvcC1pZS1wb2x5ZmlsbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkRBQWlHO0FBQ2pHLDREQUEwRTtBQUMxRSxvREFBNEI7QUFDNUIscUdBQXVGO0FBQ3ZGLDZEQUlvQztBQUNwQyx1REFBNEU7QUFFNUU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUNHO0FBQ0g7SUFDRSxPQUFPLEtBQUssRUFBRSxJQUFVLEVBQUUsR0FBcUIsRUFBRSxFQUFFO1FBQ2pELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUVyRSxtREFBbUQ7UUFDbkQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDbEQsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQzthQUN2RCxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQXFCLENBQUM7UUFDOUMsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksVUFBVSxFQUFFO1lBQ2pDLElBQUEsMENBQTJCLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3pDO1FBRUQsOEZBQThGO1FBQzlGLCtGQUErRjtRQUMvRiwrRkFBK0Y7UUFDL0YsOEZBQThGO1FBQzlGLDhGQUE4RjtRQUM5Rix3Q0FBd0M7UUFDeEMsSUFBSSxV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TExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlLCBTY2hlbWF0aWNDb250ZXh0LCBUcmVlLCBVcGRhdGVSZWNvcmRlciwgY2hhaW4gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0IGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQge1xuICBOb2RlRGVwZW5kZW5jeSxcbiAgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5LFxuICByZW1vdmVQYWNrYWdlSnNvbkRlcGVuZGVuY3ksXG59IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGFsbFdvcmtzcGFjZVRhcmdldHMsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcblxuLyoqXG4gKiBNaWdyYXRlcyBhbGwgcG9seWZpbGxzIGZpbGVzIG9mIHByb2plY3RzIHRvIHJlbW92ZSB0d28gZGVwZW5kZW5jaWVzIG9yaWdpbmFsbHkgbmVlZGVkIGJ5IEludGVybmV0XG4gKiBFeHBsb3JlciwgYnV0IHdoaWNoIGFyZSBubyBsb25nZXIgbmVlZGVkIG5vdyB0aGF0IHN1cHBvcnQgZm9yIElFIGhhcyBiZWVuIGRyb3BwZWQgKGBjbGFzc2xpc3QuanNgXG4gKiBhbmQgYHdlYi1hbmltYXRpb25zLWpzYCkuXG4gKlxuICogVGhlIHBvbHlmaWxscyBmaWxlIGluY2x1ZGVzIHNpZGUtZWZmZWN0ZnVsIGltcG9ydHMgb2YgdGhlc2UgZGVwZW5kZW5jaWVzIHdpdGggY29tbWVudHMgYWJvdXRcbiAqIHRoZWlyIHVzYWdlOlxuICpcbiAqIGBgYFxuICogLyoqXG4gKiAgKiBJRTExIHJlcXVpcmVzIHRoZSBmb2xsb3dpbmcgZm9yIE5nQ2xhc3Mgc3VwcG9ydCBvbiBTVkcgZWxlbWVudHNcbiAqICAqXFwvXG4gKiBpbXBvcnQgJ2NsYXNzbGlzdC5qcyc7XG4gKlxuICogLyoqXG4gKiAgKiBXZWIgQW5pbWF0aW9ucyBgQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3Nlci9hbmltYXRpb25zYFxuICogICogT25seSByZXF1aXJlZCBpZiBBbmltYXRpb25CdWlsZGVyIGlzIHVzZWQgd2l0aGluIHRoZSBhcHBsaWNhdGlvbiBhbmQgdXNpbmcgSUUvRWRnZSBvciBTYWZhcmkuXG4gKiAgKiBTdGFuZGFyZCBhbmltYXRpb24gc3VwcG9ydCBpbiBBbmd1bGFyIERPRVMgTk9UIHJlcXVpcmUgYW55IHBvbHlmaWxscyAoYXMgb2YgQW5ndWxhciA2LjApLlxuICogICpcXC9cbiAqIGltcG9ydCAnd2ViLWFuaW1hdGlvbnMtanMnO1xuICogYGBgXG4gKlxuICogVGhpcyBtaWdyYXRpb24gcmVtb3ZlcyB0aGUgYGltcG9ydGAgc3RhdGVtZW50cyBhcyB3ZWxsIGFzIGFueSBwcmVjZWVkaW5nIGNvbW1lbnRzLiBJdCBhbHNvXG4gKiByZW1vdmVzIHRoZXNlIGRlcGVuZGVuY2llcyBmcm9tIGBwYWNrYWdlLmpzb25gIGlmIHByZXNlbnQgYW5kIHNjaGVkdWxlcyBhbiBgbnBtIGluc3RhbGxgIHRhc2sgdG9cbiAqIHJlbW92ZSB0aGVtIGZyb20gYG5vZGVfbW9kdWxlcy9gLlxuICpcbiAqIEFsc28sIHRoZSBwb2x5ZmlsbHMgZmlsZSBoYXMgcHJldmlvdXNseSBiZWVuIGdlbmVyYXRlZCB3aXRoIHRoZXNlIGltcG9ydHMgY29tbWVudGVkIG91dCwgdG8gbm90XG4gKiBpbmNsdWRlIHRoZSBkZXBlbmRlbmNpZXMgYnkgZGVmYXVsdCwgYnV0IHN0aWxsIGFsbG93IHVzZXJzIHRvIGVhc2lseSB1bmNvbW1lbnQgYW5kIGVuYWJsZSB0aGVtXG4gKiB3aGVuIHJlcXVpcmVkLiBTbyB0aGUgbWlncmF0aW9uIGFsc28gbG9va3MgZm9yOlxuICpcbiAqIGBgYFxuICogLy8gaW1wb3J0ICdjbGFzc2xpc3QuanMnOyAgLy8gUnVuIGBucG0gaW5zdGFsbCAtLXNhdmUgY2xhc3NsaXN0LmpzYC5cbiAqIC8vIE9SXG4gKiAvLyBpbXBvcnQgJ3dlYi1hbmltYXRpb25zLWpzJzsgIC8vIFJ1biBgbnBtIGluc3RhbGwgLS1zYXZlIHdlYi1hbmltYXRpb25zLWpzYC5cbiAqIGBgYFxuICpcbiAqIEFuZCByZW1vdmVzIHRoZW0gYXMgd2VsbC4gVGhpcyBrZWVwcyB0aGUgcG9seWZpbGxzIGZpbGVzIGNsZWFuIGFuZCB1cCB0byBkYXRlLiBXaGl0ZXNwYWNlIGlzXG4gKiBoYW5kbGVkIGJ5IGxlYXZpbmcgYWxsIHRyYWlsaW5nIHdoaXRlc3BhY2UgYWxvbmUsIGFuZCBkZWxldGluZyBhbGwgdGhlIGxlYWRpbmcgbmV3bGluZXMgdW50aWwgdGhlXG4gKiBwcmV2aW91cyBub24tZW1wdHkgbGluZSBvZiBjb2RlLiBUaGlzIG1lYW5zIGFueSBleHRyYSBsaW5lcyBiZWZvcmUgYSByZW1vdmVkIHBvbHlmaWxsIGlzIGRyb3BwZWQsXG4gKiB3aGlsZSBhbnkgZXh0cmEgbGluZXMgYWZ0ZXIgYSBwb2x5ZmlsbCBhcmUgcmV0YWluZWQuIFRoaXMgcm91Z2hseSBjb3JyZWxhdGVzIHRvIGhvdyBhIHJlYWxcbiAqIGRldmVsb3BlciBtaWdodCB3cml0ZSBzdWNoIGEgZmlsZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKHRyZWU6IFRyZWUsIGN0eDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG1vZHVsZXNUb0Ryb3AgPSBuZXcgU2V0KFsnY2xhc3NsaXN0LmpzJywgJ3dlYi1hbmltYXRpb25zLWpzJ10pO1xuXG4gICAgLy8gUmVtb3ZlIG1vZHVsZXMgZnJvbSBgcGFja2FnZS5qc29uYCBkZXBlbmRlbmNpZXMuXG4gICAgY29uc3QgbW9kdWxlRGVwcyA9IEFycmF5LmZyb20obW9kdWxlc1RvRHJvcC52YWx1ZXMoKSlcbiAgICAgIC5tYXAoKG1vZHVsZSkgPT4gZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KHRyZWUsIG1vZHVsZSkpXG4gICAgICAuZmlsdGVyKChkZXApID0+ICEhZGVwKSBhcyBOb2RlRGVwZW5kZW5jeVtdO1xuICAgIGZvciAoY29uc3QgeyBuYW1lIH0gb2YgbW9kdWxlRGVwcykge1xuICAgICAgcmVtb3ZlUGFja2FnZUpzb25EZXBlbmRlbmN5KHRyZWUsIG5hbWUpO1xuICAgIH1cblxuICAgIC8vIFJ1biBgbnBtIGluc3RhbGxgIGFmdGVyIHJlbW92YWwuIFRoaXMgaXNuJ3Qgc3RyaWN0bHkgbmVjZXNzYXJ5LCBhcyBrZWVwaW5nIHRoZSBkZXBlbmRlbmNpZXNcbiAgICAvLyBpbiBgbm9kZV9tb2R1bGVzL2AgZG9lc24ndCBicmVhayBhbnl0aGluZy4gaG93ZXZlciBub24tcG9seWZpbGwgdXNhZ2VzIG9mIHRoZXNlIGRlcGVuZGVuY2llc1xuICAgIC8vIHdpbGwgd29yayB3aGlsZSB0aGV5IGFyZSBpbiBgbm9kZV9tb2R1bGVzL2AgYnV0IHRoZW4gYnJlYWsgb24gdGhlIG5leHQgYG5wbSBpbnN0YWxsYC4gSWYgYW55XG4gICAgLy8gc3VjaCB1c2FnZXMgZXhpc3QsIGl0IGlzIGJldHRlciBmb3IgdGhlbSB0byBmYWlsIGltbWVkaWF0ZWx5IGFmdGVyIHRoZSBtaWdyYXRpb24gaW5zdGVhZCBvZlxuICAgIC8vIHRoZSBuZXh0IHRpbWUgdGhlIHVzZXIgaGFwcGVucyB0byBgbnBtIGluc3RhbGxgLiBBcyBhbiBvcHRpbWl6YXRpb24sIG9ubHkgcnVuIGBucG0gaW5zdGFsbGBcbiAgICAvLyBpZiBhIGRlcGVuZGVuY3kgd2FzIGFjdHVhbGx5IHJlbW92ZWQuXG4gICAgaWYgKG1vZHVsZURlcHMubGVuZ3RoID4gMCkge1xuICAgICAgY3R4LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgdGhlIHBvbHlmaWxsIGZpbGVzIGluIHRoZSB3b3Jrc3BhY2UuXG4gICAgY29uc3Qgd2tzcCA9IGF3YWl0IGdldFdvcmtzcGFjZSh0cmVlKTtcbiAgICBjb25zdCBwb2x5ZmlsbHMgPSBBcnJheS5mcm9tKGFsbFdvcmtzcGFjZVRhcmdldHMod2tzcCkpXG4gICAgICAuZmlsdGVyKChbXywgdGFyZ2V0XSkgPT4gISF0YXJnZXQub3B0aW9ucz8ucG9seWZpbGxzKVxuICAgICAgLm1hcCgoW18sIHRhcmdldF0pID0+IHRhcmdldC5vcHRpb25zPy5wb2x5ZmlsbHMgYXMgc3RyaW5nKTtcbiAgICBjb25zdCB1bmlxdWVQb2x5ZmlsbHMgPSBBcnJheS5mcm9tKG5ldyBTZXQocG9seWZpbGxzKSk7XG5cbiAgICAvLyBEcm9wIHRoZSBtb2R1bGVzIGZyb20gZWFjaCBwb2x5ZmlsbC5cbiAgICByZXR1cm4gY2hhaW4odW5pcXVlUG9seWZpbGxzLm1hcCgocG9seWZpbGxQYXRoKSA9PiBkcm9wTW9kdWxlcyhwb2x5ZmlsbFBhdGgsIG1vZHVsZXNUb0Ryb3ApKSk7XG4gIH07XG59XG5cbi8qKiBQcm9jZXNzZXMgdGhlIGdpdmVuIHBvbHlmaWxsIHBhdGggYW5kIHJlbW92ZXMgYW55IGBpbXBvcnRgIHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGVzLiAqL1xuZnVuY3Rpb24gZHJvcE1vZHVsZXMocG9seWZpbGxQYXRoOiBzdHJpbmcsIG1vZHVsZXM6IFNldDxzdHJpbmc+KTogUnVsZSB7XG4gIHJldHVybiAodHJlZTogVHJlZSwgY3R4OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgc291cmNlQ29udGVudCA9IHRyZWUucmVhZChwb2x5ZmlsbFBhdGgpO1xuICAgIGlmICghc291cmNlQ29udGVudCkge1xuICAgICAgY3R4LmxvZ2dlci53YXJuKFxuICAgICAgICAnUG9seWZpbGwgcGF0aCBmcm9tIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGNvdWxkIG5vdCBiZSByZWFkLCBkb2VzIHRoZSBmaWxlIGV4aXN0PycsXG4gICAgICAgIHsgcG9seWZpbGxQYXRoIH0sXG4gICAgICApO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBzb3VyY2VDb250ZW50LnRvU3RyaW5nKCd1dGY4Jyk7XG5cbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgIHBvbHlmaWxsUGF0aCxcbiAgICAgIGNvbnRlbnQucmVwbGFjZSgvXlxcdUZFRkYvLCAnJyksXG4gICAgICB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LFxuICAgICAgdHJ1ZSAvKiBzZXRQYXJlbnROb2RlcyAqLyxcbiAgICApO1xuXG4gICAgLy8gUmVtb3ZlIHBvbHlmaWxscyBmb3IgdGhlIGdpdmVuIG1vZHVsZSBzcGVjaWZpZXJzLlxuICAgIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShwb2x5ZmlsbFBhdGgpO1xuICAgIHJlbW92ZVBvbHlmaWxsSW1wb3J0cyhyZWNvcmRlciwgc291cmNlRmlsZSwgbW9kdWxlcyk7XG4gICAgcmVtb3ZlUG9seWZpbGxJbXBvcnRDb21tZW50cyhyZWNvcmRlciwgc291cmNlRmlsZSwgbW9kdWxlcyk7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIHRyZWU7XG4gIH07XG59XG5cbi8qKlxuICogU2VhcmNoZXMgdGhlIHNvdXJjZSBmaWxlIGZvciBhbnkgYGltcG9ydCAnJHttb2R1bGV9JztgIHN0YXRlbWVudHMgYW5kIHJlbW92ZXMgdGhlbSBhbG9uZyB3aXRoXG4gKiBhbnkgcHJlY2VlZGluZyBjb21tZW50cy5cbiAqXG4gKiBAcGFyYW0gcmVjb3JkZXIgVGhlIHJlY29yZGVyIHRvIHJlbW92ZSBmcm9tLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGBpbXBvcnRgIHN0YXRlbWVudHMuXG4gKiBAcGFyYW0gbW9kdWxlcyBUaGUgbW9kdWxlIHNwZWNpZmllcnMgdG8gcmVtb3ZlLlxuICovXG5mdW5jdGlvbiByZW1vdmVQb2x5ZmlsbEltcG9ydHMoXG4gIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlczogU2V0PHN0cmluZz4sXG4pOiB2b2lkIHtcbiAgY29uc3QgaW1wb3J0cyA9IHNvdXJjZUZpbGUuc3RhdGVtZW50cy5maWx0ZXIoKHN0bXQpID0+XG4gICAgdHMuaXNJbXBvcnREZWNsYXJhdGlvbihzdG10KSxcbiAgKSBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbltdO1xuXG4gIGZvciAoY29uc3QgaSBvZiBpbXBvcnRzKSB7XG4gICAgLy8gU2hvdWxkIGFsd2F5cyBiZSBhIHN0cmluZyBsaXRlcmFsLlxuICAgIGFzc2VydCh0cy5pc1N0cmluZ0xpdGVyYWwoaS5tb2R1bGVTcGVjaWZpZXIpKTtcblxuICAgIC8vIElnbm9yZSBvdGhlciBtb2R1bGVzLlxuICAgIGlmICghbW9kdWxlcy5oYXMoaS5tb2R1bGVTcGVjaWZpZXIudGV4dCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSB0aGUgbW9kdWxlIGltcG9ydCBzdGF0ZW1lbnQuXG4gICAgcmVjb3JkZXIucmVtb3ZlKGkuZ2V0U3RhcnQoKSwgaS5nZXRXaWR0aCgpKTtcblxuICAgIC8vIFJlbW92ZSBsZWFkaW5nIGNvbW1lbnRzLiBcIkxlYWRpbmdcIiBjb21tZW50cyBzZWVtcyB0byBpbmNsdWRlIGNvbW1lbnRzIHdpdGhpbiB0aGUgbm9kZSwgc29cbiAgICAvLyBldmVuIHRob3VnaCBgZ2V0RnVsbFRleHQoKWAgcmV0dXJucyBhbiBpbmRleCBiZWZvcmUgYW55IGxlYWRpbmcgY29tbWVudHMgdG8gYSBub2RlLCBpdCB3aWxsXG4gICAgLy8gc3RpbGwgZmluZCBhbmQgcHJvY2VzcyB0aGVtLlxuICAgIHRzLmZvckVhY2hMZWFkaW5nQ29tbWVudFJhbmdlKFxuICAgICAgc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpLFxuICAgICAgaS5nZXRGdWxsU3RhcnQoKSxcbiAgICAgIChzdGFydCwgZW5kLCBfLCBoYXNUcmFpbGluZ05ld0xpbmUpID0+IHtcbiAgICAgICAgLy8gSW5jbHVkZSBib3RoIGxlYWRpbmcgKiphbmQqKiB0cmFpbGluZyBuZXdsaW5lcyBiZWNhdXNlIHRoZXNlIGFyZSBjb21tZW50cyB0aGF0ICpwcmVjZWVkKlxuICAgICAgICAvLyB0aGUgYGltcG9ydGAgc3RhdGVtZW50LCBzbyBcInRyYWlsaW5nXCIgbmV3bGluZXMgaGVyZSBhcmUgYWN0dWFsbHkgaW4tYmV0d2VlbiB0aGUgYGltcG9ydGBcbiAgICAgICAgLy8gYW5kIGl0J3MgbGVhZGluZyBjb21tZW50cy5cbiAgICAgICAgY29uc3QgY29tbWVudFJhbmdlV2l0aG91dE5ld0xpbmVzID0geyBzdGFydCwgZW5kIH07XG4gICAgICAgIGNvbnN0IGNvbW1lbnRSYW5nZVdpdGhUcmFpbGluZ05ld0xpbmVzID0gaGFzVHJhaWxpbmdOZXdMaW5lXG4gICAgICAgICAgPyBpbmNsdWRlVHJhaWxpbmdOZXdMaW5lKHNvdXJjZUZpbGUsIGNvbW1lbnRSYW5nZVdpdGhvdXROZXdMaW5lcylcbiAgICAgICAgICA6IGNvbW1lbnRSYW5nZVdpdGhvdXROZXdMaW5lcztcbiAgICAgICAgY29uc3QgY29tbWVudFJhbmdlID0gaW5jbHVkZUxlYWRpbmdOZXdMaW5lcyhzb3VyY2VGaWxlLCBjb21tZW50UmFuZ2VXaXRoVHJhaWxpbmdOZXdMaW5lcyk7XG5cbiAgICAgICAgaWYgKCFpc1Byb3RlY3RlZENvbW1lbnQoc291cmNlRmlsZSwgY29tbWVudFJhbmdlKSkge1xuICAgICAgICAgIHJlY29yZGVyLnJlbW92ZShjb21tZW50UmFuZ2Uuc3RhcnQsIGNvbW1lbnRSYW5nZS5lbmQgLSBjb21tZW50UmFuZ2Uuc3RhcnQpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZWFyY2hlcyB0aGUgc291cmNlIGZpbGUgZm9yIGFueSBgLy8gaW1wb3J0ICcke21vZHVsZX0nO2AgY29tbWVudHMgYW5kIHJlbW92ZXMgdGhlbSBhbG9uZyB3aXRoXG4gKiBhbnkgcHJlY2VlZGluZyBjb21tZW50cy5cbiAqXG4gKiBSZWNlbnQgYG5nIG5ld2AgaW52b2NhdGlvbnMgZ2VuZXJhdGUgcG9seWZpbGxzIGNvbW1lbnRlZCBvdXQgYW5kIG5vdCB1c2VkIGJ5IGRlZmF1bHQuIEV4OlxuICogLyoqXG4gKiAgKiBJRTExIHJlcXVpcmVzIHRoZSBmb2xsb3dpbmcgZm9yIE5nQ2xhc3Mgc3VwcG9ydCBvbiBTVkcgZWxlbWVudHNcbiAqICAqXFwvXG4gKiAvLyBpbXBvcnQgJ2NsYXNzbGlzdC5qcyc7ICAvLyBSdW4gYG5wbSBpbnN0YWxsIC0tc2F2ZSBjbGFzc2xpc3QuanNgLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaWRlbnRpZmllcyBhbnkgY29tbWVudGVkIG91dCBpbXBvcnQgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZSBzcGVjaWZpZXJzIGFuZFxuICogcmVtb3ZlcyB0aGVtIGFsb25nIHdpdGggaW1tZWRpYXRlbHkgcHJlY2VlZGluZyBjb21tZW50cy5cbiAqXG4gKiBAcGFyYW0gcmVjb3JkZXIgVGhlIHJlY29yZGVyIHRvIHJlbW92ZSBmcm9tLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNvbW1lbnRlZCBgaW1wb3J0YCBzdGF0ZW1lbnRzLlxuICogQHBhcmFtIG1vZHVsZXMgVGhlIG1vZHVsZSBzcGVjaWZpZXJzIHRvIHJlbW92ZS5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlUG9seWZpbGxJbXBvcnRDb21tZW50cyhcbiAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICBtb2R1bGVzOiBTZXQ8c3RyaW5nPixcbik6IHZvaWQge1xuICAvLyBGaW5kIGFsbCBjb21tZW50IHJhbmdlcyBpbiB0aGUgc291cmNlIGZpbGUuXG4gIGNvbnN0IGNvbW1lbnRSYW5nZXMgPSBnZXRDb21tZW50UmFuZ2VzKHNvdXJjZUZpbGUpO1xuXG4gIC8vIEZpbmQgdGhlIGluZGV4ZXMgb2YgY29tbWVudHMgd2hpY2ggY29udGFpbiBgaW1wb3J0YCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlcy5cbiAgY29uc3QgbW9kdWxlSW1wb3J0Q29tbWVudEluZGV4ZXMgPSBmaWx0ZXJJbmRleChjb21tZW50UmFuZ2VzLCAoeyBzdGFydCwgZW5kIH0pID0+IHtcbiAgICBjb25zdCBjb21tZW50ID0gZ2V0Q29tbWVudFRleHQoc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblxuICAgIHJldHVybiBBcnJheS5mcm9tKG1vZHVsZXMudmFsdWVzKCkpLnNvbWUoKG1vZHVsZSkgPT4gY29tbWVudC5zdGFydHNXaXRoKGBpbXBvcnQgJyR7bW9kdWxlfSc7YCkpO1xuICB9KTtcblxuICAvLyBVc2UgdGhlIG1vZHVsZSBpbXBvcnQgY29tbWVudCAqKmFuZCoqIGl0J3MgcHJlY2VkaW5nIGNvbW1lbnQgaWYgcHJlc2VudC5cbiAgY29uc3QgY29tbWVudEluZGV4ZXNUb1JlbW92ZSA9IG1vZHVsZUltcG9ydENvbW1lbnRJbmRleGVzLmZsYXRNYXAoKGluZGV4KSA9PiB7XG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICByZXR1cm4gWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW2luZGV4IC0gMSwgaW5kZXhdO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR2V0IGFsbCB0aGUgcmFuZ2VzIGZvciB0aGUgY29tbWVudHMgdG8gcmVtb3ZlLlxuICBjb25zdCBjb21tZW50UmFuZ2VzVG9SZW1vdmUgPSBjb21tZW50SW5kZXhlc1RvUmVtb3ZlXG4gICAgLm1hcCgoaW5kZXgpID0+IGNvbW1lbnRSYW5nZXNbaW5kZXhdKVxuICAgIC8vIEluY2x1ZGUgbGVhZGluZyBuZXdsaW5lcyBidXQgKipub3QqKiB0cmFpbGluZyBuZXdsaW5lcyBpbiBvcmRlciB0byBsZWF2ZSBhcHByb3ByaWF0ZSBzcGFjZVxuICAgIC8vIGJldHdlZW4gYW55IHJlbWFpbmluZyBwb2x5ZmlsbHMuXG4gICAgLm1hcCgocmFuZ2UpID0+IGluY2x1ZGVMZWFkaW5nTmV3TGluZXMoc291cmNlRmlsZSwgcmFuZ2UpKVxuICAgIC5maWx0ZXIoKHJhbmdlKSA9PiAhaXNQcm90ZWN0ZWRDb21tZW50KHNvdXJjZUZpbGUsIHJhbmdlKSk7XG5cbiAgLy8gUmVtb3ZlIHRoZSBjb21tZW50cy5cbiAgZm9yIChjb25zdCB7IHN0YXJ0LCBlbmQgfSBvZiBjb21tZW50UmFuZ2VzVG9SZW1vdmUpIHtcbiAgICByZWNvcmRlci5yZW1vdmUoc3RhcnQsIGVuZCAtIHN0YXJ0KTtcbiAgfVxufVxuXG4vKiogUmVwcmVzZW50cyBhIHNlZ21lbnQgb2YgdGV4dCBpbiBhIHNvdXJjZSBmaWxlIHN0YXJ0aW5nIGFuZCBlbmRpbmcgYXQgdGhlIGdpdmVuIG9mZnNldHMuICovXG5pbnRlcmZhY2UgU291cmNlUmFuZ2Uge1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoZXRoZXIgYSBjb21tZW50IHJhbmdlIGlzIFwicHJvdGVjdGVkXCIsIG1lYW5pbmcgaXQgc2hvdWxkICoqbm90KiogYmUgZGVsZXRlZC5cbiAqXG4gKiBUaGVyZSBhcmUgdHdvIGNvbW1lbnRzIHdoaWNoIGFyZSBjb25zaWRlcmVkIFwicHJvdGVjdGVkXCI6XG4gKiAxLiBUaGUgZmlsZSBvdmVydmlldyBkb2MgY29tbWVudCBwcmV2aW91c2x5IGdlbmVyYXRlZCBieSBgbmcgbmV3YC5cbiAqIDIuIFRoZSBicm93c2VyIHBvbHlmaWxscyBoZWFkZXIgKC8qKioqKiBCUk9XU0VSIFBPTFlGSUxMUyAqXFwvKS5cbiAqL1xuZnVuY3Rpb24gaXNQcm90ZWN0ZWRDb21tZW50KHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHsgc3RhcnQsIGVuZCB9OiBTb3VyY2VSYW5nZSk6IGJvb2xlYW4ge1xuICBjb25zdCBjb21tZW50ID0gZ2V0Q29tbWVudFRleHQoc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblxuICBjb25zdCBpc0ZpbGVPdmVydmlld0RvY0NvbW1lbnQgPSBjb21tZW50LnN0YXJ0c1dpdGgoXG4gICAgJ1RoaXMgZmlsZSBpbmNsdWRlcyBwb2x5ZmlsbHMgbmVlZGVkIGJ5IEFuZ3VsYXIgYW5kIGlzIGxvYWRlZCBiZWZvcmUgdGhlIGFwcC4nLFxuICApO1xuICBjb25zdCBpc0Jyb3dzZXJQb2x5ZmlsbHNIZWFkZXIgPSBjb21tZW50LnN0YXJ0c1dpdGgoJ0JST1dTRVIgUE9MWUZJTExTJyk7XG5cbiAgcmV0dXJuIGlzRmlsZU92ZXJ2aWV3RG9jQ29tbWVudCB8fCBpc0Jyb3dzZXJQb2x5ZmlsbHNIZWFkZXI7XG59XG5cbi8qKiBSZXR1cm5zIGFsbCB0aGUgY29tbWVudHMgaW4gdGhlIGdpdmVuIHNvdXJjZSBmaWxlLiAqL1xuZnVuY3Rpb24gZ2V0Q29tbWVudFJhbmdlcyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlUmFuZ2VbXSB7XG4gIGNvbnN0IGNvbW1lbnRSYW5nZXMgPSBbXSBhcyBTb3VyY2VSYW5nZVtdO1xuXG4gIC8vIENvbW1lbnRzIHRyYWlsaW5nIHRoZSBsYXN0IG5vZGUgYXJlIGFsc28gaW5jbHVkZWQgaW4gdGhpcy5cbiAgdHMuZm9yRWFjaENoaWxkKHNvdXJjZUZpbGUsIChub2RlKSA9PiB7XG4gICAgdHMuZm9yRWFjaExlYWRpbmdDb21tZW50UmFuZ2Uoc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpLCBub2RlLmdldEZ1bGxTdGFydCgpLCAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgY29tbWVudFJhbmdlcy5wdXNoKHsgc3RhcnQsIGVuZCB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNvbW1lbnRSYW5nZXM7XG59XG5cbi8qKiBSZXR1cm5zIGEgYFNvdXJjZVJhbmdlYCB3aXRoIGFueSBsZWFkaW5nIG5ld2xpbmVzJyBjaGFyYWN0ZXJzIGluY2x1ZGVkIGlmIHByZXNlbnQuICovXG5mdW5jdGlvbiBpbmNsdWRlTGVhZGluZ05ld0xpbmVzKFxuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICB7IHN0YXJ0LCBlbmQgfTogU291cmNlUmFuZ2UsXG4pOiBTb3VyY2VSYW5nZSB7XG4gIGNvbnN0IHRleHQgPSBzb3VyY2VGaWxlLmdldEZ1bGxUZXh0KCk7XG4gIHdoaWxlIChzdGFydCA+IDApIHtcbiAgICBpZiAoc3RhcnQgPiAyICYmIHRleHQuc2xpY2Uoc3RhcnQgLSAyLCBzdGFydCkgPT09ICdcXHJcXG4nKSB7XG4gICAgICAvLyBQcmVjZWVkZWQgYnkgYFxcclxcbmAsIGluY2x1ZGUgdGhhdC5cbiAgICAgIHN0YXJ0IC09IDI7XG4gICAgfSBlbHNlIGlmIChzdGFydCA+IDEgJiYgdGV4dFtzdGFydCAtIDFdID09PSAnXFxuJykge1xuICAgICAgLy8gUHJlY2VlZGVkIGJ5IGBcXG5gLCBpbmNsdWRlIHRoYXQuXG4gICAgICBzdGFydC0tO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBOb3QgcHJlY2VlZGVkIGJ5IGFueSBuZXdsaW5lIGNoYXJhY3RlcnMsIGRvbid0IGluY2x1ZGUgYW55dGhpbmcgZWxzZS5cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IHN0YXJ0LCBlbmQgfTtcbn1cblxuLyoqIFJldHVybnMgYSBgU291cmNlUmFuZ2VgIHdpdGggdGhlIHRyYWlsaW5nIG5ld2xpbmUgY2hhcmFjdGVycyBpbmNsdWRlZCBpZiBwcmVzZW50LiAqL1xuZnVuY3Rpb24gaW5jbHVkZVRyYWlsaW5nTmV3TGluZShcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgeyBzdGFydCwgZW5kIH06IFNvdXJjZVJhbmdlLFxuKTogU291cmNlUmFuZ2Uge1xuICBjb25zdCBuZXdsaW5lID0gc291cmNlRmlsZS5nZXRGdWxsVGV4dCgpLnNsaWNlKGVuZCwgZW5kICsgMik7XG4gIGlmIChuZXdsaW5lID09PSAnXFxyXFxuJykge1xuICAgIHJldHVybiB7IHN0YXJ0LCBlbmQ6IGVuZCArIDIgfTtcbiAgfSBlbHNlIGlmIChuZXdsaW5lLnN0YXJ0c1dpdGgoJ1xcbicpKSB7XG4gICAgcmV0dXJuIHsgc3RhcnQsIGVuZDogZW5kICsgMSB9O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgY29tbWVudCB0byBlbmQgaW4gYSBuZXdsaW5lIGNoYXJhY3RlciAoZWl0aGVyIGBcXFxcbmAgb3IgYFxcXFxyXFxcXG5gKS4nKTtcbiAgfVxufVxuXG4vKipcbiAqIEV4dHJhY3RzIHRoZSB0ZXh0IGZyb20gYSBjb21tZW50LiBBdHRlbXB0cyB0byByZW1vdmUgYW55IGV4dHJhbmVvdXMgc3ludGF4IGFuZCB0cmltcyB0aGUgY29udGVudC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q29tbWVudFRleHQoY29tbWVudElucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBjb21tZW50ID0gY29tbWVudElucHV0LnRyaW0oKTtcbiAgaWYgKGNvbW1lbnQuc3RhcnRzV2l0aCgnLy8nKSkge1xuICAgIHJldHVybiBjb21tZW50LnNsaWNlKCcvLycubGVuZ3RoKS50cmltKCk7XG4gIH0gZWxzZSBpZiAoY29tbWVudC5zdGFydHNXaXRoKCcvKicpKSB7XG4gICAgY29uc3Qgd2l0aG91dFByZWZpeCA9IGNvbW1lbnQucmVwbGFjZSgvXFwvXFwqKy8sICcnKTtcbiAgICBjb25zdCB3aXRob3V0U3VmZml4ID0gd2l0aG91dFByZWZpeC5yZXBsYWNlKC9cXCorXFwvLywgJycpO1xuICAgIGNvbnN0IHdpdGhvdXROZXdsaW5lQXN0ZXJpc2tzID0gd2l0aG91dFN1ZmZpeC5yZXBsYWNlKC9eXFxzKlxcKlxccyovLCAnJyk7XG5cbiAgICByZXR1cm4gd2l0aG91dE5ld2xpbmVBc3Rlcmlza3MudHJpbSgpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYSBjb21tZW50LCBidXQgZ290OiBcIiR7Y29tbWVudH1cIi5gKTtcbiAgfVxufVxuXG4vKiogTGlrZSBgQXJyYXkucHJvdG90eXBlLmZpbHRlcmAsIGJ1dCByZXR1cm5zIHRoZSBpbmRleCBvZiBlYWNoIGl0ZW0gcmF0aGVyIHRoYW4gaXRzIHZhbHVlLiAqL1xuZnVuY3Rpb24gZmlsdGVySW5kZXg8SXRlbT4oaXRlbXM6IEl0ZW1bXSwgZmlsdGVyOiAoaXRlbTogSXRlbSkgPT4gYm9vbGVhbik6IG51bWJlcltdIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oaXRlbXMuZW50cmllcygpKVxuICAgIC5maWx0ZXIoKFtfLCBpdGVtXSkgPT4gZmlsdGVyKGl0ZW0pKVxuICAgIC5tYXAoKFtpbmRleF0pID0+IGluZGV4KTtcbn1cbiJdfQ==