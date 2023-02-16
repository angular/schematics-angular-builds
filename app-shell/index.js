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
    const content = host.readText(path);
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
        try {
            template = host.readText(templatePath);
        }
        catch { }
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
            const project = workspace.projects.get(options.project);
            if (!project) {
                return;
            }
            // Validation of targets is handled already in the main function.
            // Duplicate keys means that we have configurations in both server and build builders.
            const serverConfigKeys = project.targets.get('server')?.configurations ?? {};
            const buildConfigKeys = project.targets.get('build')?.configurations ?? {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwLXNoZWxsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsMkRBUW9DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFROEI7QUFDOUIsOENBQTBEO0FBQzFELDBEQUEyRDtBQUMzRCxnRUFBc0U7QUFDdEUsb0RBQXFFO0FBQ3JFLGtFQUFvRztBQUdwRyxTQUFTLGFBQWEsQ0FBQyxJQUFVLEVBQUUsSUFBWTtJQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWhGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQVUsRUFBRSxVQUFrQixFQUFFLFFBQWdCO0lBQzNFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBQSxXQUFJLEVBQUMsSUFBQSxnQkFBUyxFQUFDLFVBQVUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDOUUsTUFBTSxRQUFRLEdBQUcsSUFBQSwwQkFBYyxFQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDWixPQUFPLElBQUksQ0FB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WUFDeEIsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUF2QkQsNEJBdUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBDb21wb25lbnRPcHRpb25zIH0gZnJvbSAnLi4vY29tcG9uZW50L3NjaGVtYSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7XG4gIGFkZEltcG9ydFRvTW9kdWxlLFxuICBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEsXG4gIGZpbmROb2RlLFxuICBnZXREZWNvcmF0b3JNZXRhZGF0YSxcbiAgZ2V0U291cmNlTm9kZXMsXG4gIGluc2VydEltcG9ydCxcbiAgaXNJbXBvcnRlZCxcbn0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgYXBwbHlUb1VwZGF0ZVJlY29yZGVyIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgZ2V0QXBwTW9kdWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zLCBCdWlsZGVycywgU2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEFwcFNoZWxsT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gZ2V0U291cmNlRmlsZShob3N0OiBUcmVlLCBwYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgY29udGVudCA9IGhvc3QucmVhZFRleHQocGF0aCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VydmVyTW9kdWxlUGF0aChob3N0OiBUcmVlLCBzb3VyY2VSb290OiBzdHJpbmcsIG1haW5QYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFpblNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgam9pbihub3JtYWxpemUoc291cmNlUm9vdCksIG1haW5QYXRoKSk7XG4gIGNvbnN0IGFsbE5vZGVzID0gZ2V0U291cmNlTm9kZXMobWFpblNvdXJjZSk7XG4gIGNvbnN0IGV4cE5vZGUgPSBhbGxOb2Rlcy5maW5kKChub2RlKSA9PiB0cy5pc0V4cG9ydERlY2xhcmF0aW9uKG5vZGUpKTtcbiAgaWYgKCFleHBOb2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gKGV4cE5vZGUgYXMgdHMuRXhwb3J0RGVjbGFyYXRpb24pLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsO1xuICBjb25zdCBtb2R1bGVQYXRoID0gbm9ybWFsaXplKGAvJHtzb3VyY2VSb290fS8ke3JlbGF0aXZlUGF0aC50ZXh0fS50c2ApO1xuXG4gIHJldHVybiBtb2R1bGVQYXRoO1xufVxuXG5pbnRlcmZhY2UgVGVtcGxhdGVJbmZvIHtcbiAgdGVtcGxhdGVQcm9wPzogdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuICB0ZW1wbGF0ZVVybFByb3A/OiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQ7XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudFRlbXBsYXRlSW5mbyhob3N0OiBUcmVlLCBjb21wb25lbnRQYXRoOiBzdHJpbmcpOiBUZW1wbGF0ZUluZm8ge1xuICBjb25zdCBjb21wU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBjb21wb25lbnRQYXRoKTtcbiAgY29uc3QgY29tcE1ldGFkYXRhID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEoY29tcFNvdXJjZSwgJ0NvbXBvbmVudCcsICdAYW5ndWxhci9jb3JlJylbMF07XG5cbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVByb3A6IGdldE1ldGFkYXRhUHJvcGVydHkoY29tcE1ldGFkYXRhLCAndGVtcGxhdGUnKSxcbiAgICB0ZW1wbGF0ZVVybFByb3A6IGdldE1ldGFkYXRhUHJvcGVydHkoY29tcE1ldGFkYXRhLCAndGVtcGxhdGVVcmwnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29tcG9uZW50VGVtcGxhdGUoaG9zdDogVHJlZSwgY29tcFBhdGg6IHN0cmluZywgdG1wbEluZm86IFRlbXBsYXRlSW5mbyk6IHN0cmluZyB7XG4gIGxldCB0ZW1wbGF0ZSA9ICcnO1xuXG4gIGlmICh0bXBsSW5mby50ZW1wbGF0ZVByb3ApIHtcbiAgICB0ZW1wbGF0ZSA9IHRtcGxJbmZvLnRlbXBsYXRlUHJvcC5nZXRGdWxsVGV4dCgpO1xuICB9IGVsc2UgaWYgKHRtcGxJbmZvLnRlbXBsYXRlVXJsUHJvcCkge1xuICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gKHRtcGxJbmZvLnRlbXBsYXRlVXJsUHJvcC5pbml0aWFsaXplciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgIGNvbnN0IGRpciA9IGRpcm5hbWUobm9ybWFsaXplKGNvbXBQYXRoKSk7XG4gICAgY29uc3QgdGVtcGxhdGVQYXRoID0gam9pbihkaXIsIHRlbXBsYXRlVXJsKTtcbiAgICB0cnkge1xuICAgICAgdGVtcGxhdGUgPSBob3N0LnJlYWRUZXh0KHRlbXBsYXRlUGF0aCk7XG4gICAgfSBjYXRjaCB7fVxuICB9XG5cbiAgcmV0dXJuIHRlbXBsYXRlO1xufVxuXG5mdW5jdGlvbiBnZXRCb290c3RyYXBDb21wb25lbnRQYXRoKGhvc3Q6IFRyZWUsIG1haW5QYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gIGNvbnN0IG1vZHVsZVNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG5cbiAgY29uc3QgbWV0YWRhdGFOb2RlID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEobW9kdWxlU291cmNlLCAnTmdNb2R1bGUnLCAnQGFuZ3VsYXIvY29yZScpWzBdO1xuICBjb25zdCBib290c3RyYXBQcm9wZXJ0eSA9IGdldE1ldGFkYXRhUHJvcGVydHkobWV0YWRhdGFOb2RlLCAnYm9vdHN0cmFwJyk7XG5cbiAgY29uc3QgYXJyTGl0ZXJhbCA9IGJvb3RzdHJhcFByb3BlcnR5LmluaXRpYWxpemVyIGFzIHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb247XG5cbiAgY29uc3QgY29tcG9uZW50U3ltYm9sID0gYXJyTGl0ZXJhbC5lbGVtZW50c1swXS5nZXRUZXh0KCk7XG5cbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gZ2V0U291cmNlTm9kZXMobW9kdWxlU291cmNlKVxuICAgIC5maWx0ZXIodHMuaXNJbXBvcnREZWNsYXJhdGlvbilcbiAgICAuZmlsdGVyKChpbXApID0+IHtcbiAgICAgIHJldHVybiBmaW5kTm9kZShpbXAsIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciwgY29tcG9uZW50U3ltYm9sKTtcbiAgICB9KVxuICAgIC5tYXAoKGltcCkgPT4ge1xuICAgICAgY29uc3QgcGF0aFN0cmluZ0xpdGVyYWwgPSBpbXAubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWw7XG5cbiAgICAgIHJldHVybiBwYXRoU3RyaW5nTGl0ZXJhbC50ZXh0O1xuICAgIH0pWzBdO1xuXG4gIHJldHVybiBqb2luKGRpcm5hbWUobm9ybWFsaXplKG1vZHVsZVBhdGgpKSwgcmVsYXRpdmVQYXRoICsgJy50cycpO1xufVxuLy8gZW5kIGhlbHBlciBmdW5jdGlvbnMuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlUHJvamVjdChtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHJvdXRlck91dGxldENoZWNrUmVnZXggPSAvPHJvdXRlci1vdXRsZXQuKj8+KFtcXHNcXFNdKj8pPFxcL3JvdXRlci1vdXRsZXQ+LztcblxuICAgIGNvbnN0IGNvbXBvbmVudFBhdGggPSBnZXRCb290c3RyYXBDb21wb25lbnRQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCB0bXBsID0gZ2V0Q29tcG9uZW50VGVtcGxhdGVJbmZvKGhvc3QsIGNvbXBvbmVudFBhdGgpO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gZ2V0Q29tcG9uZW50VGVtcGxhdGUoaG9zdCwgY29tcG9uZW50UGF0aCwgdG1wbCk7XG4gICAgaWYgKCFyb3V0ZXJPdXRsZXRDaGVja1JlZ2V4LnRlc3QodGVtcGxhdGUpKSB7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBQcmVyZXF1aXNpdGUgZm9yIGFwcGxpY2F0aW9uIHNoZWxsIGlzIHRvIGRlZmluZSBhIHJvdXRlci1vdXRsZXQgaW4geW91ciByb290IGNvbXBvbmVudC5gO1xuICAgICAgY29udGV4dC5sb2dnZXIuZXJyb3IoZXJyb3JNc2cpO1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oZXJyb3JNc2cpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkVW5pdmVyc2FsVGFyZ2V0KG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKCkgPT4ge1xuICAgIC8vIENvcHkgb3B0aW9ucy5cbiAgICBjb25zdCB1bml2ZXJzYWxPcHRpb25zID0ge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9O1xuXG4gICAgLy8gRGVsZXRlIG5vbi11bml2ZXJzYWwgb3B0aW9ucy5cbiAgICBkZWxldGUgdW5pdmVyc2FsT3B0aW9ucy5yb3V0ZTtcblxuICAgIHJldHVybiBzY2hlbWF0aWMoJ3VuaXZlcnNhbCcsIHVuaXZlcnNhbE9wdGlvbnMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBTaGVsbENvbmZpZ1RvV29ya3NwYWNlKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3QsIGNvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMucm91dGUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBSb3V0ZSBpcyBub3QgZGVmaW5lZGApO1xuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFZhbGlkYXRpb24gb2YgdGFyZ2V0cyBpcyBoYW5kbGVkIGFscmVhZHkgaW4gdGhlIG1haW4gZnVuY3Rpb24uXG4gICAgICAvLyBEdXBsaWNhdGUga2V5cyBtZWFucyB0aGF0IHdlIGhhdmUgY29uZmlndXJhdGlvbnMgaW4gYm90aCBzZXJ2ZXIgYW5kIGJ1aWxkIGJ1aWxkZXJzLlxuICAgICAgY29uc3Qgc2VydmVyQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpPy5jb25maWd1cmF0aW9ucyA/PyB7fTtcbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk/LmNvbmZpZ3VyYXRpb25zID8/IHt9O1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uTmFtZXMgPSBPYmplY3Qua2V5cyh7XG4gICAgICAgIC4uLnNlcnZlckNvbmZpZ0tleXMsXG4gICAgICAgIC4uLmJ1aWxkQ29uZmlnS2V5cyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBjb25maWd1cmF0aW9uTmFtZXMpIHtcbiAgICAgICAgaWYgKCFzZXJ2ZXJDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcInNlcnZlclwiIHRhcmdldC5gLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYnVpbGRDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcImJ1aWxkXCIgdGFyZ2V0LmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OmJ1aWxkOiR7a2V5fWAsXG4gICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OnNlcnZlcjoke2tleX1gLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ2FwcC1zaGVsbCcsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkFwcFNoZWxsLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogY29uZmlndXJhdGlvbnNbJ3Byb2R1Y3Rpb24nXSA/ICdwcm9kdWN0aW9uJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHJvdXRlOiBvcHRpb25zLnJvdXRlLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRSb3V0ZXJNb2R1bGUobWFpblBhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYWRkSW1wb3J0VG9Nb2R1bGUobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnUm91dGVyTW9kdWxlJywgJ0Bhbmd1bGFyL3JvdXRlcicpO1xuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIGNoYW5nZXMpO1xuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRNZXRhZGF0YVByb3BlcnR5KG1ldGFkYXRhOiB0cy5Ob2RlLCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGNvbnN0IHByb3BlcnRpZXMgPSAobWV0YWRhdGEgYXMgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pLnByb3BlcnRpZXM7XG4gIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpLmZpbHRlcigocHJvcCkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSBwcm9wLm5hbWU7XG4gICAgc3dpdGNoIChuYW1lLmtpbmQpIHtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgICByZXR1cm4gbmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZTtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgICAgICByZXR1cm4gbmFtZS50ZXh0ID09PSBwcm9wZXJ0eU5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KVswXTtcblxuICByZXR1cm4gcHJvcGVydHk7XG59XG5cbmZ1bmN0aW9uIGFkZFNlcnZlclJvdXRlcyhvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgLy8gVGhlIHdvcmtzcGFjZSBnZXRzIHVwZGF0ZWQgc28gdGhpcyBuZWVkcyB0byBiZSByZWxvYWRlZFxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbml2ZXJzYWwgc2NoZW1hdGljIHJlbW92ZWQgY2xpZW50IHByb2plY3QuJyk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudFNlcnZlclRhcmdldCA9IGNsaWVudFByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuICAgIGlmICghY2xpZW50U2VydmVyVGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaXZlcnNhbCBzY2hlbWF0aWMgZGlkIG5vdCBhZGQgc2VydmVyIHRhcmdldCB0byBjbGllbnQgcHJvamVjdC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50U2VydmVyT3B0aW9ucyA9IGNsaWVudFNlcnZlclRhcmdldC5vcHRpb25zIGFzIHVua25vd24gYXMgU2VydmVyQnVpbGRlck9wdGlvbnM7XG4gICAgaWYgKCFjbGllbnRTZXJ2ZXJPcHRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignU2VydmVyIHRhcmdldCBkb2VzIG5vdCBjb250YWluIG9wdGlvbnMuJyk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRTZXJ2ZXJNb2R1bGVQYXRoKFxuICAgICAgaG9zdCxcbiAgICAgIGNsaWVudFByb2plY3Quc291cmNlUm9vdCB8fCAnc3JjJyxcbiAgICAgIG9wdGlvbnMubWFpbiBhcyBzdHJpbmcsXG4gICAgKTtcbiAgICBpZiAobW9kdWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ1VuaXZlcnNhbC9zZXJ2ZXIgbW9kdWxlIG5vdCBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBsZXQgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCAnUm91dGVzJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBjb25zdCByb3V0ZXNDaGFuZ2UgPSBpbnNlcnRJbXBvcnQobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnUm91dGVzJywgJ0Bhbmd1bGFyL3JvdXRlcicpO1xuICAgICAgaWYgKHJvdXRlc0NoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXNDaGFuZ2VdKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW1wb3J0cyA9IGdldFNvdXJjZU5vZGVzKG1vZHVsZVNvdXJjZSlcbiAgICAgICAgLmZpbHRlcigobm9kZSkgPT4gbm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uKVxuICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5nZXRTdGFydCgpIC0gYi5nZXRTdGFydCgpKTtcbiAgICAgIGNvbnN0IGluc2VydFBvc2l0aW9uID0gaW1wb3J0c1tpbXBvcnRzLmxlbmd0aCAtIDFdLmdldEVuZCgpO1xuICAgICAgY29uc3Qgcm91dGVUZXh0ID0gYFxcblxcbmNvbnN0IHJvdXRlczogUm91dGVzID0gWyB7IHBhdGg6ICcke29wdGlvbnMucm91dGV9JywgY29tcG9uZW50OiBBcHBTaGVsbENvbXBvbmVudCB9XTtgO1xuICAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoaW5zZXJ0UG9zaXRpb24sIHJvdXRlVGV4dCk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCAnUm91dGVyTW9kdWxlJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBjb25zdCByb3V0ZXJNb2R1bGVDaGFuZ2UgPSBpbnNlcnRJbXBvcnQoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ1JvdXRlck1vZHVsZScsXG4gICAgICAgICdAYW5ndWxhci9yb3V0ZXInLFxuICAgICAgKTtcblxuICAgICAgaWYgKHJvdXRlck1vZHVsZUNoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXJNb2R1bGVDaGFuZ2VdKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YWRhdGFDaGFuZ2UgPSBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ2ltcG9ydHMnLFxuICAgICAgICAnUm91dGVyTW9kdWxlLmZvclJvb3Qocm91dGVzKScsXG4gICAgICApO1xuICAgICAgaWYgKG1ldGFkYXRhQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgbWV0YWRhdGFDaGFuZ2UpO1xuICAgICAgfVxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU2hlbGxDb21wb25lbnQob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IENvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgbmFtZTogJ2FwcC1zaGVsbCcsXG4gICAgbW9kdWxlOiBvcHRpb25zLnJvb3RNb2R1bGVGaWxlTmFtZSxcbiAgICBwcm9qZWN0OiBvcHRpb25zLnByb2plY3QsXG4gIH07XG5cbiAgcmV0dXJuIHNjaGVtYXRpYygnY29tcG9uZW50JywgY29tcG9uZW50T3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKHRyZWUpO1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFjbGllbnRQcm9qZWN0IHx8IGNsaWVudFByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEEgY2xpZW50IHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50QnVpbGRPcHRpb25zID0gKGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgfHxcbiAgICAgIHt9KSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICB2YWxpZGF0ZVByb2plY3QoY2xpZW50QnVpbGRPcHRpb25zLm1haW4pLFxuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmhhcygnc2VydmVyJykgPyBub29wKCkgOiBhZGRVbml2ZXJzYWxUYXJnZXQob3B0aW9ucyksXG4gICAgICBhZGRBcHBTaGVsbENvbmZpZ1RvV29ya3NwYWNlKG9wdGlvbnMpLFxuICAgICAgYWRkUm91dGVyTW9kdWxlKGNsaWVudEJ1aWxkT3B0aW9ucy5tYWluKSxcbiAgICAgIGFkZFNlcnZlclJvdXRlcyhvcHRpb25zKSxcbiAgICAgIGFkZFNoZWxsQ29tcG9uZW50KG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuIl19