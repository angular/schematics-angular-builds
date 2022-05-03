"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDependency = exports.DependencyType = void 0;
const tasks_1 = require("@angular-devkit/schematics/tasks");
const path = __importStar(require("path"));
const installTasks = new WeakMap();
/**
 * An enum used to specify the type of a dependency found within a package manifest
 * file (`package.json`).
 */
var DependencyType;
(function (DependencyType) {
    DependencyType["Default"] = "dependencies";
    DependencyType["Dev"] = "devDependencies";
    DependencyType["Peer"] = "peerDependencies";
})(DependencyType = exports.DependencyType || (exports.DependencyType = {}));
/**
 * Adds a package as a dependency to a `package.json`. By default the `package.json` located
 * at the schematic's root will be used. The `manifestPath` option can be used to explicitly specify
 * a `package.json` in different location. The type of the dependency can also be specified instead
 * of the default of the `dependencies` section by using the `type` option for either `devDependencies`
 * or `peerDependencies`.
 *
 * When using this rule, {@link NodePackageInstallTask} does not need to be included directly by
 * a schematic. A package manager install task will be automatically scheduled as needed.
 *
 * @param name The name of the package to add.
 * @param specifier The package specifier for the package to add. Typically a SemVer range.
 * @param options An optional object that can contain the `type` of the dependency
 * and/or a path (`packageJsonPath`) of a manifest file (`package.json`) to modify.
 * @returns A Schematics {@link Rule}
 */
function addDependency(name, specifier, options = {}) {
    const { type = DependencyType.Default, packageJsonPath = '/package.json' } = options;
    return (tree, context) => {
        var _a;
        const manifest = tree.readJson(packageJsonPath);
        const dependencySection = manifest[type];
        if (!dependencySection) {
            // Section is not present. The dependency can be added to a new object literal for the section.
            manifest[type] = { [name]: specifier };
        }
        else if (dependencySection[name] === specifier) {
            // Already present with same specifier
            return;
        }
        else if (dependencySection[name]) {
            // Already present but different specifier
            throw new Error(`Package dependency "${name}" already exists with a different specifier.`);
        }
        else {
            // Add new dependency in alphabetical order
            const entries = Object.entries(dependencySection);
            entries.push([name, specifier]);
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            manifest[type] = Object.fromEntries(entries);
        }
        tree.overwrite(packageJsonPath, JSON.stringify(manifest, null, 2));
        const installPaths = (_a = installTasks.get(context)) !== null && _a !== void 0 ? _a : new Set();
        if (!installPaths.has(packageJsonPath)) {
            context.addTask(new tasks_1.NodePackageInstallTask({ workingDirectory: path.dirname(packageJsonPath) }));
            installPaths.add(packageJsonPath);
            installTasks.set(context, installPaths);
        }
    };
}
exports.addDependency = addDependency;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw0REFBMEU7QUFDMUUsMkNBQTZCO0FBRTdCLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0FBUWxFOzs7R0FHRztBQUNILElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN4QiwwQ0FBd0IsQ0FBQTtJQUN4Qix5Q0FBdUIsQ0FBQTtJQUN2QiwyQ0FBeUIsQ0FBQTtBQUMzQixDQUFDLEVBSlcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFJekI7QUFFRDs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSCxTQUFnQixhQUFhLENBQzNCLElBQVksRUFDWixTQUFpQixFQUNqQixVQVdJLEVBQUU7SUFFTixNQUFNLEVBQUUsSUFBSSxHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQUUsZUFBZSxHQUFHLGVBQWUsRUFBRSxHQUFHLE9BQU8sQ0FBQztJQUVyRixPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFOztRQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBMkIsQ0FBQztRQUMxRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7WUFDdEIsK0ZBQStGO1lBQy9GLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUM7U0FDeEM7YUFBTSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUNoRCxzQ0FBc0M7WUFDdEMsT0FBTztTQUNSO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNsQywwQ0FBMEM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsSUFBSSw4Q0FBOEMsQ0FBQyxDQUFDO1NBQzVGO2FBQU07WUFDTCwyQ0FBMkM7WUFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzlDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsTUFBTSxZQUFZLEdBQUcsTUFBQSxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQ3RDLE9BQU8sQ0FBQyxPQUFPLENBQ2IsSUFBSSw4QkFBc0IsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUNoRixDQUFDO1lBQ0YsWUFBWSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNsQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUN6QztJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUFsREQsc0NBa0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgaW5zdGFsbFRhc2tzID0gbmV3IFdlYWtNYXA8U2NoZW1hdGljQ29udGV4dCwgU2V0PHN0cmluZz4+KCk7XG5cbmludGVyZmFjZSBNaW5pbWFsUGFja2FnZU1hbmlmZXN0IHtcbiAgZGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgcGVlckRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogQW4gZW51bSB1c2VkIHRvIHNwZWNpZnkgdGhlIHR5cGUgb2YgYSBkZXBlbmRlbmN5IGZvdW5kIHdpdGhpbiBhIHBhY2thZ2UgbWFuaWZlc3RcbiAqIGZpbGUgKGBwYWNrYWdlLmpzb25gKS5cbiAqL1xuZXhwb3J0IGVudW0gRGVwZW5kZW5jeVR5cGUge1xuICBEZWZhdWx0ID0gJ2RlcGVuZGVuY2llcycsXG4gIERldiA9ICdkZXZEZXBlbmRlbmNpZXMnLFxuICBQZWVyID0gJ3BlZXJEZXBlbmRlbmNpZXMnLFxufVxuXG4vKipcbiAqIEFkZHMgYSBwYWNrYWdlIGFzIGEgZGVwZW5kZW5jeSB0byBhIGBwYWNrYWdlLmpzb25gLiBCeSBkZWZhdWx0IHRoZSBgcGFja2FnZS5qc29uYCBsb2NhdGVkXG4gKiBhdCB0aGUgc2NoZW1hdGljJ3Mgcm9vdCB3aWxsIGJlIHVzZWQuIFRoZSBgbWFuaWZlc3RQYXRoYCBvcHRpb24gY2FuIGJlIHVzZWQgdG8gZXhwbGljaXRseSBzcGVjaWZ5XG4gKiBhIGBwYWNrYWdlLmpzb25gIGluIGRpZmZlcmVudCBsb2NhdGlvbi4gVGhlIHR5cGUgb2YgdGhlIGRlcGVuZGVuY3kgY2FuIGFsc28gYmUgc3BlY2lmaWVkIGluc3RlYWRcbiAqIG9mIHRoZSBkZWZhdWx0IG9mIHRoZSBgZGVwZW5kZW5jaWVzYCBzZWN0aW9uIGJ5IHVzaW5nIHRoZSBgdHlwZWAgb3B0aW9uIGZvciBlaXRoZXIgYGRldkRlcGVuZGVuY2llc2BcbiAqIG9yIGBwZWVyRGVwZW5kZW5jaWVzYC5cbiAqXG4gKiBXaGVuIHVzaW5nIHRoaXMgcnVsZSwge0BsaW5rIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2t9IGRvZXMgbm90IG5lZWQgdG8gYmUgaW5jbHVkZWQgZGlyZWN0bHkgYnlcbiAqIGEgc2NoZW1hdGljLiBBIHBhY2thZ2UgbWFuYWdlciBpbnN0YWxsIHRhc2sgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHNjaGVkdWxlZCBhcyBuZWVkZWQuXG4gKlxuICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2UgdG8gYWRkLlxuICogQHBhcmFtIHNwZWNpZmllciBUaGUgcGFja2FnZSBzcGVjaWZpZXIgZm9yIHRoZSBwYWNrYWdlIHRvIGFkZC4gVHlwaWNhbGx5IGEgU2VtVmVyIHJhbmdlLlxuICogQHBhcmFtIG9wdGlvbnMgQW4gb3B0aW9uYWwgb2JqZWN0IHRoYXQgY2FuIGNvbnRhaW4gdGhlIGB0eXBlYCBvZiB0aGUgZGVwZW5kZW5jeVxuICogYW5kL29yIGEgcGF0aCAoYHBhY2thZ2VKc29uUGF0aGApIG9mIGEgbWFuaWZlc3QgZmlsZSAoYHBhY2thZ2UuanNvbmApIHRvIG1vZGlmeS5cbiAqIEByZXR1cm5zIEEgU2NoZW1hdGljcyB7QGxpbmsgUnVsZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZERlcGVuZGVuY3koXG4gIG5hbWU6IHN0cmluZyxcbiAgc3BlY2lmaWVyOiBzdHJpbmcsXG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBUaGUgdHlwZSBvZiB0aGUgZGVwZW5kZW5jeSBkZXRlcm1pbmVzIHRoZSBzZWN0aW9uIG9mIHRoZSBgcGFja2FnZS5qc29uYCB0byB3aGljaCB0aGVcbiAgICAgKiBkZXBlbmRlbmN5IHdpbGwgYmUgYWRkZWQuIERlZmF1bHRzIHRvIHtAbGluayBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0fSAoYGRlcGVuZGVuY2llc2ApLlxuICAgICAqL1xuICAgIHR5cGU/OiBEZXBlbmRlbmN5VHlwZTtcbiAgICAvKipcbiAgICAgKiBUaGUgcGF0aCBvZiB0aGUgcGFja2FnZSBtYW5pZmVzdCBmaWxlIChgcGFja2FnZS5qc29uYCkgdGhhdCB3aWxsIGJlIG1vZGlmaWVkLlxuICAgICAqIERlZmF1bHRzIHRvIGAvcGFja2FnZS5qc29uYC5cbiAgICAgKi9cbiAgICBwYWNrYWdlSnNvblBhdGg/OiBzdHJpbmc7XG4gIH0gPSB7fSxcbik6IFJ1bGUge1xuICBjb25zdCB7IHR5cGUgPSBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LCBwYWNrYWdlSnNvblBhdGggPSAnL3BhY2thZ2UuanNvbicgfSA9IG9wdGlvbnM7XG5cbiAgcmV0dXJuICh0cmVlLCBjb250ZXh0KSA9PiB7XG4gICAgY29uc3QgbWFuaWZlc3QgPSB0cmVlLnJlYWRKc29uKHBhY2thZ2VKc29uUGF0aCkgYXMgTWluaW1hbFBhY2thZ2VNYW5pZmVzdDtcbiAgICBjb25zdCBkZXBlbmRlbmN5U2VjdGlvbiA9IG1hbmlmZXN0W3R5cGVdO1xuXG4gICAgaWYgKCFkZXBlbmRlbmN5U2VjdGlvbikge1xuICAgICAgLy8gU2VjdGlvbiBpcyBub3QgcHJlc2VudC4gVGhlIGRlcGVuZGVuY3kgY2FuIGJlIGFkZGVkIHRvIGEgbmV3IG9iamVjdCBsaXRlcmFsIGZvciB0aGUgc2VjdGlvbi5cbiAgICAgIG1hbmlmZXN0W3R5cGVdID0geyBbbmFtZV06IHNwZWNpZmllciB9O1xuICAgIH0gZWxzZSBpZiAoZGVwZW5kZW5jeVNlY3Rpb25bbmFtZV0gPT09IHNwZWNpZmllcikge1xuICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IHdpdGggc2FtZSBzcGVjaWZpZXJcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGRlcGVuZGVuY3lTZWN0aW9uW25hbWVdKSB7XG4gICAgICAvLyBBbHJlYWR5IHByZXNlbnQgYnV0IGRpZmZlcmVudCBzcGVjaWZpZXJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUGFja2FnZSBkZXBlbmRlbmN5IFwiJHtuYW1lfVwiIGFscmVhZHkgZXhpc3RzIHdpdGggYSBkaWZmZXJlbnQgc3BlY2lmaWVyLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBZGQgbmV3IGRlcGVuZGVuY3kgaW4gYWxwaGFiZXRpY2FsIG9yZGVyXG4gICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoZGVwZW5kZW5jeVNlY3Rpb24pO1xuICAgICAgZW50cmllcy5wdXNoKFtuYW1lLCBzcGVjaWZpZXJdKTtcbiAgICAgIGVudHJpZXMuc29ydCgoYSwgYikgPT4gYVswXS5sb2NhbGVDb21wYXJlKGJbMF0pKTtcbiAgICAgIG1hbmlmZXN0W3R5cGVdID0gT2JqZWN0LmZyb21FbnRyaWVzKGVudHJpZXMpO1xuICAgIH1cblxuICAgIHRyZWUub3ZlcndyaXRlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QsIG51bGwsIDIpKTtcblxuICAgIGNvbnN0IGluc3RhbGxQYXRocyA9IGluc3RhbGxUYXNrcy5nZXQoY29udGV4dCkgPz8gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgaWYgKCFpbnN0YWxsUGF0aHMuaGFzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgbmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soeyB3b3JraW5nRGlyZWN0b3J5OiBwYXRoLmRpcm5hbWUocGFja2FnZUpzb25QYXRoKSB9KSxcbiAgICAgICk7XG4gICAgICBpbnN0YWxsUGF0aHMuYWRkKHBhY2thZ2VKc29uUGF0aCk7XG4gICAgICBpbnN0YWxsVGFza3Muc2V0KGNvbnRleHQsIGluc3RhbGxQYXRocyk7XG4gICAgfVxuICB9O1xufVxuIl19