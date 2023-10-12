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
const tasks_1 = require("@angular-devkit/schematics/tasks");
function default_1(options) {
    if (!options.directory) {
        // If scoped project (i.e. "@foo/bar"), convert directory to "foo/bar".
        options.directory = options.name.startsWith('@') ? options.name.slice(1) : options.name;
    }
    const workspaceOptions = {
        name: options.name,
        version: options.version,
        newProjectRoot: options.newProjectRoot,
        minimal: options.minimal,
        strict: options.strict,
        packageManager: options.packageManager,
    };
    const applicationOptions = {
        projectRoot: '',
        name: options.name,
        inlineStyle: options.inlineStyle,
        inlineTemplate: options.inlineTemplate,
        prefix: options.prefix,
        viewEncapsulation: options.viewEncapsulation,
        routing: options.routing,
        style: options.style,
        skipTests: options.skipTests,
        skipPackageJson: false,
        // always 'skipInstall' here, so that we do it after the move
        skipInstall: true,
        strict: options.strict,
        minimal: options.minimal,
        standalone: options.standalone,
        ssr: options.ssr,
    };
    return (0, schematics_1.chain)([
        (0, schematics_1.mergeWith)((0, schematics_1.apply)((0, schematics_1.empty)(), [
            (0, schematics_1.schematic)('workspace', workspaceOptions),
            options.createApplication ? (0, schematics_1.schematic)('application', applicationOptions) : schematics_1.noop,
            (0, schematics_1.move)(options.directory),
        ])),
        (_host, context) => {
            let packageTask;
            if (!options.skipInstall) {
                packageTask = context.addTask(new tasks_1.NodePackageInstallTask({
                    workingDirectory: options.directory,
                    packageManager: options.packageManager,
                }));
                if (options.linkCli) {
                    packageTask = context.addTask(new tasks_1.NodePackageLinkTask('@angular/cli', options.directory), [packageTask]);
                }
            }
            if (!options.skipGit) {
                const commit = typeof options.commit == 'object' ? options.commit : options.commit ? {} : false;
                context.addTask(new tasks_1.RepositoryInitializerTask(options.directory, commit), packageTask ? [packageTask] : []);
            }
        },
    ]);
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbmctbmV3L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsMkRBV29DO0FBQ3BDLDREQUkwQztBQUsxQyxtQkFBeUIsT0FBcUI7SUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7UUFDdEIsdUVBQXVFO1FBQ3ZFLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0tBQ3pGO0lBRUQsTUFBTSxnQkFBZ0IsR0FBcUI7UUFDekMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7S0FDdkMsQ0FBQztJQUNGLE1BQU0sa0JBQWtCLEdBQXVCO1FBQzdDLFdBQVcsRUFBRSxFQUFFO1FBQ2YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztRQUNoQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7UUFDNUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7UUFDNUIsZUFBZSxFQUFFLEtBQUs7UUFDdEIsNkRBQTZEO1FBQzdELFdBQVcsRUFBRSxJQUFJO1FBQ2pCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1FBQzlCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztLQUNqQixDQUFDO0lBRUYsT0FBTyxJQUFBLGtCQUFLLEVBQUM7UUFDWCxJQUFBLHNCQUFTLEVBQ1AsSUFBQSxrQkFBSyxFQUFDLElBQUEsa0JBQUssR0FBRSxFQUFFO1lBQ2IsSUFBQSxzQkFBUyxFQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQztZQUN4QyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLElBQUEsc0JBQVMsRUFBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUk7WUFDL0UsSUFBQSxpQkFBSSxFQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDeEIsQ0FBQyxDQUNIO1FBQ0QsQ0FBQyxLQUFXLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1lBQ3pDLElBQUksV0FBVyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFO2dCQUN4QixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FDM0IsSUFBSSw4QkFBc0IsQ0FBQztvQkFDekIsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFNBQVM7b0JBQ25DLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYztpQkFDdkMsQ0FBQyxDQUNILENBQUM7Z0JBQ0YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO29CQUNuQixXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FDM0IsSUFBSSwyQkFBbUIsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUMxRCxDQUFDLFdBQVcsQ0FBQyxDQUNkLENBQUM7aUJBQ0g7YUFDRjtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUNwQixNQUFNLE1BQU0sR0FDVixPQUFPLE9BQU8sQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFFbkYsT0FBTyxDQUFDLE9BQU8sQ0FDYixJQUFJLGlDQUF5QixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQ3hELFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUNqQyxDQUFDO2FBQ0g7UUFDSCxDQUFDO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXBFRCw0QkFvRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGNoYWluLFxuICBlbXB0eSxcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzY2hlbWF0aWMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2ssXG4gIE5vZGVQYWNrYWdlTGlua1Rhc2ssXG4gIFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2ssXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuLi9hcHBsaWNhdGlvbi9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdvcmtzcGFjZU9wdGlvbnMgfSBmcm9tICcuLi93b3Jrc3BhY2Uvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOZ05ld09wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBOZ05ld09wdGlvbnMpOiBSdWxlIHtcbiAgaWYgKCFvcHRpb25zLmRpcmVjdG9yeSkge1xuICAgIC8vIElmIHNjb3BlZCBwcm9qZWN0IChpLmUuIFwiQGZvby9iYXJcIiksIGNvbnZlcnQgZGlyZWN0b3J5IHRvIFwiZm9vL2JhclwiLlxuICAgIG9wdGlvbnMuZGlyZWN0b3J5ID0gb3B0aW9ucy5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSA/IG9wdGlvbnMubmFtZS5zbGljZSgxKSA6IG9wdGlvbnMubmFtZTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtzcGFjZU9wdGlvbnM6IFdvcmtzcGFjZU9wdGlvbnMgPSB7XG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgIHZlcnNpb246IG9wdGlvbnMudmVyc2lvbixcbiAgICBuZXdQcm9qZWN0Um9vdDogb3B0aW9ucy5uZXdQcm9qZWN0Um9vdCxcbiAgICBtaW5pbWFsOiBvcHRpb25zLm1pbmltYWwsXG4gICAgc3RyaWN0OiBvcHRpb25zLnN0cmljdCxcbiAgICBwYWNrYWdlTWFuYWdlcjogb3B0aW9ucy5wYWNrYWdlTWFuYWdlcixcbiAgfTtcbiAgY29uc3QgYXBwbGljYXRpb25PcHRpb25zOiBBcHBsaWNhdGlvbk9wdGlvbnMgPSB7XG4gICAgcHJvamVjdFJvb3Q6ICcnLFxuICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcbiAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4LFxuICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICBzdHlsZTogb3B0aW9ucy5zdHlsZSxcbiAgICBza2lwVGVzdHM6IG9wdGlvbnMuc2tpcFRlc3RzLFxuICAgIHNraXBQYWNrYWdlSnNvbjogZmFsc2UsXG4gICAgLy8gYWx3YXlzICdza2lwSW5zdGFsbCcgaGVyZSwgc28gdGhhdCB3ZSBkbyBpdCBhZnRlciB0aGUgbW92ZVxuICAgIHNraXBJbnN0YWxsOiB0cnVlLFxuICAgIHN0cmljdDogb3B0aW9ucy5zdHJpY3QsXG4gICAgbWluaW1hbDogb3B0aW9ucy5taW5pbWFsLFxuICAgIHN0YW5kYWxvbmU6IG9wdGlvbnMuc3RhbmRhbG9uZSxcbiAgICBzc3I6IG9wdGlvbnMuc3NyLFxuICB9O1xuXG4gIHJldHVybiBjaGFpbihbXG4gICAgbWVyZ2VXaXRoKFxuICAgICAgYXBwbHkoZW1wdHkoKSwgW1xuICAgICAgICBzY2hlbWF0aWMoJ3dvcmtzcGFjZScsIHdvcmtzcGFjZU9wdGlvbnMpLFxuICAgICAgICBvcHRpb25zLmNyZWF0ZUFwcGxpY2F0aW9uID8gc2NoZW1hdGljKCdhcHBsaWNhdGlvbicsIGFwcGxpY2F0aW9uT3B0aW9ucykgOiBub29wLFxuICAgICAgICBtb3ZlKG9wdGlvbnMuZGlyZWN0b3J5KSxcbiAgICAgIF0pLFxuICAgICksXG4gICAgKF9ob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgICBsZXQgcGFja2FnZVRhc2s7XG4gICAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgICAgcGFja2FnZVRhc2sgPSBjb250ZXh0LmFkZFRhc2soXG4gICAgICAgICAgbmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soe1xuICAgICAgICAgICAgd29ya2luZ0RpcmVjdG9yeTogb3B0aW9ucy5kaXJlY3RvcnksXG4gICAgICAgICAgICBwYWNrYWdlTWFuYWdlcjogb3B0aW9ucy5wYWNrYWdlTWFuYWdlcixcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubGlua0NsaSkge1xuICAgICAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKFxuICAgICAgICAgICAgbmV3IE5vZGVQYWNrYWdlTGlua1Rhc2soJ0Bhbmd1bGFyL2NsaScsIG9wdGlvbnMuZGlyZWN0b3J5KSxcbiAgICAgICAgICAgIFtwYWNrYWdlVGFza10sXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLnNraXBHaXQpIHtcbiAgICAgICAgY29uc3QgY29tbWl0ID1cbiAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5jb21taXQgPT0gJ29iamVjdCcgPyBvcHRpb25zLmNvbW1pdCA6IG9wdGlvbnMuY29tbWl0ID8ge30gOiBmYWxzZTtcblxuICAgICAgICBjb250ZXh0LmFkZFRhc2soXG4gICAgICAgICAgbmV3IFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2sob3B0aW9ucy5kaXJlY3RvcnksIGNvbW1pdCksXG4gICAgICAgICAgcGFja2FnZVRhc2sgPyBbcGFja2FnZVRhc2tdIDogW10sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSxcbiAgXSk7XG59XG4iXX0=