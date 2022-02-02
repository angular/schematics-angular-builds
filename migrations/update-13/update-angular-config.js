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
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        for (const [, project] of workspace.projects) {
            for (const [name, target] of project.targets) {
                // Delete removed tslint builder
                if (target.builder === '@angular-devkit/build-angular:tslint') {
                    project.targets.delete(name);
                }
                else if (target.builder === '@angular-devkit/build-angular:dev-server') {
                    for (const [, options] of (0, workspace_1.allTargetOptions)(target)) {
                        delete options.optimization;
                        delete options.aot;
                        delete options.progress;
                        delete options.deployUrl;
                        delete options.sourceMap;
                        delete options.vendorChunk;
                        delete options.commonChunk;
                        delete options.baseHref;
                        delete options.servePathDefaultWarning;
                        delete options.hmrWarning;
                    }
                }
                else if (target.builder.startsWith('@angular-devkit/build-angular')) {
                    // Only interested in Angular Devkit builders
                    for (const [, options] of (0, workspace_1.allTargetOptions)(target)) {
                        delete options.extractCss;
                    }
                }
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWFuZ3VsYXItY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTEzL3VwZGF0ZS1hbmd1bGFyLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUdILHVEQUE0RTtBQUU1RTtJQUNFLE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFO1lBQzVDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUM1QyxnQ0FBZ0M7Z0JBQ2hDLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxzQ0FBc0MsRUFBRTtvQkFDN0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzlCO3FCQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSywwQ0FBMEMsRUFBRTtvQkFDeEUsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFBLDRCQUFnQixFQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUNsRCxPQUFPLE9BQU8sQ0FBQyxZQUFZLENBQUM7d0JBQzVCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQzt3QkFDbkIsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDO3dCQUN4QixPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUM7d0JBQ3pCLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQzt3QkFDekIsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDO3dCQUMzQixPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUM7d0JBQzNCLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQzt3QkFDeEIsT0FBTyxPQUFPLENBQUMsdUJBQXVCLENBQUM7d0JBQ3ZDLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQztxQkFDM0I7aUJBQ0Y7cUJBQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFO29CQUNyRSw2Q0FBNkM7b0JBQzdDLEtBQUssTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBQSw0QkFBZ0IsRUFBQyxNQUFNLENBQUMsRUFBRTt3QkFDbEQsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDO3FCQUMzQjtpQkFDRjthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE3QkQsNEJBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhbGxUYXJnZXRPcHRpb25zLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgZm9yIChjb25zdCBbLCBwcm9qZWN0XSBvZiB3b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgIGZvciAoY29uc3QgW25hbWUsIHRhcmdldF0gb2YgcHJvamVjdC50YXJnZXRzKSB7XG4gICAgICAgIC8vIERlbGV0ZSByZW1vdmVkIHRzbGludCBidWlsZGVyXG4gICAgICAgIGlmICh0YXJnZXQuYnVpbGRlciA9PT0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyOnRzbGludCcpIHtcbiAgICAgICAgICBwcm9qZWN0LnRhcmdldHMuZGVsZXRlKG5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5idWlsZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6ZGV2LXNlcnZlcicpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IFssIG9wdGlvbnNdIG9mIGFsbFRhcmdldE9wdGlvbnModGFyZ2V0KSkge1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMub3B0aW1pemF0aW9uO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuYW90O1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMucHJvZ3Jlc3M7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5kZXBsb3lVcmw7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5zb3VyY2VNYXA7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy52ZW5kb3JDaHVuaztcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zLmNvbW1vbkNodW5rO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuYmFzZUhyZWY7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5zZXJ2ZVBhdGhEZWZhdWx0V2FybmluZztcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zLmhtcldhcm5pbmc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5idWlsZGVyLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJykpIHtcbiAgICAgICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gQW5ndWxhciBEZXZraXQgYnVpbGRlcnNcbiAgICAgICAgICBmb3IgKGNvbnN0IFssIG9wdGlvbnNdIG9mIGFsbFRhcmdldE9wdGlvbnModGFyZ2V0KSkge1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuZXh0cmFjdENzcztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19