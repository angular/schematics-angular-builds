"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("../utility");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_targets_1 = require("../utility/project-targets");
const util_1 = require("../utility/standalone/util");
const workspace_1 = require("../utility/workspace");
const workspace_models_1 = require("../utility/workspace-models");
const SERVE_SSR_TARGET_NAME = 'serve-ssr';
const PRERENDER_TARGET_NAME = 'prerender';
async function getOutputPath(host, projectName, target) {
    // Generate new output paths
    const workspace = await (0, utility_1.readWorkspace)(host);
    const project = workspace.projects.get(projectName);
    const serverTarget = project?.targets.get(target);
    if (!serverTarget || !serverTarget.options) {
        throw new schematics_1.SchematicsException(`Cannot find 'options' for ${projectName} ${target} target.`);
    }
    const { outputPath } = serverTarget.options;
    if (typeof outputPath !== 'string') {
        throw new schematics_1.SchematicsException(`outputPath for ${projectName} ${target} target is not a string.`);
    }
    return outputPath;
}
function addScriptsRule(options) {
    return async (host) => {
        const pkgPath = '/package.json';
        const buffer = host.read(pkgPath);
        if (buffer === null) {
            throw new schematics_1.SchematicsException('Could not find package.json');
        }
        const serverDist = await getOutputPath(host, options.project, 'server');
        const pkg = JSON.parse(buffer.toString());
        pkg.scripts = {
            ...pkg.scripts,
            'dev:ssr': `ng run ${options.project}:${SERVE_SSR_TARGET_NAME}`,
            'serve:ssr': `node ${serverDist}/main.js`,
            'build:ssr': `ng build && ng run ${options.project}:server`,
            'prerender': `ng run ${options.project}:${PRERENDER_TARGET_NAME}`,
        };
        host.overwrite(pkgPath, JSON.stringify(pkg, null, 2));
    };
}
function updateApplicationBuilderTsConfigRule(options) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        const buildTarget = project?.targets.get('build');
        if (!buildTarget || !buildTarget.options) {
            return;
        }
        const tsConfigPath = buildTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new json_file_1.JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = 'server.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    };
}
function updateApplicationBuilderWorkspaceConfigRule(projectRoot, options) {
    return (0, utility_1.updateWorkspace)((workspace) => {
        const buildTarget = workspace.projects.get(options.project)?.targets.get('build');
        if (!buildTarget) {
            return;
        }
        buildTarget.options = {
            ...buildTarget.options,
            prerender: true,
            ssr: (0, core_1.join)((0, core_1.normalize)(projectRoot), 'server.ts'),
        };
    });
}
function updateWebpackBuilderWorkspaceConfigRule(options) {
    return (0, utility_1.updateWorkspace)((workspace) => {
        const projectName = options.project;
        const project = workspace.projects.get(projectName);
        if (!project) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const serverTarget = project.targets.get('server');
        (serverTarget.options ??= {}).main = (0, core_1.join)((0, core_1.normalize)(project.root), 'server.ts');
        const serveSSRTarget = project.targets.get(SERVE_SSR_TARGET_NAME);
        if (serveSSRTarget) {
            return;
        }
        project.targets.add({
            name: SERVE_SSR_TARGET_NAME,
            builder: '@angular-devkit/build-angular:ssr-dev-server',
            defaultConfiguration: 'development',
            options: {},
            configurations: {
                development: {
                    browserTarget: `${projectName}:build:development`,
                    serverTarget: `${projectName}:server:development`,
                },
                production: {
                    browserTarget: `${projectName}:build:production`,
                    serverTarget: `${projectName}:server:production`,
                },
            },
        });
        const prerenderTarget = project.targets.get(PRERENDER_TARGET_NAME);
        if (prerenderTarget) {
            return;
        }
        project.targets.add({
            name: PRERENDER_TARGET_NAME,
            builder: '@angular-devkit/build-angular:prerender',
            defaultConfiguration: 'production',
            options: {
                routes: ['/'],
            },
            configurations: {
                production: {
                    browserTarget: `${projectName}:build:production`,
                    serverTarget: `${projectName}:server:production`,
                },
                development: {
                    browserTarget: `${projectName}:build:development`,
                    serverTarget: `${projectName}:server:development`,
                },
            },
        });
    });
}
function updateWebpackBuilderServerTsConfigRule(options) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        const serverTarget = project?.targets.get('server');
        if (!serverTarget || !serverTarget.options) {
            return;
        }
        const tsConfigPath = serverTarget.options.tsConfig;
        if (!tsConfigPath || typeof tsConfigPath !== 'string') {
            // No tsconfig path
            return;
        }
        const tsConfig = new json_file_1.JSONFile(host, tsConfigPath);
        const filesAstNode = tsConfig.get(['files']);
        const serverFilePath = 'server.ts';
        if (Array.isArray(filesAstNode) && !filesAstNode.some(({ text }) => text === serverFilePath)) {
            tsConfig.modify(['files'], [...filesAstNode, serverFilePath]);
        }
    };
}
function addDependencies() {
    return (0, schematics_1.chain)([
        (0, utility_1.addDependency)('@angular/ssr', '^17.0.0-next.7+sha-91019bd', {
            type: utility_1.DependencyType.Default,
        }),
        (0, utility_1.addDependency)('express', latest_versions_1.latestVersions['express'], {
            type: utility_1.DependencyType.Default,
        }),
        (0, utility_1.addDependency)('@types/express', latest_versions_1.latestVersions['@types/express'], {
            type: utility_1.DependencyType.Dev,
        }),
    ]);
}
function addServerFile(options, isStandalone) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        const browserDistDirectory = await getOutputPath(host, options.project, 'build');
        return (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)(`./files/${project?.targets?.get('build')?.builder === workspace_models_1.Builders.Application
            ? 'application-builder'
            : 'server-builder'}`), [
            (0, schematics_1.applyTemplates)({
                ...core_1.strings,
                ...options,
                browserDistDirectory,
                isStandalone,
            }),
            (0, schematics_1.move)(project.root),
        ]));
    };
}
function default_1(options) {
    return async (host) => {
        const browserEntryPoint = await (0, util_1.getMainFilePath)(host, options.project);
        const isStandalone = (0, ng_ast_utils_1.isStandaloneApp)(host, browserEntryPoint);
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const clientProject = workspace.projects.get(options.project);
        if (!clientProject) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const isUsingApplicationBuilder = clientProject.targets.get('build')?.builder === workspace_models_1.Builders.Application;
        return (0, schematics_1.chain)([
            (0, schematics_1.externalSchematic)('@schematics/angular', 'server', {
                ...options,
                skipInstall: true,
            }),
            ...(isUsingApplicationBuilder
                ? [
                    updateApplicationBuilderWorkspaceConfigRule(clientProject.root, options),
                    updateApplicationBuilderTsConfigRule(options),
                ]
                : [
                    addScriptsRule(options),
                    updateWebpackBuilderServerTsConfigRule(options),
                    updateWebpackBuilderWorkspaceConfigRule(options),
                ]),
            addServerFile(options, isStandalone),
            addDependencies(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc3NyL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQWdFO0FBQ2hFLDJEQVdvQztBQUVwQyx3Q0FBMkY7QUFDM0Ysb0RBQWdEO0FBQ2hELGdFQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQsZ0VBQXNFO0FBQ3RFLHFEQUE2RDtBQUM3RCxvREFBb0Q7QUFDcEQsa0VBQXVEO0FBSXZELE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDO0FBQzFDLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDO0FBRTFDLEtBQUssVUFBVSxhQUFhLENBQzFCLElBQVUsRUFDVixXQUFtQixFQUNuQixNQUEwQjtJQUUxQiw0QkFBNEI7SUFDNUIsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLHVCQUFhLEVBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDcEQsTUFBTSxZQUFZLEdBQUcsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7UUFDMUMsTUFBTSxJQUFJLGdDQUFtQixDQUFDLDZCQUE2QixXQUFXLElBQUksTUFBTSxVQUFVLENBQUMsQ0FBQztLQUM3RjtJQUVELE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDO0lBQzVDLElBQUksT0FBTyxVQUFVLEtBQUssUUFBUSxFQUFFO1FBQ2xDLE1BQU0sSUFBSSxnQ0FBbUIsQ0FDM0Isa0JBQWtCLFdBQVcsSUFBSSxNQUFNLDBCQUEwQixDQUNsRSxDQUFDO0tBQ0g7SUFF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QUM7WUFDcEMsZUFBZSxFQUFFO1NBQ2xCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFoQ0QsNEJBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIGV4dGVybmFsU2NoZW1hdGljLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFNlcnZlck9wdGlvbnMgfSBmcm9tICcuLi9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IERlcGVuZGVuY3lUeXBlLCBhZGREZXBlbmRlbmN5LCByZWFkV29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5JztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyBpc1N0YW5kYWxvbmVBcHAgfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBnZXRNYWluRmlsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L3N0YW5kYWxvbmUvdXRpbCc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5cbmltcG9ydCB7IFNjaGVtYSBhcyBTU1JPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5jb25zdCBTRVJWRV9TU1JfVEFSR0VUX05BTUUgPSAnc2VydmUtc3NyJztcbmNvbnN0IFBSRVJFTkRFUl9UQVJHRVRfTkFNRSA9ICdwcmVyZW5kZXInO1xuXG5hc3luYyBmdW5jdGlvbiBnZXRPdXRwdXRQYXRoKFxuICBob3N0OiBUcmVlLFxuICBwcm9qZWN0TmFtZTogc3RyaW5nLFxuICB0YXJnZXQ6ICdzZXJ2ZXInIHwgJ2J1aWxkJyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIEdlbmVyYXRlIG5ldyBvdXRwdXQgcGF0aHNcbiAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcmVhZFdvcmtzcGFjZShob3N0KTtcbiAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuICBjb25zdCBzZXJ2ZXJUYXJnZXQgPSBwcm9qZWN0Py50YXJnZXRzLmdldCh0YXJnZXQpO1xuICBpZiAoIXNlcnZlclRhcmdldCB8fCAhc2VydmVyVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ2Fubm90IGZpbmQgJ29wdGlvbnMnIGZvciAke3Byb2plY3ROYW1lfSAke3RhcmdldH0gdGFyZ2V0LmApO1xuICB9XG5cbiAgY29uc3QgeyBvdXRwdXRQYXRoIH0gPSBzZXJ2ZXJUYXJnZXQub3B0aW9ucztcbiAgaWYgKHR5cGVvZiBvdXRwdXRQYXRoICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYG91dHB1dFBhdGggZm9yICR7cHJvamVjdE5hbWV9ICR7dGFyZ2V0fSB0YXJnZXQgaXMgbm90IGEgc3RyaW5nLmAsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBvdXRwdXRQYXRoO1xufVxuXG5mdW5jdGlvbiBhZGRTY3JpcHRzUnVsZShvcHRpb25zOiBTU1JPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IHBrZ1BhdGggPSAnL3BhY2thZ2UuanNvbic7XG4gICAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHBrZ1BhdGgpO1xuICAgIGlmIChidWZmZXIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCBwYWNrYWdlLmpzb24nKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXJEaXN0ID0gYXdhaXQgZ2V0T3V0cHV0UGF0aChob3N0LCBvcHRpb25zLnByb2plY3QsICdzZXJ2ZXInKTtcbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGJ1ZmZlci50b1N0cmluZygpKSBhcyB7IHNjcmlwdHM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IH07XG4gICAgcGtnLnNjcmlwdHMgPSB7XG4gICAgICAuLi5wa2cuc2NyaXB0cyxcbiAgICAgICdkZXY6c3NyJzogYG5nIHJ1biAke29wdGlvbnMucHJvamVjdH06JHtTRVJWRV9TU1JfVEFSR0VUX05BTUV9YCxcbiAgICAgICdzZXJ2ZTpzc3InOiBgbm9kZSAke3NlcnZlckRpc3R9L21haW4uanNgLFxuICAgICAgJ2J1aWxkOnNzcic6IGBuZyBidWlsZCAmJiBuZyBydW4gJHtvcHRpb25zLnByb2plY3R9OnNlcnZlcmAsXG4gICAgICAncHJlcmVuZGVyJzogYG5nIHJ1biAke29wdGlvbnMucHJvamVjdH06JHtQUkVSRU5ERVJfVEFSR0VUX05BTUV9YCxcbiAgICB9O1xuXG4gICAgaG9zdC5vdmVyd3JpdGUocGtnUGF0aCwgSlNPTi5zdHJpbmdpZnkocGtnLCBudWxsLCAyKSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUFwcGxpY2F0aW9uQnVpbGRlclRzQ29uZmlnUnVsZShvcHRpb25zOiBTU1JPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHJlYWRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBjb25zdCBidWlsZFRhcmdldCA9IHByb2plY3Q/LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghYnVpbGRUYXJnZXQgfHwgIWJ1aWxkVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSBidWlsZFRhcmdldC5vcHRpb25zLnRzQ29uZmlnO1xuICAgIGlmICghdHNDb25maWdQYXRoIHx8IHR5cGVvZiB0c0NvbmZpZ1BhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBObyB0c2NvbmZpZyBwYXRoXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdHNDb25maWcgPSBuZXcgSlNPTkZpbGUoaG9zdCwgdHNDb25maWdQYXRoKTtcbiAgICBjb25zdCBmaWxlc0FzdE5vZGUgPSB0c0NvbmZpZy5nZXQoWydmaWxlcyddKTtcbiAgICBjb25zdCBzZXJ2ZXJGaWxlUGF0aCA9ICdzZXJ2ZXIudHMnO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZpbGVzQXN0Tm9kZSkgJiYgIWZpbGVzQXN0Tm9kZS5zb21lKCh7IHRleHQgfSkgPT4gdGV4dCA9PT0gc2VydmVyRmlsZVBhdGgpKSB7XG4gICAgICB0c0NvbmZpZy5tb2RpZnkoWydmaWxlcyddLCBbLi4uZmlsZXNBc3ROb2RlLCBzZXJ2ZXJGaWxlUGF0aF0pO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQXBwbGljYXRpb25CdWlsZGVyV29ya3NwYWNlQ29uZmlnUnVsZShcbiAgcHJvamVjdFJvb3Q6IHN0cmluZyxcbiAgb3B0aW9uczogU1NST3B0aW9ucyxcbik6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBjb25zdCBidWlsZFRhcmdldCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KT8udGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgaWYgKCFidWlsZFRhcmdldCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJ1aWxkVGFyZ2V0Lm9wdGlvbnMgPSB7XG4gICAgICAuLi5idWlsZFRhcmdldC5vcHRpb25zLFxuICAgICAgcHJlcmVuZGVyOiB0cnVlLFxuICAgICAgc3NyOiBqb2luKG5vcm1hbGl6ZShwcm9qZWN0Um9vdCksICdzZXJ2ZXIudHMnKSxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlV2VicGFja0J1aWxkZXJXb3Jrc3BhY2VDb25maWdSdWxlKG9wdGlvbnM6IFNTUk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgY29uc3QgcHJvamVjdE5hbWUgPSBvcHRpb25zLnByb2plY3Q7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQocHJvamVjdE5hbWUpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgY29uc3Qgc2VydmVyVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnc2VydmVyJykhO1xuICAgIChzZXJ2ZXJUYXJnZXQub3B0aW9ucyA/Pz0ge30pLm1haW4gPSBqb2luKG5vcm1hbGl6ZShwcm9qZWN0LnJvb3QpLCAnc2VydmVyLnRzJyk7XG5cbiAgICBjb25zdCBzZXJ2ZVNTUlRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoU0VSVkVfU1NSX1RBUkdFVF9OQU1FKTtcbiAgICBpZiAoc2VydmVTU1JUYXJnZXQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgIG5hbWU6IFNFUlZFX1NTUl9UQVJHRVRfTkFNRSxcbiAgICAgIGJ1aWxkZXI6ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpzc3ItZGV2LXNlcnZlcicsXG4gICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ2RldmVsb3BtZW50JyxcbiAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06YnVpbGQ6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICAgIHNlcnZlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OnNlcnZlcjpkZXZlbG9wbWVudGAsXG4gICAgICAgIH0sXG4gICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICBicm93c2VyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06YnVpbGQ6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgc2VydmVyVGFyZ2V0OiBgJHtwcm9qZWN0TmFtZX06c2VydmVyOnByb2R1Y3Rpb25gLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHByZXJlbmRlclRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoUFJFUkVOREVSX1RBUkdFVF9OQU1FKTtcbiAgICBpZiAocHJlcmVuZGVyVGFyZ2V0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICBuYW1lOiBQUkVSRU5ERVJfVEFSR0VUX05BTUUsXG4gICAgICBidWlsZGVyOiAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6cHJlcmVuZGVyJyxcbiAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAncHJvZHVjdGlvbicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHJvdXRlczogWycvJ10sXG4gICAgICB9LFxuICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgIGJyb3dzZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpidWlsZDpwcm9kdWN0aW9uYCxcbiAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6cHJvZHVjdGlvbmAsXG4gICAgICAgIH0sXG4gICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgYnJvd3NlclRhcmdldDogYCR7cHJvamVjdE5hbWV9OmJ1aWxkOmRldmVsb3BtZW50YCxcbiAgICAgICAgICBzZXJ2ZXJUYXJnZXQ6IGAke3Byb2plY3ROYW1lfTpzZXJ2ZXI6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVdlYnBhY2tCdWlsZGVyU2VydmVyVHNDb25maWdSdWxlKG9wdGlvbnM6IFNTUk9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0KSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcmVhZFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGNvbnN0IHNlcnZlclRhcmdldCA9IHByb2plY3Q/LnRhcmdldHMuZ2V0KCdzZXJ2ZXInKTtcbiAgICBpZiAoIXNlcnZlclRhcmdldCB8fCAhc2VydmVyVGFyZ2V0Lm9wdGlvbnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0c0NvbmZpZ1BhdGggPSBzZXJ2ZXJUYXJnZXQub3B0aW9ucy50c0NvbmZpZztcbiAgICBpZiAoIXRzQ29uZmlnUGF0aCB8fCB0eXBlb2YgdHNDb25maWdQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgLy8gTm8gdHNjb25maWcgcGF0aFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRzQ29uZmlnID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gICAgY29uc3QgZmlsZXNBc3ROb2RlID0gdHNDb25maWcuZ2V0KFsnZmlsZXMnXSk7XG4gICAgY29uc3Qgc2VydmVyRmlsZVBhdGggPSAnc2VydmVyLnRzJztcbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaWxlc0FzdE5vZGUpICYmICFmaWxlc0FzdE5vZGUuc29tZSgoeyB0ZXh0IH0pID0+IHRleHQgPT09IHNlcnZlckZpbGVQYXRoKSkge1xuICAgICAgdHNDb25maWcubW9kaWZ5KFsnZmlsZXMnXSwgWy4uLmZpbGVzQXN0Tm9kZSwgc2VydmVyRmlsZVBhdGhdKTtcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIGNoYWluKFtcbiAgICBhZGREZXBlbmRlbmN5KCdAYW5ndWxhci9zc3InLCAnXjAuMC4wLVBMQUNFSE9MREVSJywge1xuICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGVmYXVsdCxcbiAgICB9KSxcbiAgICBhZGREZXBlbmRlbmN5KCdleHByZXNzJywgbGF0ZXN0VmVyc2lvbnNbJ2V4cHJlc3MnXSwge1xuICAgICAgdHlwZTogRGVwZW5kZW5jeVR5cGUuRGVmYXVsdCxcbiAgICB9KSxcbiAgICBhZGREZXBlbmRlbmN5KCdAdHlwZXMvZXhwcmVzcycsIGxhdGVzdFZlcnNpb25zWydAdHlwZXMvZXhwcmVzcyddLCB7XG4gICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgfSksXG4gIF0pO1xufVxuXG5mdW5jdGlvbiBhZGRTZXJ2ZXJGaWxlKG9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIGlzU3RhbmRhbG9uZTogYm9vbGVhbik6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCByZWFkV29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBwcm9qZWN0IG5hbWUgKCR7b3B0aW9ucy5wcm9qZWN0fSlgKTtcbiAgICB9XG5cbiAgICBjb25zdCBicm93c2VyRGlzdERpcmVjdG9yeSA9IGF3YWl0IGdldE91dHB1dFBhdGgoaG9zdCwgb3B0aW9ucy5wcm9qZWN0LCAnYnVpbGQnKTtcblxuICAgIHJldHVybiBtZXJnZVdpdGgoXG4gICAgICBhcHBseShcbiAgICAgICAgdXJsKFxuICAgICAgICAgIGAuL2ZpbGVzLyR7XG4gICAgICAgICAgICBwcm9qZWN0Py50YXJnZXRzPy5nZXQoJ2J1aWxkJyk/LmJ1aWxkZXIgPT09IEJ1aWxkZXJzLkFwcGxpY2F0aW9uXG4gICAgICAgICAgICAgID8gJ2FwcGxpY2F0aW9uLWJ1aWxkZXInXG4gICAgICAgICAgICAgIDogJ3NlcnZlci1idWlsZGVyJ1xuICAgICAgICAgIH1gLFxuICAgICAgICApLFxuICAgICAgICBbXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgLi4uc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBicm93c2VyRGlzdERpcmVjdG9yeSxcbiAgICAgICAgICAgIGlzU3RhbmRhbG9uZSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHByb2plY3Qucm9vdCksXG4gICAgICAgIF0sXG4gICAgICApLFxuICAgICk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBTU1JPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IGJyb3dzZXJFbnRyeVBvaW50ID0gYXdhaXQgZ2V0TWFpbkZpbGVQYXRoKGhvc3QsIG9wdGlvbnMucHJvamVjdCk7XG4gICAgY29uc3QgaXNTdGFuZGFsb25lID0gaXNTdGFuZGFsb25lQXBwKGhvc3QsIGJyb3dzZXJFbnRyeVBvaW50KTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBjbGllbnRQcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghY2xpZW50UHJvamVjdCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuICAgIGNvbnN0IGlzVXNpbmdBcHBsaWNhdGlvbkJ1aWxkZXIgPVxuICAgICAgY2xpZW50UHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKT8uYnVpbGRlciA9PT0gQnVpbGRlcnMuQXBwbGljYXRpb247XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgZXh0ZXJuYWxTY2hlbWF0aWMoJ0BzY2hlbWF0aWNzL2FuZ3VsYXInLCAnc2VydmVyJywge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBza2lwSW5zdGFsbDogdHJ1ZSxcbiAgICAgIH0pLFxuICAgICAgLi4uKGlzVXNpbmdBcHBsaWNhdGlvbkJ1aWxkZXJcbiAgICAgICAgPyBbXG4gICAgICAgICAgICB1cGRhdGVBcHBsaWNhdGlvbkJ1aWxkZXJXb3Jrc3BhY2VDb25maWdSdWxlKGNsaWVudFByb2plY3Qucm9vdCwgb3B0aW9ucyksXG4gICAgICAgICAgICB1cGRhdGVBcHBsaWNhdGlvbkJ1aWxkZXJUc0NvbmZpZ1J1bGUob3B0aW9ucyksXG4gICAgICAgICAgXVxuICAgICAgICA6IFtcbiAgICAgICAgICAgIGFkZFNjcmlwdHNSdWxlKG9wdGlvbnMpLFxuICAgICAgICAgICAgdXBkYXRlV2VicGFja0J1aWxkZXJTZXJ2ZXJUc0NvbmZpZ1J1bGUob3B0aW9ucyksXG4gICAgICAgICAgICB1cGRhdGVXZWJwYWNrQnVpbGRlcldvcmtzcGFjZUNvbmZpZ1J1bGUob3B0aW9ucyksXG4gICAgICAgICAgXSksXG4gICAgICBhZGRTZXJ2ZXJGaWxlKG9wdGlvbnMsIGlzU3RhbmRhbG9uZSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==