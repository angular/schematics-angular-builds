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
const workspace_1 = require("../utility/workspace");
const schema_1 = require("./schema");
function buildRelativeModulePath(options, modulePath) {
    const importModulePath = (0, core_1.normalize)(`/${options.path}/` +
        (options.flat ? '' : core_1.strings.dasherize(options.name) + '/') +
        core_1.strings.dasherize(options.name) +
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
        const changes = (0, ast_utils_1.addImportToModule)(source, modulePath, core_1.strings.classify(`${options.name}Module`), relativePath);
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
    const moduleName = `${core_1.strings.classify(options.name)}Module`;
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
                ...core_1.strings,
                'if-flat': (s) => (options.flat ? '' : s),
                lazyRoute: isLazyLoadedModuleGen,
                lazyRouteWithoutRouteModule: isLazyLoadedModuleGen && !routingModulePath,
                lazyRouteWithRouteModule: isLazyLoadedModuleGen && !!routingModulePath,
                ...options,
            }),
            (0, schematics_1.move)(parsedPath.path),
        ]);
        const moduleDasherized = core_1.strings.dasherize(options.name);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbW9kdWxlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFnRTtBQUNoRSwyREFhb0M7QUFFcEMsa0dBQW9GO0FBQ3BGLG9EQUFzRjtBQUN0Riw4Q0FBaUQ7QUFDakQsd0RBS2dDO0FBQ2hDLHNEQUFrRDtBQUNsRCxvREFBeUQ7QUFDekQscUNBQWlFO0FBRWpFLFNBQVMsdUJBQXVCLENBQUMsT0FBc0IsRUFBRSxVQUFrQjtJQUN6RSxNQUFNLGdCQUFnQixHQUFHLElBQUEsZ0JBQVMsRUFDaEMsSUFBSSxPQUFPLENBQUMsSUFBSSxHQUFHO1FBQ2pCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0QsY0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQy9CLFNBQVMsQ0FDWixDQUFDO0lBRUYsT0FBTyxJQUFBLCtCQUFpQixFQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLE9BQXNCO0lBQ3RELE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNuQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUVsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25DLElBQUksSUFBSSxLQUFLLElBQUksRUFB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RyxHQUNqQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDM0MsR0FBRyxnQkFBZ0IsWUFBWSxDQUFDO1FBRWhDLE1BQU0sZ0JBQWdCLEdBQXFCO1lBQ3pDLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztTQUN6QixDQUFDO1FBRUYsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO1lBQ25FLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQztZQUN6RCxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDO1lBQ3pCLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFBLHNCQUFTLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdkRELDRCQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBQYXRoLCBub3JtYWxpemUsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGFkZEltcG9ydFRvTW9kdWxlLCBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBNT0RVTEVfRVhULFxuICBST1VUSU5HX01PRFVMRV9FWFQsXG4gIGJ1aWxkUmVsYXRpdmVQYXRoLFxuICBmaW5kTW9kdWxlRnJvbU9wdGlvbnMsXG59IGZyb20gJy4uL3V0aWxpdHkvZmluZC1tb2R1bGUnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IGNyZWF0ZURlZmF1bHRQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIE1vZHVsZU9wdGlvbnMsIFJvdXRpbmdTY29wZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZU1vZHVsZVBhdGgob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgaW1wb3J0TW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShcbiAgICBgLyR7b3B0aW9ucy5wYXRofS9gICtcbiAgICAgIChvcHRpb25zLmZsYXQgPyAnJyA6IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgKyAnLycpICtcbiAgICAgIHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgK1xuICAgICAgJy5tb2R1bGUnLFxuICApO1xuXG4gIHJldHVybiBidWlsZFJlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGVQYXRoKTtcbn1cblxuZnVuY3Rpb24gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm1vZHVsZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuXG4gICAgY29uc3QgdGV4dCA9IGhvc3QucmVhZChtb2R1bGVQYXRoKTtcbiAgICBpZiAodGV4dCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEZpbGUgJHttb2R1bGVQYXRofSBkb2VzIG5vdCBleGlzdC5gKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlVGV4dCA9IHRleHQudG9TdHJpbmcoKTtcbiAgICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKG1vZHVsZVBhdGgsIHNvdXJjZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gICAgY29uc3QgcmVsYXRpdmVQYXRoID0gYnVpbGRSZWxhdGl2ZU1vZHVsZVBhdGgob3B0aW9ucywgbW9kdWxlUGF0aCk7XG4gICAgY29uc3QgY2hhbmdlcyA9IGFkZEltcG9ydFRvTW9kdWxlKFxuICAgICAgc291cmNlLFxuICAgICAgbW9kdWxlUGF0aCxcbiAgICAgIHN0cmluZ3MuY2xhc3NpZnkoYCR7b3B0aW9ucy5uYW1lfU1vZHVsZWApLFxuICAgICAgcmVsYXRpdmVQYXRoLFxuICAgICk7XG5cbiAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgZm9yIChjb25zdCBjaGFuZ2Ugb2YgY2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZSBpbnN0YW5jZW9mIEluc2VydENoYW5nZSkge1xuICAgICAgICByZWNvcmRlci5pbnNlcnRMZWZ0KGNoYW5nZS5wb3MsIGNoYW5nZS50b0FkZCk7XG4gICAgICB9XG4gICAgfVxuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRSb3V0ZURlY2xhcmF0aW9uVG9OZ01vZHVsZShcbiAgb3B0aW9uczogTW9kdWxlT3B0aW9ucyxcbiAgcm91dGluZ01vZHVsZVBhdGg6IFBhdGggfCB1bmRlZmluZWQsXG4pOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLnJvdXRlKSB7XG4gICAgICByZXR1cm4gaG9zdDtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLm1vZHVsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb2R1bGUgb3B0aW9uIHJlcXVpcmVkIHdoZW4gY3JlYXRpbmcgYSBsYXp5IGxvYWRlZCByb3V0aW5nIG1vZHVsZS4nKTtcbiAgICB9XG5cbiAgICBsZXQgcGF0aDogc3RyaW5nO1xuICAgIGlmIChyb3V0aW5nTW9kdWxlUGF0aCkge1xuICAgICAgcGF0aCA9IHJvdXRpbmdNb2R1bGVQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoID0gb3B0aW9ucy5tb2R1bGU7XG4gICAgfVxuXG4gICAgY29uc3QgdGV4dCA9IGhvc3QucmVhZChwYXRoKTtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ291bGRuJ3QgZmluZCB0aGUgbW9kdWxlIG5vciBpdHMgcm91dGluZyBtb2R1bGUuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlVGV4dCA9IHRleHQudG9TdHJpbmcoKTtcbiAgICBjb25zdCBhZGREZWNsYXJhdGlvbiA9IGFkZFJvdXRlRGVjbGFyYXRpb25Ub01vZHVsZShcbiAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSksXG4gICAgICBwYXRoLFxuICAgICAgYnVpbGRSb3V0ZShvcHRpb25zLCBvcHRpb25zLm1vZHVsZSksXG4gICAgKSBhcyBJbnNlcnRDaGFuZ2U7XG5cbiAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUocGF0aCk7XG4gICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChhZGREZWNsYXJhdGlvbi5wb3MsIGFkZERlY2xhcmF0aW9uLnRvQWRkKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Um91dGluZ01vZHVsZVBhdGgoaG9zdDogVHJlZSwgbW9kdWxlUGF0aDogc3RyaW5nKTogUGF0aCB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJvdXRpbmdNb2R1bGVQYXRoID0gbW9kdWxlUGF0aC5lbmRzV2l0aChST1VUSU5HX01PRFVMRV9FWFQpXG4gICAgPyBtb2R1bGVQYXRoXG4gICAgOiBtb2R1bGVQYXRoLnJlcGxhY2UoTU9EVUxFX0VYVCwgUk9VVElOR19NT0RVTEVfRVhUKTtcblxuICByZXR1cm4gaG9zdC5leGlzdHMocm91dGluZ01vZHVsZVBhdGgpID8gbm9ybWFsaXplKHJvdXRpbmdNb2R1bGVQYXRoKSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gYnVpbGRSb3V0ZShvcHRpb25zOiBNb2R1bGVPcHRpb25zLCBtb2R1bGVQYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsYXRpdmVNb2R1bGVQYXRoID0gYnVpbGRSZWxhdGl2ZU1vZHVsZVBhdGgob3B0aW9ucywgbW9kdWxlUGF0aCk7XG4gIGNvbnN0IG1vZHVsZU5hbWUgPSBgJHtzdHJpbmdzLmNsYXNzaWZ5KG9wdGlvbnMubmFtZSl9TW9kdWxlYDtcbiAgY29uc3QgbG9hZENoaWxkcmVuID0gYCgpID0+IGltcG9ydCgnJHtyZWxhdGl2ZU1vZHVsZVBhdGh9JykudGhlbihtID0+IG0uJHttb2R1bGVOYW1lfSlgO1xuXG4gIHJldHVybiBgeyBwYXRoOiAnJHtvcHRpb25zLnJvdXRlfScsIGxvYWRDaGlsZHJlbjogJHtsb2FkQ2hpbGRyZW59IH1gO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogTW9kdWxlT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBpZiAob3B0aW9ucy5wYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG9wdGlvbnMucGF0aCA9IGF3YWl0IGNyZWF0ZURlZmF1bHRQYXRoKGhvc3QsIG9wdGlvbnMucHJvamVjdCBhcyBzdHJpbmcpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm1vZHVsZSkge1xuICAgICAgb3B0aW9ucy5tb2R1bGUgPSBmaW5kTW9kdWxlRnJvbU9wdGlvbnMoaG9zdCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IHJvdXRpbmdNb2R1bGVQYXRoOiBQYXRoIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGlzTGF6eUxvYWRlZE1vZHVsZUdlbiA9ICEhKG9wdGlvbnMucm91dGUgJiYgb3B0aW9ucy5tb2R1bGUpO1xuICAgIGlmIChpc0xhenlMb2FkZWRNb2R1bGVHZW4pIHtcbiAgICAgIG9wdGlvbnMucm91dGluZ1Njb3BlID0gUm91dGluZ1Njb3BlLkNoaWxkO1xuICAgICAgcm91dGluZ01vZHVsZVBhdGggPSBnZXRSb3V0aW5nTW9kdWxlUGF0aChob3N0LCBvcHRpb25zLm1vZHVsZSBhcyBzdHJpbmcpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnNlZFBhdGgubmFtZTtcbiAgICBvcHRpb25zLnBhdGggPSBwYXJzZWRQYXRoLnBhdGg7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICBvcHRpb25zLnJvdXRpbmcgfHwgKGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiByb3V0aW5nTW9kdWxlUGF0aClcbiAgICAgICAgPyBub29wKClcbiAgICAgICAgOiBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCctcm91dGluZy5tb2R1bGUudHMudGVtcGxhdGUnKSksXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgICdpZi1mbGF0JzogKHM6IHN0cmluZykgPT4gKG9wdGlvbnMuZmxhdCA/ICcnIDogcyksXG4gICAgICAgIGxhenlSb3V0ZTogaXNMYXp5TG9hZGVkTW9kdWxlR2VuLFxuICAgICAgICBsYXp5Um91dGVXaXRob3V0Um91dGVNb2R1bGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiAhcm91dGluZ01vZHVsZVBhdGgsXG4gICAgICAgIGxhenlSb3V0ZVdpdGhSb3V0ZU1vZHVsZTogaXNMYXp5TG9hZGVkTW9kdWxlR2VuICYmICEhcm91dGluZ01vZHVsZVBhdGgsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1vdmUocGFyc2VkUGF0aC5wYXRoKSxcbiAgICBdKTtcbiAgICBjb25zdCBtb2R1bGVEYXNoZXJpemVkID0gc3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gYCR7XG4gICAgICAhb3B0aW9ucy5mbGF0ID8gbW9kdWxlRGFzaGVyaXplZCArICcvJyA6ICcnXG4gICAgfSR7bW9kdWxlRGFzaGVyaXplZH0ubW9kdWxlLnRzYDtcblxuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IENvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBtb2R1bGU6IG1vZHVsZVBhdGgsXG4gICAgICBmbGF0OiBvcHRpb25zLmZsYXQsXG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICBwYXRoOiBvcHRpb25zLnBhdGgsXG4gICAgICBwcm9qZWN0OiBvcHRpb25zLnByb2plY3QsXG4gICAgfTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICAhaXNMYXp5TG9hZGVkTW9kdWxlR2VuID8gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnMpIDogbm9vcCgpLFxuICAgICAgYWRkUm91dGVEZWNsYXJhdGlvblRvTmdNb2R1bGUob3B0aW9ucywgcm91dGluZ01vZHVsZVBhdGgpLFxuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIGlzTGF6eUxvYWRlZE1vZHVsZUdlbiA/IHNjaGVtYXRpYygnY29tcG9uZW50JywgY29tcG9uZW50T3B0aW9ucykgOiBub29wKCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=