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
// Must start with a letter, and must contain only alphanumeric characters or dashes.
// When adding a dash the segment after the dash must also start with a letter.
exports.htmlSelectorRe = /^[a-zA-Z][.0-9a-zA-Z]*(:?-[a-zA-Z][.0-9a-zA-Z]*)*$/;
function validateHtmlSelector(selector) {
    if (selector && !exports.htmlSelectorRe.test(selector)) {
        throw new schematics_1.SchematicsException(core_1.tags.oneLine `Selector (${selector})
        is invalid.`);
    }
}
exports.validateHtmlSelector = validateHtmlSelector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUM1QywyREFBaUU7QUFFakUsc0JBQTZCLElBQVk7SUFDdkMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxXQUFJLENBQUMsT0FBTyxDQUFBLFNBQVMsSUFBSTtvQ0FDdkIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7QUFDSCxDQUFDO0FBTEQsb0NBS0M7QUFFRCxxRkFBcUY7QUFDckYsK0VBQStFO0FBQ2xFLFFBQUEsY0FBYyxHQUFHLG9EQUFvRCxDQUFDO0FBRW5GLDhCQUFxQyxRQUFnQjtJQUNuRCxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxzQkFBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxJQUFJLGdDQUFtQixDQUFDLFdBQUksQ0FBQyxPQUFPLENBQUEsYUFBYSxRQUFRO29CQUMvQyxDQUFDLENBQUM7SUFDcEIsQ0FBQztBQUNILENBQUM7QUFMRCxvREFLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7IHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBTY2hlbWF0aWNzRXhjZXB0aW9uIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVOYW1lKG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBpZiAobmFtZSAmJiAvXlxcZC8udGVzdChuYW1lKSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKHRhZ3Mub25lTGluZWBuYW1lICgke25hbWV9KVxuICAgICAgICBjYW4gbm90IHN0YXJ0IHdpdGggYSBkaWdpdC5gKTtcbiAgfVxufVxuXG4vLyBNdXN0IHN0YXJ0IHdpdGggYSBsZXR0ZXIsIGFuZCBtdXN0IGNvbnRhaW4gb25seSBhbHBoYW51bWVyaWMgY2hhcmFjdGVycyBvciBkYXNoZXMuXG4vLyBXaGVuIGFkZGluZyBhIGRhc2ggdGhlIHNlZ21lbnQgYWZ0ZXIgdGhlIGRhc2ggbXVzdCBhbHNvIHN0YXJ0IHdpdGggYSBsZXR0ZXIuXG5leHBvcnQgY29uc3QgaHRtbFNlbGVjdG9yUmUgPSAvXlthLXpBLVpdWy4wLTlhLXpBLVpdKig6Py1bYS16QS1aXVsuMC05YS16QS1aXSopKiQvO1xuXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVIdG1sU2VsZWN0b3Ioc2VsZWN0b3I6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoc2VsZWN0b3IgJiYgIWh0bWxTZWxlY3RvclJlLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24odGFncy5vbmVMaW5lYFNlbGVjdG9yICgke3NlbGVjdG9yfSlcbiAgICAgICAgaXMgaW52YWxpZC5gKTtcbiAgfVxufVxuIl19