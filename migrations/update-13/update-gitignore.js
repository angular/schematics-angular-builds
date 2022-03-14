"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
function default_1() {
    return (tree, context) => {
        var _a;
        const gitIgnoreEntry = '/.angular/cache';
        const gitIgnorePath = '.gitignore';
        const contents = (_a = tree.read(gitIgnorePath)) === null || _a === void 0 ? void 0 : _a.toString();
        if (!contents) {
            context.logger.warn(`Could not find '${gitIgnorePath}'.`);
            return;
        }
        if (contents.includes(gitIgnoreEntry)) {
            // The migration has run already.
            return;
        }
        // Try to insert the new entry in the misc section.
        const recorder = tree.beginUpdate(gitIgnorePath);
        let idx = contents.indexOf('# misc');
        if (idx < 0) {
            idx = 0;
        }
        else {
            switch (contents[idx + 6]) {
                case '\n':
                    idx += 7;
                    break;
                case '\r':
                    idx += 8;
                    break;
                default:
                    // the word is something else.
                    idx = 0;
                    break;
            }
        }
        recorder.insertLeft(idx, `${gitIgnoreEntry}\n`);
        tree.commitUpdate(recorder);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWdpdGlnbm9yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xMy91cGRhdGUtZ2l0aWdub3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBSUg7SUFDRSxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFOztRQUN2QixNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQztRQUN6QyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFFbkMsTUFBTSxRQUFRLEdBQUcsTUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQywwQ0FBRSxRQUFRLEVBQUUsQ0FBQztRQUN0RCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLGFBQWEsSUFBSSxDQUFDLENBQUM7WUFFMUQsT0FBTztTQUNSO1FBRUQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFO1lBQ3JDLGlDQUFpQztZQUNqQyxPQUFPO1NBQ1I7UUFFRCxtREFBbUQ7UUFDbkQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3JDLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRTtZQUNYLEdBQUcsR0FBRyxDQUFDLENBQUM7U0FDVDthQUFNO1lBQ0wsUUFBUSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxFQUFFO2dCQUN6QixLQUFLLElBQUk7b0JBQ1AsR0FBRyxJQUFJLENBQUMsQ0FBQztvQkFDVCxNQUFNO2dCQUNSLEtBQUssSUFBSTtvQkFDUCxHQUFHLElBQUksQ0FBQyxDQUFDO29CQUNULE1BQU07Z0JBQ1I7b0JBQ0UsOEJBQThCO29CQUM5QixHQUFHLEdBQUcsQ0FBQyxDQUFDO29CQUNSLE1BQU07YUFDVDtTQUNGO1FBRUQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxjQUFjLElBQUksQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQXhDRCw0QkF3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgUnVsZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gKHRyZWUsIGNvbnRleHQpID0+IHtcbiAgICBjb25zdCBnaXRJZ25vcmVFbnRyeSA9ICcvLmFuZ3VsYXIvY2FjaGUnO1xuICAgIGNvbnN0IGdpdElnbm9yZVBhdGggPSAnLmdpdGlnbm9yZSc7XG5cbiAgICBjb25zdCBjb250ZW50cyA9IHRyZWUucmVhZChnaXRJZ25vcmVQYXRoKT8udG9TdHJpbmcoKTtcbiAgICBpZiAoIWNvbnRlbnRzKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci53YXJuKGBDb3VsZCBub3QgZmluZCAnJHtnaXRJZ25vcmVQYXRofScuYCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY29udGVudHMuaW5jbHVkZXMoZ2l0SWdub3JlRW50cnkpKSB7XG4gICAgICAvLyBUaGUgbWlncmF0aW9uIGhhcyBydW4gYWxyZWFkeS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gaW5zZXJ0IHRoZSBuZXcgZW50cnkgaW4gdGhlIG1pc2Mgc2VjdGlvbi5cbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZ2l0SWdub3JlUGF0aCk7XG4gICAgbGV0IGlkeCA9IGNvbnRlbnRzLmluZGV4T2YoJyMgbWlzYycpO1xuICAgIGlmIChpZHggPCAwKSB7XG4gICAgICBpZHggPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICBzd2l0Y2ggKGNvbnRlbnRzW2lkeCArIDZdKSB7XG4gICAgICAgIGNhc2UgJ1xcbic6XG4gICAgICAgICAgaWR4ICs9IDc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ1xccic6XG4gICAgICAgICAgaWR4ICs9IDg7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgLy8gdGhlIHdvcmQgaXMgc29tZXRoaW5nIGVsc2UuXG4gICAgICAgICAgaWR4ID0gMDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZWNvcmRlci5pbnNlcnRMZWZ0KGlkeCwgYCR7Z2l0SWdub3JlRW50cnl9XFxuYCk7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuICB9O1xufVxuIl19