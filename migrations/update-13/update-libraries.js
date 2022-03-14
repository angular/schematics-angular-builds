"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const json_file_1 = require("../../utility/json-file");
const workspace_1 = require("../../utility/workspace");
function* visit(directory) {
    for (const path of directory.subfiles) {
        if (path === 'package.json') {
            const entry = directory.file(path);
            if ((entry === null || entry === void 0 ? void 0 : entry.content.toString().includes('ngPackage')) !== true) {
                continue;
            }
        }
        else if (path !== 'ng-package.json') {
            continue;
        }
        yield (0, core_1.join)(directory.path, path);
    }
    for (const path of directory.subdirs) {
        if (path === 'node_modules' || path.startsWith('.')) {
            continue;
        }
        yield* visit(directory.dir(path));
    }
}
function default_1() {
    const ENABLE_IVY_JSON_PATH = ['angularCompilerOptions', 'enableIvy'];
    const COMPILATION_MODE_JSON_PATH = ['angularCompilerOptions', 'compilationMode'];
    const NG_PACKAGR_DEPRECATED_OPTIONS_PATHS = [
        ['lib', 'umdModuleIds'],
        ['lib', 'amdId'],
        ['lib', 'umdId'],
        ['ngPackage', 'lib', 'umdModuleIds'],
        ['ngPackage', 'lib', 'amdId'],
        ['ngPackage', 'lib', 'umdId'],
    ];
    return async (tree, context) => {
        const workspace = await (0, workspace_1.getWorkspace)(tree);
        const librariesTsConfig = new Set();
        const ngPackagrConfig = new Set();
        for (const [, project] of workspace.projects) {
            for (const [_, target] of project.targets) {
                if (target.builder !== '@angular-devkit/build-angular:ng-packagr') {
                    continue;
                }
                for (const [, options] of (0, workspace_1.allTargetOptions)(target)) {
                    if (typeof options.tsConfig === 'string') {
                        librariesTsConfig.add(options.tsConfig);
                    }
                    if (typeof options.project === 'string') {
                        if (options.project.endsWith('.json')) {
                            ngPackagrConfig.add(options.project);
                        }
                        else {
                            context.logger
                                .warn(core_1.tags.stripIndent `Expected a JSON configuration file but found "${options.project}".
                  You may need to adjust the configuration file to remove invalid options.
                  For more information, see the breaking changes section within the release notes: https://github.com/ng-packagr/ng-packagr/releases/tag/v13.0.0/.`);
                        }
                    }
                }
            }
        }
        // Gather configurations which are not referecned in angular.json
        // (This happens when users have secondary entry-points)
        for (const p of visit(tree.root)) {
            ngPackagrConfig.add(p);
        }
        // Update ng-packagr configuration
        for (const config of ngPackagrConfig) {
            const json = new json_file_1.JSONFile(tree, config);
            for (const optionPath of NG_PACKAGR_DEPRECATED_OPTIONS_PATHS) {
                json.remove(optionPath);
            }
        }
        // Update tsconfig files
        for (const tsConfig of librariesTsConfig) {
            const json = new json_file_1.JSONFile(tree, tsConfig);
            if (json.get(ENABLE_IVY_JSON_PATH) === false) {
                json.remove(ENABLE_IVY_JSON_PATH);
                json.modify(COMPILATION_MODE_JSON_PATH, 'partial');
            }
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLWxpYnJhcmllcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xMy91cGRhdGUtbGlicmFyaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsK0NBQWtEO0FBRWxELHVEQUFtRDtBQUNuRCx1REFBeUU7QUFFekUsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQW1CO0lBQ2pDLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUNyQyxJQUFJLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDM0IsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU8sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFLLElBQUksRUFBRTtnQkFDNUQsU0FBUzthQUNWO1NBQ0Y7YUFBTSxJQUFJLElBQUksS0FBSyxpQkFBaUIsRUFBRTtZQUNyQyxTQUFTO1NBQ1Y7UUFFRCxNQUFNLElBQUEsV0FBSSxFQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDbEM7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUU7UUFDcEMsSUFBSSxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbkQsU0FBUztTQUNWO1FBRUQsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUNuQztBQUNILENBQUM7QUFFRDtJQUNFLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyx3QkFB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QUMsQ0FBQztBQUNKLENBQUM7QUFqRUQsNEJBaUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IGpvaW4sIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBEaXJFbnRyeSwgUnVsZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0IHsgYWxsVGFyZ2V0T3B0aW9ucywgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuXG5mdW5jdGlvbiogdmlzaXQoZGlyZWN0b3J5OiBEaXJFbnRyeSk6IEl0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gIGZvciAoY29uc3QgcGF0aCBvZiBkaXJlY3Rvcnkuc3ViZmlsZXMpIHtcbiAgICBpZiAocGF0aCA9PT0gJ3BhY2thZ2UuanNvbicpIHtcbiAgICAgIGNvbnN0IGVudHJ5ID0gZGlyZWN0b3J5LmZpbGUocGF0aCk7XG4gICAgICBpZiAoZW50cnk/LmNvbnRlbnQudG9TdHJpbmcoKS5pbmNsdWRlcygnbmdQYWNrYWdlJykgIT09IHRydWUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXRoICE9PSAnbmctcGFja2FnZS5qc29uJykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgeWllbGQgam9pbihkaXJlY3RvcnkucGF0aCwgcGF0aCk7XG4gIH1cblxuICBmb3IgKGNvbnN0IHBhdGggb2YgZGlyZWN0b3J5LnN1YmRpcnMpIHtcbiAgICBpZiAocGF0aCA9PT0gJ25vZGVfbW9kdWxlcycgfHwgcGF0aC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHlpZWxkKiB2aXNpdChkaXJlY3RvcnkuZGlyKHBhdGgpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIGNvbnN0IEVOQUJMRV9JVllfSlNPTl9QQVRIID0gWydhbmd1bGFyQ29tcGlsZXJPcHRpb25zJywgJ2VuYWJsZUl2eSddO1xuICBjb25zdCBDT01QSUxBVElPTl9NT0RFX0pTT05fUEFUSCA9IFsnYW5ndWxhckNvbXBpbGVyT3B0aW9ucycsICdjb21waWxhdGlvbk1vZGUnXTtcbiAgY29uc3QgTkdfUEFDS0FHUl9ERVBSRUNBVEVEX09QVElPTlNfUEFUSFMgPSBbXG4gICAgWydsaWInLCAndW1kTW9kdWxlSWRzJ10sXG4gICAgWydsaWInLCAnYW1kSWQnXSxcbiAgICBbJ2xpYicsICd1bWRJZCddLFxuICAgIFsnbmdQYWNrYWdlJywgJ2xpYicsICd1bWRNb2R1bGVJZHMnXSxcbiAgICBbJ25nUGFja2FnZScsICdsaWInLCAnYW1kSWQnXSxcbiAgICBbJ25nUGFja2FnZScsICdsaWInLCAndW1kSWQnXSxcbiAgXTtcblxuICByZXR1cm4gYXN5bmMgKHRyZWUsIGNvbnRleHQpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UodHJlZSk7XG4gICAgY29uc3QgbGlicmFyaWVzVHNDb25maWcgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBuZ1BhY2thZ3JDb25maWcgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGZvciAoY29uc3QgWywgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IFtfLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICBpZiAodGFyZ2V0LmJ1aWxkZXIgIT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcjpuZy1wYWNrYWdyJykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbLCBvcHRpb25zXSBvZiBhbGxUYXJnZXRPcHRpb25zKHRhcmdldCkpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudHNDb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsaWJyYXJpZXNUc0NvbmZpZy5hZGQob3B0aW9ucy50c0NvbmZpZyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnByb2plY3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5wcm9qZWN0LmVuZHNXaXRoKCcuanNvbicpKSB7XG4gICAgICAgICAgICAgIG5nUGFja2FnckNvbmZpZy5hZGQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHQubG9nZ2VyXG4gICAgICAgICAgICAgICAgLndhcm4odGFncy5zdHJpcEluZGVudGBFeHBlY3RlZCBhIEpTT04gY29uZmlndXJhdGlvbiBmaWxlIGJ1dCBmb3VuZCBcIiR7b3B0aW9ucy5wcm9qZWN0fVwiLlxuICAgICAgICAgICAgICAgICAgWW91IG1heSBuZWVkIHRvIGFkanVzdCB0aGUgY29uZmlndXJhdGlvbiBmaWxlIHRvIHJlbW92ZSBpbnZhbGlkIG9wdGlvbnMuXG4gICAgICAgICAgICAgICAgICBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIHRoZSBicmVha2luZyBjaGFuZ2VzIHNlY3Rpb24gd2l0aGluIHRoZSByZWxlYXNlIG5vdGVzOiBodHRwczovL2dpdGh1Yi5jb20vbmctcGFja2Fnci9uZy1wYWNrYWdyL3JlbGVhc2VzL3RhZy92MTMuMC4wLy5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHYXRoZXIgY29uZmlndXJhdGlvbnMgd2hpY2ggYXJlIG5vdCByZWZlcmVjbmVkIGluIGFuZ3VsYXIuanNvblxuICAgIC8vIChUaGlzIGhhcHBlbnMgd2hlbiB1c2VycyBoYXZlIHNlY29uZGFyeSBlbnRyeS1wb2ludHMpXG4gICAgZm9yIChjb25zdCBwIG9mIHZpc2l0KHRyZWUucm9vdCkpIHtcbiAgICAgIG5nUGFja2FnckNvbmZpZy5hZGQocCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIG5nLXBhY2thZ3IgY29uZmlndXJhdGlvblxuICAgIGZvciAoY29uc3QgY29uZmlnIG9mIG5nUGFja2FnckNvbmZpZykge1xuICAgICAgY29uc3QganNvbiA9IG5ldyBKU09ORmlsZSh0cmVlLCBjb25maWcpO1xuICAgICAgZm9yIChjb25zdCBvcHRpb25QYXRoIG9mIE5HX1BBQ0tBR1JfREVQUkVDQVRFRF9PUFRJT05TX1BBVEhTKSB7XG4gICAgICAgIGpzb24ucmVtb3ZlKG9wdGlvblBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0c2NvbmZpZyBmaWxlc1xuICAgIGZvciAoY29uc3QgdHNDb25maWcgb2YgbGlicmFyaWVzVHNDb25maWcpIHtcbiAgICAgIGNvbnN0IGpzb24gPSBuZXcgSlNPTkZpbGUodHJlZSwgdHNDb25maWcpO1xuICAgICAgaWYgKGpzb24uZ2V0KEVOQUJMRV9JVllfSlNPTl9QQVRIKSA9PT0gZmFsc2UpIHtcbiAgICAgICAganNvbi5yZW1vdmUoRU5BQkxFX0lWWV9KU09OX1BBVEgpO1xuICAgICAgICBqc29uLm1vZGlmeShDT01QSUxBVElPTl9NT0RFX0pTT05fUEFUSCwgJ3BhcnRpYWwnKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG4iXX0=