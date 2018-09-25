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
const schematics_1 = require("@angular-devkit/schematics");
const ts = require("typescript");
/**
 * Remove the Reflect import from a polyfill file.
 * @param tree The tree to use.
 * @param path Path of the polyfill file found.
 * @private
 */
function _removeReflectFromPolyfills(tree, path) {
    const source = tree.read(path);
    if (!source) {
        return;
    }
    // Start the update of the file.
    const recorder = tree.beginUpdate(path);
    const sourceFile = ts.createSourceFile(path, source.toString(), ts.ScriptTarget.Latest);
    const imports = sourceFile.statements
        .filter(s => s.kind === ts.SyntaxKind.ImportDeclaration);
    for (const i of imports) {
        const module = i.moduleSpecifier.kind == ts.SyntaxKind.StringLiteral
            && i.moduleSpecifier.text;
        switch (module) {
            case 'core-js/es7/reflect':
                recorder.remove(i.getStart(sourceFile), i.getWidth(sourceFile));
                break;
        }
    }
    tree.commitUpdate(recorder);
}
/**
 * Update a project's target, maybe. Only if it's a builder supported and the options look right.
 * This is a rule factory so we return the new rule (or noop if we don't support doing the change).
 * @param root The root of the project source.
 * @param targetObject The target information.
 * @private
 */
function _updateProjectTarget(root, targetObject) {
    // Make sure we're using the correct builder.
    if (targetObject.builder !== '@angular-devkit/build-angular:browser'
        || !core_1.json.isJsonObject(targetObject.options)) {
        return schematics_1.noop();
    }
    const options = targetObject.options;
    if (typeof options.polyfills != 'string') {
        return schematics_1.noop();
    }
    const polyfillsToUpdate = [`${root}/${options.polyfills}`];
    const configurations = targetObject.configurations;
    if (core_1.json.isJsonObject(configurations)) {
        for (const configName of Object.keys(configurations)) {
            const config = configurations[configName];
            // Just in case, only do non-AOT configurations.
            if (core_1.json.isJsonObject(config)
                && typeof config.polyfills == 'string'
                && config.aot !== true) {
                polyfillsToUpdate.push(`${root}/${config.polyfills}`);
            }
        }
    }
    return schematics_1.chain(polyfillsToUpdate.map(polyfillPath => {
        return (tree) => _removeReflectFromPolyfills(tree, polyfillPath);
    }));
}
/**
 * Move the import reflect metadata polyfill from the polyfill file to the dev environment. This is
 * not guaranteed to work, but if it doesn't it will result in no changes made.
 */
function polyfillMetadataRule() {
    return (tree) => {
        // Simple. Take the ast of polyfills (if it exists) and find the import metadata. Remove it.
        const angularConfigContent = tree.read('angular.json') || tree.read('.angular.json');
        const rules = [];
        if (!angularConfigContent) {
            // Is this even an angular project?
            return;
        }
        const angularJson = core_1.json.parseJson(angularConfigContent.toString(), core_1.json.JsonParseMode.Loose);
        if (!core_1.json.isJsonObject(angularJson) || !core_1.json.isJsonObject(angularJson.projects)) {
            // If that field isn't there, no use...
            return;
        }
        // For all projects, for all targets, read the polyfill field, and read the environment.
        for (const projectName of Object.keys(angularJson.projects)) {
            const project = angularJson.projects[projectName];
            if (!core_1.json.isJsonObject(project)) {
                continue;
            }
            if (typeof project.root != 'string') {
                continue;
            }
            const targets = project.targets || project.architect;
            if (!core_1.json.isJsonObject(targets)) {
                continue;
            }
            for (const targetName of Object.keys(targets)) {
                const target = targets[targetName];
                if (core_1.json.isJsonObject(target)) {
                    rules.push(_updateProjectTarget(project.root, target));
                }
            }
        }
        // Remove null or undefined rules.
        return schematics_1.chain(rules);
    };
}
exports.polyfillMetadataRule = polyfillMetadataRule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGwtbWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS03L3BvbHlmaWxsLW1ldGFkYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQTRDO0FBQzVDLDJEQUFxRTtBQUNyRSxpQ0FBaUM7QUFHakM7Ozs7O0dBS0c7QUFDSCxTQUFTLDJCQUEyQixDQUFDLElBQVUsRUFBRSxJQUFZO0lBQzNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE9BQU87S0FDUjtJQUVELGdDQUFnQztJQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXhDLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEYsTUFBTSxPQUFPLEdBQ1gsVUFBVSxDQUFDLFVBQVU7U0FDbEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUMxRCxDQUFDO0lBRUYsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUU7UUFDdkIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO2VBQzlELENBQUMsQ0FBQyxlQUFvQyxDQUFDLElBQUksQ0FBQztRQUVsRCxRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUsscUJBQXFCO2dCQUN4QixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMs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RCxJQUFJLE9BQU8sT0FBTyxDQUFDLElBQUksSUFBSSxRQUFRLEVBQUU7Z0JBQ25DLFNBQVM7YUFDVjtZQUVELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNyRCxJQUFJLENBQUMsV0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDL0IsU0FBUzthQUNWO1lBRUQsS0FBSyxNQUFNLFVBQVUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM3QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ25DLElBQUksV0FBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7aUJBQ3hEO2FBQ0Y7U0FDRjtRQUVELGtDQUFrQztRQUNsQyxPQUFPLGtCQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVDRCxvREE0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBqc29uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgUnVsZSwgVHJlZSwgY2hhaW4sIG5vb3AgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuXG4vKipcbiAqIFJlbW92ZSB0aGUgUmVmbGVjdCBpbXBvcnQgZnJvbSBhIHBvbHlmaWxsIGZpbGUuXG4gKiBAcGFyYW0gdHJlZSBUaGUgdHJlZSB0byB1c2UuXG4gKiBAcGFyYW0gcGF0aCBQYXRoIG9mIHRoZSBwb2x5ZmlsbCBmaWxlIGZvdW5kLlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gX3JlbW92ZVJlZmxlY3RGcm9tUG9seWZpbGxzKHRyZWU6IFRyZWUsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCBzb3VyY2UgPSB0cmVlLnJlYWQocGF0aCk7XG4gIGlmICghc291cmNlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gU3RhcnQgdGhlIHVwZGF0ZSBvZiB0aGUgZmlsZS5cbiAgY29uc3QgcmVjb3JkZXIgPSB0cmVlLmJlZ2luVXBkYXRlKHBhdGgpO1xuXG4gIGNvbnN0IHNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKHBhdGgsIHNvdXJjZS50b1N0cmluZygpLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcbiAgY29uc3QgaW1wb3J0cyA9IChcbiAgICBzb3VyY2VGaWxlLnN0YXRlbWVudHNcbiAgICAgIC5maWx0ZXIocyA9PiBzLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24pIGFzIHRzLkltcG9ydERlY2xhcmF0aW9uW11cbiAgKTtcblxuICBmb3IgKGNvbnN0IGkgb2YgaW1wb3J0cykge1xuICAgIGNvbnN0IG1vZHVsZSA9IGkubW9kdWxlU3BlY2lmaWVyLmtpbmQgPT0gdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsXG4gICAgICAmJiAoaS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcblxuICAgIHN3aXRjaCAobW9kdWxlKSB7XG4gICAgICBjYXNlICdjb3JlLWpzL2VzNy9yZWZsZWN0JzpcbiAgICAgICAgcmVjb3JkZXIucmVtb3ZlKGkuZ2V0U3RhcnQoc291cmNlRmlsZSksIGkuZ2V0V2lkdGgoc291cmNlRmlsZSkpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG59XG5cbi8qKlxuICogVXBkYXRlIGEgcHJvamVjdCdzIHRhcmdldCwgbWF5YmUuIE9ubHkgaWYgaXQncyBhIGJ1aWxkZXIgc3VwcG9ydGVkIGFuZCB0aGUgb3B0aW9ucyBsb29rIHJpZ2h0LlxuICogVGhpcyBpcyBhIHJ1bGUgZmFjdG9yeSBzbyB3ZSByZXR1cm4gdGhlIG5ldyBydWxlIChvciBub29wIGlmIHdlIGRvbid0IHN1cHBvcnQgZG9pbmcgdGhlIGNoYW5nZSkuXG4gKiBAcGFyYW0gcm9vdCBUaGUgcm9vdCBvZiB0aGUgcHJvamVjdCBzb3VyY2UuXG4gKiBAcGFyYW0gdGFyZ2V0T2JqZWN0IFRoZSB0YXJnZXQgaW5mb3JtYXRpb24uXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfdXBkYXRlUHJvamVjdFRhcmdldChyb290OiBzdHJpbmcsIHRhcmdldE9iamVjdDoganNvbi5Kc29uT2JqZWN0KTogUnVsZSB7XG4gIC8vIE1ha2Ugc3VyZSB3ZSdyZSB1c2luZyB0aGUgY29ycmVjdCBidWlsZGVyLlxuICBpZiAodGFyZ2V0T2JqZWN0LmJ1aWxkZXIgIT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpicm93c2VyJ1xuICAgICAgfHwgIWpzb24uaXNKc29uT2JqZWN0KHRhcmdldE9iamVjdC5vcHRpb25zKSkge1xuICAgIHJldHVybiBub29wKCk7XG4gIH1cbiAgY29uc3Qgb3B0aW9ucyA9IHRhcmdldE9iamVjdC5vcHRpb25zO1xuICBpZiAodHlwZW9mIG9wdGlvbnMucG9seWZpbGxzICE9ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG5vb3AoKTtcbiAgfVxuXG4gIGNvbnN0IHBvbHlmaWxsc1RvVXBkYXRlID0gW2Ake3Jvb3R9LyR7b3B0aW9ucy5wb2x5ZmlsbHN9YF07XG4gIGNvbnN0IGNvbmZpZ3VyYXRpb25zID0gdGFyZ2V0T2JqZWN0LmNvbmZpZ3VyYXRpb25zO1xuICBpZiAoanNvbi5pc0pzb25PYmplY3QoY29uZmlndXJhdGlvbnMpKSB7XG4gICAgZm9yIChjb25zdCBjb25maWdOYW1lIG9mIE9iamVjdC5rZXlzKGNvbmZpZ3VyYXRpb25zKSkge1xuICAgICAgY29uc3QgY29uZmlnID0gY29uZmlndXJhdGlvbnNbY29uZmlnTmFtZV07XG5cbiAgICAgIC8vIEp1c3QgaW4gY2FzZSwgb25seSBkbyBub24tQU9UIGNvbmZpZ3VyYXRpb25zLlxuICAgICAgaWYgKGpzb24uaXNKc29uT2JqZWN0KGNvbmZpZylcbiAgICAgICAgICAmJiB0eXBlb2YgY29uZmlnLnBvbHlmaWxscyA9PSAnc3RyaW5nJ1xuICAgICAgICAgICYmIGNvbmZpZy5hb3QgIT09IHRydWUpIHtcbiAgICAgICAgcG9seWZpbGxzVG9VcGRhdGUucHVzaChgJHtyb290fS8ke2NvbmZpZy5wb2x5ZmlsbHN9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNoYWluKFxuICAgIHBvbHlmaWxsc1RvVXBkYXRlLm1hcChwb2x5ZmlsbFBhdGggPT4ge1xuICAgICAgcmV0dXJuICh0cmVlOiBUcmVlKSA9PiBfcmVtb3ZlUmVmbGVjdEZyb21Qb2x5ZmlsbHModHJlZSwgcG9seWZpbGxQYXRoKTtcbiAgICB9KSxcbiAgKTtcbn1cblxuLyoqXG4gKiBNb3ZlIHRoZSBpbXBvcnQgcmVmbGVjdCBtZXRhZGF0YSBwb2x5ZmlsbCBmcm9tIHRoZSBwb2x5ZmlsbCBmaWxlIHRvIHRoZSBkZXYgZW52aXJvbm1lbnQuIFRoaXMgaXNcbiAqIG5vdCBndWFyYW50ZWVkIHRvIHdvcmssIGJ1dCBpZiBpdCBkb2Vzbid0IGl0IHdpbGwgcmVzdWx0IGluIG5vIGNoYW5nZXMgbWFkZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvbHlmaWxsTWV0YWRhdGFSdWxlKCk6IFJ1bGUge1xuICByZXR1cm4gKHRyZWUpID0+IHtcbiAgICAvLyBTaW1wbGUuIFRha2UgdGhlIGFzdCBvZiBwb2x5ZmlsbHMgKGlmIGl0IGV4aXN0cykgYW5kIGZpbmQgdGhlIGltcG9ydCBtZXRhZGF0YS4gUmVtb3ZlIGl0LlxuICAgIGNvbnN0IGFuZ3VsYXJDb25maWdDb250ZW50ID0gdHJlZS5yZWFkKCdhbmd1bGFyLmpzb24nKSB8fCB0cmVlLnJlYWQoJy5hbmd1bGFyLmpzb24nKTtcbiAgICBjb25zdCBydWxlczogUnVsZVtdID0gW107XG5cbiAgICBpZiAoIWFuZ3VsYXJDb25maWdDb250ZW50KSB7XG4gICAgICAvLyBJcyB0aGlzIGV2ZW4gYW4gYW5ndWxhciBwcm9qZWN0P1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFuZ3VsYXJKc29uID0ganNvbi5wYXJzZUpzb24oYW5ndWxhckNvbmZpZ0NvbnRlbnQudG9TdHJpbmcoKSwganNvbi5Kc29uUGFyc2VNb2RlLkxvb3NlKTtcblxuICAgIGlmICghanNvbi5pc0pzb25PYmplY3QoYW5ndWxhckpzb24pIHx8ICFqc29uLmlzSnNvbk9iamVjdChhbmd1bGFySnNvbi5wcm9qZWN0cykpIHtcbiAgICAgIC8vIElmIHRoYXQgZmllbGQgaXNuJ3QgdGhlcmUsIG5vIHVzZS4uLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEZvciBhbGwgcHJvamVjdHMsIGZvciBhbGwgdGFyZ2V0cywgcmVhZCB0aGUgcG9seWZpbGwgZmllbGQsIGFuZCByZWFkIHRoZSBlbnZpcm9ubWVudC5cbiAgICBmb3IgKGNvbnN0IHByb2plY3ROYW1lIG9mIE9iamVjdC5rZXlzKGFuZ3VsYXJKc29uLnByb2plY3RzKSkge1xuICAgICAgY29uc3QgcHJvamVjdCA9IGFuZ3VsYXJKc29uLnByb2plY3RzW3Byb2plY3ROYW1lXTtcbiAgICAgIGlmICghanNvbi5pc0pzb25PYmplY3QocHJvamVjdCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHByb2plY3Qucm9vdCAhPSAnc3RyaW5nJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGFyZ2V0cyA9IHByb2plY3QudGFyZ2V0cyB8fCBwcm9qZWN0LmFyY2hpdGVjdDtcbiAgICAgIGlmICghanNvbi5pc0pzb25PYmplY3QodGFyZ2V0cykpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgdGFyZ2V0TmFtZSBvZiBPYmplY3Qua2V5cyh0YXJnZXRzKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSB0YXJnZXRzW3RhcmdldE5hbWVdO1xuICAgICAgICBpZiAoanNvbi5pc0pzb25PYmplY3QodGFyZ2V0KSkge1xuICAgICAgICAgIHJ1bGVzLnB1c2goX3VwZGF0ZVByb2plY3RUYXJnZXQocHJvamVjdC5yb290LCB0YXJnZXQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBudWxsIG9yIHVuZGVmaW5lZCBydWxlcy5cbiAgICByZXR1cm4gY2hhaW4ocnVsZXMpO1xuICB9O1xufVxuIl19