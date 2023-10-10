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
                        options['buildTarget'] = options['browserTarget'];
                        delete options['browserTarget'];
                    }
                }
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXdvcmtzcGFjZS1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTcvdXBkYXRlLXdvcmtzcGFjZS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFJSCx1REFBNEU7QUFDNUUscUVBQXVFO0FBRXZFO0lBQ0UsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDNUMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsS0FBSyw4QkFBVyxDQUFDLFdBQVcsRUFBRTtnQkFDOUQsZ0dBQWdHO2dCQUNoRyxTQUFTO2FBQ1Y7WUFFRCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hDLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSywyQkFBUSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLDJCQUFRLENBQUMsU0FBUyxFQUFFO29CQUNwRixLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUEsNEJBQWdCLEVBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO3dCQUN6RCxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUNsRCxPQUFPLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztxQkFDakM7aUJBQ0Y7YUFDRjtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBbEJELDRCQWtCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlLCBjaGFpbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IHJlbW92ZVBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IGFsbFRhcmdldE9wdGlvbnMsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzLCBQcm9qZWN0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgZm9yIChjb25zdCBbLCBwcm9qZWN0XSBvZiB3b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgIGlmIChwcm9qZWN0LmV4dGVuc2lvbnMucHJvamVjdFR5cGUgIT09IFByb2plY3RUeXBlLkFwcGxpY2F0aW9uKSB7XG4gICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBhcHBsaWNhdGlvbiBwcm9qZWN0cyBzaW5jZSB0aGVzZSBjaGFuZ2VzIG9ubHkgZWZmZWN0cyBhcHBsaWNhdGlvbiBidWlsZGVyc1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBbLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICBpZiAodGFyZ2V0LmJ1aWxkZXIgPT09IEJ1aWxkZXJzLkV4dHJhY3RJMThuIHx8IHRhcmdldC5idWlsZGVyID09PSBCdWlsZGVycy5EZXZTZXJ2ZXIpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFssIG9wdGlvbnNdIG9mIGFsbFRhcmdldE9wdGlvbnModGFyZ2V0LCBmYWxzZSkpIHtcbiAgICAgICAgICAgIG9wdGlvbnNbJ2J1aWxkVGFyZ2V0J10gPSBvcHRpb25zWydicm93c2VyVGFyZ2V0J107XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9uc1snYnJvd3NlclRhcmdldCddO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG4iXX0=