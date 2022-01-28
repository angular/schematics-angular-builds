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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvYXBwLXNoZWxsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUFnRTtBQUNoRSwyREFRb0M7QUFFcEMsa0dBQW9GO0FBQ3BGLG9EQVE4QjtBQUM5Qiw4Q0FBMEQ7QUFDMUQsMERBQTJEO0FBQzNELGdFQUFzRTtBQUN0RSxvREFBcUU7QUFDckUsa0VBQW9HO0FBR3BHLFNBQVMsYUFBYSxDQUFDLElBQVUsRUFBRSxJQUFZO0lBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxrQkFBa0IsSUFBSSxHQUFHLENBQUMsQ0FBQztLQUMxRDtJQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUVoRixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxJQUFVLEVBQUUsVUFBa0IsRUFBRSxRQUFnQjtJQUMzRSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUEsV0FBSSxFQUFDLElBQUEsZ0JBQVMsRUFBQyxVQUFVLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzlFLE1BQU0sUUFBUSxHQUFHLElBQUEsMEJBQWMsRUFBQyxVQUFVLENBQUMsQ0FBQztJQUM1QyxNQUFNLE9BQU8sR0FBRyxRQUFR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QUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBSSxHQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUMxRSw0QkFBNEIsQ0FBQyxPQUFPLENBQUM7WUFDckMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUN4QyxlQUFlLENBQUMsT0FBTyxDQUFDO1lBQ3hCLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztTQUMzQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBdkJELDRCQXVCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBjaGFpbixcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQ29tcG9uZW50T3B0aW9ucyB9IGZyb20gJy4uL2NvbXBvbmVudC9zY2hlbWEnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQge1xuICBhZGRJbXBvcnRUb01vZHVsZSxcbiAgYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhLFxuICBmaW5kTm9kZSxcbiAgZ2V0RGVjb3JhdG9yTWV0YWRhdGEsXG4gIGdldFNvdXJjZU5vZGVzLFxuICBpbnNlcnRJbXBvcnQsXG4gIGlzSW1wb3J0ZWQsXG59IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IGFwcGx5VG9VcGRhdGVSZWNvcmRlciB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGdldEFwcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyT3B0aW9ucywgQnVpbGRlcnMsIFNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBTaGVsbE9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGdldFNvdXJjZUZpbGUoaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwYXRoKTtcbiAgaWYgKCFidWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgJHtwYXRofS5gKTtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VydmVyTW9kdWxlUGF0aChob3N0OiBUcmVlLCBzb3VyY2VSb290OiBzdHJpbmcsIG1haW5QYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWFpblNvdXJjZSA9IGdldFNvdXJjZUZpbGUoaG9zdCwgam9pbihub3JtYWxpemUoc291cmNlUm9vdCksIG1haW5QYXRoKSk7XG4gIGNvbnN0IGFsbE5vZGVzID0gZ2V0U291cmNlTm9kZXMobWFpblNvdXJjZSk7XG4gIGNvbnN0IGV4cE5vZGUgPSBhbGxOb2Rlcy5maW5kKChub2RlKSA9PiB0cy5pc0V4cG9ydERlY2xhcmF0aW9uKG5vZGUpKTtcbiAgaWYgKCFleHBOb2RlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gKGV4cE5vZGUgYXMgdHMuRXhwb3J0RGVjbGFyYXRpb24pLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsO1xuICBjb25zdCBtb2R1bGVQYXRoID0gbm9ybWFsaXplKGAvJHtzb3VyY2VSb290fS8ke3JlbGF0aXZlUGF0aC50ZXh0fS50c2ApO1xuXG4gIHJldHVybiBtb2R1bGVQYXRoO1xufVxuXG5pbnRlcmZhY2UgVGVtcGxhdGVJbmZvIHtcbiAgdGVtcGxhdGVQcm9wPzogdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuICB0ZW1wbGF0ZVVybFByb3A/OiB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQ7XG59XG5cbmZ1bmN0aW9uIGdldENvbXBvbmVudFRlbXBsYXRlSW5mbyhob3N0OiBUcmVlLCBjb21wb25lbnRQYXRoOiBzdHJpbmcpOiBUZW1wbGF0ZUluZm8ge1xuICBjb25zdCBjb21wU291cmNlID0gZ2V0U291cmNlRmlsZShob3N0LCBjb21wb25lbnRQYXRoKTtcbiAgY29uc3QgY29tcE1ldGFkYXRhID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEoY29tcFNvdXJjZSwgJ0NvbXBvbmVudCcsICdAYW5ndWxhci9jb3JlJylbMF07XG5cbiAgcmV0dXJuIHtcbiAgICB0ZW1wbGF0ZVByb3A6IGdldE1ldGFkYXRhUHJvcGVydHkoY29tcE1ldGFkYXRhLCAndGVtcGxhdGUnKSxcbiAgICB0ZW1wbGF0ZVVybFByb3A6IGdldE1ldGFkYXRhUHJvcGVydHkoY29tcE1ldGFkYXRhLCAndGVtcGxhdGVVcmwnKSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q29tcG9uZW50VGVtcGxhdGUoaG9zdDogVHJlZSwgY29tcFBhdGg6IHN0cmluZywgdG1wbEluZm86IFRlbXBsYXRlSW5mbyk6IHN0cmluZyB7XG4gIGxldCB0ZW1wbGF0ZSA9ICcnO1xuXG4gIGlmICh0bXBsSW5mby50ZW1wbGF0ZVByb3ApIHtcbiAgICB0ZW1wbGF0ZSA9IHRtcGxJbmZvLnRlbXBsYXRlUHJvcC5nZXRGdWxsVGV4dCgpO1xuICB9IGVsc2UgaWYgKHRtcGxJbmZvLnRlbXBsYXRlVXJsUHJvcCkge1xuICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gKHRtcGxJbmZvLnRlbXBsYXRlVXJsUHJvcC5pbml0aWFsaXplciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgIGNvbnN0IGRpciA9IGRpcm5hbWUobm9ybWFsaXplKGNvbXBQYXRoKSk7XG4gICAgY29uc3QgdGVtcGxhdGVQYXRoID0gam9pbihkaXIsIHRlbXBsYXRlVXJsKTtcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQodGVtcGxhdGVQYXRoKTtcbiAgICBpZiAoYnVmZmVyKSB7XG4gICAgICB0ZW1wbGF0ZSA9IGJ1ZmZlci50b1N0cmluZygpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0ZW1wbGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9vdHN0cmFwQ29tcG9uZW50UGF0aChob3N0OiBUcmVlLCBtYWluUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbW9kdWxlUGF0aCA9IGdldEFwcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICBjb25zdCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuXG4gIGNvbnN0IG1ldGFkYXRhTm9kZSA9IGdldERlY29yYXRvck1ldGFkYXRhKG1vZHVsZVNvdXJjZSwgJ05nTW9kdWxlJywgJ0Bhbmd1bGFyL2NvcmUnKVswXTtcbiAgY29uc3QgYm9vdHN0cmFwUHJvcGVydHkgPSBnZXRNZXRhZGF0YVByb3BlcnR5KG1ldGFkYXRhTm9kZSwgJ2Jvb3RzdHJhcCcpO1xuXG4gIGNvbnN0IGFyckxpdGVyYWwgPSBib290c3RyYXBQcm9wZXJ0eS5pbml0aWFsaXplciBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uO1xuXG4gIGNvbnN0IGNvbXBvbmVudFN5bWJvbCA9IGFyckxpdGVyYWwuZWxlbWVudHNbMF0uZ2V0VGV4dCgpO1xuXG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IGdldFNvdXJjZU5vZGVzKG1vZHVsZVNvdXJjZSlcbiAgICAuZmlsdGVyKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgLmZpbHRlcigoaW1wKSA9PiB7XG4gICAgICByZXR1cm4gZmluZE5vZGUoaW1wLCB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIsIGNvbXBvbmVudFN5bWJvbCk7XG4gICAgfSlcbiAgICAubWFwKChpbXApID0+IHtcbiAgICAgIGNvbnN0IHBhdGhTdHJpbmdMaXRlcmFsID0gaW1wLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsO1xuXG4gICAgICByZXR1cm4gcGF0aFN0cmluZ0xpdGVyYWwudGV4dDtcbiAgICB9KVswXTtcblxuICByZXR1cm4gam9pbihkaXJuYW1lKG5vcm1hbGl6ZShtb2R1bGVQYXRoKSksIHJlbGF0aXZlUGF0aCArICcudHMnKTtcbn1cbi8vIGVuZCBoZWxwZXIgZnVuY3Rpb25zLlxuXG5mdW5jdGlvbiB2YWxpZGF0ZVByb2plY3QobWFpblBhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCByb3V0ZXJPdXRsZXRDaGVja1JlZ2V4ID0gLzxyb3V0ZXItb3V0bGV0Lio/PihbXFxzXFxTXSo/KTxcXC9yb3V0ZXItb3V0bGV0Pi87XG5cbiAgICBjb25zdCBjb21wb25lbnRQYXRoID0gZ2V0Qm9vdHN0cmFwQ29tcG9uZW50UGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29uc3QgdG1wbCA9IGdldENvbXBvbmVudFRlbXBsYXRlSW5mbyhob3N0LCBjb21wb25lbnRQYXRoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGdldENvbXBvbmVudFRlbXBsYXRlKGhvc3QsIGNvbXBvbmVudFBhdGgsIHRtcGwpO1xuICAgIGlmICghcm91dGVyT3V0bGV0Q2hlY2tSZWdleC50ZXN0KHRlbXBsYXRlKSkge1xuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgUHJlcmVxdWlzaXRlIGZvciBhcHAgc2hlbGwgaXMgdG8gZGVmaW5lIGEgcm91dGVyLW91dGxldCBpbiB5b3VyIHJvb3QgY29tcG9uZW50LmA7XG4gICAgICBjb250ZXh0LmxvZ2dlci5lcnJvcihlcnJvck1zZyk7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihlcnJvck1zZyk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRVbml2ZXJzYWxUYXJnZXQob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgLy8gQ29weSBvcHRpb25zLlxuICAgIGNvbnN0IHVuaXZlcnNhbE9wdGlvbnMgPSB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgIH07XG5cbiAgICAvLyBEZWxldGUgbm9uLXVuaXZlcnNhbCBvcHRpb25zLlxuICAgIGRlbGV0ZSB1bml2ZXJzYWxPcHRpb25zLnJvdXRlO1xuXG4gICAgcmV0dXJuIHNjaGVtYXRpYygndW5pdmVyc2FsJywgdW5pdmVyc2FsT3B0aW9ucyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEFwcFNoZWxsQ29uZmlnVG9Xb3Jrc3BhY2Uob3B0aW9uczogQXBwU2hlbGxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdCwgY29udGV4dCkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5yb3V0ZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFJvdXRlIGlzIG5vdCBkZWZpbmVkYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVmFsaWRhdGlvbiBvZiB0YXJnZXRzIGlzIGhhbmRsZWQgYWxyZWFkeSBpbiB0aGUgbWFpbiBmdW5jdGlvbi5cbiAgICAgIC8vIER1cGxpY2F0ZSBrZXlzIG1lYW5zIHRoYXQgd2UgaGF2ZSBjb25maWd1cmF0aW9ucyBpbiBib3RoIHNlcnZlciBhbmQgYnVpbGQgYnVpbGRlcnMuXG4gICAgICBjb25zdCBzZXJ2ZXJDb25maWdLZXlzID0gcHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJyk/LmNvbmZpZ3VyYXRpb25zID8/IHt9O1xuICAgICAgY29uc3QgYnVpbGRDb25maWdLZXlzID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKT8uY29uZmlndXJhdGlvbnMgPz8ge307XG5cbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25OYW1lcyA9IE9iamVjdC5rZXlzKHtcbiAgICAgICAgLi4uc2VydmVyQ29uZmlnS2V5cyxcbiAgICAgICAgLi4uYnVpbGRDb25maWdLZXlzLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNvbmZpZ3VyYXRpb25zOiBSZWNvcmQ8c3RyaW5nLCB7fT4gPSB7fTtcbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIGNvbmZpZ3VyYXRpb25OYW1lcykge1xuICAgICAgICBpZiAoIXNlcnZlckNvbmZpZ0tleXNba2V5XSkge1xuICAgICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgU2tpcHBlZCBhZGRpbmcgXCIke2tleX1cIiBjb25maWd1cmF0aW9uIHRvIFwiYXBwLXNoZWxsXCIgdGFyZ2V0IGFzIGl0J3MgbWlzc2luZyBmcm9tIFwic2VydmVyXCIgdGFyZ2V0LmAsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFidWlsZENvbmZpZ0tleXNba2V5XSkge1xuICAgICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgU2tpcHBlZCBhZGRpbmcgXCIke2tleX1cIiBjb25maWd1cmF0aW9uIHRvIFwiYXBwLXNoZWxsXCIgdGFyZ2V0IGFzIGl0J3MgbWlzc2luZyBmcm9tIFwiYnVpbGRcIiB0YXJnZXQuYCxcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25maWd1cmF0aW9uc1trZXldID0ge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke29wdGlvbnMucHJvamVjdH06YnVpbGQ6JHtrZXl9YCxcbiAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucHJvamVjdH06c2VydmVyOiR7a2V5fWAsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgICBuYW1lOiAnYXBwLXNoZWxsJyxcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuQXBwU2hlbGwsXG4gICAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiBjb25maWd1cmF0aW9uc1sncHJvZHVjdGlvbiddID8gJ3Byb2R1Y3Rpb24nIDogdW5kZWZpbmVkLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgcm91dGU6IG9wdGlvbnMucm91dGUsXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ3VyYXRpb25zLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZFJvdXRlck1vZHVsZShtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGNoYW5nZXMgPSBhZGRJbXBvcnRUb01vZHVsZShtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsICdSb3V0ZXJNb2R1bGUnLCAnQGFuZ3VsYXIvcm91dGVyJyk7XG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgY2hhbmdlcyk7XG4gICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldE1ldGFkYXRhUHJvcGVydHkobWV0YWRhdGE6IHRzLk5vZGUsIHByb3BlcnR5TmFtZTogc3RyaW5nKTogdHMuUHJvcGVydHlBc3NpZ25tZW50IHtcbiAgY29uc3QgcHJvcGVydGllcyA9IChtZXRhZGF0YSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbikucHJvcGVydGllcztcbiAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudCkuZmlsdGVyKChwcm9wKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHByb3AubmFtZTtcbiAgICBzd2l0Y2ggKG5hbWUua2luZCkge1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAgIHJldHVybiBuYW1lLmdldFRleHQoKSA9PT0gcHJvcGVydHlOYW1lO1xuICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgIHJldHVybiBuYW1lLnRleHQgPT09IHByb3BlcnR5TmFtZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pWzBdO1xuXG4gIHJldHVybiBwcm9wZXJ0eTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyUm91dGVzKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICAvLyBUaGUgd29ya3NwYWNlIGdldHMgdXBkYXRlZCBzbyB0aGlzIG5lZWRzIHRvIGJlIHJlbG9hZGVkXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFjbGllbnRQcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuaXZlcnNhbCBzY2hlbWF0aWMgcmVtb3ZlZCBjbGllbnQgcHJvamVjdC4nKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50U2VydmVyVGFyZ2V0ID0gY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJyk7XG4gICAgaWYgKCFjbGllbnRTZXJ2ZXJUYXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5pdmVyc2FsIHNjaGVtYXRpYyBkaWQgbm90IGFkZCBzZXJ2ZXIgdGFyZ2V0IHRvIGNsaWVudCBwcm9qZWN0LicpO1xuICAgIH1cbiAgICBjb25zdCBjbGllbnRTZXJ2ZXJPcHRpb25zID0gY2xpZW50U2VydmVyVGFyZ2V0Lm9wdGlvbnMgYXMgdW5rbm93biBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucztcbiAgICBpZiAoIWNsaWVudFNlcnZlck9wdGlvbnMpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdTZXJ2ZXIgdGFyZ2V0IGRvZXMgbm90IGNvbnRhaW4gb3B0aW9ucy4nKTtcbiAgICB9XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGdldFNlcnZlck1vZHVsZVBhdGgoXG4gICAgICBob3N0LFxuICAgICAgY2xpZW50UHJvamVjdC5zb3VyY2VSb290IHx8ICdzcmMnLFxuICAgICAgb3B0aW9ucy5tYWluIGFzIHN0cmluZyxcbiAgICApO1xuICAgIGlmIChtb2R1bGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignVW5pdmVyc2FsL3NlcnZlciBtb2R1bGUgbm90IGZvdW5kLicpO1xuICAgIH1cblxuICAgIGxldCBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsICdSb3V0ZXMnLCAnQGFuZ3VsYXIvcm91dGVyJykpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGNvbnN0IHJvdXRlc0NoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsICdSb3V0ZXMnLCAnQGFuZ3VsYXIvcm91dGVyJyk7XG4gICAgICBpZiAocm91dGVzQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW3JvdXRlc0NoYW5nZV0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbXBvcnRzID0gZ2V0U291cmNlTm9kZXMobW9kdWxlU291cmNlKVxuICAgICAgICAuZmlsdGVyKChub2RlKSA9PiBub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBhLmdldFN0YXJ0KCkgLSBiLmdldFN0YXJ0KCkpO1xuICAgICAgY29uc3QgaW5zZXJ0UG9zaXRpb24gPSBpbXBvcnRzW2ltcG9ydHMubGVuZ3RoIC0gMV0uZ2V0RW5kKCk7XG4gICAgICBjb25zdCByb3V0ZVRleHQgPSBgXFxuXFxuY29uc3Qgcm91dGVzOiBSb3V0ZXMgPSBbIHsgcGF0aDogJyR7b3B0aW9ucy5yb3V0ZX0nLCBjb21wb25lbnQ6IEFwcFNoZWxsQ29tcG9uZW50IH1dO2A7XG4gICAgICByZWNvcmRlci5pbnNlcnRSaWdodChpbnNlcnRQb3NpdGlvbiwgcm91dGVUZXh0KTtcbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICB9XG5cbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsICdSb3V0ZXJNb2R1bGUnLCAnQGFuZ3VsYXIvcm91dGVyJykpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGNvbnN0IHJvdXRlck1vZHVsZUNoYW5nZSA9IGluc2VydEltcG9ydChcbiAgICAgICAgbW9kdWxlU291cmNlLFxuICAgICAgICBtb2R1bGVQYXRoLFxuICAgICAgICAnUm91dGVyTW9kdWxlJyxcbiAgICAgICAgJ0Bhbmd1bGFyL3JvdXRlcicsXG4gICAgICApO1xuXG4gICAgICBpZiAocm91dGVyTW9kdWxlQ2hhbmdlKSB7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW3JvdXRlck1vZHVsZUNoYW5nZV0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRhZGF0YUNoYW5nZSA9IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShcbiAgICAgICAgbW9kdWxlU291cmNlLFxuICAgICAgICBtb2R1bGVQYXRoLFxuICAgICAgICAnaW1wb3J0cycsXG4gICAgICAgICdSb3V0ZXJNb2R1bGUuZm9yUm9vdChyb3V0ZXMpJyxcbiAgICAgICk7XG4gICAgICBpZiAobWV0YWRhdGFDaGFuZ2UpIHtcbiAgICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBtZXRhZGF0YUNoYW5nZSk7XG4gICAgICB9XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRTaGVsbENvbXBvbmVudChvcHRpb25zOiBBcHBTaGVsbE9wdGlvbnMpOiBSdWxlIHtcbiAgY29uc3QgY29tcG9uZW50T3B0aW9uczogQ29tcG9uZW50T3B0aW9ucyA9IHtcbiAgICBuYW1lOiAnYXBwLXNoZWxsJyxcbiAgICBtb2R1bGU6IG9wdGlvbnMucm9vdE1vZHVsZUZpbGVOYW1lLFxuICAgIHByb2plY3Q6IG9wdGlvbnMucHJvamVjdCxcbiAgfTtcblxuICByZXR1cm4gc2NoZW1hdGljKCdjb21wb25lbnQnLCBjb21wb25lbnRPcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEFwcFNoZWxsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKHRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gICAgY29uc3QgY2xpZW50UHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIWNsaWVudFByb2plY3QgfHwgY2xpZW50UHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQSBjbGllbnQgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIiBpcyByZXF1aXJlZC5gKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50QnVpbGRUYXJnZXQgPSBjbGllbnRQcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghY2xpZW50QnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvcigpO1xuICAgIH1cbiAgICBjb25zdCBjbGllbnRCdWlsZE9wdGlvbnMgPSAoY2xpZW50QnVpbGRUYXJnZXQub3B0aW9ucyB8fFxuICAgICAge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIHZhbGlkYXRlUHJvamVjdChjbGllbnRCdWlsZE9wdGlvbnMubWFpbiksXG4gICAgICBjbGllbnRQcm9qZWN0LnRhcmdldHMuaGFzKCdzZXJ2ZXInKSA/IG5vb3AoKSA6IGFkZFVuaXZlcnNhbFRhcmdldChvcHRpb25zKSxcbiAgICAgIGFkZEFwcFNoZWxsQ29uZmlnVG9Xb3Jrc3BhY2Uob3B0aW9ucyksXG4gICAgICBhZGRSb3V0ZXJNb2R1bGUoY2xpZW50QnVpbGRPcHRpb25zLm1haW4pLFxuICAgICAgYWRkU2VydmVyUm91dGVzKG9wdGlvbnMpLFxuICAgICAgYWRkU2hlbGxDb21wb25lbnQob3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=