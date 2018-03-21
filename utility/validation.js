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
function validateName(name) {
    if (name && /^\d/.test(name)) {
        throw new schematics_1.SchematicsException(core_1.tags.oneLine `name (${name})
        can not start with a digit.`);
    }
}
exports.validateName = validateName;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUM1QywyREFBaUU7QUFFakUsc0JBQTZCLElBQVk7SUFDdkMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBLFNBQVMsSUFBSTtvQ0FDdkIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7QUFDSCxDQUFDO0FBTEQsb0NBS0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgeyB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgU2NoZW1hdGljc0V4Y2VwdGlvbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlTmFtZShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKG5hbWUgJiYgL15cXGQvLnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbih0YWdzLm9uZUxpbmVgbmFtZSAoJHtuYW1lfSlcbiAgICAgICAgY2FuIG5vdCBzdGFydCB3aXRoIGEgZGlnaXQuYCk7XG4gIH1cbn1cbiJdfQ==