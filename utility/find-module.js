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
const MODULE_EXT = '.module.ts';
const ROUTING_MODULE_EXT = '-routing.module.ts';
/**
 * Find the module referred by a set of options passed to the schematics.
 */
function findModuleFromOptions(host, options) {
    if (options.hasOwnProperty('skipImport') && options.skipImport) {
        return undefined;
    }
    const moduleExt = options.moduleExt || MODULE_EXT;
    const routingModuleExt = options.routingModuleExt || ROUTING_MODULE_EXT;
    if (!options.module) {
        options.nameFormatter = options.nameFormatter || core_1.strings.dasherize;
        const pathToCheck = (options.path || '')
            + (options.flat ? '' : '/' + options.nameFormatter(options.name));
        return core_1.normalize(findModule(host, pathToCheck, moduleExt, routingModuleExt));
    }
    else {
        const modulePath = core_1.normalize(`/${options.path}/${options.module}`);
        const componentPath = core_1.normalize(`/${options.path}/${options.name}`);
        const moduleBaseName = core_1.normalize(modulePath).split('/').pop();
        const candidateSet = new Set([
            core_1.normalize(options.path || '/'),
        ]);
        for (let dir = modulePath; dir != core_1.NormalizedRoot; dir = core_1.dirname(dir)) {
            candidateSet.add(dir);
        }
        for (let dir = componentPath; dir != core_1.NormalizedRoot; dir = core_1.dirname(dir)) {
            candidateSet.add(dir);
        }
        const candidatesDirs = [...candidateSet].sort((a, b) => b.length - a.length);
        for (const c of candidatesDirs) {
            const candidateFiles = [
                '',
                `${moduleBaseName}.ts`,
                `${moduleBaseName}${moduleExt}`,
            ].map(x => core_1.join(c, x));
            for (const sc of candidateFiles) {
                if (host.exists(sc)) {
                    return core_1.normalize(sc);
                }
            }
        }
        throw new Error(`Specified module '${options.module}' does not exist.\n`
            + `Looked in the following directories:\n    ${candidatesDirs.join('\n    ')}`);
    }
}
exports.findModuleFromOptions = findModuleFromOptions;
/**
 * Function to find the "closest" module to a generated file's path.
 */
function findModule(host, generateDir, moduleExt = MODULE_EXT, routingModuleExt = ROUTING_MODULE_EXT) {
    let dir = host.getDir('/' + generateDir);
    let foundRoutingModule = false;
    while (dir) {
        const allMatches = dir.subfiles.filter(p => p.endsWith(moduleExt));
        const filteredMatches = allMatches.filter(p => !p.endsWith(routingModuleExt));
        foundRoutingModule = foundRoutingModule || allMatches.length !== filteredMatches.length;
        if (filteredMatches.length == 1) {
            return core_1.join(dir.path, filteredMatches[0]);
        }
        else if (filteredMatches.length > 1) {
            throw new Error('More than one module matches. Use skip-import option to skip importing '
                + 'the component into the closest module.');
        }
        dir = dir.parent;
    }
    const errorMsg = foundRoutingModule ? 'Could not find a non Routing NgModule.'
        + `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.`
        + '\nUse the skip-import option to skip importing in NgModule.'
        : 'Could not find an NgModule. Use the skip-import option to skip importing in NgModule.';
    throw new Error(errorMsg);
}
exports.findModule = findModule;
/**
 * Build a relative path from one file path to another file path.
 */
function buildRelativePath(from, to) {
    from = core_1.normalize(from);
    to = core_1.normalize(to);
    // Convert to arrays.
    const fromParts = from.split('/');
    const toParts = to.split('/');
    // Remove file names (preserving destination)
    fromParts.pop();
    const toFileName = toParts.pop();
    const relativePath = core_1.relative(core_1.normalize(fromParts.join('/')), core_1.normalize(toParts.join('/')));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2ZpbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUThCO0FBZTlCLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQztBQUNoQyxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0FBRWhEOztHQUVHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBVSxFQUFFLE9BQXNCO0lBQ3RFLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQzlELE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxVQUFVLENBQUM7SUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLElBQUksa0JBQWtCLENBQUM7SUFFeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDbkIsT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxJQUFJLGNBQU8sQ0FBQyxTQUFTLENBQUM7UUFDbkUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztjQUNwQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFcEUsT0FBTyxnQkFBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7S0FDOUU7U0FBTTtRQUNMLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sYUFBYSxHQUFHLGdCQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLGdCQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTlELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFPO1lBQ2pDLGdCQUFTLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUM7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsS0FBSyxJQUFJLEdBQUcsR0FBRyxVQUFVLEVBQUUsR0FBRyxJQUFJLHFCQUFjLEVBQUUsR0FBRyxHQUFHLGNBQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRSxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsS0FBSyxJQUFJLEdBQUcsR0FBRyxhQUFhLEVBQUUsR0FBRyxJQUFJLHFCQUFjLEVBQUUsR0FBRyxHQUFHLGNBQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2RSxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO1FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdFLEtBQUssTUFBTSxDQUFDLElBQUksY0FBYyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHO2dCQUNyQixFQUFFO2dCQUNGLEdBQUcsY0FBYyxLQUFLO2dCQUN0QixHQUFHLGNBQWMsR0FBRyxTQUFTLEVBQUU7YUFDaEMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdkIsS0FBSyxNQUFNLEVBQUUsSUFBSSxjQUFjLEVBQUU7Z0JBQy9CLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDbkIsT0FBTyxnQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN0QjthQUNGO1NBQ0Y7UUFFRCxNQUFNLElBQUksS0FBSyxDQUNiLHFCQUFxQixPQUFPLENBQUMsTUFBTSxxQkFBcUI7Y0FDcEQsNkNBQTZDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FDakYsQ0FBQztLQUNIO0FBQ0gsQ0FBQztBQWxERCxzREFrREM7QUFFRDs7R0FFRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxJQUFVLEVBQUUsV0FBbUIsRUFDL0IsU0FBUyxHQUFHLFVBQVUsRUFBRSxnQkFBZ0IsR0FBRyxrQkFBa0I7SUFFdEYsSUFBSSxHQUFHLEdBQW9CLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBQzFELElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBRS9CLE9BQU8sR0FBRyxFQUFFO1FBQ1YsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFFOUUsa0JBQWtCLEdBQUcsa0JBQWtCLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxlQUFlLENBQUMsTUFBTSxDQUFDO1FBRXhGLElBQUksZUFBZSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxXQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMzQzthQUFNLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5RUFBeUU7a0JBQ3JGLHdDQUF3QyxDQUFDLENBQUM7U0FDL0M7UUFFRCxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztLQUNsQjtJQUVELE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyx3Q0FBd0M7VUFDMUUsMEJBQTBCLGdCQUFnQixzQ0FBc0M7VUFDaEYsNkRBQTZEO1FBQy9ELENBQUMsQ0FBQyx1RkFBdUYsQ0FBQztJQUU1RixNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUE1QkQsZ0NBNEJDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsRUFBVTtJQUN4RCxJQUFJLEdBQUcsZ0JBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QixFQUFFLEdBQUcsZ0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVuQixxQkFBcUI7SUFDckIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTlCLDZDQUE2QztJQUM3QyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRWpDLE1BQU0sWUFBWSxHQUFHLGVBQVEsQ0FBQyxnQkFBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVGLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUVwQiw2RUFBNkU7SUFDN0UsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNqQixVQUFVLEdBQUcsR0FBRyxDQUFDO0tBQ2xCO1NBQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEMsVUFBVSxHQUFHLElBQUksQ0FBQztLQUNuQjtJQUNELElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUMzQyxVQUFVLElBQUksR0FBRyxDQUFDO0tBQ25CO0lBRUQsT0FBTyxVQUFVLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztBQUM1RSxDQUFDO0FBMUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIE5vcm1hbGl6ZWRSb290LFxuICBQYXRoLFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBub3JtYWxpemUsXG4gIHJlbGF0aXZlLFxuICBzdHJpbmdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBEaXJFbnRyeSwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZU9wdGlvbnMge1xuICBtb2R1bGU/OiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZmxhdD86IGJvb2xlYW47XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHNraXBJbXBvcnQ/OiBib29sZWFuO1xuICBtb2R1bGVFeHQ/OiBzdHJpbmc7XG4gIHJvdXRpbmdNb2R1bGVFeHQ/OiBzdHJpbmc7XG4gIG5hbWVGb3JtYXR0ZXI/OiAoc3RyOiBzdHJpbmcpID0+IHN0cmluZztcbn1cblxuY29uc3QgTU9EVUxFX0VYVCA9ICcubW9kdWxlLnRzJztcbmNvbnN0IFJPVVRJTkdfTU9EVUxFX0VYVCA9ICctcm91dGluZy5tb2R1bGUudHMnO1xuXG4vKipcbiAqIEZpbmQgdGhlIG1vZHVsZSByZWZlcnJlZCBieSBhIHNldCBvZiBvcHRpb25zIHBhc3NlZCB0byB0aGUgc2NoZW1hdGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGVGcm9tT3B0aW9ucyhob3N0OiBUcmVlLCBvcHRpb25zOiBNb2R1bGVPcHRpb25zKTogUGF0aCB8IHVuZGVmaW5lZCB7XG4gIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdza2lwSW1wb3J0JykgJiYgb3B0aW9ucy5za2lwSW1wb3J0KSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1vZHVsZUV4dCA9IG9wdGlvbnMubW9kdWxlRXh0IHx8IE1PRFVMRV9FWFQ7XG4gIGNvbnN0IHJvdXRpbmdNb2R1bGVFeHQgPSBvcHRpb25zLnJvdXRpbmdNb2R1bGVFeHQgfHwgUk9VVElOR19NT0RVTEVfRVhUO1xuXG4gIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICBvcHRpb25zLm5hbWVGb3JtYXR0ZXIgPSBvcHRpb25zLm5hbWVGb3JtYXR0ZXIgfHwgc3RyaW5ncy5kYXNoZXJpemU7XG4gICAgY29uc3QgcGF0aFRvQ2hlY2sgPSAob3B0aW9ucy5wYXRoIHx8ICcnKVxuICAgICAgKyAob3B0aW9ucy5mbGF0ID8gJycgOiAnLycgKyBvcHRpb25zLm5hbWVGb3JtYXR0ZXIob3B0aW9ucy5uYW1lKSk7XG5cbiAgICByZXR1cm4gbm9ybWFsaXplKGZpbmRNb2R1bGUoaG9zdCwgcGF0aFRvQ2hlY2ssIG1vZHVsZUV4dCwgcm91dGluZ01vZHVsZUV4dCkpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG1vZHVsZVBhdGggPSBub3JtYWxpemUoYC8ke29wdGlvbnMucGF0aH0vJHtvcHRpb25zLm1vZHVsZX1gKTtcbiAgICBjb25zdCBjb21wb25lbnRQYXRoID0gbm9ybWFsaXplKGAvJHtvcHRpb25zLnBhdGh9LyR7b3B0aW9ucy5uYW1lfWApO1xuICAgIGNvbnN0IG1vZHVsZUJhc2VOYW1lID0gbm9ybWFsaXplKG1vZHVsZVBhdGgpLnNwbGl0KCcvJykucG9wKCk7XG5cbiAgICBjb25zdCBjYW5kaWRhdGVTZXQgPSBuZXcgU2V0PFBhdGg+KFtcbiAgICAgIG5vcm1hbGl6ZShvcHRpb25zLnBhdGggfHwgJy8nKSxcbiAgICBdKTtcblxuICAgIGZvciAobGV0IGRpciA9IG1vZHVsZVBhdGg7IGRpciAhPSBOb3JtYWxpemVkUm9vdDsgZGlyID0gZGlybmFtZShkaXIpKSB7XG4gICAgICBjYW5kaWRhdGVTZXQuYWRkKGRpcik7XG4gICAgfVxuICAgIGZvciAobGV0IGRpciA9IGNvbXBvbmVudFBhdGg7IGRpciAhPSBOb3JtYWxpemVkUm9vdDsgZGlyID0gZGlybmFtZShkaXIpKSB7XG4gICAgICBjYW5kaWRhdGVTZXQuYWRkKGRpcik7XG4gICAgfVxuXG4gICAgY29uc3QgY2FuZGlkYXRlc0RpcnMgPSBbLi4uY2FuZGlkYXRlU2V0XS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKTtcbiAgICBmb3IgKGNvbnN0IGMgb2YgY2FuZGlkYXRlc0RpcnMpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZUZpbGVzID0gW1xuICAgICAgICAnJyxcbiAgICAgICAgYCR7bW9kdWxlQmFzZU5hbWV9LnRzYCxcbiAgICAgICAgYCR7bW9kdWxlQmFzZU5hbWV9JHttb2R1bGVFeHR9YCxcbiAgICAgIF0ubWFwKHggPT4gam9pbihjLCB4KSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc2Mgb2YgY2FuZGlkYXRlRmlsZXMpIHtcbiAgICAgICAgaWYgKGhvc3QuZXhpc3RzKHNjKSkge1xuICAgICAgICAgIHJldHVybiBub3JtYWxpemUoc2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFNwZWNpZmllZCBtb2R1bGUgJyR7b3B0aW9ucy5tb2R1bGV9JyBkb2VzIG5vdCBleGlzdC5cXG5gXG4gICAgICAgICsgYExvb2tlZCBpbiB0aGUgZm9sbG93aW5nIGRpcmVjdG9yaWVzOlxcbiAgICAke2NhbmRpZGF0ZXNEaXJzLmpvaW4oJ1xcbiAgICAnKX1gLFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBGdW5jdGlvbiB0byBmaW5kIHRoZSBcImNsb3Nlc3RcIiBtb2R1bGUgdG8gYSBnZW5lcmF0ZWQgZmlsZSdzIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTW9kdWxlKGhvc3Q6IFRyZWUsIGdlbmVyYXRlRGlyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVFeHQgPSBNT0RVTEVfRVhULCByb3V0aW5nTW9kdWxlRXh0ID0gUk9VVElOR19NT0RVTEVfRVhUKTogUGF0aCB7XG5cbiAgbGV0IGRpcjogRGlyRW50cnkgfCBudWxsID0gaG9zdC5nZXREaXIoJy8nICsgZ2VuZXJhdGVEaXIpO1xuICBsZXQgZm91bmRSb3V0aW5nTW9kdWxlID0gZmFsc2U7XG5cbiAgd2hpbGUgKGRpcikge1xuICAgIGNvbnN0IGFsbE1hdGNoZXMgPSBkaXIuc3ViZmlsZXMuZmlsdGVyKHAgPT4gcC5lbmRzV2l0aChtb2R1bGVFeHQpKTtcbiAgICBjb25zdCBmaWx0ZXJlZE1hdGNoZXMgPSBhbGxNYXRjaGVzLmZpbHRlcihwID0+ICFwLmVuZHNXaXRoKHJvdXRpbmdNb2R1bGVFeHQpKTtcblxuICAgIGZvdW5kUm91dGluZ01vZHVsZSA9IGZvdW5kUm91dGluZ01vZHVsZSB8fCBhbGxNYXRjaGVzLmxlbmd0aCAhPT0gZmlsdGVyZWRNYXRjaGVzLmxlbmd0aDtcblxuICAgIGlmIChmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoID09IDEpIHtcbiAgICAgIHJldHVybiBqb2luKGRpci5wYXRoLCBmaWx0ZXJlZE1hdGNoZXNbMF0pO1xuICAgIH0gZWxzZSBpZiAoZmlsdGVyZWRNYXRjaGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTW9yZSB0aGFuIG9uZSBtb2R1bGUgbWF0Y2hlcy4gVXNlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyAnXG4gICAgICAgICsgJ3RoZSBjb21wb25lbnQgaW50byB0aGUgY2xvc2VzdCBtb2R1bGUuJyk7XG4gICAgfVxuXG4gICAgZGlyID0gZGlyLnBhcmVudDtcbiAgfVxuXG4gIGNvbnN0IGVycm9yTXNnID0gZm91bmRSb3V0aW5nTW9kdWxlID8gJ0NvdWxkIG5vdCBmaW5kIGEgbm9uIFJvdXRpbmcgTmdNb2R1bGUuJ1xuICAgICsgYFxcbk1vZHVsZXMgd2l0aCBzdWZmaXggJyR7cm91dGluZ01vZHVsZUV4dH0nIGFyZSBzdHJpY3RseSByZXNlcnZlZCBmb3Igcm91dGluZy5gXG4gICAgKyAnXFxuVXNlIHRoZSBza2lwLWltcG9ydCBvcHRpb24gdG8gc2tpcCBpbXBvcnRpbmcgaW4gTmdNb2R1bGUuJ1xuICAgIDogJ0NvdWxkIG5vdCBmaW5kIGFuIE5nTW9kdWxlLiBVc2UgdGhlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS4nO1xuXG4gIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSByZWxhdGl2ZSBwYXRoIGZyb20gb25lIGZpbGUgcGF0aCB0byBhbm90aGVyIGZpbGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUmVsYXRpdmVQYXRoKGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZyB7XG4gIGZyb20gPSBub3JtYWxpemUoZnJvbSk7XG4gIHRvID0gbm9ybWFsaXplKHRvKTtcblxuICAvLyBDb252ZXJ0IHRvIGFycmF5cy5cbiAgY29uc3QgZnJvbVBhcnRzID0gZnJvbS5zcGxpdCgnLycpO1xuICBjb25zdCB0b1BhcnRzID0gdG8uc3BsaXQoJy8nKTtcblxuICAvLyBSZW1vdmUgZmlsZSBuYW1lcyAocHJlc2VydmluZyBkZXN0aW5hdGlvbilcbiAgZnJvbVBhcnRzLnBvcCgpO1xuICBjb25zdCB0b0ZpbGVOYW1lID0gdG9QYXJ0cy5wb3AoKTtcblxuICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShub3JtYWxpemUoZnJvbVBhcnRzLmpvaW4oJy8nKSksIG5vcm1hbGl6ZSh0b1BhcnRzLmpvaW4oJy8nKSkpO1xuICBsZXQgcGF0aFByZWZpeCA9ICcnO1xuXG4gIC8vIFNldCB0aGUgcGF0aCBwcmVmaXggZm9yIHNhbWUgZGlyIG9yIGNoaWxkIGRpciwgcGFyZW50IGRpciBzdGFydHMgd2l0aCBgLi5gXG4gIGlmICghcmVsYXRpdmVQYXRoKSB7XG4gICAgcGF0aFByZWZpeCA9ICcuJztcbiAgfSBlbHNlIGlmICghcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIHBhdGhQcmVmaXggPSBgLi9gO1xuICB9XG4gIGlmIChwYXRoUHJlZml4ICYmICFwYXRoUHJlZml4LmVuZHNXaXRoKCcvJykpIHtcbiAgICBwYXRoUHJlZml4ICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiBwYXRoUHJlZml4ICsgKHJlbGF0aXZlUGF0aCA/IHJlbGF0aXZlUGF0aCArICcvJyA6ICcnKSArIHRvRmlsZU5hbWU7XG59XG4iXX0=