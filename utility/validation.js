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
function validateProjectName(projectName) {
    const errorIndex = getRegExpFailPosition(projectName);
    const unsupportedProjectNames = [];
    const packageNameRegex = /^(?:@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+$/;
    if (errorIndex !== null) {
        const firstMessage = core_1.tags.oneLine `
    Project name "${projectName}" is not valid. New project names must
    start with a letter, and must contain only alphanumeric characters or dashes.
    When adding a dash the segment after the dash must also start with a letter.
    `;
        const msg = core_1.tags.stripIndent `
    ${firstMessage}
    ${projectName}
    ${Array(errorIndex + 1).join(' ') + '^'}
    `;
        throw new schematics_1.SchematicsException(msg);
    }
    else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
        throw new schematics_1.SchematicsException(`Project name ${JSON.stringify(projectName)} is not a supported name.`);
    }
    else if (!packageNameRegex.test(projectName)) {
        throw new schematics_1.SchematicsException(`Project name ${JSON.stringify(projectName)} is invalid.`);
    }
}
exports.validateProjectName = validateProjectName;
function getRegExpFailPosition(str) {
    const isScope = /^@.*\/.*/.test(str);
    if (isScope) {
        // Remove starting @
        str = str.replace(/^@/, '');
        // Change / to - for validation
        str = str.replace(/\//g, '-');
    }
    const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
    const matched = [];
    const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
    parts.forEach(part => {
        if (part.match(projectNameRegexp)) {
            matched.push(part);
        }
    });
    const compare = matched.join('-');
    return (str !== compare) ? compare.length : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsicGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvdmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7R0FNRztBQUNILCtDQUE0QztBQUM1QywyREFBaUU7QUFFakUsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUM1QixNQUFNLElBQUksZ0NBQW1CLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQSxTQUFTLElBQUk7b0NBQ3ZCLENBQUMsQ0FBQztLQUNuQztBQUNILENBQUM7QUFMRCxvQ0FLQztBQUVELHFGQUFxRjtBQUNyRiwrRUFBK0U7QUFDbEUsUUFBQSxjQUFjLEdBQUcsb0RBQW9ELENBQUM7QUFFbkYsU0FBZ0Isb0JBQW9CLENBQUMsUUFBZ0I7SUFDbkQsSUFBSSxRQUFRLElBQUksQ0FBQyxzQkFBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUM5QyxNQUFNLElBQUksZ0NBQW1CLENBQUMsV0FBSSxDQUFDLE9BQU8sQ0FBQSxhQUFhLFFBQVE7b0JBQy9DLENBQUMsQ0FBQztLQUNuQjtBQUNILENBQUM7QUFMRCxvREFLQztBQUdELFNBQWdCLG1CQUFtQixDQUFDLFdBQW1CO0lBQ3JELE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELE1BQU0sdUJBQXVCLEdBQWEsRUFBRSxDQUFDO0lBQzdDLE1BQU0sZ0JBQWdCLEdBQUcsd0NBQXdDLENBQUM7SUFDbEUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLFdBQUksQ0FBQyxPQUFPLENBQUE7b0JBQ2pCLFdBQVc7OztLQUcxQixDQUFDO1FBQ0YsTUFBTSxHQUFHLEdBQUcsV0FBSSxDQUFDLFdBQVcsQ0FBQTtNQUMxQixZQUFZO01BQ1osV0FBVztNQUNYLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUc7S0FDdEMsQ0FBQztRQUNGLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNwQztTQUFNLElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQzlELE1BQU0sSUFBSSxnQ0FBbUIsQ0FDM0IsZ0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUM7S0FDM0U7U0FBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQzlDLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDMUY7QUFDSCxDQUFDO0FBdEJELGtEQXNCQztBQUVELFNBQVMscUJBQXFCLENBQUMsR0FBVztJQUN4QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLElBQUksT0FBTyxFQUFFO1FBQ1gsb0JBQW9CO1FBQ3BCLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1QiwrQkFBK0I7UUFDL0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQy9CO0lBRUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0QsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO0lBRTdCLE1BQU0saUJBQWlCLEdBQUcsMENBQTBDLENBQUM7SUFFckUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNuQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRWxDLE9BQU8sQ0FBQyxHQUFHLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNuRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFNjaGVtYXRpY3NFeGNlcHRpb24gfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZU5hbWUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChuYW1lICYmIC9eXFxkLy50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24odGFncy5vbmVMaW5lYG5hbWUgKCR7bmFtZX0pXG4gICAgICAgIGNhbiBub3Qgc3RhcnQgd2l0aCBhIGRpZ2l0LmApO1xuICB9XG59XG5cbi8vIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlciwgYW5kIG11c3QgY29udGFpbiBvbmx5IGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzIG9yIGRhc2hlcy5cbi8vIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbmV4cG9ydCBjb25zdCBodG1sU2VsZWN0b3JSZSA9IC9eW2EtekEtWl1bLjAtOWEtekEtWl0qKDo/LVthLXpBLVpdWy4wLTlhLXpBLVpdKikqJC87XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUh0bWxTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChzZWxlY3RvciAmJiAhaHRtbFNlbGVjdG9yUmUudGVzdChzZWxlY3RvcikpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbih0YWdzLm9uZUxpbmVgU2VsZWN0b3IgKCR7c2VsZWN0b3J9KVxuICAgICAgICBpcyBpbnZhbGlkLmApO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlUHJvamVjdE5hbWUocHJvamVjdE5hbWU6IHN0cmluZykge1xuICBjb25zdCBlcnJvckluZGV4ID0gZ2V0UmVnRXhwRmFpbFBvc2l0aW9uKHByb2plY3ROYW1lKTtcbiAgY29uc3QgdW5zdXBwb3J0ZWRQcm9qZWN0TmFtZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHBhY2thZ2VOYW1lUmVnZXggPSAvXig/OkBbYS16QS1aMC05Xy1dK1xcLyk/W2EtekEtWjAtOV8tXSskLztcbiAgaWYgKGVycm9ySW5kZXggIT09IG51bGwpIHtcbiAgICBjb25zdCBmaXJzdE1lc3NhZ2UgPSB0YWdzLm9uZUxpbmVgXG4gICAgUHJvamVjdCBuYW1lIFwiJHtwcm9qZWN0TmFtZX1cIiBpcyBub3QgdmFsaWQuIE5ldyBwcm9qZWN0IG5hbWVzIG11c3RcbiAgICBzdGFydCB3aXRoIGEgbGV0dGVyLCBhbmQgbXVzdCBjb250YWluIG9ubHkgYWxwaGFudW1lcmljIGNoYXJhY3RlcnMgb3IgZGFzaGVzLlxuICAgIFdoZW4gYWRkaW5nIGEgZGFzaCB0aGUgc2VnbWVudCBhZnRlciB0aGUgZGFzaCBtdXN0IGFsc28gc3RhcnQgd2l0aCBhIGxldHRlci5cbiAgICBgO1xuICAgIGNvbnN0IG1zZyA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgJHtmaXJzdE1lc3NhZ2V9XG4gICAgJHtwcm9qZWN0TmFtZX1cbiAgICAke0FycmF5KGVycm9ySW5kZXggKyAxKS5qb2luKCcgJykgKyAnXid9XG4gICAgYDtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihtc2cpO1xuICB9IGVsc2UgaWYgKHVuc3VwcG9ydGVkUHJvamVjdE5hbWVzLmluZGV4T2YocHJvamVjdE5hbWUpICE9PSAtMSkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYFByb2plY3QgbmFtZSAke0pTT04uc3RyaW5naWZ5KHByb2plY3ROYW1lKX0gaXMgbm90IGEgc3VwcG9ydGVkIG5hbWUuYCk7XG4gIH0gZWxzZSBpZiAoIXBhY2thZ2VOYW1lUmVnZXgudGVzdChwcm9qZWN0TmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgUHJvamVjdCBuYW1lICR7SlNPTi5zdHJpbmdpZnkocHJvamVjdE5hbWUpfSBpcyBpbnZhbGlkLmApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFJlZ0V4cEZhaWxQb3NpdGlvbihzdHI6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICBjb25zdCBpc1Njb3BlID0gL15ALipcXC8uKi8udGVzdChzdHIpO1xuICBpZiAoaXNTY29wZSkge1xuICAgIC8vIFJlbW92ZSBzdGFydGluZyBAXG4gICAgc3RyID0gc3RyLnJlcGxhY2UoL15ALywgJycpO1xuICAgIC8vIENoYW5nZSAvIHRvIC0gZm9yIHZhbGlkYXRpb25cbiAgICBzdHIgPSBzdHIucmVwbGFjZSgvXFwvL2csICctJyk7XG4gIH1cblxuICBjb25zdCBwYXJ0cyA9IHN0ci5pbmRleE9mKCctJykgPj0gMCA/IHN0ci5zcGxpdCgnLScpIDogW3N0cl07XG4gIGNvbnN0IG1hdGNoZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgcHJvamVjdE5hbWVSZWdleHAgPSAvXlthLXpBLVpdWy4wLTlhLXpBLVpdKigtWy4wLTlhLXpBLVpdKikqJC87XG5cbiAgcGFydHMuZm9yRWFjaChwYXJ0ID0+IHtcbiAgICBpZiAocGFydC5tYXRjaChwcm9qZWN0TmFtZVJlZ2V4cCkpIHtcbiAgICAgIG1hdGNoZWQucHVzaChwYXJ0KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGNvbXBhcmUgPSBtYXRjaGVkLmpvaW4oJy0nKTtcblxuICByZXR1cm4gKHN0ciAhPT0gY29tcGFyZSkgPyBjb21wYXJlLmxlbmd0aCA6IG51bGw7XG59XG4iXX0=