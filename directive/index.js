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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZGlyZWN0aXZlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUErQztBQUMvQywyREFZb0M7QUFDcEMsa0dBQW9GO0FBQ3BGLG9EQUFpRjtBQUNqRiw4Q0FBaUQ7QUFDakQsd0RBQWtGO0FBQ2xGLHNEQUFrRDtBQUNsRCxzREFBNkQ7QUFDN0Qsb0RBQXNFO0FBR3RFLFNBQVMsd0JBQXdCLENBQUMsT0FBeUI7SUFDekQsT0FBTyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDekMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDbEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7WUFDakIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLFFBQVEsVUFBVSxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3JFO1FBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6RixNQUFNLGFBQWEsR0FDakIsSUFBSSxPQUFPLENBQUMsSUFBSSxHQUFHO1lBQ25CLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMs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QkFBSSxHQUFFO1lBQ2xGLElBQUEsMkJBQWMsRUFBQztnQkFDYixHQUFHLGNBQU87Z0JBQ1YsU0FBUyxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxHQUFHLE9BQU87YUFDWCxDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7U0FDdEIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFBLGtCQUFLLEVBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9FLENBQUMsQ0FBQztBQUNKLENBQUM7QUFqQ0QsNEJBaUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGFkZERlY2xhcmF0aW9uVG9Nb2R1bGUsIGFkZEV4cG9ydFRvTW9kdWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgYnVpbGRSZWxhdGl2ZVBhdGgsIGZpbmRNb2R1bGVGcm9tT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvZmluZC1tb2R1bGUnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IHZhbGlkYXRlSHRtbFNlbGVjdG9yIH0gZnJvbSAnLi4vdXRpbGl0eS92YWxpZGF0aW9uJztcbmltcG9ydCB7IGJ1aWxkRGVmYXVsdFBhdGgsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBEaXJlY3RpdmVPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBhZGREZWNsYXJhdGlvblRvTmdNb2R1bGUob3B0aW9uczogRGlyZWN0aXZlT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBpZiAob3B0aW9ucy5za2lwSW1wb3J0IHx8ICFvcHRpb25zLm1vZHVsZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuICAgIGNvbnN0IHRleHQgPSBob3N0LnJlYWQobW9kdWxlUGF0aCk7XG4gICAgaWYgKHRleHQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBGaWxlICR7bW9kdWxlUGF0aH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSB0ZXh0LnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUobW9kdWxlUGF0aCwgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgICBjb25zdCBkaXJlY3RpdmVQYXRoID1cbiAgICAgIGAvJHtvcHRpb25zLnBhdGh9L2AgK1xuICAgICAgKG9wdGlvbnMuZmxhdCA/ICcnIDogc3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy5uYW1lKSArICcvJykgK1xuICAgICAgc3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy5uYW1lKSArXG4gICAgICAnLmRpcmVjdGl2ZSc7XG4gICAgY29uc3QgcmVsYXRpdmVQYXRoID0gYnVpbGRSZWxhdGl2ZVBhdGgobW9kdWxlUGF0aCwgZGlyZWN0aXZlUGF0aCk7XG4gICAgY29uc3QgY2xhc3NpZmllZE5hbWUgPSBzdHJpbmdzLmNsYXNzaWZ5KGAke29wdGlvbnMubmFtZX1EaXJlY3RpdmVgKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbkNoYW5nZXMgPSBhZGREZWNsYXJhdGlvblRvTW9kdWxlKFxuICAgICAgc291cmNlLFxuICAgICAgbW9kdWxlUGF0aCxcbiAgICAgIGNsYXNzaWZpZWROYW1lLFxuICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICk7XG4gICAgY29uc3QgZGVjbGFyYXRpb25SZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgZm9yIChjb25zdCBjaGFuZ2Ugb2YgZGVjbGFyYXRpb25DaGFuZ2VzKSB7XG4gICAgICBpZiAoY2hhbmdlIGluc3RhbmNlb2YgSW5zZXJ0Q2hhbmdlKSB7XG4gICAgICAgIGRlY2xhcmF0aW9uUmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShkZWNsYXJhdGlvblJlY29yZGVyKTtcblxuICAgIGlmIChvcHRpb25zLmV4cG9ydCkge1xuICAgICAgLy8gTmVlZCB0byByZWZyZXNoIHRoZSBBU1QgYmVjYXVzZSB3ZSBvdmVyd3JvdGUgdGhlIGZpbGUgaW4gdGhlIGhvc3QuXG4gICAgICBjb25zdCB0ZXh0ID0gaG9zdC5yZWFkKG1vZHVsZVBhdGgpO1xuICAgICAgaWYgKHRleHQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEZpbGUgJHttb2R1bGVQYXRofSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNvdXJjZVRleHQgPSB0ZXh0LnRvU3RyaW5nKCd1dGYtOCcpO1xuICAgICAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBzb3VyY2VUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICAgICAgY29uc3QgZXhwb3J0UmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgY29uc3QgZXhwb3J0Q2hhbmdlcyA9IGFkZEV4cG9ydFRvTW9kdWxlKFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIG1vZHVsZVBhdGgsXG4gICAgICAgIHN0cmluZ3MuY2xhc3NpZnkoYCR7b3B0aW9ucy5uYW1lfURpcmVjdGl2ZWApLFxuICAgICAgICByZWxhdGl2ZVBhdGgsXG4gICAgICApO1xuXG4gICAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBleHBvcnRDaGFuZ2VzKSB7XG4gICAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgICBleHBvcnRSZWNvcmRlci5pbnNlcnRMZWZ0KGNoYW5nZS5wb3MsIGNoYW5nZS50b0FkZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKGV4cG9ydFJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYnVpbGRTZWxlY3RvcihvcHRpb25zOiBEaXJlY3RpdmVPcHRpb25zLCBwcm9qZWN0UHJlZml4OiBzdHJpbmcpIHtcbiAgbGV0IHNlbGVjdG9yID0gb3B0aW9ucy5uYW1lO1xuICBpZiAob3B0aW9ucy5wcmVmaXgpIHtcbiAgICBzZWxlY3RvciA9IGAke29wdGlvbnMucHJlZml4fS0ke3NlbGVjdG9yfWA7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5wcmVmaXggPT09IHVuZGVmaW5lZCAmJiBwcm9qZWN0UHJlZml4KSB7XG4gICAgc2VsZWN0b3IgPSBgJHtwcm9qZWN0UHJlZml4fS0ke3NlbGVjdG9yfWA7XG4gIH1cblxuICByZXR1cm4gc3RyaW5ncy5jYW1lbGl6ZShzZWxlY3Rvcik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBEaXJlY3RpdmVPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QgYXMgc3RyaW5nKTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IFwiJHtvcHRpb25zLnByb2plY3R9XCIgZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLnBhdGggPSBidWlsZERlZmF1bHRQYXRoKHByb2plY3QpO1xuICAgIH1cblxuICAgIG9wdGlvbnMubW9kdWxlID0gZmluZE1vZHVsZUZyb21PcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgcGFyc2VkUGF0aCA9IHBhcnNlTmFtZShvcHRpb25zLnBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgb3B0aW9ucy5uYW1lID0gcGFyc2VkUGF0aC5uYW1lO1xuICAgIG9wdGlvbnMucGF0aCA9IHBhcnNlZFBhdGgucGF0aDtcbiAgICBvcHRpb25zLnNlbGVjdG9yID0gb3B0aW9ucy5zZWxlY3RvciB8fCBidWlsZFNlbGVjdG9yKG9wdGlvbnMsIHByb2plY3QucHJlZml4IHx8ICcnKTtcblxuICAgIHZhbGlkYXRlSHRtbFNlbGVjdG9yKG9wdGlvbnMuc2VsZWN0b3IpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5za2lwVGVzdHMgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKSA6IG5vb3AoKSxcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgJ2lmLWZsYXQnOiAoczogc3RyaW5nKSA9PiAob3B0aW9ucy5mbGF0ID8gJycgOiBzKSxcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwYXJzZWRQYXRoLnBhdGgpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFthZGREZWNsYXJhdGlvblRvTmdNb2R1bGUob3B0aW9ucyksIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSldKTtcbiAgfTtcbn1cbiJdfQ==