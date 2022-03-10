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
const schema_1 = require("./schema");
function readIntoSourceFile(host, modulePath) {
    const text = host.read(modulePath);
    if (text === null) {
        throw new schematics_1.SchematicsException(`File ${modulePath} does not exist.`);
    }
    const sourceText = text.toString('utf-8');
    return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}
function addDeclarationToNgModule(options) {
    return (host) => {
        if (options.skipImport || !options.module) {
            return host;
        }
        options.type = options.type != null ? options.type : 'Component';
        const modulePath = options.module;
        const source = readIntoSourceFile(host, modulePath);
        const componentPath = `/${options.path}/` +
            (options.flat ? '' : core_1.strings.dasherize(options.name) + '/') +
            core_1.strings.dasherize(options.name) +
            (options.type ? '.' : '') +
            core_1.strings.dasherize(options.type);
        const relativePath = (0, find_module_1.buildRelativePath)(modulePath, componentPath);
        const classifiedName = core_1.strings.classify(options.name) + core_1.strings.classify(options.type);
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
            const source = readIntoSourceFile(host, modulePath);
            const exportRecorder = host.beginUpdate(modulePath);
            const exportChanges = (0, ast_utils_1.addExportToModule)(source, modulePath, core_1.strings.classify(options.name) + core_1.strings.classify(options.type), relativePath);
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
    let selector = core_1.strings.dasherize(options.name);
    if (options.prefix) {
        selector = `${options.prefix}-${selector}`;
    }
    else if (options.prefix === undefined && projectPrefix) {
        selector = `${projectPrefix}-${selector}`;
    }
    return selector;
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
        options.selector =
            options.selector || buildSelector(options, (project && project.prefix) || '');
        (0, validation_1.validateHtmlSelector)(options.selector);
        const skipStyleFile = options.inlineStyle || options.style === schema_1.Style.None;
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            options.skipTests ? (0, schematics_1.filter)((path) => !path.endsWith('.spec.ts.template')) : (0, schematics_1.noop)(),
            skipStyleFile ? (0, schematics_1.filter)((path) => !path.endsWith('.__style__.template')) : (0, schematics_1.noop)(),
            options.inlineTemplate ? (0, schematics_1.filter)((path) => !path.endsWith('.html.template')) : (0, schematics_1.noop)(),
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                'if-flat': (s) => (options.flat ? '' : s),
                ...options,
            }),
            !options.type
                ? (0, schematics_1.forEach)(((file) => {
                    return file.path.includes('..')
                        ? {
                            content: file.content,
                            path: file.path.replace('..', '.'),
                        }
                        : file;
                }))
                : (0, schematics_1.noop)(),
            (0, schematics_1.move)(parsedPath.path),
        ]);
        return (0, schematics_1.chain)([addDeclarationToNgModule(options), (0, schematics_1.mergeWith)(templateSource)]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvY29tcG9uZW50L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBK0M7QUFDL0MsMkRBY29DO0FBQ3BDLGtHQUFvRjtBQUNwRixvREFBaUY7QUFDakYsOENBQWlEO0FBQ2pELHdEQUFrRjtBQUNsRixzREFBa0Q7QUFDbEQsc0RBQTZEO0FBQzdELG9EQUFzRTtBQUN0RSxxQ0FBNkQ7QUFFN0QsU0FBUyxrQkFBa0IsQ0FBQyxJQUFVLEVBQUUsVUFBa0I7SUFDeEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7UUFDakIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLFFBQVEsVUFBVSxrQkFBa0IsQ0FBQyxDQUFDO0tBQ3JFO0lBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUxQyxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ25GLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE9BQXlCO0lBQ3pELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLE9BQU8sQ0FBQyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENB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Q3JCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO3lCQUNuQzt3QkFDSCxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNYLENBQUMsQ0FBaUIsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtZQUNWLElBQUEsaUJBQUksRUFBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1NBQ3RCLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBaERELDRCQWdEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgRmlsZU9wZXJhdG9yLFxuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIGZvckVhY2gsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGFkZERlY2xhcmF0aW9uVG9Nb2R1bGUsIGFkZEV4cG9ydFRvTW9kdWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgYnVpbGRSZWxhdGl2ZVBhdGgsIGZpbmRNb2R1bGVGcm9tT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvZmluZC1tb2R1bGUnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IHZhbGlkYXRlSHRtbFNlbGVjdG9yIH0gZnJvbSAnLi4vdXRpbGl0eS92YWxpZGF0aW9uJztcbmltcG9ydCB7IGJ1aWxkRGVmYXVsdFBhdGgsIGdldFdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zLCBTdHlsZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gcmVhZEludG9Tb3VyY2VGaWxlKGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCB0ZXh0ID0gaG9zdC5yZWFkKG1vZHVsZVBhdGgpO1xuICBpZiAodGV4dCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBGaWxlICR7bW9kdWxlUGF0aH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gIH1cbiAgY29uc3Qgc291cmNlVGV4dCA9IHRleHQudG9TdHJpbmcoJ3V0Zi04Jyk7XG5cbiAgcmV0dXJuIHRzLmNyZWF0ZVNvdXJjZUZpbGUobW9kdWxlUGF0aCwgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG59XG5cbmZ1bmN0aW9uIGFkZERlY2xhcmF0aW9uVG9OZ01vZHVsZShvcHRpb25zOiBDb21wb25lbnRPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmIChvcHRpb25zLnNraXBJbXBvcnQgfHwgIW9wdGlvbnMubW9kdWxlKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG5cbiAgICBvcHRpb25zLnR5cGUgPSBvcHRpb25zLnR5cGUgIT0gbnVsbCA/IG9wdGlvbnMudHlwZSA6ICdDb21wb25lbnQnO1xuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuICAgIGNvbnN0IHNvdXJjZSA9IHJlYWRJbnRvU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcblxuICAgIGNvbnN0IGNvbXBvbmVudFBhdGggPVxuICAgICAgYC8ke29wdGlvbnMucGF0aH0vYCArXG4gICAgICAob3B0aW9ucy5mbGF0ID8gJycgOiBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpICsgJy8nKSArXG4gICAgICBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpICtcbiAgICAgIChvcHRpb25zLnR5cGUgPyAnLicgOiAnJykgK1xuICAgICAgc3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy50eXBlKTtcbiAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBidWlsZFJlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBjb21wb25lbnRQYXRoKTtcbiAgICBjb25zdCBjbGFzc2lmaWVkTmFtZSA9IHN0cmluZ3MuY2xhc3NpZnkob3B0aW9ucy5uYW1lKSArIHN0cmluZ3MuY2xhc3NpZnkob3B0aW9ucy50eXBlKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbkNoYW5nZXMgPSBhZGREZWNsYXJhdGlvblRvTW9kdWxlKFxuICAgICAgc291cmNlLFxuICAgICAgbW9kdWxlUGF0aCxcbiAgICAgIGNsYXNzaWZpZWROYW1lLFxuICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICk7XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvblJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBkZWNsYXJhdGlvbkNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgZGVjbGFyYXRpb25SZWNvcmRlci5pbnNlcnRMZWZ0KGNoYW5nZS5wb3MsIGNoYW5nZS50b0FkZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGhvc3QuY29tbWl0VXBkYXRlKGRlY2xhcmF0aW9uUmVjb3JkZXIpO1xuXG4gICAgaWYgKG9wdGlvbnMuZXhwb3J0KSB7XG4gICAgICAvLyBOZWVkIHRvIHJlZnJlc2ggdGhlIEFTVCBiZWNhdXNlIHdlIG92ZXJ3cm90ZSB0aGUgZmlsZSBpbiB0aGUgaG9zdC5cbiAgICAgIGNvbnN0IHNvdXJjZSA9IHJlYWRJbnRvU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcblxuICAgICAgY29uc3QgZXhwb3J0UmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgY29uc3QgZXhwb3J0Q2hhbmdlcyA9IGFkZEV4cG9ydFRvTW9kdWxlKFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIG1vZHVsZVBhdGgsXG4gICAgICAgIHN0cmluZ3MuY2xhc3NpZnkob3B0aW9ucy5uYW1lKSArIHN0cmluZ3MuY2xhc3NpZnkob3B0aW9ucy50eXBlKSxcbiAgICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICAgKTtcblxuICAgICAgZm9yIChjb25zdCBjaGFuZ2Ugb2YgZXhwb3J0Q2hhbmdlcykge1xuICAgICAgICBpZiAoY2hhbmdlIGluc3RhbmNlb2YgSW5zZXJ0Q2hhbmdlKSB7XG4gICAgICAgICAgZXhwb3J0UmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShleHBvcnRSZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGJ1aWxkU2VsZWN0b3Iob3B0aW9uczogQ29tcG9uZW50T3B0aW9ucywgcHJvamVjdFByZWZpeDogc3RyaW5nKSB7XG4gIGxldCBzZWxlY3RvciA9IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSk7XG4gIGlmIChvcHRpb25zLnByZWZpeCkge1xuICAgIHNlbGVjdG9yID0gYCR7b3B0aW9ucy5wcmVmaXh9LSR7c2VsZWN0b3J9YDtcbiAgfSBlbHNlIGlmIChvcHRpb25zLnByZWZpeCA9PT0gdW5kZWZpbmVkICYmIHByb2plY3RQcmVmaXgpIHtcbiAgICBzZWxlY3RvciA9IGAke3Byb2plY3RQcmVmaXh9LSR7c2VsZWN0b3J9YDtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3Rvcjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IENvbXBvbmVudE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCBhcyBzdHJpbmcpO1xuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBcIiR7b3B0aW9ucy5wcm9qZWN0fVwiIGRvZXMgbm90IGV4aXN0LmApO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3B0aW9ucy5wYXRoID0gYnVpbGREZWZhdWx0UGF0aChwcm9qZWN0KTtcbiAgICB9XG5cbiAgICBvcHRpb25zLm1vZHVsZSA9IGZpbmRNb2R1bGVGcm9tT3B0aW9ucyhob3N0LCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoIGFzIHN0cmluZywgb3B0aW9ucy5uYW1lKTtcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgb3B0aW9ucy5wYXRoID0gcGFyc2VkUGF0aC5wYXRoO1xuICAgIG9wdGlvbnMuc2VsZWN0b3IgPVxuICAgICAgb3B0aW9ucy5zZWxlY3RvciB8fCBidWlsZFNlbGVjdG9yKG9wdGlvbnMsIChwcm9qZWN0ICYmIHByb2plY3QucHJlZml4KSB8fCAnJyk7XG5cbiAgICB2YWxpZGF0ZUh0bWxTZWxlY3RvcihvcHRpb25zLnNlbGVjdG9yKTtcblxuICAgIGNvbnN0IHNraXBTdHlsZUZpbGUgPSBvcHRpb25zLmlubGluZVN0eWxlIHx8IG9wdGlvbnMuc3R5bGUgPT09IFN0eWxlLk5vbmU7XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5za2lwVGVzdHMgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKSA6IG5vb3AoKSxcbiAgICAgIHNraXBTdHlsZUZpbGUgPyBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCcuX19zdHlsZV9fLnRlbXBsYXRlJykpIDogbm9vcCgpLFxuICAgICAgb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSA/IGZpbHRlcigocGF0aCkgPT4gIXBhdGguZW5kc1dpdGgoJy5odG1sLnRlbXBsYXRlJykpIDogbm9vcCgpLFxuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAnaWYtZmxhdCc6IChzOiBzdHJpbmcpID0+IChvcHRpb25zLmZsYXQgPyAnJyA6IHMpLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgfSksXG4gICAgICAhb3B0aW9ucy50eXBlXG4gICAgICAgID8gZm9yRWFjaCgoKGZpbGUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLnBhdGguaW5jbHVkZXMoJy4uJylcbiAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICBjb250ZW50OiBmaWxlLmNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlLnBhdGgucmVwbGFjZSgnLi4nLCAnLicpLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgOiBmaWxlO1xuICAgICAgICAgIH0pIGFzIEZpbGVPcGVyYXRvcilcbiAgICAgICAgOiBub29wKCksXG4gICAgICBtb3ZlKHBhcnNlZFBhdGgucGF0aCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW2FkZERlY2xhcmF0aW9uVG9OZ01vZHVsZShvcHRpb25zKSwgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKV0pO1xuICB9O1xufVxuIl19