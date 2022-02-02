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
        options.directory = options.name.startsWith('@') ? options.name.substr(1) : options.name;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbmctbmV3L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsMkRBV29DO0FBQ3BDLDREQUkwQztBQUsxQyxtQkFBeUIsT0FBcUI7SUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7UUFDdEIsdUVBQXVFO1FBQ3ZFLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0tBQzFGO0lBRUQsTUFBTSxnQkFBZ0IsR0FBcUI7UUFDekMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7S0FDdkMsQ0FBQztJQUNGLE1BQU0sa0JBQWtCLEdBQXVCO1FBQzdDLFdBQVcsRUFBRSxFQUFFO1FBQ2YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztRQUNoQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1FBQ3RCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7UUFDNUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1FBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7UUFDNUIsZUFBZSxFQUFFLEtBQUs7UUFDdEIsNkRBQTZEO1FBQzdELFdBQVcsRUFBRSxJQUFJO1FBQ2pCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87S0FDekIsQ0FBQztJQUVGLE9BQU8sSUFBQSxrQkFBSyxFQUFDO1FBQ1gsSUFBQSxzQkFBUyxFQUNQLElBQUEsa0JBQUssRUFBQyxJQUFBLGtCQUFLLEdBQUUsRUFBRTtZQUNiLElBQUEsc0JBQVMsRUFBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFBLHNCQUFTLEVBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJO1lBQy9FLElBQUEsaUJBQUksRUFBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQ3hCLENBQUMsQ0FDSDtRQUNELENBQUMsS0FBVyxFQUFFLE9BQXlCLEVBQUUsRUFBRTtZQUN6QyxJQUFJLFdBQVcsQ0FBQztZQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQzNCLElBQUksOEJBQXNCLENBQUM7b0JBQ3pCLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxTQUFTO29CQUNuQyxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7aUJBQ3ZDLENBQUMsQ0FDSCxDQUFDO2dCQUNGLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtvQkFDbkIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQzNCLElBQUksMkJBQW1CLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFDMUQsQ0FBQyxXQUFXLENBQUMsQ0FDZCxDQUFDO2lCQUNIO2FBQ0Y7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDcEIsTUFBTSxNQUFNLEdBQ1YsT0FBTyxPQUFPLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBRW5GLE9BQU8sQ0FBQyxPQUFPLENBQ2IsSUFBSSxpQ0FBeUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUN4RCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDakMsQ0FBQzthQUNIO1FBQ0gsQ0FBQztLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFsRUQsNEJBa0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZW1wdHksXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBOb2RlUGFja2FnZUluc3RhbGxUYXNrLFxuICBOb2RlUGFja2FnZUxpbmtUYXNrLFxuICBSZXBvc2l0b3J5SW5pdGlhbGl6ZXJUYXNrLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zIH0gZnJvbSAnLi4vYXBwbGljYXRpb24vc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBXb3Jrc3BhY2VPcHRpb25zIH0gZnJvbSAnLi4vd29ya3NwYWNlL3NjaGVtYSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgTmdOZXdPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogTmdOZXdPcHRpb25zKTogUnVsZSB7XG4gIGlmICghb3B0aW9ucy5kaXJlY3RvcnkpIHtcbiAgICAvLyBJZiBzY29wZWQgcHJvamVjdCAoaS5lLiBcIkBmb28vYmFyXCIpLCBjb252ZXJ0IGRpcmVjdG9yeSB0byBcImZvby9iYXJcIi5cbiAgICBvcHRpb25zLmRpcmVjdG9yeSA9IG9wdGlvbnMubmFtZS5zdGFydHNXaXRoKCdAJykgPyBvcHRpb25zLm5hbWUuc3Vic3RyKDEpIDogb3B0aW9ucy5uYW1lO1xuICB9XG5cbiAgY29uc3Qgd29ya3NwYWNlT3B0aW9uczogV29ya3NwYWNlT3B0aW9ucyA9IHtcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgdmVyc2lvbjogb3B0aW9ucy52ZXJzaW9uLFxuICAgIG5ld1Byb2plY3RSb290OiBvcHRpb25zLm5ld1Byb2plY3RSb290LFxuICAgIG1pbmltYWw6IG9wdGlvbnMubWluaW1hbCxcbiAgICBzdHJpY3Q6IG9wdGlvbnMuc3RyaWN0LFxuICAgIHBhY2thZ2VNYW5hZ2VyOiBvcHRpb25zLnBhY2thZ2VNYW5hZ2VyLFxuICB9O1xuICBjb25zdCBhcHBsaWNhdGlvbk9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9ucyA9IHtcbiAgICBwcm9qZWN0Um9vdDogJycsXG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgIGlubGluZVN0eWxlOiBvcHRpb25zLmlubGluZVN0eWxlLFxuICAgIGlubGluZVRlbXBsYXRlOiBvcHRpb25zLmlubGluZVRlbXBsYXRlLFxuICAgIHByZWZpeDogb3B0aW9ucy5wcmVmaXgsXG4gICAgdmlld0VuY2Fwc3VsYXRpb246IG9wdGlvbnMudmlld0VuY2Fwc3VsYXRpb24sXG4gICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgIHN0eWxlOiBvcHRpb25zLnN0eWxlLFxuICAgIHNraXBUZXN0czogb3B0aW9ucy5za2lwVGVzdHMsXG4gICAgc2tpcFBhY2thZ2VKc29uOiBmYWxzZSxcbiAgICAvLyBhbHdheXMgJ3NraXBJbnN0YWxsJyBoZXJlLCBzbyB0aGF0IHdlIGRvIGl0IGFmdGVyIHRoZSBtb3ZlXG4gICAgc2tpcEluc3RhbGw6IHRydWUsXG4gICAgc3RyaWN0OiBvcHRpb25zLnN0cmljdCxcbiAgICBtaW5pbWFsOiBvcHRpb25zLm1pbmltYWwsXG4gIH07XG5cbiAgcmV0dXJuIGNoYWluKFtcbiAgICBtZXJnZVdpdGgoXG4gICAgICBhcHBseShlbXB0eSgpLCBbXG4gICAgICAgIHNjaGVtYXRpYygnd29ya3NwYWNlJywgd29ya3NwYWNlT3B0aW9ucyksXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQXBwbGljYXRpb24gPyBzY2hlbWF0aWMoJ2FwcGxpY2F0aW9uJywgYXBwbGljYXRpb25PcHRpb25zKSA6IG5vb3AsXG4gICAgICAgIG1vdmUob3B0aW9ucy5kaXJlY3RvcnkpLFxuICAgICAgXSksXG4gICAgKSxcbiAgICAoX2hvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICAgIGxldCBwYWNrYWdlVGFzaztcbiAgICAgIGlmICghb3B0aW9ucy5za2lwSW5zdGFsbCkge1xuICAgICAgICBwYWNrYWdlVGFzayA9IGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgICBuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayh7XG4gICAgICAgICAgICB3b3JraW5nRGlyZWN0b3J5OiBvcHRpb25zLmRpcmVjdG9yeSxcbiAgICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyOiBvcHRpb25zLnBhY2thZ2VNYW5hZ2VyLFxuICAgICAgICAgIH0pLFxuICAgICAgICApO1xuICAgICAgICBpZiAob3B0aW9ucy5saW5rQ2xpKSB7XG4gICAgICAgICAgcGFja2FnZVRhc2sgPSBjb250ZXh0LmFkZFRhc2soXG4gICAgICAgICAgICBuZXcgTm9kZVBhY2thZ2VMaW5rVGFzaygnQGFuZ3VsYXIvY2xpJywgb3B0aW9ucy5kaXJlY3RvcnkpLFxuICAgICAgICAgICAgW3BhY2thZ2VUYXNrXSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMuc2tpcEdpdCkge1xuICAgICAgICBjb25zdCBjb21taXQgPVxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zLmNvbW1pdCA9PSAnb2JqZWN0JyA/IG9wdGlvbnMuY29tbWl0IDogb3B0aW9ucy5jb21taXQgPyB7fSA6IGZhbHNlO1xuXG4gICAgICAgIGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgICBuZXcgUmVwb3NpdG9yeUluaXRpYWxpemVyVGFzayhvcHRpb25zLmRpcmVjdG9yeSwgY29tbWl0KSxcbiAgICAgICAgICBwYWNrYWdlVGFzayA/IFtwYWNrYWdlVGFza10gOiBbXSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9LFxuICBdKTtcbn1cbiJdfQ==