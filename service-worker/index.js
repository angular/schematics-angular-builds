"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
const ts = require("../third_party/github.com/Microsoft/TypeScript/lib/typescript");
const ast_utils_1 = require("../utility/ast-utils");
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_targets_1 = require("../utility/project-targets");
function getProjectConfiguration(workspace, options) {
    const projectTargets = project_targets_1.getProjectTargets(workspace, options.project);
    if (!projectTargets[options.target]) {
        throw new Error(`Target is not defined for this project.`);
    }
    const target = projectTargets[options.target];
    let applyTo = target.options;
    if (options.configuration &&
        target.configurations &&
        target.configurations[options.configuration]) {
        applyTo = target.configurations[options.configuration];
    }
    return applyTo;
}
function updateConfigFile(options, root) {
    return (host, context) => {
        context.logger.debug('updating config file.');
        const workspace = config_1.getWorkspace(host);
        const config = getProjectConfiguration(workspace, options);
        config.serviceWorker = true;
        config.ngswConfigPath = `${root && !root.endsWith('/') ? root + '/' : root}ngsw-config.json`;
        return config_1.updateWorkspace(workspace);
    };
}
function addDependencies() {
    return (host, context) => {
        const packageName = '@angular/service-worker';
        context.logger.debug(`adding dependency (${packageName})`);
        const coreDep = dependencies_1.getPackageJsonDependency(host, '@angular/core');
        if (coreDep === null) {
            throw new schematics_1.SchematicsException('Could not find version.');
        }
        const serviceWorkerDep = Object.assign({}, coreDep, { name: packageName });
        dependencies_1.addPackageJsonDependency(host, serviceWorkerDep);
        return host;
    };
}
function updateAppModule(options) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        // find app module
        const projectTargets = project_targets_1.getProjectTargets(host, options.project);
        if (!projectTargets.build) {
            throw project_targets_1.targetBuildNotFoundError();
        }
        const mainPath = projectTargets.build.options.main;
        const modulePath = ng_ast_utils_1.getAppModulePath(host, mainPath);
        context.logger.debug(`module path: ${modulePath}`);
        // add import
        let moduleSource = getTsSourceFile(host, modulePath);
        let importModule = 'ServiceWorkerModule';
        let importPath = '@angular/service-worker';
        if (!ast_utils_1.isImported(moduleSource, importModule, importPath)) {
            const change = ast_utils_1.insertImport(moduleSource, modulePath, importModule, importPath);
            if (change) {
                const recorder = host.beginUpdate(modulePath);
                recorder.insertLeft(change.pos, change.toAdd);
                host.commitUpdate(recorder);
            }
        }
        // add import for environments
        // import { environment } from '../environments/environment';
        moduleSource = getTsSourceFile(host, modulePath);
        importModule = 'environment';
        // TODO: dynamically find environments relative path
        importPath = '../environments/environment';
        if (!ast_utils_1.isImported(moduleSource, importModule, importPath)) {
            const change = ast_utils_1.insertImport(moduleSource, modulePath, importModule, importPath);
            if (change) {
                const recorder = host.beginUpdate(modulePath);
                recorder.insertLeft(change.pos, change.toAdd);
                host.commitUpdate(recorder);
            }
        }
        // register SW in app module
        const importText = `ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })`;
        moduleSource = getTsSourceFile(host, modulePath);
        const metadataChanges = ast_utils_1.addSymbolToNgModuleMetadata(moduleSource, modulePath, 'imports', importText);
        if (metadataChanges) {
            const recorder = host.beginUpdate(modulePath);
            metadataChanges.forEach((change) => {
                recorder.insertRight(change.pos, change.toAdd);
            });
            host.commitUpdate(recorder);
        }
        return host;
    };
}
function getTsSourceFile(host, path) {
    const buffer = host.read(path);
    if (!buffer) {
        throw new schematics_1.SchematicsException(`Could not read file (${path}).`);
    }
    const content = buffer.toString();
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    return source;
}
function default_1(options) {
    return (host, context) => {
        const workspace = config_1.getWorkspace(host);
        if (!options.project) {
            throw new schematics_1.SchematicsException('Option "project" is required.');
        }
        const project = workspace.projects[options.project];
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        if (project.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Service worker requires a project type of "application".`);
        }
        const relativePathToWorkspaceRoot = project.root ?
            project.root.split('/').filter(x => x !== '').map(x => '..').join('/') : '.';
        let { resourcesOutputPath = '' } = getProjectConfiguration(workspace, options);
        if (resourcesOutputPath) {
            resourcesOutputPath = '/' + resourcesOutputPath.split('/').filter(x => !!x).join('/');
        }
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.applyTemplates(Object.assign({}, options, { resourcesOutputPath, relativePathToWorkspaceRoot })),
            schematics_1.move(project.root),
        ]);
        context.addTask(new tasks_1.NodePackageInstallTask());
        return schematics_1.chain([
            schematics_1.mergeWith(templateSource),
            updateConfigFile(options, project.root),
            addDependencies(),
            updateAppModule(options),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9zZXJ2aWNlLXdvcmtlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILDJEQVdvQztBQUNwQyw0REFBMEU7QUFDMUUsb0ZBQW9GO0FBQ3BGLG9EQUE2RjtBQUU3Riw4Q0FBa0U7QUFDbEUsMERBQTZGO0FBQzdGLDBEQUEyRDtBQUMzRCxnRUFBeUY7QUFRekYsU0FBUyx1QkFBdUIsQ0FDOUIsU0FBMEIsRUFDMUIsT0FBNkI7SUFFN0IsTUFBTSxjQUFjLEdBQUcsbUNBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7S0FDNUQ7SUFFRCxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBeUIsQ0FBQztJQUN0RSxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBRTdCLElBQUksT0FBTyxDQUFDLGFBQWE7UUFDdkIsTUFBTSxDQUFDLGNBQWM7UUFDckIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUU7UUFDOUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBMEIsQ0FBQztLQUNqRjtJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE9BQTZCLEVBQUUsSUFBWTtJQUNuRSxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzlD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QUMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUUvRSxJQUFJLEVBQUUsbUJBQW1CLEdBQUcsRUFBRSxFQUFFLEdBQUcsdUJBQXVCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLElBQUksbUJBQW1CLEVBQUU7WUFDdkIsbUJBQW1CLEdBQUcsR0FBRyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZGO1FBRUQsTUFBTSxjQUFjLEdBQUcsa0JBQUssQ0FBQyxnQkFBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNDLDJCQUFjLG1CQUFNLE9BQU8sSUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsSUFBRztZQUNoRixpQkFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLDhCQUFzQixFQUFFLENBQUMsQ0FBQztRQUU5QyxPQUFPLGtCQUFLLENBQUM7WUFDWCxzQkFBUyxDQUFDLGNBQWMsQ0FBQztZQUN6QixnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQztZQUN2QyxlQUFlLEVBQUU7WUFDakIsZUFBZSxDQUFDLE9BQU8sQ0FBQztTQUN6QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBcENELDRCQW9DQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEsIGluc2VydEltcG9ydCwgaXNJbXBvcnRlZCB9IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IEluc2VydENoYW5nZSB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5LCBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBnZXRBcHBNb2R1bGVQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdFRhcmdldHMsIHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7XG4gIEJyb3dzZXJCdWlsZGVyT3B0aW9ucyxcbiAgQnJvd3NlckJ1aWxkZXJUYXJnZXQsXG4gIFdvcmtzcGFjZVNjaGVtYSxcbn0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2aWNlV29ya2VyT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gZ2V0UHJvamVjdENvbmZpZ3VyYXRpb24oXG4gIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hLFxuICBvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyxcbik6IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyB7XG4gIGNvbnN0IHByb2plY3RUYXJnZXRzID0gZ2V0UHJvamVjdFRhcmdldHMod29ya3NwYWNlLCBvcHRpb25zLnByb2plY3QpO1xuICBpZiAoIXByb2plY3RUYXJnZXRzW29wdGlvbnMudGFyZ2V0XSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IGlzIG5vdCBkZWZpbmVkIGZvciB0aGlzIHByb2plY3QuYCk7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBwcm9qZWN0VGFyZ2V0c1tvcHRpb25zLnRhcmdldF0gYXMgQnJvd3NlckJ1aWxkZXJUYXJnZXQ7XG4gIGxldCBhcHBseVRvID0gdGFyZ2V0Lm9wdGlvbnM7XG5cbiAgaWYgKG9wdGlvbnMuY29uZmlndXJhdGlvbiAmJlxuICAgIHRhcmdldC5jb25maWd1cmF0aW9ucyAmJlxuICAgIHRhcmdldC5jb25maWd1cmF0aW9uc1tvcHRpb25zLmNvbmZpZ3VyYXRpb25dKSB7XG4gICAgYXBwbHlUbyA9IHRhcmdldC5jb25maWd1cmF0aW9uc1tvcHRpb25zLmNvbmZpZ3VyYXRpb25dIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgfVxuXG4gIHJldHVybiBhcHBseVRvO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zLCByb290OiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ3VwZGF0aW5nIGNvbmZpZyBmaWxlLicpO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcblxuICAgIGNvbnN0IGNvbmZpZyA9IGdldFByb2plY3RDb25maWd1cmF0aW9uKHdvcmtzcGFjZSwgb3B0aW9ucyk7XG4gICAgY29uZmlnLnNlcnZpY2VXb3JrZXIgPSB0cnVlO1xuICAgIGNvbmZpZy5uZ3N3Q29uZmlnUGF0aCA9IGAke3Jvb3QgJiYgIXJvb3QuZW5kc1dpdGgoJy8nKSA/IHJvb3QgKyAnLycgOiByb290fW5nc3ctY29uZmlnLmpzb25gO1xuXG4gICAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSh3b3Jrc3BhY2UpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJztcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZyhgYWRkaW5nIGRlcGVuZGVuY3kgKCR7cGFja2FnZU5hbWV9KWApO1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHNlcnZpY2VXb3JrZXJEZXAgPSB7XG4gICAgICAuLi5jb3JlRGVwLFxuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgfTtcbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgc2VydmljZVdvcmtlckRlcCk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQXBwTW9kdWxlKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKCdVcGRhdGluZyBhcHBtb2R1bGUnKTtcblxuICAgIC8vIGZpbmQgYXBwIG1vZHVsZVxuICAgIGNvbnN0IHByb2plY3RUYXJnZXRzID0gZ2V0UHJvamVjdFRhcmdldHMoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3RUYXJnZXRzLmJ1aWxkKSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYWluUGF0aCA9IHByb2plY3RUYXJnZXRzLmJ1aWxkLm9wdGlvbnMubWFpbjtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoYG1vZHVsZSBwYXRoOiAke21vZHVsZVBhdGh9YCk7XG5cbiAgICAvLyBhZGQgaW1wb3J0XG4gICAgbGV0IG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBsZXQgaW1wb3J0TW9kdWxlID0gJ1NlcnZpY2VXb3JrZXJNb2R1bGUnO1xuICAgIGxldCBpbXBvcnRQYXRoID0gJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJztcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpKSB7XG4gICAgICBjb25zdCBjaGFuZ2UgPSBpbnNlcnRJbXBvcnQobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICAgIHJlY29yZGVyLmluc2VydExlZnQoKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnBvcywgKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnRvQWRkKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZCBpbXBvcnQgZm9yIGVudmlyb25tZW50c1xuICAgIC8vIGltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSAnLi4vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50JztcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgaW1wb3J0TW9kdWxlID0gJ2Vudmlyb25tZW50JztcbiAgICAvLyBUT0RPOiBkeW5hbWljYWxseSBmaW5kIGVudmlyb25tZW50cyByZWxhdGl2ZSBwYXRoXG4gICAgaW1wb3J0UGF0aCA9ICcuLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCkpIHtcbiAgICAgIGNvbnN0IGNoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdCgoY2hhbmdlIGFzIEluc2VydENoYW5nZSkucG9zLCAoY2hhbmdlIGFzIEluc2VydENoYW5nZSkudG9BZGQpO1xuICAgICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVnaXN0ZXIgU1cgaW4gYXBwIG1vZHVsZVxuICAgIGNvbnN0IGltcG9ydFRleHQgPVxuICAgICAgYFNlcnZpY2VXb3JrZXJNb2R1bGUucmVnaXN0ZXIoJ25nc3ctd29ya2VyLmpzJywgeyBlbmFibGVkOiBlbnZpcm9ubWVudC5wcm9kdWN0aW9uIH0pYDtcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgY29uc3QgbWV0YWRhdGFDaGFuZ2VzID0gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKFxuICAgICAgbW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnaW1wb3J0cycsIGltcG9ydFRleHQpO1xuICAgIGlmIChtZXRhZGF0YUNoYW5nZXMpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIG1ldGFkYXRhQ2hhbmdlcy5mb3JFYWNoKChjaGFuZ2U6IEluc2VydENoYW5nZSkgPT4ge1xuICAgICAgICByZWNvcmRlci5pbnNlcnRSaWdodChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfSk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFRzU291cmNlRmlsZShob3N0OiBUcmVlLCBwYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHBhdGgpO1xuICBpZiAoIWJ1ZmZlcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgcmVhZCBmaWxlICgke3BhdGh9KS5gKTtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ09wdGlvbiBcInByb2plY3RcIiBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLnByb2plY3RdO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgcHJvamVjdCBuYW1lICgke29wdGlvbnMucHJvamVjdH0pYCk7XG4gICAgfVxuICAgIGlmIChwcm9qZWN0LnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgU2VydmljZSB3b3JrZXIgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCA9IHByb2plY3Qucm9vdCA/XG4gICAgICBwcm9qZWN0LnJvb3Quc3BsaXQoJy8nKS5maWx0ZXIoeCA9PiB4ICE9PSAnJykubWFwKHggPT4gJy4uJykuam9pbignLycpIDogJy4nO1xuXG4gICAgbGV0IHsgcmVzb3VyY2VzT3V0cHV0UGF0aCA9ICcnIH0gPSBnZXRQcm9qZWN0Q29uZmlndXJhdGlvbih3b3Jrc3BhY2UsIG9wdGlvbnMpO1xuICAgIGlmIChyZXNvdXJjZXNPdXRwdXRQYXRoKSB7XG4gICAgICByZXNvdXJjZXNPdXRwdXRQYXRoID0gJy8nICsgcmVzb3VyY2VzT3V0cHV0UGF0aC5zcGxpdCgnLycpLmZpbHRlcih4ID0+ICEheCkuam9pbignLycpO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHsgLi4ub3B0aW9ucywgcmVzb3VyY2VzT3V0cHV0UGF0aCwgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0pLFxuICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuXG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnMsIHByb2plY3Qucm9vdCksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUFwcE1vZHVsZShvcHRpb25zKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==