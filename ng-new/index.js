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
        minimal: options.minimal,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9uZy1uZXcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwyREFZb0M7QUFDcEMsNERBSTBDO0FBTTFDLG1CQUF5QixPQUFxQjtJQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtRQUNqQixNQUFNLElBQUksZ0NBQW1CLENBQUMsc0NBQXNDLENBQUMsQ0FBQztLQUN2RTtJQUVELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztLQUNsQztJQUVELE1BQU0sZ0JBQWdCLEdBQXFCO1FBQ3pDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtRQUNsQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDeEIsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLGVBQWU7UUFDaEQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjLElBQUksVUFBVTtRQUNwRCxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87S0FDekIsQ0FBQztJQUNGLE1BQU0sa0JBQWtCLEdBQXVCO1FBQzdDLFdBQVcsRUFBRSxFQUFFO1FBQ2YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZTtRQUN4QyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDaEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO1FBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCO1FBQzVDLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztRQUN4QixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7UUFDcEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1FBQzVCLGVBQWUsRUFBRSxLQUFLO0tBQ3ZCLENBQUM7SUFFRixPQUFPLGtCQUFLLENBQUM7UUFDWCxzQkFBUyxDQUNQLGtCQUFLLENBQUMsa0JBQUssRUFBRSxFQUFFO1lBQ2Isc0JBQVMsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxzQkFBUyxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBSTtZQUMvRSxpQkFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQztTQUN4QyxDQUFDLENBQ0g7UUFDRCxDQUFDLEtBQVcsRUFBRSxPQUF5QixFQUFFLEVBQUU7WUFDekMsSUFBSSxXQUFXLENBQUM7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7Z0JBQ3hCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtvQkFDbkIsV0FBVyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQzNCLElBQUksMkJBQW1CLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFDMUQsQ0FBQyxXQUFXLENBQUMsQ0FDZCxDQUFDO2lCQUNIO2FBQ0Y7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxPQUFPLENBQUMsTUFBTSxJQUFJLFFBQVE7b0JBQzlDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTTtvQkFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXBDLE9BQU8sQ0FBQyxPQUFPLENBQ2IsSUFBSSxpQ0FBeUIsQ0FDM0IsT0FBTyxDQUFDLFNBQVMsRUFDakIsTUFBTSxDQUNQLEVBQ0QsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2pDLENBQUM7YUFDSDtRQUNILENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBaEVELDRCQWdFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGFwcGx5LFxuICBjaGFpbixcbiAgZW1wdHksXG4gIG1lcmdlV2l0aCxcbiAgbW92ZSxcbiAgbm9vcCxcbiAgc2NoZW1hdGljLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQge1xuICBOb2RlUGFja2FnZUluc3RhbGxUYXNrLFxuICBOb2RlUGFja2FnZUxpbmtUYXNrLFxuICBSZXBvc2l0b3J5SW5pdGlhbGl6ZXJUYXNrLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQXBwbGljYXRpb25PcHRpb25zIH0gZnJvbSAnLi4vYXBwbGljYXRpb24vc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBXb3Jrc3BhY2VPcHRpb25zIH0gZnJvbSAnLi4vd29ya3NwYWNlL3NjaGVtYSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgTmdOZXdPcHRpb25zIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBOZ05ld09wdGlvbnMpOiBSdWxlIHtcbiAgaWYgKCFvcHRpb25zLm5hbWUpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBvcHRpb25zLCBcIm5hbWVcIiBpcyByZXF1aXJlZC5gKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucy5kaXJlY3RvcnkpIHtcbiAgICBvcHRpb25zLmRpcmVjdG9yeSA9IG9wdGlvbnMubmFtZTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtzcGFjZU9wdGlvbnM6IFdvcmtzcGFjZU9wdGlvbnMgPSB7XG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgIHZlcnNpb246IG9wdGlvbnMudmVyc2lvbixcbiAgICBleHBlcmltZW50YWxBbmd1bGFyTmV4dDogb3B0aW9ucy5leHBlcmltZW50YWxJdnksXG4gICAgbmV3UHJvamVjdFJvb3Q6IG9wdGlvbnMubmV3UHJvamVjdFJvb3QgfHwgJ3Byb2plY3RzJyxcbiAgICBtaW5pbWFsOiBvcHRpb25zLm1pbmltYWwsXG4gIH07XG4gIGNvbnN0IGFwcGxpY2F0aW9uT3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zID0ge1xuICAgIHByb2plY3RSb290OiAnJyxcbiAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgZXhwZXJpbWVudGFsSXZ5OiBvcHRpb25zLmV4cGVyaW1lbnRhbEl2eSxcbiAgICBpbmxpbmVTdHlsZTogb3B0aW9ucy5pbmxpbmVTdHlsZSxcbiAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICBwcmVmaXg6IG9wdGlvbnMucHJlZml4LFxuICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgIHJvdXRpbmc6IG9wdGlvbnMucm91dGluZyxcbiAgICBzdHlsZTogb3B0aW9ucy5zdHlsZSxcbiAgICBza2lwVGVzdHM6IG9wdGlvbnMuc2tpcFRlc3RzLFxuICAgIHNraXBQYWNrYWdlSnNvbjogZmFsc2UsXG4gIH07XG5cbiAgcmV0dXJuIGNoYWluKFtcbiAgICBtZXJnZVdpdGgoXG4gICAgICBhcHBseShlbXB0eSgpLCBbXG4gICAgICAgIHNjaGVtYXRpYygnd29ya3NwYWNlJywgd29ya3NwYWNlT3B0aW9ucyksXG4gICAgICAgIG9wdGlvbnMuY3JlYXRlQXBwbGljYXRpb24gPyBzY2hlbWF0aWMoJ2FwcGxpY2F0aW9uJywgYXBwbGljYXRpb25PcHRpb25zKSA6IG5vb3AsXG4gICAgICAgIG1vdmUob3B0aW9ucy5kaXJlY3RvcnkgfHwgb3B0aW9ucy5uYW1lKSxcbiAgICAgIF0pLFxuICAgICksXG4gICAgKF9ob3N0OiBUcmVlLCBjb250ZXh0OiBTY2hlbWF0aWNDb250ZXh0KSA9PiB7XG4gICAgICBsZXQgcGFja2FnZVRhc2s7XG4gICAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgICAgcGFja2FnZVRhc2sgPSBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sob3B0aW9ucy5kaXJlY3RvcnkpKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubGlua0NsaSkge1xuICAgICAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKFxuICAgICAgICAgICAgbmV3IE5vZGVQYWNrYWdlTGlua1Rhc2soJ0Bhbmd1bGFyL2NsaScsIG9wdGlvbnMuZGlyZWN0b3J5KSxcbiAgICAgICAgICAgIFtwYWNrYWdlVGFza10sXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLnNraXBHaXQpIHtcbiAgICAgICAgY29uc3QgY29tbWl0ID0gdHlwZW9mIG9wdGlvbnMuY29tbWl0ID09ICdvYmplY3QnXG4gICAgICAgICAgPyBvcHRpb25zLmNvbW1pdFxuICAgICAgICAgIDogKCEhb3B0aW9ucy5jb21taXQgPyB7fSA6IGZhbHNlKTtcblxuICAgICAgICBjb250ZXh0LmFkZFRhc2soXG4gICAgICAgICAgbmV3IFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2soXG4gICAgICAgICAgICBvcHRpb25zLmRpcmVjdG9yeSxcbiAgICAgICAgICAgIGNvbW1pdCxcbiAgICAgICAgICApLFxuICAgICAgICAgIHBhY2thZ2VUYXNrID8gW3BhY2thZ2VUYXNrXSA6IFtdLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0sXG4gIF0pO1xufVxuIl19