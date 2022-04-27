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
const tasks_1 = require("@angular-devkit/schematics/tasks");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const dependencies_1 = require("../utility/dependencies");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const paths_1 = require("../utility/paths");
const project_targets_1 = require("../utility/project-targets");
const workspace_1 = require("../utility/workspace");
function addDependencies() {
    return (host, context) => {
        const packageName = '@angular/service-worker';
        context.logger.debug(`adding dependency (${packageName})`);
        const coreDep = (0, dependencies_1.getPackageJsonDependency)(host, '@angular/core');
        if (coreDep === null) {
            throw new schematics_1.SchematicsException('Could not find version.');
        }
        const serviceWorkerDep = {
            ...coreDep,
            name: packageName,
        };
        (0, dependencies_1.addPackageJsonDependency)(host, serviceWorkerDep);
        return host;
    };
}
function updateAppModule(mainPath) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        const modulePath = (0, ng_ast_utils_1.getAppModulePath)(host, mainPath);
        context.logger.debug(`module path: ${modulePath}`);
        // add import
        let moduleSource = getTsSourceFile(host, modulePath);
        let importModule = 'ServiceWorkerModule';
        let importPath = '@angular/service-worker';
        if (!(0, ast_utils_1.isImported)(moduleSource, importModule, importPath)) {
            const change = (0, ast_utils_1.insertImport)(moduleSource, modulePath, importModule, importPath);
            if (change) {
                const recorder = host.beginUpdate(modulePath);
                (0, change_1.applyToUpdateRecorder)(recorder, [change]);
                host.commitUpdate(recorder);
            }
        }
        // add import for environments
        // import { environment } from '../environments/environment';
        moduleSource = getTsSourceFile(host, modulePath);
        const environmentExportName = (0, ast_utils_1.getEnvironmentExportName)(moduleSource);
        // if environemnt import already exists then use the found one
        // otherwise use the default name
        importModule = environmentExportName || 'environment';
        // TODO: dynamically find environments relative path
        importPath = '../environments/environment';
        if (!environmentExportName) {
            // if environment import was not found then insert the new one
            // with default path and default export name
            const change = (0, ast_utils_1.insertImport)(moduleSource, modulePath, importModule, importPath);
            if (change) {
                const recorder = host.beginUpdate(modulePath);
                (0, change_1.applyToUpdateRecorder)(recorder, [change]);
                host.commitUpdate(recorder);
            }
        }
        // register SW in application module
        const importText = core_1.tags.stripIndent `
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: ${importModule}.production,
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000'
      })
    `;
        moduleSource = getTsSourceFile(host, modulePath);
        const metadataChanges = (0, ast_utils_1.addSymbolToNgModuleMetadata)(moduleSource, modulePath, 'imports', importText);
        if (metadataChanges) {
            const recorder = host.beginUpdate(modulePath);
            (0, change_1.applyToUpdateRecorder)(recorder, metadataChanges);
            host.commitUpdate(recorder);
        }
        return host;
    };
}
function getTsSourceFile(host, path) {
    const content = host.readText(path);
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    return source;
}
function default_1(options) {
    return async (host, context) => {
        const workspace = await (0, workspace_1.getWorkspace)(host);
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        if (project.extensions.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Service worker requires a project type of "application".`);
        }
        const buildTarget = project.targets.get('build');
        if (!buildTarget) {
            throw (0, project_targets_1.targetBuildNotFoundError)();
        }
        const buildOptions = (buildTarget.options || {});
        const root = project.root;
        buildOptions.serviceWorker = true;
        buildOptions.ngswConfigPath = (0, core_1.join)((0, core_1.normalize)(root), 'ngsw-config.json');
        let { resourcesOutputPath = '' } = buildOptions;
        if (resourcesOutputPath) {
            resourcesOutputPath = (0, core_1.normalize)(`/${resourcesOutputPath}`);
        }
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
            (0, schematics_1.applyTemplates)({
                ...options,
                resourcesOutputPath,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(project.root),
            }),
            (0, schematics_1.move)(project.root),
        ]);
        context.addTask(new tasks_1.NodePackageInstallTask());
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)(templateSource),
            (0, workspace_1.updateWorkspace)(workspace),
            addDependencies(),
            updateAppModule(buildOptions.main),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmljZS13b3JrZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUE2RDtBQUM3RCwyREFXb0M7QUFDcEMsNERBQTBFO0FBQzFFLGtHQUFvRjtBQUNwRixvREFLOEI7QUFDOUIsOENBQTBEO0FBQzFELDBEQUE2RjtBQUM3RiwwREFBMkQ7QUFDM0QsNENBQStEO0FBQy9ELGdFQUFzRTtBQUN0RSxvREFBcUU7QUFJckUsU0FBUyxlQUFlO0lBQ3RCLE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQzNELE1BQU0sT0FBTyxHQUFHLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2hFLElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQixNQUFNLElBQUksZ0NBQW1CLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUMxRDtRQUNELE1BQU0sZ0JBQWdCLEdBQUc7WUFDdkIsR0FBRyxPQUFPO1lBQ1YsSUFBSSxFQUFFLFdBQVc7U0FDbEIsQ0FBQztRQUNGLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFakQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsUUFBZ0I7SUFDdkMsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUzQyxNQUFNLFVBQVUsR0FBRyxJQUFBLCtCQUFnQixFQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwRCxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUVuRCxhQUFhO1FBQ2IsSUFBSSxZQUFZLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNyRCxJQUFJLFlBQVksR0FBRyxxQkFBcUIsQ0FBQztRQUN6QyxJQUFJLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQztRQUMzQyxJQUFJLENBQUMsSUFBQSxzQkFBVSxFQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLEVBQUU7WUFDdkQsTUFBTSxNQUFNLEdBQUcsSUFBQSx3QkFBWSxFQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2hGLElBQUksTUFBTSxFQUFFO2dCQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlDLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM3QjtTQUNGO1FBRUQsOEJBQThCO1FBQzlCLDZEQUE2RDtRQUM3RCxZQUFZLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqRCxNQUFNLHFCQUFxQixHQUFHLElBQUEsb0NBQXdCLEVBQUMsWUFBWSxDQUFDLENBQUM7UUFDckUsOERBQThEO1FBQzlELGlDQUFpQztRQUNqQyxZQUFZLEdBQUcscUJBQXFCLElBQUksYUFBYSxDQUFDO1FBQ3RELG9EQUFvRDtRQUNwRCxVQUFVLEdBQUcsNkJBQTZCLENBQUM7UUFFM0MsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzFCLDhEQUE4RDtZQUM5RCw0Q0FBNEM7WUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBQSx3QkFBWSxFQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2hGLElBQUksTUFBTSxFQUFFO2dCQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlDLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM3QjtTQUNGO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLFdBQUksQ0FBQyxXQUFXLENBQUE7O21CQUVwQixZQUFZOzs7OztLQUsxQixDQUFDO1FBQ0YsWUFBWSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDakQsTUFBTSxlQUFlLEdBQUcsSUFBQSx1Q0FBMkIsRUFDakQsWUFBWSxFQUNaLFVBQVUsRUFDVixTQUFTLEVBQ1QsVUFBVSxDQUNYLENBQUM7UUFDRixJQUFJLGVBQWUsRUFBRTtZQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlDLElBQUEsOEJBQXFCLEVBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDN0I7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxJQUFVLEVBQUUsSUFBWTtJQUMvQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRWhGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxtQkFBeUIsT0FBNkI7SUFDcEQsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUNyRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyx5QkFBeUIsT0FBTyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7U0FDNUU7UUFDRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxLQUFLLGFBQWEsRUFBRTtZQUNwRCxNQUFNLElBQUksZ0NBQW1CLENBQUMsMERBQTBELENBQUMsQ0FBQztTQUMzRjtRQUNELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDaEIsTUFBTSxJQUFBLDBDQUF3QixHQUFFLENBQUM7U0FDbEM7UUFDRCxNQUFNLFlBQVksR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFxQyxDQUFDO1FBQ3JGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDMUIsWUFBWSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDbEMsWUFBWSxDQUFDLGNBQWMsR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUV4RSxJQUFJLEVBQUUsbUJBQW1CLEdBQUcsRUFBRSxFQUFFLEdBQUcsWUFBWSxDQUFDO1FBQ2hELElBQUksbUJBQW1CLEVBQUU7WUFDdkIsbUJBQW1CLEdBQUcsSUFBQSxnQkFBUyxFQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1NBQzVEO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBQSxrQkFBSyxFQUFDLElBQUEsZ0JBQUcsRUFBQyxTQUFTLENBQUMsRUFBRTtZQUMzQyxJQUFBLDJCQUFjLEVBQUM7Z0JBQ2IsR0FBRyxPQUFPO2dCQUNWLG1CQUFtQjtnQkFDbkIsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2FBQ3ZFLENBQUM7WUFDRixJQUFBLGlCQUFJLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztTQUNuQixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTlDLE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsSUFBQSxzQkFBUyxFQUFDLGNBQWMsQ0FBQztZQUN6QixJQUFBLDJCQUFlLEVBQUMsU0FBUyxDQUFDO1lBQzFCLGVBQWUsRUFBRTtZQUNqQixlQUFlLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztTQUNuQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBMUNELDRCQTBDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtcbiAgYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhLFxuICBnZXRFbnZpcm9ubWVudEV4cG9ydE5hbWUsXG4gIGluc2VydEltcG9ydCxcbiAgaXNJbXBvcnRlZCxcbn0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgYXBwbHlUb1VwZGF0ZVJlY29yZGVyIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5LCBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBnZXRBcHBNb2R1bGVQYXRoIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJyb3dzZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgU2VydmljZVdvcmtlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgcGFja2FnZU5hbWUgPSAnQGFuZ3VsYXIvc2VydmljZS13b3JrZXInO1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKGBhZGRpbmcgZGVwZW5kZW5jeSAoJHtwYWNrYWdlTmFtZX0pYCk7XG4gICAgY29uc3QgY29yZURlcCA9IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvY29yZScpO1xuICAgIGlmIChjb3JlRGVwID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignQ291bGQgbm90IGZpbmQgdmVyc2lvbi4nKTtcbiAgICB9XG4gICAgY29uc3Qgc2VydmljZVdvcmtlckRlcCA9IHtcbiAgICAgIC4uLmNvcmVEZXAsXG4gICAgICBuYW1lOiBwYWNrYWdlTmFtZSxcbiAgICB9O1xuICAgIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBzZXJ2aWNlV29ya2VyRGVwKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVBcHBNb2R1bGUobWFpblBhdGg6IHN0cmluZyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnVXBkYXRpbmcgYXBwbW9kdWxlJyk7XG5cbiAgICBjb25zdCBtb2R1bGVQYXRoID0gZ2V0QXBwTW9kdWxlUGF0aChob3N0LCBtYWluUGF0aCk7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoYG1vZHVsZSBwYXRoOiAke21vZHVsZVBhdGh9YCk7XG5cbiAgICAvLyBhZGQgaW1wb3J0XG4gICAgbGV0IG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBsZXQgaW1wb3J0TW9kdWxlID0gJ1NlcnZpY2VXb3JrZXJNb2R1bGUnO1xuICAgIGxldCBpbXBvcnRQYXRoID0gJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJztcbiAgICBpZiAoIWlzSW1wb3J0ZWQobW9kdWxlU291cmNlLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpKSB7XG4gICAgICBjb25zdCBjaGFuZ2UgPSBpbnNlcnRJbXBvcnQobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW2NoYW5nZV0pO1xuICAgICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWRkIGltcG9ydCBmb3IgZW52aXJvbm1lbnRzXG4gICAgLy8gaW1wb3J0IHsgZW52aXJvbm1lbnQgfSBmcm9tICcuLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuICAgIG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBjb25zdCBlbnZpcm9ubWVudEV4cG9ydE5hbWUgPSBnZXRFbnZpcm9ubWVudEV4cG9ydE5hbWUobW9kdWxlU291cmNlKTtcbiAgICAvLyBpZiBlbnZpcm9uZW1udCBpbXBvcnQgYWxyZWFkeSBleGlzdHMgdGhlbiB1c2UgdGhlIGZvdW5kIG9uZVxuICAgIC8vIG90aGVyd2lzZSB1c2UgdGhlIGRlZmF1bHQgbmFtZVxuICAgIGltcG9ydE1vZHVsZSA9IGVudmlyb25tZW50RXhwb3J0TmFtZSB8fCAnZW52aXJvbm1lbnQnO1xuICAgIC8vIFRPRE86IGR5bmFtaWNhbGx5IGZpbmQgZW52aXJvbm1lbnRzIHJlbGF0aXZlIHBhdGhcbiAgICBpbXBvcnRQYXRoID0gJy4uL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudCc7XG5cbiAgICBpZiAoIWVudmlyb25tZW50RXhwb3J0TmFtZSkge1xuICAgICAgLy8gaWYgZW52aXJvbm1lbnQgaW1wb3J0IHdhcyBub3QgZm91bmQgdGhlbiBpbnNlcnQgdGhlIG5ldyBvbmVcbiAgICAgIC8vIHdpdGggZGVmYXVsdCBwYXRoIGFuZCBkZWZhdWx0IGV4cG9ydCBuYW1lXG4gICAgICBjb25zdCBjaGFuZ2UgPSBpbnNlcnRJbXBvcnQobW9kdWxlU291cmNlLCBtb2R1bGVQYXRoLCBpbXBvcnRNb2R1bGUsIGltcG9ydFBhdGgpO1xuICAgICAgaWYgKGNoYW5nZSkge1xuICAgICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgW2NoYW5nZV0pO1xuICAgICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVnaXN0ZXIgU1cgaW4gYXBwbGljYXRpb24gbW9kdWxlXG4gICAgY29uc3QgaW1wb3J0VGV4dCA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICBTZXJ2aWNlV29ya2VyTW9kdWxlLnJlZ2lzdGVyKCduZ3N3LXdvcmtlci5qcycsIHtcbiAgICAgICAgZW5hYmxlZDogJHtpbXBvcnRNb2R1bGV9LnByb2R1Y3Rpb24sXG4gICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBTZXJ2aWNlV29ya2VyIGFzIHNvb24gYXMgdGhlIGFwcGxpY2F0aW9uIGlzIHN0YWJsZVxuICAgICAgICAvLyBvciBhZnRlciAzMCBzZWNvbmRzICh3aGljaGV2ZXIgY29tZXMgZmlyc3QpLlxuICAgICAgICByZWdpc3RyYXRpb25TdHJhdGVneTogJ3JlZ2lzdGVyV2hlblN0YWJsZTozMDAwMCdcbiAgICAgIH0pXG4gICAgYDtcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgY29uc3QgbWV0YWRhdGFDaGFuZ2VzID0gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKFxuICAgICAgbW9kdWxlU291cmNlLFxuICAgICAgbW9kdWxlUGF0aCxcbiAgICAgICdpbXBvcnRzJyxcbiAgICAgIGltcG9ydFRleHQsXG4gICAgKTtcbiAgICBpZiAobWV0YWRhdGFDaGFuZ2VzKSB7XG4gICAgICBjb25zdCByZWNvcmRlciA9IGhvc3QuYmVnaW5VcGRhdGUobW9kdWxlUGF0aCk7XG4gICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIG1ldGFkYXRhQ2hhbmdlcyk7XG4gICAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFRzU291cmNlRmlsZShob3N0OiBUcmVlLCBwYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgY29udGVudCA9IGhvc3QucmVhZFRleHQocGF0aCk7XG4gIGNvbnN0IHNvdXJjZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgY29udGVudCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG5cbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IFNlcnZpY2VXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgcHJvamVjdCBuYW1lICgke29wdGlvbnMucHJvamVjdH0pYCk7XG4gICAgfVxuICAgIGlmIChwcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBTZXJ2aWNlIHdvcmtlciByZXF1aXJlcyBhIHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIuYCk7XG4gICAgfVxuICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWJ1aWxkVGFyZ2V0KSB7XG4gICAgICB0aHJvdyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IoKTtcbiAgICB9XG4gICAgY29uc3QgYnVpbGRPcHRpb25zID0gKGJ1aWxkVGFyZ2V0Lm9wdGlvbnMgfHwge30pIGFzIHVua25vd24gYXMgQnJvd3NlckJ1aWxkZXJPcHRpb25zO1xuICAgIGNvbnN0IHJvb3QgPSBwcm9qZWN0LnJvb3Q7XG4gICAgYnVpbGRPcHRpb25zLnNlcnZpY2VXb3JrZXIgPSB0cnVlO1xuICAgIGJ1aWxkT3B0aW9ucy5uZ3N3Q29uZmlnUGF0aCA9IGpvaW4obm9ybWFsaXplKHJvb3QpLCAnbmdzdy1jb25maWcuanNvbicpO1xuXG4gICAgbGV0IHsgcmVzb3VyY2VzT3V0cHV0UGF0aCA9ICcnIH0gPSBidWlsZE9wdGlvbnM7XG4gICAgaWYgKHJlc291cmNlc091dHB1dFBhdGgpIHtcbiAgICAgIHJlc291cmNlc091dHB1dFBhdGggPSBub3JtYWxpemUoYC8ke3Jlc291cmNlc091dHB1dFBhdGh9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2UgPSBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICByZXNvdXJjZXNPdXRwdXRQYXRoLFxuICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChwcm9qZWN0LnJvb3QpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHByb2plY3Qucm9vdCksXG4gICAgXSk7XG5cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlKSxcbiAgICAgIHVwZGF0ZVdvcmtzcGFjZSh3b3Jrc3BhY2UpLFxuICAgICAgYWRkRGVwZW5kZW5jaWVzKCksXG4gICAgICB1cGRhdGVBcHBNb2R1bGUoYnVpbGRPcHRpb25zLm1haW4pLFxuICAgIF0pO1xuICB9O1xufVxuIl19