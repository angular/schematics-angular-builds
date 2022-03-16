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
const dependencies_1 = require("../utility/dependencies");
const json_file_1 = require("../utility/json-file");
const latest_versions_1 = require("../utility/latest-versions");
const paths_1 = require("../utility/paths");
const workspace_1 = require("../utility/workspace");
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
        const workspace = await (0, workspace_1.getWorkspace)(host);
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
        return (0, schematics_1.chain)([
            (0, workspace_1.updateWorkspace)(workspace),
            (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                (0, schematics_1.applyTemplates)({
                    utils: core_1.strings,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQWdFO0FBQ2hFLDJEQVVvQztBQUNwQywwREFBdUY7QUFDdkYsb0RBQWdEO0FBQ2hELGdFQUE0RDtBQUM1RCw0Q0FBK0Q7QUFDL0Qsb0RBQXFFO0FBQ3JFLGtFQUF1RDtBQUd2RCxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlCQUFpQixVQUFVLHNCQUFzQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2xCLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLDJCQUFRLENBQUMsVUFBVTtZQUM1QixvQkFBb0IsRUFBRSxhQUFhO1lBQ25DLE9BQU8sRUFBRTtnQkFDUCxnQkFBZ0IsRUFBRSxHQUFHLElBQUkscUJBQXFCO2FBQy9DO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFVBQVUsRUFBRTtvQkFDVixlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxtQkFBbUI7aUJBQzlEO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxvQkFBb0I7aUJBQy9EO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsMkJBQWUsRUFBQyxTQUFTLENBQUM7WUFDMUIsSUFBQSxzQkFBUyxFQUNQLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUEsMkJBQWMsRUFBQztvQkFDYixLQUFLLEVBQUUsY0FBTztvQkFDZCxHQUFHLE9BQU87b0JBQ1YsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxJQUFJLENBQUM7aUJBQy9ELENBQUM7Z0JBQ0YsSUFBQSxpQkFBSSxFQUFDLElBQUksQ0FBQzthQUNYLENBQUMsQ0FDSDtZQUNELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDUDtnQkFDRTtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRDtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtvQkFDN0IsT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7b0JBQzVCLElBQUksRUFBRSxhQUFhO29CQUNuQixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxhQUFhLENBQUM7aUJBQ3ZDO2FBQ0YsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUEsdUNBQXdCLEVBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pELHVCQUF1QixFQUFFO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQztBQUNKLENBQUM7QUFsRUQsNEJBa0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBhcHBseVRlbXBsYXRlcyxcbiAgY2hhaW4sXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgdXJsLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUsIGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeSB9IGZyb20gJy4uL3V0aWxpdHkvZGVwZW5kZW5jaWVzJztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnLi4vdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0IHsgbGF0ZXN0VmVyc2lvbnMgfSBmcm9tICcuLi91dGlsaXR5L2xhdGVzdC12ZXJzaW9ucyc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZFNjcmlwdHNUb1BhY2thZ2VKc29uKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3QpID0+IHtcbiAgICBjb25zdCBwa2dKc29uID0gbmV3IEpTT05GaWxlKGhvc3QsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBlMmVTY3JpcHRQYXRoID0gWydzY3JpcHRzJywgJ2UyZSddO1xuXG4gICAgaWYgKCFwa2dKc29uLmdldChlMmVTY3JpcHRQYXRoKSkge1xuICAgICAgcGtnSnNvbi5tb2RpZnkoZTJlU2NyaXB0UGF0aCwgJ25nIGUyZScsIGZhbHNlKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBFMmVPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGFwcFByb2plY3QgPSBvcHRpb25zLnJlbGF0ZWRBcHBOYW1lO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChhcHBQcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke2FwcFByb2plY3R9XCIgZG9lc24ndCBub3QgZXhpc3QuYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm9vdCA9IGpvaW4obm9ybWFsaXplKHByb2plY3Qucm9vdCksICdlMmUnKTtcblxuICAgIHByb2plY3QudGFyZ2V0cy5hZGQoe1xuICAgICAgbmFtZTogJ2UyZScsXG4gICAgICBidWlsZGVyOiBCdWlsZGVycy5Qcm90cmFjdG9yLFxuICAgICAgZGVmYXVsdENvbmZpZ3VyYXRpb246ICdkZXZlbG9wbWVudCcsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIHByb3RyYWN0b3JDb25maWc6IGAke3Jvb3R9L3Byb3RyYWN0b3IuY29uZi5qc2AsXG4gICAgICB9LFxuICAgICAgY29uZmlndXJhdGlvbnM6IHtcbiAgICAgICAgcHJvZHVjdGlvbjoge1xuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6cHJvZHVjdGlvbmAsXG4gICAgICAgIH0sXG4gICAgICAgIGRldmVsb3BtZW50OiB7XG4gICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnJlbGF0ZWRBcHBOYW1lfTpzZXJ2ZTpkZXZlbG9wbWVudGAsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIHVwZGF0ZVdvcmtzcGFjZSh3b3Jrc3BhY2UpLFxuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHJvb3QpLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUocm9vdCksXG4gICAgICAgIF0pLFxuICAgICAgKSxcbiAgICAgIChob3N0KSA9PlxuICAgICAgICBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICdwcm90cmFjdG9yJyxcbiAgICAgICAgICAgIHZlcnNpb246ICd+Ny4wLjAnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICdqYXNtaW5lLXNwZWMtcmVwb3J0ZXInLFxuICAgICAgICAgICAgdmVyc2lvbjogJ343LjAuMCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ3RzLW5vZGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogJ345LjEuMScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ0B0eXBlcy9ub2RlJyxcbiAgICAgICAgICAgIHZlcnNpb246IGxhdGVzdFZlcnNpb25zWydAdHlwZXMvbm9kZSddLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0uZm9yRWFjaCgoZGVwKSA9PiBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3koaG9zdCwgZGVwKSksXG4gICAgICBhZGRTY3JpcHRzVG9QYWNrYWdlSnNvbigpLFxuICAgIF0pO1xuICB9O1xufVxuIl19