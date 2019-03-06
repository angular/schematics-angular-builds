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
const tasks_1 = require("@angular-devkit/schematics/tasks");
const ts = require("../third_party/github.com/Microsoft/TypeScript/lib/typescript");
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_1 = require("../utility/project");
const project_targets_1 = require("../utility/project-targets");
const workspace_models_1 = require("../utility/workspace-models");
function getFileReplacements(target) {
    const fileReplacements = target.build &&
        target.build.configurations &&
        target.build.configurations.production &&
        target.build.configurations.production.fileReplacements;
    return fileReplacements || [];
}
function updateConfigFile(options, tsConfigDirectory) {
    return (host) => {
        const workspace = config_1.getWorkspace(host);
        const clientProject = project_1.getProject(workspace, options.clientProject);
        const projectTargets = project_targets_1.getProjectTargets(clientProject);
        projectTargets.server = {
            builder: workspace_models_1.Builders.Server,
            options: {
                outputPath: `dist/${options.clientProject}-server`,
                main: `${clientProject.root}src/main.server.ts`,
                tsConfig: core_1.join(tsConfigDirectory, `${options.tsconfigFileName}.json`),
            },
            configurations: {
                production: {
                    fileReplacements: getFileReplacements(projectTargets),
                    sourceMap: false,
                    optimization: {
                        scripts: false,
                        styles: true,
                    },
                },
            },
        };
        return config_1.updateWorkspace(workspace);
    };
}
function findBrowserModuleImport(host, modulePath) {
    const moduleBuffer = host.read(modulePath);
    if (!moduleBuffer) {
        throw new schematics_1.SchematicsException(`Module file (${modulePath}) not found`);
    }
    const moduleFileText = moduleBuffer.toString('utf-8');
    const source = ts.createSourceFile(modulePath, moduleFileText, ts.ScriptTarget.Latest, true);
    const decoratorMetadata = ast_utils_1.getDecoratorMetadata(source, 'NgModule', '@angular/core')[0];
    const browserModuleNode = ast_utils_1.findNode(decoratorMetadata, ts.SyntaxKind.Identifier, 'BrowserModule');
    if (browserModuleNode === null) {
        throw new schematics_1.SchematicsException(`Cannot find BrowserModule import in ${modulePath}`);
    }
    return browserModuleNode;
}
function wrapBootstrapCall(options) {
    return (host) => {
        const clientTargets = project_targets_1.getProjectTargets(host, options.clientProject);
        if (!clientTargets.build) {
            throw project_targets_1.targetBuildNotFoundError();
        }
        const mainPath = core_1.normalize('/' + clientTargets.build.options.main);
        let bootstrapCall = ng_ast_utils_1.findBootstrapModuleCall(host, mainPath);
        if (bootstrapCall === null) {
            throw new schematics_1.SchematicsException('Bootstrap module not found.');
        }
        let bootstrapCallExpression = null;
        let currentCall = bootstrapCall;
        while (bootstrapCallExpression === null && currentCall.parent) {
            currentCall = currentCall.parent;
            if (ts.isExpressionStatement(currentCall) || ts.isVariableStatement(currentCall)) {
                bootstrapCallExpression = currentCall;
            }
        }
        bootstrapCall = currentCall;
        // In case the bootstrap code is a variable statement
        // we need to determine it's usage
        if (bootstrapCallExpression && ts.isVariableStatement(bootstrapCallExpression)) {
            const declaration = bootstrapCallExpression.declarationList.declarations[0];
            const bootstrapVar = declaration.name.text;
            const sf = bootstrapCallExpression.getSourceFile();
            bootstrapCall = findCallExpressionNode(sf, bootstrapVar) || currentCall;
        }
        // indent contents
        const triviaWidth = bootstrapCall.getLeadingTriviaWidth();
        const beforeText = `document.addEventListener('DOMContentLoaded', () => {\n`
            + ' '.repeat(triviaWidth > 2 ? triviaWidth + 1 : triviaWidth);
        const afterText = `\n${triviaWidth > 2 ? ' '.repeat(triviaWidth - 1) : ''}});`;
        // in some cases we need to cater for a trailing semicolon such as;
        // bootstrap().catch(err => console.log(err));
        const lastToken = bootstrapCall.parent.getLastToken();
        let endPos = bootstrapCall.getEnd();
        if (lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken) {
            endPos = lastToken.getEnd();
        }
        const recorder = host.beginUpdate(mainPath);
        recorder.insertLeft(bootstrapCall.getStart(), beforeText);
        recorder.insertRight(endPos, afterText);
        host.commitUpdate(recorder);
    };
}
function findCallExpressionNode(node, text) {
    if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === text) {
        return node;
    }
    let foundNode = null;
    ts.forEachChild(node, childNode => {
        foundNode = findCallExpressionNode(childNode, text);
        if (foundNode) {
            return true;
        }
    });
    return foundNode;
}
function addServerTransition(options) {
    return (host) => {
        const clientProject = project_1.getProject(host, options.clientProject);
        const clientTargets = project_targets_1.getProjectTargets(clientProject);
        if (!clientTargets.build) {
            throw project_targets_1.targetBuildNotFoundError();
        }
        const mainPath = core_1.normalize('/' + clientTargets.build.options.main);
        const bootstrapModuleRelativePath = ng_ast_utils_1.findBootstrapModulePath(host, mainPath);
        const bootstrapModulePath = core_1.normalize(`/${clientProject.root}/src/${bootstrapModuleRelativePath}.ts`);
        const browserModuleImport = findBrowserModuleImport(host, bootstrapModulePath);
        const appId = options.appId;
        const transitionCall = `.withServerTransition({ appId: '${appId}' })`;
        const position = browserModuleImport.pos + browserModuleImport.getFullText().length;
        const transitionCallChange = new change_1.InsertChange(bootstrapModulePath, position, transitionCall);
        const transitionCallRecorder = host.beginUpdate(bootstrapModulePath);
        transitionCallRecorder.insertLeft(transitionCallChange.pos, transitionCallChange.toAdd);
        host.commitUpdate(transitionCallRecorder);
    };
}
function addDependencies() {
    return (host) => {
        const coreDep = dependencies_1.getPackageJsonDependency(host, '@angular/core');
        if (coreDep === null) {
            throw new schematics_1.SchematicsException('Could not find version.');
        }
        const platformServerDep = Object.assign({}, coreDep, { name: '@angular/platform-server' });
        const httpDep = Object.assign({}, coreDep, { name: '@angular/http' });
        dependencies_1.addPackageJsonDependency(host, platformServerDep);
        dependencies_1.addPackageJsonDependency(host, httpDep);
        return host;
    };
}
function getTsConfigOutDir(host, targets) {
    const tsConfigPath = targets.build.options.tsConfig;
    const tsConfigBuffer = host.read(tsConfigPath);
    if (!tsConfigBuffer) {
        throw new schematics_1.SchematicsException(`Could not read ${tsConfigPath}`);
    }
    const tsConfigContent = tsConfigBuffer.toString();
    const tsConfig = core_1.parseJson(tsConfigContent);
    if (tsConfig === null || typeof tsConfig !== 'object' || Array.isArray(tsConfig) ||
        tsConfig.compilerOptions === null || typeof tsConfig.compilerOptions !== 'object' ||
        Array.isArray(tsConfig.compilerOptions)) {
        throw new schematics_1.SchematicsException(`Invalid tsconfig - ${tsConfigPath}`);
    }
    const outDir = tsConfig.compilerOptions.outDir;
    return outDir;
}
function default_1(options) {
    return (host, context) => {
        const clientProject = project_1.getProject(host, options.clientProject);
        if (clientProject.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Universal requires a project type of "application".`);
        }
        const clientTargets = project_targets_1.getProjectTargets(clientProject);
        const outDir = getTsConfigOutDir(host, clientTargets);
        if (!clientTargets.build) {
            throw project_targets_1.targetBuildNotFoundError();
        }
        const clientTsConfig = core_1.normalize(clientTargets.build.options.tsConfig);
        const tsConfigExtends = core_1.basename(clientTsConfig);
        // this is needed because prior to version 8, tsconfig might have been in 'src'
        // and we don't want to break the 'ng add @nguniversal/express-engine schematics'
        const rootInSrc = clientProject.root === '' && clientTsConfig.includes('src/');
        const tsConfigDirectory = core_1.join(core_1.normalize(clientProject.root), rootInSrc ? 'src' : '');
        if (!options.skipInstall) {
            context.addTask(new tasks_1.NodePackageInstallTask());
        }
        const templateSource = schematics_1.apply(schematics_1.url('./files/src'), [
            schematics_1.applyTemplates(Object.assign({}, core_1.strings, options, { stripTsExtension: (s) => s.replace(/\.ts$/, '') })),
            schematics_1.move(core_1.join(core_1.normalize(clientProject.root), 'src')),
        ]);
        const rootSource = schematics_1.apply(schematics_1.url('./files/root'), [
            schematics_1.applyTemplates(Object.assign({}, core_1.strings, options, { stripTsExtension: (s) => s.replace(/\.ts$/, ''), outDir,
                tsConfigExtends,
                rootInSrc })),
            schematics_1.move(tsConfigDirectory),
        ]);
        return schematics_1.chain([
            schematics_1.mergeWith(templateSource),
            schematics_1.mergeWith(rootSource),
            addDependencies(),
            updateConfigFile(options, tsConfigDirectory),
            wrapBootstrapCall(options),
            addServerTransition(options),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91bml2ZXJzYWwvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FROEI7QUFDOUIsMkRBV29DO0FBQ3BDLDREQUUwQztBQUMxQyxvRkFBb0Y7QUFDcEYsb0RBQXNFO0FBQ3RFLDhDQUFpRDtBQUNqRCw4Q0FBa0U7QUFDbEUsMERBQTZGO0FBQzdGLDBEQUEyRjtBQUMzRixnREFBZ0Q7QUFDaEQsZ0VBQXlGO0FBQ3pGLGtFQUF5RTtBQUl6RSxTQUFTLG1CQUFtQixDQUFDLE1BQXdCO0lBQ25ELE1BQU0sZ0JBQWdCLEdBQ3BCLE1BQU0sQ0FBQyxLQUFLO1FBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjO1FBQzNCLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVU7UUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDO0lBRTFELE9BQU8sZ0JBQWdCLElBQUksRUFBRSxDQUFDO0FBQ2hDLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE9BQXlCLEVBQUUsaUJBQXVCO0lBQzFFLE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixNQUFNLFNBQVMsR0FBRyxxQkFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLG9CQUFVLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNuRSxNQUFNLGNBQWMsR0FBRyxtQ0FBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUV4RCxjQUFjLENBQUMsTUFBTSxHQUFHO1lBQ3RCLE9BQU8sRUFBRSwyQkFBUSxDQUFDLE1BQU07WUFDeEIsT0FBTyxFQUFFO2dCQUNQLFVBQVUsRUFBRSxRQUFRLE9BQU8sQ0FBQyxhQUFhLFNBQVM7Z0JBQ2xE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LG1CQUNULGNBQU8sRUFDUCxPQUFpQixJQUNwQixnQkFBZ0IsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQ3ZEO1lBQ0YsaUJBQUksQ0FBQyxXQUFJLENBQUMsZ0JBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDakQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsa0JBQUssQ0FBQyxnQkFBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQzVDLDJCQUFjLG1CQUNULGNBQU8sRUFDUCxPQUFpQixJQUNwQixnQkFBZ0IsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLEVBQ3ZELE1BQU07Z0JBQ04sZUFBZTtnQkFDZixTQUFTLElBQ1Q7WUFDRixpQkFBSSxDQUFDLGlCQUFpQixDQUFDO1NBQ3hCLENBQUMsQ0FBQztRQUVILE9BQU8sa0JBQUssQ0FBQztZQUNYLHNCQUFTLENBQUMsY0FBYyxDQUFDO1lBQ3pCLHNCQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3JCLGVBQWUsRUFBRTtZQUNqQixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUM7WUFDNUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1lBQzFCLG1CQUFtQixDQUFDLE9BQU8sQ0FBQztTQUM3QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBckRELDRCQXFEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFBhdGgsXG4gIGJhc2VuYW1lLFxuICBleHBlcmltZW50YWwsXG4gIGpvaW4sXG4gIG5vcm1hbGl6ZSxcbiAgcGFyc2VKc29uLFxuICBzdHJpbmdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHtcbiAgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBmaW5kTm9kZSwgZ2V0RGVjb3JhdG9yTWV0YWRhdGEgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSwgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgZmluZEJvb3RzdHJhcE1vZHVsZUNhbGwsIGZpbmRCb290c3RyYXBNb2R1bGVQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdCB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdCc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0VGFyZ2V0cywgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFdvcmtzcGFjZVRhcmdldHMgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFVuaXZlcnNhbE9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuZnVuY3Rpb24gZ2V0RmlsZVJlcGxhY2VtZW50cyh0YXJnZXQ6IFdvcmtzcGFjZVRhcmdldHMpIHtcbiAgY29uc3QgZmlsZVJlcGxhY2VtZW50cyA9XG4gICAgdGFyZ2V0LmJ1aWxkICYmXG4gICAgdGFyZ2V0LmJ1aWxkLmNvbmZpZ3VyYXRpb25zICYmXG4gICAgdGFyZ2V0LmJ1aWxkLmNvbmZpZ3VyYXRpb25zLnByb2R1Y3Rpb24gJiZcbiAgICB0YXJnZXQuYnVpbGQuY29uZmlndXJhdGlvbnMucHJvZHVjdGlvbi5maWxlUmVwbGFjZW1lbnRzO1xuXG4gIHJldHVybiBmaWxlUmVwbGFjZW1lbnRzIHx8IFtdO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFVuaXZlcnNhbE9wdGlvbnMsIHRzQ29uZmlnRGlyZWN0b3J5OiBQYXRoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gZ2V0UHJvamVjdCh3b3Jrc3BhY2UsIG9wdGlvbnMuY2xpZW50UHJvamVjdCk7XG4gICAgY29uc3QgcHJvamVjdFRhcmdldHMgPSBnZXRQcm9qZWN0VGFyZ2V0cyhjbGllbnRQcm9qZWN0KTtcblxuICAgIHByb2plY3RUYXJnZXRzLnNlcnZlciA9IHtcbiAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlNlcnZlcixcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0UGF0aDogYGRpc3QvJHtvcHRpb25zLmNsaWVudFByb2plY3R9LXNlcnZlcmAsXG4gICAgICAgIG1haW46IGAke2NsaWVudFByb2plY3Qucm9vdH1zcmMvbWFpbi5zZXJ2ZXIudHNgLFxuICAgICAgICB0c0NvbmZpZzogam9pbih0c0NvbmZpZ0RpcmVjdG9yeSwgYCR7b3B0aW9ucy50c2NvbmZpZ0ZpbGVOYW1lfS5qc29uYCksXG4gICAgICB9LFxuICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IGdldEZpbGVSZXBsYWNlbWVudHMocHJvamVjdFRhcmdldHMpLFxuICAgICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXG4gICAgICAgICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICAgICAgICBzY3JpcHRzOiBmYWxzZSxcbiAgICAgICAgICAgIHN0eWxlczogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSh3b3Jrc3BhY2UpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBmaW5kQnJvd3Nlck1vZHVsZUltcG9ydChob3N0OiBUcmVlLCBtb2R1bGVQYXRoOiBzdHJpbmcpOiB0cy5Ob2RlIHtcbiAgY29uc3QgbW9kdWxlQnVmZmVyID0gaG9zdC5yZWFkKG1vZHVsZVBhdGgpO1xuICBpZiAoIW1vZHVsZUJ1ZmZlcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBNb2R1bGUgZmlsZSAoJHttb2R1bGVQYXRofSkgbm90IGZvdW5kYCk7XG4gIH1cbiAgY29uc3QgbW9kdWxlRmlsZVRleHQgPSBtb2R1bGVCdWZmZXIudG9TdHJpbmcoJ3V0Zi04Jyk7XG5cbiAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShtb2R1bGVQYXRoLCBtb2R1bGVGaWxlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgY29uc3QgZGVjb3JhdG9yTWV0YWRhdGEgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShzb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJylbMF07XG4gIGNvbnN0IGJyb3dzZXJNb2R1bGVOb2RlID0gZmluZE5vZGUoZGVjb3JhdG9yTWV0YWRhdGEsIHRzLlN5bnRheEtpbmQuSWRlbnRpZmllciwgJ0Jyb3dzZXJNb2R1bGUnKTtcblxuICBpZiAoYnJvd3Nlck1vZHVsZU5vZGUgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgQnJvd3Nlck1vZHVsZSBpbXBvcnQgaW4gJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIGJyb3dzZXJNb2R1bGVOb2RlO1xufVxuXG5mdW5jdGlvbiB3cmFwQm9vdHN0cmFwQ2FsbChvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFRhcmdldHMgPSBnZXRQcm9qZWN0VGFyZ2V0cyhob3N0LCBvcHRpb25zLmNsaWVudFByb2plY3QpO1xuICAgIGlmICghY2xpZW50VGFyZ2V0cy5idWlsZCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuICAgIGNvbnN0IG1haW5QYXRoID0gbm9ybWFsaXplKCcvJyArIGNsaWVudFRhcmdldHMuYnVpbGQub3B0aW9ucy5tYWluKTtcbiAgICBsZXQgYm9vdHN0cmFwQ2FsbDogdHMuTm9kZSB8IG51bGwgPSBmaW5kQm9vdHN0cmFwTW9kdWxlQ2FsbChob3N0LCBtYWluUGF0aCk7XG4gICAgaWYgKGJvb3RzdHJhcENhbGwgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdCb290c3RyYXAgbW9kdWxlIG5vdCBmb3VuZC4nKTtcbiAgICB9XG5cbiAgICBsZXQgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb246IHRzLk5vZGUgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY3VycmVudENhbGwgPSBib290c3RyYXBDYWxsO1xuICAgIHdoaWxlIChib290c3RyYXBDYWxsRXhwcmVzc2lvbiA9PT0gbnVsbCAmJiBjdXJyZW50Q2FsbC5wYXJlbnQpIHtcbiAgICAgIGN1cnJlbnRDYWxsID0gY3VycmVudENhbGwucGFyZW50O1xuICAgICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChjdXJyZW50Q2FsbCkgfHwgdHMuaXNWYXJpYWJsZVN0YXRlbWVudChjdXJyZW50Q2FsbCkpIHtcbiAgICAgICAgYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24gPSBjdXJyZW50Q2FsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgYm9vdHN0cmFwQ2FsbCA9IGN1cnJlbnRDYWxsO1xuXG4gICAgLy8gSW4gY2FzZSB0aGUgYm9vdHN0cmFwIGNvZGUgaXMgYSB2YXJpYWJsZSBzdGF0ZW1lbnRcbiAgICAvLyB3ZSBuZWVkIHRvIGRldGVybWluZSBpdCdzIHVzYWdlXG4gICAgaWYgKGJvb3RzdHJhcENhbGxFeHByZXNzaW9uICYmIHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoYm9vdHN0cmFwQ2FsbEV4cHJlc3Npb24pKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGJvb3RzdHJhcENhbGxFeHByZXNzaW9uLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF07XG4gICAgICBjb25zdCBib290c3RyYXBWYXIgPSAoZGVjbGFyYXRpb24ubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuICAgICAgY29uc3Qgc2YgPSBib290c3RyYXBDYWxsRXhwcmVzc2lvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBib290c3RyYXBDYWxsID0gZmluZENhbGxFeHByZXNzaW9uTm9kZShzZiwgYm9vdHN0cmFwVmFyKSB8fCBjdXJyZW50Q2FsbDtcbiAgICB9XG5cbiAgICAvLyBpbmRlbnQgY29udGVudHNcbiAgICBjb25zdCB0cml2aWFXaWR0aCA9IGJvb3RzdHJhcENhbGwuZ2V0TGVhZGluZ1RyaXZpYVdpZHRoKCk7XG4gICAgY29uc3QgYmVmb3JlVGV4dCA9IGBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xcbmBcbiAgICAgICsgJyAnLnJlcGVhdCh0cml2aWFXaWR0aCA+IDIgPyB0cml2aWFXaWR0aCArIDEgOiB0cml2aWFXaWR0aCk7XG4gICAgY29uc3QgYWZ0ZXJUZXh0ID0gYFxcbiR7dHJpdmlhV2lkdGggPiAyID8gJyAnLnJlcGVhdCh0cml2aWFXaWR0aCAtIDEpIDogJyd9fSk7YDtcblxuICAgIC8vIGluIHNvbWUgY2FzZXMgd2UgbmVlZCB0byBjYXRlciBmb3IgYSB0cmFpbGluZyBzZW1pY29sb24gc3VjaCBhcztcbiAgICAvLyBib290c3RyYXAoKS5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG4gICAgY29uc3QgbGFzdFRva2VuID0gYm9vdHN0cmFwQ2FsbC5wYXJlbnQuZ2V0TGFzdFRva2VuKCk7XG4gICAgbGV0IGVuZFBvcyA9IGJvb3RzdHJhcENhbGwuZ2V0RW5kKCk7XG4gICAgaWYgKGxhc3RUb2tlbiAmJiBsYXN0VG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TZW1pY29sb25Ub2tlbikge1xuICAgICAgZW5kUG9zID0gbGFzdFRva2VuLmdldEVuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtYWluUGF0aCk7XG4gICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChib290c3RyYXBDYWxsLmdldFN0YXJ0KCksIGJlZm9yZVRleHQpO1xuICAgIHJlY29yZGVyLmluc2VydFJpZ2h0KGVuZFBvcywgYWZ0ZXJUZXh0KTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUobm9kZTogdHMuTm9kZSwgdGV4dDogc3RyaW5nKTogdHMuTm9kZSB8IG51bGwge1xuICBpZiAoXG4gICAgdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKVxuICAgICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pXG4gICAgJiYgbm9kZS5leHByZXNzaW9uLnRleHQgPT09IHRleHRcbiAgKSB7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBsZXQgZm91bmROb2RlOiB0cy5Ob2RlIHwgbnVsbCA9IG51bGw7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCBjaGlsZE5vZGUgPT4ge1xuICAgIGZvdW5kTm9kZSA9IGZpbmRDYWxsRXhwcmVzc2lvbk5vZGUoY2hpbGROb2RlLCB0ZXh0KTtcblxuICAgIGlmIChmb3VuZE5vZGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGZvdW5kTm9kZTtcbn1cblxuZnVuY3Rpb24gYWRkU2VydmVyVHJhbnNpdGlvbihvcHRpb25zOiBVbml2ZXJzYWxPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGNsaWVudFByb2plY3QgPSBnZXRQcm9qZWN0KGhvc3QsIG9wdGlvbnMuY2xpZW50UHJvamVjdCk7XG4gICAgY29uc3QgY2xpZW50VGFyZ2V0cyA9IGdldFByb2plY3RUYXJnZXRzKGNsaWVudFByb2plY3QpO1xuICAgIGlmICghY2xpZW50VGFyZ2V0cy5idWlsZCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuICAgIGNvbnN0IG1haW5QYXRoID0gbm9ybWFsaXplKCcvJyArIGNsaWVudFRhcmdldHMuYnVpbGQub3B0aW9ucy5tYWluKTtcblxuICAgIGNvbnN0IGJvb3RzdHJhcE1vZHVsZVJlbGF0aXZlUGF0aCA9IGZpbmRCb290c3RyYXBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb25zdCBib290c3RyYXBNb2R1bGVQYXRoID0gbm9ybWFsaXplKFxuICAgICAgYC8ke2NsaWVudFByb2plY3Qucm9vdH0vc3JjLyR7Ym9vdHN0cmFwTW9kdWxlUmVsYXRpdmVQYXRofS50c2ApO1xuXG4gICAgY29uc3QgYnJvd3Nlck1vZHVsZUltcG9ydCA9IGZpbmRCcm93c2VyTW9kdWxlSW1wb3J0KGhvc3QsIGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGFwcElkID0gb3B0aW9ucy5hcHBJZDtcbiAgICBjb25zdCB0cmFuc2l0aW9uQ2FsbCA9IGAud2l0aFNlcnZlclRyYW5zaXRpb24oeyBhcHBJZDogJyR7YXBwSWR9JyB9KWA7XG4gICAgY29uc3QgcG9zaXRpb24gPSBicm93c2VyTW9kdWxlSW1wb3J0LnBvcyArIGJyb3dzZXJNb2R1bGVJbXBvcnQuZ2V0RnVsbFRleHQoKS5sZW5ndGg7XG4gICAgY29uc3QgdHJhbnNpdGlvbkNhbGxDaGFuZ2UgPSBuZXcgSW5zZXJ0Q2hhbmdlKFxuICAgICAgYm9vdHN0cmFwTW9kdWxlUGF0aCwgcG9zaXRpb24sIHRyYW5zaXRpb25DYWxsKTtcblxuICAgIGNvbnN0IHRyYW5zaXRpb25DYWxsUmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGJvb3RzdHJhcE1vZHVsZVBhdGgpO1xuICAgIHRyYW5zaXRpb25DYWxsUmVjb3JkZXIuaW5zZXJ0TGVmdCh0cmFuc2l0aW9uQ2FsbENoYW5nZS5wb3MsIHRyYW5zaXRpb25DYWxsQ2hhbmdlLnRvQWRkKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZSh0cmFuc2l0aW9uQ2FsbFJlY29yZGVyKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBjb3JlRGVwID0gZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9jb3JlJyk7XG4gICAgaWYgKGNvcmVEZXAgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCB2ZXJzaW9uLicpO1xuICAgIH1cbiAgICBjb25zdCBwbGF0Zm9ybVNlcnZlckRlcCA9IHtcbiAgICAgIC4uLmNvcmVEZXAsXG4gICAgICBuYW1lOiAnQGFuZ3VsYXIvcGxhdGZvcm0tc2VydmVyJyxcbiAgICB9O1xuICAgIGNvbnN0IGh0dHBEZXAgPSB7XG4gICAgICAuLi5jb3JlRGVwLFxuICAgICAgbmFtZTogJ0Bhbmd1bGFyL2h0dHAnLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHBsYXRmb3JtU2VydmVyRGVwKTtcbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgaHR0cERlcCk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0VHNDb25maWdPdXREaXIoaG9zdDogVHJlZSwgdGFyZ2V0czogZXhwZXJpbWVudGFsLndvcmtzcGFjZS5Xb3Jrc3BhY2VUb29sKTogc3RyaW5nIHtcbiAgY29uc3QgdHNDb25maWdQYXRoID0gdGFyZ2V0cy5idWlsZC5vcHRpb25zLnRzQ29uZmlnO1xuICBjb25zdCB0c0NvbmZpZ0J1ZmZlciA9IGhvc3QucmVhZCh0c0NvbmZpZ1BhdGgpO1xuICBpZiAoIXRzQ29uZmlnQnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCByZWFkICR7dHNDb25maWdQYXRofWApO1xuICB9XG4gIGNvbnN0IHRzQ29uZmlnQ29udGVudCA9IHRzQ29uZmlnQnVmZmVyLnRvU3RyaW5nKCk7XG4gIGNvbnN0IHRzQ29uZmlnID0gcGFyc2VKc29uKHRzQ29uZmlnQ29udGVudCk7XG4gIGlmICh0c0NvbmZpZyA9PT0gbnVsbCB8fCB0eXBlb2YgdHNDb25maWcgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkodHNDb25maWcpIHx8XG4gICAgdHNDb25maWcuY29tcGlsZXJPcHRpb25zID09PSBudWxsIHx8IHR5cGVvZiB0c0NvbmZpZy5jb21waWxlck9wdGlvbnMgIT09ICdvYmplY3QnIHx8XG4gICAgQXJyYXkuaXNBcnJheSh0c0NvbmZpZy5jb21waWxlck9wdGlvbnMpKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgdHNjb25maWcgLSAke3RzQ29uZmlnUGF0aH1gKTtcbiAgfVxuICBjb25zdCBvdXREaXIgPSB0c0NvbmZpZy5jb21waWxlck9wdGlvbnMub3V0RGlyO1xuXG4gIHJldHVybiBvdXREaXIgYXMgc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogVW5pdmVyc2FsT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gZ2V0UHJvamVjdChob3N0LCBvcHRpb25zLmNsaWVudFByb2plY3QpO1xuICAgIGlmIChjbGllbnRQcm9qZWN0LnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgVW5pdmVyc2FsIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG4gICAgY29uc3QgY2xpZW50VGFyZ2V0cyA9IGdldFByb2plY3RUYXJnZXRzKGNsaWVudFByb2plY3QpO1xuICAgIGNvbnN0IG91dERpciA9IGdldFRzQ29uZmlnT3V0RGlyKGhvc3QsIGNsaWVudFRhcmdldHMpO1xuICAgIGlmICghY2xpZW50VGFyZ2V0cy5idWlsZCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpZW50VHNDb25maWcgPSBub3JtYWxpemUoY2xpZW50VGFyZ2V0cy5idWlsZC5vcHRpb25zLnRzQ29uZmlnKTtcbiAgICBjb25zdCB0c0NvbmZpZ0V4dGVuZHMgPSBiYXNlbmFtZShjbGllbnRUc0NvbmZpZyk7XG4gICAgLy8gdGhpcyBpcyBuZWVkZWQgYmVjYXVzZSBwcmlvciB0byB2ZXJzaW9uIDgsIHRzY29uZmlnIG1pZ2h0IGhhdmUgYmVlbiBpbiAnc3JjJ1xuICAgIC8vIGFuZCB3ZSBkb24ndCB3YW50IHRvIGJyZWFrIHRoZSAnbmcgYWRkIEBuZ3VuaXZlcnNhbC9leHByZXNzLWVuZ2luZSBzY2hlbWF0aWNzJ1xuICAgIGNvbnN0IHJvb3RJblNyYyA9IGNsaWVudFByb2plY3Qucm9vdCA9PT0gJycgJiYgY2xpZW50VHNDb25maWcuaW5jbHVkZXMoJ3NyYy8nKTtcbiAgICBjb25zdCB0c0NvbmZpZ0RpcmVjdG9yeSA9IGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksIHJvb3RJblNyYyA/ICdzcmMnIDogJycpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMvc3JjJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgLi4ub3B0aW9ucyBhcyBvYmplY3QsXG4gICAgICAgIHN0cmlwVHNFeHRlbnNpb246IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFwudHMkLywgJycpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKGpvaW4obm9ybWFsaXplKGNsaWVudFByb2plY3Qucm9vdCksICdzcmMnKSksXG4gICAgXSk7XG5cbiAgICBjb25zdCByb290U291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3Jvb3QnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5zdHJpbmdzLFxuICAgICAgICAuLi5vcHRpb25zIGFzIG9iamVjdCxcbiAgICAgICAgc3RyaXBUc0V4dGVuc2lvbjogKHM6IHN0cmluZykgPT4gcy5yZXBsYWNlKC9cXC50cyQvLCAnJyksXG4gICAgICAgIG91dERpcixcbiAgICAgICAgdHNDb25maWdFeHRlbmRzLFxuICAgICAgICByb290SW5TcmMsXG4gICAgICB9KSxcbiAgICAgIG1vdmUodHNDb25maWdEaXJlY3RvcnkpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBtZXJnZVdpdGgocm9vdFNvdXJjZSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGUob3B0aW9ucywgdHNDb25maWdEaXJlY3RvcnkpLFxuICAgICAgd3JhcEJvb3RzdHJhcENhbGwob3B0aW9ucyksXG4gICAgICBhZGRTZXJ2ZXJUcmFuc2l0aW9uKG9wdGlvbnMpLFxuICAgIF0pO1xuICB9O1xufVxuIl19