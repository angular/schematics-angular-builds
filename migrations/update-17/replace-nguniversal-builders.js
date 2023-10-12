"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const dependencies_1 = require("../../utility/dependencies");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return (0, schematics_1.chain)([
        (0, workspace_1.updateWorkspace)((workspace) => {
            for (const [, project] of workspace.projects) {
                if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                    // Only interested in application projects since these changes only effects application builders
                    continue;
                }
                for (const [, target] of project.targets) {
                    if (target.builder === '@nguniversal/builders:ssr-dev-server') {
                        target.builder = '@angular-devkit/build-angular:ssr-dev-server';
                    }
                    else if (target.builder === '@nguniversal/builders:prerender') {
                        target.builder = '@angular-devkit/build-angular:prerender';
                        for (const [, options] of (0, workspace_1.allTargetOptions)(target, false)) {
                            // Remove and replace builder options
                            if (options['guessRoutes'] !== undefined) {
                                options['discoverRoutes'] = options['guessRoutes'];
                                delete options['guessRoutes'];
                            }
                            if (options['numProcesses'] !== undefined) {
                                delete options['numProcesses'];
                            }
                        }
                    }
                }
            }
        }),
        (host) => {
            (0, dependencies_1.removePackageJsonDependency)(host, '@nguniversal/builders');
        },
    ]);
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1uZ3VuaXZlcnNhbC1idWlsZGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xNy9yZXBsYWNlLW5ndW5pdmVyc2FsLWJ1aWxkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsMkRBQXlEO0FBQ3pELDZEQUF5RTtBQUN6RSx1REFBNEU7QUFDNUUscUVBQTZEO0FBRTdEO0lBQ0UsT0FBTyxJQUFBLGtCQUFLLEVBQUM7UUFDWCxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUM1QixLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7Z0JBQzVDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEtBQUssOEJBQVcsQ0FBQyxXQUFXLEVBQUU7b0JBQzlELGdHQUFnRztvQkFDaEcsU0FBUztpQkFDVjtnQkFFRCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7b0JBQ3hDLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxzQ0FBc0MsRUFBRTt3QkFDN0QsTUFBTSxDQUFDLE9BQU8sR0FBRyw4Q0FBOEMsQ0FBQztxQkFDakU7eUJBQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLGlDQUFpQyxFQUFFO3dCQUMvRCxNQUFNLENBQUMsT0FBTyxHQUFHLHlDQUF5QyxDQUFDO3dCQUMzRCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUEsNEJBQWdCLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFOzRCQUN6RCxxQ0FBcUM7NEJBQ3JDLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLFNBQVMsRUFBRTtnQ0FDeEMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dDQUNuRCxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDL0I7NEJBRUQsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssU0FBUyxFQUFFO2dDQUN6QyxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQzs2QkFDaEM7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtRQUNILENBQUMsQ0FBQztRQUNGLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDUCxJQUFBLDBDQUEyQixFQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQzdELENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBakNELDRCQWlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlLCBjaGFpbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGFsbFRhcmdldE9wdGlvbnMsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IFByb2plY3RUeXBlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gY2hhaW4oW1xuICAgIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IFssIHByb2plY3RdIG9mIHdvcmtzcGFjZS5wcm9qZWN0cykge1xuICAgICAgICBpZiAocHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSBQcm9qZWN0VHlwZS5BcHBsaWNhdGlvbikge1xuICAgICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBhcHBsaWNhdGlvbiBwcm9qZWN0cyBzaW5jZSB0aGVzZSBjaGFuZ2VzIG9ubHkgZWZmZWN0cyBhcHBsaWNhdGlvbiBidWlsZGVyc1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICAgIGlmICh0YXJnZXQuYnVpbGRlciA9PT0gJ0BuZ3VuaXZlcnNhbC9idWlsZGVyczpzc3ItZGV2LXNlcnZlcicpIHtcbiAgICAgICAgICAgIHRhcmdldC5idWlsZGVyID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnNzci1kZXYtc2VydmVyJztcbiAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5idWlsZGVyID09PSAnQG5ndW5pdmVyc2FsL2J1aWxkZXJzOnByZXJlbmRlcicpIHtcbiAgICAgICAgICAgIHRhcmdldC5idWlsZGVyID0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnByZXJlbmRlcic7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFssIG9wdGlvbnNdIG9mIGFsbFRhcmdldE9wdGlvbnModGFyZ2V0LCBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFuZCByZXBsYWNlIGJ1aWxkZXIgb3B0aW9uc1xuICAgICAgICAgICAgICBpZiAob3B0aW9uc1snZ3Vlc3NSb3V0ZXMnXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uc1snZGlzY292ZXJSb3V0ZXMnXSA9IG9wdGlvbnNbJ2d1ZXNzUm91dGVzJ107XG4gICAgICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnNbJ2d1ZXNzUm91dGVzJ107XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAob3B0aW9uc1snbnVtUHJvY2Vzc2VzJ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zWydudW1Qcm9jZXNzZXMnXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLFxuICAgIChob3N0KSA9PiB7XG4gICAgICByZW1vdmVQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgJ0BuZ3VuaXZlcnNhbC9idWlsZGVycycpO1xuICAgIH0sXG4gIF0pO1xufVxuIl19