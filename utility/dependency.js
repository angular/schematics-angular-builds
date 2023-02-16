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
exports.addDependency = exports.ExistingBehavior = exports.InstallBehavior = exports.DependencyType = void 0;
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
 * An enum used to specify the existing dependency behavior for the {@link addDependency}
 * schematics rule. The existing behavior affects whether the named dependency will be added
 * to the `package.json` when the dependency is already present with a differing specifier.
 */
var ExistingBehavior;
(function (ExistingBehavior) {
    /**
     * The dependency will not be added or otherwise changed if it already exists.
     */
    ExistingBehavior[ExistingBehavior["Skip"] = 0] = "Skip";
    /**
     * The dependency's existing specifier will be replaced with the specifier provided in the
     * {@link addDependency} call. A warning will also be shown during schematic execution to
     * notify the user of the replacement.
     */
    ExistingBehavior[ExistingBehavior["Replace"] = 1] = "Replace";
})(ExistingBehavior = exports.ExistingBehavior || (exports.ExistingBehavior = {}));
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
    const { type = DependencyType.Default, packageJsonPath = '/package.json', install = InstallBehavior.Auto, existing = ExistingBehavior.Replace, } = options;
    return (tree, context) => {
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
                if (existing === ExistingBehavior.Skip) {
                    return;
                }
                // ExistingBehavior.Replace is the only other behavior currently
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
        const installPaths = installTasks.get(context) ?? new Set();
        if (install === InstallBehavior.Always ||
            (install === InstallBehavior.Auto && !installPaths.has(packageJsonPath))) {
            context.addTask(new tasks_1.NodePackageInstallTask({ workingDirectory: path.dirname(packageJsonPath) }));
            installPaths.add(packageJsonPath);
            installTasks.set(context, installPaths);
        }
    };
}
exports.addDependency = addDependency;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2RlcGVuZGVuY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw0REFBMEU7QUFDMUUsMkNBQTZCO0FBRTdCLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFpQyxDQUFDO0FBUWxFOzs7R0FHRztBQUNILElBQVksY0FJWDtBQUpELFdBQVksY0FBYztJQUN4QiwwQ0FBd0IsQ0FBQTtJQUN4Qix5Q0FBdUIsQ0FBQTtJQUN2QiwyQ0FBeUIsQ0FBQTtBQUMzQixDQUFDLEVBSlcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFJekI7QUFFRDs7OztHQUlHO0FBQ0gsSUFBWSxlQWlCWDtBQWpCRCxXQUFZLGVBQWU7SUFDekI7Ozs7O09BS0c7SUFDSCxxREFBSSxDQUFBO0lBQ0o7OztPQUdHO0lBQ0gscURBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gseURBQU0sQ0FBQTtBQUNSLENBQUMsRUFqQlcsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUFpQjFCO0FBRUQ7Ozs7R0FJRztBQUNILElBQVksZ0JBV1g7QUFYRCxXQUFZLGdCQUFnQjtJQUMxQjs7T0FFRztJQUNILHVEQUFJLENBQUE7SUFDSjs7OztPQUlHO0lBQ0gsNkRBQU8sQ0FBQTtBQUNULENBQUMsRUFYVyxnQkFBZ0IsR0FBaEIsd0JBQWdCLEtBQWhCLHdCQUFnQixRQVczQjtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNILFNBQWdCLGFBQWEsQ0FDM0IsSUFBWSxFQUNaLFNBQWlCLEVBQ2pCLFVBc0JJLEVBQUU7SUFFTixNQUFNLEVBQ0osSUFBSSxHQUFHLGNBQWMsQ0FBQyxPQUFPLEVBQzdCLGVBQWUsR0FBRyxlQUFlLEVBQ2pDLE9BQU8sR0FBRyxlQUFlLENBQUMsSUFBSSxFQUM5QixRQUFRLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxHQUNwQyxHQUFHLE9BQU8sQ0FBQztJQUVaLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQTJCLENBQUM7UUFDMUUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1lBQ3RCLCtGQUErRjtZQUMvRixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDO1NBQ3hDO2FBQU07WUFDTCxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWxELElBQUksaUJBQWlCLEtBQUssU0FBUyxFQUFFO2dCQUNuQyxzQ0FBc0M7Z0JBQ3RDLE9BQU87YUFDUjtZQUVELElBQUksaUJBQWlCLEVBQUU7Z0JBQ3JCLDBDQUEwQztnQkFFMUMsSUFBSSxRQUFRLEtBQUssZ0JBQWdCLENBQUMsSUFBSSxFQUFFO29CQUN0QyxPQUFPO2lCQUNSO2dCQUVELGdFQUFnRTtnQkFDaEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2pCLHVCQUF1QixJQUFJLCtDQUErQztvQkFDeEUsSUFBSSxpQkFBaUIsNEJBQTRCLFNBQVMsSUFBSSxDQUNqRSxDQUFDO2FBQ0g7WUFFRCwyQ0FBMkM7WUFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQzlDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3BFLElBQ0UsT0FBTyxLQUFLLGVBQWUsQ0FBQyxNQUFNO1lBQ2xDLENBQUMsT0FBTyxLQUFLLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQ3hFO1lBQ0EsT0FBTyxDQUFDLE9BQU8sQ0FDYixJQUFJLDhCQUFzQixDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQ2hGLENBQUM7WUFDRixZQUFZLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2xDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXBGRCxzQ0FvRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSwgU2NoZW1hdGljQ29udGV4dCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2sgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcy90YXNrcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBpbnN0YWxsVGFza3MgPSBuZXcgV2Vha01hcDxTY2hlbWF0aWNDb250ZXh0LCBTZXQ8c3RyaW5nPj4oKTtcblxuaW50ZXJmYWNlIE1pbmltYWxQYWNrYWdlTWFuaWZlc3Qge1xuICBkZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBkZXZEZXBlbmRlbmNpZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBwZWVyRGVwZW5kZW5jaWVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuLyoqXG4gKiBBbiBlbnVtIHVzZWQgdG8gc3BlY2lmeSB0aGUgdHlwZSBvZiBhIGRlcGVuZGVuY3kgZm91bmQgd2l0aGluIGEgcGFja2FnZSBtYW5pZmVzdFxuICogZmlsZSAoYHBhY2thZ2UuanNvbmApLlxuICovXG5leHBvcnQgZW51bSBEZXBlbmRlbmN5VHlwZSB7XG4gIERlZmF1bHQgPSAnZGVwZW5kZW5jaWVzJyxcbiAgRGV2ID0gJ2RldkRlcGVuZGVuY2llcycsXG4gIFBlZXIgPSAncGVlckRlcGVuZGVuY2llcycsXG59XG5cbi8qKlxuICogQW4gZW51bSB1c2VkIHRvIHNwZWNpZnkgdGhlIGRlcGVuZGVuY3kgaW5zdGFsbGF0aW9uIGJlaGF2aW9yIGZvciB0aGUge0BsaW5rIGFkZERlcGVuZGVuY3l9XG4gKiBzY2hlbWF0aWNzIHJ1bGUuIFRoZSBpbnN0YWxsYXRpb24gYmVoYXZpb3IgYWZmZWN0cyBpZiBhbmQgd2hlbiB7QGxpbmsgTm9kZVBhY2thZ2VJbnN0YWxsVGFza31cbiAqIHdpbGwgYmUgc2NoZWR1bGVkIHdoZW4gdXNpbmcgdGhlIHJ1bGUuXG4gKi9cbmV4cG9ydCBlbnVtIEluc3RhbGxCZWhhdmlvciB7XG4gIC8qKlxuICAgKiBObyBpbnN0YWxsYXRpb24gd2lsbCBvY2N1ciBhcyBhIHJlc3VsdCBvZiB0aGUgcnVsZSB3aGVuIHNwZWNpZmllZC5cbiAgICpcbiAgICogTk9URTogVGhpcyBkb2VzIG5vdCBwcmV2ZW50IG90aGVyIHJ1bGVzIGZyb20gc2NoZWR1bGluZyBhIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfVxuICAgKiB3aGljaCBtYXkgaW5zdGFsbCB0aGUgZGVwZW5kZW5jeS5cbiAgICovXG4gIE5vbmUsXG4gIC8qKlxuICAgKiBBdXRvbWF0aWNhbGx5IGRldGVybWluZSB0aGUgbmVlZCB0byBzY2hlZHVsZSBhIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSBiYXNlZCBvblxuICAgKiBwcmV2aW91cyB1c2FnZSBvZiB0aGUge0BsaW5rIGFkZERlcGVuZGVuY3l9IHdpdGhpbiB0aGUgc2NoZW1hdGljLlxuICAgKi9cbiAgQXV0byxcbiAgLyoqXG4gICAqIEFsd2F5cyBzY2hlZHVsZSBhIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSB3aGVuIHRoZSBydWxlIGlzIGV4ZWN1dGVkLlxuICAgKi9cbiAgQWx3YXlzLFxufVxuXG4vKipcbiAqIEFuIGVudW0gdXNlZCB0byBzcGVjaWZ5IHRoZSBleGlzdGluZyBkZXBlbmRlbmN5IGJlaGF2aW9yIGZvciB0aGUge0BsaW5rIGFkZERlcGVuZGVuY3l9XG4gKiBzY2hlbWF0aWNzIHJ1bGUuIFRoZSBleGlzdGluZyBiZWhhdmlvciBhZmZlY3RzIHdoZXRoZXIgdGhlIG5hbWVkIGRlcGVuZGVuY3kgd2lsbCBiZSBhZGRlZFxuICogdG8gdGhlIGBwYWNrYWdlLmpzb25gIHdoZW4gdGhlIGRlcGVuZGVuY3kgaXMgYWxyZWFkeSBwcmVzZW50IHdpdGggYSBkaWZmZXJpbmcgc3BlY2lmaWVyLlxuICovXG5leHBvcnQgZW51bSBFeGlzdGluZ0JlaGF2aW9yIHtcbiAgLyoqXG4gICAqIFRoZSBkZXBlbmRlbmN5IHdpbGwgbm90IGJlIGFkZGVkIG9yIG90aGVyd2lzZSBjaGFuZ2VkIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgKi9cbiAgU2tpcCxcbiAgLyoqXG4gICAqIFRoZSBkZXBlbmRlbmN5J3MgZXhpc3Rpbmcgc3BlY2lmaWVyIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCB0aGUgc3BlY2lmaWVyIHByb3ZpZGVkIGluIHRoZVxuICAgKiB7QGxpbmsgYWRkRGVwZW5kZW5jeX0gY2FsbC4gQSB3YXJuaW5nIHdpbGwgYWxzbyBiZSBzaG93biBkdXJpbmcgc2NoZW1hdGljIGV4ZWN1dGlvbiB0b1xuICAgKiBub3RpZnkgdGhlIHVzZXIgb2YgdGhlIHJlcGxhY2VtZW50LlxuICAgKi9cbiAgUmVwbGFjZSxcbn1cblxuLyoqXG4gKiBBZGRzIGEgcGFja2FnZSBhcyBhIGRlcGVuZGVuY3kgdG8gYSBgcGFja2FnZS5qc29uYC4gQnkgZGVmYXVsdCB0aGUgYHBhY2thZ2UuanNvbmAgbG9jYXRlZFxuICogYXQgdGhlIHNjaGVtYXRpYydzIHJvb3Qgd2lsbCBiZSB1c2VkLiBUaGUgYG1hbmlmZXN0UGF0aGAgb3B0aW9uIGNhbiBiZSB1c2VkIHRvIGV4cGxpY2l0bHkgc3BlY2lmeVxuICogYSBgcGFja2FnZS5qc29uYCBpbiBkaWZmZXJlbnQgbG9jYXRpb24uIFRoZSB0eXBlIG9mIHRoZSBkZXBlbmRlbmN5IGNhbiBhbHNvIGJlIHNwZWNpZmllZCBpbnN0ZWFkXG4gKiBvZiB0aGUgZGVmYXVsdCBvZiB0aGUgYGRlcGVuZGVuY2llc2Agc2VjdGlvbiBieSB1c2luZyB0aGUgYHR5cGVgIG9wdGlvbiBmb3IgZWl0aGVyIGBkZXZEZXBlbmRlbmNpZXNgXG4gKiBvciBgcGVlckRlcGVuZGVuY2llc2AuXG4gKlxuICogV2hlbiB1c2luZyB0aGlzIHJ1bGUsIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSBkb2VzIG5vdCBuZWVkIHRvIGJlIGluY2x1ZGVkIGRpcmVjdGx5IGJ5XG4gKiBhIHNjaGVtYXRpYy4gQSBwYWNrYWdlIG1hbmFnZXIgaW5zdGFsbCB0YXNrIHdpbGwgYmUgYXV0b21hdGljYWxseSBzY2hlZHVsZWQgYXMgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBwYWNrYWdlIHRvIGFkZC5cbiAqIEBwYXJhbSBzcGVjaWZpZXIgVGhlIHBhY2thZ2Ugc3BlY2lmaWVyIGZvciB0aGUgcGFja2FnZSB0byBhZGQuIFR5cGljYWxseSBhIFNlbVZlciByYW5nZS5cbiAqIEBwYXJhbSBvcHRpb25zIEFuIG9wdGlvbmFsIG9iamVjdCB0aGF0IGNhbiBjb250YWluIHRoZSBgdHlwZWAgb2YgdGhlIGRlcGVuZGVuY3lcbiAqIGFuZC9vciBhIHBhdGggKGBwYWNrYWdlSnNvblBhdGhgKSBvZiBhIG1hbmlmZXN0IGZpbGUgKGBwYWNrYWdlLmpzb25gKSB0byBtb2RpZnkuXG4gKiBAcmV0dXJucyBBIFNjaGVtYXRpY3Mge0BsaW5rIFJ1bGV9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGREZXBlbmRlbmN5KFxuICBuYW1lOiBzdHJpbmcsXG4gIHNwZWNpZmllcjogc3RyaW5nLFxuICBvcHRpb25zOiB7XG4gICAgLyoqXG4gICAgICogVGhlIHR5cGUgb2YgdGhlIGRlcGVuZGVuY3kgZGV0ZXJtaW5lcyB0aGUgc2VjdGlvbiBvZiB0aGUgYHBhY2thZ2UuanNvbmAgdG8gd2hpY2ggdGhlXG4gICAgICogZGVwZW5kZW5jeSB3aWxsIGJlIGFkZGVkLiBEZWZhdWx0cyB0byB7QGxpbmsgRGVwZW5kZW5jeVR5cGUuRGVmYXVsdH0gKGBkZXBlbmRlbmNpZXNgKS5cbiAgICAgKi9cbiAgICB0eXBlPzogRGVwZW5kZW5jeVR5cGU7XG4gICAgLyoqXG4gICAgICogVGhlIHBhdGggb2YgdGhlIHBhY2thZ2UgbWFuaWZlc3QgZmlsZSAoYHBhY2thZ2UuanNvbmApIHRoYXQgd2lsbCBiZSBtb2RpZmllZC5cbiAgICAgKiBEZWZhdWx0cyB0byBgL3BhY2thZ2UuanNvbmAuXG4gICAgICovXG4gICAgcGFja2FnZUpzb25QYXRoPzogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIFRoZSBkZXBlbmRlbmN5IGluc3RhbGxhdGlvbiBiZWhhdmlvciB0byB1c2UgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgYVxuICAgICAqIHtAbGluayBOb2RlUGFja2FnZUluc3RhbGxUYXNrfSBzaG91bGQgYmUgc2NoZWR1bGVkIGFmdGVyIGFkZGluZyB0aGUgZGVwZW5kZW5jeS5cbiAgICAgKiBEZWZhdWx0cyB0byB7QGxpbmsgSW5zdGFsbEJlaGF2aW9yLkF1dG99LlxuICAgICAqL1xuICAgIGluc3RhbGw/OiBJbnN0YWxsQmVoYXZpb3I7XG4gICAgLyoqXG4gICAgICogVGhlIGJlaGF2aW9yIHRvIHVzZSB3aGVuIHRoZSBkZXBlbmRlbmN5IGFscmVhZHkgZXhpc3RzIHdpdGhpbiB0aGUgYHBhY2thZ2UuanNvbmAuXG4gICAgICogRGVmYXVsdHMgdG8ge0BsaW5rIEV4aXN0aW5nQmVoYXZpb3IuUmVwbGFjZX0uXG4gICAgICovXG4gICAgZXhpc3Rpbmc/OiBFeGlzdGluZ0JlaGF2aW9yO1xuICB9ID0ge30sXG4pOiBSdWxlIHtcbiAgY29uc3Qge1xuICAgIHR5cGUgPSBEZXBlbmRlbmN5VHlwZS5EZWZhdWx0LFxuICAgIHBhY2thZ2VKc29uUGF0aCA9ICcvcGFja2FnZS5qc29uJyxcbiAgICBpbnN0YWxsID0gSW5zdGFsbEJlaGF2aW9yLkF1dG8sXG4gICAgZXhpc3RpbmcgPSBFeGlzdGluZ0JlaGF2aW9yLlJlcGxhY2UsXG4gIH0gPSBvcHRpb25zO1xuXG4gIHJldHVybiAodHJlZSwgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IG1hbmlmZXN0ID0gdHJlZS5yZWFkSnNvbihwYWNrYWdlSnNvblBhdGgpIGFzIE1pbmltYWxQYWNrYWdlTWFuaWZlc3Q7XG4gICAgY29uc3QgZGVwZW5kZW5jeVNlY3Rpb24gPSBtYW5pZmVzdFt0eXBlXTtcblxuICAgIGlmICghZGVwZW5kZW5jeVNlY3Rpb24pIHtcbiAgICAgIC8vIFNlY3Rpb24gaXMgbm90IHByZXNlbnQuIFRoZSBkZXBlbmRlbmN5IGNhbiBiZSBhZGRlZCB0byBhIG5ldyBvYmplY3QgbGl0ZXJhbCBmb3IgdGhlIHNlY3Rpb24uXG4gICAgICBtYW5pZmVzdFt0eXBlXSA9IHsgW25hbWVdOiBzcGVjaWZpZXIgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXhpc3RpbmdTcGVjaWZpZXIgPSBkZXBlbmRlbmN5U2VjdGlvbltuYW1lXTtcblxuICAgICAgaWYgKGV4aXN0aW5nU3BlY2lmaWVyID09PSBzcGVjaWZpZXIpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IHdpdGggc2FtZSBzcGVjaWZpZXJcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXhpc3RpbmdTcGVjaWZpZXIpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBwcmVzZW50IGJ1dCBkaWZmZXJlbnQgc3BlY2lmaWVyXG5cbiAgICAgICAgaWYgKGV4aXN0aW5nID09PSBFeGlzdGluZ0JlaGF2aW9yLlNraXApIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGlzdGluZ0JlaGF2aW9yLlJlcGxhY2UgaXMgdGhlIG9ubHkgb3RoZXIgYmVoYXZpb3IgY3VycmVudGx5XG4gICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oXG4gICAgICAgICAgYFBhY2thZ2UgZGVwZW5kZW5jeSBcIiR7bmFtZX1cIiBhbHJlYWR5IGV4aXN0cyB3aXRoIGEgZGlmZmVyZW50IHNwZWNpZmllci4gYCArXG4gICAgICAgICAgICBgXCIke2V4aXN0aW5nU3BlY2lmaWVyfVwiIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBcIiR7c3BlY2lmaWVyfVwiLmAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBuZXcgZGVwZW5kZW5jeSBpbiBhbHBoYWJldGljYWwgb3JkZXJcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhkZXBlbmRlbmN5U2VjdGlvbik7XG4gICAgICBlbnRyaWVzLnB1c2goW25hbWUsIHNwZWNpZmllcl0pO1xuICAgICAgZW50cmllcy5zb3J0KChhLCBiKSA9PiBhWzBdLmxvY2FsZUNvbXBhcmUoYlswXSkpO1xuICAgICAgbWFuaWZlc3RbdHlwZV0gPSBPYmplY3QuZnJvbUVudHJpZXMoZW50cmllcyk7XG4gICAgfVxuXG4gICAgdHJlZS5vdmVyd3JpdGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShtYW5pZmVzdCwgbnVsbCwgMikpO1xuXG4gICAgY29uc3QgaW5zdGFsbFBhdGhzID0gaW5zdGFsbFRhc2tzLmdldChjb250ZXh0KSA/PyBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBpZiAoXG4gICAgICBpbnN0YWxsID09PSBJbnN0YWxsQmVoYXZpb3IuQWx3YXlzIHx8XG4gICAgICAoaW5zdGFsbCA9PT0gSW5zdGFsbEJlaGF2aW9yLkF1dG8gJiYgIWluc3RhbGxQYXRocy5oYXMocGFja2FnZUpzb25QYXRoKSlcbiAgICApIHtcbiAgICAgIGNvbnRleHQuYWRkVGFzayhcbiAgICAgICAgbmV3IE5vZGVQYWNrYWdlSW5zdGFsbFRhc2soeyB3b3JraW5nRGlyZWN0b3J5OiBwYXRoLmRpcm5hbWUocGFja2FnZUpzb25QYXRoKSB9KSxcbiAgICAgICk7XG4gICAgICBpbnN0YWxsUGF0aHMuYWRkKHBhY2thZ2VKc29uUGF0aCk7XG4gICAgICBpbnN0YWxsVGFza3Muc2V0KGNvbnRleHQsIGluc3RhbGxQYXRocyk7XG4gICAgfVxuICB9O1xufVxuIl19