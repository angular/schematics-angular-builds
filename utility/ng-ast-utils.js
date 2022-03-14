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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppModulePath = exports.findBootstrapModulePath = exports.findBootstrapModuleCall = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const path_1 = require("path");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
function findBootstrapModuleCall(host, mainPath) {
    const mainBuffer = host.read(mainPath);
    if (!mainBuffer) {
        throw new schematics_1.SchematicsException(`Main file (${mainPath}) not found`);
    }
    const mainText = mainBuffer.toString('utf-8');
    const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);
    const allNodes = (0, ast_utils_1.getSourceNodes)(source);
    let bootstrapCall = null;
    for (const node of allNodes) {
        let bootstrapCallNode = null;
        bootstrapCallNode = (0, ast_utils_1.findNode)(node, ts.SyntaxKind.Identifier, 'bootstrapModule');
        // Walk up the parent until CallExpression is found.
        while (bootstrapCallNode &&
            bootstrapCallNode.parent &&
            bootstrapCallNode.parent.kind !== ts.SyntaxKind.CallExpression) {
            bootstrapCallNode = bootstrapCallNode.parent;
        }
        if (bootstrapCallNode !== null &&
            bootstrapCallNode.parent !== undefined &&
            bootstrapCallNode.parent.kind === ts.SyntaxKind.CallExpression) {
            bootstrapCall = bootstrapCallNode.parent;
            break;
        }
    }
    return bootstrapCall;
}
exports.findBootstrapModuleCall = findBootstrapModuleCall;
function findBootstrapModulePath(host, mainPath) {
    const bootstrapCall = findBootstrapModuleCall(host, mainPath);
    if (!bootstrapCall) {
        throw new schematics_1.SchematicsException('Bootstrap call not found');
    }
    const bootstrapModule = bootstrapCall.arguments[0];
    const mainBuffer = host.read(mainPath);
    if (!mainBuffer) {
        throw new schematics_1.SchematicsException(`Client application main file (${mainPath}) not found`);
    }
    const mainText = mainBuffer.toString('utf-8');
    const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);
    const allNodes = (0, ast_utils_1.getSourceNodes)(source);
    const bootstrapModuleRelativePath = allNodes
        .filter(ts.isImportDeclaration)
        .filter((imp) => {
        return (0, ast_utils_1.findNode)(imp, ts.SyntaxKind.Identifier, bootstrapModule.getText());
    })
        .map((imp) => {
        const modulePathStringLiteral = imp.moduleSpecifier;
        return modulePathStringLiteral.text;
    })[0];
    return bootstrapModuleRelativePath;
}
exports.findBootstrapModulePath = findBootstrapModulePath;
function getAppModulePath(host, mainPath) {
    const moduleRelativePath = findBootstrapModulePath(host, mainPath);
    const mainDir = (0, path_1.dirname)(mainPath);
    const modulePath = (0, core_1.normalize)(`/${mainDir}/${moduleRelativePath}.ts`);
    return modulePath;
}
exports.getAppModulePath = getAppModulePath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYXN0LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvbmctYXN0LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBaUQ7QUFDakQsMkRBQXVFO0FBQ3ZFLCtCQUErQjtBQUMvQixrR0FBb0Y7QUFDcEYsb0RBQWdFO0FBRWhFLFNBQWdCLHVCQUF1QixDQUFDLElBQVUsRUFBRSxRQUFnQjtJQUNsRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDZixNQUFNLElBQUksZ0NBQW1CLENBQUMsY0FBYyxRQUFRLGFBQWEsQ0FBQyxDQUFDO0tBQ3BFO0lBQ0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVyRixNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsTUFBTSxDQUFDLENBQUM7SUFFeEMsSUFBSSxhQUFhLEdBQTZCLElBQUksQ0FBQztJQUVuRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRTtRQUMzQixJQUFJLGlCQUFpQixHQUFtQixJQUFJLENBQUM7UUFDN0MsaUJBQWlCLEdBQUcsSUFBQSxvQkFBUSxFQUFDLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRWhGLG9EQUFvRDtRQUNwRCxPQUNFLGlCQUFpQjtZQUNqQixpQkFBaUIsQ0FBQyxNQUFNO1lBQ3hCLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQzlEO1lBQ0EsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1NBQzlDO1FBRUQsSUFDRSxpQkFBaUIsS0FBSyxJQUFJO1lBQzFCLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxTQUFTO1lBQ3RDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQzlEO1lBQ0EsYUFBYSxHQUFHLGlCQUFpQixDQUFDLE1BQTJCLENBQUM7WUFDOUQsTUFBTTtTQUNQO0tBQ0Y7SUFFRCxPQUFPLGFBQWEsQ0FBQztBQUN2QixDQUFDO0FBcENELDBEQW9DQztBQUVELFNBQWdCLHVCQUF1QixDQUFDLElBQVUsRUFBRSxRQUFnQjtJQUNsRSxNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUQsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNsQixNQUFNLElBQUksZ0NBQW1CLENBQUMsMEJBQTBCLENBQUMsQ0FBQztLQUMzRDtJQUVELE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ2YsTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlDQUFpQyxRQUFRLGFBQWEsQ0FBQyxDQUFDO0tBQ3ZGO0lBQ0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNyRixNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEMsTUFBTSwyQkFBMkIsR0FBRyxRQUFRO1NBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUM7U0FDOUIsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDZCxPQUFPLElBQUEsb0JBQVEsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQyxDQUFDO1NBQ0QsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDWCxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxlQUFtQyxDQUFDO1FBRXhFLE9BQU8sdUJBQXVCLENBQUMsSUFBSSxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVIsT0FBTywyQkFBMkIsQ0FBQztBQUNyQyxDQUFDO0FBM0JELDBEQTJCQztBQUVELFNBQWdCLGdCQUFnQixDQUFDLElBQVUsRUFBRSxRQUFnQjtJQUMzRCxNQUFNLGtCQUFrQixHQUFHLHVCQUF1QixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuRSxNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQU8sRUFBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxPQUFPLElBQUksa0JBQWtCLEtBQUssQ0FBQyxDQUFDO0lBRXJFLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFORCw0Q0FNQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBmaW5kTm9kZSwgZ2V0U291cmNlTm9kZXMgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbChob3N0OiBUcmVlLCBtYWluUGF0aDogc3RyaW5nKTogdHMuQ2FsbEV4cHJlc3Npb24gfCBudWxsIHtcbiAgY29uc3QgbWFpbkJ1ZmZlciA9IGhvc3QucmVhZChtYWluUGF0aCk7XG4gIGlmICghbWFpbkJ1ZmZlcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBNYWluIGZpbGUgKCR7bWFpblBhdGh9KSBub3QgZm91bmRgKTtcbiAgfVxuICBjb25zdCBtYWluVGV4dCA9IG1haW5CdWZmZXIudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUobWFpblBhdGgsIG1haW5UZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKHNvdXJjZSk7XG5cbiAgbGV0IGJvb3RzdHJhcENhbGw6IHRzLkNhbGxFeHByZXNzaW9uIHwgbnVsbCA9IG51bGw7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIGFsbE5vZGVzKSB7XG4gICAgbGV0IGJvb3RzdHJhcENhbGxOb2RlOiB0cy5Ob2RlIHwgbnVsbCA9IG51bGw7XG4gICAgYm9vdHN0cmFwQ2FsbE5vZGUgPSBmaW5kTm9kZShub2RlLCB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIsICdib290c3RyYXBNb2R1bGUnKTtcblxuICAgIC8vIFdhbGsgdXAgdGhlIHBhcmVudCB1bnRpbCBDYWxsRXhwcmVzc2lvbiBpcyBmb3VuZC5cbiAgICB3aGlsZSAoXG4gICAgICBib290c3RyYXBDYWxsTm9kZSAmJlxuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUucGFyZW50ICYmXG4gICAgICBib290c3RyYXBDYWxsTm9kZS5wYXJlbnQua2luZCAhPT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvblxuICAgICkge1xuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUgPSBib290c3RyYXBDYWxsTm9kZS5wYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUgIT09IG51bGwgJiZcbiAgICAgIGJvb3RzdHJhcENhbGxOb2RlLnBhcmVudCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBib290c3RyYXBDYWxsTm9kZS5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvblxuICAgICkge1xuICAgICAgYm9vdHN0cmFwQ2FsbCA9IGJvb3RzdHJhcENhbGxOb2RlLnBhcmVudCBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBib290c3RyYXBDYWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb3RzdHJhcE1vZHVsZVBhdGgoaG9zdDogVHJlZSwgbWFpblBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGJvb3RzdHJhcENhbGwgPSBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbChob3N0LCBtYWluUGF0aCk7XG4gIGlmICghYm9vdHN0cmFwQ2FsbCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdCb290c3RyYXAgY2FsbCBub3QgZm91bmQnKTtcbiAgfVxuXG4gIGNvbnN0IGJvb3RzdHJhcE1vZHVsZSA9IGJvb3RzdHJhcENhbGwuYXJndW1lbnRzWzBdO1xuXG4gIGNvbnN0IG1haW5CdWZmZXIgPSBob3N0LnJlYWQobWFpblBhdGgpO1xuICBpZiAoIW1haW5CdWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2xpZW50IGFwcGxpY2F0aW9uIG1haW4gZmlsZSAoJHttYWluUGF0aH0pIG5vdCBmb3VuZGApO1xuICB9XG4gIGNvbnN0IG1haW5UZXh0ID0gbWFpbkJ1ZmZlci50b1N0cmluZygndXRmLTgnKTtcbiAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtYWluUGF0aCwgbWFpblRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKHNvdXJjZSk7XG4gIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aCA9IGFsbE5vZGVzXG4gICAgLmZpbHRlcih0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5maWx0ZXIoKGltcCkgPT4ge1xuICAgICAgcmV0dXJuIGZpbmROb2RlKGltcCwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCBib290c3RyYXBNb2R1bGUuZ2V0VGV4dCgpKTtcbiAgICB9KVxuICAgIC5tYXAoKGltcCkgPT4ge1xuICAgICAgY29uc3QgbW9kdWxlUGF0aFN0cmluZ0xpdGVyYWwgPSBpbXAubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWw7XG5cbiAgICAgIHJldHVybiBtb2R1bGVQYXRoU3RyaW5nTGl0ZXJhbC50ZXh0O1xuICAgIH0pWzBdO1xuXG4gIHJldHVybiBib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcHBNb2R1bGVQYXRoKGhvc3Q6IFRyZWUsIG1haW5QYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtb2R1bGVSZWxhdGl2ZVBhdGggPSBmaW5kQm9vdHN0cmFwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gIGNvbnN0IG1haW5EaXIgPSBkaXJuYW1lKG1haW5QYXRoKTtcbiAgY29uc3QgbW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShgLyR7bWFpbkRpcn0vJHttb2R1bGVSZWxhdGl2ZVBhdGh9LnRzYCk7XG5cbiAgcmV0dXJuIG1vZHVsZVBhdGg7XG59XG4iXX0=