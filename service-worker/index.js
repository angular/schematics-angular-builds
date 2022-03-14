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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmljZS13b3JrZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUE2RDtBQUM3RCwyREFXb0M7QUFDcEMsNERBQTBFO0FBQzFFLGtHQUFvRjtBQUNwRixvREFLOEI7QUFDOUIsOENBQTBEO0FBQzFELDBEQUE2RjtBQUM3RiwwREFBMkQ7QUFDM0QsNENBQStEO0FBQy9ELGdFQUFzRTtBQUN0RSxvREFBcUU7QUFJckUsU0FBUyxlQUFlO0lBQ3RCLE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDO1FBQzlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFzQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQzNELE1BQU0sT0FBTyxHQUFHLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2hFLElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQixNQUFNLElBQUksZ0NBQW1CLENBQUMseUJBQXlCLENBQUMsQ0FBQztTQUMxRDtRQUNELE1BQU0sZ0JBQWdCLEdBQUc7WUFDdkIsR0FBRyxPQUFPO1lBQ1YsSUFBSSxFQUFFLFdBQVc7U0FDbEIsQ0FBQztRQUNGLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFakQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsUUFBZ0I7SUFDdkMsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFL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QUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXhFLElBQUksRUFBRSxtQkFBbUIsR0FBRyxFQUFFLEVBQUUsR0FBRyxZQUFZLENBQUM7UUFDaEQsSUFBSSxtQkFBbUIsRUFBRTtZQUN2QixtQkFBbUIsR0FBRyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7U0FDNUQ7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFBLGtCQUFLLEVBQUMsSUFBQSxnQkFBRyxFQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzNDLElBQUEsMkJBQWMsRUFBQztnQkFDYixHQUFHLE9BQU87Z0JBQ1YsbUJBQW1CO2dCQUNuQiwyQkFBMkIsRUFBRSxJQUFBLG1DQUEyQixFQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7YUFDdkUsQ0FBQztZQUNGLElBQUEsaUJBQUksRUFBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ25CLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDLENBQUM7UUFFOUMsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxJQUFBLHNCQUFTLEVBQUMsY0FBYyxDQUFDO1lBQ3pCLElBQUEsMkJBQWUsRUFBQyxTQUFTLENBQUM7WUFDMUIsZUFBZSxFQUFFO1lBQ2pCLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO1NBQ25DLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUExQ0QsNEJBMENDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQge1xuICBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEsXG4gIGdldEVudmlyb25tZW50RXhwb3J0TmFtZSxcbiAgaW5zZXJ0SW1wb3J0LFxuICBpc0ltcG9ydGVkLFxufSBmcm9tICcuLi91dGlsaXR5L2FzdC11dGlscyc7XG5pbXBvcnQgeyBhcHBseVRvVXBkYXRlUmVjb3JkZXIgfSBmcm9tICcuLi91dGlsaXR5L2NoYW5nZSc7XG5pbXBvcnQgeyBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3ksIGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGdldEFwcE1vZHVsZVBhdGggfSBmcm9tICcuLi91dGlsaXR5L25nLWFzdC11dGlscyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvciB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdC10YXJnZXRzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnJvd3NlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2aWNlV29ya2VyT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkRGVwZW5kZW5jaWVzKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlTmFtZSA9ICdAYW5ndWxhci9zZXJ2aWNlLXdvcmtlcic7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoYGFkZGluZyBkZXBlbmRlbmN5ICgke3BhY2thZ2VOYW1lfSlgKTtcbiAgICBjb25zdCBjb3JlRGVwID0gZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsICdAYW5ndWxhci9jb3JlJyk7XG4gICAgaWYgKGNvcmVEZXAgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKCdDb3VsZCBub3QgZmluZCB2ZXJzaW9uLicpO1xuICAgIH1cbiAgICBjb25zdCBzZXJ2aWNlV29ya2VyRGVwID0ge1xuICAgICAgLi4uY29yZURlcCxcbiAgICAgIG5hbWU6IHBhY2thZ2VOYW1lLFxuICAgIH07XG4gICAgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIHNlcnZpY2VXb3JrZXJEZXApO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUFwcE1vZHVsZShtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKCdVcGRhdGluZyBhcHBtb2R1bGUnKTtcblxuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBnZXRBcHBNb2R1bGVQYXRoKGhvc3QsIG1haW5QYXRoKTtcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZyhgbW9kdWxlIHBhdGg6ICR7bW9kdWxlUGF0aH1gKTtcblxuICAgIC8vIGFkZCBpbXBvcnRcbiAgICBsZXQgbW9kdWxlU291cmNlID0gZ2V0VHNTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGxldCBpbXBvcnRNb2R1bGUgPSAnU2VydmljZVdvcmtlck1vZHVsZSc7XG4gICAgbGV0IGltcG9ydFBhdGggPSAnQGFuZ3VsYXIvc2VydmljZS13b3JrZXInO1xuICAgIGlmICghaXNJbXBvcnRlZChtb2R1bGVTb3VyY2UsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCkpIHtcbiAgICAgIGNvbnN0IGNoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBbY2hhbmdlXSk7XG4gICAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhZGQgaW1wb3J0IGZvciBlbnZpcm9ubWVudHNcbiAgICAvLyBpbXBvcnQgeyBlbnZpcm9ubWVudCB9IGZyb20gJy4uL2Vudmlyb25tZW50cy9lbnZpcm9ubWVudCc7XG4gICAgbW9kdWxlU291cmNlID0gZ2V0VHNTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IGVudmlyb25tZW50RXhwb3J0TmFtZSA9IGdldEVudmlyb25tZW50RXhwb3J0TmFtZShtb2R1bGVTb3VyY2UpO1xuICAgIC8vIGlmIGVudmlyb25lbW50IGltcG9ydCBhbHJlYWR5IGV4aXN0cyB0aGVuIHVzZSB0aGUgZm91bmQgb25lXG4gICAgLy8gb3RoZXJ3aXNlIHVzZSB0aGUgZGVmYXVsdCBuYW1lXG4gICAgaW1wb3J0TW9kdWxlID0gZW52aXJvbm1lbnRFeHBvcnROYW1lIHx8ICdlbnZpcm9ubWVudCc7XG4gICAgLy8gVE9ETzogZHluYW1pY2FsbHkgZmluZCBlbnZpcm9ubWVudHMgcmVsYXRpdmUgcGF0aFxuICAgIGltcG9ydFBhdGggPSAnLi4vZW52aXJvbm1lbnRzL2Vudmlyb25tZW50JztcblxuICAgIGlmICghZW52aXJvbm1lbnRFeHBvcnROYW1lKSB7XG4gICAgICAvLyBpZiBlbnZpcm9ubWVudCBpbXBvcnQgd2FzIG5vdCBmb3VuZCB0aGVuIGluc2VydCB0aGUgbmV3IG9uZVxuICAgICAgLy8gd2l0aCBkZWZhdWx0IHBhdGggYW5kIGRlZmF1bHQgZXhwb3J0IG5hbWVcbiAgICAgIGNvbnN0IGNoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIG1vZHVsZVBhdGgsIGltcG9ydE1vZHVsZSwgaW1wb3J0UGF0aCk7XG4gICAgICBpZiAoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBbY2hhbmdlXSk7XG4gICAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZWdpc3RlciBTVyBpbiBhcHBsaWNhdGlvbiBtb2R1bGVcbiAgICBjb25zdCBpbXBvcnRUZXh0ID0gdGFncy5zdHJpcEluZGVudGBcbiAgICAgIFNlcnZpY2VXb3JrZXJNb2R1bGUucmVnaXN0ZXIoJ25nc3ctd29ya2VyLmpzJywge1xuICAgICAgICBlbmFibGVkOiAke2ltcG9ydE1vZHVsZX0ucHJvZHVjdGlvbixcbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIFNlcnZpY2VXb3JrZXIgYXMgc29vbiBhcyB0aGUgYXBwbGljYXRpb24gaXMgc3RhYmxlXG4gICAgICAgIC8vIG9yIGFmdGVyIDMwIHNlY29uZHMgKHdoaWNoZXZlciBjb21lcyBmaXJzdCkuXG4gICAgICAgIHJlZ2lzdHJhdGlvblN0cmF0ZWd5OiAncmVnaXN0ZXJXaGVuU3RhYmxlOjMwMDAwJ1xuICAgICAgfSlcbiAgICBgO1xuICAgIG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBtb2R1bGVQYXRoKTtcbiAgICBjb25zdCBtZXRhZGF0YUNoYW5nZXMgPSBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gICAgICBtb2R1bGVTb3VyY2UsXG4gICAgICBtb2R1bGVQYXRoLFxuICAgICAgJ2ltcG9ydHMnLFxuICAgICAgaW1wb3J0VGV4dCxcbiAgICApO1xuICAgIGlmIChtZXRhZGF0YUNoYW5nZXMpIHtcbiAgICAgIGNvbnN0IHJlY29yZGVyID0gaG9zdC5iZWdpblVwZGF0ZShtb2R1bGVQYXRoKTtcbiAgICAgIGFwcGx5VG9VcGRhdGVSZWNvcmRlcihyZWNvcmRlciwgbWV0YWRhdGFDaGFuZ2VzKTtcbiAgICAgIGhvc3QuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9zdDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0VHNTb3VyY2VGaWxlKGhvc3Q6IFRyZWUsIHBhdGg6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCBidWZmZXIgPSBob3N0LnJlYWQocGF0aCk7XG4gIGlmICghYnVmZmVyKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYENvdWxkIG5vdCByZWFkIGZpbGUgKCR7cGF0aH0pLmApO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSBidWZmZXIudG9TdHJpbmcoKTtcbiAgY29uc3Qgc291cmNlID0gdHMuY3JlYXRlU291cmNlRmlsZShwYXRoLCBjb250ZW50LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcblxuICByZXR1cm4gc291cmNlO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogU2VydmljZVdvcmtlck9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBwcm9qZWN0IG5hbWUgKCR7b3B0aW9ucy5wcm9qZWN0fSlgKTtcbiAgICB9XG4gICAgaWYgKHByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFNlcnZpY2Ugd29ya2VyIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG4gICAgY29uc3QgYnVpbGRUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghYnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvcigpO1xuICAgIH1cbiAgICBjb25zdCBidWlsZE9wdGlvbnMgPSAoYnVpbGRUYXJnZXQub3B0aW9ucyB8fCB7fSkgYXMgdW5rbm93biBhcyBCcm93c2VyQnVpbGRlck9wdGlvbnM7XG4gICAgY29uc3Qgcm9vdCA9IHByb2plY3Qucm9vdDtcbiAgICBidWlsZE9wdGlvbnMuc2VydmljZVdvcmtlciA9IHRydWU7XG4gICAgYnVpbGRPcHRpb25zLm5nc3dDb25maWdQYXRoID0gam9pbihub3JtYWxpemUocm9vdCksICduZ3N3LWNvbmZpZy5qc29uJyk7XG5cbiAgICBsZXQgeyByZXNvdXJjZXNPdXRwdXRQYXRoID0gJycgfSA9IGJ1aWxkT3B0aW9ucztcbiAgICBpZiAocmVzb3VyY2VzT3V0cHV0UGF0aCkge1xuICAgICAgcmVzb3VyY2VzT3V0cHV0UGF0aCA9IG5vcm1hbGl6ZShgLyR7cmVzb3VyY2VzT3V0cHV0UGF0aH1gKTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHJlc291cmNlc091dHB1dFBhdGgsXG4gICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHByb2plY3Qucm9vdCksXG4gICAgICB9KSxcbiAgICAgIG1vdmUocHJvamVjdC5yb290KSxcbiAgICBdKTtcblxuICAgIGNvbnRleHQuYWRkVGFzayhuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzaygpKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2UpLFxuICAgICAgdXBkYXRlV29ya3NwYWNlKHdvcmtzcGFjZSksXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIHVwZGF0ZUFwcE1vZHVsZShidWlsZE9wdGlvbnMubWFpbiksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=