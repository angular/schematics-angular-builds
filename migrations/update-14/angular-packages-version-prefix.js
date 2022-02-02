"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_1 = require("@angular-devkit/schematics/tasks");
const dependencies_1 = require("../../utility/dependencies");
const json_file_1 = require("../../utility/json-file");
const PACKAGES_REGEXP = /^@(?:angular|nguniversal|schematics|angular-devkit)\/|^ng-packagr$/;
/**
 * This migrations updates Angular packages 'dependencies' and 'devDependencies' version prefix to '^' instead of '~'.
 *
 * @example
 * **Before**
 * ```json
 * dependencies: {
 *   "@angular/animations": "~13.1.0",
 *   "@angular/common": "~13.1.0"
 * }
 * ```
 *
 * **After**
 * ```json
 * dependencies: {
 *   "@angular/animations": "^13.1.0",
 *   "@angular/common": "^13.1.0"
 * }
 * ```
 */
function default_1() {
    return (tree, context) => {
        const json = new json_file_1.JSONFile(tree, '/package.json');
        updateVersionPrefixToTilde(json, dependencies_1.NodeDependencyType.Default);
        updateVersionPrefixToTilde(json, dependencies_1.NodeDependencyType.Dev);
        context.addTask(new tasks_1.NodePackageInstallTask());
    };
}
exports.default = default_1;
function updateVersionPrefixToTilde(json, dependencyType) {
    const dependencyTypePath = [dependencyType];
    const dependencies = json.get(dependencyTypePath);
    if (!dependencies || typeof dependencies !== 'object') {
        return;
    }
    const updatedDependencies = new Map();
    for (const [name, version] of Object.entries(dependencies)) {
        if (typeof version === 'string' && version.charAt(0) === '~' && PACKAGES_REGEXP.test(name)) {
            updatedDependencies.set(name, `^${version.substring(1)}`);
        }
    }
    if (updatedDependencies.size) {
        json.modify(dependencyTypePath, {
            ...dependencies,
            ...Object.fromEntries(updatedDependencies),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ndWxhci1wYWNrYWdlcy12ZXJzaW9uLXByZWZpeC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xNC9hbmd1bGFyLXBhY2thZ2VzLXZlcnNpb24tcHJlZml4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBR0gsNERBQTBFO0FBQzFFLDZEQUFnRTtBQUNoRSx1REFBbUQ7QUFFbkQsTUFBTSxlQUFlLEdBQUcsb0VBQW9FLENBQUM7QUFFN0Y7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSDtJQUNFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDdkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNqRCwwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsaUNBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0QsMEJBQTBCLENBQUMsSUFBSSxFQUFFLGlDQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRXpELE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVJELDRCQVFDO0FBRUQsU0FBUywwQkFBMEIsQ0FBQyxJQUFjLEVBQUUsY0FBa0M7SUFDcEYsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVsRCxJQUFJLENBQUMsWUFBWSxJQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRTtRQUNyRCxPQUFPO0tBQ1I7SUFFRCxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQ3RELEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQzFELElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDMUYsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQzNEO0tBQ0Y7SUFFRCxJQUFJLG1CQUFtQixDQUFDLElBQUksRUFBRTtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFO1lBQzlCLEdBQUcsWUFBWTtZQUNmLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQztTQUMzQyxDQUFDLENBQUM7S0FDSjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgeyBOb2RlRGVwZW5kZW5jeVR5cGUgfSBmcm9tICcuLi8uLi91dGlsaXR5L2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvanNvbi1maWxlJztcblxuY29uc3QgUEFDS0FHRVNfUkVHRVhQID0gL15AKD86YW5ndWxhcnxuZ3VuaXZlcnNhbHxzY2hlbWF0aWNzfGFuZ3VsYXItZGV2a2l0KVxcL3xebmctcGFja2FnciQvO1xuXG4vKipcbiAqIFRoaXMgbWlncmF0aW9ucyB1cGRhdGVzIEFuZ3VsYXIgcGFja2FnZXMgJ2RlcGVuZGVuY2llcycgYW5kICdkZXZEZXBlbmRlbmNpZXMnIHZlcnNpb24gcHJlZml4IHRvICdeJyBpbnN0ZWFkIG9mICd+Jy5cbiAqXG4gKiBAZXhhbXBsZVxuICogKipCZWZvcmUqKlxuICogYGBganNvblxuICogZGVwZW5kZW5jaWVzOiB7XG4gKiAgIFwiQGFuZ3VsYXIvYW5pbWF0aW9uc1wiOiBcIn4xMy4xLjBcIixcbiAqICAgXCJAYW5ndWxhci9jb21tb25cIjogXCJ+MTMuMS4wXCJcbiAqIH1cbiAqIGBgYFxuICpcbiAqICoqQWZ0ZXIqKlxuICogYGBganNvblxuICogZGVwZW5kZW5jaWVzOiB7XG4gKiAgIFwiQGFuZ3VsYXIvYW5pbWF0aW9uc1wiOiBcIl4xMy4xLjBcIixcbiAqICAgXCJAYW5ndWxhci9jb21tb25cIjogXCJeMTMuMS4wXCJcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiAodHJlZSwgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGpzb24gPSBuZXcgSlNPTkZpbGUodHJlZSwgJy9wYWNrYWdlLmpzb24nKTtcbiAgICB1cGRhdGVWZXJzaW9uUHJlZml4VG9UaWxkZShqc29uLCBOb2RlRGVwZW5kZW5jeVR5cGUuRGVmYXVsdCk7XG4gICAgdXBkYXRlVmVyc2lvblByZWZpeFRvVGlsZGUoanNvbiwgTm9kZURlcGVuZGVuY3lUeXBlLkRldik7XG5cbiAgICBjb250ZXh0LmFkZFRhc2sobmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soKSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVZlcnNpb25QcmVmaXhUb1RpbGRlKGpzb246IEpTT05GaWxlLCBkZXBlbmRlbmN5VHlwZTogTm9kZURlcGVuZGVuY3lUeXBlKTogdm9pZCB7XG4gIGNvbnN0IGRlcGVuZGVuY3lUeXBlUGF0aCA9IFtkZXBlbmRlbmN5VHlwZV07XG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IGpzb24uZ2V0KGRlcGVuZGVuY3lUeXBlUGF0aCk7XG5cbiAgaWYgKCFkZXBlbmRlbmNpZXMgfHwgdHlwZW9mIGRlcGVuZGVuY2llcyAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB1cGRhdGVkRGVwZW5kZW5jaWVzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBbbmFtZSwgdmVyc2lvbl0gb2YgT2JqZWN0LmVudHJpZXMoZGVwZW5kZW5jaWVzKSkge1xuICAgIGlmICh0eXBlb2YgdmVyc2lvbiA9PT0gJ3N0cmluZycgJiYgdmVyc2lvbi5jaGFyQXQoMCkgPT09ICd+JyAmJiBQQUNLQUdFU19SRUdFWFAudGVzdChuYW1lKSkge1xuICAgICAgdXBkYXRlZERlcGVuZGVuY2llcy5zZXQobmFtZSwgYF4ke3ZlcnNpb24uc3Vic3RyaW5nKDEpfWApO1xuICAgIH1cbiAgfVxuXG4gIGlmICh1cGRhdGVkRGVwZW5kZW5jaWVzLnNpemUpIHtcbiAgICBqc29uLm1vZGlmeShkZXBlbmRlbmN5VHlwZVBhdGgsIHtcbiAgICAgIC4uLmRlcGVuZGVuY2llcyxcbiAgICAgIC4uLk9iamVjdC5mcm9tRW50cmllcyh1cGRhdGVkRGVwZW5kZW5jaWVzKSxcbiAgICB9KTtcbiAgfVxufVxuIl19