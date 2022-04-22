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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQXVEO0FBQ3ZELDJEQVdvQztBQUNwQywwREFBdUY7QUFDdkYsb0RBQWdEO0FBQ2hELGdFQUE0RDtBQUM1RCw0Q0FBK0Q7QUFDL0Qsb0RBQXFFO0FBQ3JFLGtFQUF1RDtBQUd2RCxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDZCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUNoRDtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxtQkFBeUIsT0FBbUI7SUFDMUMsT0FBTyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osTUFBTSxJQUFJLGdDQUFtQixDQUFDLGlCQUFpQixVQUFVLHNCQUFzQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2xCLElBQUksRUFBRSxLQUFLO1lBQ1gsT0FBTyxFQUFFLDJCQUFRLENBQUMsVUFBVTtZQUM1QixvQkFBb0IsRUFBRSxhQUFhO1lBQ25DLE9BQU8sRUFBRTtnQkFDUCxnQkFBZ0IsRUFBRSxHQUFHLElBQUkscUJBQXFCO2FBQy9DO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFVBQVUsRUFBRTtvQkFDVixlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxtQkFBbUI7aUJBQzlEO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxlQUFlLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxvQkFBb0I7aUJBQy9EO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUEsa0JBQUssRUFBQztZQUNYLElBQUEsMkJBQWUsRUFBQyxTQUFTLENBQUM7WUFDMUIsSUFBQSxzQkFBUyxFQUNQLElBQUEsa0JBQUssRUFBQyxJQUFBLGdCQUFHLEVBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUEsMkJBQWMsRUFBQztvQkFDYixLQUFLLEVBQUUsb0JBQU87b0JBQ2QsR0FBRyxPQUFPO29CQUNWLDJCQUEyQixFQUFFLElBQUEsbUNBQTJCLEVBQUMsSUFBSSxDQUFDO2lCQUMvRCxDQUFDO2dCQUNGLElBQUEsaUJBQUksRUFBQyxJQUFJLENBQUM7YUFDWCxDQUFDLENBQ0g7WUFDRCxDQUFDLElBQUksRUFBRSxFQUFFLENBQ1A7Z0JBQ0U7b0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7b0JBQzVCLElBQUksRUFBRSxZQUFZO29CQUNsQixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7b0JBQzVCLElBQUksRUFBRSx1QkFBdUI7b0JBQzdCLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRDtvQkFDRSxJQUFJLEVBQUUsaUNBQWtCLENBQUMsR0FBRztvQkFDNUIsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsYUFBYTtvQkFDbkIsT0FBTyxFQUFFLGdDQUFjLENBQUMsYUFBYSxDQUFDO2lCQUN2QzthQUNGLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6RCx1QkFBdUIsRUFBRTtTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBbEVELDRCQWtFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHN0cmluZ3MsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGxhdGVzdFZlcnNpb25zIH0gZnJvbSAnLi4vdXRpbGl0eS9sYXRlc3QtdmVyc2lvbnMnO1xuaW1wb3J0IHsgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290IH0gZnJvbSAnLi4vdXRpbGl0eS9wYXRocyc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UsIHVwZGF0ZVdvcmtzcGFjZSB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBFMmVPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5mdW5jdGlvbiBhZGRTY3JpcHRzVG9QYWNrYWdlSnNvbigpOiBSdWxlIHtcbiAgcmV0dXJuIChob3N0KSA9PiB7XG4gICAgY29uc3QgcGtnSnNvbiA9IG5ldyBKU09ORmlsZShob3N0LCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgZTJlU2NyaXB0UGF0aCA9IFsnc2NyaXB0cycsICdlMmUnXTtcblxuICAgIGlmICghcGtnSnNvbi5nZXQoZTJlU2NyaXB0UGF0aCkpIHtcbiAgICAgIHBrZ0pzb24ubW9kaWZ5KGUyZVNjcmlwdFBhdGgsICduZyBlMmUnLCBmYWxzZSk7XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogRTJlT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCBhcHBQcm9qZWN0ID0gb3B0aW9ucy5yZWxhdGVkQXBwTmFtZTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQoYXBwUHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBuYW1lIFwiJHthcHBQcm9qZWN0fVwiIGRvZXNuJ3Qgbm90IGV4aXN0LmApO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3QgPSBqb2luKG5vcm1hbGl6ZShwcm9qZWN0LnJvb3QpLCAnZTJlJyk7XG5cbiAgICBwcm9qZWN0LnRhcmdldHMuYWRkKHtcbiAgICAgIG5hbWU6ICdlMmUnLFxuICAgICAgYnVpbGRlcjogQnVpbGRlcnMuUHJvdHJhY3RvcixcbiAgICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiAnZGV2ZWxvcG1lbnQnLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBwcm90cmFjdG9yQ29uZmlnOiBgJHtyb290fS9wcm90cmFjdG9yLmNvbmYuanNgLFxuICAgICAgfSxcbiAgICAgIGNvbmZpZ3VyYXRpb25zOiB7XG4gICAgICAgIHByb2R1Y3Rpb246IHtcbiAgICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucmVsYXRlZEFwcE5hbWV9OnNlcnZlOnByb2R1Y3Rpb25gLFxuICAgICAgICB9LFxuICAgICAgICBkZXZlbG9wbWVudDoge1xuICAgICAgICAgIGRldlNlcnZlclRhcmdldDogYCR7b3B0aW9ucy5yZWxhdGVkQXBwTmFtZX06c2VydmU6ZGV2ZWxvcG1lbnRgLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICB1cGRhdGVXb3Jrc3BhY2Uod29ya3NwYWNlKSxcbiAgICAgIG1lcmdlV2l0aChcbiAgICAgICAgYXBwbHkodXJsKCcuL2ZpbGVzJyksIFtcbiAgICAgICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgICAgICB1dGlsczogc3RyaW5ncyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Q6IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdChyb290KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBtb3ZlKHJvb3QpLFxuICAgICAgICBdKSxcbiAgICAgICksXG4gICAgICAoaG9zdCkgPT5cbiAgICAgICAgW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAncHJvdHJhY3RvcicsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnfjcuMC4wJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAnamFzbWluZS1zcGVjLXJlcG9ydGVyJyxcbiAgICAgICAgICAgIHZlcnNpb246ICd+Ny4wLjAnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICd0cy1ub2RlJyxcbiAgICAgICAgICAgIHZlcnNpb246ICd+OS4xLjEnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogTm9kZURlcGVuZGVuY3lUeXBlLkRldixcbiAgICAgICAgICAgIG5hbWU6ICdAdHlwZXMvbm9kZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiBsYXRlc3RWZXJzaW9uc1snQHR5cGVzL25vZGUnXSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLmZvckVhY2goKGRlcCkgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcCkpLFxuICAgICAgYWRkU2NyaXB0c1RvUGFja2FnZUpzb24oKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==