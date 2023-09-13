"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProvidersLiteral = exports.isMergeAppConfigCall = exports.applyChangesToFile = exports.findBootstrapApplicationCall = exports.getSourceFile = exports.getMainFilePath = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const typescript_1 = __importDefault(require("../../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const change_1 = require("../change");
const project_targets_1 = require("../project-targets");
const workspace_1 = require("../workspace");
const workspace_models_1 = require("../workspace-models");
/**
 * Finds the main file of a project.
 * @param tree File tree for the project.
 * @param projectName Name of the project in which to search.
 */
async function getMainFilePath(tree, projectName) {
    const workspace = await (0, workspace_1.getWorkspace)(tree);
    const project = workspace.projects.get(projectName);
    const buildTarget = project?.targets.get('build');
    if (!buildTarget) {
        throw (0, project_targets_1.targetBuildNotFoundError)();
    }
    const options = buildTarget.options;
    return buildTarget.builder === workspace_models_1.Builders.Application ? options.browser : options.main;
}
exports.getMainFilePath = getMainFilePath;
/**
 * Gets a TypeScript source file at a specific path.
 * @param tree File tree of a project.
 * @param path Path to the file.
 */
function getSourceFile(tree, path) {
    const content = tree.readText(path);
    const source = typescript_1.default.createSourceFile(path, content, typescript_1.default.ScriptTarget.Latest, true);
    return source;
}
exports.getSourceFile = getSourceFile;
/** Finds the call to `bootstrapApplication` within a file. */
function findBootstrapApplicationCall(tree, mainFilePath) {
    const sourceFile = getSourceFile(tree, mainFilePath);
    const localName = findImportLocalName(sourceFile, 'bootstrapApplication', '@angular/platform-browser');
    if (localName) {
        let result = null;
        sourceFile.forEachChild(function walk(node) {
            if (typescript_1.default.isCallExpression(node) &&
                typescript_1.default.isIdentifier(node.expression) &&
                node.expression.text === localName) {
                result = node;
            }
            if (!result) {
                node.forEachChild(walk);
            }
        });
        if (result) {
            return result;
        }
    }
    throw new schematics_1.SchematicsException(`Could not find bootstrapApplication call in ${mainFilePath}`);
}
exports.findBootstrapApplicationCall = findBootstrapApplicationCall;
/**
 * Finds the local name of an imported symbol. Could be the symbol name itself or its alias.
 * @param sourceFile File within which to search for the import.
 * @param name Actual name of the import, not its local alias.
 * @param moduleName Name of the module from which the symbol is imported.
 */
function findImportLocalName(sourceFile, name, moduleName) {
    for (const node of sourceFile.statements) {
        // Only look for top-level imports.
        if (!typescript_1.default.isImportDeclaration(node) ||
            !typescript_1.default.isStringLiteral(node.moduleSpecifier) ||
            node.moduleSpecifier.text !== moduleName) {
            continue;
        }
        // Filter out imports that don't have the right shape.
        if (!node.importClause ||
            !node.importClause.namedBindings ||
            !typescript_1.default.isNamedImports(node.importClause.namedBindings)) {
            continue;
        }
        // Look through the elements of the declaration for the specific import.
        for (const element of node.importClause.namedBindings.elements) {
            if ((element.propertyName || element.name).text === name) {
                // The local name is always in `name`.
                return element.name.text;
            }
        }
    }
    return null;
}
/**
 * Applies a set of changes to a file.
 * @param tree File tree of the project.
 * @param path Path to the file that is being changed.
 * @param changes Changes that should be applied to the file.
 */
function applyChangesToFile(tree, path, changes) {
    if (changes.length > 0) {
        const recorder = tree.beginUpdate(path);
        (0, change_1.applyToUpdateRecorder)(recorder, changes);
        tree.commitUpdate(recorder);
    }
}
exports.applyChangesToFile = applyChangesToFile;
/** Checks whether a node is a call to `mergeApplicationConfig`. */
function isMergeAppConfigCall(node) {
    if (!typescript_1.default.isCallExpression(node)) {
        return false;
    }
    const localName = findImportLocalName(node.getSourceFile(), 'mergeApplicationConfig', '@angular/core');
    return !!localName && typescript_1.default.isIdentifier(node.expression) && node.expression.text === localName;
}
exports.isMergeAppConfigCall = isMergeAppConfigCall;
/** Finds the `providers` array literal within an application config. */
function findProvidersLiteral(config) {
    for (const prop of config.properties) {
        if (typescript_1.default.isPropertyAssignment(prop) &&
            typescript_1.default.isIdentifier(prop.name) &&
            prop.name.text === 'providers' &&
            typescript_1.default.isArrayLiteralExpression(prop.initializer)) {
            return prop.initializer;
        }
    }
    return null;
}
exports.findProvidersLiteral = findProvidersLiteral;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3N0YW5kYWxvbmUvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFFSCwyREFBdUU7QUFDdkUsa0hBQWtGO0FBQ2xGLHNDQUEwRDtBQUMxRCx3REFBOEQ7QUFDOUQsNENBQTRDO0FBQzVDLDBEQUErQztBQUUvQzs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLGVBQWUsQ0FBQyxJQUFVLEVBQUUsV0FBbUI7SUFDbkUsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLHdCQUFZLEVBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0MsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDcEQsTUFBTSxXQUFXLEdBQUcsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFbEQsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNoQixNQUFNLElBQUEsMENBQXdCLEdBQUUsQ0FBQztLQUNsQztJQUVELE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFpQyxDQUFDO0lBRTlELE9BQU8sV0FBVyxDQUFDLE9BQU8sS0FBSywyQkFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUN2RixDQUFDO0FBWkQsMENBWUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsYUFBYSxDQUFDLElBQVUsRUFBRSxJQUFZO0lBQ3BELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsTUFBTSxNQUFNLEdBQUcsb0JBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVB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SUFDaEQsSUFBSSxDQUFDLG9CQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDOUIsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUNuQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQ3BCLHdCQUF3QixFQUN4QixlQUFlLENBQ2hCLENBQUM7SUFFRixPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUksb0JBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztBQUMvRixDQUFDO0FBWkQsb0RBWUM7QUFFRCx3RUFBd0U7QUFDeEUsU0FBZ0Isb0JBQW9CLENBQ2xDLE1BQWtDO0lBRWxDLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLFVBQVUsRUFBRTtRQUNwQyxJQUNFLG9CQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDO1lBQzdCLG9CQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVztZQUM5QixvQkFBRSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFDN0M7WUFDQSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7U0FDekI7S0FDRjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQWZELG9EQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgdHMgZnJvbSAnLi4vLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBDaGFuZ2UsIGFwcGx5VG9VcGRhdGVSZWNvcmRlciB9IGZyb20gJy4uL2NoYW5nZSc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzIH0gZnJvbSAnLi4vd29ya3NwYWNlLW1vZGVscyc7XG5cbi8qKlxuICogRmluZHMgdGhlIG1haW4gZmlsZSBvZiBhIHByb2plY3QuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgZm9yIHRoZSBwcm9qZWN0LlxuICogQHBhcmFtIHByb2plY3ROYW1lIE5hbWUgb2YgdGhlIHByb2plY3QgaW4gd2hpY2ggdG8gc2VhcmNoLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0TWFpbkZpbGVQYXRoKHRyZWU6IFRyZWUsIHByb2plY3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHByb2plY3ROYW1lKTtcbiAgY29uc3QgYnVpbGRUYXJnZXQgPSBwcm9qZWN0Py50YXJnZXRzLmdldCgnYnVpbGQnKTtcblxuICBpZiAoIWJ1aWxkVGFyZ2V0KSB7XG4gICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gIH1cblxuICBjb25zdCBvcHRpb25zID0gYnVpbGRUYXJnZXQub3B0aW9ucyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG4gIHJldHVybiBidWlsZFRhcmdldC5idWlsZGVyID09PSBCdWlsZGVycy5BcHBsaWNhdGlvbiA/IG9wdGlvbnMuYnJvd3NlciA6IG9wdGlvbnMubWFpbjtcbn1cblxuLyoqXG4gKiBHZXRzIGEgVHlwZVNjcmlwdCBzb3VyY2UgZmlsZSBhdCBhIHNwZWNpZmljIHBhdGguXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgYSBwcm9qZWN0LlxuICogQHBhcmFtIHBhdGggUGF0aCB0byB0aGUgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZUZpbGUodHJlZTogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnRlbnQgPSB0cmVlLnJlYWRUZXh0KHBhdGgpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbi8qKiBGaW5kcyB0aGUgY2FsbCB0byBgYm9vdHN0cmFwQXBwbGljYXRpb25gIHdpdGhpbiBhIGZpbGUuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbCh0cmVlOiBUcmVlLCBtYWluRmlsZVBhdGg6IHN0cmluZyk6IHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGUodHJlZSwgbWFpbkZpbGVQYXRoKTtcbiAgY29uc3QgbG9jYWxOYW1lID0gZmluZEltcG9ydExvY2FsTmFtZShcbiAgICBzb3VyY2VGaWxlLFxuICAgICdib290c3RyYXBBcHBsaWNhdGlvbicsXG4gICAgJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInLFxuICApO1xuXG4gIGlmIChsb2NhbE5hbWUpIHtcbiAgICBsZXQgcmVzdWx0OiB0cy5DYWxsRXhwcmVzc2lvbiB8IG51bGwgPSBudWxsO1xuXG4gICAgc291cmNlRmlsZS5mb3JFYWNoQ2hpbGQoZnVuY3Rpb24gd2Fsayhub2RlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiZcbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiZcbiAgICAgICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09IGxvY2FsTmFtZVxuICAgICAgKSB7XG4gICAgICAgIHJlc3VsdCA9IG5vZGU7XG4gICAgICB9XG5cbiAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgIG5vZGUuZm9yRWFjaENoaWxkKHdhbGspO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgYm9vdHN0cmFwQXBwbGljYXRpb24gY2FsbCBpbiAke21haW5GaWxlUGF0aH1gKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgbG9jYWwgbmFtZSBvZiBhbiBpbXBvcnRlZCBzeW1ib2wuIENvdWxkIGJlIHRoZSBzeW1ib2wgbmFtZSBpdHNlbGYgb3IgaXRzIGFsaWFzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgRmlsZSB3aXRoaW4gd2hpY2ggdG8gc2VhcmNoIGZvciB0aGUgaW1wb3J0LlxuICogQHBhcmFtIG5hbWUgQWN0dWFsIG5hbWUgb2YgdGhlIGltcG9ydCwgbm90IGl0cyBsb2NhbCBhbGlhcy5cbiAqIEBwYXJhbSBtb2R1bGVOYW1lIE5hbWUgb2YgdGhlIG1vZHVsZSBmcm9tIHdoaWNoIHRoZSBzeW1ib2wgaXMgaW1wb3J0ZWQuXG4gKi9cbmZ1bmN0aW9uIGZpbmRJbXBvcnRMb2NhbE5hbWUoXG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gIG5hbWU6IHN0cmluZyxcbiAgbW9kdWxlTmFtZTogc3RyaW5nLFxuKTogc3RyaW5nIHwgbnVsbCB7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBzb3VyY2VGaWxlLnN0YXRlbWVudHMpIHtcbiAgICAvLyBPbmx5IGxvb2sgZm9yIHRvcC1sZXZlbCBpbXBvcnRzLlxuICAgIGlmIChcbiAgICAgICF0cy5pc0ltcG9ydERlY2xhcmF0aW9uKG5vZGUpIHx8XG4gICAgICAhdHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUubW9kdWxlU3BlY2lmaWVyKSB8fFxuICAgICAgbm9kZS5tb2R1bGVTcGVjaWZpZXIudGV4dCAhPT0gbW9kdWxlTmFtZVxuICAgICkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIG91dCBpbXBvcnRzIHRoYXQgZG9uJ3QgaGF2ZSB0aGUgcmlnaHQgc2hhcGUuXG4gICAgaWYgKFxuICAgICAgIW5vZGUuaW1wb3J0Q2xhdXNlIHx8XG4gICAgICAhbm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncyB8fFxuICAgICAgIXRzLmlzTmFtZWRJbXBvcnRzKG5vZGUuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MpXG4gICAgKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBMb29rIHRocm91Z2ggdGhlIGVsZW1lbnRzIG9mIHRoZSBkZWNsYXJhdGlvbiBmb3IgdGhlIHNwZWNpZmljIGltcG9ydC5cbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2Ygbm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncy5lbGVtZW50cykge1xuICAgICAgaWYgKChlbGVtZW50LnByb3BlcnR5TmFtZSB8fCBlbGVtZW50Lm5hbWUpLnRleHQgPT09IG5hbWUpIHtcbiAgICAgICAgLy8gVGhlIGxvY2FsIG5hbWUgaXMgYWx3YXlzIGluIGBuYW1lYC5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQubmFtZS50ZXh0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFwcGxpZXMgYSBzZXQgb2YgY2hhbmdlcyB0byBhIGZpbGUuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gcGF0aCBQYXRoIHRvIHRoZSBmaWxlIHRoYXQgaXMgYmVpbmcgY2hhbmdlZC5cbiAqIEBwYXJhbSBjaGFuZ2VzIENoYW5nZXMgdGhhdCBzaG91bGQgYmUgYXBwbGllZCB0byB0aGUgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5Q2hhbmdlc1RvRmlsZSh0cmVlOiBUcmVlLCBwYXRoOiBzdHJpbmcsIGNoYW5nZXM6IENoYW5nZVtdKSB7XG4gIGlmIChjaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUocGF0aCk7XG4gICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBjaGFuZ2VzKTtcbiAgICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gIH1cbn1cblxuLyoqIENoZWNrcyB3aGV0aGVyIGEgbm9kZSBpcyBhIGNhbGwgdG8gYG1lcmdlQXBwbGljYXRpb25Db25maWdgLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWVyZ2VBcHBDb25maWdDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgbG9jYWxOYW1lID0gZmluZEltcG9ydExvY2FsTmFtZShcbiAgICBub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICAnbWVyZ2VBcHBsaWNhdGlvbkNvbmZpZycsXG4gICAgJ0Bhbmd1bGFyL2NvcmUnLFxuICApO1xuXG4gIHJldHVybiAhIWxvY2FsTmFtZSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJiBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gbG9jYWxOYW1lO1xufVxuXG4vKiogRmluZHMgdGhlIGBwcm92aWRlcnNgIGFycmF5IGxpdGVyYWwgd2l0aGluIGFuIGFwcGxpY2F0aW9uIGNvbmZpZy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUHJvdmlkZXJzTGl0ZXJhbChcbiAgY29uZmlnOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbixcbik6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24gfCBudWxsIHtcbiAgZm9yIChjb25zdCBwcm9wIG9mIGNvbmZpZy5wcm9wZXJ0aWVzKSB7XG4gICAgaWYgKFxuICAgICAgdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocHJvcCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmXG4gICAgICBwcm9wLm5hbWUudGV4dCA9PT0gJ3Byb3ZpZGVycycgJiZcbiAgICAgIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwcm9wLmluaXRpYWxpemVyKVxuICAgICkge1xuICAgICAgcmV0dXJuIHByb3AuaW5pdGlhbGl6ZXI7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=