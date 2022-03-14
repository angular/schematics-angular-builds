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
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_targets_1 = require("../utility/project-targets");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
function getSourceFile(host, path) {
    const buffer = host.read(path);
    if (!buffer) {
        throw new schematics_1.SchematicsException(`Could not find ${path}.`);
    }
    const content = buffer.toString();
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    return source;
}
function getServerModulePath(host, sourceRoot, mainPath) {
    const mainSource = getSourceFile(host, (0, core_1.join)((0, core_1.normalize)(sourceRoot), mainPath));
    const allNodes = (0, ast_utils_1.getSourceNodes)(mainSource);
    const expNode = allNodes.find((node) => ts.isExportDeclaration(node));
    if (!expNode) {
        return null;
    }
    const relativePath = expNode.moduleSpecifier;
    const modulePath = (0, core_1.normalize)(`/${sourceRoot}/${relativePath.text}.ts`);
    return modulePath;
}
function getComponentTemplateInfo(host, componentPath) {
    const compSource = getSourceFile(host, componentPath);
    const compMetadata = (0, ast_utils_1.getDecoratorMetadata)(compSource, 'Component', '@angular/core')[0];
    return {
        templateProp: getMetadataProperty(compMetadata, 'template'),
        templateUrlProp: getMetadataProperty(compMetadata, 'templateUrl'),
    };
}
function getComponentTemplate(host, compPath, tmplInfo) {
    let template = '';
    if (tmplInfo.templateProp) {
        template = tmplInfo.templateProp.getFullText();
    }
    else if (tmplInfo.templateUrlProp) {
        const templateUrl = tmplInfo.templateUrlProp.initializer.text;
        const dir = (0, core_1.dirname)((0, core_1.normalize)(compPath));
        const templatePath = (0, core_1.join)(dir, templateUrl);
        const buffer = host.read(templatePath);
        if (buffer) {
            template = buffer.toString();
        }
    }
    return template;
}
function getBootstrapComponentPath(host, mainPath) {
    const modulePath = (0, ng_ast_utils_1.getAppModulePath)(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const metadataNode = (0, ast_utils_1.getDecoratorMetadata)(moduleSource, 'NgModule', '@angular/core')[0];
    const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');
    const arrLiteral = bootstrapProperty.initializer;
    const componentSymbol = arrLiteral.elements[0].getText();
    const relativePath = (0, ast_utils_1.getSourceNodes)(moduleSource)
        .filter(ts.isImportDeclaration)
        .filter((imp) => {
        return (0, ast_utils_1.findNode)(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
        .map((imp) => {
        const pathStringLiteral = imp.moduleSpecifier;
        return pathStringLiteral.text;
    })[0];
    return (0, core_1.join)((0, core_1.dirname)((0, core_1.normalize)(modulePath)), relativePath + '.ts');
}
// end helper functions.
function validateProject(mainPath) {
    return (host, context) => {
        const routerOutletCheckRegex = /<router-outlet.*?>([\s\S]*?)<\/router-outlet>/;
        const componentPath = getBootstrapComponentPath(host, mainPath);
        const tmpl = getComponentTemplateInfo(host, componentPath);
        const template = getComponentTemplate(host, componentPath, tmpl);
        if (!routerOutletCheckRegex.test(template)) {
            const errorMsg = `Prerequisite for application shell is to define a router-outlet in your root component.`;
            context.logger.error(errorMsg);
            throw new schematics_1.SchematicsException(errorMsg);
        }
    };
}
function addUniversalTarget(options) {
    return () => {
        // Copy options.
        const universalOptions = {
            ...options,
        };
        // Delete non-universal options.
        delete universalOptions.route;
        return (0, schematics_1.schematic)('universal', universalOptions);
    };
}
function addAppShellConfigToWorkspace(options) {
    return (host, context) => {
        if (!options.route) {
            throw new schematics_1.SchematicsException(`Route is not defined`);
        }
        return (0, workspace_1.updateWorkspace)((workspace) => {
            var _a, _b, _c, _d;
            const project = workspace.projects.get(options.project);
            if (!project) {
                return;
            }
            // Validation of targets is handled already in the main function.
            // Duplicate keys means that we have configurations in both server and build builders.
            const serverConfigKeys = (_b = (_a = project.targets.get('server')) === null || _a === void 0 ? void 0 : _a.configurations) !== null && _b !== void 0 ? _b : {};
            const buildConfigKeys = (_d = (_c = project.targets.get('build')) === null || _c === void 0 ? void 0 : _c.configurations) !== null && _d !== void 0 ? _d : {};
            const configurationNames = Object.keys({
                ...serverConfigKeys,
                ...buildConfigKeys,
            });
            const configurations = {};
            for (const key of configurationNames) {
                if (!serverConfigKeys[key]) {
                    context.logger.warn(`Skipped adding "${key}" configuration to "app-shell" target as it's missing from "server" target.`);
                    continue;
                }
                if (!buildConfigKeys[key]) {
                    context.logger.warn(`Skipped adding "${key}" configuration to "app-shell" target as it's missing from "build" target.`);
                    continue;
                }
                configurations[key] = {
                    browserTarget: `${options.project}:build:${key}`,
                    serverTarget: `${options.project}:server:${key}`,
                };
            }
            project.targets.add({
                name: 'app-shell',
                builder: workspace_models_1.Builders.AppShell,
                defaultConfiguration: configurations['production'] ? 'production' : undefined,
                options: {
                    route: options.route,
                },
                configurations,
            });
        });
    };
}
function addRouterModule(mainPath) {
    return (host) => {
        const modulePath = (0, ng_ast_utils_1.getAppModulePath)(host, mainPath);
        const moduleSource = getSourceFile(host, modulePath);
        const changes = (0, ast_utils_1.addImportToModule)(moduleSource, modulePath, 'RouterModule', '@angular/router');
        const recorder = host.beginUpdate(modulePath);
        (0, change_1.applyToUpdateRecorder)(recorder, changes);
        host.commitUpdate(recorder);
        return host;
    };
}
function getMetadataProperty(metadata, propertyName) {
    const properties = metadata.properties;
    const property = properties.filter(ts.isPropertyAssignment).filter((prop) => {
        const name = prop.name;
        switch (name.kind) {
            case ts.SyntaxKind.Identifier:
                return name.getText() === propertyName;
            case ts.SyntaxKind.StringLiteral:
                return name.text === propertyName;
        }
        return false;
    })[0];
    return property;
}
function addServerRoutes(options) {
    return async (host) => {
        // The workspace gets updated so this needs to be reloaded
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const clientProject = workspace.projects.get(options.project);
        if (!clientProject) {
            throw new Error('Universal schematic removed client project.');
        }
        const clientServerTarget = clientProject.targets.get('server');
        if (!clientServerTarget) {
            throw new Error('Universal schematic did not add server target to client project.');
        }
        const clientServerOptions = clientServerTarget.options;
        if (!clientServerOptions) {
            throw new schematics_1.SchematicsException('Server target does not contain options.');
        }
        const modulePath = getServerModulePath(host, clientProject.sourceRoot || 'src', options.main);
        if (modulePath === null) {
            throw new schematics_1.SchematicsException('Universal/server module not found.');
        }
        let moduleSource = getSourceFile(host, modulePath);
        if (!(0, ast_utils_1.isImported)(moduleSource, 'Routes', '@angular/router')) {
            const recorder = host.beginUpdate(modulePath);
            const routesChange = (0, ast_utils_1.insertImport)(moduleSource, modulePath, 'Routes', '@angular/router');
            if (routesChange) {
                (0, change_1.applyToUpdateRecorder)(recorder, [routesChange]);
            }
            const imports = (0, ast_utils_1.getSourceNodes)(moduleSource)
                .filter((node) => node.kind === ts.SyntaxKind.ImportDeclaration)
                .sort((a, b) => a.getStart() - b.getStart());
            const insertPosition = imports[imports.length - 1].getEnd();
            const routeText = `\n\nconst routes: Routes = [ { path: '${options.route}', component: AppShellComponent }];`;
            recorder.insertRight(insertPosition, routeText);
            host.commitUpdate(recorder);
        }
        moduleSource = getSourceFile(host, modulePath);
        if (!(0, ast_utils_1.isImported)(moduleSource, 'RouterModule', '@angular/router')) {
            const recorder = host.beginUpdate(modulePath);
            const routerModuleChange = (0, ast_utils_1.insertImport)(moduleSource, modulePath, 'RouterModule', '@angular/router');
            if (routerModuleChange) {
                (0, change_1.applyToUpdateRecorder)(recorder, [routerModuleChange]);
            }
            const metadataChange = (0, ast_utils_1.addSymbolToNgModuleMetadata)(moduleSource, modulePath, 'imports', 'RouterModule.forRoot(routes)');
            if (metadataChange) {
                (0, change_1.applyToUpdateRecorder)(recorder, metadataChange);
            }
            host.commitUpdate(recorder);
        }
    };
}
function addShellComponent(options) {
    const componentOptions = {
        name: 'app-shell',
        module: options.rootModuleFileName,
        project: options.project,
    };
    return (0, schematics_1.schematic)('component', componentOptions);
}
function default_1(options) {
    return async (tree) => {
        const workspace = await (0, workspace_1.getWorkspace)(tree);
        const clientProject = workspace.projects.get(options.project);
        if (!clientProject || clientProject.extensions.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`A client project type of "application" is required.`);
        }
        const clientBuildTarget = clientProject.targets.get('build');
        if (!clientBuildTarget) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const clientBuildOptions = (clientBuildTarget.options ||
            {});
        return (0, schematics_1.chain)([
            validateProject(clientBuildOptions.main),
            clientProject.targets.has('server') ? (0, schematics_1.noop)() : addUniversalTarget(options),
            addAppShellConfigToWorkspace(options),
            addRouterModule(clientBuildOptions.main),
            addServerRoutes(options),
            addShellComponent(options),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwLXNoZWxsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsMkRBUW9DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFROEI7QUFDOUIsOENBQTBEO0FBQzFELDBEQUEyRDtBQUMzRCxnRUFBc0U7QUFDdEUsb0RBQXFFO0FBQ3JFLGtFQUFvRztBQUdwRyxTQUFTLGFBQWEsQ0FBQyxJQUFVLEVBQUUsSUFBWTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWCxNQUFNLElBQUksZ0NBQW1CLENBQUMsa0JBQWtCLElBQUksR0FBRyxDQUFDLENBQUM7S0FDMUQ7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEYsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBVSxFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7SUFDM0UsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUcs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YSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDMUUsNEJBQTRCLENBQUMsT0FBTyxDQUFDO1lBQ3JDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7WUFDeEMsZUFBZSxDQUFDLE9BQU8sQ0FBQztZQUN4QixpQkFBaUIsQ0FBQyxPQUFPLENBQUM7U0FDM0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZCRCw0QkF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgY2hhaW4sXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbXBvbmVudE9wdGlvbnMgfSBmcm9tICcuLi9jb21wb25lbnQvc2NoZW1hJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtcbiAgYWRkSW1wb3J0VG9Nb2R1bGUsXG4gIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YSxcbiAgZmluZE5vZGUsXG4gIGdldERlY29yYXRvck1ldGFkYXRhLFxuICBnZXRTb3VyY2VOb2RlcyxcbiAgaW5zZXJ0SW1wb3J0LFxuICBpc0ltcG9ydGVkLFxufSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBhcHBseVRvVXBkYXRlUmVjb3JkZXIgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQgeyBnZXRBcHBNb2R1bGVQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJzLCBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwU2hlbGxPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBnZXRTb3VyY2VGaWxlKGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmICghYnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICR7cGF0aH0uYCk7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmZ1bmN0aW9uIGdldFNlcnZlck1vZHVsZVBhdGgoaG9zdDogVHJlZSwgc291cmNlUm9vdDogc3RyaW5nLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1haW5Tb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aCkpO1xuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKG1haW5Tb3VyY2UpO1xuICBjb25zdCBleHBOb2RlID0gYWxsTm9kZXMuZmluZCgobm9kZSkgPT4gdHMuaXNFeHBvcnREZWNsYXJhdGlvbihub2RlKSk7XG4gIGlmICghZXhwTm9kZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IChleHBOb2RlIGFzIHRzLkV4cG9ydERlY2xhcmF0aW9uKS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcbiAgY29uc3QgbW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShgLyR7c291cmNlUm9vdH0vJHtyZWxhdGl2ZVBhdGgudGV4dH0udHNgKTtcblxuICByZXR1cm4gbW9kdWxlUGF0aDtcbn1cblxuaW50ZXJmYWNlIFRlbXBsYXRlSW5mbyB7XG4gIHRlbXBsYXRlUHJvcD86IHRzLlByb3BlcnR5QXNzaWdubWVudDtcbiAgdGVtcGxhdGVVcmxQcm9wPzogdHMuUHJvcGVydHlBc3NpZ25tZW50O1xufVxuXG5mdW5jdGlvbiBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdDogVHJlZSwgY29tcG9uZW50UGF0aDogc3RyaW5nKTogVGVtcGxhdGVJbmZvIHtcbiAgY29uc3QgY29tcFNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gIGNvbnN0IGNvbXBNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKGNvbXBTb3VyY2UsICdDb21wb25lbnQnLCAnQGFuZ3VsYXIvY29yZScpWzBdO1xuXG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlJyksXG4gICAgdGVtcGxhdGVVcmxQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlVXJsJyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudFRlbXBsYXRlKGhvc3Q6IFRyZWUsIGNvbXBQYXRoOiBzdHJpbmcsIHRtcGxJbmZvOiBUZW1wbGF0ZUluZm8pOiBzdHJpbmcge1xuICBsZXQgdGVtcGxhdGUgPSAnJztcblxuICBpZiAodG1wbEluZm8udGVtcGxhdGVQcm9wKSB7XG4gICAgdGVtcGxhdGUgPSB0bXBsSW5mby50ZW1wbGF0ZVByb3AuZ2V0RnVsbFRleHQoKTtcbiAgfSBlbHNlIGlmICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3ApIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVVybCA9ICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3AuaW5pdGlhbGl6ZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICBjb25zdCBkaXIgPSBkaXJuYW1lKG5vcm1hbGl6ZShjb21wUGF0aCkpO1xuICAgIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGpvaW4oZGlyLCB0ZW1wbGF0ZVVybCk7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRlbXBsYXRlUGF0aCk7XG4gICAgaWYgKGJ1ZmZlcikge1xuICAgICAgdGVtcGxhdGUgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbmZ1bmN0aW9uIGdldEJvb3RzdHJhcENvbXBvbmVudFBhdGgoaG9zdDogVHJlZSwgbWFpblBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcblxuICBjb25zdCBtZXRhZGF0YU5vZGUgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShtb2R1bGVTb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gIGNvbnN0IGJvb3RzdHJhcFByb3BlcnR5ID0gZ2V0TWV0YWRhdGFQcm9wZXJ0eShtZXRhZGF0YU5vZGUsICdib290c3RyYXAnKTtcblxuICBjb25zdCBhcnJMaXRlcmFsID0gYm9vdHN0cmFwUHJvcGVydHkuaW5pdGlhbGl6ZXIgYXMgdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbjtcblxuICBjb25zdCBjb21wb25lbnRTeW1ib2wgPSBhcnJMaXRlcmFsLmVsZW1lbnRzWzBdLmdldFRleHQoKTtcblxuICBjb25zdCByZWxhdGl2ZVBhdGggPSBnZXRTb3VyY2VOb2Rlcyhtb2R1bGVTb3VyY2UpXG4gICAgLmZpbHRlcih0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5maWx0ZXIoKGltcCkgPT4ge1xuICAgICAgcmV0dXJuIGZpbmROb2RlKGltcCwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCBjb21wb25lbnRTeW1ib2wpO1xuICAgIH0pXG4gICAgLm1hcCgoaW1wKSA9PiB7XG4gICAgICBjb25zdCBwYXRoU3RyaW5nTGl0ZXJhbCA9IGltcC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcblxuICAgICAgcmV0dXJuIHBhdGhTdHJpbmdMaXRlcmFsLnRleHQ7XG4gICAgfSlbMF07XG5cbiAgcmV0dXJuIGpvaW4oZGlybmFtZShub3JtYWxpemUobW9kdWxlUGF0aCkpLCByZWxhdGl2ZVBhdGggKyAnLnRzJyk7XG59XG4vLyBlbmQgaGVscGVyIGZ1bmN0aW9ucy5cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0KG1haW5QYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgcm91dGVyT3V0bGV0Q2hlY2tSZWdleCA9IC88cm91dGVyLW91dGxldC4qPz4oW1xcc1xcU10qPyk8XFwvcm91dGVyLW91dGxldD4vO1xuXG4gICAgY29uc3QgY29tcG9uZW50UGF0aCA9IGdldEJvb3RzdHJhcENvbXBvbmVudFBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnN0IHRtcGwgPSBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBnZXRDb21wb25lbnRUZW1wbGF0ZShob3N0LCBjb21wb25lbnRQYXRoLCB0bXBsKTtcbiAgICBpZiAoIXJvdXRlck91dGxldENoZWNrUmVnZXgudGVzdCh0ZW1wbGF0ZSkpIHtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYFByZXJlcXVpc2l0ZSBmb3IgYXBwbGljYXRpb24gc2hlbGwgaXMgdG8gZGVmaW5lIGEgcm91dGVyLW91dGxldCBpbiB5b3VyIHJvb3QgY29tcG9uZW50LmA7XG4gICAgICBjb250ZXh0LmxvZ2dlci5lcnJvcihlcnJvck1zZyk7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihlcnJvck1zZyk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRVbml2ZXJzYWxUYXJnZXQob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgLy8gQ29weSBvcHRpb25zLlxuICAgIGNvbnN0IHVuaXZlcnNhbE9wdGlvbnMgPSB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgIH07XG5cbiAgICAvLyBEZWxldGUgbm9uLXVuaXZlcnNhbCBvcHRpb25zLlxuICAgIGRlbGV0ZSB1bml2ZXJzYWxPcHRpb25zLnJvdXRlO1xuXG4gICAgcmV0dXJuIHNjaGVtYXRpYygndW5pdmVyc2FsJywgdW5pdmVyc2FsT3B0aW9ucyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFNoZWxsQ29uZmlnVG9Xb3Jrc3BhY2Uob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdCwgY29udGV4dCkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5yb3V0ZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFJvdXRlIGlzIG5vdCBkZWZpbmVkYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVmFsaWRhdGlvbiBvZiB0YXJnZXRzIGlzIGhhbmRsZWQgYWxyZWFkeSBpbiB0aGUgbWFpbiBmdW5jdGlvbi5cbiAgICAgIC8vIER1cGxpY2F0ZSBrZXlzIG1lYW5zIHRoYXQgd2UgaGF2ZSBjb25maWd1cmF0aW9ucyBpbiBib3RoIHNlcnZlciBhbmQgYnVpbGQgYnVpbGRlcnMuXG4gICAgICBjb25zdCBzZXJ2ZXJDb25maWdLZXlzID0gcHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJyk/LmNvbmZpZ3VyYXRpb25zID8/IHt9O1xuICAgICAgY29uc3QgYnVpbGRDb25maWdLZXlzID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKT8uY29uZmlndXJhdGlvbnMgPz8ge307XG5cbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25OYW1lcyA9IE9iamVjdC5rZXlzKHtcbiAgICAgICAgLi4uc2VydmVyQ29uZmlnS2V5cyxcbiAgICAgICAgLi4uYnVpbGRDb25maWdLZXlzLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIGNvbmZpZ3VyYXRpb25OYW1lcykge1xuICAgICAgICBpZiAoIXNlcnZlckNvbmZpZ0tleXNba2V5XSkge1xuICAgICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgU2tpcHBlZCBhZGRpbmcgXCIke2tleX1cIiBjb25maWd1cmF0aW9uIHRvIFwiYXBwLXNoZWxsXCIgdGFyZ2V0IGFzIGl0J3MgbWlzc2luZyBmcm9tIFwic2VydmVyXCIgdGFyZ2V0LmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFidWlsZENvbmZpZ0tleXNba2V5XSkge1xuICAgICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgU2tpcHBlZCBhZGRpbmcgXCIke2tleX1cIiBjb25maWd1cmF0aW9uIHRvIFwiYXBwLXNoZWxsXCIgdGFyZ2V0IGFzIGl0J3MgbWlzc2luZyBmcm9tIFwiYnVpbGRcIiB0YXJnZXQuYCxcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0ge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMucHJvamVjdH06YnVpbGQ6JHtrZXl9YCxcbiAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucHJvamVjdH06c2VydmVyOiR7a2V5fWAsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiAnYXBwLXNoZWxsJyxcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuQXBwU2hlbGwsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiBjb25maWd1cmF0aW9uc1sncHJvZHVjdGlvbiddID8gJ3Byb2R1Y3Rpb24nIDogdW5kZWZpbmVkLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgcm91dGU6IG9wdGlvbnMucm91dGUsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZFJvdXRlck1vZHVsZShtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsICdSb3V0ZXJNb2R1bGUnLCAnQGFuZ3VsYXIvcm91dGVyJyk7XG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgY2hhbmdlcyk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE1ldGFkYXRhUHJvcGVydHkobWV0YWRhdGE6IHRzLk5vZGUsIHByb3BlcnR5TmFtZTogc3RyaW5nKTogdHMuUHJvcGVydHlBc3NpZ25tZW50IHtcbiAgY29uc3QgcHJvcGVydGllcyA9IChtZXRhZGF0YSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbikucHJvcGVydGllcztcbiAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudCkuZmlsdGVyKChwcm9wKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHByb3AubmFtZTtcbiAgICBzd2l0Y2ggKG5hbWUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAgIHJldHVybiBuYW1lLmdldFRleHQoKSA9PT0gcHJvcGVydHlOYW1lO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgIHJldHVybiBuYW1lLnRleHQgPT09IHByb3BlcnR5TmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pWzBdO1xuXG4gIHJldHVybiBwcm9wZXJ0eTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyUm91dGVzKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICAvLyBUaGUgd29ya3NwYWNlIGdldHMgdXBkYXRlZCBzbyB0aGlzIG5lZWRzIHRvIGJlIHJlbG9hZGVkXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFjbGllbnRQcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaXZlcnNhbCBzY2hlbWF0aWMgcmVtb3ZlZCBjbGllbnQgcHJvamVjdC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50U2VydmVyVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJyk7XG4gICAgaWYgKCFjbGllbnRTZXJ2ZXJUYXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5pdmVyc2FsIHNjaGVtYXRpYyBkaWQgbm90IGFkZCBzZXJ2ZXIgdGFyZ2V0IHRvIGNsaWVudCBwcm9qZWN0LicpO1xuICAgIH1cbiAgICBjb25zdCBjbGllbnRTZXJ2ZXJPcHRpb25zID0gY2xpZW50U2VydmVyVGFyZ2V0Lm9wdGlvbnMgYXMgdW5rbm93biBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucztcbiAgICBpZiAoIWNsaWVudFNlcnZlck9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdTZXJ2ZXIgdGFyZ2V0IGRvZXMgbm90IGNvbnRhaW4gb3B0aW9ucy4nKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGdldFNlcnZlck1vZHVsZVBhdGgoXG4gICAgICBob3N0LFxuICAgICAgY2xpZW50UHJvamVjdC5zb3VyY2VSb290IHx8ICdzcmMnLFxuICAgICAgb3B0aW9ucy5tYWluIGFzIHN0cmluZyxcbiAgICApO1xuICAgIGlmIChtb2R1bGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignVW5pdmVyc2FsL3NlcnZlciBtb2R1bGUgbm90IGZvdW5kLicpO1xuICAgIH1cblxuICAgIGxldCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsICdSb3V0ZXMnLCAnQGFuZ3VsYXIvcm91dGVyJykpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGNvbnN0IHJvdXRlc0NoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsICdSb3V0ZXMnLCAnQGFuZ3VsYXIvcm91dGVyJyk7XG4gICAgICBpZiAocm91dGVzQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW3JvdXRlc0NoYW5nZV0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbXBvcnRzID0gZ2V0U291cmNlTm9kZXMobW9kdWxlU291cmNlKVxuICAgICAgICAuZmlsdGVyKChub2RlKSA9PiBub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmdldFN0YXJ0KCkgLSBiLmdldFN0YXJ0KCkpO1xuICAgICAgY29uc3QgaW5zZXJ0UG9zaXRpb24gPSBpbXBvcnRzW2ltcG9ydHMubGVuZ3RoIC0gMV0uZ2V0RW5kKCk7XG4gICAgICBjb25zdCByb3V0ZVRleHQgPSBgXFxuXFxuY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbIHsgcGF0aDogJyR7b3B0aW9ucy5yb3V0ZX0nLCBjb21wb25lbnQ6IEFwcFNoZWxsQ29tcG9uZW50IH1dO2A7XG4gICAgICByZWNvcmRlci5pbnNlcnRSaWdodChpbnNlcnRQb3NpdGlvbiwgcm91dGVUZXh0KTtcbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICB9XG5cbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsICdSb3V0ZXJNb2R1bGUnLCAnQGFuZ3VsYXIvcm91dGVyJykpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGNvbnN0IHJvdXRlck1vZHVsZUNoYW5nZSA9IGluc2VydEltcG9ydChcbiAgICAgICAgbW9kdWxlU291cmNlLFxuICAgICAgICBtb2R1bGVQYXRoLFxuICAgICAgICAnUm91dGVyTW9kdWxlJyxcbiAgICAgICAgJ0Bhbmd1bGFyL3JvdXRlcicsXG4gICAgICApO1xuXG4gICAgICBpZiAocm91dGVyTW9kdWxlQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW3JvdXRlck1vZHVsZUNoYW5nZV0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRhZGF0YUNoYW5nZSA9IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShcbiAgICAgICAgbW9kdWxlU291cmNlLFxuICAgICAgICBtb2R1bGVQYXRoLFxuICAgICAgICAnaW1wb3J0cycsXG4gICAgICAgICdSb3V0ZXJNb2R1bGUuZm9yUm9vdChyb3V0ZXMpJyxcbiAgICAgICk7XG4gICAgICBpZiAobWV0YWRhdGFDaGFuZ2UpIHtcbiAgICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBtZXRhZGF0YUNoYW5nZSk7XG4gICAgICB9XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTaGVsbENvbXBvbmVudChvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgY29uc3QgY29tcG9uZW50T3B0aW9uczogQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgICBuYW1lOiAnYXBwLXNoZWxsJyxcbiAgICBtb2R1bGU6IG9wdGlvbnMucm9vdE1vZHVsZUZpbGVOYW1lLFxuICAgIHByb2plY3Q6IG9wdGlvbnMucHJvamVjdCxcbiAgfTtcblxuICByZXR1cm4gc2NoZW1hdGljKCdjb21wb25lbnQnLCBjb21wb25lbnRPcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKHRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIWNsaWVudFByb2plY3QgfHwgY2xpZW50UHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQSBjbGllbnQgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIiBpcyByZXF1aXJlZC5gKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50QnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghY2xpZW50QnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvcigpO1xuICAgIH1cbiAgICBjb25zdCBjbGllbnRCdWlsZE9wdGlvbnMgPSAoY2xpZW50QnVpbGRUYXJnZXQub3B0aW9ucyB8fFxuICAgICAge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIHZhbGlkYXRlUHJvamVjdChjbGllbnRCdWlsZE9wdGlvbnMubWFpbiksXG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuaGFzKCdzZXJ2ZXInKSA/IG5vb3AoKSA6IGFkZFVuaXZlcnNhbFRhcmdldChvcHRpb25zKSxcbiAgICAgIGFkZEFwcFNoZWxsQ29uZmlnVG9Xb3Jrc3BhY2Uob3B0aW9ucyksXG4gICAgICBhZGRSb3V0ZXJNb2R1bGUoY2xpZW50QnVpbGRPcHRpb25zLm1haW4pLFxuICAgICAgYWRkU2VydmVyUm91dGVzKG9wdGlvbnMpLFxuICAgICAgYWRkU2hlbGxDb21wb25lbnQob3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=