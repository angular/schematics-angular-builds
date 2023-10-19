"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        for (const [, project] of workspace.projects) {
            if (project.extensions.projectType !== workspace_models_1.ProjectType.Application) {
                // Only interested in application projects since these changes only effects application builders
                continue;
            }
            for (const [, target] of project.targets) {
                if (target.builder === workspace_models_1.Builders.ExtractI18n || target.builder === workspace_models_1.Builders.DevServer) {
                    for (const [, options] of (0, workspace_1.allTargetOptions)(target, false)) {
                        if (options['browserTarget'] !== undefined) {
                            options['buildTarget'] = options['browserTarget'];
                            delete options['browserTarget'];
                        }
                    }
                }
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXdvcmtzcGFjZS1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTcvdXBkYXRlLXdvcmtzcGFjZS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCx1REFBNEU7QUFDNUUscUVBQXVFO0FBRXZFO0lBQ0UsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDNUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsS0FBSyw4QkFBVyxDQUFDLFdBQVcsRUFBRTtnQkFDOUQsZ0dBQWdHO2dCQUNoRyxTQUFTO2FBQ1Y7WUFFRCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hDLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSywyQkFBUSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLDJCQUFRLENBQUMsU0FBUyxFQUFFO29CQUNwRixLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUEsNEJBQWdCLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUN6RCxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxTQUFTLEVBQUU7NEJBQzFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7NEJBQ2xELE9BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3lCQUNqQztxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFwQkQsNEJBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhbGxUYXJnZXRPcHRpb25zLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycywgUHJvamVjdFR5cGUgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGZvciAoY29uc3QgWywgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBpZiAocHJvamVjdC5leHRlbnNpb25zLnByb2plY3RUeXBlICE9PSBQcm9qZWN0VHlwZS5BcHBsaWNhdGlvbikge1xuICAgICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gYXBwbGljYXRpb24gcHJvamVjdHMgc2luY2UgdGhlc2UgY2hhbmdlcyBvbmx5IGVmZmVjdHMgYXBwbGljYXRpb24gYnVpbGRlcnNcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgWywgdGFyZ2V0XSBvZiBwcm9qZWN0LnRhcmdldHMpIHtcbiAgICAgICAgaWYgKHRhcmdldC5idWlsZGVyID09PSBCdWlsZGVycy5FeHRyYWN0STE4biB8fCB0YXJnZXQuYnVpbGRlciA9PT0gQnVpbGRlcnMuRGV2U2VydmVyKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBbLCBvcHRpb25zXSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCwgZmFsc2UpKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uc1snYnJvd3NlclRhcmdldCddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgb3B0aW9uc1snYnVpbGRUYXJnZXQnXSA9IG9wdGlvbnNbJ2Jyb3dzZXJUYXJnZXQnXTtcbiAgICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnNbJ2Jyb3dzZXJUYXJnZXQnXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19