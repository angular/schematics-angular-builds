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
const workspace_1 = require("../../utility/workspace");
function* visitPackageJsonFiles(directory, includedInLookup = false) {
    if (includedInLookup) {
        for (const path of directory.subfiles) {
            if (path !== 'package.json') {
                continue;
            }
            yield (0, core_1.join)(directory.path, path);
        }
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules' || path.startsWith('.')) {
            continue;
        }
        yield* visitPackageJsonFiles(directory.dir(path), true);
    }
}
/** Migration to remove secondary entrypoints 'package.json' files and migrate ng-packagr configurations. */
function default_1() {
    return async (tree) => {
        const workspace = await (0, workspace_1.getWorkspace)(tree);
        for (const project of workspace.projects.values()) {
            if (project.extensions['projectType'] !== 'library' ||
                ![...project.targets.values()].some(({ builder }) => builder === '@angular-devkit/build-angular:ng-packagr')) {
                // Project is not a library or doesn't use ng-packagr, skip.
                continue;
            }
            for (const path of visitPackageJsonFiles(tree.getDir(project.root))) {
                const json = tree.readJson(path);
                if ((0, core_1.isJsonObject)(json) && json['ngPackage']) {
                    // Migrate ng-packagr config to an ng-packagr config file.
                    const configFilePath = (0, core_1.join)((0, core_1.dirname)((0, core_1.normalize)(path)), 'ng-package.json');
                    tree.create(configFilePath, JSON.stringify(json['ngPackage'], undefined, 2));
                }
                // Delete package.json as it is no longer needed in APF 14.
                tree.delete(path);
            }
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWxpYnJhcmllcy1zZWNvbmRhcnktZW50cnlwb2ludHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtMTQvdXBkYXRlLWxpYnJhcmllcy1zZWNvbmRhcnktZW50cnlwb2ludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFFSCwrQ0FBOEU7QUFFOUUsdURBQXVEO0FBRXZELFFBQVEsQ0FBQyxDQUFDLHFCQUFxQixDQUM3QixTQUFtQixFQUNuQixnQkFBZ0IsR0FBRyxLQUFLO0lBRXhCLElBQUksZ0JBQWdCLEVBQUU7UUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsUUFBUSxFQUFFO1lBQ3JDLElBQUksSUFBSSxLQUFLLGNBQWMsRUFBRTtnQkFDM0IsU0FBUzthQUNWO1lBRUQsTUFBTSxJQUFBLFdBQUksRUFBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ2xDO0tBQ0Y7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkQsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN6RDtBQUNILENBQUM7QUFFRCw0R0FBNEc7QUFDNUc7SUFDRSxPQUFPLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUNwQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsd0JBQVksRUFBQyxJQUFJLENBQUMsQ0FBQztRQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDakQsSUFDRSxPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxLQUFLLFNBQVM7Z0JBQy9DLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQ2pDLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLDBDQUEwQyxDQUN4RSxFQUNEO2dCQUNBLDREQUE0RDtnQkFDNUQsU0FBUzthQUNWO1lBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO2dCQUNuRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUEsbUJBQVksRUFBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzNDLDBEQUEwRDtvQkFDMUQsTUFBTSxjQUFjLEdBQUcsSUFBQSxXQUFJLEVBQUMsSUFBQSxjQUFPLEVBQUMsSUFBQSxnQkFBUyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztvQkFDekUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzlFO2dCQUVELDJEQUEyRDtnQkFDM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQjtTQUNGO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVCRCw0QkE0QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgZGlybmFtZSwgaXNKc29uT2JqZWN0LCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBEaXJFbnRyeSwgUnVsZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcblxuZnVuY3Rpb24qIHZpc2l0UGFja2FnZUpzb25GaWxlcyhcbiAgZGlyZWN0b3J5OiBEaXJFbnRyeSxcbiAgaW5jbHVkZWRJbkxvb2t1cCA9IGZhbHNlLFxuKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgaWYgKGluY2x1ZGVkSW5Mb29rdXApIHtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmZpbGVzKSB7XG4gICAgICBpZiAocGF0aCAhPT0gJ3BhY2thZ2UuanNvbicpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHlpZWxkIGpvaW4oZGlyZWN0b3J5LnBhdGgsIHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgcGF0aCBvZiBkaXJlY3Rvcnkuc3ViZGlycykge1xuICAgIGlmIChwYXRoID09PSAnbm9kZV9tb2R1bGVzJyB8fCBwYXRoLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgeWllbGQqIHZpc2l0UGFja2FnZUpzb25GaWxlcyhkaXJlY3RvcnkuZGlyKHBhdGgpLCB0cnVlKTtcbiAgfVxufVxuXG4vKiogTWlncmF0aW9uIHRvIHJlbW92ZSBzZWNvbmRhcnkgZW50cnlwb2ludHMgJ3BhY2thZ2UuanNvbicgZmlsZXMgYW5kIG1pZ3JhdGUgbmctcGFja2FnciBjb25maWd1cmF0aW9ucy4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIGFzeW5jICh0cmVlKSA9PiB7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKHRyZWUpO1xuXG4gICAgZm9yIChjb25zdCBwcm9qZWN0IG9mIHdvcmtzcGFjZS5wcm9qZWN0cy52YWx1ZXMoKSkge1xuICAgICAgaWYgKFxuICAgICAgICBwcm9qZWN0LmV4dGVuc2lvbnNbJ3Byb2plY3RUeXBlJ10gIT09ICdsaWJyYXJ5JyB8fFxuICAgICAgICAhWy4uLnByb2plY3QudGFyZ2V0cy52YWx1ZXMoKV0uc29tZShcbiAgICAgICAgICAoeyBidWlsZGVyIH0pID0+IGJ1aWxkZXIgPT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpuZy1wYWNrYWdyJyxcbiAgICAgICAgKVxuICAgICAgKSB7XG4gICAgICAgIC8vIFByb2plY3QgaXMgbm90IGEgbGlicmFyeSBvciBkb2Vzbid0IHVzZSBuZy1wYWNrYWdyLCBza2lwLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBwYXRoIG9mIHZpc2l0UGFja2FnZUpzb25GaWxlcyh0cmVlLmdldERpcihwcm9qZWN0LnJvb3QpKSkge1xuICAgICAgICBjb25zdCBqc29uID0gdHJlZS5yZWFkSnNvbihwYXRoKTtcbiAgICAgICAgaWYgKGlzSnNvbk9iamVjdChqc29uKSAmJiBqc29uWyduZ1BhY2thZ2UnXSkge1xuICAgICAgICAgIC8vIE1pZ3JhdGUgbmctcGFja2FnciBjb25maWcgdG8gYW4gbmctcGFja2FnciBjb25maWcgZmlsZS5cbiAgICAgICAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4oZGlybmFtZShub3JtYWxpemUocGF0aCkpLCAnbmctcGFja2FnZS5qc29uJyk7XG4gICAgICAgICAgdHJlZS5jcmVhdGUoY29uZmlnRmlsZVBhdGgsIEpTT04uc3RyaW5naWZ5KGpzb25bJ25nUGFja2FnZSddLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlbGV0ZSBwYWNrYWdlLmpzb24gYXMgaXQgaXMgbm8gbG9uZ2VyIG5lZWRlZCBpbiBBUEYgMTQuXG4gICAgICAgIHRyZWUuZGVsZXRlKHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cbiJdfQ==