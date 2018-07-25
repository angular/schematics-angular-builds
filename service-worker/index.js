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
const ts = require("typescript");
const ast_utils_1 = require("../utility/ast-utils");
const config_1 = require("../utility/config");
const dependencies_1 = require("../utility/dependencies");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const project_targets_1 = require("../utility/project-targets");
function updateConfigFile(options) {
    return (host, context) => {
        context.logger.debug('updating config file.');
        const workspacePath = config_1.getWorkspacePath(host);
        const workspace = config_1.getWorkspace(host);
        const project = workspace.projects[options.project];
        if (!project) {
            throw new Error(`Project is not defined in this workspace.`);
        }
        const projectTargets = project_targets_1.getProjectTargets(project);
        if (!projectTargets[options.target]) {
            throw new Error(`Target is not defined for this project.`);
        }
        let applyTo = projectTargets[options.target].options;
        if (options.configuration &&
            projectTargets[options.target].configurations &&
            projectTargets[options.target].configurations[options.configuration]) {
            applyTo = projectTargets[options.target].configurations[options.configuration];
        }
        applyTo.serviceWorker = true;
        host.overwrite(workspacePath, JSON.stringify(workspace, null, 2));
        return host;
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
        const workspace = config_1.getWorkspace(host);
        const project = workspace.projects[options.project];
        const projectTargets = project_targets_1.getProjectTargets(project);
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
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.template(Object.assign({}, options)),
            schematics_1.move(project.root),
        ]);
        context.addTask(new tasks_1.NodePackageInstallTask());
        return schematics_1.chain([
            schematics_1.mergeWith(templateSource),
            updateConfigFile(options),
            addDependencies(),
            updateAppModule(options),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9zZXJ2aWNlLXdvcmtlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILDJEQVlvQztBQUNwQyw0REFBMEU7QUFDMUUsaUNBQWlDO0FBQ2pDLG9EQUE2RjtBQUU3Riw4Q0FHMkI7QUFDM0IsMERBQTZGO0FBQzdGLDBEQUEyRDtBQUMzRCxnRUFBK0Q7QUFHL0QsMEJBQTBCLE9BQTZCO0lBQ3JELE1BQU0sQ0FBQyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM5QyxNQUFNLGFBQWEsR0FBRyx5QkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3QyxNQUFNLFNBQVMsR0FBRyxxQkFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQWlCLENBQUMsQ0FBQztRQUU5RCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLG1DQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxELEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUVyRCxFQUFFLENBQUMsQ0FBQyxPQUFP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QU8sQ0FBQyxDQUFDO1FBQ3BELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNiLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyx5QkFBeUIsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQztZQUMxQyxNQUFNLElBQUksZ0NBQW1CLENBQUMsMERBQTBELENBQUMsQ0FBQztRQUM1RixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsa0JBQUssQ0FBQyxnQkFBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNDLHFCQUFRLG1CQUFLLE9BQU8sRUFBRTtZQUN0QixpQkFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLDhCQUFzQixFQUFFLENBQUMsQ0FBQztRQUU5QyxNQUFNLENBQUMsa0JBQUssQ0FBQztZQUNYLHNCQUFTLENBQUMsY0FBYyxDQUFDO1lBQ3pCLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztZQUN6QixlQUFlLEVBQUU7WUFDakIsZUFBZSxDQUFDLE9BQU8sQ0FBQztTQUN6QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBNUJELDRCQTRCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIFVwZGF0ZVJlY29yZGVyLFxuICBhcHBseSxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhLCBpbnNlcnRJbXBvcnQsIGlzSW1wb3J0ZWQgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBnZXRXb3Jrc3BhY2UsXG4gIGdldFdvcmtzcGFjZVBhdGgsXG59IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSwgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgZ2V0QXBwTW9kdWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IGdldFByb2plY3RUYXJnZXRzIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFNlcnZpY2VXb3JrZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKCd1cGRhdGluZyBjb25maWcgZmlsZS4nKTtcbiAgICBjb25zdCB3b3Jrc3BhY2VQYXRoID0gZ2V0V29ya3NwYWNlUGF0aChob3N0KTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcblxuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5wcm9qZWN0IGFzIHN0cmluZ107XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUHJvamVjdCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIHdvcmtzcGFjZS5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0VGFyZ2V0cyA9IGdldFByb2plY3RUYXJnZXRzKHByb2plY3QpO1xuXG4gICAgaWYgKCFwcm9qZWN0VGFyZ2V0c1tvcHRpb25zLnRhcmdldF0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IGlzIG5vdCBkZWZpbmVkIGZvciB0aGlzIHByb2plY3QuYCk7XG4gICAgfVxuXG4gICAgbGV0IGFwcGx5VG8gPSBwcm9qZWN0VGFyZ2V0c1tvcHRpb25zLnRhcmdldF0ub3B0aW9ucztcblxuICAgIGlmIChvcHRpb25zLmNvbmZpZ3VyYXRpb24gJiZcbiAgICAgICAgcHJvamVjdFRhcmdldHNbb3B0aW9ucy50YXJnZXRdLmNvbmZpZ3VyYXRpb25zICYmXG4gICAgICAgIHByb2plY3RUYXJnZXRzW29wdGlvbnMudGFyZ2V0XS5jb25maWd1cmF0aW9uc1tvcHRpb25zLmNvbmZpZ3VyYXRpb25dKSB7XG4gICAgICBhcHBseVRvID0gcHJvamVjdFRhcmdldHNbb3B0aW9ucy50YXJnZXRdLmNvbmZpZ3VyYXRpb25zW29wdGlvbnMuY29uZmlndXJhdGlvbl07XG4gICAgfVxuXG4gICAgYXBwbHlUby5zZXJ2aWNlV29ya2VyID0gdHJ1ZTtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHdvcmtzcGFjZVBhdGgsIEpTT04uc3RyaW5naWZ5KHdvcmtzcGFjZSwgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSAnQGFuZ3VsYXIvc2VydmljZS13b3JrZXInO1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKGBhZGRpbmcgZGVwZW5kZW5jeSAoJHtwYWNrYWdlTmFtZX0pYCk7XG4gICAgY29uc3QgY29yZURlcCA9IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvY29yZScpO1xuICAgIGlmIChjb3JlRGVwID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgdmVyc2lvbi4nKTtcbiAgICB9XG4gICAgY29uc3Qgc2VydmljZVdvcmtlckRlcCA9IHtcbiAgICAgIC4uLmNvcmVEZXAsXG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICB9O1xuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBzZXJ2aWNlV29ya2VyRGVwKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVBcHBNb2R1bGUob3B0aW9uczogU2VydmljZVdvcmtlck9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGFwcG1vZHVsZScpO1xuXG4gICAgLy8gZmluZCBhcHAgbW9kdWxlXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5wcm9qZWN0IGFzIHN0cmluZ107XG4gICAgY29uc3QgcHJvamVjdFRhcmdldHMgPSBnZXRQcm9qZWN0VGFyZ2V0cyhwcm9qZWN0KTtcbiAgICBjb25zdCBtYWluUGF0aCA9IHByb2plY3RUYXJnZXRzLmJ1aWxkLm9wdGlvbnMubWFpbjtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoYG1vZHVsZSBwYXRoOiAke21vZHVsZVBhdGh9YCk7XG5cbiAgICAvLyBhZGQgaW1wb3J0XG4gICAgbGV0IG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBsZXQgaW1wb3J0TW9kdWxlID0gJ1NlcnZpY2VXb3JrZXJNb2R1bGUnO1xuICAgIGxldCBpbXBvcnRQYXRoID0gJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJztcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpKSB7XG4gICAgICBjb25zdCBjaGFuZ2UgPSBpbnNlcnRJbXBvcnRcbiAgICAgIChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdCgoY2hhbmdlIGFzIEluc2VydENoYW5nZSkucG9zLCAoY2hhbmdlIGFzIEluc2VydENoYW5nZSkudG9BZGQpO1xuICAgICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkIGltcG9ydCBmb3IgZW52aXJvbm1lbnRzXG4gICAgLy8gaW1wb3J0IHsgZW52aXJvbm1lbnQgfSBmcm9tICcuLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuICAgIG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBpbXBvcnRNb2R1bGUgPSAnZW52aXJvbm1lbnQnO1xuICAgIC8vIFRPRE86IGR5bmFtaWNhbGx5IGZpbmQgZW52aXJvbm1lbnRzIHJlbGF0aXZlIHBhdGhcbiAgICBpbXBvcnRQYXRoID0gJy4uL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudCc7XG4gICAgaWYgKCFpc0ltcG9ydGVkKG1vZHVsZVNvdXJjZSwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKSkge1xuICAgICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0XG4gICAgICAobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICAgIHJlY29yZGVyLmluc2VydExlZnQoKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnBvcywgKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnRvQWRkKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlZ2lzdGVyIFNXIGluIGFwcCBtb2R1bGVcbiAgICBjb25zdCBpbXBvcnRUZXh0ID1cbiAgICAgIGBTZXJ2aWNlV29ya2VyTW9kdWxlLnJlZ2lzdGVyKCduZ3N3LXdvcmtlci5qcycsIHsgZW5hYmxlZDogZW52aXJvbm1lbnQucHJvZHVjdGlvbiB9KWA7XG4gICAgbW9kdWxlU291cmNlID0gZ2V0VHNTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IG1ldGFkYXRhQ2hhbmdlcyA9IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShcbiAgICAgIG1vZHVsZVNvdXJjZSwgbW9kdWxlUGF0aCwgJ2ltcG9ydHMnLCBpbXBvcnRUZXh0KTtcbiAgICBpZiAobWV0YWRhdGFDaGFuZ2VzKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBtZXRhZGF0YUNoYW5nZXMuZm9yRWFjaCgoY2hhbmdlOiBJbnNlcnRDaGFuZ2UpID0+IHtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoY2hhbmdlLnBvcywgY2hhbmdlLnRvQWRkKTtcbiAgICAgIH0pO1xuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRUc1NvdXJjZUZpbGUoaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwYXRoKTtcbiAgaWYgKCFidWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IHJlYWQgZmlsZSAoJHtwYXRofSkuYCk7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgaWYgKCFvcHRpb25zLnByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdPcHRpb24gXCJwcm9qZWN0XCIgaXMgcmVxdWlyZWQuJyk7XG4gICAgfVxuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5wcm9qZWN0XTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIHByb2plY3QgbmFtZSAoJHtvcHRpb25zLnByb2plY3R9KWApO1xuICAgIH1cbiAgICBpZiAocHJvamVjdC5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFNlcnZpY2Ugd29ya2VyIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICB0ZW1wbGF0ZSh7Li4ub3B0aW9uc30pLFxuICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuXG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICB1cGRhdGVDb25maWdGaWxlKG9wdGlvbnMpLFxuICAgICAgYWRkRGVwZW5kZW5jaWVzKCksXG4gICAgICB1cGRhdGVBcHBNb2R1bGUob3B0aW9ucyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=