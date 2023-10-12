"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("@schematics/angular/utility");
const path_1 = require("path");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
/**
 * The list of development dependencies used by the E2E protractor-based builder.
 * The versions are sourced from the latest versions `../utility/latest-versions/package.json`
 * file which is automatically updated via renovate.
 */
const E2E_DEV_DEPENDENCIES = Object.freeze([
    'protractor',
    'jasmine-spec-reporter',
    'ts-node',
    '@types/node',
]);
function addScriptsToPackageJson() {
    return (host) => {
        const pkgJson = new json_file_1.JSONFile(host, 'package.json');
        const e2eScriptPath = ['scripts', 'e2e'];
        if (!pkgJson.get(e2eScriptPath)) {
            pkgJson.modify(e2eScriptPath, 'ng e2e', false);
        }
    };
}
function default_1(options) {
    const { relatedAppName } = options;
    return (0, utility_1.updateWorkspace)((workspace) => {
        const project = workspace.projects.get(relatedAppName);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${relatedAppName}" doesn't not exist.`);
        }
        const e2eRootPath = path_1.posix.join(project.root, 'e2e');
        project.targets.add({
            name: 'e2e',
            builder: utility_1.AngularBuilder.Protractor,
            defaultConfiguration: 'development',
            options: {
                protractorConfig: path_1.posix.join(e2eRootPath, 'protractor.conf.js'),
            },
            configurations: {
                production: {
                    devServerTarget: `${relatedAppName}:serve:production`,
                },
                development: {
                    devServerTarget: `${relatedAppName}:serve:development`,
                },
            },
        });
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                (0, schematics_1.applyTemplates)({
                    utils: schematics_1.strings,
                    ...options,
                    relativePathToWorkspaceRoot: path_1.posix.relative(path_1.posix.join('/', e2eRootPath), '/'),
                }),
                (0, schematics_1.move)(e2eRootPath),
            ])),
            (0, utility_1.addRootProvider)(relatedAppName, ({ code, external }) => code `${external('provideProtractorTestingSupport', '@angular/platform-browser')}()`),
            ...E2E_DEV_DEPENDENCIES.map((name) => (0, utility_1.addDependency)(name, latest_versions_1.latestVersions[name], {
                type: utility_1.DependencyType.Dev,
                existing: utility_1.ExistingBehavior.Skip,
            })),
            addScriptsToPackageJson(),
        ]);
    });
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsMkRBVW9DO0FBQ3BDLHlEQU9xQztBQUNyQywrQkFBcUM7QUFDckMsb0RBQWdEO0FBQ2hELGdFQUE0RDtBQUc1RDs7OztHQUlHO0FBQ0gsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3pDLFlBQVk7SUFDWix1QkFBdUI7SUFDdkIsU0FBUztJQUNULGFBQWE7Q0FDZCxDQUFDLENBQUM7QUFFSCxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUVuQyxPQUFPLElBQUEseUJBQWUsRUFBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1FBQ25DLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixNQUFNLElBQUksZ0NBQW1CLENBQUMsaUJBQWlCLGNBQWMsc0JBQXNCLENBQUMsQ0FBQztTQUN0RjtRQUVELE1BQU0sV0FBVyxHQUFHLFlBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVuRCxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNsQixJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSx3QkFBYyxDQUFDLFVBQVU7WUFDbEMsb0JBQW9CLEVBQUUsYUFBYTtZQUNuQyxPQUFPLEVBQUU7Z0JBQ1AsZ0JBQWdCLEVBQUUsWUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLENBQUM7YUFDL0Q7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsVUFBVSxFQUFFO29CQUNWLGVBQWUsRUFBRSxHQUFHLGNBQWMsbUJBQW1CO2lCQUN0RDtnQkFDRCxXQUFXLEVBQUU7b0JBQ1gsZUFBZSxFQUFFLEdBQUcsY0FBYyxvQkFBb0I7aUJBQ3ZEO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsc0JBQVMsRUFDUCxJQUFBLGtCQUFLLEVBQUMsSUFBQSxnQkFBRyxFQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUNwQixJQUFBLDJCQUFjLEVBQUM7b0JBQ2IsS0FBSyxFQUFFLG9CQUFPO29CQUNkLEdBQUcsT0FBTztvQkFDViwyQkFBMkIsRUFBRSxZQUFJLENBQUMsUUFBUSxDQUFDLFlBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEdBQUcsQ0FBQztpQkFDN0UsQ0FBQztnQkFDRixJQUFBLGlCQUFJLEVBQUMsV0FBVyxDQUFDO2FBQ2xCLENBQUMsQ0FDSDtZQUNELElBQUEseUJBQWUsRUFDYixjQUFjLEVBQ2QsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQ3JCLElBQUksQ0FBQSxHQUFHLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwyQkFBMkIsQ0FBQyxJQUFJLENBQ3RGO1lBQ0QsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNuQyxJQUFBLHVCQUFhLEVBQUMsSUFBSSxFQUFFLGdDQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hDLElBQUksRUFBRSx3QkFBYyxDQUFDLEdBQUc7Z0JBQ3hCLFFBQVEsRUFBRSwwQkFBZ0IsQ0FBQyxJQUFJO2FBQ2hDLENBQUMsQ0FDSDtZQUNELHVCQUF1QixFQUFFO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXRERCw0QkFzREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIEFuZ3VsYXJCdWlsZGVyLFxuICBEZXBlbmRlbmN5VHlwZSxcbiAgRXhpc3RpbmdCZWhhdmlvcixcbiAgYWRkRGVwZW5kZW5jeSxcbiAgYWRkUm9vdFByb3ZpZGVyLFxuICB1cGRhdGVXb3Jrc3BhY2UsXG59IGZyb20gJ0BzY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eSc7XG5pbXBvcnQgeyBwb3NpeCBhcyBwYXRoIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbi8qKlxuICogVGhlIGxpc3Qgb2YgZGV2ZWxvcG1lbnQgZGVwZW5kZW5jaWVzIHVzZWQgYnkgdGhlIEUyRSBwcm90cmFjdG9yLWJhc2VkIGJ1aWxkZXIuXG4gKiBUaGUgdmVyc2lvbnMgYXJlIHNvdXJjZWQgZnJvbSB0aGUgbGF0ZXN0IHZlcnNpb25zIGAuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucy9wYWNrYWdlLmpzb25gXG4gKiBmaWxlIHdoaWNoIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZCB2aWEgcmVub3ZhdGUuXG4gKi9cbmNvbnN0IEUyRV9ERVZfREVQRU5ERU5DSUVTID0gT2JqZWN0LmZyZWV6ZShbXG4gICdwcm90cmFjdG9yJyxcbiAgJ2phc21pbmUtc3BlYy1yZXBvcnRlcicsXG4gICd0cy1ub2RlJyxcbiAgJ0B0eXBlcy9ub2RlJyxcbl0pO1xuXG5mdW5jdGlvbiBhZGRTY3JpcHRzVG9QYWNrYWdlSnNvbigpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0KSA9PiB7XG4gICAgY29uc3QgcGtnSnNvbiA9IG5ldyBKU09ORmlsZShob3N0LCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgZTJlU2NyaXB0UGF0aCA9IFsnc2NyaXB0cycsICdlMmUnXTtcblxuICAgIGlmICghcGtnSnNvbi5nZXQoZTJlU2NyaXB0UGF0aCkpIHtcbiAgICAgIHBrZ0pzb24ubW9kaWZ5KGUyZVNjcmlwdFBhdGgsICduZyBlMmUnLCBmYWxzZSk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogRTJlT3B0aW9ucyk6IFJ1bGUge1xuICBjb25zdCB7IHJlbGF0ZWRBcHBOYW1lIH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KHJlbGF0ZWRBcHBOYW1lKTtcblxuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFByb2plY3QgbmFtZSBcIiR7cmVsYXRlZEFwcE5hbWV9XCIgZG9lc24ndCBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgZTJlUm9vdFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdC5yb290LCAnZTJlJyk7XG5cbiAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgIG5hbWU6ICdlMmUnLFxuICAgICAgYnVpbGRlcjogQW5ndWxhckJ1aWxkZXIuUHJvdHJhY3RvcixcbiAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBwYXRoLmpvaW4oZTJlUm9vdFBhdGgsICdwcm90cmFjdG9yLmNvbmYuanMnKSxcbiAgICAgIH0sXG4gICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtyZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgIH0sXG4gICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtyZWxhdGVkQXBwTmFtZX06c2VydmU6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiBwYXRoLnJlbGF0aXZlKHBhdGguam9pbignLycsIGUyZVJvb3RQYXRoKSwgJy8nKSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKGUyZVJvb3RQYXRoKSxcbiAgICAgICAgXSksXG4gICAgICApLFxuICAgICAgYWRkUm9vdFByb3ZpZGVyKFxuICAgICAgICByZWxhdGVkQXBwTmFtZSxcbiAgICAgICAgKHsgY29kZSwgZXh0ZXJuYWwgfSkgPT5cbiAgICAgICAgICBjb2RlYCR7ZXh0ZXJuYWwoJ3Byb3ZpZGVQcm90cmFjdG9yVGVzdGluZ1N1cHBvcnQnLCAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3NlcicpfSgpYCxcbiAgICAgICksXG4gICAgICAuLi5FMkVfREVWX0RFUEVOREVOQ0lFUy5tYXAoKG5hbWUpID0+XG4gICAgICAgIGFkZERlcGVuZGVuY3kobmFtZSwgbGF0ZXN0VmVyc2lvbnNbbmFtZV0sIHtcbiAgICAgICAgICB0eXBlOiBEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgZXhpc3Rpbmc6IEV4aXN0aW5nQmVoYXZpb3IuU2tpcCxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICAgYWRkU2NyaXB0c1RvUGFja2FnZUpzb24oKSxcbiAgICBdKTtcbiAgfSk7XG59XG4iXX0=