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
        else {
            const existingSpecifier = dependencySection[name];
            if (existingSpecifier === specifier) {
                // Already present with same specifier
                return;
            }
            if (existingSpecifier) {
                // Already present but different specifier
                // This warning may become an error in the future
                context.logger.warn(`Package dependency "${name}" already exists with a different specifier. ` +
                    `"${existingSpecifier}" will be replaced with "${specifier}".`);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw0REFBMEU7QUFDMUUsMkNBQTZCO0FBRTdCLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0FBUWxFOzs7R0FHRztBQUNILElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN4QiwwQ0FBd0IsQ0FBQTtJQUN4Qix5Q0FBdUIsQ0FBQTtJQUN2QiwyQ0FBeUIsQ0FBQTtBQUMzQixDQUFDLEVBSlcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFJekI7QUFFRDs7OztHQUlHO0FBQ0gsSUFBWSxlQWlCWDtBQWpCRCxXQUFZLGVBQWU7SUFDekI7Ozs7O09BS0c7SUFDSCxxREFBSSxDQUFBO0lBQ0o7OztPQUdHO0lBQ0gscURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gseURBQU0sQ0FBQTtBQUNSLENBQUMsRUFqQlcsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUFpQjFCO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsU0FBZ0IsYUFBYSxDQUMzQixJQUFZLEVBQ1osU0FBaUIsRUFDakIsVUFpQkksRUFBRTtJQUVOLE1BQU0sRUFDSixJQUFJLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFDN0IsZUFBZSxHQUFHLGVBQWUsRUFDakMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEdBQy9CLEdBQUcsT0FBTyxDQUFDO0lBRVosT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTs7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQTJCLENBQUM7UUFDMUUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3RCLCtGQUErRjtZQUMvRixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDO1NBQ3hDO2FBQU07WUFDTCxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWxELElBQUksaUJBQWlCLEtBQUssU0FBUyxFQUFFO2dCQUNuQyxzQ0FBc0M7Z0JBQ3RDLE9BQU87YUFDUjtZQUVELElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLDBDQUEwQztnQkFDMUMsaURBQWlEO2dCQUNqRCxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDakIsdUJBQXVCLElBQUksK0NBQStDO29CQUN4RSxJQUFJLGlCQUFpQiw0QkFBNEIsU0FBUyxJQUFJLENBQ2pFLENBQUM7YUFDSDtZQUVELDJDQUEyQztZQUMzQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakQsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDOUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVuRSxNQUFNLFlBQVksR0FBRyxNQUFBLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLG1DQUFJLElBQUksR0FBRyxFQUFVLENBQUM7UUFDcEUsSUFDRSxPQUFPLEtBQUssZUFBZSxDQUFDLE1BQU07WUFDbEMsQ0FBQyxPQUFPLEtBQUssZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsRUFDeEU7WUFDQSxPQUFPLENBQUMsT0FBTyxDQUNiLElBQUksOEJBQXNCLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FDaEYsQ0FBQztZQUNGLFlBQVksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbEMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBekVELHNDQXlFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlLCBTY2hlbWF0aWNDb250ZXh0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGluc3RhbGxUYXNrcyA9IG5ldyBXZWFrTWFwPFNjaGVtYXRpY0NvbnRleHQsIFNldDxzdHJpbmc+PigpO1xuXG5pbnRlcmZhY2UgTWluaW1hbFBhY2thZ2VNYW5pZmVzdCB7XG4gIGRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRldkRlcGVuZGVuY2llcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIHBlZXJEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG4vKipcbiAqIEFuIGVudW0gdXNlZCB0byBzcGVjaWZ5IHRoZSB0eXBlIG9mIGEgZGVwZW5kZW5jeSBmb3VuZCB3aXRoaW4gYSBwYWNrYWdlIG1hbmlmZXN0XG4gKiBmaWxlIChgcGFja2FnZS5qc29uYCkuXG4gKi9cbmV4cG9ydCBlbnVtIERlcGVuZGVuY3lUeXBlIHtcbiAgRGVmYXVsdCA9ICdkZXBlbmRlbmNpZXMnLFxuICBEZXYgPSAnZGV2RGVwZW5kZW5jaWVzJyxcbiAgUGVlciA9ICdwZWVyRGVwZW5kZW5jaWVzJyxcbn1cblxuLyoqXG4gKiBBbiBlbnVtIHVzZWQgdG8gc3BlY2lmeSB0aGUgZGVwZW5kZW5jeSBpbnN0YWxsYXRpb24gYmVoYXZpb3IgZm9yIHRoZSB7QGxpbmsgYWRkRGVwZW5kZW5jeX1cbiAqIHNjaGVtYXRpY3MgcnVsZS4gVGhlIGluc3RhbGxhdGlvbiBiZWhhdmlvciBhZmZlY3RzIGlmIGFuZCB3aGVuIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfVxuICogd2lsbCBiZSBzY2hlZHVsZWQgd2hlbiB1c2luZyB0aGUgcnVsZS5cbiAqL1xuZXhwb3J0IGVudW0gSW5zdGFsbEJlaGF2aW9yIHtcbiAgLyoqXG4gICAqIE5vIGluc3RhbGxhdGlvbiB3aWxsIG9jY3VyIGFzIGEgcmVzdWx0IG9mIHRoZSBydWxlIHdoZW4gc3BlY2lmaWVkLlxuICAgKlxuICAgKiBOT1RFOiBUaGlzIGRvZXMgbm90IHByZXZlbnQgb3RoZXIgcnVsZXMgZnJvbSBzY2hlZHVsaW5nIGEge0BsaW5rIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2t9XG4gICAqIHdoaWNoIG1heSBpbnN0YWxsIHRoZSBkZXBlbmRlbmN5LlxuICAgKi9cbiAgTm9uZSxcbiAgLyoqXG4gICAqIEF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5lIHRoZSBuZWVkIHRvIHNjaGVkdWxlIGEge0BsaW5rIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2t9IGJhc2VkIG9uXG4gICAqIHByZXZpb3VzIHVzYWdlIG9mIHRoZSB7QGxpbmsgYWRkRGVwZW5kZW5jeX0gd2l0aGluIHRoZSBzY2hlbWF0aWMuXG4gICAqL1xuICBBdXRvLFxuICAvKipcbiAgICogQWx3YXlzIHNjaGVkdWxlIGEge0BsaW5rIE5vZGVQYWNrYWdlSW5zdGFsbFRhc2t9IHdoZW4gdGhlIHJ1bGUgaXMgZXhlY3V0ZWQuXG4gICAqL1xuICBBbHdheXMsXG59XG5cbi8qKlxuICogQWRkcyBhIHBhY2thZ2UgYXMgYSBkZXBlbmRlbmN5IHRvIGEgYHBhY2thZ2UuanNvbmAuIEJ5IGRlZmF1bHQgdGhlIGBwYWNrYWdlLmpzb25gIGxvY2F0ZWRcbiAqIGF0IHRoZSBzY2hlbWF0aWMncyByb290IHdpbGwgYmUgdXNlZC4gVGhlIGBtYW5pZmVzdFBhdGhgIG9wdGlvbiBjYW4gYmUgdXNlZCB0byBleHBsaWNpdGx5IHNwZWNpZnlcbiAqIGEgYHBhY2thZ2UuanNvbmAgaW4gZGlmZmVyZW50IGxvY2F0aW9uLiBUaGUgdHlwZSBvZiB0aGUgZGVwZW5kZW5jeSBjYW4gYWxzbyBiZSBzcGVjaWZpZWQgaW5zdGVhZFxuICogb2YgdGhlIGRlZmF1bHQgb2YgdGhlIGBkZXBlbmRlbmNpZXNgIHNlY3Rpb24gYnkgdXNpbmcgdGhlIGB0eXBlYCBvcHRpb24gZm9yIGVpdGhlciBgZGV2RGVwZW5kZW5jaWVzYFxuICogb3IgYHBlZXJEZXBlbmRlbmNpZXNgLlxuICpcbiAqIFdoZW4gdXNpbmcgdGhpcyBydWxlLCB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza30gZG9lcyBub3QgbmVlZCB0byBiZSBpbmNsdWRlZCBkaXJlY3RseSBieVxuICogYSBzY2hlbWF0aWMuIEEgcGFja2FnZSBtYW5hZ2VyIGluc3RhbGwgdGFzayB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgc2NoZWR1bGVkIGFzIG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZSB0byBhZGQuXG4gKiBAcGFyYW0gc3BlY2lmaWVyIFRoZSBwYWNrYWdlIHNwZWNpZmllciBmb3IgdGhlIHBhY2thZ2UgdG8gYWRkLiBUeXBpY2FsbHkgYSBTZW1WZXIgcmFuZ2UuXG4gKiBAcGFyYW0gb3B0aW9ucyBBbiBvcHRpb25hbCBvYmplY3QgdGhhdCBjYW4gY29udGFpbiB0aGUgYHR5cGVgIG9mIHRoZSBkZXBlbmRlbmN5XG4gKiBhbmQvb3IgYSBwYXRoIChgcGFja2FnZUpzb25QYXRoYCkgb2YgYSBtYW5pZmVzdCBmaWxlIChgcGFja2FnZS5qc29uYCkgdG8gbW9kaWZ5LlxuICogQHJldHVybnMgQSBTY2hlbWF0aWNzIHtAbGluayBSdWxlfVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkRGVwZW5kZW5jeShcbiAgbmFtZTogc3RyaW5nLFxuICBzcGVjaWZpZXI6IHN0cmluZyxcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIFRoZSB0eXBlIG9mIHRoZSBkZXBlbmRlbmN5IGRldGVybWluZXMgdGhlIHNlY3Rpb24gb2YgdGhlIGBwYWNrYWdlLmpzb25gIHRvIHdoaWNoIHRoZVxuICAgICAqIGRlcGVuZGVuY3kgd2lsbCBiZSBhZGRlZC4gRGVmYXVsdHMgdG8ge0BsaW5rIERlcGVuZGVuY3lUeXBlLkRlZmF1bHR9IChgZGVwZW5kZW5jaWVzYCkuXG4gICAgICovXG4gICAgdHlwZT86IERlcGVuZGVuY3lUeXBlO1xuICAgIC8qKlxuICAgICAqIFRoZSBwYXRoIG9mIHRoZSBwYWNrYWdlIG1hbmlmZXN0IGZpbGUgKGBwYWNrYWdlLmpzb25gKSB0aGF0IHdpbGwgYmUgbW9kaWZpZWQuXG4gICAgICogRGVmYXVsdHMgdG8gYC9wYWNrYWdlLmpzb25gLlxuICAgICAqL1xuICAgIHBhY2thZ2VKc29uUGF0aD86IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBUaGUgZGVwZW5kZW5jeSBpbnN0YWxsYXRpb24gYmVoYXZpb3IgdG8gdXNlIHRvIGRldGVybWluZSB3aGV0aGVyIGFcbiAgICAgKiB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza30gc2hvdWxkIGJlIHNjaGVkdWxlZCBhZnRlciBhZGRpbmcgdGhlIGRlcGVuZGVuY3kuXG4gICAgICogRGVmYXVsdHMgdG8ge0BsaW5rIEluc3RhbGxCZWhhdmlvci5BdXRvfS5cbiAgICAgKi9cbiAgICBpbnN0YWxsPzogSW5zdGFsbEJlaGF2aW9yO1xuICB9ID0ge30sXG4pOiBSdWxlIHtcbiAgY29uc3Qge1xuICAgIHR5cGUgPSBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LFxuICAgIHBhY2thZ2VKc29uUGF0aCA9ICcvcGFja2FnZS5qc29uJyxcbiAgICBpbnN0YWxsID0gSW5zdGFsbEJlaGF2aW9yLkF1dG8sXG4gIH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiAodHJlZSwgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG1hbmlmZXN0ID0gdHJlZS5yZWFkSnNvbihwYWNrYWdlSnNvblBhdGgpIGFzIE1pbmltYWxQYWNrYWdlTWFuaWZlc3Q7XG4gICAgY29uc3QgZGVwZW5kZW5jeVNlY3Rpb24gPSBtYW5pZmVzdFt0eXBlXTtcblxuICAgIGlmICghZGVwZW5kZW5jeVNlY3Rpb24pIHtcbiAgICAgIC8vIFNlY3Rpb24gaXMgbm90IHByZXNlbnQuIFRoZSBkZXBlbmRlbmN5IGNhbiBiZSBhZGRlZCB0byBhIG5ldyBvYmplY3QgbGl0ZXJhbCBmb3IgdGhlIHNlY3Rpb24uXG4gICAgICBtYW5pZmVzdFt0eXBlXSA9IHsgW25hbWVdOiBzcGVjaWZpZXIgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXhpc3RpbmdTcGVjaWZpZXIgPSBkZXBlbmRlbmN5U2VjdGlvbltuYW1lXTtcblxuICAgICAgaWYgKGV4aXN0aW5nU3BlY2lmaWVyID09PSBzcGVjaWZpZXIpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IHdpdGggc2FtZSBzcGVjaWZpZXJcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhpc3RpbmdTcGVjaWZpZXIpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IGJ1dCBkaWZmZXJlbnQgc3BlY2lmaWVyXG4gICAgICAgIC8vIFRoaXMgd2FybmluZyBtYXkgYmVjb21lIGFuIGVycm9yIGluIHRoZSBmdXR1cmVcbiAgICAgICAgY29udGV4dC5sb2dnZXIud2FybihcbiAgICAgICAgICBgUGFja2FnZSBkZXBlbmRlbmN5IFwiJHtuYW1lfVwiIGFscmVhZHkgZXhpc3RzIHdpdGggYSBkaWZmZXJlbnQgc3BlY2lmaWVyLiBgICtcbiAgICAgICAgICAgIGBcIiR7ZXhpc3RpbmdTcGVjaWZpZXJ9XCIgd2lsbCBiZSByZXBsYWNlZCB3aXRoIFwiJHtzcGVjaWZpZXJ9XCIuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRkIG5ldyBkZXBlbmRlbmN5IGluIGFscGhhYmV0aWNhbCBvcmRlclxuICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKGRlcGVuZGVuY3lTZWN0aW9uKTtcbiAgICAgIGVudHJpZXMucHVzaChbbmFtZSwgc3BlY2lmaWVyXSk7XG4gICAgICBlbnRyaWVzLnNvcnQoKGEsIGIpID0+IGFbMF0ubG9jYWxlQ29tcGFyZShiWzBdKSk7XG4gICAgICBtYW5pZmVzdFt0eXBlXSA9IE9iamVjdC5mcm9tRW50cmllcyhlbnRyaWVzKTtcbiAgICB9XG5cbiAgICB0cmVlLm92ZXJ3cml0ZShwYWNrYWdlSnNvblBhdGgsIEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKSk7XG5cbiAgICBjb25zdCBpbnN0YWxsUGF0aHMgPSBpbnN0YWxsVGFza3MuZ2V0KGNvbnRleHQpID8/IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGlmIChcbiAgICAgIGluc3RhbGwgPT09IEluc3RhbGxCZWhhdmlvci5BbHdheXMgfHxcbiAgICAgIChpbnN0YWxsID09PSBJbnN0YWxsQmVoYXZpb3IuQXV0byAmJiAhaW5zdGFsbFBhdGhzLmhhcyhwYWNrYWdlSnNvblBhdGgpKVxuICAgICkge1xuICAgICAgY29udGV4dC5hZGRUYXNrKFxuICAgICAgICBuZXcgTm9kZVBhY2thZ2VJbnN0YWxsVGFzayh7IHdvcmtpbmdEaXJlY3Rvcnk6IHBhdGguZGlybmFtZShwYWNrYWdlSnNvblBhdGgpIH0pLFxuICAgICAgKTtcbiAgICAgIGluc3RhbGxQYXRocy5hZGQocGFja2FnZUpzb25QYXRoKTtcbiAgICAgIGluc3RhbGxUYXNrcy5zZXQoY29udGV4dCwgaW5zdGFsbFBhdGhzKTtcbiAgICB9XG4gIH07XG59XG4iXX0=