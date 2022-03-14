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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYXN0LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvbmctYXN0LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQWlEO0FBQ2pELDJEQUF1RTtBQUN2RSwrQkFBK0I7QUFDL0Isa0dBQW9GO0FBQ3BGLG9EQUFnRTtBQUVoRSxTQUFnQix1QkFBdUIsQ0FBQyxJQUFVLEVBQUUsUUFBZ0I7SUFDbEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2QyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ2YsTUFBTSxJQUFJLGdDQUFtQixDQUFDLGNBQWMsUUFBUSxhQUFhLENBQUMsQ0FBQztLQUNwRTtJQUNELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFckYsTUFBTSxRQUFRLEdBQUcsSUFBQSwwQkFBYyxFQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXhDLElBQUksYUFBYSxHQUE2QixJQUFJLENBQUM7SUFFbkQsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUU7UUFDM0IsSUFBSSxpQkFBaUIsR0FBbUIsSUFBSSxDQUFDO1FBQzdDLGlCQUFpQixHQUFHLElBQUEsb0JBQVEsRUFBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVoRixvREFBb0Q7UUFDcEQsT0FDRSxpQkFBaUI7WUFDakIsaUJBQWlCLENBQUMsTUFBTTtZQUN4QixpQkFBaUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUM5RDtZQUNBLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztTQUM5QztRQUVELElBQ0UsaUJBQWlCLEtBQUssSUFBSTtZQUMxQixpQkFBaUIsQ0FBQyxNQUFNLEtBQUssU0FBUztZQUN0QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUM5RDtZQUNBLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxNQUEyQixDQUFDO1lBQzlELE1BQU07U0FDUDtLQUNGO0lBRUQsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQXBDRCwwREFvQ0M7QUFFRCxTQUFnQix1QkFBdUIsQ0FBQyxJQUFVLEVBQUUsUUFBZ0I7SUFDbEUsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzlELElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDbEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUM7S0FDM0Q7SUFFRCxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5ELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkMsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUNmLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxpQ0FBaUMsUUFBUSxhQUFhLENBQUMsQ0FBQztLQUN2RjtJQUNELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckYsTUFBTSxRQUFRLEdBQUcsSUFBQSwwQkFBYyxFQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sMkJBQTJCLEdBQUcsUUFBUTtTQUN6QyxNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1NBQzlCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ2QsT0FBTyxJQUFBLG9CQUFRLEVBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUMsQ0FBQztTQUNELEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ1gsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUMsZUFBbUMsQ0FBQztRQUV4RSxPQUFPLHVCQUF1QixDQUFDLElBQUksQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVSLE9BQU8sMkJBQTJCLENBQUM7QUFDckMsQ0FBQztBQTNCRCwwREEyQkM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFVLEVBQUUsUUFBZ0I7SUFDM0QsTUFBTSxrQkFBa0IsR0FBRyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFPLEVBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBQSxnQkFBUyxFQUFDLElBQUksT0FBTyxJQUFJLGtCQUFrQixLQUFLLENBQUMsQ0FBQztJQUVyRSxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBTkQsNENBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgU2NoZW1hdGljc0V4Y2VwdGlvbiwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgZmluZE5vZGUsIGdldFNvdXJjZU5vZGVzIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb3RzdHJhcE1vZHVsZUNhbGwoaG9zdDogVHJlZSwgbWFpblBhdGg6IHN0cmluZyk6IHRzLkNhbGxFeHByZXNzaW9uIHwgbnVsbCB7XG4gIGNvbnN0IG1haW5CdWZmZXIgPSBob3N0LnJlYWQobWFpblBhdGgpO1xuICBpZiAoIW1haW5CdWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgTWFpbiBmaWxlICgke21haW5QYXRofSkgbm90IGZvdW5kYCk7XG4gIH1cbiAgY29uc3QgbWFpblRleHQgPSBtYWluQnVmZmVyLnRvU3RyaW5nKCd1dGYtOCcpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKG1haW5QYXRoLCBtYWluVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgY29uc3QgYWxsTm9kZXMgPSBnZXRTb3VyY2VOb2Rlcyhzb3VyY2UpO1xuXG4gIGxldCBib290c3RyYXBDYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiB8IG51bGwgPSBudWxsO1xuXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBhbGxOb2Rlcykge1xuICAgIGxldCBib290c3RyYXBDYWxsTm9kZTogdHMuTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIGJvb3RzdHJhcENhbGxOb2RlID0gZmluZE5vZGUobm9kZSwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCAnYm9vdHN0cmFwTW9kdWxlJyk7XG5cbiAgICAvLyBXYWxrIHVwIHRoZSBwYXJlbnQgdW50aWwgQ2FsbEV4cHJlc3Npb24gaXMgZm91bmQuXG4gICAgd2hpbGUgKFxuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUgJiZcbiAgICAgIGJvb3RzdHJhcENhbGxOb2RlLnBhcmVudCAmJlxuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUucGFyZW50LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb25cbiAgICApIHtcbiAgICAgIGJvb3RzdHJhcENhbGxOb2RlID0gYm9vdHN0cmFwQ2FsbE5vZGUucGFyZW50O1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGJvb3RzdHJhcENhbGxOb2RlICE9PSBudWxsICYmXG4gICAgICBib290c3RyYXBDYWxsTm9kZS5wYXJlbnQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgYm9vdHN0cmFwQ2FsbE5vZGUucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb25cbiAgICApIHtcbiAgICAgIGJvb3RzdHJhcENhbGwgPSBib290c3RyYXBDYWxsTm9kZS5wYXJlbnQgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYm9vdHN0cmFwQ2FsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb290c3RyYXBNb2R1bGVQYXRoKGhvc3Q6IFRyZWUsIG1haW5QYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBib290c3RyYXBDYWxsID0gZmluZEJvb3RzdHJhcE1vZHVsZUNhbGwoaG9zdCwgbWFpblBhdGgpO1xuICBpZiAoIWJvb3RzdHJhcENhbGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQm9vdHN0cmFwIGNhbGwgbm90IGZvdW5kJyk7XG4gIH1cblxuICBjb25zdCBib290c3RyYXBNb2R1bGUgPSBib290c3RyYXBDYWxsLmFyZ3VtZW50c1swXTtcblxuICBjb25zdCBtYWluQnVmZmVyID0gaG9zdC5yZWFkKG1haW5QYXRoKTtcbiAgaWYgKCFtYWluQnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENsaWVudCBhcHBsaWNhdGlvbiBtYWluIGZpbGUgKCR7bWFpblBhdGh9KSBub3QgZm91bmRgKTtcbiAgfVxuICBjb25zdCBtYWluVGV4dCA9IG1haW5CdWZmZXIudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUobWFpblBhdGgsIG1haW5UZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcbiAgY29uc3QgYWxsTm9kZXMgPSBnZXRTb3VyY2VOb2Rlcyhzb3VyY2UpO1xuICBjb25zdCBib290c3RyYXBNb2R1bGVSZWxhdGl2ZVBhdGggPSBhbGxOb2Rlc1xuICAgIC5maWx0ZXIodHMuaXNJbXBvcnREZWNsYXJhdGlvbilcbiAgICAuZmlsdGVyKChpbXApID0+IHtcbiAgICAgIHJldHVybiBmaW5kTm9kZShpbXAsIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciwgYm9vdHN0cmFwTW9kdWxlLmdldFRleHQoKSk7XG4gICAgfSlcbiAgICAubWFwKChpbXApID0+IHtcbiAgICAgIGNvbnN0IG1vZHVsZVBhdGhTdHJpbmdMaXRlcmFsID0gaW1wLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsO1xuXG4gICAgICByZXR1cm4gbW9kdWxlUGF0aFN0cmluZ0xpdGVyYWwudGV4dDtcbiAgICB9KVswXTtcblxuICByZXR1cm4gYm9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBwTW9kdWxlUGF0aChob3N0OiBUcmVlLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbW9kdWxlUmVsYXRpdmVQYXRoID0gZmluZEJvb3RzdHJhcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICBjb25zdCBtYWluRGlyID0gZGlybmFtZShtYWluUGF0aCk7XG4gIGNvbnN0IG1vZHVsZVBhdGggPSBub3JtYWxpemUoYC8ke21haW5EaXJ9LyR7bW9kdWxlUmVsYXRpdmVQYXRofS50c2ApO1xuXG4gIHJldHVybiBtb2R1bGVQYXRoO1xufVxuIl19