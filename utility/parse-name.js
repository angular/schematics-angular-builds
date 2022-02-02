"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseName = void 0;
// import { relative, Path } from "../../../angular_devkit/core/src/virtual-fs";
const core_1 = require("@angular-devkit/core");
function parseName(path, name) {
    const nameWithoutPath = (0, core_1.basename)((0, core_1.normalize)(name));
    const namePath = (0, core_1.dirname)((0, core_1.join)((0, core_1.normalize)(path), name));
    return {
        name: nameWithoutPath,
        path: (0, core_1.normalize)('/' + namePath),
    };
}
exports.parseName = parseName;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtbmFtZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3BhcnNlLW5hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsZ0ZBQWdGO0FBQ2hGLCtDQUFnRjtBQU9oRixTQUFnQixTQUFTLENBQUMsSUFBWSxFQUFFLElBQVk7SUFDbEQsTUFBTSxlQUFlLEdBQUcsSUFBQSxlQUFRLEVBQUMsSUFBQSxnQkFBUyxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBQSxjQUFPLEVBQUMsSUFBQSxXQUFJLEVBQUMsSUFBQSxnQkFBUyxFQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFdEQsT0FBTztRQUNMLElBQUksRUFBRSxlQUFlO1FBQ3JCLElBQUksRUFBRSxJQUFBLGdCQUFTLEVBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQztLQUNoQyxDQUFDO0FBQ0osQ0FBQztBQVJELDhCQVFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIGltcG9ydCB7IHJlbGF0aXZlLCBQYXRoIH0gZnJvbSBcIi4uLy4uLy4uL2FuZ3VsYXJfZGV2a2l0L2NvcmUvc3JjL3ZpcnR1YWwtZnNcIjtcbmltcG9ydCB7IFBhdGgsIGJhc2VuYW1lLCBkaXJuYW1lLCBqb2luLCBub3JtYWxpemUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYXRpb24ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhdGg6IFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU5hbWUocGF0aDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBMb2NhdGlvbiB7XG4gIGNvbnN0IG5hbWVXaXRob3V0UGF0aCA9IGJhc2VuYW1lKG5vcm1hbGl6ZShuYW1lKSk7XG4gIGNvbnN0IG5hbWVQYXRoID0gZGlybmFtZShqb2luKG5vcm1hbGl6ZShwYXRoKSwgbmFtZSkpO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogbmFtZVdpdGhvdXRQYXRoLFxuICAgIHBhdGg6IG5vcm1hbGl6ZSgnLycgKyBuYW1lUGF0aCksXG4gIH07XG59XG4iXX0=