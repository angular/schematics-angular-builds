"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const ts = require("../third_party/github.com/Microsoft/TypeScript/lib/typescript");
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const config_1 = require("../utility/config");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_1 = require("../utility/project");
const project_targets_1 = require("../utility/project-targets");
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
function getServerModulePath(host, project, architect) {
    const mainPath = architect.server.options.main;
    const mainSource = getSourceFile(host, mainPath);
    const allNodes = ast_utils_1.getSourceNodes(mainSource);
    const expNode = allNodes.filter(node => node.kind === ts.SyntaxKind.ExportDeclaration)[0];
    if (!expNode) {
        return null;
    }
    const relativePath = expNode.moduleSpecifier;
    const modulePath = core_1.normalize(`/${project.root}/src/${relativePath.text}.ts`);
    return modulePath;
}
function getComponentTemplateInfo(host, componentPath) {
    const compSource = getSourceFile(host, componentPath);
    const compMetadata = ast_utils_1.getDecoratorMetadata(compSource, 'Component', '@angular/core')[0];
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
        const dir = core_1.dirname(core_1.normalize(compPath));
        const templatePath = core_1.join(dir, templateUrl);
        const buffer = host.read(templatePath);
        if (buffer) {
            template = buffer.toString();
        }
    }
    return template;
}
function getBootstrapComponentPath(host, project) {
    const projectTargets = project_targets_1.getProjectTargets(project);
    if (!projectTargets.build) {
        throw project_targets_1.targetBuildNotFoundError();
    }
    const mainPath = projectTargets.build.options.main;
    const modulePath = ng_ast_utils_1.getAppModulePath(host, mainPath);
    const moduleSource = getSourceFile(host, modulePath);
    const metadataNode = ast_utils_1.getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
    const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');
    const arrLiteral = bootstrapProperty
        .initializer;
    const componentSymbol = arrLiteral.elements[0].getText();
    const relativePath = ast_utils_1.getSourceNodes(moduleSource)
        .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
        .filter(imp => {
        return ast_utils_1.findNode(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
        .map((imp) => {
        const pathStringLiteral = imp.moduleSpecifier;
        return pathStringLiteral.text;
    })[0];
    return core_1.join(core_1.dirname(core_1.normalize(modulePath)), relativePath + '.ts');
}
// end helper functions.
function validateProject(options) {
    return (host, context) => {
        const routerOutletCheckRegex = /<router\-outlet.*?>([\s\S]*?)<\/router\-outlet>/;
        const clientProject = project_1.getProject(host, options.clientProject);
        if (clientProject.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`App shell requires a project type of "application".`);
        }
        const componentPath = getBootstrapComponentPath(host, clientProject);
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
    return (host, context) => {
        const architect = project_targets_1.getProjectTargets(host, options.clientProject);
        if (architect.server) {
            return host;
        }
        // Copy options.
        const universalOptions = {
            ...options,
        };
        // Delete non-universal options.
        delete universalOptions.universalProject;
        delete universalOptions.route;
        delete universalOptions.name;
        delete universalOptions.outDir;
        delete universalOptions.root;
        delete universalOptions.index;
        delete universalOptions.sourceDir;
        return schematics_1.schematic('universal', universalOptions);
    };
}
function addAppShellConfigToWorkspace(options) {
    return (host) => {
        if (!options.route) {
            throw new schematics_1.SchematicsException(`Route is not defined`);
        }
        const workspace = config_1.getWorkspace(host);
        const projectTargets = project_targets_1.getProjectTargets(workspace, options.clientProject);
        projectTargets['app-shell'] = {
            builder: workspace_models_1.Builders.AppShell,
            options: {
                browserTarget: `${options.clientProject}:build`,
                serverTarget: `${options.clientProject}:server`,
                route: options.route,
            },
            configurations: {
                production: {
                    browserTarget: `${options.clientProject}:build:production`,
                    serverTarget: `${options.clientProject}:server:production`,
                },
            },
        };
        return config_1.updateWorkspace(workspace);
    };
}
function addRouterModule(options) {
    return (host) => {
        const projectTargets = project_targets_1.getProjectTargets(host, options.clientProject);
        if (!projectTargets.build) {
            throw project_targets_1.targetBuildNotFoundError();
        }
        const mainPath = projectTargets.build.options.main;
        const modulePath = ng_ast_utils_1.getAppModulePath(host, mainPath);
        const moduleSource = getSourceFile(host, modulePath);
        const changes = ast_utils_1.addImportToModule(moduleSource, modulePath, 'RouterModule', '@angular/router');
        const recorder = host.beginUpdate(modulePath);
        changes.forEach((change) => {
            if (change instanceof change_1.InsertChange) {
                recorder.insertLeft(change.pos, change.toAdd);
            }
        });
        host.commitUpdate(recorder);
        return host;
    };
}
function getMetadataProperty(metadata, propertyName) {
    const properties = metadata.properties;
    const property = properties
        .filter(prop => prop.kind === ts.SyntaxKind.PropertyAssignment)
        .filter((prop) => {
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
    return (host) => {
        const clientProject = project_1.getProject(host, options.clientProject);
        const architect = project_targets_1.getProjectTargets(clientProject);
        // const mainPath = universalArchitect.build.options.main;
        const modulePath = getServerModulePath(host, clientProject, architect);
        if (modulePath === null) {
            throw new schematics_1.SchematicsException('Universal/server module not found.');
        }
        let moduleSource = getSourceFile(host, modulePath);
        if (!ast_utils_1.isImported(moduleSource, 'Routes', '@angular/router')) {
            const recorder = host.beginUpdate(modulePath);
            const routesChange = ast_utils_1.insertImport(moduleSource, modulePath, 'Routes', '@angular/router');
            if (routesChange.toAdd) {
                recorder.insertLeft(routesChange.pos, routesChange.toAdd);
            }
            const imports = ast_utils_1.getSourceNodes(moduleSource)
                .filter(node => node.kind === ts.SyntaxKind.ImportDeclaration)
                .sort((a, b) => a.getStart() - b.getStart());
            const insertPosition = imports[imports.length - 1].getEnd();
            const routeText = `\n\nconst routes: Routes = [ { path: '${options.route}', component: AppShellComponent }];`;
            recorder.insertRight(insertPosition, routeText);
            host.commitUpdate(recorder);
        }
        moduleSource = getSourceFile(host, modulePath);
        if (!ast_utils_1.isImported(moduleSource, 'RouterModule', '@angular/router')) {
            const recorder = host.beginUpdate(modulePath);
            const routerModuleChange = ast_utils_1.insertImport(moduleSource, modulePath, 'RouterModule', '@angular/router');
            if (routerModuleChange.toAdd) {
                recorder.insertLeft(routerModuleChange.pos, routerModuleChange.toAdd);
            }
            const metadataChange = ast_utils_1.addSymbolToNgModuleMetadata(moduleSource, modulePath, 'imports', 'RouterModule.forRoot(routes)');
            if (metadataChange) {
                metadataChange.forEach((change) => {
                    recorder.insertRight(change.pos, change.toAdd);
                });
            }
            host.commitUpdate(recorder);
        }
        return host;
    };
}
function addShellComponent(options) {
    const componentOptions = {
        name: 'app-shell',
        module: options.rootModuleFileName,
        project: options.clientProject,
    };
    return schematics_1.schematic('component', componentOptions);
}
function default_1(options) {
    return schematics_1.chain([
        validateProject(options),
        addUniversalTarget(options),
        addAppShellConfigToWorkspace(options),
        addRouterModule(options),
        addServerRoutes(options),
        addShellComponent(options),
    ]);
}
exports.default = default_1;
