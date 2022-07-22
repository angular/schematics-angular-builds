"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHtmlSelector = exports.htmlSelectorRe = void 0;
const schematics_1 = require("@angular-devkit/schematics");
// Must start with a letter, and must contain only alphanumeric characters or dashes.
// When adding a dash the segment after the dash must also start with a letter.
exports.htmlSelectorRe = /^[a-zA-Z][.0-9a-zA-Z]*(:?-[a-zA-Z][.0-9a-zA-Z]*)*$/;
function validateHtmlSelector(selector) {
    if (selector && !exports.htmlSelectorRe.test(selector)) {
        throw new schematics_1.SchematicsException(`Selector (${selector}) is invalid.`);
    }
}
exports.validateHtmlSelector = validateHtmlSelector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci91dGlsaXR5L3ZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUgsMkRBQWlFO0FBRWpFLHFGQUFxRjtBQUNyRiwrRUFBK0U7QUFDbEUsUUFBQSxjQUFjLEdBQUcsb0RBQW9ELENBQUM7QUFFbkYsU0FBZ0Isb0JBQW9CLENBQUMsUUFBZ0I7SUFDbkQsSUFBSSxRQUFRLElBQUksQ0FBQyxzQkFBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUM5QyxNQUFNLElBQUksZ0NBQW1CLENBQUMsYUFBYSxRQUFRLGVBQWUsQ0FBQyxDQUFDO0tBQ3JFO0FBQ0gsQ0FBQztBQUpELG9EQUlDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFNjaGVtYXRpY3NFeGNlcHRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5cbi8vIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlciwgYW5kIG11c3QgY29udGFpbiBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIG9yIGRhc2hlcy5cbi8vIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbmV4cG9ydCBjb25zdCBodG1sU2VsZWN0b3JSZSA9IC9eW2EtekEtWl1bLjAtOWEtekEtWl0qKDo/LVthLXpBLVpdWy4wLTlhLXpBLVpdKikqJC87XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUh0bWxTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChzZWxlY3RvciAmJiAhaHRtbFNlbGVjdG9yUmUudGVzdChzZWxlY3RvcikpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgU2VsZWN0b3IgKCR7c2VsZWN0b3J9KSBpcyBpbnZhbGlkLmApO1xuICB9XG59XG4iXX0=