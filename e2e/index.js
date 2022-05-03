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
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("../utility");
const dependencies_1 = require("../utility/dependencies");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const paths_1 = require("../utility/paths");
const workspace_models_1 = require("../utility/workspace-models");
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
    return async (host) => {
        const appProject = options.relatedAppName;
        const workspace = await (0, utility_1.readWorkspace)(host);
        const project = workspace.projects.get(appProject);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${appProject}" doesn't not exist.`);
        }
        const root = (0, core_1.join)((0, core_1.normalize)(project.root), 'e2e');
        project.targets.add({
            name: 'e2e',
            builder: workspace_models_1.Builders.Protractor,
            defaultConfiguration: 'development',
            options: {
                protractorConfig: `${root}/protractor.conf.js`,
            },
            configurations: {
                production: {
                    devServerTarget: `${options.relatedAppName}:serve:production`,
                },
                development: {
                    devServerTarget: `${options.relatedAppName}:serve:development`,
                },
            },
        });
        await (0, utility_1.writeWorkspace)(host, workspace);
        return (0, schematics_1.chain)([
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                (0, schematics_1.applyTemplates)({
                    utils: schematics_1.strings,
                    ...options,
                    relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(root),
                }),
                (0, schematics_1.move)(root),
            ])),
            (host) => [
                {
                    type: dependencies_1.NodeDependencyType.Dev,
                    name: 'protractor',
                    version: '~7.0.0',
                },
                {
                    type: dependencies_1.NodeDependencyType.Dev,
                    name: 'jasmine-spec-reporter',
                    version: '~7.0.0',
                },
                {
                    type: dependencies_1.NodeDependencyType.Dev,
                    name: 'ts-node',
                    version: '~9.1.1',
                },
                {
                    type: dependencies_1.NodeDependencyType.Dev,
                    name: '@types/node',
                    version: latest_versions_1.latestVersions['@types/node'],
                },
            ].forEach((dep) => (0, dependencies_1.addPackageJsonDependency)(host, dep)),
            addScriptsToPackageJson(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXVEO0FBQ3ZELDJEQVdvQztBQUNwQyx3Q0FBMkQ7QUFDM0QsMERBQXVGO0FBQ3ZGLG9EQUFnRDtBQUNoRCxnRUFBNEQ7QUFDNUQsNENBQStEO0FBQy9ELGtFQUF1RDtBQUd2RCxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsdUJBQWEsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlCQUFpQixVQUFVLHNCQUFzQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2xCLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLDJCQUFRLENBQUMsVUFBVTtZQUM1QixvQkFBb0IsRUFBRSxhQUFhO1lBQ25DLE9BQU8sRUFBRTtnQkFDUCxnQkFBZ0IsRUFBRSxHQUFHLElBQUkscUJBQXFCO2FBQy9DO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFVBQVUsRUFBRTtvQkFDVixlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxtQkFBbUI7aUJBQzlEO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxvQkFBb0I7aUJBQy9EO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLElBQUEsd0JBQWMsRUFBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEMsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxJQUFBLHNCQUFTLEVBQ1AsSUFBQSxrQkFBSyxFQUFDLElBQUEsZ0JBQUcsRUFBQyxTQUFTLENBQUMsRUFBRTtnQkFDcEIsSUFBQSwyQkFBYyxFQUFDO29CQUNiLEtBQUssRUFBRSxvQkFBTztvQkFDZCxHQUFHLE9BQU87b0JBQ1YsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxJQUFJLENBQUM7aUJBQy9ELENBQUM7Z0JBQ0YsSUFBQSxpQkFBSSxFQUFDLElBQUksQ0FBQzthQUNYLENBQUMsQ0FDSDtZQUNELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDUDtnQkFDRTtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRDtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtvQkFDN0IsT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7b0JBQzVCLElBQUksRUFBRSxhQUFhO29CQUNuQixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxhQUFhLENBQUM7aUJBQ3ZDO2FBQ0YsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pELHVCQUF1QixFQUFFO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFuRUQsNEJBbUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgc3RyaW5ncyxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyByZWFkV29ya3NwYWNlLCB3cml0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHknO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkU2NyaXB0c1RvUGFja2FnZUpzb24oKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IHBrZ0pzb24gPSBuZXcgSlNPTkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IGUyZVNjcmlwdFBhdGggPSBbJ3NjcmlwdHMnLCAnZTJlJ107XG5cbiAgICBpZiAoIXBrZ0pzb24uZ2V0KGUyZVNjcmlwdFBhdGgpKSB7XG4gICAgICBwa2dKc29uLm1vZGlmeShlMmVTY3JpcHRQYXRoLCAnbmcgZTJlJywgZmFsc2UpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEUyZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcmVhZFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChhcHBQcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke2FwcFByb2plY3R9XCIgZG9lc24ndCBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3Qucm9vdCksICdlMmUnKTtcblxuICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgbmFtZTogJ2UyZScsXG4gICAgICBidWlsZGVyOiBCdWlsZGVycy5Qcm90cmFjdG9yLFxuICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdkZXZlbG9wbWVudCcsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IGAke3Jvb3R9L3Byb3RyYWN0b3IuY29uZi5qc2AsXG4gICAgICB9LFxuICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgIH0sXG4gICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnJlbGF0ZWRBcHBOYW1lfTpzZXJ2ZTpkZXZlbG9wbWVudGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgYXdhaXQgd3JpdGVXb3Jrc3BhY2UoaG9zdCwgd29ya3NwYWNlKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Qocm9vdCksXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShyb290KSxcbiAgICAgICAgXSksXG4gICAgICApLFxuICAgICAgKGhvc3QpID0+XG4gICAgICAgIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ3Byb3RyYWN0b3InLFxuICAgICAgICAgICAgdmVyc2lvbjogJ343LjAuMCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ2phc21pbmUtc3BlYy1yZXBvcnRlcicsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnfjcuMC4wJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAndHMtbm9kZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnfjkuMS4xJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAnQHR5cGVzL25vZGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ0B0eXBlcy9ub2RlJ10sXG4gICAgICAgICAgfSxcbiAgICAgICAgXS5mb3JFYWNoKChkZXApID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXApKSxcbiAgICAgIGFkZFNjcmlwdHNUb1BhY2thZ2VKc29uKCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=