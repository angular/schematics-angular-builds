"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const lint_fix_1 = require("../utility/lint-fix");
const parse_name_1 = require("../utility/parse-name");
const project_1 = require("../utility/project");
function default_1(options) {
    return (host) => {
        if (!options.project) {
            throw new schematics_1.SchematicsException('Option (project) is required.');
        }
        const project = project_1.getProject(host, options.project);
        if (options.path === undefined) {
            options.path = project_1.buildDefaultPath(project);
        }
        if (options.implements === undefined) {
            options.implements = [];
        }
        let implementations = '';
        let implementationImports = '';
        if (options.implements.length > 0) {
            implementations = options.implements.join(', ');
            implementationImports = `${implementations}, `;
            // As long as we aren't in IE... ;)
            if (options.implements.includes('CanLoad')) {
                implementationImports = `${implementationImports}Route, UrlSegment, `;
            }
        }
        const parsedPath = parse_name_1.parseName(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        // todo remove these when we remove the deprecations
        options.skipTests = options.skipTests || !options.spec;
        const templateSource = schematics_1.apply(schematics_1.url('./files'), [
            options.skipTests ? schematics_1.filter(path => !path.endsWith('.spec.ts.template')) : schematics_1.noop(),
            schematics_1.applyTemplates(Object.assign({ implementations,
                implementationImports }, core_1.strings, options)),
            schematics_1.move(parsedPath.path),
        ]);
        return schematics_1.chain([
            schematics_1.branchAndMerge(schematics_1.chain([
                schematics_1.mergeWith(templateSource),
            ])),
            options.lintFix ? lint_fix_1.applyLintFix(options.path) : schematics_1.noop(),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9ndWFyZC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7RUFNRTtBQUNGLCtDQUErQztBQUMvQywyREFhb0M7QUFDcEMsa0RBQW1EO0FBQ25ELHNEQUFrRDtBQUNsRCxnREFBa0U7QUFJbEUsbUJBQXlCLE9BQXFCO0lBQzVDLE9BQU8sQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUNwQixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNwQixNQUFNLElBQUksZ0NBQW1CLENBQUMsK0JBQStCLENBQUMsQ0FBQztTQUNoRTtRQUNELE1BQU0sT0FBTyxHQUFHLG9CQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVsRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzlCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsMEJBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDMUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQ3BDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1NBQ3pCO1FBRUQsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLElBQUkscUJBQXFCLEdBQUcsRUFBRSxDQUFDO1FBQy9CLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ2pDLGVBQWUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRCxxQkFBcUIsR0FBRyxHQUFHLGVBQWUsSUFBSSxDQUFDO1lBQy9DLG1DQUFtQztZQUNuQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUMxQyxxQkFBcUIsR0FBRyxHQUFHLHFCQUFxQixxQkFBcUIsQ0FBQzthQUN2RTtTQUNGO1FBRUQsTUFBTSxVQUFVLEdBQUcsc0JBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RCxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDL0IsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBRS9CLG9EQUFvRDtRQUNwRCxPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBRXZELE1BQU0sY0FBYyxHQUFHLGtCQUFLLENBQUMsZ0JBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUMzQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxtQkFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQUksRUFBRTtZQUNoRiwyQkFBYyxpQkFDWixlQUFlO2dCQUNmLHFCQUFxQixJQUNsQixjQUFPLEVBQ1AsT0FBTyxFQUNWO1lBQ0YsaUJBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1NBQ3RCLENBQUMsQ0FBQztRQUVILE9BQU8sa0JBQUssQ0FBQztZQUNYLDJCQUFjLENBQUMsa0JBQUssQ0FBQztnQkFDbkIsc0JBQVMsQ0FBQyxjQUFjLENBQUM7YUFDMUIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFJLEVBQUU7U0FDdEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWxERCw0QkFrREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiogQGxpY2Vuc2VcbiogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4qXG4qIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4qIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiovXG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBicmFuY2hBbmRNZXJnZSxcbiAgY2hhaW4sXG4gIGZpbHRlcixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGFwcGx5TGludEZpeCB9IGZyb20gJy4uL3V0aWxpdHkvbGludC1maXgnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IGJ1aWxkRGVmYXVsdFBhdGgsIGdldFByb2plY3QgfSBmcm9tICcuLi91dGlsaXR5L3Byb2plY3QnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEd1YXJkT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogR3VhcmRPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGlmICghb3B0aW9ucy5wcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignT3B0aW9uIChwcm9qZWN0KSBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG4gICAgY29uc3QgcHJvamVjdCA9IGdldFByb2plY3QoaG9zdCwgb3B0aW9ucy5wcm9qZWN0KTtcblxuICAgIGlmIChvcHRpb25zLnBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgb3B0aW9ucy5wYXRoID0gYnVpbGREZWZhdWx0UGF0aChwcm9qZWN0KTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuaW1wbGVtZW50cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLmltcGxlbWVudHMgPSBbXTtcbiAgICB9XG5cbiAgICBsZXQgaW1wbGVtZW50YXRpb25zID0gJyc7XG4gICAgbGV0IGltcGxlbWVudGF0aW9uSW1wb3J0cyA9ICcnO1xuICAgIGlmIChvcHRpb25zLmltcGxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgaW1wbGVtZW50YXRpb25zID0gb3B0aW9ucy5pbXBsZW1lbnRzLmpvaW4oJywgJyk7XG4gICAgICBpbXBsZW1lbnRhdGlvbkltcG9ydHMgPSBgJHtpbXBsZW1lbnRhdGlvbnN9LCBgO1xuICAgICAgLy8gQXMgbG9uZyBhcyB3ZSBhcmVuJ3QgaW4gSUUuLi4gOylcbiAgICAgIGlmIChvcHRpb25zLmltcGxlbWVudHMuaW5jbHVkZXMoJ0NhbkxvYWQnKSkge1xuICAgICAgICBpbXBsZW1lbnRhdGlvbkltcG9ydHMgPSBgJHtpbXBsZW1lbnRhdGlvbkltcG9ydHN9Um91dGUsIFVybFNlZ21lbnQsIGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VkUGF0aCA9IHBhcnNlTmFtZShvcHRpb25zLnBhdGgsIG9wdGlvbnMubmFtZSk7XG4gICAgb3B0aW9ucy5uYW1lID0gcGFyc2VkUGF0aC5uYW1lO1xuICAgIG9wdGlvbnMucGF0aCA9IHBhcnNlZFBhdGgucGF0aDtcblxuICAgIC8vIHRvZG8gcmVtb3ZlIHRoZXNlIHdoZW4gd2UgcmVtb3ZlIHRoZSBkZXByZWNhdGlvbnNcbiAgICBvcHRpb25zLnNraXBUZXN0cyA9IG9wdGlvbnMuc2tpcFRlc3RzIHx8ICFvcHRpb25zLnNwZWM7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZSA9IGFwcGx5KHVybCgnLi9maWxlcycpLCBbXG4gICAgICBvcHRpb25zLnNraXBUZXN0cyA/IGZpbHRlcihwYXRoID0+ICFwYXRoLmVuZHNXaXRoKCcuc3BlYy50cy50ZW1wbGF0ZScpKSA6IG5vb3AoKSxcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgaW1wbGVtZW50YXRpb25zLFxuICAgICAgICBpbXBsZW1lbnRhdGlvbkltcG9ydHMsXG4gICAgICAgIC4uLnN0cmluZ3MsXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIG1vdmUocGFyc2VkUGF0aC5wYXRoKSxcbiAgICBdKTtcblxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICBicmFuY2hBbmRNZXJnZShjaGFpbihbXG4gICAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZSksXG4gICAgICBdKSksXG4gICAgICBvcHRpb25zLmxpbnRGaXggPyBhcHBseUxpbnRGaXgob3B0aW9ucy5wYXRoKSA6IG5vb3AoKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==