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
                    version: latest_versions_1.latestVersions['ts-node'],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXVEO0FBQ3ZELDJEQVdvQztBQUNwQyx3Q0FBMkQ7QUFDM0QsMERBQXVGO0FBQ3ZGLG9EQUFnRDtBQUNoRCxnRUFBNEQ7QUFDNUQsNENBQStEO0FBQy9ELGtFQUF1RDtBQUd2RCxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsdUJBQWEsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlCQUFpQixVQUFVLHNCQUFzQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2xCLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLDJCQUFRLENBQUMsVUFBVTtZQUM1QixvQkFBb0IsRUFBRSxhQUFhO1lBQ25DLE9BQU8sRUFBRTtnQkFDUCxnQkFBZ0IsRUFBRSxHQUFHLElBQUkscUJBQXFCO2FBQy9DO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFVBQVUsRUFBRTtvQkFDVixlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxtQkFBbUI7aUJBQzlEO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxvQkFBb0I7aUJBQy9EO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLElBQUEsd0JBQWMsRUFBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEMsT0FBTyxJQUFBLGtCQUFLLEVBQUM7WUFDWCxJQUFBLHNCQUFTLEVBQ1AsSUFBQSxrQkFBSyxFQUFDLElBQUEsZ0JBQUcsRUFBQyxTQUFTLENBQUMsRUFBRTtnQkFDcEIsSUFBQSwyQkFBYyxFQUFDO29CQUNiLEtBQUssRUFBRSxvQkFBTztvQkFDZCxHQUFHLE9BQU87b0JBQ1YsMkJBQTJCLEVBQUUsSUFBQSxtQ0FBMkIsRUFBQyxJQUFJLENBQUM7aUJBQy9ELENBQUM7Z0JBQ0YsSUFBQSxpQkFBSSxFQUFDLElBQUksQ0FBQzthQUNYLENBQUMsQ0FDSDtZQUNELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDUDtnQkFDRTtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRDtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLHVCQUF1QjtvQkFDN0IsT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsU0FBUztvQkFDZixPQUFPLEVBQUUsZ0NBQWMsQ0FBQyxTQUFTLENBQUM7aUJBQ25DO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsYUFBYTtvQkFDbkIsT0FBTyxFQUFFLGdDQUFjLENBQUMsYUFBYSxDQUFDO2lCQUN2QzthQUNGLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6RCx1QkFBdUIsRUFBRTtTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBbkVELDRCQW1FQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgcmVhZFdvcmtzcGFjZSwgd3JpdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5JztcbmltcG9ydCB7IE5vZGVEZXBlbmRlbmN5VHlwZSwgYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5IH0gZnJvbSAnLi4vdXRpbGl0eS9kZXBlbmRlbmNpZXMnO1xuaW1wb3J0IHsgSlNPTkZpbGUgfSBmcm9tICcuLi91dGlsaXR5L2pzb24tZmlsZSc7XG5pbXBvcnQgeyBsYXRlc3RWZXJzaW9ucyB9IGZyb20gJy4uL3V0aWxpdHkvbGF0ZXN0LXZlcnNpb25zJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgQnVpbGRlcnMgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEUyZU9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZFNjcmlwdHNUb1BhY2thZ2VKc29uKCk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3QpID0+IHtcbiAgICBjb25zdCBwa2dKc29uID0gbmV3IEpTT05GaWxlKGhvc3QsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBlMmVTY3JpcHRQYXRoID0gWydzY3JpcHRzJywgJ2UyZSddO1xuXG4gICAgaWYgKCFwa2dKc29uLmdldChlMmVTY3JpcHRQYXRoKSkge1xuICAgICAgcGtnSnNvbi5tb2RpZnkoZTJlU2NyaXB0UGF0aCwgJ25nIGUyZScsIGZhbHNlKTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBFMmVPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IGFwcFByb2plY3QgPSBvcHRpb25zLnJlbGF0ZWRBcHBOYW1lO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHJlYWRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQoYXBwUHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBuYW1lIFwiJHthcHBQcm9qZWN0fVwiIGRvZXNuJ3Qgbm90IGV4aXN0LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3QgPSBqb2luKG5vcm1hbGl6ZShwcm9qZWN0LnJvb3QpLCAnZTJlJyk7XG5cbiAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgIG5hbWU6ICdlMmUnLFxuICAgICAgYnVpbGRlcjogQnVpbGRlcnMuUHJvdHJhY3RvcixcbiAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBgJHtyb290fS9wcm90cmFjdG9yLmNvbmYuanNgLFxuICAgICAgfSxcbiAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucmVsYXRlZEFwcE5hbWV9OnNlcnZlOnByb2R1Y3Rpb25gLFxuICAgICAgICB9LFxuICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGF3YWl0IHdyaXRlV29ya3NwYWNlKGhvc3QsIHdvcmtzcGFjZSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgbWVyZ2VXaXRoKFxuICAgICAgICBhcHBseSh1cmwoJy4vZmlsZXMnKSwgW1xuICAgICAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgICAgIHV0aWxzOiBzdHJpbmdzLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHJvb3QpLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG1vdmUocm9vdCksXG4gICAgICAgIF0pLFxuICAgICAgKSxcbiAgICAgIChob3N0KSA9PlxuICAgICAgICBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICdwcm90cmFjdG9yJyxcbiAgICAgICAgICAgIHZlcnNpb246ICd+Ny4wLjAnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICdqYXNtaW5lLXNwZWMtcmVwb3J0ZXInLFxuICAgICAgICAgICAgdmVyc2lvbjogJ343LjAuMCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ3RzLW5vZGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ3RzLW5vZGUnXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAnQHR5cGVzL25vZGUnLFxuICAgICAgICAgICAgdmVyc2lvbjogbGF0ZXN0VmVyc2lvbnNbJ0B0eXBlcy9ub2RlJ10sXG4gICAgICAgICAgfSxcbiAgICAgICAgXS5mb3JFYWNoKChkZXApID0+IGFkZFBhY2thZ2VKc29uRGVwZW5kZW5jeShob3N0LCBkZXApKSxcbiAgICAgIGFkZFNjcmlwdHNUb1BhY2thZ2VKc29uKCksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=