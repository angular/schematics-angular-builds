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
        for (const project of workspace.projects.values()) {
            for (const target of project.targets.values()) {
                if (target.builder !== workspace_models_1.Builders.Server) {
                    continue;
                }
                for (const [name, options] of (0, workspace_1.allTargetOptions)(target)) {
                    delete options.bundleDependencies;
                    if (name === 'development') {
                        options.vendorChunk ?? (options.vendorChunk = true);
                    }
                }
            }
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXdvcmtzcGFjZS1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTUvdXBkYXRlLXdvcmtzcGFjZS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFHSCx1REFBNEU7QUFDNUUscUVBQTBEO0FBRTFEO0lBQ0UsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxLQUFLLE1BQU0sT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUM3QyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssMkJBQVEsQ0FBQyxNQUFNLEVBQUU7b0JBQ3RDLFNBQVM7aUJBQ1Y7Z0JBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUEsNEJBQWdCLEVBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQ3RELE9BQU8sT0FBTyxDQUFDLGtCQUFrQixDQUFDO29CQUVsQyxJQUFJLElBQUksS0FBSyxhQUFhLEVBQUU7d0JBQzFCLE9BQU8sQ0FBQyxXQUFXLEtBQW5CLE9BQU8sQ0FBQyxXQUFXLEdBQUssSUFBSSxFQUFDO3FCQUM5QjtpQkFDRjthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFsQkQsNEJBa0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBhbGxUYXJnZXRPcHRpb25zLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgZm9yIChjb25zdCBwcm9qZWN0IG9mIHdvcmtzcGFjZS5wcm9qZWN0cy52YWx1ZXMoKSkge1xuICAgICAgZm9yIChjb25zdCB0YXJnZXQgb2YgcHJvamVjdC50YXJnZXRzLnZhbHVlcygpKSB7XG4gICAgICAgIGlmICh0YXJnZXQuYnVpbGRlciAhPT0gQnVpbGRlcnMuU2VydmVyKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCBvcHRpb25zXSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCkpIHtcbiAgICAgICAgICBkZWxldGUgb3B0aW9ucy5idW5kbGVEZXBlbmRlbmNpZXM7XG5cbiAgICAgICAgICBpZiAobmFtZSA9PT0gJ2RldmVsb3BtZW50Jykge1xuICAgICAgICAgICAgb3B0aW9ucy52ZW5kb3JDaHVuayA/Pz0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl19