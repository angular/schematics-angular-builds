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
function addAppToWorkspaceFile(options, workspace) {
    return (host, context) => {
        let projectRoot = options.projectRoot !== undefined
            ? options.projectRoot
            : `${workspace.newProjectRoot}/${options.name}`;
        if (projectRoot !== '' && !projectRoot.endsWith('/')) {
            projectRoot += '/';
        }
        if (project_1.getProject(workspace, options.name)) {
            throw new schematics_1.SchematicsException(`Project name "${options.name}" already exists.`);
        }
        const project = {
            root: projectRoot,
            projectType: workspace_models_1.ProjectType.Application,
            prefix: '',
            architect: {
                e2e: {
                    builder: workspace_models_1.Builders.Protractor,
                    options: {
                        protractorConfig: `${projectRoot}protractor.conf.js`,
                        devServerTarget: `${options.relatedAppName}:serve`,
                    },
                    configurations: {
                        production: {
                            devServerTarget: `${options.relatedAppName}:serve:production`,
                        },
                    },
                },
                lint: {
                    builder: workspace_models_1.Builders.TsLint,
                    options: {
                        tsConfig: `${projectRoot}tsconfig.e2e.json`,
                        exclude: [
                            '**/node_modules/**',
                        ],
                    },
                },
            },
        };
        workspace.projects[options.name] = project;
        return config_1.updateWorkspace(workspace);
    };
}
const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];
function getRegExpFailPosition(str) {
    const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
    const matched = [];
    parts.forEach(part => {
        if (part.match(projectNameRegexp)) {
            matched.push(part);
        }
    });
    const compare = matched.join('-');
    return (str !== compare) ? compare.length : null;
}
function validateProjectName(projectName) {
    const errorIndex = getRegExpFailPosition(projectName);
    if (errorIndex !== null) {
        const firstMessage = core_1.tags.oneLine `
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters or dashes.
      When adding a dash the segment after the dash must also start with a letter.
    `;
        const msg = core_1.tags.stripIndent `
      ${firstMessage}
      ${projectName}
      ${Array(errorIndex + 1).join(' ') + '^'}
    `;
        throw new schematics_1.SchematicsException(msg);
    }
    else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
        throw new schematics_1.SchematicsException(`Project name "${projectName}" is not a supported name.`);
    }
}
function default_1(options) {
    return (host) => {
        validateProjectName(options.name);
        const workspace = config_1.getWorkspace(host);
        let newProjectRoot = workspace.newProjectRoot;
        let appDir = `${newProjectRoot}/${options.name}`;
        if (options.projectRoot !== undefined) {
            newProjectRoot = options.projectRoot;
            appDir = newProjectRoot;
        }
        return schematics_1.chain([
            addAppToWorkspaceFile(options, workspace),
            schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files'), [
                schematics_1.template(Object.assign({ utils: core_1.strings }, options, { 'dot': '.', appDir })),
                schematics_1.move(appDir),
            ])),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9lMmUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBcUQ7QUFDckQsMkRBV29DO0FBQ3BDLDhDQUFrRTtBQUNsRSxnREFBZ0Q7QUFDaEQsa0VBS3FDO0FBR3JDLFNBQVMscUJBQXFCLENBQUMsT0FBbUIsRUFBRSxTQUEwQjtJQUM1RSxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFDakQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ3JCLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWxELElBQUksV0FBVyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEQsV0FBVyxJQUFJLEdBQUcsQ0FBQztTQUNwQjtRQUVELElBQUksb0JBQVUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxpQkFBaUIsT0FBTyxDQUFDLElBQUksbUJBQW1CLENBQUMsQ0FBQztTQUNqRjtRQUVELE1BQU0sT0FBTyxHQUFxQjtZQUNoQyxJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUsOEJBQVcsQ0FBQyxXQUFXO1lBQ3BDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsU0FBUyxFQUFFO2dCQUNULEdBQUcsRUFBRTtvQkFDSCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxVQUFVO29CQUM1QixPQUFPLEVBQUU7d0JBQ1AsZ0JBQWdCLEVBQUUsR0FBRyxXQUFXLG9CQUFvQjt3QkFDcEQsZUFBZSxFQUFFLEdBQUcsT0FB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SyxTQUFTLEVBQUU7WUFDckMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDckMsTUFBTSxHQUFHLGNBQWMsQ0FBQztTQUN6QjtRQUVELE9BQU8sa0JBQUssQ0FBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDekMsc0JBQVMsQ0FDUCxrQkFBSyxDQUFDLGdCQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BCLHFCQUFRLGlCQUNOLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBTyxJQUNWLEtBQUssRUFBRSxHQUFHLEVBQ1YsTUFBTSxJQUNOO2dCQUNGLGlCQUFJLENBQUMsTUFBTSxDQUFDO2FBQ2IsQ0FBQyxDQUFDO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVCRCw0QkE0QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHRlbXBsYXRlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdCB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdCc7XG5pbXBvcnQge1xuICBCdWlsZGVycyxcbiAgIFByb2plY3RUeXBlLFxuICBXb3Jrc3BhY2VQcm9qZWN0LFxuICBXb3Jrc3BhY2VTY2hlbWEsXG59IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnM6IEUyZU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGxldCBwcm9qZWN0Um9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZFxuICAgICAgPyBvcHRpb25zLnByb2plY3RSb290XG4gICAgICA6IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcblxuICAgIGlmIChwcm9qZWN0Um9vdCAhPT0gJycgJiYgIXByb2plY3RSb290LmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgICB9XG5cbiAgICBpZiAoZ2V0UHJvamVjdCh3b3Jrc3BhY2UsIG9wdGlvbnMubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke29wdGlvbnMubmFtZX1cIiBhbHJlYWR5IGV4aXN0cy5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0ID0ge1xuICAgICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgICBwcmVmaXg6ICcnLFxuICAgICAgYXJjaGl0ZWN0OiB7XG4gICAgICAgIGUyZToge1xuICAgICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlByb3RyYWN0b3IsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgcHJvdHJhY3RvckNvbmZpZzogYCR7cHJvamVjdFJvb3R9cHJvdHJhY3Rvci5jb25mLmpzYCxcbiAgICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmVgLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnJlbGF0ZWRBcHBOYW1lfTpzZXJ2ZTpwcm9kdWN0aW9uYCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgbGludDoge1xuICAgICAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlRzTGludCxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0c0NvbmZpZzogYCR7cHJvamVjdFJvb3R9dHNjb25maWcuZTJlLmpzb25gLFxuICAgICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHdvcmtzcGFjZS5wcm9qZWN0c1tvcHRpb25zLm5hbWVdID0gcHJvamVjdDtcblxuICAgIHJldHVybiB1cGRhdGVXb3Jrc3BhY2Uod29ya3NwYWNlKTtcbiAgfTtcbn1cbmNvbnN0IHByb2plY3ROYW1lUmVnZXhwID0gL15bYS16QS1aXVsuMC05YS16QS1aXSooLVsuMC05YS16QS1aXSopKiQvO1xuY29uc3QgdW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMgPSBbJ3Rlc3QnLCAnZW1iZXInLCAnZW1iZXItY2xpJywgJ3ZlbmRvcicsICdhcHAnXTtcblxuZnVuY3Rpb24gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHN0cjogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnRzID0gc3RyLmluZGV4T2YoJy0nKSA+PSAwID8gc3RyLnNwbGl0KCctJykgOiBbc3RyXTtcbiAgY29uc3QgbWF0Y2hlZDogc3RyaW5nW10gPSBbXTtcblxuICBwYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuICAgIGlmIChwYXJ0Lm1hdGNoKHByb2plY3ROYW1lUmVnZXhwKSkge1xuICAgICAgbWF0Y2hlZC5wdXNoKHBhcnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgY29tcGFyZSA9IG1hdGNoZWQuam9pbignLScpO1xuXG4gIHJldHVybiAoc3RyICE9PSBjb21wYXJlKSA/IGNvbXBhcmUubGVuZ3RoIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVQcm9qZWN0TmFtZShwcm9qZWN0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGVycm9ySW5kZXggPSBnZXRSZWdFeHBGYWlsUG9zaXRpb24ocHJvamVjdE5hbWUpO1xuICBpZiAoZXJyb3JJbmRleCAhPT0gbnVsbCkge1xuICAgIGNvbnN0IGZpcnN0TWVzc2FnZSA9IHRhZ3Mub25lTGluZWBcbiAgICAgIFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IHZhbGlkLiBOZXcgcHJvamVjdCBuYW1lcyBtdXN0XG4gICAgICBzdGFydCB3aXRoIGEgbGV0dGVyLCBhbmQgbXVzdCBjb250YWluIG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMgb3IgZGFzaGVzLlxuICAgICAgV2hlbiBhZGRpbmcgYSBkYXNoIHRoZSBzZWdtZW50IGFmdGVyIHRoZSBkYXNoIG11c3QgYWxzbyBzdGFydCB3aXRoIGEgbGV0dGVyLlxuICAgIGA7XG4gICAgY29uc3QgbXNnID0gdGFncy5zdHJpcEluZGVudGBcbiAgICAgICR7Zmlyc3RNZXNzYWdlfVxuICAgICAgJHtwcm9qZWN0TmFtZX1cbiAgICAgICR7QXJyYXkoZXJyb3JJbmRleCArIDEpLmpvaW4oJyAnKSArICdeJ31cbiAgICBgO1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKG1zZyk7XG4gIH0gZWxzZSBpZiAodW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXMuaW5kZXhPZihwcm9qZWN0TmFtZSkgIT09IC0xKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFByb2plY3QgbmFtZSBcIiR7cHJvamVjdE5hbWV9XCIgaXMgbm90IGEgc3VwcG9ydGVkIG5hbWUuYCk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogRTJlT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUpID0+IHtcbiAgICB2YWxpZGF0ZVByb2plY3ROYW1lKG9wdGlvbnMubmFtZSk7XG5cbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgbGV0IG5ld1Byb2plY3RSb290ID0gd29ya3NwYWNlLm5ld1Byb2plY3RSb290O1xuICAgIGxldCBhcHBEaXIgPSBgJHtuZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcblxuXG4gICAgaWYgKG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3UHJvamVjdFJvb3QgPSBvcHRpb25zLnByb2plY3RSb290O1xuICAgICAgYXBwRGlyID0gbmV3UHJvamVjdFJvb3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIGFkZEFwcFRvV29ya3NwYWNlRmlsZShvcHRpb25zLCB3b3Jrc3BhY2UpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIHRlbXBsYXRlKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICdkb3QnOiAnLicsXG4gICAgICAgICAgICBhcHBEaXIsXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShhcHBEaXIpLFxuICAgICAgICBdKSksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=