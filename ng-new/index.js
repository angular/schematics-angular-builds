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
    return (host, context) => {
        if (!options.name) {
            throw new schematics_1.SchematicsException(`Invalid options, "name" is required.`);
        }
        if (!options.directory) {
            options.directory = options.name;
        }
        let packageTask;
        if (!options.skipInstall) {
            packageTask = context.addTask(new tasks_1.NodePackageInstallTask(options.directory));
            if (options.linkCli) {
                packageTask = context.addTask(new tasks_1.NodePackageLinkTask('@angular/cli', options.directory), [packageTask]);
            }
        }
        if (!options.skipGit) {
            context.addTask(new tasks_1.RepositoryInitializerTask(options.directory, options.commit), packageTask ? [packageTask] : []);
        }
        const workspaceOptions = {
            name: options.name,
            version: options.version,
            newProjectRoot: options.newProjectRoot || 'projects',
        };
        const applicationOptions = {
            name: options.name,
            inlineStyle: options.inlineStyle,
            inlineTemplate: options.inlineTemplate,
            viewEncapsulation: options.viewEncapsulation,
            routing: options.routing,
            style: options.style,
            skipTests: options.skipTests,
        };
        return schematics_1.chain([
            schematics_1.schematic('workspace', workspaceOptions),
            schematics_1.schematic('application', applicationOptions),
            schematics_1.move(options.directory || options.name),
        ])(host, context);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9uZy1uZXcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwyREFRb0M7QUFDcEMsNERBSTBDO0FBTTFDLG1CQUF5QixPQUFxQjtJQUM1QyxNQUFNLENBQUMsQ0FBQyxJQUFVLEVBQUUsT0FBeUIsRUFBRSxFQUFFO1FBQy9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDdkIsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ25DLENBQUM7UUFDRCxJQUFJLFdBQVcsQ0FBQztRQUNoQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksOEJBQXNCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDN0UsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLFdBQVcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUMzQixJQUFJLDJCQUFtQixDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQzFELENBQUMsV0FBVyxDQUFDLENBQ2QsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNyQixPQUFPLENBQUMsT0FBTyxDQUNiLElBQUksaUNBQXlCLENBQzNCLE9BQU8sQ0FBQyxTQUFTLEVBQ2pCLE9BQU8sQ0FBQyxNQUFNLENBQ2YsRUFDRCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDakMsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFxQjtZQUN6QyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1lBQ3hCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYyxJQUFJLFVBQVU7U0FDckQsQ0FBQztRQUNGLE1BQU0sa0JBQWtCLEdBQXVCO1lBQzdDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQ3RDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7WUFDNUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1lBQ3hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7U0FDN0IsQ0FBQztRQUVGLE1BQU0sQ0FBQyxrQkFBSyxDQUFDO1lBQ1gsc0JBQVMsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEMsc0JBQVMsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUM7WUFDNUMsaUJBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUM7U0FDeEMsQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUM7QUFDSixDQUFDO0FBbERELDRCQWtEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIFJ1bGUsXG4gIFNjaGVtYXRpY0NvbnRleHQsXG4gIFNjaGVtYXRpY3NFeGNlcHRpb24sXG4gIFRyZWUsXG4gIGNoYWluLFxuICBtb3ZlLFxuICBzY2hlbWF0aWMsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7XG4gIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2ssXG4gIE5vZGVQYWNrYWdlTGlua1Rhc2ssXG4gIFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2ssXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCB7IFNjaGVtYSBhcyBBcHBsaWNhdGlvbk9wdGlvbnMgfSBmcm9tICcuLi9hcHBsaWNhdGlvbi9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdvcmtzcGFjZU9wdGlvbnMgfSBmcm9tICcuLi93b3Jrc3BhY2Uvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBOZ05ld09wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdGlvbnM6IE5nTmV3T3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBpZiAoIW9wdGlvbnMubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgb3B0aW9ucywgXCJuYW1lXCIgaXMgcmVxdWlyZWQuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLmRpcmVjdG9yeSkge1xuICAgICAgb3B0aW9ucy5kaXJlY3RvcnkgPSBvcHRpb25zLm5hbWU7XG4gICAgfVxuICAgIGxldCBwYWNrYWdlVGFzaztcbiAgICBpZiAoIW9wdGlvbnMuc2tpcEluc3RhbGwpIHtcbiAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKG9wdGlvbnMuZGlyZWN0b3J5KSk7XG4gICAgICBpZiAob3B0aW9ucy5saW5rQ2xpKSB7XG4gICAgICAgIHBhY2thZ2VUYXNrID0gY29udGV4dC5hZGRUYXNrKFxuICAgICAgICAgIG5ldyBOb2RlUGFja2FnZUxpbmtUYXNrKCdAYW5ndWxhci9jbGknLCBvcHRpb25zLmRpcmVjdG9yeSksXG4gICAgICAgICAgW3BhY2thZ2VUYXNrXSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLnNraXBHaXQpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgbmV3IFJlcG9zaXRvcnlJbml0aWFsaXplclRhc2soXG4gICAgICAgICAgb3B0aW9ucy5kaXJlY3RvcnksXG4gICAgICAgICAgb3B0aW9ucy5jb21taXQsXG4gICAgICAgICksXG4gICAgICAgIHBhY2thZ2VUYXNrID8gW3BhY2thZ2VUYXNrXSA6IFtdLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB3b3Jrc3BhY2VPcHRpb25zOiBXb3Jrc3BhY2VPcHRpb25zID0ge1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgdmVyc2lvbjogb3B0aW9ucy52ZXJzaW9uLFxuICAgICAgbmV3UHJvamVjdFJvb3Q6IG9wdGlvbnMubmV3UHJvamVjdFJvb3QgfHwgJ3Byb2plY3RzJyxcbiAgICB9O1xuICAgIGNvbnN0IGFwcGxpY2F0aW9uT3B0aW9uczogQXBwbGljYXRpb25PcHRpb25zID0ge1xuICAgICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuICAgICAgaW5saW5lU3R5bGU6IG9wdGlvbnMuaW5saW5lU3R5bGUsXG4gICAgICBpbmxpbmVUZW1wbGF0ZTogb3B0aW9ucy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgIHZpZXdFbmNhcHN1bGF0aW9uOiBvcHRpb25zLnZpZXdFbmNhcHN1bGF0aW9uLFxuICAgICAgcm91dGluZzogb3B0aW9ucy5yb3V0aW5nLFxuICAgICAgc3R5bGU6IG9wdGlvbnMuc3R5bGUsXG4gICAgICBza2lwVGVzdHM6IG9wdGlvbnMuc2tpcFRlc3RzLFxuICAgIH07XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgc2NoZW1hdGljKCd3b3Jrc3BhY2UnLCB3b3Jrc3BhY2VPcHRpb25zKSxcbiAgICAgIHNjaGVtYXRpYygnYXBwbGljYXRpb24nLCBhcHBsaWNhdGlvbk9wdGlvbnMpLFxuICAgICAgbW92ZShvcHRpb25zLmRpcmVjdG9yeSB8fCBvcHRpb25zLm5hbWUpLFxuICAgIF0pKGhvc3QsIGNvbnRleHQpO1xuICB9O1xufVxuIl19