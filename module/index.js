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
const workspace_1 = require("../utility/workspace");
const schema_1 = require("./schema");
function buildRelativeModulePath(options, modulePath) {
    const importModulePath = (0, core_1.normalize)(`/${options.path}/` +
        (options.flat ? '' : schematics_1.strings.dasherize(options.name) + '/') +
        schematics_1.strings.dasherize(options.name) +
        '.module');
    return (0, find_module_1.buildRelativePath)(modulePath, importModulePath);
}
function addDeclarationToNgModule(options) {
    return (host) => {
        if (!options.module) {
            return host;
        }
        const modulePath = options.module;
        const text = host.read(modulePath);
        if (text === null) {
            throw new schematics_1.SchematicsException(`File ${modulePath} does not exist.`);
        }
        const sourceText = text.toString();
        const source = ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
        const relativePath = buildRelativeModulePath(options, modulePath);
        const changes = (0, ast_utils_1.addImportToModule)(source, modulePath, schematics_1.strings.classify(`${options.name}Module`), relativePath);
        const recorder = host.beginUpdate(modulePath);
        for (const change of changes) {
            if (change instanceof change_1.InsertChange) {
                recorder.insertLeft(change.pos, change.toAdd);
            }
        }
        host.commitUpdate(recorder);
        return host;
    };
}
function addRouteDeclarationToNgModule(options, routingModulePath) {
    return (host) => {
        if (!options.route) {
            return host;
        }
        if (!options.module) {
            throw new Error('Module option required when creating a lazy loaded routing module.');
        }
        let path;
        if (routingModulePath) {
            path = routingModulePath;
        }
        else {
            path = options.module;
        }
        const text = host.read(path);
        if (!text) {
            throw new Error(`Couldn't find the module nor its routing module.`);
        }
        const sourceText = text.toString();
        const addDeclaration = (0, ast_utils_1.addRouteDeclarationToModule)(ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true), path, buildRoute(options, options.module));
        const recorder = host.beginUpdate(path);
        recorder.insertLeft(addDeclaration.pos, addDeclaration.toAdd);
        host.commitUpdate(recorder);
        return host;
    };
}
function getRoutingModulePath(host, modulePath) {
    const routingModulePath = modulePath.endsWith(find_module_1.ROUTING_MODULE_EXT)
        ? modulePath
        : modulePath.replace(find_module_1.MODULE_EXT, find_module_1.ROUTING_MODULE_EXT);
    return host.exists(routingModulePath) ? (0, core_1.normalize)(routingModulePath) : undefined;
}
function buildRoute(options, modulePath) {
    const relativeModulePath = buildRelativeModulePath(options, modulePath);
    const moduleName = `${schematics_1.strings.classify(options.name)}Module`;
    const loadChildren = `() => import('${relativeModulePath}').then(m => m.${moduleName})`;
    return `{ path: '${options.route}', loadChildren: ${loadChildren} }`;
}
function default_1(options) {
    return async (host) => {
        if (options.path === undefined) {
            options.path = await (0, workspace_1.createDefaultPath)(host, options.project);
        }
        if (options.module) {
            options.module = (0, find_module_1.findModuleFromOptions)(host, options);
        }
        let routingModulePath;
        const isLazyLoadedModuleGen = !!(options.route && options.module);
        if (isLazyLoadedModuleGen) {
            options.routingScope = schema_1.RoutingScope.Child;
            routingModulePath = getRoutingModulePath(host, options.module);
        }
        const parsedPath = (0, parse_name_1.parseName)(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            options.routing || (isLazyLoadedModuleGen && routingModulePath)
                ? (0, schematics_1.noop)()
                : (0, schematics_1.filter)((path) => !path.endsWith('-routing.module.ts.template')),
            (0, schematics_1.applyTemplates)({
                ...schematics_1.strings,
                'if-flat': (s) => (options.flat ? '' : s),
                lazyRoute: isLazyLoadedModuleGen,
                lazyRouteWithoutRouteModule: isLazyLoadedModuleGen && !routingModulePath,
                lazyRouteWithRouteModule: isLazyLoadedModuleGen && !!routingModulePath,
                ...options,
            }),
            (0, schematics_1.move)(parsedPath.path),
        ]);
        const moduleDasherized = schematics_1.strings.dasherize(options.name);
        const modulePath = `${!options.flat ? moduleDasherized + '/' : ''}${moduleDasherized}.module.ts`;
        const componentOptions = {
            module: modulePath,
            flat: options.flat,
            name: options.name,
            path: options.path,
            project: options.project,
        };
        return (0, schematics_1.chain)([
            !isLazyLoadedModuleGen ? addDeclarationToNgModule(options) : (0, schematics_1.noop)(),
            addRouteDeclarationToNgModule(options, routingModulePath),
            (0, schematics_1.mergeWith)(templateSource),
            isLazyLoadedModuleGen ? (0, schematics_1.schematic)('component', componentOptions) : (0, schematics_1.noop)(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbW9kdWxlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBdUQ7QUFDdkQsMkRBY29DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFBc0Y7QUFDdEYsOENBQWlEO0FBQ2pELHdEQUtnQztBQUNoQyxzREFBa0Q7QUFDbEQsb0RBQXlEO0FBQ3pELHFDQUFpRTtBQUVqRSxTQUFTLHVCQUF1QixDQUFDLE9BQXNCLEVBQUUsVUFBa0I7SUFDekUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLGdCQUFTLEVBQ2hDLElBQUksT0FBTyxDQUFDLElBQUksR0FBRztRQUNqQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzRCxvQkFBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQy9CLFNBQVMsQ0FDWixDQUFDO0lBRUYsT0FBTyxJQUFBLCtCQUFpQixFQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE9BQXNCO0lBQ3RELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUVsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25DLElBQUksSUFBSSxLQUFLLElB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TSxVQUFVLEdBQUcsR0FDakIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQzNDLEdBQUcsZ0JBQWdCLFlBQVksQ0FBQztRQUVoQyxNQUFNLGdCQUFnQixHQUFxQjtZQUN6QyxNQUFNLEVBQUUsVUFBVTtZQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87U0FDekIsQ0FBQztRQUVGLE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtZQUNuRSw2QkFBNkIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDekQsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQztZQUN6QixxQkFBcUIsQ0FBQyxDQUFDLENBQUMsSUFBQSxzQkFBUyxFQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7U0FDMUUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZERCw0QkF1REMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUGF0aCwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgZmlsdGVyLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBhZGRJbXBvcnRUb01vZHVsZSwgYWRkUm91dGVEZWNsYXJhdGlvblRvTW9kdWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHtcbiAgTU9EVUxFX0VYVCxcbiAgUk9VVElOR19NT0RVTEVfRVhULFxuICBidWlsZFJlbGF0aXZlUGF0aCxcbiAgZmluZE1vZHVsZUZyb21PcHRpb25zLFxufSBmcm9tICcuLi91dGlsaXR5L2ZpbmQtbW9kdWxlJztcbmltcG9ydCB7IHBhcnNlTmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvcGFyc2UtbmFtZSc7XG5pbXBvcnQgeyBjcmVhdGVEZWZhdWx0UGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IFNjaGVtYSBhcyBNb2R1bGVPcHRpb25zLCBSb3V0aW5nU2NvcGUgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMsIG1vZHVsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGltcG9ydE1vZHVsZVBhdGggPSBub3JtYWxpemUoXG4gICAgYC8ke29wdGlvbnMucGF0aH0vYCArXG4gICAgICAob3B0aW9ucy5mbGF0ID8gJycgOiBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpICsgJy8nKSArXG4gICAgICBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpICtcbiAgICAgICcubW9kdWxlJyxcbiAgKTtcblxuICByZXR1cm4gYnVpbGRSZWxhdGl2ZVBhdGgobW9kdWxlUGF0aCwgaW1wb3J0TW9kdWxlUGF0aCk7XG59XG5cbmZ1bmN0aW9uIGFkZERlY2xhcmF0aW9uVG9OZ01vZHVsZShvcHRpb25zOiBNb2R1bGVPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIHJldHVybiBob3N0O1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBvcHRpb25zLm1vZHVsZTtcblxuICAgIGNvbnN0IHRleHQgPSBob3N0LnJlYWQobW9kdWxlUGF0aCk7XG4gICAgaWYgKHRleHQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBGaWxlICR7bW9kdWxlUGF0aH0gZG9lcyBub3QgZXhpc3QuYCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSB0ZXh0LnRvU3RyaW5nKCk7XG4gICAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBzb3VyY2VUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShcbiAgICAgIHNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICBzdHJpbmdzLmNsYXNzaWZ5KGAke29wdGlvbnMubmFtZX1Nb2R1bGVgKSxcbiAgICAgIHJlbGF0aXZlUGF0aCxcbiAgICApO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGZvciAoY29uc3QgY2hhbmdlIG9mIGNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkUm91dGVEZWNsYXJhdGlvblRvTmdNb2R1bGUoXG4gIG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMsXG4gIHJvdXRpbmdNb2R1bGVQYXRoOiBQYXRoIHwgdW5kZWZpbmVkLFxuKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5yb3V0ZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTW9kdWxlIG9wdGlvbiByZXF1aXJlZCB3aGVuIGNyZWF0aW5nIGEgbGF6eSBsb2FkZWQgcm91dGluZyBtb2R1bGUuJyk7XG4gICAgfVxuXG4gICAgbGV0IHBhdGg6IHN0cmluZztcbiAgICBpZiAocm91dGluZ01vZHVsZVBhdGgpIHtcbiAgICAgIHBhdGggPSByb3V0aW5nTW9kdWxlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuICAgIH1cblxuICAgIGNvbnN0IHRleHQgPSBob3N0LnJlYWQocGF0aCk7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkbid0IGZpbmQgdGhlIG1vZHVsZSBub3IgaXRzIHJvdXRpbmcgbW9kdWxlLmApO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSB0ZXh0LnRvU3RyaW5nKCk7XG4gICAgY29uc3QgYWRkRGVjbGFyYXRpb24gPSBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUoXG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIHNvdXJjZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpLFxuICAgICAgcGF0aCxcbiAgICAgIGJ1aWxkUm91dGUob3B0aW9ucywgb3B0aW9ucy5tb2R1bGUpLFxuICAgICkgYXMgSW5zZXJ0Q2hhbmdlO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHBhdGgpO1xuICAgIHJlY29yZGVyLmluc2VydExlZnQoYWRkRGVjbGFyYXRpb24ucG9zLCBhZGREZWNsYXJhdGlvbi50b0FkZCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRpbmdNb2R1bGVQYXRoKGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IFBhdGggfCB1bmRlZmluZWQge1xuICBjb25zdCByb3V0aW5nTW9kdWxlUGF0aCA9IG1vZHVsZVBhdGguZW5kc1dpdGgoUk9VVElOR19NT0RVTEVfRVhUKVxuICAgID8gbW9kdWxlUGF0aFxuICAgIDogbW9kdWxlUGF0aC5yZXBsYWNlKE1PRFVMRV9FWFQsIFJPVVRJTkdfTU9EVUxFX0VYVCk7XG5cbiAgcmV0dXJuIGhvc3QuZXhpc3RzKHJvdXRpbmdNb2R1bGVQYXRoKSA/IG5vcm1hbGl6ZShyb3V0aW5nTW9kdWxlUGF0aCkgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUm91dGUob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGF0aXZlTW9kdWxlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICBjb25zdCBtb2R1bGVOYW1lID0gYCR7c3RyaW5ncy5jbGFzc2lmeShvcHRpb25zLm5hbWUpfU1vZHVsZWA7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbiA9IGAoKSA9PiBpbXBvcnQoJyR7cmVsYXRpdmVNb2R1bGVQYXRofScpLnRoZW4obSA9PiBtLiR7bW9kdWxlTmFtZX0pYDtcblxuICByZXR1cm4gYHsgcGF0aDogJyR7b3B0aW9ucy5yb3V0ZX0nLCBsb2FkQ2hpbGRyZW46ICR7bG9hZENoaWxkcmVufSB9YDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLnBhdGggPSBhd2FpdCBjcmVhdGVEZWZhdWx0UGF0aChob3N0LCBvcHRpb25zLnByb2plY3QgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIG9wdGlvbnMubW9kdWxlID0gZmluZE1vZHVsZUZyb21PcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCByb3V0aW5nTW9kdWxlUGF0aDogUGF0aCB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBpc0xhenlMb2FkZWRNb2R1bGVHZW4gPSAhIShvcHRpb25zLnJvdXRlICYmIG9wdGlvbnMubW9kdWxlKTtcbiAgICBpZiAoaXNMYXp5TG9hZGVkTW9kdWxlR2VuKSB7XG4gICAgICBvcHRpb25zLnJvdXRpbmdTY29wZSA9IFJvdXRpbmdTY29wZS5DaGlsZDtcbiAgICAgIHJvdXRpbmdNb2R1bGVQYXRoID0gZ2V0Um91dGluZ01vZHVsZVBhdGgoaG9zdCwgb3B0aW9ucy5tb2R1bGUgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJzZWRQYXRoID0gcGFyc2VOYW1lKG9wdGlvbnMucGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgb3B0aW9ucy5wYXRoID0gcGFyc2VkUGF0aC5wYXRoO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5yb3V0aW5nIHx8IChpc0xhenlMb2FkZWRNb2R1bGVHZW4gJiYgcm91dGluZ01vZHVsZVBhdGgpXG4gICAgICAgID8gbm9vcCgpXG4gICAgICAgIDogZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLXJvdXRpbmcubW9kdWxlLnRzLnRlbXBsYXRlJykpLFxuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAnaWYtZmxhdCc6IChzOiBzdHJpbmcpID0+IChvcHRpb25zLmZsYXQgPyAnJyA6IHMpLFxuICAgICAgICBsYXp5Um91dGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbixcbiAgICAgICAgbGF6eVJvdXRlV2l0aG91dFJvdXRlTW9kdWxlOiBpc0xhenlMb2FkZWRNb2R1bGVHZW4gJiYgIXJvdXRpbmdNb2R1bGVQYXRoLFxuICAgICAgICBsYXp5Um91dGVXaXRoUm91dGVNb2R1bGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiAhIXJvdXRpbmdNb2R1bGVQYXRoLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHBhcnNlZFBhdGgucGF0aCksXG4gICAgXSk7XG4gICAgY29uc3QgbW9kdWxlRGFzaGVyaXplZCA9IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSk7XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGAke1xuICAgICAgIW9wdGlvbnMuZmxhdCA/IG1vZHVsZURhc2hlcml6ZWQgKyAnLycgOiAnJ1xuICAgIH0ke21vZHVsZURhc2hlcml6ZWR9Lm1vZHVsZS50c2A7XG5cbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zOiBDb21wb25lbnRPcHRpb25zID0ge1xuICAgICAgbW9kdWxlOiBtb2R1bGVQYXRoLFxuICAgICAgZmxhdDogb3B0aW9ucy5mbGF0LFxuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgcGF0aDogb3B0aW9ucy5wYXRoLFxuICAgICAgcHJvamVjdDogb3B0aW9ucy5wcm9qZWN0LFxuICAgIH07XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgIWlzTGF6eUxvYWRlZE1vZHVsZUdlbiA/IGFkZERlY2xhcmF0aW9uVG9OZ01vZHVsZShvcHRpb25zKSA6IG5vb3AoKSxcbiAgICAgIGFkZFJvdXRlRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnMsIHJvdXRpbmdNb2R1bGVQYXRoKSxcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBpc0xhenlMb2FkZWRNb2R1bGVHZW4gPyBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIGNvbXBvbmVudE9wdGlvbnMpIDogbm9vcCgpLFxuICAgIF0pO1xuICB9O1xufVxuIl19