"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
function default_1(options) {
    if (!options.name) {
        throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
    }
    if (!options.directory) {
        options.directory = options.name;
    }
    const workspaceOptions = {
        name: options.name,
        version: options.version,
        newProjectRoot: options.newProjectRoot || 'projects',
    };
    const applicationOptions = {
        projectRoot: '',
        name: options.name,
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        viewEncapsulation: options.viewEncapsulation,
        routing: options.routing,
        style: options.style,
        skipTests: options.skipTests,
        skipPackageJson: false,
    };
    return schematics_1.chain([
        schematics_1.mergeWith(schematics_1.apply(schematics_1.empty(), [
            schematics_1.schematic('workspace', workspaceOptions),
            schematics_1.schematic('application', applicationOptions),
            schematics_1.move(options.directory || options.name),
            tree => schematics_1.Tree.optimize(tree),
        ])),
        (host, context) => {
            let packageTask;
            if (!options.skipInstall) {
                packageTask = context.addTask(new tasks_1.NodePackageInstallTask(options.directory));
                if (options.linkCli) {
                    packageTask = context.addTask(new tasks_1.NodePackageLinkTask('@angular/cli', options.directory), [packageTask]);
                }
            }
            if (!options.skipGit) {
                const commit = typeof options.commit == 'object'
                    ? options.commit
                    : (!!options.commit ? {} : false);
                context.addTask(new tasks_1.RepositoryInitializerTask(options.directory, commit), packageTask ? [packageTask] : []);
            }
        },
    ]);
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9uZy1uZXcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwyREFXb0M7QUFDcEMsNERBSTBDO0FBTTFDLG1CQUF5QixPQUFxQjtJQUM1QyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztJQUNuQyxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBcUI7UUFDekMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWMsSUFBSSxVQUFVO0tBQ3JELENBQUM7SUFDRixNQUFNLGtCQUFrQixHQUF1QjtRQUM3QyxXQUFXLEVBQUUsRUFBRTtRQUNmLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtRQUNsQixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDaEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO1FBQ3RDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7UUFDNUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7UUFDNUIsZUFBZSxFQUFFLEtBQUs7S0FDdkIsQ0FBQztJQUVGLE1BQU0sQ0FBQyxrQkFBSyxDQUFDO1FBQ1gsc0JBQVMsQ0FDUCxrQkFBSyxDQUFDLGtCQUFLLEVBQUUsRUFBRTtZQUNiLHNCQUFTLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDO1lBQ3hDLHNCQUFTLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDO1lBQzVDLGlCQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQzVCLENBQUMsQ0FDSDtRQUNELENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtZQUN4QyxJQUFJLFdBQVcsQ0FBQztZQUNoQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUN6QixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLDhCQUFzQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDcEIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQzNCLElBQUksMkJBQW1CLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFDMUQsQ0FBQyxXQUFXLENBQUMsQ0FDZCxDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDckIsTUFBTSxNQUFNLEdBQUcsT0FBTyxPQUFPLENBQUMsTUFBTSxJQUFJLFFBQVE7b0JBQzlDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTTtvQkFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXBDLE9BQU8sQ0FBQyxPQUFPLENBQ2IsSUFBSSxpQ0FBeUIsQ0FDM0IsT0FBTyxDQUFDLFNBQVMsRUFDakIsTUFBTSxDQUNQLEVBQ0QsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2pDLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUE3REQsNEJBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBlbXB0eSxcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBzY2hlbWF0aWMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2ssXG4gIE5vZGVQYWNrYWdlTGlua1Rhc2ssXG4gIFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2ssXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuLi9hcHBsaWNhdGlvbi9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdvcmtzcGFjZU9wdGlvbnMgfSBmcm9tICcuLi93b3Jrc3BhY2Uvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOZ05ld09wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE5nTmV3T3B0aW9ucyk6IFJ1bGUge1xuICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zLmRpcmVjdG9yeSkge1xuICAgIG9wdGlvbnMuZGlyZWN0b3J5ID0gb3B0aW9ucy5uYW1lO1xuICB9XG5cbiAgY29uc3Qgd29ya3NwYWNlT3B0aW9uczogV29ya3NwYWNlT3B0aW9ucyA9IHtcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgdmVyc2lvbjogb3B0aW9ucy52ZXJzaW9uLFxuICAgIG5ld1Byb2plY3RSb290OiBvcHRpb25zLm5ld1Byb2plY3RSb290IHx8ICdwcm9qZWN0cycsXG4gIH07XG4gIGNvbnN0IGFwcGxpY2F0aW9uT3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zID0ge1xuICAgIHByb2plY3RSb290OiAnJyxcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgc2tpcFBhY2thZ2VKc29uOiBmYWxzZSxcbiAgfTtcblxuICByZXR1cm4gY2hhaW4oW1xuICAgIG1lcmdlV2l0aChcbiAgICAgIGFwcGx5KGVtcHR5KCksIFtcbiAgICAgICAgc2NoZW1hdGljKCd3b3Jrc3BhY2UnLCB3b3Jrc3BhY2VPcHRpb25zKSxcbiAgICAgICAgc2NoZW1hdGljKCdhcHBsaWNhdGlvbicsIGFwcGxpY2F0aW9uT3B0aW9ucyksXG4gICAgICAgIG1vdmUob3B0aW9ucy5kaXJlY3RvcnkgfHwgb3B0aW9ucy5uYW1lKSxcbiAgICAgICAgdHJlZSA9PiBUcmVlLm9wdGltaXplKHRyZWUpLFxuICAgICAgXSksXG4gICAgKSxcbiAgICAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgbGV0IHBhY2thZ2VUYXNrO1xuICAgICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKG9wdGlvbnMuZGlyZWN0b3J5KSk7XG4gICAgICAgIGlmIChvcHRpb25zLmxpbmtDbGkpIHtcbiAgICAgICAgICBwYWNrYWdlVGFzayA9IGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgICAgIG5ldyBOb2RlUGFja2FnZUxpbmtUYXNrKCdAYW5ndWxhci9jbGknLCBvcHRpb25zLmRpcmVjdG9yeSksXG4gICAgICAgICAgICBbcGFja2FnZVRhc2tdLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5za2lwR2l0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdCA9IHR5cGVvZiBvcHRpb25zLmNvbW1pdCA9PSAnb2JqZWN0J1xuICAgICAgICAgID8gb3B0aW9ucy5jb21taXRcbiAgICAgICAgICA6ICghIW9wdGlvbnMuY29tbWl0ID8ge30gOiBmYWxzZSk7XG5cbiAgICAgICAgY29udGV4dC5hZGRUYXNrKFxuICAgICAgICAgIG5ldyBSZXBvc2l0b3J5SW5pdGlhbGl6ZXJUYXNrKFxuICAgICAgICAgICAgb3B0aW9ucy5kaXJlY3RvcnksXG4gICAgICAgICAgICBjb21taXQsXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwYWNrYWdlVGFzayA/IFtwYWNrYWdlVGFza10gOiBbXSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9LFxuICBdKTtcbn1cbiJdfQ==