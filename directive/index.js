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
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const find_module_1 = require("../utility/find-module");
const parse_name_1 = require("../utility/parse-name");
const validation_1 = require("../utility/validation");
const workspace_1 = require("../utility/workspace");
function addDeclarationToNgModule(options) {
    return (host) => {
        if (options.skipImport || !options.module) {
            return host;
        }
        const modulePath = options.module;
        const text = host.read(modulePath);
        if (text === null) {
            throw new schematics_1.SchematicsException(`File ${modulePath} does not exist.`);
        }
        const sourceText = text.toString('utf-8');
        const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
        const directivePath = `/${options.path}/` +
            (options.flat ? '' : core_1.strings.dasherize(options.name) + '/') +
            core_1.strings.dasherize(options.name) +
            '.directive';
        const relativePath = (0, find_module_1.buildRelativePath)(modulePath, directivePath);
        const classifiedName = core_1.strings.classify(`${options.name}Directive`);
        const declarationChanges = (0, ast_utils_1.addDeclarationToModule)(source, modulePath, classifiedName, relativePath);
        const declarationRecorder = host.beginUpdate(modulePath);
        for (const change of declarationChanges) {
            if (change instanceof change_1.InsertChange) {
                declarationRecorder.insertLeft(change.pos, change.toAdd);
            }
        }
        host.commitUpdate(declarationRecorder);
        if (options.export) {
            // Need to refresh the AST because we overwrote the file in the host.
            const text = host.read(modulePath);
            if (text === null) {
                throw new schematics_1.SchematicsException(`File ${modulePath} does not exist.`);
            }
            const sourceText = text.toString('utf-8');
            const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
            const exportRecorder = host.beginUpdate(modulePath);
            const exportChanges = (0, ast_utils_1.addExportToModule)(source, modulePath, core_1.strings.classify(`${options.name}Directive`), relativePath);
            for (const change of exportChanges) {
                if (change instanceof change_1.InsertChange) {
                    exportRecorder.insertLeft(change.pos, change.toAdd);
                }
            }
            host.commitUpdate(exportRecorder);
        }
        return host;
    };
}
function buildSelector(options, projectPrefix) {
    let selector = options.name;
    if (options.prefix) {
        selector = `${options.prefix}-${selector}`;
    }
    else if (options.prefix === undefined && projectPrefix) {
        selector = `${projectPrefix}-${selector}`;
    }
    return core_1.strings.camelize(selector);
}
function default_1(options) {
    return async (host) => {
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project "${options.project}" does not exist.`);
        }
        if (options.path === undefined) {
            options.path = (0, workspace_1.buildDefaultPath)(project);
        }
        options.module = (0, find_module_1.findModuleFromOptions)(host, options);
        const parsedPath = (0, parse_name_1.parseName)(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        options.selector = options.selector || buildSelector(options, project.prefix || '');
        (0, validation_1.validateHtmlSelector)(options.selector);
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            options.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                'if-flat': (s) => (options.flat ? '' : s),
                ...options,
            }),
            (0, schematics_1.move)(parsedPath.path),
        ]);
        return (0, schematics_1.chain)([addDeclarationToNgModule(options), (0, schematics_1.mergeWith)(templateSource)]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZGlyZWN0aXZlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBK0M7QUFDL0MsMkRBWW9DO0FBQ3BDLGtHQUFvRjtBQUNwRixvREFBaUY7QUFDakYsOENBQWlEO0FBQ2pELHdEQUFrRjtBQUNsRixzREFBa0Q7QUFDbEQsc0RBQTZEO0FBQzdELG9EQUFzRTtBQUd0RSxTQUFTLHdCQUF3QixDQUFDLE9BQXlCO0lBQ3pELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbkMsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxRQUFRLFVBQVUsa0JBQWtCLENBQUMsQ0FBQztTQUNyRTtRQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFekYsTUFBTSxhQUFhLEdBQ2pCLElBQUksT0FBTyxDQUFDLElBQUksR0FBRztZQUNuQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxD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QUEsaUJBQUksR0FBRTtZQUNsRixJQUFBLDJCQUFjLEVBQUM7Z0JBQ2IsR0FBRyxjQUFPO2dCQUNWLFNBQVMsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQsR0FBRyxPQUFPO2FBQ1gsQ0FBQztZQUNGLElBQUEsaUJBQUksRUFBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1NBQ3RCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBakNELDRCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBhZGREZWNsYXJhdGlvblRvTW9kdWxlLCBhZGRFeHBvcnRUb01vZHVsZSB9IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IEluc2VydENoYW5nZSB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGJ1aWxkUmVsYXRpdmVQYXRoLCBmaW5kTW9kdWxlRnJvbU9wdGlvbnMgfSBmcm9tICcuLi91dGlsaXR5L2ZpbmQtbW9kdWxlJztcbmltcG9ydCB7IHBhcnNlTmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvcGFyc2UtbmFtZSc7XG5pbXBvcnQgeyB2YWxpZGF0ZUh0bWxTZWxlY3RvciB9IGZyb20gJy4uL3V0aWxpdHkvdmFsaWRhdGlvbic7XG5pbXBvcnQgeyBidWlsZERlZmF1bHRQYXRoLCBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRGlyZWN0aXZlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnM6IERpcmVjdGl2ZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMuc2tpcEltcG9ydCB8fCAhb3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBvcHRpb25zLm1vZHVsZTtcbiAgICBjb25zdCB0ZXh0ID0gaG9zdC5yZWFkKG1vZHVsZVBhdGgpO1xuICAgIGlmICh0ZXh0ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgRmlsZSAke21vZHVsZVBhdGh9IGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gdGV4dC50b1N0cmluZygndXRmLTgnKTtcbiAgICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKG1vZHVsZVBhdGgsIHNvdXJjZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gICAgY29uc3QgZGlyZWN0aXZlUGF0aCA9XG4gICAgICBgLyR7b3B0aW9ucy5wYXRofS9gICtcbiAgICAgIChvcHRpb25zLmZsYXQgPyAnJyA6IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgKyAnLycpICtcbiAgICAgIHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgK1xuICAgICAgJy5kaXJlY3RpdmUnO1xuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGJ1aWxkUmVsYXRpdmVQYXRoKG1vZHVsZVBhdGgsIGRpcmVjdGl2ZVBhdGgpO1xuICAgIGNvbnN0IGNsYXNzaWZpZWROYW1lID0gc3RyaW5ncy5jbGFzc2lmeShgJHtvcHRpb25zLm5hbWV9RGlyZWN0aXZlYCk7XG4gICAgY29uc3QgZGVjbGFyYXRpb25DaGFuZ2VzID0gYWRkRGVjbGFyYXRpb25Ub01vZHVsZShcbiAgICAgIHNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICBjbGFzc2lmaWVkTmFtZSxcbiAgICAgIHJlbGF0aXZlUGF0aCxcbiAgICApO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uUmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGZvciAoY29uc3QgY2hhbmdlIG9mIGRlY2xhcmF0aW9uQ2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZSBpbnN0YW5jZW9mIEluc2VydENoYW5nZSkge1xuICAgICAgICBkZWNsYXJhdGlvblJlY29yZGVyLmluc2VydExlZnQoY2hhbmdlLnBvcywgY2hhbmdlLnRvQWRkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaG9zdC5jb21taXRVcGRhdGUoZGVjbGFyYXRpb25SZWNvcmRlcik7XG5cbiAgICBpZiAob3B0aW9ucy5leHBvcnQpIHtcbiAgICAgIC8vIE5lZWQgdG8gcmVmcmVzaCB0aGUgQVNUIGJlY2F1c2Ugd2Ugb3Zlcndyb3RlIHRoZSBmaWxlIGluIHRoZSBob3N0LlxuICAgICAgY29uc3QgdGV4dCA9IGhvc3QucmVhZChtb2R1bGVQYXRoKTtcbiAgICAgIGlmICh0ZXh0ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBGaWxlICR7bW9kdWxlUGF0aH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBzb3VyY2VUZXh0ID0gdGV4dC50b1N0cmluZygndXRmLTgnKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUobW9kdWxlUGF0aCwgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgICAgIGNvbnN0IGV4cG9ydFJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGNvbnN0IGV4cG9ydENoYW5nZXMgPSBhZGRFeHBvcnRUb01vZHVsZShcbiAgICAgICAgc291cmNlLFxuICAgICAgICBtb2R1bGVQYXRoLFxuICAgICAgICBzdHJpbmdzLmNsYXNzaWZ5KGAke29wdGlvbnMubmFtZX1EaXJlY3RpdmVgKSxcbiAgICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICAgKTtcblxuICAgICAgZm9yIChjb25zdCBjaGFuZ2Ugb2YgZXhwb3J0Q2hhbmdlcykge1xuICAgICAgICBpZiAoY2hhbmdlIGluc3RhbmNlb2YgSW5zZXJ0Q2hhbmdlKSB7XG4gICAgICAgICAgZXhwb3J0UmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShleHBvcnRSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU2VsZWN0b3Iob3B0aW9uczogRGlyZWN0aXZlT3B0aW9ucywgcHJvamVjdFByZWZpeDogc3RyaW5nKSB7XG4gIGxldCBzZWxlY3RvciA9IG9wdGlvbnMubmFtZTtcbiAgaWYgKG9wdGlvbnMucHJlZml4KSB7XG4gICAgc2VsZWN0b3IgPSBgJHtvcHRpb25zLnByZWZpeH0tJHtzZWxlY3Rvcn1gO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMucHJlZml4ID09PSB1bmRlZmluZWQgJiYgcHJvamVjdFByZWZpeCkge1xuICAgIHNlbGVjdG9yID0gYCR7cHJvamVjdFByZWZpeH0tJHtzZWxlY3Rvcn1gO1xuICB9XG5cbiAgcmV0dXJuIHN0cmluZ3MuY2FtZWxpemUoc2VsZWN0b3IpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogRGlyZWN0aXZlT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0IGFzIHN0cmluZyk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBcIiR7b3B0aW9ucy5wcm9qZWN0fVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3B0aW9ucy5wYXRoID0gYnVpbGREZWZhdWx0UGF0aChwcm9qZWN0KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLm1vZHVsZSA9IGZpbmRNb2R1bGVGcm9tT3B0aW9ucyhob3N0LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnNlZFBhdGgubmFtZTtcbiAgICBvcHRpb25zLnBhdGggPSBwYXJzZWRQYXRoLnBhdGg7XG4gICAgb3B0aW9ucy5zZWxlY3RvciA9IG9wdGlvbnMuc2VsZWN0b3IgfHwgYnVpbGRTZWxlY3RvcihvcHRpb25zLCBwcm9qZWN0LnByZWZpeCB8fCAnJyk7XG5cbiAgICB2YWxpZGF0ZUh0bWxTZWxlY3RvcihvcHRpb25zLnNlbGVjdG9yKTtcblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgIG9wdGlvbnMuc2tpcFRlc3RzID8gZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLnNwZWMudHMudGVtcGxhdGUnKSkgOiBub29wKCksXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgICdpZi1mbGF0JzogKHM6IHN0cmluZykgPT4gKG9wdGlvbnMuZmxhdCA/ICcnIDogcyksXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1vdmUocGFyc2VkUGF0aC5wYXRoKSxcbiAgICBdKTtcblxuICAgIHJldHVybiBjaGFpbihbYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnMpLCBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpXSk7XG4gIH07XG59XG4iXX0=