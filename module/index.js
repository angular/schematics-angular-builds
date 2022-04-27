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
        const sourceText = host.readText(modulePath);
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
        const sourceText = host.readText(path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbW9kdWxlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBdUQ7QUFDdkQsMkRBY29DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFBc0Y7QUFDdEYsOENBQWlEO0FBQ2pELHdEQUtnQztBQUNoQyxzREFBa0Q7QUFDbEQsb0RBQXlEO0FBQ3pELHFDQUFpRTtBQUVqRSxTQUFTLHVCQUF1QixDQUFDLE9BQXNCLEVBQUUsVUFBa0I7SUFDekUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLGdCQUFTLEVBQ2hDLElBQUksT0FBTyxDQUFDLElBQUksR0FBRztRQUNqQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMzRCxvQkFBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQy9CLFNBQVMsQ0FDWixDQUFDO0lBRUYsT0FBTyxJQUFBLCtCQUFpQixFQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE9BQXNCO0lBQ3RELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUVsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLEVB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LE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztTQUN6QixDQUFDO1FBRUYsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO1lBQ25FLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQztZQUN6RCxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDO1lBQ3pCLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFBLHNCQUFTLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdkRELDRCQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBQYXRoLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGFkZEltcG9ydFRvTW9kdWxlLCBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBNT0RVTEVfRVhULFxuICBST1VUSU5HX01PRFVMRV9FWFQsXG4gIGJ1aWxkUmVsYXRpdmVQYXRoLFxuICBmaW5kTW9kdWxlRnJvbU9wdGlvbnMsXG59IGZyb20gJy4uL3V0aWxpdHkvZmluZC1tb2R1bGUnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IGNyZWF0ZURlZmF1bHRQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIE1vZHVsZU9wdGlvbnMsIFJvdXRpbmdTY29wZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZU1vZHVsZVBhdGgob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgaW1wb3J0TW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShcbiAgICBgLyR7b3B0aW9ucy5wYXRofS9gICtcbiAgICAgIChvcHRpb25zLmZsYXQgPyAnJyA6IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgKyAnLycpICtcbiAgICAgIHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgK1xuICAgICAgJy5tb2R1bGUnLFxuICApO1xuXG4gIHJldHVybiBidWlsZFJlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGVQYXRoKTtcbn1cblxuZnVuY3Rpb24gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm1vZHVsZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuXG4gICAgY29uc3Qgc291cmNlVGV4dCA9IGhvc3QucmVhZFRleHQobW9kdWxlUGF0aCk7XG4gICAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBzb3VyY2VUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShcbiAgICAgIHNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICBzdHJpbmdzLmNsYXNzaWZ5KGAke29wdGlvbnMubmFtZX1Nb2R1bGVgKSxcbiAgICAgIHJlbGF0aXZlUGF0aCxcbiAgICApO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGZvciAoY29uc3QgY2hhbmdlIG9mIGNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkUm91dGVEZWNsYXJhdGlvblRvTmdNb2R1bGUoXG4gIG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMsXG4gIHJvdXRpbmdNb2R1bGVQYXRoOiBQYXRoIHwgdW5kZWZpbmVkLFxuKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5yb3V0ZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTW9kdWxlIG9wdGlvbiByZXF1aXJlZCB3aGVuIGNyZWF0aW5nIGEgbGF6eSBsb2FkZWQgcm91dGluZyBtb2R1bGUuJyk7XG4gICAgfVxuXG4gICAgbGV0IHBhdGg6IHN0cmluZztcbiAgICBpZiAocm91dGluZ01vZHVsZVBhdGgpIHtcbiAgICAgIHBhdGggPSByb3V0aW5nTW9kdWxlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBob3N0LnJlYWRUZXh0KHBhdGgpO1xuXG4gICAgY29uc3QgYWRkRGVjbGFyYXRpb24gPSBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUoXG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIHNvdXJjZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpLFxuICAgICAgcGF0aCxcbiAgICAgIGJ1aWxkUm91dGUob3B0aW9ucywgb3B0aW9ucy5tb2R1bGUpLFxuICAgICkgYXMgSW5zZXJ0Q2hhbmdlO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHBhdGgpO1xuICAgIHJlY29yZGVyLmluc2VydExlZnQoYWRkRGVjbGFyYXRpb24ucG9zLCBhZGREZWNsYXJhdGlvbi50b0FkZCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRpbmdNb2R1bGVQYXRoKGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IFBhdGggfCB1bmRlZmluZWQge1xuICBjb25zdCByb3V0aW5nTW9kdWxlUGF0aCA9IG1vZHVsZVBhdGguZW5kc1dpdGgoUk9VVElOR19NT0RVTEVfRVhUKVxuICAgID8gbW9kdWxlUGF0aFxuICAgIDogbW9kdWxlUGF0aC5yZXBsYWNlKE1PRFVMRV9FWFQsIFJPVVRJTkdfTU9EVUxFX0VYVCk7XG5cbiAgcmV0dXJuIGhvc3QuZXhpc3RzKHJvdXRpbmdNb2R1bGVQYXRoKSA/IG5vcm1hbGl6ZShyb3V0aW5nTW9kdWxlUGF0aCkgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUm91dGUob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGF0aXZlTW9kdWxlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICBjb25zdCBtb2R1bGVOYW1lID0gYCR7c3RyaW5ncy5jbGFzc2lmeShvcHRpb25zLm5hbWUpfU1vZHVsZWA7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbiA9IGAoKSA9PiBpbXBvcnQoJyR7cmVsYXRpdmVNb2R1bGVQYXRofScpLnRoZW4obSA9PiBtLiR7bW9kdWxlTmFtZX0pYDtcblxuICByZXR1cm4gYHsgcGF0aDogJyR7b3B0aW9ucy5yb3V0ZX0nLCBsb2FkQ2hpbGRyZW46ICR7bG9hZENoaWxkcmVufSB9YDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLnBhdGggPSBhd2FpdCBjcmVhdGVEZWZhdWx0UGF0aChob3N0LCBvcHRpb25zLnByb2plY3QgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIG9wdGlvbnMubW9kdWxlID0gZmluZE1vZHVsZUZyb21PcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCByb3V0aW5nTW9kdWxlUGF0aDogUGF0aCB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBpc0xhenlMb2FkZWRNb2R1bGVHZW4gPSAhIShvcHRpb25zLnJvdXRlICYmIG9wdGlvbnMubW9kdWxlKTtcbiAgICBpZiAoaXNMYXp5TG9hZGVkTW9kdWxlR2VuKSB7XG4gICAgICBvcHRpb25zLnJvdXRpbmdTY29wZSA9IFJvdXRpbmdTY29wZS5DaGlsZDtcbiAgICAgIHJvdXRpbmdNb2R1bGVQYXRoID0gZ2V0Um91dGluZ01vZHVsZVBhdGgoaG9zdCwgb3B0aW9ucy5tb2R1bGUgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJzZWRQYXRoID0gcGFyc2VOYW1lKG9wdGlvbnMucGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgb3B0aW9ucy5wYXRoID0gcGFyc2VkUGF0aC5wYXRoO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgb3B0aW9ucy5yb3V0aW5nIHx8IChpc0xhenlMb2FkZWRNb2R1bGVHZW4gJiYgcm91dGluZ01vZHVsZVBhdGgpXG4gICAgICAgID8gbm9vcCgpXG4gICAgICAgIDogZmlsdGVyKChwYXRoKSA9PiAhcGF0aC5lbmRzV2l0aCgnLXJvdXRpbmcubW9kdWxlLnRzLnRlbXBsYXRlJykpLFxuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAnaWYtZmxhdCc6IChzOiBzdHJpbmcpID0+IChvcHRpb25zLmZsYXQgPyAnJyA6IHMpLFxuICAgICAgICBsYXp5Um91dGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbixcbiAgICAgICAgbGF6eVJvdXRlV2l0aG91dFJvdXRlTW9kdWxlOiBpc0xhenlMb2FkZWRNb2R1bGVHZW4gJiYgIXJvdXRpbmdNb2R1bGVQYXRoLFxuICAgICAgICBsYXp5Um91dGVXaXRoUm91dGVNb2R1bGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiAhIXJvdXRpbmdNb2R1bGVQYXRoLFxuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHBhcnNlZFBhdGgucGF0aCksXG4gICAgXSk7XG4gICAgY29uc3QgbW9kdWxlRGFzaGVyaXplZCA9IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSk7XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGAke1xuICAgICAgIW9wdGlvbnMuZmxhdCA/IG1vZHVsZURhc2hlcml6ZWQgKyAnLycgOiAnJ1xuICAgIH0ke21vZHVsZURhc2hlcml6ZWR9Lm1vZHVsZS50c2A7XG5cbiAgICBjb25zdCBjb21wb25lbnRPcHRpb25zOiBDb21wb25lbnRPcHRpb25zID0ge1xuICAgICAgbW9kdWxlOiBtb2R1bGVQYXRoLFxuICAgICAgZmxhdDogb3B0aW9ucy5mbGF0LFxuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgcGF0aDogb3B0aW9ucy5wYXRoLFxuICAgICAgcHJvamVjdDogb3B0aW9ucy5wcm9qZWN0LFxuICAgIH07XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgIWlzTGF6eUxvYWRlZE1vZHVsZUdlbiA/IGFkZERlY2xhcmF0aW9uVG9OZ01vZHVsZShvcHRpb25zKSA6IG5vb3AoKSxcbiAgICAgIGFkZFJvdXRlRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnMsIHJvdXRpbmdNb2R1bGVQYXRoKSxcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBpc0xhenlMb2FkZWRNb2R1bGVHZW4gPyBzY2hlbWF0aWMoJ2NvbXBvbmVudCcsIGNvbXBvbmVudE9wdGlvbnMpIDogbm9vcCgpLFxuICAgIF0pO1xuICB9O1xufVxuIl19