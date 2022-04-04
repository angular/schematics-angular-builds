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
            const candidateFiles = ['', `${moduleBaseName}.ts`, `${moduleBaseName}${moduleExt}`].map((x) => (0, core_1.join)(c, x));
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
            throw new Error(`More than one module matches. Use the '--skip-import' option to skip importing ` +
                'the component into the closest module or use the module option to specify a module.');
        }
        dir = dir.parent;
    }
    const errorMsg = foundRoutingModule
        ? 'Could not find a non Routing NgModule.' +
            `\nModules with suffix '${routingModuleExt}' are strictly reserved for routing.` +
            `\nUse the '--skip-import' option to skip importing in NgModule.`
        : `Could not find an NgModule. Use the '--skip-import' option to skip importing in NgModule.`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC1tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvdXRpbGl0eS9maW5kLW1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQ0FBZ0c7QUFhbkYsUUFBQSxVQUFVLEdBQUcsWUFBWSxDQUFDO0FBQzFCLFFBQUEsa0JBQWtCLEdBQUcsb0JBQW9CLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FBQyxJQUFVLEVBQUUsT0FBc0I7SUFDdEUsaURBQWlEO0lBQ2pELElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQzlELE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsSUFBSSxrQkFBVSxDQUFDO0lBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixJQUFJLDBCQUFrQixDQUFDO0lBRXhFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO1FBQ25CLE1BQU0sV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztRQUU5RCxPQUFPLElBQUEsZ0JBQVMsRUFBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0tBQzlFO1NBQU07UUFDTCxNQUFNLFVBQVUsR0FBRyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sYUFBYSxHQUFHLElBQUEsZ0JBQVMsRUFBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElB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QUFZLEVBQUU7UUFDakIsVUFBVSxHQUFHLEdBQUcsQ0FBQztLQUNsQjtTQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3hDLFVBQVUsR0FBRyxJQUFJLENBQUM7S0FDbkI7SUFDRCxJQUFJLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDM0MsVUFBVSxJQUFJLEdBQUcsQ0FBQztLQUNuQjtJQUVELE9BQU8sVUFBVSxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUM7QUFDNUUsQ0FBQztBQTdCRCw4Q0E2QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgTm9ybWFsaXplZFJvb3QsIFBhdGgsIGRpcm5hbWUsIGpvaW4sIG5vcm1hbGl6ZSwgcmVsYXRpdmUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBEaXJFbnRyeSwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcblxuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVPcHRpb25zIHtcbiAgbW9kdWxlPzogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIGZsYXQ/OiBib29sZWFuO1xuICBwYXRoPzogc3RyaW5nO1xuICBza2lwSW1wb3J0PzogYm9vbGVhbjtcbiAgbW9kdWxlRXh0Pzogc3RyaW5nO1xuICByb3V0aW5nTW9kdWxlRXh0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgTU9EVUxFX0VYVCA9ICcubW9kdWxlLnRzJztcbmV4cG9ydCBjb25zdCBST1VUSU5HX01PRFVMRV9FWFQgPSAnLXJvdXRpbmcubW9kdWxlLnRzJztcblxuLyoqXG4gKiBGaW5kIHRoZSBtb2R1bGUgcmVmZXJyZWQgYnkgYSBzZXQgb2Ygb3B0aW9ucyBwYXNzZWQgdG8gdGhlIHNjaGVtYXRpY3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTW9kdWxlRnJvbU9wdGlvbnMoaG9zdDogVHJlZSwgb3B0aW9uczogTW9kdWxlT3B0aW9ucyk6IFBhdGggfCB1bmRlZmluZWQge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcHJvdG90eXBlLWJ1aWx0aW5zXG4gIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdza2lwSW1wb3J0JykgJiYgb3B0aW9ucy5za2lwSW1wb3J0KSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1vZHVsZUV4dCA9IG9wdGlvbnMubW9kdWxlRXh0IHx8IE1PRFVMRV9FWFQ7XG4gIGNvbnN0IHJvdXRpbmdNb2R1bGVFeHQgPSBvcHRpb25zLnJvdXRpbmdNb2R1bGVFeHQgfHwgUk9VVElOR19NT0RVTEVfRVhUO1xuXG4gIGlmICghb3B0aW9ucy5tb2R1bGUpIHtcbiAgICBjb25zdCBwYXRoVG9DaGVjayA9IChvcHRpb25zLnBhdGggfHwgJycpICsgJy8nICsgb3B0aW9ucy5uYW1lO1xuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZShmaW5kTW9kdWxlKGhvc3QsIHBhdGhUb0NoZWNrLCBtb2R1bGVFeHQsIHJvdXRpbmdNb2R1bGVFeHQpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBtb2R1bGVQYXRoID0gbm9ybWFsaXplKGAvJHtvcHRpb25zLnBhdGh9LyR7b3B0aW9ucy5tb2R1bGV9YCk7XG4gICAgY29uc3QgY29tcG9uZW50UGF0aCA9IG5vcm1hbGl6ZShgLyR7b3B0aW9ucy5wYXRofS8ke29wdGlvbnMubmFtZX1gKTtcbiAgICBjb25zdCBtb2R1bGVCYXNlTmFtZSA9IG5vcm1hbGl6ZShtb2R1bGVQYXRoKS5zcGxpdCgnLycpLnBvcCgpO1xuXG4gICAgY29uc3QgY2FuZGlkYXRlU2V0ID0gbmV3IFNldDxQYXRoPihbbm9ybWFsaXplKG9wdGlvbnMucGF0aCB8fCAnLycpXSk7XG5cbiAgICBmb3IgKGxldCBkaXIgPSBtb2R1bGVQYXRoOyBkaXIgIT0gTm9ybWFsaXplZFJvb3Q7IGRpciA9IGRpcm5hbWUoZGlyKSkge1xuICAgICAgY2FuZGlkYXRlU2V0LmFkZChkaXIpO1xuICAgIH1cbiAgICBmb3IgKGxldCBkaXIgPSBjb21wb25lbnRQYXRoOyBkaXIgIT0gTm9ybWFsaXplZFJvb3Q7IGRpciA9IGRpcm5hbWUoZGlyKSkge1xuICAgICAgY2FuZGlkYXRlU2V0LmFkZChkaXIpO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbmRpZGF0ZXNEaXJzID0gWy4uLmNhbmRpZGF0ZVNldF0uc29ydCgoYSwgYikgPT4gYi5sZW5ndGggLSBhLmxlbmd0aCk7XG4gICAgZm9yIChjb25zdCBjIG9mIGNhbmRpZGF0ZXNEaXJzKSB7XG4gICAgICBjb25zdCBjYW5kaWRhdGVGaWxlcyA9IFsnJywgYCR7bW9kdWxlQmFzZU5hbWV9LnRzYCwgYCR7bW9kdWxlQmFzZU5hbWV9JHttb2R1bGVFeHR9YF0ubWFwKFxuICAgICAgICAoeCkgPT4gam9pbihjLCB4KSxcbiAgICAgICk7XG5cbiAgICAgIGZvciAoY29uc3Qgc2Mgb2YgY2FuZGlkYXRlRmlsZXMpIHtcbiAgICAgICAgaWYgKGhvc3QuZXhpc3RzKHNjKSkge1xuICAgICAgICAgIHJldHVybiBub3JtYWxpemUoc2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFNwZWNpZmllZCBtb2R1bGUgJyR7b3B0aW9ucy5tb2R1bGV9JyBkb2VzIG5vdCBleGlzdC5cXG5gICtcbiAgICAgICAgYExvb2tlZCBpbiB0aGUgZm9sbG93aW5nIGRpcmVjdG9yaWVzOlxcbiAgICAke2NhbmRpZGF0ZXNEaXJzLmpvaW4oJ1xcbiAgICAnKX1gLFxuICAgICk7XG4gIH1cbn1cblxuLyoqXG4gKiBGdW5jdGlvbiB0byBmaW5kIHRoZSBcImNsb3Nlc3RcIiBtb2R1bGUgdG8gYSBnZW5lcmF0ZWQgZmlsZSdzIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTW9kdWxlKFxuICBob3N0OiBUcmVlLFxuICBnZW5lcmF0ZURpcjogc3RyaW5nLFxuICBtb2R1bGVFeHQgPSBNT0RVTEVfRVhULFxuICByb3V0aW5nTW9kdWxlRXh0ID0gUk9VVElOR19NT0RVTEVfRVhULFxuKTogUGF0aCB7XG4gIGxldCBkaXI6IERpckVudHJ5IHwgbnVsbCA9IGhvc3QuZ2V0RGlyKCcvJyArIGdlbmVyYXRlRGlyKTtcbiAgbGV0IGZvdW5kUm91dGluZ01vZHVsZSA9IGZhbHNlO1xuXG4gIHdoaWxlIChkaXIpIHtcbiAgICBjb25zdCBhbGxNYXRjaGVzID0gZGlyLnN1YmZpbGVzLmZpbHRlcigocCkgPT4gcC5lbmRzV2l0aChtb2R1bGVFeHQpKTtcbiAgICBjb25zdCBmaWx0ZXJlZE1hdGNoZXMgPSBhbGxNYXRjaGVzLmZpbHRlcigocCkgPT4gIXAuZW5kc1dpdGgocm91dGluZ01vZHVsZUV4dCkpO1xuXG4gICAgZm91bmRSb3V0aW5nTW9kdWxlID0gZm91bmRSb3V0aW5nTW9kdWxlIHx8IGFsbE1hdGNoZXMubGVuZ3RoICE9PSBmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoO1xuXG4gICAgaWYgKGZpbHRlcmVkTWF0Y2hlcy5sZW5ndGggPT0gMSkge1xuICAgICAgcmV0dXJuIGpvaW4oZGlyLnBhdGgsIGZpbHRlcmVkTWF0Y2hlc1swXSk7XG4gICAgfSBlbHNlIGlmIChmaWx0ZXJlZE1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTW9yZSB0aGFuIG9uZSBtb2R1bGUgbWF0Y2hlcy4gVXNlIHRoZSAnLS1za2lwLWltcG9ydCcgb3B0aW9uIHRvIHNraXAgaW1wb3J0aW5nIGAgK1xuICAgICAgICAgICd0aGUgY29tcG9uZW50IGludG8gdGhlIGNsb3Nlc3QgbW9kdWxlIG9yIHVzZSB0aGUgbW9kdWxlIG9wdGlvbiB0byBzcGVjaWZ5IGEgbW9kdWxlLicsXG4gICAgICApO1xuICAgIH1cblxuICAgIGRpciA9IGRpci5wYXJlbnQ7XG4gIH1cblxuICBjb25zdCBlcnJvck1zZyA9IGZvdW5kUm91dGluZ01vZHVsZVxuICAgID8gJ0NvdWxkIG5vdCBmaW5kIGEgbm9uIFJvdXRpbmcgTmdNb2R1bGUuJyArXG4gICAgICBgXFxuTW9kdWxlcyB3aXRoIHN1ZmZpeCAnJHtyb3V0aW5nTW9kdWxlRXh0fScgYXJlIHN0cmljdGx5IHJlc2VydmVkIGZvciByb3V0aW5nLmAgK1xuICAgICAgYFxcblVzZSB0aGUgJy0tc2tpcC1pbXBvcnQnIG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS5gXG4gICAgOiBgQ291bGQgbm90IGZpbmQgYW4gTmdNb2R1bGUuIFVzZSB0aGUgJy0tc2tpcC1pbXBvcnQnIG9wdGlvbiB0byBza2lwIGltcG9ydGluZyBpbiBOZ01vZHVsZS5gO1xuXG4gIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSByZWxhdGl2ZSBwYXRoIGZyb20gb25lIGZpbGUgcGF0aCB0byBhbm90aGVyIGZpbGUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUmVsYXRpdmVQYXRoKGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZyB7XG4gIGZyb20gPSBub3JtYWxpemUoZnJvbSk7XG4gIHRvID0gbm9ybWFsaXplKHRvKTtcblxuICAvLyBDb252ZXJ0IHRvIGFycmF5cy5cbiAgY29uc3QgZnJvbVBhcnRzID0gZnJvbS5zcGxpdCgnLycpO1xuICBjb25zdCB0b1BhcnRzID0gdG8uc3BsaXQoJy8nKTtcblxuICAvLyBSZW1vdmUgZmlsZSBuYW1lcyAocHJlc2VydmluZyBkZXN0aW5hdGlvbilcbiAgZnJvbVBhcnRzLnBvcCgpO1xuICBjb25zdCB0b0ZpbGVOYW1lID0gdG9QYXJ0cy5wb3AoKTtcblxuICBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShcbiAgICBub3JtYWxpemUoZnJvbVBhcnRzLmpvaW4oJy8nKSB8fCAnLycpLFxuICAgIG5vcm1hbGl6ZSh0b1BhcnRzLmpvaW4oJy8nKSB8fCAnLycpLFxuICApO1xuICBsZXQgcGF0aFByZWZpeCA9ICcnO1xuXG4gIC8vIFNldCB0aGUgcGF0aCBwcmVmaXggZm9yIHNhbWUgZGlyIG9yIGNoaWxkIGRpciwgcGFyZW50IGRpciBzdGFydHMgd2l0aCBgLi5gXG4gIGlmICghcmVsYXRpdmVQYXRoKSB7XG4gICAgcGF0aFByZWZpeCA9ICcuJztcbiAgfSBlbHNlIGlmICghcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIHBhdGhQcmVmaXggPSBgLi9gO1xuICB9XG4gIGlmIChwYXRoUHJlZml4ICYmICFwYXRoUHJlZml4LmVuZHNXaXRoKCcvJykpIHtcbiAgICBwYXRoUHJlZml4ICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiBwYXRoUHJlZml4ICsgKHJlbGF0aXZlUGF0aCA/IHJlbGF0aXZlUGF0aCArICcvJyA6ICcnKSArIHRvRmlsZU5hbWU7XG59XG4iXX0=