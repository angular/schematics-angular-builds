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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2ZpbmQtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBUThCO0FBYzlCLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQztBQUNoQyxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0FBRWhEOztHQUVHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBVSxFQUFFLE9BQXNCO0lBQ3RFLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQzlELE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxVQUFVLENBQUM7SUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLElBQUksa0JBQWtCLENBQUM7SUFFeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUU7UUFDbkIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztjQUNwQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGNBQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFaEUsT0FBTyxnQkFBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7S0FDOUU7U0FBTTtRQUNMLE1BQU0sVUFBVSxHQUFHLGdCQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sYUFBYSxH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QVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEMsVUFBVSxHQUFHLElBQUksQ0FBQztLQUNuQjtJQUNELElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUMzQyxVQUFVLElBQUksR0FBRyxDQUFDO0tBQ25CO0lBRUQsT0FBTyxVQUFVLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQztBQUM1RSxDQUFDO0FBMUJELDhDQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIE5vcm1hbGl6ZWRSb290LFxuICBQYXRoLFxuICBkaXJuYW1lLFxuICBqb2luLFxuICBub3JtYWxpemUsXG4gIHJlbGF0aXZlLFxuICBzdHJpbmdzLFxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBEaXJFbnRyeSwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcblxuXG5leHBvcnQgaW50ZXJmYWNlIE1vZHVsZU9wdGlvbnMge1xuICBtb2R1bGU/OiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgZmxhdD86IGJvb2xlYW47XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHNraXBJbXBvcnQ/OiBib29sZWFuO1xuICBtb2R1bGVFeHQ/OiBzdHJpbmc7XG4gIHJvdXRpbmdNb2R1bGVFeHQ/OiBzdHJpbmc7XG59XG5cbmNvbnN0IE1PRFVMRV9FWFQgPSAnLm1vZHVsZS50cyc7XG5jb25zdCBST1VUSU5HX01PRFVMRV9FWFQgPSAnLXJvdXRpbmcubW9kdWxlLnRzJztcblxuLyoqXG4gKiBGaW5kIHRoZSBtb2R1bGUgcmVmZXJyZWQgYnkgYSBzZXQgb2Ygb3B0aW9ucyBwYXNzZWQgdG8gdGhlIHNjaGVtYXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTW9kdWxlRnJvbU9wdGlvbnMoaG9zdDogVHJlZSwgb3B0aW9uczogTW9kdWxlT3B0aW9ucyk6IFBhdGggfCB1bmRlZmluZWQge1xuICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnc2tpcEltcG9ydCcpICYmIG9wdGlvbnMuc2tpcEltcG9ydCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtb2R1bGVFeHQgPSBvcHRpb25zLm1vZHVsZUV4dCB8fCBNT0RVTEVfRVhUO1xuICBjb25zdCByb3V0aW5nTW9kdWxlRXh0ID0gb3B0aW9ucy5yb3V0aW5nTW9kdWxlRXh0IHx8IFJPVVRJTkdfTU9EVUxFX0VYVDtcblxuICBpZiAoIW9wdGlvbnMubW9kdWxlKSB7XG4gICAgY29uc3QgcGF0aFRvQ2hlY2sgPSAob3B0aW9ucy5wYXRoIHx8ICcnKVxuICAgICAgKyAob3B0aW9ucy5mbGF0ID8gJycgOiAnLycgKyBzdHJpbmdzLmRhc2hlcml6ZShvcHRpb25zLm5hbWUpKTtcblxuICAgIHJldHVybiBub3JtYWxpemUoZmluZE1vZHVsZShob3N0LCBwYXRoVG9DaGVjaywgbW9kdWxlRXh0LCByb3V0aW5nTW9kdWxlRXh0KSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbW9kdWxlUGF0aCA9IG5vcm1hbGl6ZShgLyR7b3B0aW9ucy5wYXRofS8ke29wdGlvbnMubW9kdWxlfWApO1xuICAgIGNvbnN0IGNvbXBvbmVudFBhdGggPSBub3JtYWxpemUoYC8ke29wdGlvbnMucGF0aH0vJHtvcHRpb25zLm5hbWV9YCk7XG4gICAgY29uc3QgbW9kdWxlQmFzZU5hbWUgPSBub3JtYWxpemUobW9kdWxlUGF0aCkuc3BsaXQoJy8nKS5wb3AoKTtcblxuICAgIGNvbnN0IGNhbmRpZGF0ZVNldCA9IG5ldyBTZXQ8UGF0aD4oW1xuICAgICAgbm9ybWFsaXplKG9wdGlvbnMucGF0aCB8fCAnLycpLFxuICAgIF0pO1xuXG4gICAgZm9yIChsZXQgZGlyID0gbW9kdWxlUGF0aDsgZGlyICE9IE5vcm1hbGl6ZWRSb290OyBkaXIgPSBkaXJuYW1lKGRpcikpIHtcbiAgICAgIGNhbmRpZGF0ZVNldC5hZGQoZGlyKTtcbiAgICB9XG4gICAgZm9yIChsZXQgZGlyID0gY29tcG9uZW50UGF0aDsgZGlyICE9IE5vcm1hbGl6ZWRSb290OyBkaXIgPSBkaXJuYW1lKGRpcikpIHtcbiAgICAgIGNhbmRpZGF0ZVNldC5hZGQoZGlyKTtcbiAgICB9XG5cbiAgICBjb25zdCBjYW5kaWRhdGVzRGlycyA9IFsuLi5jYW5kaWRhdGVTZXRdLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpO1xuICAgIGZvciAoY29uc3QgYyBvZiBjYW5kaWRhdGVzRGlycykge1xuICAgICAgY29uc3QgY2FuZGlkYXRlRmlsZXMgPSBbXG4gICAgICAgICcnLFxuICAgICAgICBgJHttb2R1bGVCYXNlTmFtZX0udHNgLFxuICAgICAgICBgJHttb2R1bGVCYXNlTmFtZX0ke21vZHVsZUV4dH1gLFxuICAgICAgXS5tYXAoeCA9PiBqb2luKGMsIHgpKTtcblxuICAgICAgZm9yIChjb25zdCBzYyBvZiBjYW5kaWRhdGVGaWxlcykge1xuICAgICAgICBpZiAoaG9zdC5leGlzdHMoc2MpKSB7XG4gICAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZShzYyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgU3BlY2lmaWVkIG1vZHVsZSAnJHtvcHRpb25zLm1vZHVsZX0nIGRvZXMgbm90IGV4aXN0LlxcbmBcbiAgICAgICAgKyBgTG9va2VkIGluIHRoZSBmb2xsb3dpbmcgZGlyZWN0b3JpZXM6XFxuICAgICR7Y2FuZGlkYXRlc0RpcnMuam9pbignXFxuICAgICcpfWAsXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGZpbmQgdGhlIFwiY2xvc2VzdFwiIG1vZHVsZSB0byBhIGdlbmVyYXRlZCBmaWxlJ3MgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNb2R1bGUoaG9zdDogVHJlZSwgZ2VuZXJhdGVEaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZUV4dCA9IE1PRFVMRV9FWFQsIHJvdXRpbmdNb2R1bGVFeHQgPSBST1VUSU5HX01PRFVMRV9FWFQpOiBQYXRoIHtcblxuICBsZXQgZGlyOiBEaXJFbnRyeSB8IG51bGwgPSBob3N0LmdldERpcignLycgKyBnZW5lcmF0ZURpcik7XG4gIGxldCBmb3VuZFJvdXRpbmdNb2R1bGUgPSBmYWxzZTtcblxuICB3aGlsZSAoZGlyKSB7XG4gICAgY29uc3QgYWxsTWF0Y2hlcyA9IGRpci5zdWJmaWxlcy5maWx0ZXIocCA9PiBwLmVuZHNXaXRoKG1vZHVsZUV4dCkpO1xuICAgIGNvbnN0IGZpbHRlcmVkTWF0Y2hlcyA9IGFsbE1hdGNoZXMuZmlsdGVyKHAgPT4gIXAuZW5kc1dpdGgocm91dGluZ01vZHVsZUV4dCkpO1xuXG4gICAgZm91bmRSb3V0aW5nTW9kdWxlID0gZm91bmRSb3V0aW5nTW9kdWxlIHx8IGFsbE1hdGNoZXMubGVuZ3RoICE9PSBmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoO1xuXG4gICAgaWYgKGZpbHRlcmVkTWF0Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgcmV0dXJuIGpvaW4oZGlyLnBhdGgsIGZpbHRlcmVkTWF0Y2hlc1swXSk7XG4gICAgfSBlbHNlIGlmIChmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb3JlIHRoYW4gb25lIG1vZHVsZSBtYXRjaGVzLiBVc2Ugc2tpcC1pbXBvcnQgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nICdcbiAgICAgICAgKyAndGhlIGNvbXBvbmVudCBpbnRvIHRoZSBjbG9zZXN0IG1vZHVsZS4nKTtcbiAgICB9XG5cbiAgICBkaXIgPSBkaXIucGFyZW50O1xuICB9XG5cbiAgY29uc3QgZXJyb3JNc2cgPSBmb3VuZFJvdXRpbmdNb2R1bGUgPyAnQ291bGQgbm90IGZpbmQgYSBub24gUm91dGluZyBOZ01vZHVsZS4nXG4gICAgKyBgXFxuTW9kdWxlcyB3aXRoIHN1ZmZpeCAnJHtyb3V0aW5nTW9kdWxlRXh0fScgYXJlIHN0cmljdGx5IHJlc2VydmVkIGZvciByb3V0aW5nLmBcbiAgICArICdcXG5Vc2UgdGhlIHNraXAtaW1wb3J0IG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS4nXG4gICAgOiAnQ291bGQgbm90IGZpbmQgYW4gTmdNb2R1bGUuIFVzZSB0aGUgc2tpcC1pbXBvcnQgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nIGluIE5nTW9kdWxlLic7XG5cbiAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIHJlbGF0aXZlIHBhdGggZnJvbSBvbmUgZmlsZSBwYXRoIHRvIGFub3RoZXIgZmlsZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZWxhdGl2ZVBhdGgoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgZnJvbSA9IG5vcm1hbGl6ZShmcm9tKTtcbiAgdG8gPSBub3JtYWxpemUodG8pO1xuXG4gIC8vIENvbnZlcnQgdG8gYXJyYXlzLlxuICBjb25zdCBmcm9tUGFydHMgPSBmcm9tLnNwbGl0KCcvJyk7XG4gIGNvbnN0IHRvUGFydHMgPSB0by5zcGxpdCgnLycpO1xuXG4gIC8vIFJlbW92ZSBmaWxlIG5hbWVzIChwcmVzZXJ2aW5nIGRlc3RpbmF0aW9uKVxuICBmcm9tUGFydHMucG9wKCk7XG4gIGNvbnN0IHRvRmlsZU5hbWUgPSB0b1BhcnRzLnBvcCgpO1xuXG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKG5vcm1hbGl6ZShmcm9tUGFydHMuam9pbignLycpKSwgbm9ybWFsaXplKHRvUGFydHMuam9pbignLycpKSk7XG4gIGxldCBwYXRoUHJlZml4ID0gJyc7XG5cbiAgLy8gU2V0IHRoZSBwYXRoIHByZWZpeCBmb3Igc2FtZSBkaXIgb3IgY2hpbGQgZGlyLCBwYXJlbnQgZGlyIHN0YXJ0cyB3aXRoIGAuLmBcbiAgaWYgKCFyZWxhdGl2ZVBhdGgpIHtcbiAgICBwYXRoUHJlZml4ID0gJy4nO1xuICB9IGVsc2UgaWYgKCFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgcGF0aFByZWZpeCA9IGAuL2A7XG4gIH1cbiAgaWYgKHBhdGhQcmVmaXggJiYgIXBhdGhQcmVmaXguZW5kc1dpdGgoJy8nKSkge1xuICAgIHBhdGhQcmVmaXggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIHBhdGhQcmVmaXggKyAocmVsYXRpdmVQYXRoID8gcmVsYXRpdmVQYXRoICsgJy8nIDogJycpICsgdG9GaWxlTmFtZTtcbn1cbiJdfQ==