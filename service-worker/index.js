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
const standalone_1 = require("../private/standalone");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const utility_1 = require("../utility");
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
const dependencies_1 = require("../utility/dependencies");
const ng_ast_utils_1 = require("../utility/ng-ast-utils");
const paths_1 = require("../utility/paths");
const project_targets_1 = require("../utility/project-targets");
const workspace_models_1 = require("../utility/workspace-models");
function addDependencies() {
    return (host) => {
        const coreDep = (0, dependencies_1.getPackageJsonDependency)(host, '@angular/core');
        if (!coreDep) {
            throw new schematics_1.SchematicsException('Could not find "@angular/core" version.');
        }
        return (0, utility_1.addDependency)('@angular/service-worker', coreDep.version);
    };
}
function updateAppModule(mainPath) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        const modulePath = (0, ng_ast_utils_1.getAppModulePath)(host, mainPath);
        context.logger.debug(`module path: ${modulePath}`);
        addImport(host, modulePath, 'ServiceWorkerModule', '@angular/service-worker');
        addImport(host, modulePath, 'isDevMode', '@angular/core');
        // register SW in application module
        const importText = core_1.tags.stripIndent `
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000'
      })
    `;
        const moduleSource = getTsSourceFile(host, modulePath);
        const metadataChanges = (0, ast_utils_1.addSymbolToNgModuleMetadata)(moduleSource, modulePath, 'imports', importText);
        if (metadataChanges) {
            const recorder = host.beginUpdate(modulePath);
            (0, change_1.applyToUpdateRecorder)(recorder, metadataChanges);
            host.commitUpdate(recorder);
        }
        return host;
    };
}
function addProvideServiceWorker(mainPath) {
    return (host) => {
        const updatedFilePath = (0, standalone_1.addFunctionalProvidersToStandaloneBootstrap)(host, mainPath, 'provideServiceWorker', '@angular/service-worker', [
            ts.factory.createStringLiteral('ngsw-worker.js', true),
            ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment(ts.factory.createIdentifier('enabled'), ts.factory.createPrefixUnaryExpression(ts.SyntaxKind.ExclamationToken, ts.factory.createCallExpression(ts.factory.createIdentifier('isDevMode'), undefined, []))),
                ts.factory.createPropertyAssignment(ts.factory.createIdentifier('registrationStrategy'), ts.factory.createStringLiteral('registerWhenStable:30000', true)),
            ], true),
        ]);
        addImport(host, updatedFilePath, 'isDevMode', '@angular/core');
        return host;
    };
}
function getTsSourceFile(host, path) {
    const content = host.readText(path);
    const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
    return source;
}
function default_1(options) {
    return async (host) => {
        const workspace = await (0, utility_1.readWorkspace)(host);
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
        const buildOptions = buildTarget.options;
        let browserEntryPoint;
        let resourcesOutputPath = '';
        const ngswConfigPath = (0, core_1.join)((0, core_1.normalize)(project.root), 'ngsw-config.json');
        if (buildTarget.builder === workspace_models_1.Builders.Application) {
            browserEntryPoint = buildOptions.browser;
            resourcesOutputPath = '/media';
            const productionConf = buildTarget.configurations?.production;
            if (productionConf) {
                productionConf.serviceWorker = ngswConfigPath;
            }
        }
        else {
            browserEntryPoint = buildOptions.main;
            buildOptions.serviceWorker = true;
            buildOptions.ngswConfigPath = ngswConfigPath;
            if (buildOptions.resourcesOutputPath) {
                resourcesOutputPath = (0, core_1.normalize)(`/${buildOptions.resourcesOutputPath}`);
            }
        }
        await (0, utility_1.writeWorkspace)(host, workspace);
        return (0, schematics_1.chain)([
            addDependencies(),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                (0, schematics_1.applyTemplates)({
                    ...options,
                    resourcesOutputPath,
                    relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(project.root),
                }),
                (0, schematics_1.move)(project.root),
            ])),
            (0, ng_ast_utils_1.isStandaloneApp)(host, browserEntryPoint)
                ? addProvideServiceWorker(browserEntryPoint)
                : updateAppModule(browserEntryPoint),
        ]);
    };
}
exports.default = default_1;
function addImport(host, filePath, symbolName, moduleName) {
    const moduleSource = getTsSourceFile(host, filePath);
    const change = (0, ast_utils_1.insertImport)(moduleSource, filePath, symbolName, moduleName);
    if (change) {
        const recorder = host.beginUpdate(filePath);
        (0, change_1.applyToUpdateRecorder)(recorder, [change]);
        host.commitUpdate(recorder);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvc2VydmljZS13b3JrZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILCtDQUE2RDtBQUM3RCwyREFXb0M7QUFDcEMsc0RBQW9GO0FBQ3BGLGtHQUFvRjtBQUNwRix3Q0FBMEU7QUFDMUUsb0RBQWlGO0FBQ2pGLDhDQUEwRDtBQUMxRCwwREFBbUU7QUFDbkUsMERBQTRFO0FBQzVFLDRDQUErRDtBQUMvRCxnRUFBc0U7QUFDdEUsa0VBQXVEO0FBR3ZELFNBQVMsZUFBZTtJQUN0QixPQUFPLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEIsTUFBTSxPQUFPLEdBQUcsSUFBQSx1Q0FBd0IsRUFBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1NBQzFFO1FBRUQsT0FBTyxJQUFBLHVCQUFhLEVBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25FLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxRQUFnQjtJQUN2QyxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sVUFBVSxHQUFHLElBQUEsK0JBQWdCLEVBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRW5ELFNBQVMsQ0FBQyxJQUFJLEVBQUUs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UUFBUSxDQUFDLENBQUM7S0FDN0I7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhZGRGdW5jdGlvbmFsUHJvdmlkZXJzVG9TdGFuZGFsb25lQm9vdHN0cmFwIH0gZnJvbSAnLi4vcHJpdmF0ZS9zdGFuZGFsb25lJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgYWRkRGVwZW5kZW5jeSwgcmVhZFdvcmtzcGFjZSwgd3JpdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5JztcbmltcG9ydCB7IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YSwgaW5zZXJ0SW1wb3J0IH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgYXBwbHlUb1VwZGF0ZVJlY29yZGVyIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuaW1wb3J0IHsgZ2V0UGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgZ2V0QXBwTW9kdWxlUGF0aCwgaXNTdGFuZGFsb25lQXBwIH0gZnJvbSAnLi4vdXRpbGl0eS9uZy1hc3QtdXRpbHMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyB0YXJnZXRCdWlsZE5vdEZvdW5kRXJyb3IgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QtdGFyZ2V0cyc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgU2VydmljZVdvcmtlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZERlcGVuZGVuY2llcygpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgY29yZURlcCA9IGdldFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCAnQGFuZ3VsYXIvY29yZScpO1xuICAgIGlmICghY29yZURlcCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0NvdWxkIG5vdCBmaW5kIFwiQGFuZ3VsYXIvY29yZVwiIHZlcnNpb24uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFkZERlcGVuZGVuY3koJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJywgY29yZURlcC52ZXJzaW9uKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQXBwTW9kdWxlKG1haW5QYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ1VwZGF0aW5nIGFwcG1vZHVsZScpO1xuXG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IGdldEFwcE1vZHVsZVBhdGgoaG9zdCwgbWFpblBhdGgpO1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKGBtb2R1bGUgcGF0aDogJHttb2R1bGVQYXRofWApO1xuXG4gICAgYWRkSW1wb3J0KGhvc3QsIG1vZHVsZVBhdGgsICdTZXJ2aWNlV29ya2VyTW9kdWxlJywgJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJyk7XG4gICAgYWRkSW1wb3J0KGhvc3QsIG1vZHVsZVBhdGgsICdpc0Rldk1vZGUnLCAnQGFuZ3VsYXIvY29yZScpO1xuXG4gICAgLy8gcmVnaXN0ZXIgU1cgaW4gYXBwbGljYXRpb24gbW9kdWxlXG4gICAgY29uc3QgaW1wb3J0VGV4dCA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICBTZXJ2aWNlV29ya2VyTW9kdWxlLnJlZ2lzdGVyKCduZ3N3LXdvcmtlci5qcycsIHtcbiAgICAgICAgZW5hYmxlZDogIWlzRGV2TW9kZSgpLFxuICAgICAgICAvLyBSZWdpc3RlciB0aGUgU2VydmljZVdvcmtlciBhcyBzb29uIGFzIHRoZSBhcHBsaWNhdGlvbiBpcyBzdGFibGVcbiAgICAgICAgLy8gb3IgYWZ0ZXIgMzAgc2Vjb25kcyAod2hpY2hldmVyIGNvbWVzIGZpcnN0KS5cbiAgICAgICAgcmVnaXN0cmF0aW9uU3RyYXRlZ3k6ICdyZWdpc3RlcldoZW5TdGFibGU6MzAwMDAnXG4gICAgICB9KVxuICAgIGA7XG4gICAgY29uc3QgbW9kdWxlU291cmNlID0gZ2V0VHNTb3VyY2VGaWxlKGhvc3QsIG1vZHVsZVBhdGgpO1xuICAgIGNvbnN0IG1ldGFkYXRhQ2hhbmdlcyA9IGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShcbiAgICAgIG1vZHVsZVNvdXJjZSxcbiAgICAgIG1vZHVsZVBhdGgsXG4gICAgICAnaW1wb3J0cycsXG4gICAgICBpbXBvcnRUZXh0LFxuICAgICk7XG4gICAgaWYgKG1ldGFkYXRhQ2hhbmdlcykge1xuICAgICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKG1vZHVsZVBhdGgpO1xuICAgICAgYXBwbHlUb1VwZGF0ZVJlY29yZGVyKHJlY29yZGVyLCBtZXRhZGF0YUNoYW5nZXMpO1xuICAgICAgaG9zdC5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICAgIH1cblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRQcm92aWRlU2VydmljZVdvcmtlcihtYWluUGF0aDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHVwZGF0ZWRGaWxlUGF0aCA9IGFkZEZ1bmN0aW9uYWxQcm92aWRlcnNUb1N0YW5kYWxvbmVCb290c3RyYXAoXG4gICAgICBob3N0LFxuICAgICAgbWFpblBhdGgsXG4gICAgICAncHJvdmlkZVNlcnZpY2VXb3JrZXInLFxuICAgICAgJ0Bhbmd1bGFyL3NlcnZpY2Utd29ya2VyJyxcbiAgICAgIFtcbiAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVTdHJpbmdMaXRlcmFsKCduZ3N3LXdvcmtlci5qcycsIHRydWUpLFxuICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZU9iamVjdExpdGVyYWxFeHByZXNzaW9uKFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoJ2VuYWJsZWQnKSxcbiAgICAgICAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVQcmVmaXhVbmFyeUV4cHJlc3Npb24oXG4gICAgICAgICAgICAgICAgdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvblRva2VuLFxuICAgICAgICAgICAgICAgIHRzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgICAgICAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoJ2lzRGV2TW9kZScpLFxuICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgW10sXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKCdyZWdpc3RyYXRpb25TdHJhdGVneScpLFxuICAgICAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZVN0cmluZ0xpdGVyYWwoJ3JlZ2lzdGVyV2hlblN0YWJsZTozMDAwMCcsIHRydWUpLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHRydWUsXG4gICAgICAgICksXG4gICAgICBdLFxuICAgICk7XG5cbiAgICBhZGRJbXBvcnQoaG9zdCwgdXBkYXRlZEZpbGVQYXRoLCAnaXNEZXZNb2RlJywgJ0Bhbmd1bGFyL2NvcmUnKTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRUc1NvdXJjZUZpbGUoaG9zdDogVHJlZSwgcGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IGNvbnRlbnQgPSBob3N0LnJlYWRUZXh0KHBhdGgpO1xuICBjb25zdCBzb3VyY2UgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIGNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUpO1xuXG4gIHJldHVybiBzb3VyY2U7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBTZXJ2aWNlV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCByZWFkV29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBwcm9qZWN0IG5hbWUgKCR7b3B0aW9ucy5wcm9qZWN0fSlgKTtcbiAgICB9XG4gICAgaWYgKHByb2plY3QuZXh0ZW5zaW9ucy5wcm9qZWN0VHlwZSAhPT0gJ2FwcGxpY2F0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFNlcnZpY2Ugd29ya2VyIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG4gICAgY29uc3QgYnVpbGRUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgIGlmICghYnVpbGRUYXJnZXQpIHtcbiAgICAgIHRocm93IHRhcmdldEJ1aWxkTm90Rm91bmRFcnJvcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkT3B0aW9ucyA9IGJ1aWxkVGFyZ2V0Lm9wdGlvbnMgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgYm9vbGVhbj47XG4gICAgbGV0IGJyb3dzZXJFbnRyeVBvaW50OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgbGV0IHJlc291cmNlc091dHB1dFBhdGggPSAnJztcbiAgICBjb25zdCBuZ3N3Q29uZmlnUGF0aCA9IGpvaW4obm9ybWFsaXplKHByb2plY3Qucm9vdCksICduZ3N3LWNvbmZpZy5qc29uJyk7XG5cbiAgICBpZiAoYnVpbGRUYXJnZXQuYnVpbGRlciA9PT0gQnVpbGRlcnMuQXBwbGljYXRpb24pIHtcbiAgICAgIGJyb3dzZXJFbnRyeVBvaW50ID0gYnVpbGRPcHRpb25zLmJyb3dzZXIgYXMgc3RyaW5nO1xuICAgICAgcmVzb3VyY2VzT3V0cHV0UGF0aCA9ICcvbWVkaWEnO1xuICAgICAgY29uc3QgcHJvZHVjdGlvbkNvbmYgPSBidWlsZFRhcmdldC5jb25maWd1cmF0aW9ucz8ucHJvZHVjdGlvbjtcbiAgICAgIGlmIChwcm9kdWN0aW9uQ29uZikge1xuICAgICAgICBwcm9kdWN0aW9uQ29uZi5zZXJ2aWNlV29ya2VyID0gbmdzd0NvbmZpZ1BhdGg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyb3dzZXJFbnRyeVBvaW50ID0gYnVpbGRPcHRpb25zLm1haW4gYXMgc3RyaW5nO1xuICAgICAgYnVpbGRPcHRpb25zLnNlcnZpY2VXb3JrZXIgPSB0cnVlO1xuICAgICAgYnVpbGRPcHRpb25zLm5nc3dDb25maWdQYXRoID0gbmdzd0NvbmZpZ1BhdGg7XG4gICAgICBpZiAoYnVpbGRPcHRpb25zLnJlc291cmNlc091dHB1dFBhdGgpIHtcbiAgICAgICAgcmVzb3VyY2VzT3V0cHV0UGF0aCA9IG5vcm1hbGl6ZShgLyR7YnVpbGRPcHRpb25zLnJlc291cmNlc091dHB1dFBhdGh9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgd3JpdGVXb3Jrc3BhY2UoaG9zdCwgd29ya3NwYWNlKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGREZXBlbmRlbmNpZXMoKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgcmVzb3VyY2VzT3V0cHV0UGF0aCxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHByb2plY3Qucm9vdCksXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShwcm9qZWN0LnJvb3QpLFxuICAgICAgICBdKSxcbiAgICAgICksXG4gICAgICBpc1N0YW5kYWxvbmVBcHAoaG9zdCwgYnJvd3NlckVudHJ5UG9pbnQpXG4gICAgICAgID8gYWRkUHJvdmlkZVNlcnZpY2VXb3JrZXIoYnJvd3NlckVudHJ5UG9pbnQpXG4gICAgICAgIDogdXBkYXRlQXBwTW9kdWxlKGJyb3dzZXJFbnRyeVBvaW50KSxcbiAgICBdKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkSW1wb3J0KGhvc3Q6IFRyZWUsIGZpbGVQYXRoOiBzdHJpbmcsIHN5bWJvbE5hbWU6IHN0cmluZywgbW9kdWxlTmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IG1vZHVsZVNvdXJjZSA9IGdldFRzU291cmNlRmlsZShob3N0LCBmaWxlUGF0aCk7XG4gIGNvbnN0IGNoYW5nZSA9IGluc2VydEltcG9ydChtb2R1bGVTb3VyY2UsIGZpbGVQYXRoLCBzeW1ib2xOYW1lLCBtb2R1bGVOYW1lKTtcblxuICBpZiAoY2hhbmdlKSB7XG4gICAgY29uc3QgcmVjb3JkZXIgPSBob3N0LmJlZ2luVXBkYXRlKGZpbGVQYXRoKTtcbiAgICBhcHBseVRvVXBkYXRlUmVjb3JkZXIocmVjb3JkZXIsIFtjaGFuZ2VdKTtcbiAgICBob3N0LmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG4gIH1cbn1cbiJdfQ==