"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const workspace_1 = require("../../utility/workspace");
function default_1() {
    return (0, workspace_1.updateWorkspace)((workspace) => {
        // Update root level schematics options if present
        const rootSchematics = workspace.extensions.schematics;
        if (rootSchematics && core_1.json.isJsonObject(rootSchematics)) {
            updateSchematicsField(rootSchematics);
        }
        // Update project level schematics options if present
        for (const [, project] of workspace.projects) {
            const projectSchematics = project.extensions.schematics;
            if (projectSchematics && core_1.json.isJsonObject(projectSchematics)) {
                updateSchematicsField(projectSchematics);
            }
        }
    });
}
exports.default = default_1;
function updateSchematicsField(schematics) {
    for (const [schematicName, schematicOptions] of Object.entries(schematics)) {
        if (!core_1.json.isJsonObject(schematicOptions)) {
            continue;
        }
        if (schematicName.startsWith('@schematics/angular')) {
            delete schematicOptions.lintFix;
        }
        switch (schematicName) {
            case '@schematics/angular:service-worker':
                delete schematicOptions.configuration;
                break;
            case '@schematics/angular:web-worker':
                delete schematicOptions.target;
                break;
            case '@schematics/angular:application':
                delete schematicOptions.legacyBrowsers;
                break;
            default:
                break;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZW1hdGljLW9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTMvc2NoZW1hdGljLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBNEM7QUFFNUMsdURBQTBEO0FBRTFEO0lBQ0UsT0FBTyxJQUFBLDJCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxrREFBa0Q7UUFDbEQsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDdkQsSUFBSSxjQUFjLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUN2RCxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUN2QztRQUVELHFEQUFxRDtRQUNyRCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUN4RCxJQUFJLGlCQUFpQixJQUFJLFdBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDN0QscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQzthQUMxQztTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBaEJELDRCQWdCQztBQUVELFNBQVMscUJBQXFCLENBQUMsVUFBMkI7SUFDeEQsS0FBSyxNQUFNLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUMxRSxJQUFJLENBQUMsV0FBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ3hDLFNBQVM7U0FDVjtRQUVELElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ25ELE9BQU8sZ0JBQWdCLENBQUMsT0FBTyxDQUFDO1NBQ2pDO1FBRUQsUUFBUSxhQUFhLEVBQUU7WUFDckIsS0FBSyxvQ0FBb0M7Z0JBQ3ZDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDO2dCQUN0QyxNQUFNO1lBQ1IsS0FBSyxnQ0FBZ0M7Z0JBQ25DLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxDQUFDO2dCQUMvQixNQUFNO1lBQ1IsS0FBSyxpQ0FBaUM7Z0JBQ3BDLE9BQU8sZ0JBQWdCLENBQUMsY0FBYyxDQUFDO2dCQUN2QyxNQUFNO1lBQ1I7Z0JBQ0UsTUFBTTtTQUNUO0tBQ0Y7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBSdWxlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIC8vIFVwZGF0ZSByb290IGxldmVsIHNjaGVtYXRpY3Mgb3B0aW9ucyBpZiBwcmVzZW50XG4gICAgY29uc3Qgcm9vdFNjaGVtYXRpY3MgPSB3b3Jrc3BhY2UuZXh0ZW5zaW9ucy5zY2hlbWF0aWNzO1xuICAgIGlmIChyb290U2NoZW1hdGljcyAmJiBqc29uLmlzSnNvbk9iamVjdChyb290U2NoZW1hdGljcykpIHtcbiAgICAgIHVwZGF0ZVNjaGVtYXRpY3NGaWVsZChyb290U2NoZW1hdGljcyk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHByb2plY3QgbGV2ZWwgc2NoZW1hdGljcyBvcHRpb25zIGlmIHByZXNlbnRcbiAgICBmb3IgKGNvbnN0IFssIHByb2plY3RdIG9mIHdvcmtzcGFjZS5wcm9qZWN0cykge1xuICAgICAgY29uc3QgcHJvamVjdFNjaGVtYXRpY3MgPSBwcm9qZWN0LmV4dGVuc2lvbnMuc2NoZW1hdGljcztcbiAgICAgIGlmIChwcm9qZWN0U2NoZW1hdGljcyAmJiBqc29uLmlzSnNvbk9iamVjdChwcm9qZWN0U2NoZW1hdGljcykpIHtcbiAgICAgICAgdXBkYXRlU2NoZW1hdGljc0ZpZWxkKHByb2plY3RTY2hlbWF0aWNzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTY2hlbWF0aWNzRmllbGQoc2NoZW1hdGljczoganNvbi5Kc29uT2JqZWN0KTogdm9pZCB7XG4gIGZvciAoY29uc3QgW3NjaGVtYXRpY05hbWUsIHNjaGVtYXRpY09wdGlvbnNdIG9mIE9iamVjdC5lbnRyaWVzKHNjaGVtYXRpY3MpKSB7XG4gICAgaWYgKCFqc29uLmlzSnNvbk9iamVjdChzY2hlbWF0aWNPcHRpb25zKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHNjaGVtYXRpY05hbWUuc3RhcnRzV2l0aCgnQHNjaGVtYXRpY3MvYW5ndWxhcicpKSB7XG4gICAgICBkZWxldGUgc2NoZW1hdGljT3B0aW9ucy5saW50Rml4O1xuICAgIH1cblxuICAgIHN3aXRjaCAoc2NoZW1hdGljTmFtZSkge1xuICAgICAgY2FzZSAnQHNjaGVtYXRpY3MvYW5ndWxhcjpzZXJ2aWNlLXdvcmtlcic6XG4gICAgICAgIGRlbGV0ZSBzY2hlbWF0aWNPcHRpb25zLmNvbmZpZ3VyYXRpb247XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnQHNjaGVtYXRpY3MvYW5ndWxhcjp3ZWItd29ya2VyJzpcbiAgICAgICAgZGVsZXRlIHNjaGVtYXRpY09wdGlvbnMudGFyZ2V0O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0BzY2hlbWF0aWNzL2FuZ3VsYXI6YXBwbGljYXRpb24nOlxuICAgICAgICBkZWxldGUgc2NoZW1hdGljT3B0aW9ucy5sZWdhY3lCcm93c2VycztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbn1cbiJdfQ==