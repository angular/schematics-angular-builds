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
    const buffer = host.read(path);
    if (!buffer) {
        throw new schematics_1.SchematicsException(`Could not read file (${path}).`);
    }
    const content = buffer.toString();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmljZS13b3JrZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTZEO0FBQzdELDJEQVdvQztBQUNwQyw0REFBMEU7QUFDMUUsa0dBQW9GO0FBQ3BGLG9EQUs4QjtBQUM5Qiw4Q0FBMEQ7QUFDMUQsMERBQTZGO0FBQzdGLDBEQUEyRDtBQUMzRCw0Q0FBK0Q7QUFDL0QsZ0VBQXNFO0FBQ3RFLG9EQUFxRTtBQUlyRSxTQUFTLGVBQWU7SUFDdEIsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUM7UUFDOUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDM0QsTUFBTSxPQUFPLEdBQUcsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDaEUsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1NBQzFEO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRztZQUN2QixHQUFHLE9BQU87WUFDVixJQUFJLEVBQUUsV0FBVztTQUNsQixDQUFDO1FBQ0YsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVqRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxRQUFnQjtJQUN2QyxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FB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QUFFLGtCQUFrQixDQUFDLENBQUM7UUFFeEUsSUFBSSxFQUFFLG1CQUFtQixHQUFHLEVBQUUsRUFBRSxHQUFHLFlBQVksQ0FBQztRQUNoRCxJQUFJLG1CQUFtQixFQUFFO1lBQ3ZCLG1CQUFtQixHQUFHLElBQUEsZ0JBQVMsRUFBQyxJQUFJLG1CQUFtQixFQUFFLENBQUMsQ0FBQztTQUM1RDtRQUVELE1BQU0sY0FBYyxHQUFHLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsU0FBUyxDQUFDLEVBQUU7WUFDM0MsSUFBQSwyQkFBYyxFQUFDO2dCQUNiLEdBQUcsT0FBTztnQkFDVixtQkFBbUI7Z0JBQ25CLDJCQUEyQixFQUFFLElBQUEsbUNBQTJCLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzthQUN2RSxDQUFDO1lBQ0YsSUFBQSxpQkFBSSxFQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLDhCQUFzQixFQUFFLENBQUMsQ0FBQztRQUU5QyxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsc0JBQVMsRUFBQyxjQUFjLENBQUM7WUFDekIsSUFBQSwyQkFBZSxFQUFDLFNBQVMsQ0FBQztZQUMxQixlQUFlLEVBQUU7WUFDakIsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7U0FDbkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTFDRCw0QkEwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgam9pbiwgbm9ybWFsaXplLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7XG4gIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YSxcbiAgZ2V0RW52aXJvbm1lbnRFeHBvcnROYW1lLFxuICBpbnNlcnRJbXBvcnQsXG4gIGlzSW1wb3J0ZWQsXG59IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IGFwcGx5VG9VcGRhdGVSZWNvcmRlciB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcbmltcG9ydCB7IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSwgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgZ2V0QXBwTW9kdWxlUGF0aCB9IGZyb20gJy4uL3V0aWxpdHkvbmctYXN0LXV0aWxzJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yIH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0LXRhcmdldHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCcm93c2VyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFNlcnZpY2VXb3JrZXJPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBhZGREZXBlbmRlbmNpZXMoKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VOYW1lID0gJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJztcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZyhgYWRkaW5nIGRlcGVuZGVuY3kgKCR7cGFja2FnZU5hbWV9KWApO1xuICAgIGNvbnN0IGNvcmVEZXAgPSBnZXRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0Bhbmd1bGFyL2NvcmUnKTtcbiAgICBpZiAoY29yZURlcCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIHZlcnNpb24uJyk7XG4gICAgfVxuICAgIGNvbnN0IHNlcnZpY2VXb3JrZXJEZXAgPSB7XG4gICAgICAuLi5jb3JlRGVwLFxuICAgICAgbmFtZTogcGFja2FnZU5hbWUsXG4gICAgfTtcbiAgICBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgc2VydmljZVdvcmtlckRlcCk7XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQXBwTW9kdWxlKG1haW5QYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGFwcG1vZHVsZScpO1xuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGdldEFwcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKGBtb2R1bGUgcGF0aDogJHttb2R1bGVQYXRofWApO1xuXG4gICAgLy8gYWRkIGltcG9ydFxuICAgIGxldCBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgbGV0IGltcG9ydE1vZHVsZSA9ICdTZXJ2aWNlV29ya2VyTW9kdWxlJztcbiAgICBsZXQgaW1wb3J0UGF0aCA9ICdAYW5ndWxhci9zZXJ2aWNlLXdvcmtlcic7XG4gICAgaWYgKCFpc0ltcG9ydGVkKG1vZHVsZVNvdXJjZSwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKSkge1xuICAgICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0KG1vZHVsZVNvdXJjZSwgbW9kdWxlUGF0aCwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKTtcbiAgICAgIGlmIChjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtjaGFuZ2VdKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZCBpbXBvcnQgZm9yIGVudmlyb25tZW50c1xuICAgIC8vIGltcG9ydCB7IGVudmlyb25tZW50IH0gZnJvbSAnLi4vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50JztcbiAgICBtb2R1bGVTb3VyY2UgPSBnZXRUc1NvdXJjZUZpbGUoaG9zdCwgbW9kdWxlUGF0aCk7XG4gICAgY29uc3QgZW52aXJvbm1lbnRFeHBvcnROYW1lID0gZ2V0RW52aXJvbm1lbnRFeHBvcnROYW1lKG1vZHVsZVNvdXJjZSk7XG4gICAgLy8gaWYgZW52aXJvbmVtbnQgaW1wb3J0IGFscmVhZHkgZXhpc3RzIHRoZW4gdXNlIHRoZSBmb3VuZCBvbmVcbiAgICAvLyBvdGhlcndpc2UgdXNlIHRoZSBkZWZhdWx0IG5hbWVcbiAgICBpbXBvcnRNb2R1bGUgPSBlbnZpcm9ubWVudEV4cG9ydE5hbWUgfHwgJ2Vudmlyb25tZW50JztcbiAgICAvLyBUT0RPOiBkeW5hbWljYWxseSBmaW5kIGVudmlyb25tZW50cyByZWxhdGl2ZSBwYXRoXG4gICAgaW1wb3J0UGF0aCA9ICcuLi9lbnZpcm9ubWVudHMvZW52aXJvbm1lbnQnO1xuXG4gICAgaWYgKCFlbnZpcm9ubWVudEV4cG9ydE5hbWUpIHtcbiAgICAgIC8vIGlmIGVudmlyb25tZW50IGltcG9ydCB3YXMgbm90IGZvdW5kIHRoZW4gaW5zZXJ0IHRoZSBuZXcgb25lXG4gICAgICAvLyB3aXRoIGRlZmF1bHQgcGF0aCBhbmQgZGVmYXVsdCBleHBvcnQgbmFtZVxuICAgICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0KG1vZHVsZVNvdXJjZSwgbW9kdWxlUGF0aCwgaW1wb3J0TW9kdWxlLCBpbXBvcnRQYXRoKTtcbiAgICAgIGlmIChjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtjaGFuZ2VdKTtcbiAgICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlZ2lzdGVyIFNXIGluIGFwcGxpY2F0aW9uIG1vZHVsZVxuICAgIGNvbnN0IGltcG9ydFRleHQgPSB0YWdzLnN0cmlwSW5kZW50YFxuICAgICAgU2VydmljZVdvcmtlck1vZHVsZS5yZWdpc3Rlcignbmdzdy13b3JrZXIuanMnLCB7XG4gICAgICAgIGVuYWJsZWQ6ICR7aW1wb3J0TW9kdWxlfS5wcm9kdWN0aW9uLFxuICAgICAgICAvLyBSZWdpc3RlciB0aGUgU2VydmljZVdvcmtlciBhcyBzb29uIGFzIHRoZSBhcHBsaWNhdGlvbiBpcyBzdGFibGVcbiAgICAgICAgLy8gb3IgYWZ0ZXIgMzAgc2Vjb25kcyAod2hpY2hldmVyIGNvbWVzIGZpcnN0KS5cbiAgICAgICAgcmVnaXN0cmF0aW9uU3RyYXRlZ3k6ICdyZWdpc3RlcldoZW5TdGFibGU6MzAwMDAnXG4gICAgICB9KVxuICAgIGA7XG4gICAgbW9kdWxlU291cmNlID0gZ2V0VHNTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IG1ldGFkYXRhQ2hhbmdlcyA9IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShcbiAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICAnaW1wb3J0cycsXG4gICAgICBpbXBvcnRUZXh0LFxuICAgICk7XG4gICAgaWYgKG1ldGFkYXRhQ2hhbmdlcykge1xuICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBtZXRhZGF0YUNoYW5nZXMpO1xuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRUc1NvdXJjZUZpbGUoaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGJ1ZmZlciA9IGhvc3QucmVhZChwYXRoKTtcbiAgaWYgKCFidWZmZXIpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IHJlYWQgZmlsZSAoJHtwYXRofSkuYCk7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIHByb2plY3QgbmFtZSAoJHtvcHRpb25zLnByb2plY3R9KWApO1xuICAgIH1cbiAgICBpZiAocHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgU2VydmljZSB3b3JrZXIgcmVxdWlyZXMgYSBwcm9qZWN0IHR5cGUgb2YgXCJhcHBsaWNhdGlvblwiLmApO1xuICAgIH1cbiAgICBjb25zdCBidWlsZFRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgaWYgKCFidWlsZFRhcmdldCkge1xuICAgICAgdGhyb3cgdGFyZ2V0QnVpbGROb3RGb3VuZEVycm9yKCk7XG4gICAgfVxuICAgIGNvbnN0IGJ1aWxkT3B0aW9ucyA9IChidWlsZFRhcmdldC5vcHRpb25zIHx8IHt9KSBhcyB1bmtub3duIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucztcbiAgICBjb25zdCByb290ID0gcHJvamVjdC5yb290O1xuICAgIGJ1aWxkT3B0aW9ucy5zZXJ2aWNlV29ya2VyID0gdHJ1ZTtcbiAgICBidWlsZE9wdGlvbnMubmdzd0NvbmZpZ1BhdGggPSBqb2luKG5vcm1hbGl6ZShyb290KSwgJ25nc3ctY29uZmlnLmpzb24nKTtcblxuICAgIGxldCB7IHJlc291cmNlc091dHB1dFBhdGggPSAnJyB9ID0gYnVpbGRPcHRpb25zO1xuICAgIGlmIChyZXNvdXJjZXNPdXRwdXRQYXRoKSB7XG4gICAgICByZXNvdXJjZXNPdXRwdXRQYXRoID0gbm9ybWFsaXplKGAvJHtyZXNvdXJjZXNPdXRwdXRQYXRofWApO1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlID0gYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgcmVzb3VyY2VzT3V0cHV0UGF0aCxcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QocHJvamVjdC5yb290KSxcbiAgICAgIH0pLFxuICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgIF0pO1xuXG4gICAgY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKCkpO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICB1cGRhdGVXb3Jrc3BhY2Uod29ya3NwYWNlKSxcbiAgICAgIGFkZERlcGVuZGVuY2llcygpLFxuICAgICAgdXBkYXRlQXBwTW9kdWxlKGJ1aWxkT3B0aW9ucy5tYWluKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==