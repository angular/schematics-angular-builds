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
function _updateProjectTarget(targetObject) {
    // Make sure we're using the correct builder.
    if (targetObject.builder !== '@angular-devkit/build-angular:browser'
        || !core_1.json.isJsonObject(targetObject.options)) {
        return schematics_1.noop();
    }
    const options = targetObject.options;
    if (typeof options.polyfills != 'string') {
        return schematics_1.noop();
    }
    const polyfillsToUpdate = [options.polyfills];
    const configurations = targetObject.configurations;
    if (core_1.json.isJsonObject(configurations)) {
        for (const configName of Object.keys(configurations)) {
            const config = configurations[configName];
            // Just in case, only do non-AOT configurations.
            if (core_1.json.isJsonObject(config)
                && typeof config.polyfills == 'string'
                && config.aot !== true) {
                polyfillsToUpdate.push(config.polyfills);
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
                    rules.push(_updateProjectTarget(target));
                }
            }
        }
        // Remove null or undefined rules.
        return schematics_1.chain(rules);
    };
}
exports.polyfillMetadataRule = polyfillMetadataRule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGwtbWV0YWRhdGEuanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS03L3BvbHlmaWxsLW1ldGFkYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsK0NBQTRDO0FBQzVDLDJEQUFxRTtBQUNyRSxpQ0FBaUM7QUFHakM7Ozs7O0dBS0c7QUFDSCxTQUFTLDJCQUEyQixDQUFDLElBQVUsRUFBRSxJQUFZO0lBQzNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUNYLE9BQU87S0FDUjtJQUVELGdDQUFnQztJQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXhDLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEYsTUFBTSxPQUFPLEdBQ1gsVUFBVSxDQUFDLFVBQVU7U0FDbEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUMxRCxDQUFDO0lBRUYsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUU7UUFDdkIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhO2VBQzlELENBQUMsQ0FBQyxlQUFvQyxDQUFDLElBQUksQ0FBQztRQUVsRCxRQUFRLE1BQU0sRUFBRTtZQUNkLEtBQUsscUJBQXFCO2dCQUN4QixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMs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QUFTO2FBQ1Y7WUFFRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDckQsSUFBSSxDQUFDLFdBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQy9CLFNBQVM7YUFDVjtZQUVELEtBQUssTUFBTSxVQUFVLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDN0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLFdBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztpQkFDMUM7YUFDRjtTQUNGO1FBRUQsa0NBQWtDO1FBQ2xDLE9BQU8sa0JBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUM7QUFDSixDQUFDO0FBNUNELG9EQTRDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IGpzb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBSdWxlLCBUcmVlLCBjaGFpbiwgbm9vcCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5cbi8qKlxuICogUmVtb3ZlIHRoZSBSZWZsZWN0IGltcG9ydCBmcm9tIGEgcG9seWZpbGwgZmlsZS5cbiAqIEBwYXJhbSB0cmVlIFRoZSB0cmVlIHRvIHVzZS5cbiAqIEBwYXJhbSBwYXRoIFBhdGggb2YgdGhlIHBvbHlmaWxsIGZpbGUgZm91bmQuXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBfcmVtb3ZlUmVmbGVjdEZyb21Qb2x5ZmlsbHModHJlZTogVHJlZSwgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHNvdXJjZSA9IHRyZWUucmVhZChwYXRoKTtcbiAgaWYgKCFzb3VyY2UpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBTdGFydCB0aGUgdXBkYXRlIG9mIHRoZSBmaWxlLlxuICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUocGF0aCk7XG5cbiAgY29uc3Qgc291cmNlRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUocGF0aCwgc291cmNlLnRvU3RyaW5nKCksIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuICBjb25zdCBpbXBvcnRzID0gKFxuICAgIHNvdXJjZUZpbGUuc3RhdGVtZW50c1xuICAgICAgLmZpbHRlcihzID0+IHMua2luZCA9PT0gdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbikgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb25bXVxuICApO1xuXG4gIGZvciAoY29uc3QgaSBvZiBpbXBvcnRzKSB7XG4gICAgY29uc3QgbW9kdWxlID0gaS5tb2R1bGVTcGVjaWZpZXIua2luZCA9PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWxcbiAgICAgICYmIChpLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuXG4gICAgc3dpdGNoIChtb2R1bGUpIHtcbiAgICAgIGNhc2UgJ2NvcmUtanMvZXM3L3JlZmxlY3QnOlxuICAgICAgICByZWNvcmRlci5yZW1vdmUoaS5nZXRTdGFydChzb3VyY2VGaWxlKSwgaS5nZXRXaWR0aChzb3VyY2VGaWxlKSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYSBwcm9qZWN0J3MgdGFyZ2V0LCBtYXliZS4gT25seSBpZiBpdCdzIGEgYnVpbGRlciBzdXBwb3J0ZWQgYW5kIHRoZSBvcHRpb25zIGxvb2sgcmlnaHQuXG4gKiBUaGlzIGlzIGEgcnVsZSBmYWN0b3J5IHNvIHdlIHJldHVybiB0aGUgbmV3IHJ1bGUgKG9yIG5vb3AgaWYgd2UgZG9uJ3Qgc3VwcG9ydCBkb2luZyB0aGUgY2hhbmdlKS5cbiAqIEBwYXJhbSByb290IFRoZSByb290IG9mIHRoZSBwcm9qZWN0IHNvdXJjZS5cbiAqIEBwYXJhbSB0YXJnZXRPYmplY3QgVGhlIHRhcmdldCBpbmZvcm1hdGlvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIF91cGRhdGVQcm9qZWN0VGFyZ2V0KHRhcmdldE9iamVjdDoganNvbi5Kc29uT2JqZWN0KTogUnVsZSB7XG4gIC8vIE1ha2Ugc3VyZSB3ZSdyZSB1c2luZyB0aGUgY29ycmVjdCBidWlsZGVyLlxuICBpZiAodGFyZ2V0T2JqZWN0LmJ1aWxkZXIgIT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpicm93c2VyJ1xuICAgICAgfHwgIWpzb24uaXNKc29uT2JqZWN0KHRhcmdldE9iamVjdC5vcHRpb25zKSkge1xuICAgIHJldHVybiBub29wKCk7XG4gIH1cbiAgY29uc3Qgb3B0aW9ucyA9IHRhcmdldE9iamVjdC5vcHRpb25zO1xuICBpZiAodHlwZW9mIG9wdGlvbnMucG9seWZpbGxzICE9ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIG5vb3AoKTtcbiAgfVxuXG4gIGNvbnN0IHBvbHlmaWxsc1RvVXBkYXRlID0gW29wdGlvbnMucG9seWZpbGxzXTtcbiAgY29uc3QgY29uZmlndXJhdGlvbnMgPSB0YXJnZXRPYmplY3QuY29uZmlndXJhdGlvbnM7XG4gIGlmIChqc29uLmlzSnNvbk9iamVjdChjb25maWd1cmF0aW9ucykpIHtcbiAgICBmb3IgKGNvbnN0IGNvbmZpZ05hbWUgb2YgT2JqZWN0LmtleXMoY29uZmlndXJhdGlvbnMpKSB7XG4gICAgICBjb25zdCBjb25maWcgPSBjb25maWd1cmF0aW9uc1tjb25maWdOYW1lXTtcblxuICAgICAgLy8gSnVzdCBpbiBjYXNlLCBvbmx5IGRvIG5vbi1BT1QgY29uZmlndXJhdGlvbnMuXG4gICAgICBpZiAoanNvbi5pc0pzb25PYmplY3QoY29uZmlnKVxuICAgICAgICAgICYmIHR5cGVvZiBjb25maWcucG9seWZpbGxzID09ICdzdHJpbmcnXG4gICAgICAgICAgJiYgY29uZmlnLmFvdCAhPT0gdHJ1ZSkge1xuICAgICAgICBwb2x5ZmlsbHNUb1VwZGF0ZS5wdXNoKGNvbmZpZy5wb2x5ZmlsbHMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjaGFpbihcbiAgICBwb2x5ZmlsbHNUb1VwZGF0ZS5tYXAocG9seWZpbGxQYXRoID0+IHtcbiAgICAgIHJldHVybiAodHJlZTogVHJlZSkgPT4gX3JlbW92ZVJlZmxlY3RGcm9tUG9seWZpbGxzKHRyZWUsIHBvbHlmaWxsUGF0aCk7XG4gICAgfSksXG4gICk7XG59XG5cbi8qKlxuICogTW92ZSB0aGUgaW1wb3J0IHJlZmxlY3QgbWV0YWRhdGEgcG9seWZpbGwgZnJvbSB0aGUgcG9seWZpbGwgZmlsZSB0byB0aGUgZGV2IGVudmlyb25tZW50LiBUaGlzIGlzXG4gKiBub3QgZ3VhcmFudGVlZCB0byB3b3JrLCBidXQgaWYgaXQgZG9lc24ndCBpdCB3aWxsIHJlc3VsdCBpbiBubyBjaGFuZ2VzIG1hZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb2x5ZmlsbE1ldGFkYXRhUnVsZSgpOiBSdWxlIHtcbiAgcmV0dXJuICh0cmVlKSA9PiB7XG4gICAgLy8gU2ltcGxlLiBUYWtlIHRoZSBhc3Qgb2YgcG9seWZpbGxzIChpZiBpdCBleGlzdHMpIGFuZCBmaW5kIHRoZSBpbXBvcnQgbWV0YWRhdGEuIFJlbW92ZSBpdC5cbiAgICBjb25zdCBhbmd1bGFyQ29uZmlnQ29udGVudCA9IHRyZWUucmVhZCgnYW5ndWxhci5qc29uJykgfHwgdHJlZS5yZWFkKCcuYW5ndWxhci5qc29uJyk7XG4gICAgY29uc3QgcnVsZXM6IFJ1bGVbXSA9IFtdO1xuXG4gICAgaWYgKCFhbmd1bGFyQ29uZmlnQ29udGVudCkge1xuICAgICAgLy8gSXMgdGhpcyBldmVuIGFuIGFuZ3VsYXIgcHJvamVjdD9cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbmd1bGFySnNvbiA9IGpzb24ucGFyc2VKc29uKGFuZ3VsYXJDb25maWdDb250ZW50LnRvU3RyaW5nKCksIGpzb24uSnNvblBhcnNlTW9kZS5Mb29zZSk7XG5cbiAgICBpZiAoIWpzb24uaXNKc29uT2JqZWN0KGFuZ3VsYXJKc29uKSB8fCAhanNvbi5pc0pzb25PYmplY3QoYW5ndWxhckpzb24ucHJvamVjdHMpKSB7XG4gICAgICAvLyBJZiB0aGF0IGZpZWxkIGlzbid0IHRoZXJlLCBubyB1c2UuLi5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGb3IgYWxsIHByb2plY3RzLCBmb3IgYWxsIHRhcmdldHMsIHJlYWQgdGhlIHBvbHlmaWxsIGZpZWxkLCBhbmQgcmVhZCB0aGUgZW52aXJvbm1lbnQuXG4gICAgZm9yIChjb25zdCBwcm9qZWN0TmFtZSBvZiBPYmplY3Qua2V5cyhhbmd1bGFySnNvbi5wcm9qZWN0cykpIHtcbiAgICAgIGNvbnN0IHByb2plY3QgPSBhbmd1bGFySnNvbi5wcm9qZWN0c1twcm9qZWN0TmFtZV07XG4gICAgICBpZiAoIWpzb24uaXNKc29uT2JqZWN0KHByb2plY3QpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBwcm9qZWN0LnJvb3QgIT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRhcmdldHMgPSBwcm9qZWN0LnRhcmdldHMgfHwgcHJvamVjdC5hcmNoaXRlY3Q7XG4gICAgICBpZiAoIWpzb24uaXNKc29uT2JqZWN0KHRhcmdldHMpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHRhcmdldE5hbWUgb2YgT2JqZWN0LmtleXModGFyZ2V0cykpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGFyZ2V0c1t0YXJnZXROYW1lXTtcbiAgICAgICAgaWYgKGpzb24uaXNKc29uT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgICBydWxlcy5wdXNoKF91cGRhdGVQcm9qZWN0VGFyZ2V0KHRhcmdldCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIG51bGwgb3IgdW5kZWZpbmVkIHJ1bGVzLlxuICAgIHJldHVybiBjaGFpbihydWxlcyk7XG4gIH07XG59XG4iXX0=