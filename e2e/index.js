"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("../utility/config");
const project_1 = require("../utility/project");
const workspace_models_1 = require("../utility/workspace-models");
function getE2eRoot(projectRoot) {
    const root = core_1.normalize(projectRoot);
    return root ? root + '/e2e' : 'e2e';
}
function AddBuilderToWorkspace(options, workspace) {
    return (host, context) => {
        const appProject = options.relatedAppName;
        const project = project_1.getProject(workspace, appProject);
        const architect = project.architect;
        const projectRoot = getE2eRoot(project.root);
        if (architect) {
            architect.e2e = {
                builder: workspace_models_1.Builders.Protractor,
                options: {
                    protractorConfig: `${projectRoot}/protractor.conf.js`,
                    devServerTarget: `${options.relatedAppName}:serve`,
                },
                configurations: {
                    production: {
                        devServerTarget: `${options.relatedAppName}:serve:production`,
                    },
                },
            };
            const lintConfig = architect.lint;
            if (lintConfig) {
                lintConfig.options.tsConfig =
                    lintConfig.options.tsConfig.concat(`${projectRoot}/tsconfig.json`);
            }
            workspace.projects[options.relatedAppName] = project;
        }
        return config_1.updateWorkspace(workspace);
    };
}
function default_1(options) {
    return (host) => {
        const appProject = options.relatedAppName;
        const workspace = config_1.getWorkspace(host);
        const project = project_1.getProject(workspace, appProject);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${appProject}" doesn't not exist.`);
        }
        const root = getE2eRoot(project.root);
        const relativePathToWorkspaceRoot = root.split('/').map(() => '..').join('/');
        return schematics_1.chain([
            AddBuilderToWorkspace(options, workspace),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files'), [
                schematics_1.applyTemplates(Object.assign({ utils: core_1.strings }, options, { relativePathToWorkspaceRoot })),
                schematics_1.move(root),
            ])),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9lMmUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBMEQ7QUFDMUQsMkRBV29DO0FBQ3BDLDhDQUFrRTtBQUNsRSxnREFBZ0Q7QUFDaEQsa0VBQXdFO0FBR3hFLFNBQVMsVUFBVSxDQUFDLFdBQW1CO0lBQ3JDLE1BQU0sSUFBSSxHQUFHLGdCQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFcEMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QyxDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxPQUFtQixFQUFFLFNBQTBCO0lBQzVFLE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQUcsb0JBQVUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUVwQyxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTdDLElBQUksU0FBUyxFQUFFO1lBQ2IsU0FBUyxDQUFDLEdBQUcsR0FBRztnQkFDZCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxVQUFVO2dCQUM1QixPQUFPLEVBQUU7b0JBQ1AsZ0JBQWdCLEVBQUUsR0FBRyxXQUFXLHFCQUFxQjtvQkFDckQsZUFBZSxFQUFFLEdBQUcsT0FBTyxDQUFDLGNBQWMsUUFBUTtpQkFDbkQ7Z0JBQ0QsY0FBYyxFQUFFO29CQUNkLFVBQVUsRUFBRTt3QkFDVixlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxtQkFBbUI7cUJBQzlEO2lCQUNGO2FBQ0YsQ0FBQztZQUVGLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRO29CQUN6QixVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxXQUFXLGdCQUFnQixDQUFDLENBQUM7YUFDdEU7WUFFRCxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxPQUFPLENBQUM7U0FDdEQ7UUFFRCxPQUFPLHdCQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELG1CQUF5QixPQUFtQjtJQUMxQyxPQUFPLENBQUMsSUFBVSxFQUFFLEVBQUU7UUFDcEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxxQkFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLG9CQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWxELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixNQUFNLElBQUksZ0NBQW1CLENBQUMsaUJBQWlCLFVBQVUsc0JBQXNCLENBQUMsQ0FBQztTQUNsRjtRQUVELE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFOUUsT0FBTyxrQkFBSyxDQUFDO1lBQ1gscUJBQXFCLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUN6QyxzQkFBUyxDQUNQLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDcEIsMkJBQWMsaUJBQ1osS0FBSyxFQUFFLGNBQU8sSUFDWCxPQUFPLElBQ1YsMkJBQTJCLElBQzNCO2dCQUNGLGlCQUFJLENBQUMsSUFBSSxDQUFDO2FBQ1gsQ0FBQyxDQUFDO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTFCRCw0QkEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBub3JtYWxpemUsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L2NvbmZpZyc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0IH0gZnJvbSAnLi4vdXRpbGl0eS9wcm9qZWN0JztcbmltcG9ydCB7IEJ1aWxkZXJzLCBXb3Jrc3BhY2VTY2hlbWEgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGdldEUyZVJvb3QocHJvamVjdFJvb3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJvb3QgPSBub3JtYWxpemUocHJvamVjdFJvb3QpO1xuXG4gIHJldHVybiByb290ID8gcm9vdCArICcvZTJlJyA6ICdlMmUnO1xufVxuXG5mdW5jdGlvbiBBZGRCdWlsZGVyVG9Xb3Jrc3BhY2Uob3B0aW9uczogRTJlT3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3Qod29ya3NwYWNlLCBhcHBQcm9qZWN0KTtcbiAgICBjb25zdCBhcmNoaXRlY3QgPSBwcm9qZWN0LmFyY2hpdGVjdDtcblxuICAgIGNvbnN0IHByb2plY3RSb290ID0gZ2V0RTJlUm9vdChwcm9qZWN0LnJvb3QpO1xuXG4gICAgaWYgKGFyY2hpdGVjdCkge1xuICAgICAgYXJjaGl0ZWN0LmUyZSA9IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuUHJvdHJhY3RvcixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHByb3RyYWN0b3JDb25maWc6IGAke3Byb2plY3RSb290fS9wcm90cmFjdG9yLmNvbmYuanNgLFxuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmVgLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGxpbnRDb25maWcgPSBhcmNoaXRlY3QubGludDtcbiAgICAgIGlmIChsaW50Q29uZmlnKSB7XG4gICAgICAgIGxpbnRDb25maWcub3B0aW9ucy50c0NvbmZpZyA9XG4gICAgICAgICAgbGludENvbmZpZy5vcHRpb25zLnRzQ29uZmlnLmNvbmNhdChgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuanNvbmApO1xuICAgICAgfVxuXG4gICAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5yZWxhdGVkQXBwTmFtZV0gPSBwcm9qZWN0O1xuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVXb3Jrc3BhY2Uod29ya3NwYWNlKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEUyZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0KHdvcmtzcGFjZSwgYXBwUHJvamVjdCk7XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke2FwcFByb2plY3R9XCIgZG9lc24ndCBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdCA9IGdldEUyZVJvb3QocHJvamVjdC5yb290KTtcbiAgICBjb25zdCByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgPSByb290LnNwbGl0KCcvJykubWFwKCgpID0+ICcuLicpLmpvaW4oJy8nKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBBZGRCdWlsZGVyVG9Xb3Jrc3BhY2Uob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShyb290KSxcbiAgICAgICAgXSkpLFxuICAgIF0pO1xuICB9O1xufVxuIl19