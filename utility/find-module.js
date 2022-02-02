"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRelativePath = exports.findModule = exports.findModuleFromOptions = exports.ROUTING_MODULE_EXT = exports.MODULE_EXT = void 0;
const core_1 = require("@angular-devkit/core");
exports.MODULE_EXT = '.module.ts';
exports.ROUTING_MODULE_EXT = '-routing.module.ts';
/**
 * Find the module referred by a set of options passed to the schematics.
 */
function findModuleFromOptions(host, options) {
    // eslint-disable-next-line no-prototype-builtins
    if (options.hasOwnProperty('skipImport') && options.skipImport) {
        return undefined;
    }
    const moduleExt = options.moduleExt || exports.MODULE_EXT;
    const routingModuleExt = options.routingModuleExt || exports.ROUTING_MODULE_EXT;
    if (!options.module) {
        const pathToCheck = (options.path || '') + '/' + options.name;
        return (0, core_1.normalize)(findModule(host, pathToCheck, moduleExt, routingModuleExt));
    }
    else {
        const modulePath = (0, core_1.normalize)(`/${options.path}/${options.module}`);
        const componentPath = (0, core_1.normalize)(`/${options.path}/${options.name}`);
        const moduleBaseName = (0, core_1.normalize)(modulePath).split('/').pop();
        const candidateSet = new Set([(0, core_1.normalize)(options.path || '/')]);
        for (let dir = modulePath; dir != core_1.NormalizedRoot; dir = (0, core_1.dirname)(dir)) {
            candidateSet.add(dir);
        }
        for (let dir = componentPath; dir != core_1.NormalizedRoot; dir = (0, core_1.dirname)(dir)) {
            candidateSet.add(dir);
        }
        const candidatesDirs = [...candidateSet].sort((a, b) => b.length - a.length);
        for (const c of candidatesDirs) {
            const candidateFiles = [
                '',
                `${moduleBaseName}.ts`,
                `${moduleBaseName}${moduleExt}`,
            ].map((x) => (0, core_1.join)(c, x));
            for (const sc of candidateFiles) {
                if (host.exists(sc)) {
                    return (0, core_1.normalize)(sc);
                }
            }
        }
        throw new Error(`Specified module '${options.module}' does not exist.\n` +
            `Looked in the following directories:\n    ${candidatesDirs.join('\n    ')}`);
    }
}
exports.findModuleFromOptions = findModuleFromOptions;
/**
 * Function to find the "closest" module to a generated file's path.
 */
function findModule(host, generateDir, moduleExt = exports.MODULE_EXT, routingModuleExt = exports.ROUTING_MODULE_EXT) {
    let dir = host.getDir('/' + generateDir);
    let foundRoutingModule = false;
    while (dir) {
        const allMatches = dir.subfiles.filter((p) => p.endsWith(moduleExt));
        const filteredMatches = allMatches.filter((p) => !p.endsWith(routingModuleExt));
        foundRoutingModule = foundRoutingModule || allMatches.length !== filteredMatches.length;
        if (filteredMatches.length == 1) {
            return (0, core_1.join)(dir.path, filteredMatches[0]);
        }
        else if (filteredMatches.length > 1) {
            throw new Error('More than one module matches. Use the skip-import option to skip importing ' +
                'the component into the closest module or use the module option to specify a module.');
        }
        dir = dir.parent;
    }
    const errorMsg = foundRoutingModule
        ? 'Could not find a non Routing NgModule.' +
            `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.` +
            '\nUse the skip-import option to skip importing in NgModule.'
        : 'Could not find an NgModule. Use the skip-import option to skip importing in NgModule.';
    throw new Error(errorMsg);
}
exports.findModule = findModule;
/**
 * Build a relative path from one file path to another file path.
 */
function buildRelativePath(from, to) {
    from = (0, core_1.normalize)(from);
    to = (0, core_1.normalize)(to);
    // Convert to arrays.
    const fromParts = from.split('/');
    const toParts = to.split('/');
    // Remove file names (preserving destination)
    fromParts.pop();
    const toFileName = toParts.pop();
    const relativePath = (0, core_1.relative)((0, core_1.normalize)(fromParts.join('/') || '/'), (0, core_1.normalize)(toParts.join('/') || '/'));
    let pathPrefix = '';
    // Set the path prefix for same dir or child dir, parent dir starts with `..`
    if (!relativePath) {
        pathPrefix = '.';
    }
    else if (!relativePath.startsWith('.')) {
        pathPrefix = `./`;
    }
    if (pathPrefix && !pathPrefix.endsWith('/')) {
        pathPrefix += '/';
    }
    return pathPrefix + (relativePath ? relativePath + '/' : '') + toFileName;
}
exports.buildRelativePath = buildRelativePath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9maW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBZ0c7QUFhbkYsUUFBQSxVQUFVLEdBQUcsWUFBWSxDQUFDO0FBQzFCLFFBQUEsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUFVLEVBQUUsT0FBc0I7SUFDdEUsaURBQWlEO0lBQ2pELElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQzlELE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxrQkFBVSxDQUFDO0lBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixJQUFJLDBCQUFrQixDQUFDO0lBRXhFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQ25CLE1BQU0sV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUU5RCxPQUFPLElBQUEsZ0JBQVMsRUFBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0tBQzlFO1NBQU07UUFDTCxNQUFNLFVBQVUsR0FBRyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sYUFBYSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxjQUFjLEdBQUcsSUFBQSxnQkFBUyxFQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU5RCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBTyxDQUFDLElBQUEsZ0JBQVMsRUFBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRSxLQUFLLElBQUksR0FBRyxHQUFHLFVBQVUsRUFBRSxHQUFHLElBQUkscUJBQWMsRUFBRSxHQUFHLEdBQUcsSUFBQSxjQUFPLEVBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN2QjtRQUNELEtBQUssSUFBSSxHQUFHLEdBQUcsYUFBYSxFQUFFLEdBQUcsSUFBSSxxQkFBYyxFQUFFLEdBQUcsR0FBRyxJQUFBLGNBQU8sRUFBQyxHQUFHLENBQUMsRUFBRTtZQUN2RSxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO1FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdFLEtBQUssTUFBTSxDQUFDLElBQUksY0FBYyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHO2dCQUNyQixFQUFFO2dCQUNGLEdBQUcsY0FBYyxLQUFLO2dCQUN0QixHQUFHLGNBQWMsR0FBRyxTQUFTLEVBQUU7YUFDaEMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUEsV0FBSSxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpCLEtBQUssTUFBTSxFQUFFLElBQUksY0FBYyxFQUFFO2dCQUMvQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQ25CLE9BQU8sSUFBQSxnQkFBUyxFQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN0QjthQUNGO1NBQ0Y7UUFFRCxNQUFNLElBQUksS0FBSyxDQUNiLHFCQUFxQixPQUFPLENBQUMsTUFBTSxxQkFBcUI7WUFDdEQsNkNBQTZDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDL0UsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQS9DRCxzREErQ0M7QUFFRDs7R0FFRztBQUNILFNBQWdCLFVBQVUsQ0FDeEIsSUFBVSxFQUNWLFdBQW1CLEVBQ25CLFNBQVMsR0FBRyxrQkFBVSxFQUN0QixnQkFBZ0IsR0FBRywwQkFBa0I7SUFFckMsSUFBSSxHQUFHLEdBQW9CLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzFELElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBRS9CLE9BQU8sR0FBRyxFQUFFO1FBQ1YsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBRWhGLGtCQUFrQixHQUFHLGtCQUFrQixJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssZUFBZSxDQUFDLE1BQU0sQ0FBQztRQUV4RixJQUFJLGVBQWUsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1lBQy9CLE9BQU8sSUFBQSxXQUFJLEVBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQzthQUFNLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FDYiw2RUFBNkU7Z0JBQzNFLHFGQUFxRixDQUN4RixDQUFDO1NBQ0g7UUFFRCxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztLQUNsQjtJQUVELE1BQU0sUUFBUSxHQUFHLGtCQUFrQjtRQUNqQyxDQUFDLENBQUMsd0NBQXdDO1lBQ3hDLDBCQUEwQixnQkFBZ0Isc0NBQXNDO1lBQ2hGLDZEQUE2RDtRQUMvRCxDQUFDLENBQUMsdUZBQXVGLENBQUM7SUFFNUYsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBbENELGdDQWtDQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsSUFBWSxFQUFFLEVBQVU7SUFDeEQsSUFBSSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixFQUFFLEdBQUcsSUFBQSxnQkFBUyxFQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRW5CLHFCQUFxQjtJQUNyQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFOUIsNkNBQTZDO0lBQzdDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNoQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFakMsTUFBTSxZQUFZLEdBQUcsSUFBQSxlQUFRLEVBQzNCLElBQUEsZ0JBQVMsRUFBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUNyQyxJQUFBLGdCQUFTLEVBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FDcEMsQ0FBQztJQUNGLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUVwQiw2RUFBNkU7SUFDN0UsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNqQixVQUFVLEdBQUcsR0FBRyxDQUFDO0tBQ2xCO1NBQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEMsVUFBVSxHQUFHLElBQUksQ0FBQztLQUNuQjtJQUNELElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUMzQyxVQUFVLElBQUksR0FBRyxDQUFDO0tBQ25CO0lBRUQsT0FBTyxVQUFVLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztBQUM1RSxDQUFDO0FBN0JELDhDQTZCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBOb3JtYWxpemVkUm9vdCwgUGF0aCwgZGlybmFtZSwgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IERpckVudHJ5LCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZU9wdGlvbnMge1xuICBtb2R1bGU/OiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZmxhdD86IGJvb2xlYW47XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHNraXBJbXBvcnQ/OiBib29sZWFuO1xuICBtb2R1bGVFeHQ/OiBzdHJpbmc7XG4gIHJvdXRpbmdNb2R1bGVFeHQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBNT0RVTEVfRVhUID0gJy5tb2R1bGUudHMnO1xuZXhwb3J0IGNvbnN0IFJPVVRJTkdfTU9EVUxFX0VYVCA9ICctcm91dGluZy5tb2R1bGUudHMnO1xuXG4vKipcbiAqIEZpbmQgdGhlIG1vZHVsZSByZWZlcnJlZCBieSBhIHNldCBvZiBvcHRpb25zIHBhc3NlZCB0byB0aGUgc2NoZW1hdGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGVGcm9tT3B0aW9ucyhob3N0OiBUcmVlLCBvcHRpb25zOiBNb2R1bGVPcHRpb25zKTogUGF0aCB8IHVuZGVmaW5lZCB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wcm90b3R5cGUtYnVpbHRpbnNcbiAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ3NraXBJbXBvcnQnKSAmJiBvcHRpb25zLnNraXBJbXBvcnQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgbW9kdWxlRXh0ID0gb3B0aW9ucy5tb2R1bGVFeHQgfHwgTU9EVUxFX0VYVDtcbiAgY29uc3Qgcm91dGluZ01vZHVsZUV4dCA9IG9wdGlvbnMucm91dGluZ01vZHVsZUV4dCB8fCBST1VUSU5HX01PRFVMRV9FWFQ7XG5cbiAgaWYgKCFvcHRpb25zLm1vZHVsZSkge1xuICAgIGNvbnN0IHBhdGhUb0NoZWNrID0gKG9wdGlvbnMucGF0aCB8fCAnJykgKyAnLycgKyBvcHRpb25zLm5hbWU7XG5cbiAgICByZXR1cm4gbm9ybWFsaXplKGZpbmRNb2R1bGUoaG9zdCwgcGF0aFRvQ2hlY2ssIG1vZHVsZUV4dCwgcm91dGluZ01vZHVsZUV4dCkpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBub3JtYWxpemUoYC8ke29wdGlvbnMucGF0aH0vJHtvcHRpb25zLm1vZHVsZX1gKTtcbiAgICBjb25zdCBjb21wb25lbnRQYXRoID0gbm9ybWFsaXplKGAvJHtvcHRpb25zLnBhdGh9LyR7b3B0aW9ucy5uYW1lfWApO1xuICAgIGNvbnN0IG1vZHVsZUJhc2VOYW1lID0gbm9ybWFsaXplKG1vZHVsZVBhdGgpLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgICBjb25zdCBjYW5kaWRhdGVTZXQgPSBuZXcgU2V0PFBhdGg+KFtub3JtYWxpemUob3B0aW9ucy5wYXRoIHx8ICcvJyldKTtcblxuICAgIGZvciAobGV0IGRpciA9IG1vZHVsZVBhdGg7IGRpciAhPSBOb3JtYWxpemVkUm9vdDsgZGlyID0gZGlybmFtZShkaXIpKSB7XG4gICAgICBjYW5kaWRhdGVTZXQuYWRkKGRpcik7XG4gICAgfVxuICAgIGZvciAobGV0IGRpciA9IGNvbXBvbmVudFBhdGg7IGRpciAhPSBOb3JtYWxpemVkUm9vdDsgZGlyID0gZGlybmFtZShkaXIpKSB7XG4gICAgICBjYW5kaWRhdGVTZXQuYWRkKGRpcik7XG4gICAgfVxuXG4gICAgY29uc3QgY2FuZGlkYXRlc0RpcnMgPSBbLi4uY2FuZGlkYXRlU2V0XS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgY2FuZGlkYXRlc0RpcnMpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZUZpbGVzID0gW1xuICAgICAgICAnJyxcbiAgICAgICAgYCR7bW9kdWxlQmFzZU5hbWV9LnRzYCxcbiAgICAgICAgYCR7bW9kdWxlQmFzZU5hbWV9JHttb2R1bGVFeHR9YCxcbiAgICAgIF0ubWFwKCh4KSA9PiBqb2luKGMsIHgpKTtcblxuICAgICAgZm9yIChjb25zdCBzYyBvZiBjYW5kaWRhdGVGaWxlcykge1xuICAgICAgICBpZiAoaG9zdC5leGlzdHMoc2MpKSB7XG4gICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZShzYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgU3BlY2lmaWVkIG1vZHVsZSAnJHtvcHRpb25zLm1vZHVsZX0nIGRvZXMgbm90IGV4aXN0LlxcbmAgK1xuICAgICAgICBgTG9va2VkIGluIHRoZSBmb2xsb3dpbmcgZGlyZWN0b3JpZXM6XFxuICAgICR7Y2FuZGlkYXRlc0RpcnMuam9pbignXFxuICAgICcpfWAsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGZpbmQgdGhlIFwiY2xvc2VzdFwiIG1vZHVsZSB0byBhIGdlbmVyYXRlZCBmaWxlJ3MgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGUoXG4gIGhvc3Q6IFRyZWUsXG4gIGdlbmVyYXRlRGlyOiBzdHJpbmcsXG4gIG1vZHVsZUV4dCA9IE1PRFVMRV9FWFQsXG4gIHJvdXRpbmdNb2R1bGVFeHQgPSBST1VUSU5HX01PRFVMRV9FWFQsXG4pOiBQYXRoIHtcbiAgbGV0IGRpcjogRGlyRW50cnkgfCBudWxsID0gaG9zdC5nZXREaXIoJy8nICsgZ2VuZXJhdGVEaXIpO1xuICBsZXQgZm91bmRSb3V0aW5nTW9kdWxlID0gZmFsc2U7XG5cbiAgd2hpbGUgKGRpcikge1xuICAgIGNvbnN0IGFsbE1hdGNoZXMgPSBkaXIuc3ViZmlsZXMuZmlsdGVyKChwKSA9PiBwLmVuZHNXaXRoKG1vZHVsZUV4dCkpO1xuICAgIGNvbnN0IGZpbHRlcmVkTWF0Y2hlcyA9IGFsbE1hdGNoZXMuZmlsdGVyKChwKSA9PiAhcC5lbmRzV2l0aChyb3V0aW5nTW9kdWxlRXh0KSk7XG5cbiAgICBmb3VuZFJvdXRpbmdNb2R1bGUgPSBmb3VuZFJvdXRpbmdNb2R1bGUgfHwgYWxsTWF0Y2hlcy5sZW5ndGggIT09IGZpbHRlcmVkTWF0Y2hlcy5sZW5ndGg7XG5cbiAgICBpZiAoZmlsdGVyZWRNYXRjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICByZXR1cm4gam9pbihkaXIucGF0aCwgZmlsdGVyZWRNYXRjaGVzWzBdKTtcbiAgICB9IGVsc2UgaWYgKGZpbHRlcmVkTWF0Y2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdNb3JlIHRoYW4gb25lIG1vZHVsZSBtYXRjaGVzLiBVc2UgdGhlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyAnICtcbiAgICAgICAgICAndGhlIGNvbXBvbmVudCBpbnRvIHRoZSBjbG9zZXN0IG1vZHVsZSBvciB1c2UgdGhlIG1vZHVsZSBvcHRpb24gdG8gc3BlY2lmeSBhIG1vZHVsZS4nLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBkaXIgPSBkaXIucGFyZW50O1xuICB9XG5cbiAgY29uc3QgZXJyb3JNc2cgPSBmb3VuZFJvdXRpbmdNb2R1bGVcbiAgICA/ICdDb3VsZCBub3QgZmluZCBhIG5vbiBSb3V0aW5nIE5nTW9kdWxlLicgK1xuICAgICAgYFxcbk1vZHVsZXMgd2l0aCBzdWZmaXggJyR7cm91dGluZ01vZHVsZUV4dH0nIGFyZSBzdHJpY3RseSByZXNlcnZlZCBmb3Igcm91dGluZy5gICtcbiAgICAgICdcXG5Vc2UgdGhlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS4nXG4gICAgOiAnQ291bGQgbm90IGZpbmQgYW4gTmdNb2R1bGUuIFVzZSB0aGUgc2tpcC1pbXBvcnQgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nIGluIE5nTW9kdWxlLic7XG5cbiAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIHJlbGF0aXZlIHBhdGggZnJvbSBvbmUgZmlsZSBwYXRoIHRvIGFub3RoZXIgZmlsZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZVBhdGgoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgZnJvbSA9IG5vcm1hbGl6ZShmcm9tKTtcbiAgdG8gPSBub3JtYWxpemUodG8pO1xuXG4gIC8vIENvbnZlcnQgdG8gYXJyYXlzLlxuICBjb25zdCBmcm9tUGFydHMgPSBmcm9tLnNwbGl0KCcvJyk7XG4gIGNvbnN0IHRvUGFydHMgPSB0by5zcGxpdCgnLycpO1xuXG4gIC8vIFJlbW92ZSBmaWxlIG5hbWVzIChwcmVzZXJ2aW5nIGRlc3RpbmF0aW9uKVxuICBmcm9tUGFydHMucG9wKCk7XG4gIGNvbnN0IHRvRmlsZU5hbWUgPSB0b1BhcnRzLnBvcCgpO1xuXG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKFxuICAgIG5vcm1hbGl6ZShmcm9tUGFydHMuam9pbignLycpIHx8ICcvJyksXG4gICAgbm9ybWFsaXplKHRvUGFydHMuam9pbignLycpIHx8ICcvJyksXG4gICk7XG4gIGxldCBwYXRoUHJlZml4ID0gJyc7XG5cbiAgLy8gU2V0IHRoZSBwYXRoIHByZWZpeCBmb3Igc2FtZSBkaXIgb3IgY2hpbGQgZGlyLCBwYXJlbnQgZGlyIHN0YXJ0cyB3aXRoIGAuLmBcbiAgaWYgKCFyZWxhdGl2ZVBhdGgpIHtcbiAgICBwYXRoUHJlZml4ID0gJy4nO1xuICB9IGVsc2UgaWYgKCFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgcGF0aFByZWZpeCA9IGAuL2A7XG4gIH1cbiAgaWYgKHBhdGhQcmVmaXggJiYgIXBhdGhQcmVmaXguZW5kc1dpdGgoJy8nKSkge1xuICAgIHBhdGhQcmVmaXggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIHBhdGhQcmVmaXggKyAocmVsYXRpdmVQYXRoID8gcmVsYXRpdmVQYXRoICsgJy8nIDogJycpICsgdG9GaWxlTmFtZTtcbn1cbiJdfQ==