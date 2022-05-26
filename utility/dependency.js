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
exports.addDependency = exports.InstallBehavior = exports.DependencyType = void 0;
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
 * An enum used to specify the dependency installation behavior for the {@link addDependency}
 * schematics rule. The installation behavior affects if and when {@link NodePackageInstallTask}
 * will be scheduled when using the rule.
 */
var InstallBehavior;
(function (InstallBehavior) {
    /**
     * No installation will occur as a result of the rule when specified.
     *
     * NOTE: This does not prevent other rules from scheduling a {@link NodePackageInstallTask}
     * which may install the dependency.
     */
    InstallBehavior[InstallBehavior["None"] = 0] = "None";
    /**
     * Automatically determine the need to schedule a {@link NodePackageInstallTask} based on
     * previous usage of the {@link addDependency} within the schematic.
     */
    InstallBehavior[InstallBehavior["Auto"] = 1] = "Auto";
    /**
     * Always schedule a {@link NodePackageInstallTask} when the rule is executed.
     */
    InstallBehavior[InstallBehavior["Always"] = 2] = "Always";
})(InstallBehavior = exports.InstallBehavior || (exports.InstallBehavior = {}));
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
    const { type = DependencyType.Default, packageJsonPath = '/package.json', install = InstallBehavior.Auto, } = options;
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
        if (install === InstallBehavior.Always ||
            (install === InstallBehavior.Auto && !installPaths.has(packageJsonPath))) {
            context.addTask(new tasks_1.NodePackageInstallTask({ workingDirectory: path.dirname(packageJsonPath) }));
            installPaths.add(packageJsonPath);
            installTasks.set(context, installPaths);
        }
    };
}
exports.addDependency = addDependency;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw0REFBMEU7QUFDMUUsMkNBQTZCO0FBRTdCLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0FBUWxFOzs7R0FHRztBQUNILElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN4QiwwQ0FBd0IsQ0FBQTtJQUN4Qix5Q0FBdUIsQ0FBQTtJQUN2QiwyQ0FBeUIsQ0FBQTtBQUMzQixDQUFDLEVBSlcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFJekI7QUFFRDs7OztHQUlHO0FBQ0gsSUFBWSxlQWlCWDtBQWpCRCxXQUFZLGVBQWU7SUFDekI7Ozs7O09BS0c7SUFDSCxxREFBSSxDQUFBO0lBQ0o7OztPQUdHO0lBQ0gscURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gseURBQU0sQ0FBQTtBQUNSLENBQUMsRUFqQlcsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUFpQjFCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsU0FBZ0IsYUFBYSxDQUMzQixJQUFZLEVBQ1osU0FBaUIsRUFDakIsVUFpQkksRUFBRTtJQUVOLE1BQU0sRUFDSixJQUFJLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFDN0IsZUFBZSxHQUFHLGVBQWUsRUFDakMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEdBQy9CLEdBQUcsT0FBTyxDQUFDO0lBRVosT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTs7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQTJCLENBQUM7UUFDMUUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3RCLCtGQUErRjtZQUMvRixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDO1NBQ3hDO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUU7WUFDaEQsc0NBQXNDO1lBQ3RDLE9BQU87U0FDUjthQUFNLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsMENBQTBDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLElBQUksOENBQThDLENBQUMsQ0FBQztTQUM1RjthQUFNO1lBQ0wsMkNBQTJDO1lBQzNDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRCxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUM5QztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sWUFBWSxHQUFHLE1BQUEsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUNBQUksSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNwRSxJQUNFLE9BQU8sS0FBSyxlQUFlLENBQUMsTUFBTTtZQUNsQyxDQUFDLE9BQU8sS0FBSyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUN4RTtZQUNBLE9BQU8sQ0FBQyxPQUFPLENBQ2IsSUFBSSw4QkFBc0IsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUNoRixDQUFDO1lBQ0YsWUFBWSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNsQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUN6QztJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUEvREQsc0NBK0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFJ1bGUsIFNjaGVtYXRpY0NvbnRleHQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBOb2RlUGFja2FnZUluc3RhbGxUYXNrIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MvdGFza3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgaW5zdGFsbFRhc2tzID0gbmV3IFdlYWtNYXA8U2NoZW1hdGljQ29udGV4dCwgU2V0PHN0cmluZz4+KCk7XG5cbmludGVyZmFjZSBNaW5pbWFsUGFja2FnZU1hbmlmZXN0IHtcbiAgZGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgZGV2RGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgcGVlckRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbi8qKlxuICogQW4gZW51bSB1c2VkIHRvIHNwZWNpZnkgdGhlIHR5cGUgb2YgYSBkZXBlbmRlbmN5IGZvdW5kIHdpdGhpbiBhIHBhY2thZ2UgbWFuaWZlc3RcbiAqIGZpbGUgKGBwYWNrYWdlLmpzb25gKS5cbiAqL1xuZXhwb3J0IGVudW0gRGVwZW5kZW5jeVR5cGUge1xuICBEZWZhdWx0ID0gJ2RlcGVuZGVuY2llcycsXG4gIERldiA9ICdkZXZEZXBlbmRlbmNpZXMnLFxuICBQZWVyID0gJ3BlZXJEZXBlbmRlbmNpZXMnLFxufVxuXG4vKipcbiAqIEFuIGVudW0gdXNlZCB0byBzcGVjaWZ5IHRoZSBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiBiZWhhdmlvciBmb3IgdGhlIHtAbGluayBhZGREZXBlbmRlbmN5fVxuICogc2NoZW1hdGljcyBydWxlLiBUaGUgaW5zdGFsbGF0aW9uIGJlaGF2aW9yIGFmZmVjdHMgaWYgYW5kIHdoZW4ge0BsaW5rIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2t9XG4gKiB3aWxsIGJlIHNjaGVkdWxlZCB3aGVuIHVzaW5nIHRoZSBydWxlLlxuICovXG5leHBvcnQgZW51bSBJbnN0YWxsQmVoYXZpb3Ige1xuICAvKipcbiAgICogTm8gaW5zdGFsbGF0aW9uIHdpbGwgb2NjdXIgYXMgYSByZXN1bHQgb2YgdGhlIHJ1bGUgd2hlbiBzcGVjaWZpZWQuXG4gICAqXG4gICAqIE5PVEU6IFRoaXMgZG9lcyBub3QgcHJldmVudCBvdGhlciBydWxlcyBmcm9tIHNjaGVkdWxpbmcgYSB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza31cbiAgICogd2hpY2ggbWF5IGluc3RhbGwgdGhlIGRlcGVuZGVuY3kuXG4gICAqL1xuICBOb25lLFxuICAvKipcbiAgICogQXV0b21hdGljYWxseSBkZXRlcm1pbmUgdGhlIG5lZWQgdG8gc2NoZWR1bGUgYSB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza30gYmFzZWQgb25cbiAgICogcHJldmlvdXMgdXNhZ2Ugb2YgdGhlIHtAbGluayBhZGREZXBlbmRlbmN5fSB3aXRoaW4gdGhlIHNjaGVtYXRpYy5cbiAgICovXG4gIEF1dG8sXG4gIC8qKlxuICAgKiBBbHdheXMgc2NoZWR1bGUgYSB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza30gd2hlbiB0aGUgcnVsZSBpcyBleGVjdXRlZC5cbiAgICovXG4gIEFsd2F5cyxcbn1cblxuLyoqXG4gKiBBZGRzIGEgcGFja2FnZSBhcyBhIGRlcGVuZGVuY3kgdG8gYSBgcGFja2FnZS5qc29uYC4gQnkgZGVmYXVsdCB0aGUgYHBhY2thZ2UuanNvbmAgbG9jYXRlZFxuICogYXQgdGhlIHNjaGVtYXRpYydzIHJvb3Qgd2lsbCBiZSB1c2VkLiBUaGUgYG1hbmlmZXN0UGF0aGAgb3B0aW9uIGNhbiBiZSB1c2VkIHRvIGV4cGxpY2l0bHkgc3BlY2lmeVxuICogYSBgcGFja2FnZS5qc29uYCBpbiBkaWZmZXJlbnQgbG9jYXRpb24uIFRoZSB0eXBlIG9mIHRoZSBkZXBlbmRlbmN5IGNhbiBhbHNvIGJlIHNwZWNpZmllZCBpbnN0ZWFkXG4gKiBvZiB0aGUgZGVmYXVsdCBvZiB0aGUgYGRlcGVuZGVuY2llc2Agc2VjdGlvbiBieSB1c2luZyB0aGUgYHR5cGVgIG9wdGlvbiBmb3IgZWl0aGVyIGBkZXZEZXBlbmRlbmNpZXNgXG4gKiBvciBgcGVlckRlcGVuZGVuY2llc2AuXG4gKlxuICogV2hlbiB1c2luZyB0aGlzIHJ1bGUsIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSBkb2VzIG5vdCBuZWVkIHRvIGJlIGluY2x1ZGVkIGRpcmVjdGx5IGJ5XG4gKiBhIHNjaGVtYXRpYy4gQSBwYWNrYWdlIG1hbmFnZXIgaW5zdGFsbCB0YXNrIHdpbGwgYmUgYXV0b21hdGljYWxseSBzY2hlZHVsZWQgYXMgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBwYWNrYWdlIHRvIGFkZC5cbiAqIEBwYXJhbSBzcGVjaWZpZXIgVGhlIHBhY2thZ2Ugc3BlY2lmaWVyIGZvciB0aGUgcGFja2FnZSB0byBhZGQuIFR5cGljYWxseSBhIFNlbVZlciByYW5nZS5cbiAqIEBwYXJhbSBvcHRpb25zIEFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IGNhbiBjb250YWluIHRoZSBgdHlwZWAgb2YgdGhlIGRlcGVuZGVuY3lcbiAqIGFuZC9vciBhIHBhdGggKGBwYWNrYWdlSnNvblBhdGhgKSBvZiBhIG1hbmlmZXN0IGZpbGUgKGBwYWNrYWdlLmpzb25gKSB0byBtb2RpZnkuXG4gKiBAcmV0dXJucyBBIFNjaGVtYXRpY3Mge0BsaW5rIFJ1bGV9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGREZXBlbmRlbmN5KFxuICBuYW1lOiBzdHJpbmcsXG4gIHNwZWNpZmllcjogc3RyaW5nLFxuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogVGhlIHR5cGUgb2YgdGhlIGRlcGVuZGVuY3kgZGV0ZXJtaW5lcyB0aGUgc2VjdGlvbiBvZiB0aGUgYHBhY2thZ2UuanNvbmAgdG8gd2hpY2ggdGhlXG4gICAgICogZGVwZW5kZW5jeSB3aWxsIGJlIGFkZGVkLiBEZWZhdWx0cyB0byB7QGxpbmsgRGVwZW5kZW5jeVR5cGUuRGVmYXVsdH0gKGBkZXBlbmRlbmNpZXNgKS5cbiAgICAgKi9cbiAgICB0eXBlPzogRGVwZW5kZW5jeVR5cGU7XG4gICAgLyoqXG4gICAgICogVGhlIHBhdGggb2YgdGhlIHBhY2thZ2UgbWFuaWZlc3QgZmlsZSAoYHBhY2thZ2UuanNvbmApIHRoYXQgd2lsbCBiZSBtb2RpZmllZC5cbiAgICAgKiBEZWZhdWx0cyB0byBgL3BhY2thZ2UuanNvbmAuXG4gICAgICovXG4gICAgcGFja2FnZUpzb25QYXRoPzogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIFRoZSBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiBiZWhhdmlvciB0byB1c2UgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYVxuICAgICAqIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSBzaG91bGQgYmUgc2NoZWR1bGVkIGFmdGVyIGFkZGluZyB0aGUgZGVwZW5kZW5jeS5cbiAgICAgKiBEZWZhdWx0cyB0byB7QGxpbmsgSW5zdGFsbEJlaGF2aW9yLkF1dG99LlxuICAgICAqL1xuICAgIGluc3RhbGw/OiBJbnN0YWxsQmVoYXZpb3I7XG4gIH0gPSB7fSxcbik6IFJ1bGUge1xuICBjb25zdCB7XG4gICAgdHlwZSA9IERlcGVuZGVuY3lUeXBlLkRlZmF1bHQsXG4gICAgcGFja2FnZUpzb25QYXRoID0gJy9wYWNrYWdlLmpzb24nLFxuICAgIGluc3RhbGwgPSBJbnN0YWxsQmVoYXZpb3IuQXV0byxcbiAgfSA9IG9wdGlvbnM7XG5cbiAgcmV0dXJuICh0cmVlLCBjb250ZXh0KSA9PiB7XG4gICAgY29uc3QgbWFuaWZlc3QgPSB0cmVlLnJlYWRKc29uKHBhY2thZ2VKc29uUGF0aCkgYXMgTWluaW1hbFBhY2thZ2VNYW5pZmVzdDtcbiAgICBjb25zdCBkZXBlbmRlbmN5U2VjdGlvbiA9IG1hbmlmZXN0W3R5cGVdO1xuXG4gICAgaWYgKCFkZXBlbmRlbmN5U2VjdGlvbikge1xuICAgICAgLy8gU2VjdGlvbiBpcyBub3QgcHJlc2VudC4gVGhlIGRlcGVuZGVuY3kgY2FuIGJlIGFkZGVkIHRvIGEgbmV3IG9iamVjdCBsaXRlcmFsIGZvciB0aGUgc2VjdGlvbi5cbiAgICAgIG1hbmlmZXN0W3R5cGVdID0geyBbbmFtZV06IHNwZWNpZmllciB9O1xuICAgIH0gZWxzZSBpZiAoZGVwZW5kZW5jeVNlY3Rpb25bbmFtZV0gPT09IHNwZWNpZmllcikge1xuICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IHdpdGggc2FtZSBzcGVjaWZpZXJcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGRlcGVuZGVuY3lTZWN0aW9uW25hbWVdKSB7XG4gICAgICAvLyBBbHJlYWR5IHByZXNlbnQgYnV0IGRpZmZlcmVudCBzcGVjaWZpZXJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUGFja2FnZSBkZXBlbmRlbmN5IFwiJHtuYW1lfVwiIGFscmVhZHkgZXhpc3RzIHdpdGggYSBkaWZmZXJlbnQgc3BlY2lmaWVyLmApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBZGQgbmV3IGRlcGVuZGVuY3kgaW4gYWxwaGFiZXRpY2FsIG9yZGVyXG4gICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoZGVwZW5kZW5jeVNlY3Rpb24pO1xuICAgICAgZW50cmllcy5wdXNoKFtuYW1lLCBzcGVjaWZpZXJdKTtcbiAgICAgIGVudHJpZXMuc29ydCgoYSwgYikgPT4gYVswXS5sb2NhbGVDb21wYXJlKGJbMF0pKTtcbiAgICAgIG1hbmlmZXN0W3R5cGVdID0gT2JqZWN0LmZyb21FbnRyaWVzKGVudHJpZXMpO1xuICAgIH1cblxuICAgIHRyZWUub3ZlcndyaXRlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QsIG51bGwsIDIpKTtcblxuICAgIGNvbnN0IGluc3RhbGxQYXRocyA9IGluc3RhbGxUYXNrcy5nZXQoY29udGV4dCkgPz8gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgaWYgKFxuICAgICAgaW5zdGFsbCA9PT0gSW5zdGFsbEJlaGF2aW9yLkFsd2F5cyB8fFxuICAgICAgKGluc3RhbGwgPT09IEluc3RhbGxCZWhhdmlvci5BdXRvICYmICFpbnN0YWxsUGF0aHMuaGFzKHBhY2thZ2VKc29uUGF0aCkpXG4gICAgKSB7XG4gICAgICBjb250ZXh0LmFkZFRhc2soXG4gICAgICAgIG5ldyBOb2RlUGFja2FnZUluc3RhbGxUYXNrKHsgd29ya2luZ0RpcmVjdG9yeTogcGF0aC5kaXJuYW1lKHBhY2thZ2VKc29uUGF0aCkgfSksXG4gICAgICApO1xuICAgICAgaW5zdGFsbFBhdGhzLmFkZChwYWNrYWdlSnNvblBhdGgpO1xuICAgICAgaW5zdGFsbFRhc2tzLnNldChjb250ZXh0LCBpbnN0YWxsUGF0aHMpO1xuICAgIH1cbiAgfTtcbn1cbiJdfQ==