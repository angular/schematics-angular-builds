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
        experimentalAngularNext: options.experimentalIvy,
        newProjectRoot: options.newProjectRoot || 'projects',
    };
    const applicationOptions = {
        projectRoot: '',
        name: options.name,
        experimentalIvy: options.experimentalIvy,
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        prefix: options.prefix,
        viewEncapsulation: options.viewEncapsulation,
        routing: options.routing,
        style: options.style,
        skipTests: options.skipTests,
        skipPackageJson: false,
    };
    return schematics_1.chain([
        schematics_1.mergeWith(schematics_1.apply(schematics_1.empty(), [
            schematics_1.schematic('workspace', workspaceOptions),
            options.createApplication ? schematics_1.schematic('application', applicationOptions) : schematics_1.noop,
            schematics_1.move(options.directory || options.name),
        ])),
        (_host, context) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9uZy1uZXcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwyREFZb0M7QUFDcEMsNERBSTBDO0FBTTFDLG1CQUF5QixPQUFxQjtJQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtRQUNqQixNQUFNLElBQUksZ0NBQW1CLENBQUMsc0NBQXNDLENBQUMsQ0FBQztLQUN2RTtJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztLQUNsQztJQUVELE1BQU0sZ0JBQWdCLEdBQXFCO1FBQ3pDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtRQUNsQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLGVBQWU7UUFDaEQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjLElBQUksVUFBVTtLQUNyRCxDQUFDO0lBQ0YsTUFBTSxrQkFBa0IsR0FBdUI7UUFDN0MsV0FBVyxFQUFFLEVBQUU7UUFDZixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7UUFDbEIsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO1FBQ3hDLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztRQUNoQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7UUFDNUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7UUFDNUIsZUFBZSxFQUFFLEtBQUs7S0FDdkIsQ0FBQztJQUVGLE9BQU8sa0JBQUssQ0FBQztRQUNYLHNCQUFTLENBQ1Asa0JBQUssQ0FBQyxrQkFBSyxFQUFFLEVBQUU7WUFDYixzQkFBUyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQztZQUN4QyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHNCQUFTLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJO1lBQy9FLGlCQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDO1NBQ3hDLENBQUMsQ0FDSDtRQUNELENBQUMsS0FBVyxFQUFFLE9BQXlCLEVBQUUsRUFBRTtZQUN6QyxJQUFJLFdBQVcsQ0FBQztZQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO29CQUNuQixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FDM0IsSUFBSSwyQkFBbUIsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUMxRCxDQUFDLFdBQVcsQ0FBQyxDQUNkLENBQUM7aUJBQ0g7YUFDRjtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUNwQixNQUFNLE1BQU0sR0FBRyxPQUFPLE9BQU8sQ0FBQyxNQUFNLElBQUksUUFBUTtvQkFDOUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNO29CQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFcEMsT0FBTyxDQUFDLE9BQU8sQ0FDYixJQUFJLGlDQUF5QixDQUMzQixPQUFPLENBQUMsU0FBUyxFQUNqQixNQUFNLENBQ1AsRUFDRCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDakMsQ0FBQzthQUNIO1FBQ0gsQ0FBQztLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUEvREQsNEJBK0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBlbXB0eSxcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2ssXG4gIE5vZGVQYWNrYWdlTGlua1Rhc2ssXG4gIFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2ssXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuLi9hcHBsaWNhdGlvbi9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdvcmtzcGFjZU9wdGlvbnMgfSBmcm9tICcuLi93b3Jrc3BhY2Uvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOZ05ld09wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE5nTmV3T3B0aW9ucyk6IFJ1bGUge1xuICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBJbnZhbGlkIG9wdGlvbnMsIFwibmFtZVwiIGlzIHJlcXVpcmVkLmApO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zLmRpcmVjdG9yeSkge1xuICAgIG9wdGlvbnMuZGlyZWN0b3J5ID0gb3B0aW9ucy5uYW1lO1xuICB9XG5cbiAgY29uc3Qgd29ya3NwYWNlT3B0aW9uczogV29ya3NwYWNlT3B0aW9ucyA9IHtcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgdmVyc2lvbjogb3B0aW9ucy52ZXJzaW9uLFxuICAgIGV4cGVyaW1lbnRhbEFuZ3VsYXJOZXh0OiBvcHRpb25zLmV4cGVyaW1lbnRhbEl2eSxcbiAgICBuZXdQcm9qZWN0Um9vdDogb3B0aW9ucy5uZXdQcm9qZWN0Um9vdCB8fCAncHJvamVjdHMnLFxuICB9O1xuICBjb25zdCBhcHBsaWNhdGlvbk9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyA9IHtcbiAgICBwcm9qZWN0Um9vdDogJycsXG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgIGV4cGVyaW1lbnRhbEl2eTogb3B0aW9ucy5leHBlcmltZW50YWxJdnksXG4gICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgaW5saW5lVGVtcGxhdGU6IG9wdGlvbnMuaW5saW5lVGVtcGxhdGUsXG4gICAgcHJlZml4OiBvcHRpb25zLnByZWZpeCxcbiAgICB2aWV3RW5jYXBzdWxhdGlvbjogb3B0aW9ucy52aWV3RW5jYXBzdWxhdGlvbixcbiAgICByb3V0aW5nOiBvcHRpb25zLnJvdXRpbmcsXG4gICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgc2tpcFRlc3RzOiBvcHRpb25zLnNraXBUZXN0cyxcbiAgICBza2lwUGFja2FnZUpzb246IGZhbHNlLFxuICB9O1xuXG4gIHJldHVybiBjaGFpbihbXG4gICAgbWVyZ2VXaXRoKFxuICAgICAgYXBwbHkoZW1wdHkoKSwgW1xuICAgICAgICBzY2hlbWF0aWMoJ3dvcmtzcGFjZScsIHdvcmtzcGFjZU9wdGlvbnMpLFxuICAgICAgICBvcHRpb25zLmNyZWF0ZUFwcGxpY2F0aW9uID8gc2NoZW1hdGljKCdhcHBsaWNhdGlvbicsIGFwcGxpY2F0aW9uT3B0aW9ucykgOiBub29wLFxuICAgICAgICBtb3ZlKG9wdGlvbnMuZGlyZWN0b3J5IHx8IG9wdGlvbnMubmFtZSksXG4gICAgICBdKSxcbiAgICApLFxuICAgIChfaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgICAgbGV0IHBhY2thZ2VUYXNrO1xuICAgICAgaWYgKCFvcHRpb25zLnNraXBJbnN0YWxsKSB7XG4gICAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKG9wdGlvbnMuZGlyZWN0b3J5KSk7XG4gICAgICAgIGlmIChvcHRpb25zLmxpbmtDbGkpIHtcbiAgICAgICAgICBwYWNrYWdlVGFzayA9IGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgICAgIG5ldyBOb2RlUGFja2FnZUxpbmtUYXNrKCdAYW5ndWxhci9jbGknLCBvcHRpb25zLmRpcmVjdG9yeSksXG4gICAgICAgICAgICBbcGFja2FnZVRhc2tdLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5za2lwR2l0KSB7XG4gICAgICAgIGNvbnN0IGNvbW1pdCA9IHR5cGVvZiBvcHRpb25zLmNvbW1pdCA9PSAnb2JqZWN0J1xuICAgICAgICAgID8gb3B0aW9ucy5jb21taXRcbiAgICAgICAgICA6ICghIW9wdGlvbnMuY29tbWl0ID8ge30gOiBmYWxzZSk7XG5cbiAgICAgICAgY29udGV4dC5hZGRUYXNrKFxuICAgICAgICAgIG5ldyBSZXBvc2l0b3J5SW5pdGlhbGl6ZXJUYXNrKFxuICAgICAgICAgICAgb3B0aW9ucy5kaXJlY3RvcnksXG4gICAgICAgICAgICBjb21taXQsXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwYWNrYWdlVGFzayA/IFtwYWNrYWdlVGFza10gOiBbXSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9LFxuICBdKTtcbn1cbiJdfQ==