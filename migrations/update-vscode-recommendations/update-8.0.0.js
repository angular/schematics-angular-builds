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
const ast_utils_1 = require("./ast-utils");
function default_1() {
    return schematics_1.chain([addExtensionRecommendations]);
}
exports.default = default_1;
const addExtensionRecommendations = ast_utils_1.updateJsonInTree('.vscode/extensions.json', (json) => {
    [
        'angular.ng-template',
        'nrwl.angular-console',
        'ms-vscode.vscode-typescript-tslint-plugin',
        'Mikael.Angular-BeastCode',
        'EditorConfig.EditorConfig',
        'msjsdiag.debugger-for-chrome',
        'eg2.vscode-npm-script',
        'PKief.material-icon-theme',
        'natewallace.angular2-inline'
    ].forEach(extension => {
        json.recommendations = json.recommendations || [];
        if (!json.recommendations.includes(extension)) {
            json.recommendations.push(extension);
        }
    });
    return json;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLTguMC4wLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvbWlncmF0aW9ucy91cGRhdGUtdnNjb2RlLXJlY29tbWVuZGF0aW9ucy91cGRhdGUtOC4wLjAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0dBTUc7QUFDSCwyREFBeUQ7QUFDekQsMkNBQStDO0FBRS9DO0lBQ0UsT0FBTyxrQkFBSyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFGRCw0QkFFQztBQUVELE1BQU0sMkJBQTJCLEdBQUcsNEJBQWdCLENBQ2xELHlCQUF5QixFQUN6QixDQUFDLElBQW9DLEVBQUUsRUFBRTtJQUN2QztRQUNFLHFCQUFxQjtRQUNyQixzQkFBc0I7UUFDdEIsMkNBQTJDO1FBQzNDLDBCQUEwQjtRQUMxQiwyQkFBMkI7UUFDM0IsOEJBQThCO1FBQzlCLHVCQUF1QjtRQUN2QiwyQkFBMkI7UUFDM0IsNkJBQTZCO0tBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDakQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxJQUFJLEVBQUUsQ0FBQztRQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDdEM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVMLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyBSdWxlLCBjaGFpbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IHVwZGF0ZUpzb25JblRyZWUgfSBmcm9tICcuL2FzdC11dGlscyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uICgpOiBSdWxlIHtcbiAgcmV0dXJuIGNoYWluKFthZGRFeHRlbnNpb25SZWNvbW1lbmRhdGlvbnNdKTtcbn1cblxuY29uc3QgYWRkRXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zID0gdXBkYXRlSnNvbkluVHJlZShcbiAgJy52c2NvZGUvZXh0ZW5zaW9ucy5qc29uJyxcbiAgKGpzb246IHsgcmVjb21tZW5kYXRpb25zPzogc3RyaW5nW10gfSkgPT4ge1xuICAgIFtcbiAgICAgICdhbmd1bGFyLm5nLXRlbXBsYXRlJyxcbiAgICAgICducndsLmFuZ3VsYXItY29uc29sZScsXG4gICAgICAnbXMtdnNjb2RlLnZzY29kZS10eXBlc2NyaXB0LXRzbGludC1wbHVnaW4nLFxuICAgICAgJ01pa2FlbC5Bbmd1bGFyLUJlYXN0Q29kZScsXG4gICAgICAnRWRpdG9yQ29uZmlnLkVkaXRvckNvbmZpZycsXG4gICAgICAnbXNqc2RpYWcuZGVidWdnZXItZm9yLWNocm9tZScsXG4gICAgICAnZWcyLnZzY29kZS1ucG0tc2NyaXB0JyxcbiAgICAgICdQS2llZi5tYXRlcmlhbC1pY29uLXRoZW1lJyxcbiAgICAgICduYXRld2FsbGFjZS5hbmd1bGFyMi1pbmxpbmUnXS5mb3JFYWNoKGV4dGVuc2lvbiA9PiB7XG4gICAgICAgIGpzb24ucmVjb21tZW5kYXRpb25zID0ganNvbi5yZWNvbW1lbmRhdGlvbnMgfHwgW107XG4gICAgICAgIGlmICghanNvbi5yZWNvbW1lbmRhdGlvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xuICAgICAgICAgIGpzb24ucmVjb21tZW5kYXRpb25zLnB1c2goZXh0ZW5zaW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICByZXR1cm4ganNvbjtcbiAgfSxcbik7XG4iXX0=