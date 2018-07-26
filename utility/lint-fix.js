"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const schematics_1 = require("@angular-devkit/schematics");
const tasks_1 = require("@angular-devkit/schematics/tasks");
function applyLintFix(path = '/') {
    return (tree, context) => {
        // Find the closest tsling.json
        let dir = tree.getDir(path.substr(0, path.lastIndexOf('/')));
        do {
            if (dir.subfiles.includes('tslint.json')) {
                break;
            }
            dir = dir.parent;
        } while (dir !== null);
        if (dir === null) {
            throw new schematics_1.SchematicsException('Asked to run lint fixes, but could not find a tslint.json.');
        }
        // Only include files that have been touched.
        const files = tree.actions.reduce((acc, action) => {
            const path = action.path.substr(1); // Remove the starting '/'.
            if (path.endsWith('.ts') && dir && action.path.startsWith(dir.path)) {
                acc.add(path);
            }
            return acc;
        }, new Set());
        context.addTask(new tasks_1.TslintFixTask({
            ignoreErrors: true,
            tsConfigPath: 'tsconfig.json',
            files: [...files],
        }));
    };
}
exports.applyLintFix = applyLintFix;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGludC1maXguanMiLCJzb3VyY2VSb290IjoiLi8iLCJzb3VyY2VzIjpbInBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L2xpbnQtZml4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7OztHQU1HO0FBQ0gsMkRBTW9DO0FBQ3BDLDREQUFpRTtBQUVqRSxzQkFBNkIsSUFBSSxHQUFHLEdBQUc7SUFDckMsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLE9BQXlCLEVBQUUsRUFBRTtRQUMvQywrQkFBK0I7UUFDL0IsSUFBSSxHQUFHLEdBQW9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUUsR0FBRyxDQUFDO1lBQ0YsRUFBRSxDQUFDLENBQUUsR0FBRyxDQUFDLFFBQXFCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsS0FBSyxDQUFDO1lBQ1IsQ0FBQztZQUVELEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQ25CLENBQUMsUUFBUSxHQUFHLEtBQUssSUFBSSxFQUFFO1FBRXZCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyw0REFBNEQsQ0FBQyxDQUFDO1FBQzlGLENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFnQixFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzdELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsMkJBQTJCO1lBQ2hFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEIsQ0FBQztZQUVELE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFDO1FBRXRCLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxxQkFBYSxDQUFDO1lBQ2hDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFlBQVksRUFBRSxlQUFlO1lBQzdCLEtBQUssRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO1NBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWpDRCxvQ0FpQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1xuICBEaXJFbnRyeSxcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgVHNsaW50Rml4VGFzayB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzL3Rhc2tzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5TGludEZpeChwYXRoID0gJy8nKTogUnVsZSB7XG4gIHJldHVybiAodHJlZTogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIC8vIEZpbmQgdGhlIGNsb3Nlc3QgdHNsaW5nLmpzb25cbiAgICBsZXQgZGlyOiBEaXJFbnRyeSB8IG51bGwgPSB0cmVlLmdldERpcihwYXRoLnN1YnN0cigwLCBwYXRoLmxhc3RJbmRleE9mKCcvJykpKTtcblxuICAgIGRvIHtcbiAgICAgIGlmICgoZGlyLnN1YmZpbGVzIGFzIHN0cmluZ1tdKS5pbmNsdWRlcygndHNsaW50Lmpzb24nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgZGlyID0gZGlyLnBhcmVudDtcbiAgICB9IHdoaWxlIChkaXIgIT09IG51bGwpO1xuXG4gICAgaWYgKGRpciA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ0Fza2VkIHRvIHJ1biBsaW50IGZpeGVzLCBidXQgY291bGQgbm90IGZpbmQgYSB0c2xpbnQuanNvbi4nKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGluY2x1ZGUgZmlsZXMgdGhhdCBoYXZlIGJlZW4gdG91Y2hlZC5cbiAgICBjb25zdCBmaWxlcyA9IHRyZWUuYWN0aW9ucy5yZWR1Y2UoKGFjYzogU2V0PHN0cmluZz4sIGFjdGlvbikgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IGFjdGlvbi5wYXRoLnN1YnN0cigxKTsgIC8vIFJlbW92ZSB0aGUgc3RhcnRpbmcgJy8nLlxuICAgICAgaWYgKHBhdGguZW5kc1dpdGgoJy50cycpICYmIGRpciAmJiBhY3Rpb24ucGF0aC5zdGFydHNXaXRoKGRpci5wYXRoKSkge1xuICAgICAgICBhY2MuYWRkKHBhdGgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG5ldyBTZXQ8c3RyaW5nPigpKTtcblxuICAgIGNvbnRleHQuYWRkVGFzayhuZXcgVHNsaW50Rml4VGFzayh7XG4gICAgICBpZ25vcmVFcnJvcnM6IHRydWUsXG4gICAgICB0c0NvbmZpZ1BhdGg6ICd0c2NvbmZpZy5qc29uJyxcbiAgICAgIGZpbGVzOiBbLi4uZmlsZXNdLFxuICAgIH0pKTtcbiAgfTtcbn1cbiJdfQ==