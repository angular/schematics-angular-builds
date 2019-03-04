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
    const root = projectRoot.split('/').filter(x => x).join('/');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9lMmUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBK0M7QUFDL0MsMkRBV29DO0FBQ3BDLDhDQUFrRTtBQUNsRSxnREFBZ0Q7QUFDaEQsa0VBQXdFO0FBR3hFLFNBQVMsVUFBVSxDQUFDLFdBQW1CO0lBQ3JDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTdELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDdEMsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsT0FBbUIsRUFBRSxTQUEwQjtJQUM1RSxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQzFDLE1BQU0sT0FBTyxHQUFHLG9CQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7UUFFcEMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU3QyxJQUFJLFNBQVMsRUFBRTtZQUNiLFNBQVMsQ0FBQyxHQUFHLEdBQUc7Z0JBQ2QsT0FBTyxFQUFFLDJCQUFRLENBQUMsVUFBVTtnQkFDNUIsT0FBTyxFQUFFO29CQUNQLGdCQUFnQixFQUFFLEdBQUcsV0FBVyxxQkFBcUI7b0JBQ3JELGVBQWUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLFFBQVE7aUJBQ25EO2dCQUNELGNBQWMsRUFBRTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1YsZUFBZSxFQUFFLEdBQUcsT0FBTyxDQUFDLGNBQWMsbUJBQW1CO3FCQUM5RDtpQkFDRjthQUNGLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQ2xDLElBQUksVUFBVSxFQUFFO2dCQUNkLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUTtvQkFDekIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsV0FBVyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3RFO1lBRUQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsT0FBTyxDQUFDO1NBQ3REO1FBRUQsT0FBTyx3QkFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsT0FBTyxDQUFDLElBQVUsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFDMUMsTUFBTSxTQUFTLEdBQUcscUJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxvQkFBVSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlCQUFpQixVQUFVLHNCQUFzQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTlFLE9BQU8sa0JBQUssQ0FBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDekMsc0JBQVMsQ0FDUCxrQkFBSyxDQUFDLGdCQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BCLDJCQUFjLGlCQUNaLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBTyxJQUNWLDJCQUEyQixJQUMzQjtnQkFDRixpQkFBSSxDQUFDLElBQUksQ0FBQzthQUNYLENBQUMsQ0FBQztTQUNOLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUExQkQsNEJBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvY29uZmlnJztcbmltcG9ydCB7IGdldFByb2plY3QgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QnO1xuaW1wb3J0IHsgQnVpbGRlcnMsIFdvcmtzcGFjZVNjaGVtYSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gZ2V0RTJlUm9vdChwcm9qZWN0Um9vdDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgcm9vdCA9IHByb2plY3RSb290LnNwbGl0KCcvJykuZmlsdGVyKHggPT4geCkuam9pbignLycpO1xuXG4gIHJldHVybiByb290ID8gcm9vdCArICcvZTJlJyA6ICdlMmUnO1xufVxuXG5mdW5jdGlvbiBBZGRCdWlsZGVyVG9Xb3Jrc3BhY2Uob3B0aW9uczogRTJlT3B0aW9ucywgd29ya3NwYWNlOiBXb3Jrc3BhY2VTY2hlbWEpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3Qod29ya3NwYWNlLCBhcHBQcm9qZWN0KTtcbiAgICBjb25zdCBhcmNoaXRlY3QgPSBwcm9qZWN0LmFyY2hpdGVjdDtcblxuICAgIGNvbnN0IHByb2plY3RSb290ID0gZ2V0RTJlUm9vdChwcm9qZWN0LnJvb3QpO1xuXG4gICAgaWYgKGFyY2hpdGVjdCkge1xuICAgICAgYXJjaGl0ZWN0LmUyZSA9IHtcbiAgICAgICAgYnVpbGRlcjogQnVpbGRlcnMuUHJvdHJhY3RvcixcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHByb3RyYWN0b3JDb25maWc6IGAke3Byb2plY3RSb290fS9wcm90cmFjdG9yLmNvbmYuanNgLFxuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmVgLFxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGxpbnRDb25maWcgPSBhcmNoaXRlY3QubGludDtcbiAgICAgIGlmIChsaW50Q29uZmlnKSB7XG4gICAgICAgIGxpbnRDb25maWcub3B0aW9ucy50c0NvbmZpZyA9XG4gICAgICAgICAgbGludENvbmZpZy5vcHRpb25zLnRzQ29uZmlnLmNvbmNhdChgJHtwcm9qZWN0Um9vdH0vdHNjb25maWcuanNvbmApO1xuICAgICAgfVxuXG4gICAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5yZWxhdGVkQXBwTmFtZV0gPSBwcm9qZWN0O1xuICAgIH1cblxuICAgIHJldHVybiB1cGRhdGVXb3Jrc3BhY2Uod29ya3NwYWNlKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEUyZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSBnZXRQcm9qZWN0KHdvcmtzcGFjZSwgYXBwUHJvamVjdCk7XG5cbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke2FwcFByb2plY3R9XCIgZG9lc24ndCBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdCA9IGdldEUyZVJvb3QocHJvamVjdC5yb290KTtcbiAgICBjb25zdCByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgPSByb290LnNwbGl0KCcvJykubWFwKCgpID0+ICcuLicpLmpvaW4oJy8nKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBBZGRCdWlsZGVyVG9Xb3Jrc3BhY2Uob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShyb290KSxcbiAgICAgICAgXSkpLFxuICAgIF0pO1xuICB9O1xufVxuIl19