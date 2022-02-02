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
/** Migration to remove 'showCircularDependencies' option from browser and server builders. */
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        for (const project of workspace.projects.values()) {
            for (const target of project.targets.values()) {
                if (target.builder === '@angular-devkit/build-angular:server' ||
                    target.builder === '@angular-devkit/build-angular:browser') {
                    for (const [, options] of (0, workspace_1.allTargetOptions)(target)) {
                        delete options.showCircularDependencies;
                    }
                }
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3ZlLXNob3ctY2lyY3VsYXItZGVwZW5kZW5jaWVzLW9wdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xNC9yZW1vdmUtc2hvdy1jaXJjdWxhci1kZXBlbmRlbmNpZXMtb3B0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBR0gsdURBQTRFO0FBRTVFLDhGQUE4RjtBQUM5RjtJQUNFLE9BQU8sSUFBQSwyQkFBZSxFQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7UUFDbkMsS0FBSyxNQUFNLE9BQU8sSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDN0MsSUFDRSxNQUFNLENBQUMsT0FBTyxLQUFLLHNDQUFzQztvQkFDekQsTUFBTSxDQUFDLE9BQU8sS0FBSyx1Q0FBdUMsRUFDMUQ7b0JBQ0EsS0FBSyxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxJQUFBLDRCQUFnQixFQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUNsRCxPQUFPLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQztxQkFDekM7aUJBQ0Y7YUFDRjtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBZkQsNEJBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGFsbFRhcmdldE9wdGlvbnMsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcblxuLyoqIE1pZ3JhdGlvbiB0byByZW1vdmUgJ3Nob3dDaXJjdWxhckRlcGVuZGVuY2llcycgb3B0aW9uIGZyb20gYnJvd3NlciBhbmQgc2VydmVyIGJ1aWxkZXJzLiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKCh3b3Jrc3BhY2UpID0+IHtcbiAgICBmb3IgKGNvbnN0IHByb2plY3Qgb2Ygd29ya3NwYWNlLnByb2plY3RzLnZhbHVlcygpKSB7XG4gICAgICBmb3IgKGNvbnN0IHRhcmdldCBvZiBwcm9qZWN0LnRhcmdldHMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRhcmdldC5idWlsZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6c2VydmVyJyB8fFxuICAgICAgICAgIHRhcmdldC5idWlsZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXI6YnJvd3NlcidcbiAgICAgICAgKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBbLCBvcHRpb25zXSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zLnNob3dDaXJjdWxhckRlcGVuZGVuY2llcztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19