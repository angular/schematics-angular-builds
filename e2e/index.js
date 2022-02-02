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
            ].forEach((dep) => (0, dependencies_1.addPackageJsonDependency)(host, dep)),
            addScriptsToPackageJson(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZTJlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQWdFO0FBQ2hFLDJEQVVvQztBQUNwQywwREFBdUY7QUFDdkYsb0RBQWdEO0FBQ2hELDRDQUErRDtBQUMvRCxvREFBcUU7QUFDckUsa0VBQXVEO0FBR3ZELFNBQVMsdUJBQXVCO0lBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksb0JBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2hEO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELG1CQUF5QixPQUFtQjtJQUMxQyxPQUFPLEtBQUssRUFBRSxJQUFVLEVBQUUsRUFBRTtRQUMxQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSx3QkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixNQUFNLElBQUksZ0NBQW1CLENBQUMsaUJBQWlCLFVBQVUsc0JBQXNCLENBQUMsQ0FBQztTQUNsRjtRQUVELE1BQU0sSUFBSSxHQUFHLElBQUEsV0FBSSxFQUFDLElBQUEsZ0JBQVMsRUFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDbEIsSUFBSSxFQUFFLEtBQUs7WUFDWCxPQUFPLEVBQUUsMkJBQVEsQ0FBQyxVQUFVO1lBQzVCLG9CQUFvQixFQUFFLGFBQWE7WUFDbkMsT0FBTyxFQUFFO2dCQUNQLGdCQUFnQixFQUFFLEdBQUcsSUFBSSxxQkFBcUI7YUFDL0M7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsVUFBVSxFQUFFO29CQUNWLGVBQWUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLG1CQUFtQjtpQkFDOUQ7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLGVBQWUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLG9CQUFvQjtpQkFDL0Q7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBQSxrQkFBSyxFQUFDO1lBQ1gsSUFBQSwyQkFBZSxFQUFDLFNBQVMsQ0FBQztZQUMxQixJQUFBLHNCQUFTLEVBQ1AsSUFBQSxrQkFBSyxFQUFDLElBQUEsZ0JBQUcsRUFBQyxTQUFTLENBQUMsRUFBRTtnQkFDcEIsSUFBQSwyQkFBYyxFQUFDO29CQUNiLEtBQUssRUFBRSxjQUFPO29CQUNkLEdBQUcsT0FBTztvQkFDViwyQkFBMkIsRUFBRSxJQUFBLG1DQUEyQixFQUFDLElBQUksQ0FBQztpQkFDL0QsQ0FBQztnQkFDRixJQUFBLGlCQUFJLEVBQUMsSUFBSSxDQUFDO2FBQ1gsQ0FBQyxDQUNIO1lBQ0QsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNQO2dCQUNFO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsWUFBWTtvQkFDbEIsT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNEO29CQUNFLElBQUksRUFBRSxpQ0FBa0IsQ0FBQyxHQUFHO29CQUM1QixJQUFJLEVBQUUsdUJBQXVCO29CQUM3QixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUc7b0JBQzVCLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjthQUNGLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFBLHVDQUF3QixFQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6RCx1QkFBdUIsRUFBRTtTQUMxQixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBN0RELDRCQTZEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUsIHN0cmluZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZURlcGVuZGVuY3lUeXBlLCBhZGRQYWNrYWdlSnNvbkRlcGVuZGVuY3kgfSBmcm9tICcuLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgRTJlT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkU2NyaXB0c1RvUGFja2FnZUpzb24oKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdCkgPT4ge1xuICAgIGNvbnN0IHBrZ0pzb24gPSBuZXcgSlNPTkZpbGUoaG9zdCwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGNvbnN0IGUyZVNjcmlwdFBhdGggPSBbJ3NjcmlwdHMnLCAnZTJlJ107XG5cbiAgICBpZiAoIXBrZ0pzb24uZ2V0KGUyZVNjcmlwdFBhdGgpKSB7XG4gICAgICBwa2dKc29uLm1vZGlmeShlMmVTY3JpcHRQYXRoLCAnbmcgZTJlJywgZmFsc2UpO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IEUyZU9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jIChob3N0OiBUcmVlKSA9PiB7XG4gICAgY29uc3QgYXBwUHJvamVjdCA9IG9wdGlvbnMucmVsYXRlZEFwcE5hbWU7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KGFwcFByb2plY3QpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYFByb2plY3QgbmFtZSBcIiR7YXBwUHJvamVjdH1cIiBkb2Vzbid0IG5vdCBleGlzdC5gKTtcbiAgICB9XG5cbiAgICBjb25zdCByb290ID0gam9pbihub3JtYWxpemUocHJvamVjdC5yb290KSwgJ2UyZScpO1xuXG4gICAgcHJvamVjdC50YXJnZXRzLmFkZCh7XG4gICAgICBuYW1lOiAnZTJlJyxcbiAgICAgIGJ1aWxkZXI6IEJ1aWxkZXJzLlByb3RyYWN0b3IsXG4gICAgICBkZWZhdWx0Q29uZmlndXJhdGlvbjogJ2RldmVsb3BtZW50JyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgcHJvdHJhY3RvckNvbmZpZzogYCR7cm9vdH0vcHJvdHJhY3Rvci5jb25mLmpzYCxcbiAgICAgIH0sXG4gICAgICBjb25maWd1cmF0aW9uczoge1xuICAgICAgICBwcm9kdWN0aW9uOiB7XG4gICAgICAgICAgZGV2U2VydmVyVGFyZ2V0OiBgJHtvcHRpb25zLnJlbGF0ZWRBcHBOYW1lfTpzZXJ2ZTpwcm9kdWN0aW9uYCxcbiAgICAgICAgfSxcbiAgICAgICAgZGV2ZWxvcG1lbnQ6IHtcbiAgICAgICAgICBkZXZTZXJ2ZXJUYXJnZXQ6IGAke29wdGlvbnMucmVsYXRlZEFwcE5hbWV9OnNlcnZlOmRldmVsb3BtZW50YCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgdXBkYXRlV29ya3NwYWNlKHdvcmtzcGFjZSksXG4gICAgICBtZXJnZVdpdGgoXG4gICAgICAgIGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICAgICAgYXBwbHlUZW1wbGF0ZXMoe1xuICAgICAgICAgICAgdXRpbHM6IHN0cmluZ3MsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Qocm9vdCksXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbW92ZShyb290KSxcbiAgICAgICAgXSksXG4gICAgICApLFxuICAgICAgKGhvc3QpID0+XG4gICAgICAgIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ3Byb3RyYWN0b3InLFxuICAgICAgICAgICAgdmVyc2lvbjogJ343LjAuMCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiBOb2RlRGVwZW5kZW5jeVR5cGUuRGV2LFxuICAgICAgICAgICAgbmFtZTogJ2phc21pbmUtc3BlYy1yZXBvcnRlcicsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnfjcuMC4wJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6IE5vZGVEZXBlbmRlbmN5VHlwZS5EZXYsXG4gICAgICAgICAgICBuYW1lOiAndHMtbm9kZScsXG4gICAgICAgICAgICB2ZXJzaW9uOiAnfjkuMS4xJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLmZvckVhY2goKGRlcCkgPT4gYWRkUGFja2FnZUpzb25EZXBlbmRlbmN5KGhvc3QsIGRlcCkpLFxuICAgICAgYWRkU2NyaXB0c1RvUGFja2FnZUpzb24oKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==