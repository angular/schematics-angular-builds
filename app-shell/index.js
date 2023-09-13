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
const standalone_1 = require("../private/standalone");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const util_1 = require("../utility/standalone/util");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const APP_SHELL_ROUTE = 'shell';
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
    const mainSource = getSourceFile(host, mainPath);
    const bootstrapAppCall = (0, standalone_1.findBootstrapApplicationCall)(mainSource);
    let bootstrappingFilePath;
    let bootstrappingSource;
    let componentName;
    if (bootstrapAppCall) {
        // Standalone Application
        componentName = bootstrapAppCall.arguments[0].getText();
        bootstrappingFilePath = mainPath;
        bootstrappingSource = mainSource;
    }
    else {
        // NgModule Application
        const modulePath = (0, ng_ast_utils_1.getAppModulePath)(host, mainPath);
        const moduleSource = getSourceFile(host, modulePath);
        const metadataNode = (0, ast_utils_1.getDecoratorMetadata)(moduleSource, 'NgModule', '@angular/core')[0];
        const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');
        const arrLiteral = bootstrapProperty.initializer;
        componentName = arrLiteral.elements[0].getText();
        bootstrappingSource = moduleSource;
        bootstrappingFilePath = modulePath;
    }
    const componentRelativeFilePath = (0, ast_utils_1.getSourceNodes)(bootstrappingSource)
        .filter(ts.isImportDeclaration)
        .filter((imp) => {
        return (0, ast_utils_1.findNode)(imp, ts.SyntaxKind.Identifier, componentName);
    })
        .map((imp) => {
        const pathStringLiteral = imp.moduleSpecifier;
        return pathStringLiteral.text;
    })[0];
    return (0, core_1.join)((0, core_1.dirname)((0, core_1.normalize)(bootstrappingFilePath)), componentRelativeFilePath + '.ts');
}
// end helper functions.
function validateProject(mainPath) {
    return (host) => {
        const routerOutletCheckRegex = /<router-outlet.*?>([\s\S]*?)<\/router-outlet>/;
        const componentPath = getBootstrapComponentPath(host, mainPath);
        const tmpl = getComponentTemplateInfo(host, componentPath);
        const template = getComponentTemplate(host, componentPath, tmpl);
        if (!routerOutletCheckRegex.test(template)) {
            throw new schematics_1.SchematicsException(`Prerequisite for application shell is to define a router-outlet in your root component.`);
        }
    };
}
function addAppShellConfigToWorkspace(options) {
    return (host, context) => {
        return (0, workspace_1.updateWorkspace)((workspace) => {
            const project = workspace.projects.get(options.project);
            if (!project) {
                return;
            }
            const buildTarget = project.targets.get('build');
            if (buildTarget?.builder === workspace_models_1.Builders.Application) {
                // Application builder configuration.
                const prodConfig = buildTarget.configurations?.production;
                if (!prodConfig) {
                    throw new schematics_1.SchematicsException(`A "production" configuration is not defined for the "build" builder.`);
                }
                prodConfig.appShell = true;
                return;
            }
            // Webpack based builders configuration.
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
                    route: APP_SHELL_ROUTE,
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
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        const modulePath = getServerModulePath(host, project.sourceRoot || 'src', 'main.server.ts');
        if (modulePath === null) {
            throw new schematics_1.SchematicsException('Server module not found.');
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
            const routeText = `\n\nconst routes: Routes = [ { path: '${APP_SHELL_ROUTE}', component: AppShellComponent }];`;
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
function addStandaloneServerRoute(options) {
    return async (host) => {
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${options.project}" doesn't not exist.`);
        }
        const configFilePath = (0, core_1.join)((0, core_1.normalize)(project.sourceRoot ?? 'src'), 'app/app.config.server.ts');
        if (!host.exists(configFilePath)) {
            throw new schematics_1.SchematicsException(`Cannot find "${configFilePath}".`);
        }
        let configSourceFile = getSourceFile(host, configFilePath);
        if (!(0, ast_utils_1.isImported)(configSourceFile, 'ROUTES', '@angular/router')) {
            const routesChange = (0, ast_utils_1.insertImport)(configSourceFile, configFilePath, 'ROUTES', '@angular/router');
            const recorder = host.beginUpdate(configFilePath);
            if (routesChange) {
                (0, change_1.applyToUpdateRecorder)(recorder, [routesChange]);
                host.commitUpdate(recorder);
            }
        }
        configSourceFile = getSourceFile(host, configFilePath);
        const providersLiteral = (0, ast_utils_1.findNodes)(configSourceFile, ts.isPropertyAssignment).find((n) => ts.isArrayLiteralExpression(n.initializer) && n.name.getText() === 'providers')?.initializer;
        if (!providersLiteral) {
            throw new schematics_1.SchematicsException(`Cannot find the "providers" configuration in "${configFilePath}".`);
        }
        // Add route to providers literal.
        const newProvidersLiteral = ts.factory.updateArrayLiteralExpression(providersLiteral, [
            ...providersLiteral.elements,
            ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment('provide', ts.factory.createIdentifier('ROUTES')),
                ts.factory.createPropertyAssignment('multi', ts.factory.createIdentifier('true')),
                ts.factory.createPropertyAssignment('useValue', ts.factory.createArrayLiteralExpression([
                    ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('path', ts.factory.createIdentifier(`'${APP_SHELL_ROUTE}'`)),
                        ts.factory.createPropertyAssignment('component', ts.factory.createIdentifier('AppShellComponent')),
                    ], true),
                ], true)),
            ], true),
        ]);
        const recorder = host.beginUpdate(configFilePath);
        recorder.remove(providersLiteral.getStart(), providersLiteral.getWidth());
        const printer = ts.createPrinter();
        recorder.insertRight(providersLiteral.getStart(), printer.printNode(ts.EmitHint.Unspecified, newProvidersLiteral, configSourceFile));
        // Add AppShellComponent import
        const appShellImportChange = (0, ast_utils_1.insertImport)(configSourceFile, configFilePath, 'AppShellComponent', './app-shell/app-shell.component');
        (0, change_1.applyToUpdateRecorder)(recorder, [appShellImportChange]);
        host.commitUpdate(recorder);
    };
}
function default_1(options) {
    return async (tree) => {
        const browserEntryPoint = await (0, util_1.getMainFilePath)(tree, options.project);
        const isStandalone = (0, ng_ast_utils_1.isStandaloneApp)(tree, browserEntryPoint);
        return (0, schematics_1.chain)([
            validateProject(browserEntryPoint),
            (0, schematics_1.schematic)('server', options),
            addAppShellConfigToWorkspace(options),
            isStandalone ? (0, schematics_1.noop)() : addRouterModule(browserEntryPoint),
            isStandalone ? addStandaloneServerRoute(options) : addServerRoutes(options),
            (0, schematics_1.schematic)('component', {
                name: 'app-shell',
                module: 'app.module.server.ts',
                project: options.project,
                standalone: isStandalone,
            }),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwLXNoZWxsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBZ0U7QUFDaEUsMkRBT29DO0FBQ3BDLHNEQUFxRTtBQUNyRSxrR0FBb0Y7QUFDcEYsb0RBUzhCO0FBQzlCLDhDQUEwRDtBQUMxRCwwREFBNEU7QUFDNUUscURBQTZEO0FBQzdELG9EQUFxRTtBQUNyRSxrRUFBNkU7QUFHN0UsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDO0FBRWhDLFNBQVMsYUFBYSxDQUFDLElBQVUsRUFBRSxJQUFZO0lBQzdDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDcEMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFaEYsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsSUFBVSxFQUFFLFVBQWtCLEVBQUUsUUFBZ0I7SUFDM0UsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsVUFBVSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFBLDBCQUFjLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7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LEVBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2RSxNQUFNLFlBQVksR0FBRyxJQUFBLDhCQUFlLEVBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFOUQsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxlQUFlLENBQUMsaUJBQWlCLENBQUM7WUFDbEMsSUFBQSxzQkFBUyxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7WUFDNUIsNEJBQTRCLENBQUMsT0FBTyxDQUFDO1lBQ3JDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQztZQUMxRCxZQUFZLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDO1lBQzNFLElBQUEsc0JBQVMsRUFBQyxXQUFXLEVBQUU7Z0JBQ3JCLElBQUksRUFBRSxXQUFXO2dCQUNqQixNQUFNLEVBQUUsc0JBQXNCO2dCQUM5QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87Z0JBQ3hCLFVBQVUsRUFBRSxZQUFZO2FBQ3pCLENBQUM7U0FDSCxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBbkJELDRCQW1CQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBjaGFpbixcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBmaW5kQm9vdHN0cmFwQXBwbGljYXRpb25DYWxsIH0gZnJvbSAnLi4vcHJpdmF0ZS9zdGFuZGFsb25lJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtcbiAgYWRkSW1wb3J0VG9Nb2R1bGUsXG4gIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YSxcbiAgZmluZE5vZGUsXG4gIGZpbmROb2RlcyxcbiAgZ2V0RGVjb3JhdG9yTWV0YWRhdGEsXG4gIGdldFNvdXJjZU5vZGVzLFxuICBpbnNlcnRJbXBvcnQsXG4gIGlzSW1wb3J0ZWQsXG59IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IGFwcGx5VG9VcGRhdGVSZWNvcmRlciB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGdldEFwcE1vZHVsZVBhdGgsIGlzU3RhbmRhbG9uZUFwcCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IGdldE1haW5GaWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvc3RhbmRhbG9uZS91dGlsJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBTaGVsbE9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmNvbnN0IEFQUF9TSEVMTF9ST1VURSA9ICdzaGVsbCc7XG5cbmZ1bmN0aW9uIGdldFNvdXJjZUZpbGUoaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnRlbnQgPSBob3N0LnJlYWRUZXh0KHBhdGgpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmZ1bmN0aW9uIGdldFNlcnZlck1vZHVsZVBhdGgoaG9zdDogVHJlZSwgc291cmNlUm9vdDogc3RyaW5nLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1haW5Tb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIGpvaW4obm9ybWFsaXplKHNvdXJjZVJvb3QpLCBtYWluUGF0aCkpO1xuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKG1haW5Tb3VyY2UpO1xuICBjb25zdCBleHBOb2RlID0gYWxsTm9kZXMuZmluZCgobm9kZSkgPT4gdHMuaXNFeHBvcnREZWNsYXJhdGlvbihub2RlKSk7XG4gIGlmICghZXhwTm9kZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IChleHBOb2RlIGFzIHRzLkV4cG9ydERlY2xhcmF0aW9uKS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcbiAgY29uc3QgbW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShgLyR7c291cmNlUm9vdH0vJHtyZWxhdGl2ZVBhdGgudGV4dH0udHNgKTtcblxuICByZXR1cm4gbW9kdWxlUGF0aDtcbn1cblxuaW50ZXJmYWNlIFRlbXBsYXRlSW5mbyB7XG4gIHRlbXBsYXRlUHJvcD86IHRzLlByb3BlcnR5QXNzaWdubWVudDtcbiAgdGVtcGxhdGVVcmxQcm9wPzogdHMuUHJvcGVydHlBc3NpZ25tZW50O1xufVxuXG5mdW5jdGlvbiBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdDogVHJlZSwgY29tcG9uZW50UGF0aDogc3RyaW5nKTogVGVtcGxhdGVJbmZvIHtcbiAgY29uc3QgY29tcFNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gIGNvbnN0IGNvbXBNZXRhZGF0YSA9IGdldERlY29yYXRvck1ldGFkYXRhKGNvbXBTb3VyY2UsICdDb21wb25lbnQnLCAnQGFuZ3VsYXIvY29yZScpWzBdO1xuXG4gIHJldHVybiB7XG4gICAgdGVtcGxhdGVQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlJyksXG4gICAgdGVtcGxhdGVVcmxQcm9wOiBnZXRNZXRhZGF0YVByb3BlcnR5KGNvbXBNZXRhZGF0YSwgJ3RlbXBsYXRlVXJsJyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudFRlbXBsYXRlKGhvc3Q6IFRyZWUsIGNvbXBQYXRoOiBzdHJpbmcsIHRtcGxJbmZvOiBUZW1wbGF0ZUluZm8pOiBzdHJpbmcge1xuICBsZXQgdGVtcGxhdGUgPSAnJztcblxuICBpZiAodG1wbEluZm8udGVtcGxhdGVQcm9wKSB7XG4gICAgdGVtcGxhdGUgPSB0bXBsSW5mby50ZW1wbGF0ZVByb3AuZ2V0RnVsbFRleHQoKTtcbiAgfSBlbHNlIGlmICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3ApIHtcbiAgICBjb25zdCB0ZW1wbGF0ZVVybCA9ICh0bXBsSW5mby50ZW1wbGF0ZVVybFByb3AuaW5pdGlhbGl6ZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICBjb25zdCBkaXIgPSBkaXJuYW1lKG5vcm1hbGl6ZShjb21wUGF0aCkpO1xuICAgIGNvbnN0IHRlbXBsYXRlUGF0aCA9IGpvaW4oZGlyLCB0ZW1wbGF0ZVVybCk7XG4gICAgdHJ5IHtcbiAgICAgIHRlbXBsYXRlID0gaG9zdC5yZWFkVGV4dCh0ZW1wbGF0ZVBhdGgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxuXG4gIHJldHVybiB0ZW1wbGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9vdHN0cmFwQ29tcG9uZW50UGF0aChob3N0OiBUcmVlLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbWFpblNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgbWFpblBhdGgpO1xuICBjb25zdCBib290c3RyYXBBcHBDYWxsID0gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbChtYWluU291cmNlKTtcblxuICBsZXQgYm9vdHN0cmFwcGluZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIGxldCBib290c3RyYXBwaW5nU291cmNlOiB0cy5Tb3VyY2VGaWxlO1xuICBsZXQgY29tcG9uZW50TmFtZTogc3RyaW5nO1xuXG4gIGlmIChib290c3RyYXBBcHBDYWxsKSB7XG4gICAgLy8gU3RhbmRhbG9uZSBBcHBsaWNhdGlvblxuICAgIGNvbXBvbmVudE5hbWUgPSBib290c3RyYXBBcHBDYWxsLmFyZ3VtZW50c1swXS5nZXRUZXh0KCk7XG4gICAgYm9vdHN0cmFwcGluZ0ZpbGVQYXRoID0gbWFpblBhdGg7XG4gICAgYm9vdHN0cmFwcGluZ1NvdXJjZSA9IG1haW5Tb3VyY2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gTmdNb2R1bGUgQXBwbGljYXRpb25cbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBjb25zdCBtZXRhZGF0YU5vZGUgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShtb2R1bGVTb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gICAgY29uc3QgYm9vdHN0cmFwUHJvcGVydHkgPSBnZXRNZXRhZGF0YVByb3BlcnR5KG1ldGFkYXRhTm9kZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIGNvbnN0IGFyckxpdGVyYWwgPSBib290c3RyYXBQcm9wZXJ0eS5pbml0aWFsaXplciBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uO1xuICAgIGNvbXBvbmVudE5hbWUgPSBhcnJMaXRlcmFsLmVsZW1lbnRzWzBdLmdldFRleHQoKTtcbiAgICBib290c3RyYXBwaW5nU291cmNlID0gbW9kdWxlU291cmNlO1xuICAgIGJvb3RzdHJhcHBpbmdGaWxlUGF0aCA9IG1vZHVsZVBhdGg7XG4gIH1cblxuICBjb25zdCBjb21wb25lbnRSZWxhdGl2ZUZpbGVQYXRoID0gZ2V0U291cmNlTm9kZXMoYm9vdHN0cmFwcGluZ1NvdXJjZSlcbiAgICAuZmlsdGVyKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgLmZpbHRlcigoaW1wKSA9PiB7XG4gICAgICByZXR1cm4gZmluZE5vZGUoaW1wLCB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIsIGNvbXBvbmVudE5hbWUpO1xuICAgIH0pXG4gICAgLm1hcCgoaW1wKSA9PiB7XG4gICAgICBjb25zdCBwYXRoU3RyaW5nTGl0ZXJhbCA9IGltcC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbDtcblxuICAgICAgcmV0dXJuIHBhdGhTdHJpbmdMaXRlcmFsLnRleHQ7XG4gICAgfSlbMF07XG5cbiAgcmV0dXJuIGpvaW4oZGlybmFtZShub3JtYWxpemUoYm9vdHN0cmFwcGluZ0ZpbGVQYXRoKSksIGNvbXBvbmVudFJlbGF0aXZlRmlsZVBhdGggKyAnLnRzJyk7XG59XG4vLyBlbmQgaGVscGVyIGZ1bmN0aW9ucy5cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0KG1haW5QYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3Qgcm91dGVyT3V0bGV0Q2hlY2tSZWdleCA9IC88cm91dGVyLW91dGxldC4qPz4oW1xcc1xcU10qPyk8XFwvcm91dGVyLW91dGxldD4vO1xuXG4gICAgY29uc3QgY29tcG9uZW50UGF0aCA9IGdldEJvb3RzdHJhcENvbXBvbmVudFBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnN0IHRtcGwgPSBnZXRDb21wb25lbnRUZW1wbGF0ZUluZm8oaG9zdCwgY29tcG9uZW50UGF0aCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBnZXRDb21wb25lbnRUZW1wbGF0ZShob3N0LCBjb21wb25lbnRQYXRoLCB0bXBsKTtcbiAgICBpZiAoIXJvdXRlck91dGxldENoZWNrUmVnZXgudGVzdCh0ZW1wbGF0ZSkpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgICBgUHJlcmVxdWlzaXRlIGZvciBhcHBsaWNhdGlvbiBzaGVsbCBpcyB0byBkZWZpbmUgYSByb3V0ZXItb3V0bGV0IGluIHlvdXIgcm9vdCBjb21wb25lbnQuYCxcbiAgICAgICk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRBcHBTaGVsbENvbmZpZ1RvV29ya3NwYWNlKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3QsIGNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidWlsZFRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgICBpZiAoYnVpbGRUYXJnZXQ/LmJ1aWxkZXIgPT09IEJ1aWxkZXJzLkFwcGxpY2F0aW9uKSB7XG4gICAgICAgIC8vIEFwcGxpY2F0aW9uIGJ1aWxkZXIgY29uZmlndXJhdGlvbi5cbiAgICAgICAgY29uc3QgcHJvZENvbmZpZyA9IGJ1aWxkVGFyZ2V0LmNvbmZpZ3VyYXRpb25zPy5wcm9kdWN0aW9uO1xuICAgICAgICBpZiAoIXByb2RDb25maWcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihcbiAgICAgICAgICAgIGBBIFwicHJvZHVjdGlvblwiIGNvbmZpZ3VyYXRpb24gaXMgbm90IGRlZmluZWQgZm9yIHRoZSBcImJ1aWxkXCIgYnVpbGRlci5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9kQ29uZmlnLmFwcFNoZWxsID0gdHJ1ZTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFdlYnBhY2sgYmFzZWQgYnVpbGRlcnMgY29uZmlndXJhdGlvbi5cbiAgICAgIC8vIFZhbGlkYXRpb24gb2YgdGFyZ2V0cyBpcyBoYW5kbGVkIGFscmVhZHkgaW4gdGhlIG1haW4gZnVuY3Rpb24uXG4gICAgICAvLyBEdXBsaWNhdGUga2V5cyBtZWFucyB0aGF0IHdlIGhhdmUgY29uZmlndXJhdGlvbnMgaW4gYm90aCBzZXJ2ZXIgYW5kIGJ1aWxkIGJ1aWxkZXJzLlxuICAgICAgY29uc3Qgc2VydmVyQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpPy5jb25maWd1cmF0aW9ucyA/PyB7fTtcbiAgICAgIGNvbnN0IGJ1aWxkQ29uZmlnS2V5cyA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk/LmNvbmZpZ3VyYXRpb25zID8/IHt9O1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uTmFtZXMgPSBPYmplY3Qua2V5cyh7XG4gICAgICAgIC4uLnNlcnZlckNvbmZpZ0tleXMsXG4gICAgICAgIC4uLmJ1aWxkQ29uZmlnS2V5cyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjb25maWd1cmF0aW9uczogUmVjb3JkPHN0cmluZywge30+ID0ge307XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBjb25maWd1cmF0aW9uTmFtZXMpIHtcbiAgICAgICAgaWYgKCFzZXJ2ZXJDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcInNlcnZlclwiIHRhcmdldC5gLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYnVpbGRDb25maWdLZXlzW2tleV0pIHtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYFNraXBwZWQgYWRkaW5nIFwiJHtrZXl9XCIgY29uZmlndXJhdGlvbiB0byBcImFwcC1zaGVsbFwiIHRhcmdldCBhcyBpdCdzIG1pc3NpbmcgZnJvbSBcImJ1aWxkXCIgdGFyZ2V0LmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlndXJhdGlvbnNba2V5XSA9IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OmJ1aWxkOiR7a2V5fWAsXG4gICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnByb2plY3R9OnNlcnZlcjoke2tleX1gLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgICAgbmFtZTogJ2FwcC1zaGVsbCcsXG4gICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLkFwcFNoZWxsLFxuICAgICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogY29uZmlndXJhdGlvbnNbJ3Byb2R1Y3Rpb24nXSA/ICdwcm9kdWN0aW9uJyA6IHVuZGVmaW5lZCxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHJvdXRlOiBBUFBfU0hFTExfUk9VVEUsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZFJvdXRlck1vZHVsZShtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsICdSb3V0ZXJNb2R1bGUnLCAnQGFuZ3VsYXIvcm91dGVyJyk7XG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgY2hhbmdlcyk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE1ldGFkYXRhUHJvcGVydHkobWV0YWRhdGE6IHRzLk5vZGUsIHByb3BlcnR5TmFtZTogc3RyaW5nKTogdHMuUHJvcGVydHlBc3NpZ25tZW50IHtcbiAgY29uc3QgcHJvcGVydGllcyA9IChtZXRhZGF0YSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbikucHJvcGVydGllcztcbiAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudCkuZmlsdGVyKChwcm9wKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHByb3AubmFtZTtcbiAgICBzd2l0Y2ggKG5hbWUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAgIHJldHVybiBuYW1lLmdldFRleHQoKSA9PT0gcHJvcGVydHlOYW1lO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgIHJldHVybiBuYW1lLnRleHQgPT09IHByb3BlcnR5TmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pWzBdO1xuXG4gIHJldHVybiBwcm9wZXJ0eTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyUm91dGVzKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICAvLyBUaGUgd29ya3NwYWNlIGdldHMgdXBkYXRlZCBzbyB0aGlzIG5lZWRzIHRvIGJlIHJlbG9hZGVkXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBwcm9qZWN0IG5hbWUgKCR7b3B0aW9ucy5wcm9qZWN0fSlgKTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0U2VydmVyTW9kdWxlUGF0aChob3N0LCBwcm9qZWN0LnNvdXJjZVJvb3QgfHwgJ3NyYycsICdtYWluLnNlcnZlci50cycpO1xuICAgIGlmIChtb2R1bGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignU2VydmVyIG1vZHVsZSBub3QgZm91bmQuJyk7XG4gICAgfVxuXG4gICAgbGV0IG1vZHVsZVNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgaWYgKCFpc0ltcG9ydGVkKG1vZHVsZVNvdXJjZSwgJ1JvdXRlcycsICdAYW5ndWxhci9yb3V0ZXInKSkge1xuICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgY29uc3Qgcm91dGVzQ2hhbmdlID0gaW5zZXJ0SW1wb3J0KG1vZHVsZVNvdXJjZSwgbW9kdWxlUGF0aCwgJ1JvdXRlcycsICdAYW5ndWxhci9yb3V0ZXInKTtcbiAgICAgIGlmIChyb3V0ZXNDaGFuZ2UpIHtcbiAgICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBbcm91dGVzQ2hhbmdlXSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGltcG9ydHMgPSBnZXRTb3VyY2VOb2Rlcyhtb2R1bGVTb3VyY2UpXG4gICAgICAgIC5maWx0ZXIoKG5vZGUpID0+IG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbilcbiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEuZ2V0U3RhcnQoKSAtIGIuZ2V0U3RhcnQoKSk7XG4gICAgICBjb25zdCBpbnNlcnRQb3NpdGlvbiA9IGltcG9ydHNbaW1wb3J0cy5sZW5ndGggLSAxXS5nZXRFbmQoKTtcbiAgICAgIGNvbnN0IHJvdXRlVGV4dCA9IGBcXG5cXG5jb25zdCByb3V0ZXM6IFJvdXRlcyA9IFsgeyBwYXRoOiAnJHtBUFBfU0hFTExfUk9VVEV9JywgY29tcG9uZW50OiBBcHBTaGVsbENvbXBvbmVudCB9XTtgO1xuICAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoaW5zZXJ0UG9zaXRpb24sIHJvdXRlVGV4dCk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgbW9kdWxlU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCAnUm91dGVyTW9kdWxlJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBjb25zdCByb3V0ZXJNb2R1bGVDaGFuZ2UgPSBpbnNlcnRJbXBvcnQoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ1JvdXRlck1vZHVsZScsXG4gICAgICAgICdAYW5ndWxhci9yb3V0ZXInLFxuICAgICAgKTtcblxuICAgICAgaWYgKHJvdXRlck1vZHVsZUNoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXJNb2R1bGVDaGFuZ2VdKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YWRhdGFDaGFuZ2UgPSBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gICAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICAgJ2ltcG9ydHMnLFxuICAgICAgICAnUm91dGVyTW9kdWxlLmZvclJvb3Qocm91dGVzKScsXG4gICAgICApO1xuICAgICAgaWYgKG1ldGFkYXRhQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgbWV0YWRhdGFDaGFuZ2UpO1xuICAgICAgfVxuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkU3RhbmRhbG9uZVNlcnZlclJvdXRlKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke29wdGlvbnMucHJvamVjdH1cIiBkb2Vzbid0IG5vdCBleGlzdC5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4obm9ybWFsaXplKHByb2plY3Quc291cmNlUm9vdCA/PyAnc3JjJyksICdhcHAvYXBwLmNvbmZpZy5zZXJ2ZXIudHMnKTtcbiAgICBpZiAoIWhvc3QuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENhbm5vdCBmaW5kIFwiJHtjb25maWdGaWxlUGF0aH1cIi5gKTtcbiAgICB9XG5cbiAgICBsZXQgY29uZmlnU291cmNlRmlsZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgY29uZmlnRmlsZVBhdGgpO1xuICAgIGlmICghaXNJbXBvcnRlZChjb25maWdTb3VyY2VGaWxlLCAnUk9VVEVTJywgJ0Bhbmd1bGFyL3JvdXRlcicpKSB7XG4gICAgICBjb25zdCByb3V0ZXNDaGFuZ2UgPSBpbnNlcnRJbXBvcnQoXG4gICAgICAgIGNvbmZpZ1NvdXJjZUZpbGUsXG4gICAgICAgIGNvbmZpZ0ZpbGVQYXRoLFxuICAgICAgICAnUk9VVEVTJyxcbiAgICAgICAgJ0Bhbmd1bGFyL3JvdXRlcicsXG4gICAgICApO1xuXG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgaWYgKHJvdXRlc0NoYW5nZSkge1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtyb3V0ZXNDaGFuZ2VdKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbmZpZ1NvdXJjZUZpbGUgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICBjb25zdCBwcm92aWRlcnNMaXRlcmFsID0gZmluZE5vZGVzKGNvbmZpZ1NvdXJjZUZpbGUsIHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KS5maW5kKFxuICAgICAgKG4pID0+IHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihuLmluaXRpYWxpemVyKSAmJiBuLm5hbWUuZ2V0VGV4dCgpID09PSAncHJvdmlkZXJzJyxcbiAgICApPy5pbml0aWFsaXplciBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uIHwgdW5kZWZpbmVkO1xuICAgIGlmICghcHJvdmlkZXJzTGl0ZXJhbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICAgIGBDYW5ub3QgZmluZCB0aGUgXCJwcm92aWRlcnNcIiBjb25maWd1cmF0aW9uIGluIFwiJHtjb25maWdGaWxlUGF0aH1cIi5gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgcm91dGUgdG8gcHJvdmlkZXJzIGxpdGVyYWwuXG4gICAgY29uc3QgbmV3UHJvdmlkZXJzTGl0ZXJhbCA9IHRzLmZhY3RvcnkudXBkYXRlQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwcm92aWRlcnNMaXRlcmFsLCBbXG4gICAgICAuLi5wcm92aWRlcnNMaXRlcmFsLmVsZW1lbnRzLFxuICAgICAgdHMuZmFjdG9yeS5jcmVhdGVPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihcbiAgICAgICAgW1xuICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KCdwcm92aWRlJywgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKCdST1VURVMnKSksXG4gICAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoJ211bHRpJywgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKCd0cnVlJykpLFxuICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgJ3VzZVZhbHVlJyxcbiAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihcbiAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oXG4gICAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgICAgICAgICdwYXRoJyxcbiAgICAgICAgICAgICAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoYCcke0FQUF9TSEVMTF9ST1VURX0nYCksXG4gICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgICAgICAgICAgICdjb21wb25lbnQnLFxuICAgICAgICAgICAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcignQXBwU2hlbGxDb21wb25lbnQnKSxcbiAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIHRydWUsXG4gICAgICAgICAgICApLFxuICAgICAgICAgICksXG4gICAgICAgIF0sXG4gICAgICAgIHRydWUsXG4gICAgICApLFxuICAgIF0pO1xuXG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICByZWNvcmRlci5yZW1vdmUocHJvdmlkZXJzTGl0ZXJhbC5nZXRTdGFydCgpLCBwcm92aWRlcnNMaXRlcmFsLmdldFdpZHRoKCkpO1xuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoXG4gICAgICBwcm92aWRlcnNMaXRlcmFsLmdldFN0YXJ0KCksXG4gICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgbmV3UHJvdmlkZXJzTGl0ZXJhbCwgY29uZmlnU291cmNlRmlsZSksXG4gICAgKTtcblxuICAgIC8vIEFkZCBBcHBTaGVsbENvbXBvbmVudCBpbXBvcnRcbiAgICBjb25zdCBhcHBTaGVsbEltcG9ydENoYW5nZSA9IGluc2VydEltcG9ydChcbiAgICAgIGNvbmZpZ1NvdXJjZUZpbGUsXG4gICAgICBjb25maWdGaWxlUGF0aCxcbiAgICAgICdBcHBTaGVsbENvbXBvbmVudCcsXG4gICAgICAnLi9hcHAtc2hlbGwvYXBwLXNoZWxsLmNvbXBvbmVudCcsXG4gICAgKTtcblxuICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW2FwcFNoZWxsSW1wb3J0Q2hhbmdlXSk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAodHJlZSkgPT4ge1xuICAgIGNvbnN0IGJyb3dzZXJFbnRyeVBvaW50ID0gYXdhaXQgZ2V0TWFpbkZpbGVQYXRoKHRyZWUsIG9wdGlvbnMucHJvamVjdCk7XG4gICAgY29uc3QgaXNTdGFuZGFsb25lID0gaXNTdGFuZGFsb25lQXBwKHRyZWUsIGJyb3dzZXJFbnRyeVBvaW50KTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICB2YWxpZGF0ZVByb2plY3QoYnJvd3NlckVudHJ5UG9pbnQpLFxuICAgICAgc2NoZW1hdGljKCdzZXJ2ZXInLCBvcHRpb25zKSxcbiAgICAgIGFkZEFwcFNoZWxsQ29uZmlnVG9Xb3Jrc3BhY2Uob3B0aW9ucyksXG4gICAgICBpc1N0YW5kYWxvbmUgPyBub29wKCkgOiBhZGRSb3V0ZXJNb2R1bGUoYnJvd3NlckVudHJ5UG9pbnQpLFxuICAgICAgaXNTdGFuZGFsb25lID8gYWRkU3RhbmRhbG9uZVNlcnZlclJvdXRlKG9wdGlvbnMpIDogYWRkU2VydmVyUm91dGVzKG9wdGlvbnMpLFxuICAgICAgc2NoZW1hdGljKCdjb21wb25lbnQnLCB7XG4gICAgICAgIG5hbWU6ICdhcHAtc2hlbGwnLFxuICAgICAgICBtb2R1bGU6ICdhcHAubW9kdWxlLnNlcnZlci50cycsXG4gICAgICAgIHByb2plY3Q6IG9wdGlvbnMucHJvamVjdCxcbiAgICAgICAgc3RhbmRhbG9uZTogaXNTdGFuZGFsb25lLFxuICAgICAgfSksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=