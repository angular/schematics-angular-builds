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
            const errorMsg = `Prerequisite for app shell is to define a router-outlet in your root component.`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwLXNoZWxsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsMkRBUW9DO0FBRXBDLGtHQUFvRjtBQUNwRixvREFROEI7QUFDOUIsOENBQTBEO0FBQzFELDBEQUEyRDtBQUMzRCxnRUFBc0U7QUFDdEUsb0RBQXFFO0FBQ3JFLGtFQUFvRztBQUdwRyxTQUFTLGFBQWEsQ0FBQyxJQUFVLEVBQUUsSUFBWTtJQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDWCxNQUFNLElBQUksZ0NBQW1CLENBQUMsa0JBQWtCLElBQUksR0FBRyxDQUFDLENBQUM7S0FDMUQ7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEYsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBVSxFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7SUFDM0UsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDdEUsSUFBSSxDQUFDLE9BQU8sRUFBRTtRQUNaLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxNQUFNLFlBQVksR0FBSSxPQUFnQyxDQUFDLGVBQW1DLENBQUM7SUFDM0YsTUFBTSxVQUFVLEdBQUcsSUFBQSxnQkFBUyxFQUFDLElBQUksVUFBVSxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO0lBRXZFLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFPRCxTQUFTLHdCQUF3QixDQUFDLElBQVUsRUFBRSxhQUFxQjtJQUNqRSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3RELE1BQU0sWUFBWSxHQUFHLElBQUEsZ0NBQW9CLEVBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RixPQUFPO1FBQ0wsWUFBWSxFQUFFLG1CQUFtQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUM7UUFDM0QsZUFBZSxFQUFFLG1CQUFtQixDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7S0FDbEUsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQVUsRUFBRSxRQUFnQixFQUFFLFFBQXNCO0lBQ2hGLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUVsQixJQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUU7UUFDekIsUUFBUSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDaEQ7U0FBTSxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7UUFDbkMsTUFBTSxXQUFXLEdBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFnQyxDQUFDLElBQUksQ0FBQztRQUNwRixNQUFNLEdBQUcsR0FBRyxJQUFBLGNBQU8sRUFBQyxJQUFBLGdCQUFTLEVBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFBLFdBQUksRUFBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QyxJQUFJLE1BQU0sRUFBRTtZQUNWLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDOUI7S0FDRjtJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLElBQVUsRUFBRSxRQUFnQjtJQUM3RCxNQUFNLFVBQVUsR0FBRyxJQUFBLCtCQUFnQixFQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNwRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRXJELE1BQU0sWUFBWSxHQUFHLElBQUEsZ0NBQW9CLEVBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN4RixNQUFNLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztJQUV6RSxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxXQUF3QyxDQUFDO0lBRTlFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFekQsTUFBTSxZQUFZLEdBQUcsSUFBQSwwQkFBYyxFQUFDLFlBQVksQ0FBQztTQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1NBQzlCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ2QsT0FBTyxJQUFBLG9CQUFRLEVBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQztTQUNELEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQ1gsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsZUFBbUMsQ0FBQztRQUVsRSxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQztJQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVSLE9BQU8sSUFBQSxXQUFJLEVBQUMsSUFBQSxjQUFPLEVBQUMsSUFBQSxnQkFBUyxFQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxHQUFHLEtBQUssQ0FBQyxDQUFDO0FBQ3BFLENBQUM7QUFDRCx3QkFBd0I7QUFFeEIsU0FBUyxlQUFlLENBQUMsUUFBZ0I7SUFDdkMsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsTUFBTSxzQkFBc0IsR0FBRywrQ0FBK0MsQ0FBQztRQUUvRSxNQUFNLGFBQWEsR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEUsTUFBTSxJQUFJLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzNELE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMxQyxNQUFNLFFBQVEsR0FBRyxpRkFBaUYsQ0FBQztZQUNuRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQixNQUFNLElBQUksZ0NBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxPQUF3QjtJQUNsRCxPQUFPLEdBQUcsRUFBRTtRQUNWLGdCQUFnQjtRQUNoQixNQUFNLGdCQUFnQixHQUFHO1lBQ3ZCLEdBQUcsT0FBTztTQUNYLENBQUM7UUFFRixnQ0FBZ0M7UUFDaEMsT0FBTyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUM7UUFFOUIsT0FBTyxJQUFBLHNCQUFTLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsT0FBd0I7SUFDNUQsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN2QixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRTtZQUNsQixNQUFNLElBQUksZ0NBQW1CLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUN2RDtRQUVELE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7O1lBQ25DLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUNaLE9BQU87YUFDUjtZQUVELGlFQUFpRTtZQUNqRSxzRkFBc0Y7WUFDdEYsTUFBTSxnQkFBZ0IsR0FBRyxNQUFBLE1BQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLDBDQUFFLGNBQWMsbUNBQUksRUFBRSxDQUFDO1lBQzdFLE1BQU0sZUFBZSxHQUFHLE1BQUEsTUFBQSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsMENBQUUsY0FBYyxtQ0FBSSxFQUFFLENBQUM7WUFFM0UsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNyQyxHQUFHLGdCQUFnQjtnQkFDbkIsR0FBRyxlQUFlO2FBQ25CLENBQUMsQ0FBQztZQUVILE1BQU0sY0FBYyxHQUF1QixFQUFFLENBQUM7WUFDOUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxrQkFBa0IsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUMxQixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDakIsbUJBQW1CLEdBQUcsNkVBQTZFLENBQ3BHLENBQUM7b0JBRUYsU0FBUztpQkFDVjtnQkFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUN6QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDakIsbUJBQW1CLEdBQUcsNEVBQTRFLENBQ25HLENBQUM7b0JBRUYsU0FBUztpQkFDVjtnQkFFRCxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUc7b0JBQ3BCLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxPQUFPLFVBQVUsR0FBRyxFQUFFO29CQUNoRCxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxXQUFXLEdBQUcsRUFBRTtpQkFDakQsQ0FBQzthQUNIO1lBRUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ2xCLElBQUksRUFBRSxXQUFXO2dCQUNqQixPQUFPLEVBQUUsMkJBQVEsQ0FBQyxRQUFRO2dCQUMxQixvQkFBb0IsRUFBRSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDN0UsT0FBTyxFQUFFO29CQUNQLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztpQkFDckI7Z0JBQ0QsY0FBYzthQUNmLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLFFBQWdCO0lBQ3ZDLE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixNQUFNLFVBQVUsR0FBRyxJQUFBLCtCQUFnQixFQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sT0FBTyxHQUFHLElBQUEsNkJBQWlCLEVBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMvRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxRQUFpQixFQUFFLFlBQW9CO0lBQ2xFLE1BQU0sVUFBVSxHQUFJLFFBQXVDLENBQUMsVUFBVSxDQUFDO0lBQ3ZFLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDMUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUN2QixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDakIsS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVU7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVksQ0FBQztZQUN6QyxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYTtnQkFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFlBQVksQ0FBQztTQUNyQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFTixPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsT0FBd0I7SUFDL0MsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsMERBQTBEO1FBQzFELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSx3QkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztTQUNoRTtRQUNELE1BQU0sa0JBQWtCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0VBQWtFLENBQUMsQ0FBQztTQUNyRjtRQUNELE1BQU0sbUJBQW1CLEdBQUcsa0JBQWtCLENBQUMsT0FBMEMsQ0FBQztRQUMxRixJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDeEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHlDQUF5QyxDQUFDLENBQUM7U0FDMUU7UUFDRCxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FDcEMsSUFBSSxFQUNKLGFBQWEsQ0FBQyxVQUFVLElBQUksS0FBSyxFQUNqQyxPQUFPLENBQUMsSUFBYyxDQUN2QixDQUFDO1FBQ0YsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsSUFBSSxZQUFZLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsSUFBQSxzQkFBVSxFQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsRUFBRTtZQUMxRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sWUFBWSxHQUFHLElBQUEsd0JBQVksRUFBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pGLElBQUksWUFBWSxFQUFFO2dCQUNoQixJQUFBLDhCQUFxQixFQUFDLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7YUFDakQ7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFBLDBCQUFjLEVBQUMsWUFBWSxDQUFDO2lCQUN6QyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztpQkFDL0QsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVELE1BQU0sU0FBUyxHQUFHLHlDQUF5QyxPQUFPLENBQUMsS0FBSyxxQ0FBcUMsQ0FBQztZQUM5RyxRQUFRLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzdCO1FBRUQsWUFBWSxHQUFHLGFBQWEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLElBQUEsc0JBQVUsRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDLEVBQUU7WUFDaEUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5QyxNQUFNLGtCQUFrQixHQUFHLElBQUEsd0JBQVksRUFDckMsWUFBWSxFQUNaLFVBQVUsRUFDVixjQUFjLEVBQ2QsaUJBQWlCLENBQ2xCLENBQUM7WUFFRixJQUFJLGtCQUFrQixFQUFFO2dCQUN0QixJQUFBLDhCQUFxQixFQUFDLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQzthQUN2RDtZQUVELE1BQU0sY0FBYyxHQUFHLElBQUEsdUNBQTJCLEVBQ2hELFlBQVksRUFDWixVQUFVLEVBQ1YsU0FBUyxFQUNULDhCQUE4QixDQUMvQixDQUFDO1lBQ0YsSUFBSSxjQUFjLEVBQUU7Z0JBQ2xCLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2FBQ2pEO1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM3QjtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLE9BQXdCO0lBQ2pELE1BQU0sZ0JBQWdCLEdBQXFCO1FBQ3pDLElBQUksRUFBRSxXQUFXO1FBQ2pCLE1BQU0sRUFBRSxPQUFPLENBQUMsa0JBQWtCO1FBQ2xDLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztLQUN6QixDQUFDO0lBRUYsT0FBTyxJQUFBLHNCQUFTLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVELG1CQUF5QixPQUF3QjtJQUMvQyxPQUFPLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNwQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGFBQWEsSUFBSSxhQUFhLENBQUMsVUFBVSxDQUFDLFdBQVcsS0FBSyxhQUFhLEVBQUU7WUFDNUUsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHFEQUFxRCxDQUFDLENBQUM7U0FDdEY7UUFDRCxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUN0QixNQUFNLElBQUEsMENBQXdCLEdBQUUsQ0FBQztTQUNsQztRQUNELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPO1lBQ25ELEVBQUUsQ0FBcUMsQ0FBQztRQUUxQyxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7WUFDeEMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7WUFDMUUsNEJBQTRCLENBQUMsT0FBTyxDQUFDO1lBQ3JDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7WUFDeEMsZUFBZSxDQUFDLE9BQU8sQ0FBQztZQUN4QixpQkFBaUIsQ0FBQyxPQUFPLENBQUM7U0FDM0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXZCRCw0QkF1QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgY2hhaW4sXG4gIG5vb3AsXG4gIHNjaGVtYXRpYyxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIENvbXBvbmVudE9wdGlvbnMgfSBmcm9tICcuLi9jb21wb25lbnQvc2NoZW1hJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtcbiAgYWRkSW1wb3J0VG9Nb2R1bGUsXG4gIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YSxcbiAgZmluZE5vZGUsXG4gIGdldERlY29yYXRvck1ldGFkYXRhLFxuICBnZXRTb3VyY2VOb2RlcyxcbiAgaW5zZXJ0SW1wb3J0LFxuICBpc0ltcG9ydGVkLFxufSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBhcHBseVRvVXBkYXRlUmVjb3JkZXIgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQgeyBnZXRBcHBNb2R1bGVQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMsIEJ1aWxkZXJzLCBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwU2hlbGxPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBnZXRTb3VyY2VGaWxlKGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmICghYnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCBmaW5kICR7cGF0aH0uYCk7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmZ1bmN0aW9uIGdldFNlcnZlck1vZHVsZVBhdGgoaG9zdDogVHJlZSwgc291cmNlUm9vdDogc3RyaW5nLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1haW5Tb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aCkpO1xuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKG1haW5Tb3VyY2UpO1xuICBjb25zdCBleHBOb2RlID0gYWxsTm9kZXMuZmluZCgobm9kZSkgPT4gdHMuaXNFeHBvcnREZWNsYXJhdGlvbihub2RlKSk7XG4gIGlmICghZXhwTm9kZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IChleHBOb2RlIGFzIHRzLkV4cG9ydERlY2xhcmF0aW9uKS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcbiAgY29uc3QgbW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShgLyR7c291cmNlUm9vdH0vJHtyZWxhdGl2ZVBhdGgudGV4dH0udHNgKTtcblxuICByZXR1cm4gbW9kdWxlUGF0aDtcbn1cblxuaW50ZXJmYWNlIFRlbXBsYXRlSW5mbyB7XG4gIHRlbXBsYXRlUHJvcD86IHRzLlByb3BlcnR5QXNzaWdubWVudDtcbiAgdGVtcGxhdGVVcmxQcm9wPzogdHMuUHJvcGVydHlBc3NpZ25tZW50O1xufVxuXG5mdW5jdGlvbiBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdDogVHJlZSwgY29tcG9uZW50UGF0aDogc3RyaW5nKTogVGVtcGxhdGVJbmZvIHtcbiAgY29uc3QgY29tcFNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gIGNvbnN0IGNvbXBNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKGNvbXBTb3VyY2UsICdDb21wb25lbnQnLCAnQGFuZ3VsYXIvY29yZScpWzBdO1xuXG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlJyksXG4gICAgdGVtcGxhdGVVcmxQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlVXJsJyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudFRlbXBsYXRlKGhvc3Q6IFRyZWUsIGNvbXBQYXRoOiBzdHJpbmcsIHRtcGxJbmZvOiBUZW1wbGF0ZUluZm8pOiBzdHJpbmcge1xuICBsZXQgdGVtcGxhdGUgPSAnJztcblxuICBpZiAodG1wbEluZm8udGVtcGxhdGVQcm9wKSB7XG4gICAgdGVtcGxhdGUgPSB0bXBsSW5mby50ZW1wbGF0ZVByb3AuZ2V0RnVsbFRleHQoKTtcbiAgfSBlbHNlIGlmICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3ApIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVVybCA9ICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3AuaW5pdGlhbGl6ZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICBjb25zdCBkaXIgPSBkaXJuYW1lKG5vcm1hbGl6ZShjb21wUGF0aCkpO1xuICAgIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGpvaW4oZGlyLCB0ZW1wbGF0ZVVybCk7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHRlbXBsYXRlUGF0aCk7XG4gICAgaWYgKGJ1ZmZlcikge1xuICAgICAgdGVtcGxhdGUgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGVtcGxhdGU7XG59XG5cbmZ1bmN0aW9uIGdldEJvb3RzdHJhcENvbXBvbmVudFBhdGgoaG9zdDogVHJlZSwgbWFpblBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcblxuICBjb25zdCBtZXRhZGF0YU5vZGUgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShtb2R1bGVTb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gIGNvbnN0IGJvb3RzdHJhcFByb3BlcnR5ID0gZ2V0TWV0YWRhdGFQcm9wZXJ0eShtZXRhZGF0YU5vZGUsICdib290c3RyYXAnKTtcblxuICBjb25zdCBhcnJMaXRlcmFsID0gYm9vdHN0cmFwUHJvcGVydHkuaW5pdGlhbGl6ZXIgYXMgdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbjtcblxuICBjb25zdCBjb21wb25lbnRTeW1ib2wgPSBhcnJMaXRlcmFsLmVsZW1lbnRzWzBdLmdldFRleHQoKTtcblxuICBjb25zdCByZWxhdGl2ZVBhdGggPSBnZXRTb3VyY2VOb2Rlcyhtb2R1bGVTb3VyY2UpXG4gICAgLmZpbHRlcih0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5maWx0ZXIoKGltcCkgPT4ge1xuICAgICAgcmV0dXJuIGZpbmROb2RlKGltcCwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyLCBjb21wb25lbnRTeW1ib2wpO1xuICAgIH0pXG4gICAgLm1hcCgoaW1wKSA9PiB7XG4gICAgICBjb25zdCBwYXRoU3RyaW5nTGl0ZXJhbCA9IGltcC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcblxuICAgICAgcmV0dXJuIHBhdGhTdHJpbmdMaXRlcmFsLnRleHQ7XG4gICAgfSlbMF07XG5cbiAgcmV0dXJuIGpvaW4oZGlybmFtZShub3JtYWxpemUobW9kdWxlUGF0aCkpLCByZWxhdGl2ZVBhdGggKyAnLnRzJyk7XG59XG4vLyBlbmQgaGVscGVyIGZ1bmN0aW9ucy5cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0KG1haW5QYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgcm91dGVyT3V0bGV0Q2hlY2tSZWdleCA9IC88cm91dGVyLW91dGxldC4qPz4oW1xcc1xcU10qPyk8XFwvcm91dGVyLW91dGxldD4vO1xuXG4gICAgY29uc3QgY29tcG9uZW50UGF0aCA9IGdldEJvb3RzdHJhcENvbXBvbmVudFBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnN0IHRtcGwgPSBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBnZXRDb21wb25lbnRUZW1wbGF0ZShob3N0LCBjb21wb25lbnRQYXRoLCB0bXBsKTtcbiAgICBpZiAoIXJvdXRlck91dGxldENoZWNrUmVnZXgudGVzdCh0ZW1wbGF0ZSkpIHtcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYFByZXJlcXVpc2l0ZSBmb3IgYXBwIHNoZWxsIGlzIHRvIGRlZmluZSBhIHJvdXRlci1vdXRsZXQgaW4geW91ciByb290IGNvbXBvbmVudC5gO1xuICAgICAgY29udGV4dC5sb2dnZXIuZXJyb3IoZXJyb3JNc2cpO1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oZXJyb3JNc2cpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkVW5pdmVyc2FsVGFyZ2V0KG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKCkgPT4ge1xuICAgIC8vIENvcHkgb3B0aW9ucy5cbiAgICBjb25zdCB1bml2ZXJzYWxPcHRpb25zID0ge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9O1xuXG4gICAgLy8gRGVsZXRlIG5vbi11bml2ZXJzYWwgb3B0aW9ucy5cbiAgICBkZWxldGUgdW5pdmVyc2FsT3B0aW9ucy5yb3V0ZTtcblxuICAgIHJldHVybiBzY2hlbWF0aWMoJ3VuaXZlcnNhbCcsIHVuaXZlcnNhbE9wdGlvbnMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBTaGVsbENvbmZpZ1RvV29ya3NwYWNlKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3QsIGNvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMucm91dGUpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBSb3V0ZSBpcyBub3QgZGVmaW5lZGApO1xuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICAgIGlmICghcHJvamVjdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFZhbGlkYXRpb24gb2YgdGFyZ2V0cyBpcyBoYW5kbGVkIGFscmVhZHkgaW4gdGhlIG1haW4gZnVuY3Rpb24uXG4gICAgICAvLyBEdXBsaWNhdGUga2V5cyBtZWFucyB0aGF0IHdlIGhhdmUgY29uZmlndXJhdGlvbnMgaW4gYm90aCBzZXJ2ZXIgYW5kIGJ1aWxkIGJ1aWxkZXJzLlxuICAgICAgY29uc3Qgc2VydmVyQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpPy5jb25maWd1cmF0aW9ucyA/PyB7fTtcbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk/LmNvbmZpZ3VyYXRpb25zID8/IHt9O1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uTmFtZXMgPSBPYmplY3Qua2V5cyh7XG4gICAgICAgIC4uLnNlcnZlckNvbmZpZ0tleXMsXG4gICAgICAgIC4uLmJ1aWxkQ29uZmlnS2V5cyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBjb25maWd1cmF0aW9uTmFtZXMpIHtcbiAgICAgICAgaWYgKCFzZXJ2ZXJDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcInNlcnZlclwiIHRhcmdldC5gLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYnVpbGRDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcImJ1aWxkXCIgdGFyZ2V0LmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OmJ1aWxkOiR7a2V5fWAsXG4gICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OnNlcnZlcjoke2tleX1gLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ2FwcC1zaGVsbCcsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkFwcFNoZWxsLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogY29uZmlndXJhdGlvbnNbJ3Byb2R1Y3Rpb24nXSA/ICdwcm9kdWN0aW9uJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHJvdXRlOiBvcHRpb25zLnJvdXRlLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9ucyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRSb3V0ZXJNb2R1bGUobWFpblBhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBjb25zdCBjaGFuZ2VzID0gYWRkSW1wb3J0VG9Nb2R1bGUobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnUm91dGVyTW9kdWxlJywgJ0Bhbmd1bGFyL3JvdXRlcicpO1xuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIGNoYW5nZXMpO1xuICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRNZXRhZGF0YVByb3BlcnR5KG1ldGFkYXRhOiB0cy5Ob2RlLCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGNvbnN0IHByb3BlcnRpZXMgPSAobWV0YWRhdGEgYXMgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pLnByb3BlcnRpZXM7XG4gIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpLmZpbHRlcigocHJvcCkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSBwcm9wLm5hbWU7XG4gICAgc3dpdGNoIChuYW1lLmtpbmQpIHtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyOlxuICAgICAgICByZXR1cm4gbmFtZS5nZXRUZXh0KCkgPT09IHByb3BlcnR5TmFtZTtcbiAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgICAgICByZXR1cm4gbmFtZS50ZXh0ID09PSBwcm9wZXJ0eU5hbWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KVswXTtcblxuICByZXR1cm4gcHJvcGVydHk7XG59XG5cbmZ1bmN0aW9uIGFkZFNlcnZlclJvdXRlcyhvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgLy8gVGhlIHdvcmtzcGFjZSBnZXRzIHVwZGF0ZWQgc28gdGhpcyBuZWVkcyB0byBiZSByZWxvYWRlZFxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbml2ZXJzYWwgc2NoZW1hdGljIHJlbW92ZWQgY2xpZW50IHByb2plY3QuJyk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudFNlcnZlclRhcmdldCA9IGNsaWVudFByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuICAgIGlmICghY2xpZW50U2VydmVyVGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaXZlcnNhbCBzY2hlbWF0aWMgZGlkIG5vdCBhZGQgc2VydmVyIHRhcmdldCB0byBjbGllbnQgcHJvamVjdC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50U2VydmVyT3B0aW9ucyA9IGNsaWVudFNlcnZlclRhcmdldC5vcHRpb25zIGFzIHVua25vd24gYXMgU2VydmVyQnVpbGRlck9wdGlvbnM7XG4gICAgaWYgKCFjbGllbnRTZXJ2ZXJPcHRpb25zKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignU2VydmVyIHRhcmdldCBkb2VzIG5vdCBjb250YWluIG9wdGlvbnMuJyk7XG4gICAgfVxuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRTZXJ2ZXJNb2R1bGVQYXRoKFxuICAgICAgaG9zdCxcbiAgICAgIGNsaWVudFByb2plY3Quc291cmNlUm9vdCB8fCAnc3JjJyxcbiAgICAgIG9wdGlvbnMubWFpbiBhcyBzdHJpbmcsXG4gICAgKTtcbiAgICBpZiAobW9kdWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ1VuaXZlcnNhbC9zZXJ2ZXIgbW9kdWxlIG5vdCBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBsZXQgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCAnUm91dGVzJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBjb25zdCByb3V0ZXNDaGFuZ2UgPSBpbnNlcnRJbXBvcnQobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnUm91dGVzJywgJ0Bhbmd1bGFyL3JvdXRlcicpO1xuICAgICAgaWYgKHJvdXRlc0NoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXNDaGFuZ2VdKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW1wb3J0cyA9IGdldFNvdXJjZU5vZGVzKG1vZHVsZVNvdXJjZSlcbiAgICAgICAgLmZpbHRlcigobm9kZSkgPT4gbm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uKVxuICAgICAgICAuc29ydCgoYSwgYikgPT4gYS5nZXRTdGFydCgpIC0gYi5nZXRTdGFydCgpKTtcbiAgICAgIGNvbnN0IGluc2VydFBvc2l0aW9uID0gaW1wb3J0c1tpbXBvcnRzLmxlbmd0aCAtIDFdLmdldEVuZCgpO1xuICAgICAgY29uc3Qgcm91dGVUZXh0ID0gYFxcblxcbmNvbnN0IHJvdXRlczogUm91dGVzID0gWyB7IHBhdGg6ICcke29wdGlvbnMucm91dGV9JywgY29tcG9uZW50OiBBcHBTaGVsbENvbXBvbmVudCB9XTtgO1xuICAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoaW5zZXJ0UG9zaXRpb24sIHJvdXRlVGV4dCk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCAnUm91dGVyTW9kdWxlJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBjb25zdCByb3V0ZXJNb2R1bGVDaGFuZ2UgPSBpbnNlcnRJbXBvcnQoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ1JvdXRlck1vZHVsZScsXG4gICAgICAgICdAYW5ndWxhci9yb3V0ZXInLFxuICAgICAgKTtcblxuICAgICAgaWYgKHJvdXRlck1vZHVsZUNoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXJNb2R1bGVDaGFuZ2VdKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YWRhdGFDaGFuZ2UgPSBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ2ltcG9ydHMnLFxuICAgICAgICAnUm91dGVyTW9kdWxlLmZvclJvb3Qocm91dGVzKScsXG4gICAgICApO1xuICAgICAgaWYgKG1ldGFkYXRhQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgbWV0YWRhdGFDaGFuZ2UpO1xuICAgICAgfVxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU2hlbGxDb21wb25lbnQob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIGNvbnN0IGNvbXBvbmVudE9wdGlvbnM6IENvbXBvbmVudE9wdGlvbnMgPSB7XG4gICAgbmFtZTogJ2FwcC1zaGVsbCcsXG4gICAgbW9kdWxlOiBvcHRpb25zLnJvb3RNb2R1bGVGaWxlTmFtZSxcbiAgICBwcm9qZWN0OiBvcHRpb25zLnByb2plY3QsXG4gIH07XG5cbiAgcmV0dXJuIHNjaGVtYXRpYygnY29tcG9uZW50JywgY29tcG9uZW50T3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKHRyZWUpO1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFjbGllbnRQcm9qZWN0IHx8IGNsaWVudFByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEEgY2xpZW50IHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuICAgIGNvbnN0IGNsaWVudEJ1aWxkVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWNsaWVudEJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50QnVpbGRPcHRpb25zID0gKGNsaWVudEJ1aWxkVGFyZ2V0Lm9wdGlvbnMgfHxcbiAgICAgIHt9KSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICB2YWxpZGF0ZVByb2plY3QoY2xpZW50QnVpbGRPcHRpb25zLm1haW4pLFxuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmhhcygnc2VydmVyJykgPyBub29wKCkgOiBhZGRVbml2ZXJzYWxUYXJnZXQob3B0aW9ucyksXG4gICAgICBhZGRBcHBTaGVsbENvbmZpZ1RvV29ya3NwYWNlKG9wdGlvbnMpLFxuICAgICAgYWRkUm91dGVyTW9kdWxlKGNsaWVudEJ1aWxkT3B0aW9ucy5tYWluKSxcbiAgICAgIGFkZFNlcnZlclJvdXRlcyhvcHRpb25zKSxcbiAgICAgIGFkZFNoZWxsQ29tcG9uZW50KG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuIl19