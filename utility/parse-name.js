"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// import { relative, Path } from "../../../angular_devkit/core/src/virtual-fs";
const core_1 = require("@angular-devkit/core");
function parseName(path, name) {
    const nameWithoutPath = core_1.basename(name);
    const namePath = core_1.dirname((path + '/' + name));
    return {
        name: nameWithoutPath,
        path: core_1.normalize('/' + namePath),
    };
}
exports.parseName = parseName;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtbmFtZS5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvcGFyc2UtbmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBOzs7Ozs7R0FNRztBQUNILGdGQUFnRjtBQUNoRiwrQ0FBMEU7QUFPMUUsbUJBQTBCLElBQVksRUFBRSxJQUFZO0lBQ2xELE1BQU0sZUFBZSxHQUFHLGVBQVEsQ0FBQyxJQUFZLENBQUMsQ0FBQztJQUMvQyxNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBUyxDQUFDLENBQUM7SUFFdEQsT0FBTztRQUNMLElBQUksRUFBRSxlQUFlO1FBQ3JCLElBQUksRUFBRSxnQkFBUyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUM7S0FDaEMsQ0FBQztBQUNKLENBQUM7QUFSRCw4QkFRQyIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuLy8gaW1wb3J0IHsgcmVsYXRpdmUsIFBhdGggfSBmcm9tIFwiLi4vLi4vLi4vYW5ndWxhcl9kZXZraXQvY29yZS9zcmMvdmlydHVhbC1mc1wiO1xuaW1wb3J0IHsgUGF0aCwgYmFzZW5hbWUsIGRpcm5hbWUsIG5vcm1hbGl6ZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBMb2NhdGlvbiB7XG4gIG5hbWU6IHN0cmluZztcbiAgcGF0aDogUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTmFtZShwYXRoOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IExvY2F0aW9uIHtcbiAgY29uc3QgbmFtZVdpdGhvdXRQYXRoID0gYmFzZW5hbWUobmFtZSBhcyBQYXRoKTtcbiAgY29uc3QgbmFtZVBhdGggPSBkaXJuYW1lKChwYXRoICsgJy8nICsgbmFtZSkgYXMgUGF0aCk7XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lV2l0aG91dFBhdGgsXG4gICAgcGF0aDogbm9ybWFsaXplKCcvJyArIG5hbWVQYXRoKSxcbiAgfTtcbn1cbiJdfQ==