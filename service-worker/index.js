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
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const packageJsonPath = '/package.json';
function updateConfigFile(options) {
    return (host, context) => {
        context.logger.debug('updating config file.');
        const workspacePath = config_1.getWorkspacePath(host);
        const workspace = config_1.getWorkspace(host);
        const project = workspace.projects[options.project];
        if (!project) {
            throw new Error(`Project is not defined in this workspace.`);
        }
        if (!project.architect) {
            throw new Error(`Architect is not defined for this project.`);
        }
        if (!project.architect[options.target]) {
            throw new Error(`Target is not defined for this project.`);
        }
        let applyTo = project.architect[options.target].options;
        if (options.configuration &&
            project.architect[options.target].configurations &&
            project.architect[options.target].configurations[options.configuration]) {
            applyTo = project.architect[options.target].configurations[options.configuration];
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
        const buffer = host.read(packageJsonPath);
        if (buffer === null) {
            throw new schematics_1.SchematicsException('Could not find package.json');
        }
        const packageObject = JSON.parse(buffer.toString());
        const ngCoreVersion = packageObject.dependencies['@angular/core'];
        packageObject.dependencies[packageName] = ngCoreVersion;
        host.overwrite(packageJsonPath, JSON.stringify(packageObject, null, 2));
        return host;
    };
}
function updateAppModule(options) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        // find app module
        const workspace = config_1.getWorkspace(host);
        const project = workspace.projects[options.project];
        if (!project.architect) {
            throw new Error('Project architect not found.');
        }
        const mainPath = project.architect.build.options.main;
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
        const importText = `ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production })`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9zZXJ2aWNlLXdvcmtlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILDJEQVlvQztBQUNwQyw0REFBMEU7QUFDMUUsaUNBQWlDO0FBQ2pDLG9EQUE2RjtBQUU3Riw4Q0FHMkI7QUFDM0IsMERBQTJEO0FBRzNELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQztBQUV4QywwQkFBMEIsT0FBNkI7SUFDckQsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sYUFBYSxHQUFHLHlCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdDLE1BQU0sU0FBUyxHQUFHLHFCQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBaUIsQ0FBQyxDQUFDO1FBRTlELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsSUFBSSxPQUFP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ZSxDQUFDLE9BQU8sQ0FBQztTQUN6QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBNUJELDRCQTRCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIFVwZGF0ZVJlY29yZGVyLFxuICBhcHBseSxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdGVtcGxhdGUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhLCBpbnNlcnRJbXBvcnQsIGlzSW1wb3J0ZWQgfSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBJbnNlcnRDaGFuZ2UgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQge1xuICBnZXRXb3Jrc3BhY2UsXG4gIGdldFdvcmtzcGFjZVBhdGgsXG59IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGdldEFwcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgU2VydmljZVdvcmtlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmNvbnN0IHBhY2thZ2VKc29uUGF0aCA9ICcvcGFja2FnZS5qc29uJztcblxuZnVuY3Rpb24gdXBkYXRlQ29uZmlnRmlsZShvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygndXBkYXRpbmcgY29uZmlnIGZpbGUuJyk7XG4gICAgY29uc3Qgd29ya3NwYWNlUGF0aCA9IGdldFdvcmtzcGFjZVBhdGgoaG9zdCk7XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzW29wdGlvbnMucHJvamVjdCBhcyBzdHJpbmddO1xuXG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb2plY3QgaXMgbm90IGRlZmluZWQgaW4gdGhpcyB3b3Jrc3BhY2UuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm9qZWN0LmFyY2hpdGVjdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBcmNoaXRlY3QgaXMgbm90IGRlZmluZWQgZm9yIHRoaXMgcHJvamVjdC5gKTtcbiAgICB9XG5cbiAgICBpZiAoIXByb2plY3QuYXJjaGl0ZWN0W29wdGlvbnMudGFyZ2V0XSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYXJnZXQgaXMgbm90IGRlZmluZWQgZm9yIHRoaXMgcHJvamVjdC5gKTtcbiAgICB9XG5cbiAgICBsZXQgYXBwbHlUbyA9IHByb2plY3QuYXJjaGl0ZWN0W29wdGlvbnMudGFyZ2V0XS5vcHRpb25zO1xuXG4gICAgaWYgKG9wdGlvbnMuY29uZmlndXJhdGlvbiAmJlxuICAgICAgICBwcm9qZWN0LmFyY2hpdGVjdFtvcHRpb25zLnRhcmdldF0uY29uZmlndXJhdGlvbnMgJiZcbiAgICAgICAgcHJvamVjdC5hcmNoaXRlY3Rbb3B0aW9ucy50YXJnZXRdLmNvbmZpZ3VyYXRpb25zW29wdGlvbnMuY29uZmlndXJhdGlvbl0pIHtcbiAgICAgIGFwcGx5VG8gPSBwcm9qZWN0LmFyY2hpdGVjdFtvcHRpb25zLnRhcmdldF0uY29uZmlndXJhdGlvbnNbb3B0aW9ucy5jb25maWd1cmF0aW9uXTtcbiAgICB9XG5cbiAgICBhcHBseVRvLnNlcnZpY2VXb3JrZXIgPSB0cnVlO1xuXG4gICAgaG9zdC5vdmVyd3JpdGUod29ya3NwYWNlUGF0aCwgSlNPTi5zdHJpbmdpZnkod29ya3NwYWNlLCBudWxsLCAyKSk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9ICdAYW5ndWxhci9zZXJ2aWNlLXdvcmtlcic7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoYGFkZGluZyBkZXBlbmRlbmN5ICgke3BhY2thZ2VOYW1lfSlgKTtcbiAgICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGFja2FnZUpzb25QYXRoKTtcbiAgICBpZiAoYnVmZmVyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgcGFja2FnZS5qc29uJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZU9iamVjdCA9IEpTT04ucGFyc2UoYnVmZmVyLnRvU3RyaW5nKCkpO1xuXG4gICAgY29uc3QgbmdDb3JlVmVyc2lvbiA9IHBhY2thZ2VPYmplY3QuZGVwZW5kZW5jaWVzWydAYW5ndWxhci9jb3JlJ107XG4gICAgcGFja2FnZU9iamVjdC5kZXBlbmRlbmNpZXNbcGFja2FnZU5hbWVdID0gbmdDb3JlVmVyc2lvbjtcblxuICAgIGhvc3Qub3ZlcndyaXRlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkocGFja2FnZU9iamVjdCwgbnVsbCwgMikpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUFwcE1vZHVsZShvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnVXBkYXRpbmcgYXBwbW9kdWxlJyk7XG5cbiAgICAvLyBmaW5kIGFwcCBtb2R1bGVcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLnByb2plY3QgYXMgc3RyaW5nXTtcbiAgICBpZiAoIXByb2plY3QuYXJjaGl0ZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb2plY3QgYXJjaGl0ZWN0IG5vdCBmb3VuZC4nKTtcbiAgICB9XG4gICAgY29uc3QgbWFpblBhdGggPSBwcm9qZWN0LmFyY2hpdGVjdC5idWlsZC5vcHRpb25zLm1haW47XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGdldEFwcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKGBtb2R1bGUgcGF0aDogJHttb2R1bGVQYXRofWApO1xuXG4gICAgLy8gYWRkIGltcG9ydFxuICAgIGxldCBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgbGV0IGltcG9ydE1vZHVsZSA9ICdTZXJ2aWNlV29ya2VyTW9kdWxlJztcbiAgICBsZXQgaW1wb3J0UGF0aCA9ICdAYW5ndWxhci9zZXJ2aWNlLXdvcmtlcic7XG4gICAgaWYgKCFpc0ltcG9ydGVkKG1vZHVsZVNvdXJjZSwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKSkge1xuICAgICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0XG4gICAgICAobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICAgIHJlY29yZGVyLmluc2VydExlZnQoKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnBvcywgKGNoYW5nZSBhcyBJbnNlcnRDaGFuZ2UpLnRvQWRkKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZCBpbXBvcnQgZm9yIGVudmlyb25tZW50c1xuICAgIC8vIGltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSAnLi4vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50JztcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgaW1wb3J0TW9kdWxlID0gJ2Vudmlyb25tZW50JztcbiAgICAvLyBUT0RPOiBkeW5hbWljYWxseSBmaW5kIGVudmlyb25tZW50cyByZWxhdGl2ZSBwYXRoXG4gICAgaW1wb3J0UGF0aCA9ICcuLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCkpIHtcbiAgICAgIGNvbnN0IGNoYW5nZSA9IGluc2VydEltcG9ydFxuICAgICAgKG1vZHVsZVNvdXJjZSwgbW9kdWxlUGF0aCwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKTtcbiAgICAgIGlmIChjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgICByZWNvcmRlci5pbnNlcnRMZWZ0KChjaGFuZ2UgYXMgSW5zZXJ0Q2hhbmdlKS5wb3MsIChjaGFuZ2UgYXMgSW5zZXJ0Q2hhbmdlKS50b0FkZCk7XG4gICAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZWdpc3RlciBTVyBpbiBhcHAgbW9kdWxlXG4gICAgY29uc3QgaW1wb3J0VGV4dCA9XG4gICAgICBgU2VydmljZVdvcmtlck1vZHVsZS5yZWdpc3RlcignL25nc3ctd29ya2VyLmpzJywgeyBlbmFibGVkOiBlbnZpcm9ubWVudC5wcm9kdWN0aW9uIH0pYDtcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgY29uc3QgbWV0YWRhdGFDaGFuZ2VzID0gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKFxuICAgICAgbW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCAnaW1wb3J0cycsIGltcG9ydFRleHQpO1xuICAgIGlmIChtZXRhZGF0YUNoYW5nZXMpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIG1ldGFkYXRhQ2hhbmdlcy5mb3JFYWNoKChjaGFuZ2U6IEluc2VydENoYW5nZSkgPT4ge1xuICAgICAgICByZWNvcmRlci5pbnNlcnRSaWdodChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfSk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFRzU291cmNlRmlsZShob3N0OiBUcmVlLCBwYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgYnVmZmVyID0gaG9zdC5yZWFkKHBhdGgpO1xuICBpZiAoIWJ1ZmZlcikge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgcmVhZCBmaWxlICgke3BhdGh9KS5gKTtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gYnVmZmVyLnRvU3RyaW5nKCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ09wdGlvbiBcInByb2plY3RcIiBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLnByb2plY3RdO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgcHJvamVjdCBuYW1lICgke29wdGlvbnMucHJvamVjdH0pYCk7XG4gICAgfVxuICAgIGlmIChwcm9qZWN0LnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgU2VydmljZSB3b3JrZXIgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgIHRlbXBsYXRlKHsuLi5vcHRpb25zfSksXG4gICAgICBtb3ZlKHByb2plY3Qucm9vdCksXG4gICAgXSk7XG5cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIHVwZGF0ZUNvbmZpZ0ZpbGUob3B0aW9ucyksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUFwcE1vZHVsZShvcHRpb25zKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==