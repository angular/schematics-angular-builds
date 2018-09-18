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
        const pathToCheck = (options.path || '')
            + (options.flat ? '' : '/' + core_1.strings.dasherize(options.name));
        return core_1.normalize(findModule(host, pathToCheck, moduleExt, routingModuleExt));
    }
    else {
        const modulePath = core_1.normalize('/' + (options.path) + '/' + options.module);
        const moduleBaseName = core_1.normalize(modulePath).split('/').pop();
        const candidates = [
            modulePath,
            `${modulePath}.ts`,
            `${modulePath}${moduleExt}`,
            `${modulePath}/${moduleBaseName}${moduleExt}`,
        ];
        for (const c of candidates) {
            if (host.exists(c)) {
                return core_1.normalize(c);
            }
        }
        throw new Error(`Specified module '${options.module}' does not exist.`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2ZpbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQWdGO0FBY2hGLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQztBQUNoQyxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0FBRWhEOztHQUVHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBVSxFQUFFLE9BQXNCO0lBQ3RFLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQzlELE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxVQUFVLENBQUM7SUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLElBQUksa0JBQWtCLENBQUM7SUFFeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDbkIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztjQUNwQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGNBQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFaEUsT0FBTyxnQkFBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7S0FDOUU7U0FBTTtRQUNMLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQzFCLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxD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Q0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGdCQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUYsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFDO0lBRXBCLDZFQUE2RTtJQUM3RSxJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ2pCLFVBQVUsR0FBRyxHQUFHLENBQUM7S0FDbEI7U0FBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN4QyxVQUFVLEdBQUcsSUFBSSxDQUFDO0tBQ25CO0lBQ0QsSUFBSSxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzNDLFVBQVUsSUFBSSxHQUFHLENBQUM7S0FDbkI7SUFFRCxPQUFPLFVBQVUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDO0FBQzVFLENBQUM7QUExQkQsOENBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgUGF0aCwgam9pbiwgbm9ybWFsaXplLCByZWxhdGl2ZSwgc3RyaW5ncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IERpckVudHJ5LCBUcmVlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlT3B0aW9ucyB7XG4gIG1vZHVsZT86IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBmbGF0PzogYm9vbGVhbjtcbiAgcGF0aD86IHN0cmluZztcbiAgc2tpcEltcG9ydD86IGJvb2xlYW47XG4gIG1vZHVsZUV4dD86IHN0cmluZztcbiAgcm91dGluZ01vZHVsZUV4dD86IHN0cmluZztcbn1cblxuY29uc3QgTU9EVUxFX0VYVCA9ICcubW9kdWxlLnRzJztcbmNvbnN0IFJPVVRJTkdfTU9EVUxFX0VYVCA9ICctcm91dGluZy5tb2R1bGUudHMnO1xuXG4vKipcbiAqIEZpbmQgdGhlIG1vZHVsZSByZWZlcnJlZCBieSBhIHNldCBvZiBvcHRpb25zIHBhc3NlZCB0byB0aGUgc2NoZW1hdGljcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGVGcm9tT3B0aW9ucyhob3N0OiBUcmVlLCBvcHRpb25zOiBNb2R1bGVPcHRpb25zKTogUGF0aCB8IHVuZGVmaW5lZCB7XG4gIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdza2lwSW1wb3J0JykgJiYgb3B0aW9ucy5za2lwSW1wb3J0KSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1vZHVsZUV4dCA9IG9wdGlvbnMubW9kdWxlRXh0IHx8IE1PRFVMRV9FWFQ7XG4gIGNvbnN0IHJvdXRpbmdNb2R1bGVFeHQgPSBvcHRpb25zLnJvdXRpbmdNb2R1bGVFeHQgfHwgUk9VVElOR19NT0RVTEVfRVhUO1xuXG4gIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICBjb25zdCBwYXRoVG9DaGVjayA9IChvcHRpb25zLnBhdGggfHwgJycpXG4gICAgICArIChvcHRpb25zLmZsYXQgPyAnJyA6ICcvJyArIHN0cmluZ3MuZGFzaGVyaXplKG9wdGlvbnMubmFtZSkpO1xuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZShmaW5kTW9kdWxlKGhvc3QsIHBhdGhUb0NoZWNrLCBtb2R1bGVFeHQsIHJvdXRpbmdNb2R1bGVFeHQpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gbm9ybWFsaXplKFxuICAgICAgJy8nICsgKG9wdGlvbnMucGF0aCkgKyAnLycgKyBvcHRpb25zLm1vZHVsZSk7XG4gICAgY29uc3QgbW9kdWxlQmFzZU5hbWUgPSBub3JtYWxpemUobW9kdWxlUGF0aCkuc3BsaXQoJy8nKS5wb3AoKTtcblxuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICBtb2R1bGVQYXRoLFxuICAgICAgYCR7bW9kdWxlUGF0aH0udHNgLFxuICAgICAgYCR7bW9kdWxlUGF0aH0ke21vZHVsZUV4dH1gLFxuICAgICAgYCR7bW9kdWxlUGF0aH0vJHttb2R1bGVCYXNlTmFtZX0ke21vZHVsZUV4dH1gLFxuICAgIF07XG4gICAgZm9yIChjb25zdCBjIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgIGlmIChob3N0LmV4aXN0cyhjKSkge1xuICAgICAgICByZXR1cm4gbm9ybWFsaXplKGMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNwZWNpZmllZCBtb2R1bGUgJyR7b3B0aW9ucy5tb2R1bGV9JyBkb2VzIG5vdCBleGlzdC5gKTtcbiAgfVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGZpbmQgdGhlIFwiY2xvc2VzdFwiIG1vZHVsZSB0byBhIGdlbmVyYXRlZCBmaWxlJ3MgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGUoaG9zdDogVHJlZSwgZ2VuZXJhdGVEaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZUV4dCA9IE1PRFVMRV9FWFQsIHJvdXRpbmdNb2R1bGVFeHQgPSBST1VUSU5HX01PRFVMRV9FWFQpOiBQYXRoIHtcblxuICBsZXQgZGlyOiBEaXJFbnRyeSB8IG51bGwgPSBob3N0LmdldERpcignLycgKyBnZW5lcmF0ZURpcik7XG4gIGxldCBmb3VuZFJvdXRpbmdNb2R1bGUgPSBmYWxzZTtcblxuICB3aGlsZSAoZGlyKSB7XG4gICAgY29uc3QgYWxsTWF0Y2hlcyA9IGRpci5zdWJmaWxlcy5maWx0ZXIocCA9PiBwLmVuZHNXaXRoKG1vZHVsZUV4dCkpO1xuICAgIGNvbnN0IGZpbHRlcmVkTWF0Y2hlcyA9IGFsbE1hdGNoZXMuZmlsdGVyKHAgPT4gIXAuZW5kc1dpdGgocm91dGluZ01vZHVsZUV4dCkpO1xuXG4gICAgZm91bmRSb3V0aW5nTW9kdWxlID0gZm91bmRSb3V0aW5nTW9kdWxlIHx8IGFsbE1hdGNoZXMubGVuZ3RoICE9PSBmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoO1xuXG4gICAgaWYgKGZpbHRlcmVkTWF0Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgcmV0dXJuIGpvaW4oZGlyLnBhdGgsIGZpbHRlcmVkTWF0Y2hlc1swXSk7XG4gICAgfSBlbHNlIGlmIChmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb3JlIHRoYW4gb25lIG1vZHVsZSBtYXRjaGVzLiBVc2Ugc2tpcC1pbXBvcnQgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nICdcbiAgICAgICAgKyAndGhlIGNvbXBvbmVudCBpbnRvIHRoZSBjbG9zZXN0IG1vZHVsZS4nKTtcbiAgICB9XG5cbiAgICBkaXIgPSBkaXIucGFyZW50O1xuICB9XG5cbiAgY29uc3QgZXJyb3JNc2cgPSBmb3VuZFJvdXRpbmdNb2R1bGUgPyAnQ291bGQgbm90IGZpbmQgYSBub24gUm91dGluZyBOZ01vZHVsZS4nXG4gICAgKyBgXFxuTW9kdWxlcyB3aXRoIHN1ZmZpeCAnJHtyb3V0aW5nTW9kdWxlRXh0fScgYXJlIHN0cmljdGx5IHJlc2VydmVkIGZvciByb3V0aW5nLmBcbiAgICArICdcXG5Vc2UgdGhlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS4nXG4gICAgOiAnQ291bGQgbm90IGZpbmQgYW4gTmdNb2R1bGUuIFVzZSB0aGUgc2tpcC1pbXBvcnQgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nIGluIE5nTW9kdWxlLic7XG5cbiAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIHJlbGF0aXZlIHBhdGggZnJvbSBvbmUgZmlsZSBwYXRoIHRvIGFub3RoZXIgZmlsZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZVBhdGgoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgZnJvbSA9IG5vcm1hbGl6ZShmcm9tKTtcbiAgdG8gPSBub3JtYWxpemUodG8pO1xuXG4gIC8vIENvbnZlcnQgdG8gYXJyYXlzLlxuICBjb25zdCBmcm9tUGFydHMgPSBmcm9tLnNwbGl0KCcvJyk7XG4gIGNvbnN0IHRvUGFydHMgPSB0by5zcGxpdCgnLycpO1xuXG4gIC8vIFJlbW92ZSBmaWxlIG5hbWVzIChwcmVzZXJ2aW5nIGRlc3RpbmF0aW9uKVxuICBmcm9tUGFydHMucG9wKCk7XG4gIGNvbnN0IHRvRmlsZU5hbWUgPSB0b1BhcnRzLnBvcCgpO1xuXG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZShmcm9tUGFydHMuam9pbignLycpKSwgbm9ybWFsaXplKHRvUGFydHMuam9pbignLycpKSk7XG4gIGxldCBwYXRoUHJlZml4ID0gJyc7XG5cbiAgLy8gU2V0IHRoZSBwYXRoIHByZWZpeCBmb3Igc2FtZSBkaXIgb3IgY2hpbGQgZGlyLCBwYXJlbnQgZGlyIHN0YXJ0cyB3aXRoIGAuLmBcbiAgaWYgKCFyZWxhdGl2ZVBhdGgpIHtcbiAgICBwYXRoUHJlZml4ID0gJy4nO1xuICB9IGVsc2UgaWYgKCFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgcGF0aFByZWZpeCA9IGAuL2A7XG4gIH1cbiAgaWYgKHBhdGhQcmVmaXggJiYgIXBhdGhQcmVmaXguZW5kc1dpdGgoJy8nKSkge1xuICAgIHBhdGhQcmVmaXggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIHBhdGhQcmVmaXggKyAocmVsYXRpdmVQYXRoID8gcmVsYXRpdmVQYXRoICsgJy8nIDogJycpICsgdG9GaWxlTmFtZTtcbn1cbiJdfQ==