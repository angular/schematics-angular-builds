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
        (0, validation_1.validateClassName)(schematics_1.strings.classify(options.name));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbW9kdWxlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBdUQ7QUFDdkQsMkRBYW9DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFBc0Y7QUFDdEYsOENBQWlEO0FBQ2pELHdEQUtnQztBQUNoQyxzREFBa0Q7QUFDbEQsc0RBQTBEO0FBQzFELG9EQUF5RDtBQUN6RCxxQ0FBaUU7QUFFakUsU0FBUyx1QkFBdUIsQ0FBQyxPQUFzQixFQUFFLFVBQWtCO0lBQ3pFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBQSxnQkFBUyxFQUNoQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEdBQUc7UUFDakIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDM0Qsb0JBQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUMvQixTQUFTLENBQ1osQ0FBQztJQUVGLE9BQU8sSUFBQSwrQkFBaUIsRUFBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsU0FBUyx3QkFBd0IsQ0FBQyxPQUFzQjtJQUN0RCxPQUFPLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbkIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFFbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6RixNQUFNLFlBQVksR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEUsTUFBTSxPQUFPLEdBQUcsSUFBQSw2QkFBaUIsRUFDL0IsTUFBTSxFQUNOLFVBQVUsRUFDVixvQkFBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxFQUN6QyxZQUFZLENBQ2IsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7WUFDNUIsSUFBSSxNQUFNLFlBQVkscUJBQVksRUFBRTtnQkFDbEMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMvQztTQUNGO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1QixPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLDZCQUE2QixDQUNwQyxPQUFzQixFQUN0QixpQkFBbUM7SUFFbkMsT0FBTyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ2xCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLG9FQUFvRSxDQUFDLENBQUM7U0FDdkY7UUFFRCxJQUFJLElBQVksQ0FBQztRQUNqQixJQUFJLGlCQUFpQixFQUFFO1lBQ3JCLElBQUksR0FBRyxpQkFBaUIsQ0FBQztTQUMxQjthQUFNO1lBQ0wsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDdkI7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZDLE1BQU0sY0FBYyxHQUFHLElBQUEsdUNBQTJCLEVBQ2hELEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUNuRSxJQUFJLEVBQ0osVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQ3BCLENBQUM7UUFFbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxJQUFVLEVBQUUsVUFBa0I7SUFDMUQsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGdDQUFrQixDQUFDO1FBQy9ELENBQUMsQ0FBQyxVQUFVO1FBQ1osQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsd0JBQVUsRUFBRSxnQ0FBa0IsQ0FBQyxDQUFDO0lBRXZELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGdCQUFTLEVBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ25GLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxPQUFzQixFQUFFLFVBQWtCO0lBQzVELE1BQU0sa0JBQWtCLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3hFLE1BQU0sVUFBVSxHQUFHLEdBQUcsb0JBQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDN0QsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLGtCQUFrQixrQkFBa0IsVUFBVSxHQUFHLENBQUM7SUFFeEYsT0FBTyxZQUFZLE9BQU8sQ0FBQyxLQUFLLG9CQUFvQixZQUFZLElBQUksQ0FBQztBQUN2RSxDQUFDO0FBRUQsbUJBQXlCLE9BQXNCO0lBQzdDLE9BQU8sS0FBSyxFQUFFLElBQVUsRUFBRSxFQUFFO1FBQzFCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7WUFDOUIsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLElBQUEsNkJBQWlCLEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFpQixDQUFDLENBQUM7U0FDekU7UUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDbEIsT0FBTyxDQUFDLE1BQU0sR0FBRyxJQUFBLG1DQUFxQixFQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN2RDtRQUVELElBQUksaUJBQW1DLENBQUM7UUFDeEMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRSxJQUFJLHFCQUFxQixFQUFFO1lBQ3pCLE9BQU8sQ0FBQyxZQUFZLEdBQUcscUJBQVksQ0FBQyxLQUFLLENBQUM7WUFDMUMsaUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxNQUFnQixDQUFDLENBQUM7U0FDMUU7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFBLHNCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekQsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUMvQixJQUFBLDhCQUFpQixFQUFDLG9CQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRWxELE1BQU0sY0FBYyxHQUFHLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixJQUFJLGlCQUFpQixDQUFDO2dCQUM3RCxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO2dCQUNSLENBQUMsQ0FBQyxJQUFBLG1CQUFNLEVBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ25FLElBQUEsMkJBQWMsRUFBQztnQkFDYixHQUFHLG9CQUFPO2dCQUNWLFNBQVMsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQsU0FBUyxFQUFFLHFCQUFxQjtnQkFDaEMsMkJBQTJCLEVBQUUscUJBQXFCLElBQUksQ0FBQyxpQkFBaUI7Z0JBQ3hFLHdCQUF3QixFQUFFLHFCQUFxQixJQUFJLENBQUMsQ0FBQyxpQkFBaUI7Z0JBQ3RFLEdBQUcsT0FBTzthQUNYLENBQUM7WUFDRixJQUFBLGlCQUFJLEVBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztTQUN0QixDQUFDLENBQUM7UUFDSCxNQUFNLGdCQUFnQixHQUFHLG9CQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RCxNQUFNLFVBQVUsR0FBRyxHQUNqQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDM0MsR0FBRyxnQkFBZ0IsWUFBWSxDQUFDO1FBRWhDLE1BQU0sZ0JBQWdCLEdBQXFCO1lBQ3pDLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztTQUN6QixDQUFDO1FBRUYsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFO1lBQ25FLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQztZQUN6RCxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDO1lBQ3pCLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFBLHNCQUFTLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtTQUMxRSxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBeERELDRCQXdEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBQYXRoLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBmaWx0ZXIsXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGFkZEltcG9ydFRvTW9kdWxlLCBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBNT0RVTEVfRVhULFxuICBST1VUSU5HX01PRFVMRV9FWFQsXG4gIGJ1aWxkUmVsYXRpdmVQYXRoLFxuICBmaW5kTW9kdWxlRnJvbU9wdGlvbnMsXG59IGZyb20gJy4uL3V0aWxpdHkvZmluZC1tb2R1bGUnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IHZhbGlkYXRlQ2xhc3NOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS92YWxpZGF0aW9uJztcbmltcG9ydCB7IGNyZWF0ZURlZmF1bHRQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIE1vZHVsZU9wdGlvbnMsIFJvdXRpbmdTY29wZSB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZU1vZHVsZVBhdGgob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgaW1wb3J0TW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShcbiAgICBgLyR7b3B0aW9ucy5wYXRofS9gICtcbiAgICAgIChvcHRpb25zLmZsYXQgPyAnJyA6IHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgKyAnLycpICtcbiAgICAgIHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkgK1xuICAgICAgJy5tb2R1bGUnLFxuICApO1xuXG4gIHJldHVybiBidWlsZFJlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGVQYXRoKTtcbn1cblxuZnVuY3Rpb24gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKCFvcHRpb25zLm1vZHVsZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuXG4gICAgY29uc3Qgc291cmNlVGV4dCA9IGhvc3QucmVhZFRleHQobW9kdWxlUGF0aCk7XG4gICAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBzb3VyY2VUZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShcbiAgICAgIHNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICBzdHJpbmdzLmNsYXNzaWZ5KGAke29wdGlvbnMubmFtZX1Nb2R1bGVgKSxcbiAgICAgIHJlbGF0aXZlUGF0aCxcbiAgICApO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGZvciAoY29uc3QgY2hhbmdlIG9mIGNoYW5nZXMpIHtcbiAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfVxuICAgIH1cbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkUm91dGVEZWNsYXJhdGlvblRvTmdNb2R1bGUoXG4gIG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMsXG4gIHJvdXRpbmdNb2R1bGVQYXRoOiBQYXRoIHwgdW5kZWZpbmVkLFxuKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5yb3V0ZSkge1xuICAgICAgcmV0dXJuIGhvc3Q7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTW9kdWxlIG9wdGlvbiByZXF1aXJlZCB3aGVuIGNyZWF0aW5nIGEgbGF6eSBsb2FkZWQgcm91dGluZyBtb2R1bGUuJyk7XG4gICAgfVxuXG4gICAgbGV0IHBhdGg6IHN0cmluZztcbiAgICBpZiAocm91dGluZ01vZHVsZVBhdGgpIHtcbiAgICAgIHBhdGggPSByb3V0aW5nTW9kdWxlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IG9wdGlvbnMubW9kdWxlO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBob3N0LnJlYWRUZXh0KHBhdGgpO1xuXG4gICAgY29uc3QgYWRkRGVjbGFyYXRpb24gPSBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUoXG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIHNvdXJjZVRleHQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpLFxuICAgICAgcGF0aCxcbiAgICAgIGJ1aWxkUm91dGUob3B0aW9ucywgb3B0aW9ucy5tb2R1bGUpLFxuICAgICkgYXMgSW5zZXJ0Q2hhbmdlO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKHBhdGgpO1xuICAgIHJlY29yZGVyLmluc2VydExlZnQoYWRkRGVjbGFyYXRpb24ucG9zLCBhZGREZWNsYXJhdGlvbi50b0FkZCk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRpbmdNb2R1bGVQYXRoKGhvc3Q6IFRyZWUsIG1vZHVsZVBhdGg6IHN0cmluZyk6IFBhdGggfCB1bmRlZmluZWQge1xuICBjb25zdCByb3V0aW5nTW9kdWxlUGF0aCA9IG1vZHVsZVBhdGguZW5kc1dpdGgoUk9VVElOR19NT0RVTEVfRVhUKVxuICAgID8gbW9kdWxlUGF0aFxuICAgIDogbW9kdWxlUGF0aC5yZXBsYWNlKE1PRFVMRV9FWFQsIFJPVVRJTkdfTU9EVUxFX0VYVCk7XG5cbiAgcmV0dXJuIGhvc3QuZXhpc3RzKHJvdXRpbmdNb2R1bGVQYXRoKSA/IG5vcm1hbGl6ZShyb3V0aW5nTW9kdWxlUGF0aCkgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUm91dGUob3B0aW9uczogTW9kdWxlT3B0aW9ucywgbW9kdWxlUGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGF0aXZlTW9kdWxlUGF0aCA9IGJ1aWxkUmVsYXRpdmVNb2R1bGVQYXRoKG9wdGlvbnMsIG1vZHVsZVBhdGgpO1xuICBjb25zdCBtb2R1bGVOYW1lID0gYCR7c3RyaW5ncy5jbGFzc2lmeShvcHRpb25zLm5hbWUpfU1vZHVsZWA7XG4gIGNvbnN0IGxvYWRDaGlsZHJlbiA9IGAoKSA9PiBpbXBvcnQoJyR7cmVsYXRpdmVNb2R1bGVQYXRofScpLnRoZW4obSA9PiBtLiR7bW9kdWxlTmFtZX0pYDtcblxuICByZXR1cm4gYHsgcGF0aDogJyR7b3B0aW9ucy5yb3V0ZX0nLCBsb2FkQ2hpbGRyZW46ICR7bG9hZENoaWxkcmVufSB9YDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE1vZHVsZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLnBhdGggPSBhd2FpdCBjcmVhdGVEZWZhdWx0UGF0aChob3N0LCBvcHRpb25zLnByb2plY3QgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5tb2R1bGUpIHtcbiAgICAgIG9wdGlvbnMubW9kdWxlID0gZmluZE1vZHVsZUZyb21PcHRpb25zKGhvc3QsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIGxldCByb3V0aW5nTW9kdWxlUGF0aDogUGF0aCB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBpc0xhenlMb2FkZWRNb2R1bGVHZW4gPSAhIShvcHRpb25zLnJvdXRlICYmIG9wdGlvbnMubW9kdWxlKTtcbiAgICBpZiAoaXNMYXp5TG9hZGVkTW9kdWxlR2VuKSB7XG4gICAgICBvcHRpb25zLnJvdXRpbmdTY29wZSA9IFJvdXRpbmdTY29wZS5DaGlsZDtcbiAgICAgIHJvdXRpbmdNb2R1bGVQYXRoID0gZ2V0Um91dGluZ01vZHVsZVBhdGgoaG9zdCwgb3B0aW9ucy5tb2R1bGUgYXMgc3RyaW5nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJzZWRQYXRoID0gcGFyc2VOYW1lKG9wdGlvbnMucGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgb3B0aW9ucy5wYXRoID0gcGFyc2VkUGF0aC5wYXRoO1xuICAgIHZhbGlkYXRlQ2xhc3NOYW1lKHN0cmluZ3MuY2xhc3NpZnkob3B0aW9ucy5uYW1lKSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICBvcHRpb25zLnJvdXRpbmcgfHwgKGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiByb3V0aW5nTW9kdWxlUGF0aClcbiAgICAgICAgPyBub29wKClcbiAgICAgICAgOiBmaWx0ZXIoKHBhdGgpID0+ICFwYXRoLmVuZHNXaXRoKCctcm91dGluZy5tb2R1bGUudHMudGVtcGxhdGUnKSksXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgICdpZi1mbGF0JzogKHM6IHN0cmluZykgPT4gKG9wdGlvbnMuZmxhdCA/ICcnIDogcyksXG4gICAgICAgIGxhenlSb3V0ZTogaXNMYXp5TG9hZGVkTW9kdWxlR2VuLFxuICAgICAgICBsYXp5Um91dGVXaXRob3V0Um91dGVNb2R1bGU6IGlzTGF6eUxvYWRlZE1vZHVsZUdlbiAmJiAhcm91dGluZ01vZHVsZVBhdGgsXG4gICAgICAgIGxhenlSb3V0ZVdpdGhSb3V0ZU1vZHVsZTogaXNMYXp5TG9hZGVkTW9kdWxlR2VuICYmICEhcm91dGluZ01vZHVsZVBhdGgsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1vdmUocGFyc2VkUGF0aC5wYXRoKSxcbiAgICBdKTtcbiAgICBjb25zdCBtb2R1bGVEYXNoZXJpemVkID0gc3RyaW5ncy5kYXNoZXJpemUob3B0aW9ucy5uYW1lKTtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gYCR7XG4gICAgICAhb3B0aW9ucy5mbGF0ID8gbW9kdWxlRGFzaGVyaXplZCArICcvJyA6ICcnXG4gICAgfSR7bW9kdWxlRGFzaGVyaXplZH0ubW9kdWxlLnRzYDtcblxuICAgIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IENvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgICBtb2R1bGU6IG1vZHVsZVBhdGgsXG4gICAgICBmbGF0OiBvcHRpb25zLmZsYXQsXG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICBwYXRoOiBvcHRpb25zLnBhdGgsXG4gICAgICBwcm9qZWN0OiBvcHRpb25zLnByb2plY3QsXG4gICAgfTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICAhaXNMYXp5TG9hZGVkTW9kdWxlR2VuID8gYWRkRGVjbGFyYXRpb25Ub05nTW9kdWxlKG9wdGlvbnMpIDogbm9vcCgpLFxuICAgICAgYWRkUm91dGVEZWNsYXJhdGlvblRvTmdNb2R1bGUob3B0aW9ucywgcm91dGluZ01vZHVsZVBhdGgpLFxuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIGlzTGF6eUxvYWRlZE1vZHVsZUdlbiA/IHNjaGVtYXRpYygnY29tcG9uZW50JywgY29tcG9uZW50T3B0aW9ucykgOiBub29wKCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=