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
            targets: {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9lMmUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwrQ0FBcUQ7QUFDckQsMkRBV29DO0FBQ3BDLDhDQUFrRTtBQUNsRSxnREFBZ0Q7QUFDaEQsa0VBS3FDO0FBR3JDLFNBQVMscUJBQXFCLENBQUMsT0FBbUIsRUFBRSxTQUEwQjtJQUM1RSxPQUFPLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQyxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVM7WUFDakQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ3JCLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWxELElBQUksV0FBVyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEQsV0FBVyxJQUFJLEdBQUcsQ0FBQztTQUNwQjtRQUVELElBQUksb0JBQVUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxpQkFBaUIsT0FBTyxDQUFDLElBQUksbUJBQW1CLENBQUMsQ0FBQztTQUNqRjtRQUVELE1BQU0sT0FBTyxHQUFxQjtZQUNoQyxJQUFJLEVBQUUsV0FBVztZQUNqQixXQUFXLEVBQUUsOEJBQVcsQ0FBQyxXQUFXO1lBQ3BDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsT0FBTyxFQUFFO2dCQUNQLEdBQUcsRUFBRTtvQkFDSCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxVQUFVO29CQUM1QixPQUFPLEVBQUU7d0JBQ1AsZ0JBQWdCLEVBQUUsR0FBRyxXQUFXLG9CQUFvQjt3QkFDcEQsZUFBZSxFQUFFLEdBQUcsT0FB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SyxTQUFTLEVBQUU7WUFDckMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDckMsTUFBTSxHQUFHLGNBQWMsQ0FBQztTQUN6QjtRQUVELE9BQU8sa0JBQUssQ0FBQztZQUNYLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDekMsc0JBQVMsQ0FDUCxrQkFBSyxDQUFDLGdCQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BCLHFCQUFRLGlCQUNOLEtBQUssRUFBRSxjQUFPLElBQ1gsT0FBTyxJQUNWLEtBQUssRUFBRSxHQUFHLEVBQ1YsTUFBTSxJQUNOO2dCQUNGLGlCQUFJLENBQUMsTUFBTSxDQUFDO2FBQ2IsQ0FBQyxDQUFDO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVCRCw0QkE0QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBzdHJpbmdzLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHRlbXBsYXRlLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS9jb25maWcnO1xuaW1wb3J0IHsgZ2V0UHJvamVjdCB9IGZyb20gJy4uL3V0aWxpdHkvcHJvamVjdCc7XG5pbXBvcnQge1xuICBCdWlsZGVycyxcbiAgIFByb2plY3RUeXBlLFxuICBXb3Jrc3BhY2VQcm9qZWN0LFxuICBXb3Jrc3BhY2VTY2hlbWEsXG59IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkQXBwVG9Xb3Jrc3BhY2VGaWxlKG9wdGlvbnM6IEUyZU9wdGlvbnMsIHdvcmtzcGFjZTogV29ya3NwYWNlU2NoZW1hKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGxldCBwcm9qZWN0Um9vdCA9IG9wdGlvbnMucHJvamVjdFJvb3QgIT09IHVuZGVmaW5lZFxuICAgICAgPyBvcHRpb25zLnByb2plY3RSb290XG4gICAgICA6IGAke3dvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdH0vJHtvcHRpb25zLm5hbWV9YDtcblxuICAgIGlmIChwcm9qZWN0Um9vdCAhPT0gJycgJiYgIXByb2plY3RSb290LmVuZHNXaXRoKCcvJykpIHtcbiAgICAgIHByb2plY3RSb290ICs9ICcvJztcbiAgICB9XG5cbiAgICBpZiAoZ2V0UHJvamVjdCh3b3Jrc3BhY2UsIG9wdGlvbnMubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke29wdGlvbnMubmFtZX1cIiBhbHJlYWR5IGV4aXN0cy5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0OiBXb3Jrc3BhY2VQcm9qZWN0ID0ge1xuICAgICAgcm9vdDogcHJvamVjdFJvb3QsXG4gICAgICBwcm9qZWN0VHlwZTogUHJvamVjdFR5cGUuQXBwbGljYXRpb24sXG4gICAgICBwcmVmaXg6ICcnLFxuICAgICAgdGFyZ2V0czoge1xuICAgICAgICBlMmU6IHtcbiAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Qcm90cmFjdG9yLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHByb3RyYWN0b3JDb25maWc6IGAke3Byb2plY3RSb290fXByb3RyYWN0b3IuY29uZi5qc2AsXG4gICAgICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucmVsYXRlZEFwcE5hbWV9OnNlcnZlYCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGxpbnQ6IHtcbiAgICAgICAgICBidWlsZGVyOiBCdWlsZGVycy5Uc0xpbnQsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdHNDb25maWc6IGAke3Byb2plY3RSb290fXRzY29uZmlnLmUyZS5qc29uYCxcbiAgICAgICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgICAgJyoqL25vZGVfbW9kdWxlcy8qKicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICB3b3Jrc3BhY2UucHJvamVjdHNbb3B0aW9ucy5uYW1lXSA9IHByb2plY3Q7XG5cbiAgICByZXR1cm4gdXBkYXRlV29ya3NwYWNlKHdvcmtzcGFjZSk7XG4gIH07XG59XG5jb25zdCBwcm9qZWN0TmFtZVJlZ2V4cCA9IC9eW2EtekEtWl1bLjAtOWEtekEtWl0qKC1bLjAtOWEtekEtWl0qKSokLztcbmNvbnN0IHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzID0gWyd0ZXN0JywgJ2VtYmVyJywgJ2VtYmVyLWNsaScsICd2ZW5kb3InLCAnYXBwJ107XG5cbmZ1bmN0aW9uIGdldFJlZ0V4cEZhaWxQb3NpdGlvbihzdHI6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBwYXJ0cyA9IHN0ci5pbmRleE9mKCctJykgPj0gMCA/IHN0ci5zcGxpdCgnLScpIDogW3N0cl07XG4gIGNvbnN0IG1hdGNoZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgcGFydHMuZm9yRWFjaChwYXJ0ID0+IHtcbiAgICBpZiAocGFydC5tYXRjaChwcm9qZWN0TmFtZVJlZ2V4cCkpIHtcbiAgICAgIG1hdGNoZWQucHVzaChwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGNvbXBhcmUgPSBtYXRjaGVkLmpvaW4oJy0nKTtcblxuICByZXR1cm4gKHN0ciAhPT0gY29tcGFyZSkgPyBjb21wYXJlLmxlbmd0aCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUHJvamVjdE5hbWUocHJvamVjdE5hbWU6IHN0cmluZykge1xuICBjb25zdCBlcnJvckluZGV4ID0gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHByb2plY3ROYW1lKTtcbiAgaWYgKGVycm9ySW5kZXggIT09IG51bGwpIHtcbiAgICBjb25zdCBmaXJzdE1lc3NhZ2UgPSB0YWdzLm9uZUxpbmVgXG4gICAgICBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCB2YWxpZC4gTmV3IHByb2plY3QgbmFtZXMgbXVzdFxuICAgICAgc3RhcnQgd2l0aCBhIGxldHRlciwgYW5kIG11c3QgY29udGFpbiBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIG9yIGRhc2hlcy5cbiAgICAgIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbiAgICBgO1xuICAgIGNvbnN0IG1zZyA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICAke2ZpcnN0TWVzc2FnZX1cbiAgICAgICR7cHJvamVjdE5hbWV9XG4gICAgICAke0FycmF5KGVycm9ySW5kZXggKyAxKS5qb2luKCcgJykgKyAnXid9XG4gICAgYDtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihtc2cpO1xuICB9IGVsc2UgaWYgKHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzLmluZGV4T2YocHJvamVjdE5hbWUpICE9PSAtMSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke3Byb2plY3ROYW1lfVwiIGlzIG5vdCBhIHN1cHBvcnRlZCBuYW1lLmApO1xuICB9XG5cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEUyZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0OiBUcmVlKSA9PiB7XG4gICAgdmFsaWRhdGVQcm9qZWN0TmFtZShvcHRpb25zLm5hbWUpO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGxldCBuZXdQcm9qZWN0Um9vdCA9IHdvcmtzcGFjZS5uZXdQcm9qZWN0Um9vdDtcbiAgICBsZXQgYXBwRGlyID0gYCR7bmV3UHJvamVjdFJvb3R9LyR7b3B0aW9ucy5uYW1lfWA7XG5cblxuICAgIGlmIChvcHRpb25zLnByb2plY3RSb290ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1Byb2plY3RSb290ID0gb3B0aW9ucy5wcm9qZWN0Um9vdDtcbiAgICAgIGFwcERpciA9IG5ld1Byb2plY3RSb290O1xuICAgIH1cblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBhZGRBcHBUb1dvcmtzcGFjZUZpbGUob3B0aW9ucywgd29ya3NwYWNlKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAnZG90JzogJy4nLFxuICAgICAgICAgICAgYXBwRGlyLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUoYXBwRGlyKSxcbiAgICAgICAgXSkpLFxuICAgIF0pO1xuICB9O1xufVxuIl19