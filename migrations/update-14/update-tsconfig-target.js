"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const json_file_1 = require("../../utility/json-file");
const workspace_1 = require("../../utility/workspace");
const workspace_models_1 = require("../../utility/workspace-models");
/** Migration to update tsconfig compilation target option to es2020. */
function default_1() {
    return async (host) => {
        var _a, _b;
        /** Builders for which the migration will run. */
        const supportedBuilders = [workspace_models_1.Builders.Karma, workspace_models_1.Builders.NgPackagr, workspace_models_1.Builders.Browser];
        /** Compilation targets values that should not be amended. */
        const skipTargets = ['es2020', 'es2021', 'es2022', 'esnext'];
        const uniqueTsConfigs = new Set(['/tsconfig.json']);
        // Find all tsconfig files which are refereced by the builders.
        const workspace = await (0, workspace_1.getWorkspace)(host);
        for (const project of workspace.projects.values()) {
            for (const target of project.targets.values()) {
                if (!supportedBuilders.includes(target.builder)) {
                    // Unknown builder.
                    continue;
                }
                // Update all other known CLI builders that use a tsconfig.
                const allOptions = [(_a = target.options) !== null && _a !== void 0 ? _a : {}, ...Object.values((_b = target.configurations) !== null && _b !== void 0 ? _b : {})];
                for (const opt of allOptions) {
                    if (typeof (opt === null || opt === void 0 ? void 0 : opt.tsConfig) === 'string') {
                        uniqueTsConfigs.add(opt.tsConfig);
                    }
                }
            }
        }
        // Modify tsconfig files
        const targetJsonPath = ['compilerOptions', 'target'];
        for (const tsConfigPath of uniqueTsConfigs) {
            const json = new json_file_1.JSONFile(host, tsConfigPath);
            const target = json.get(targetJsonPath);
            // Update compilation target when it's current set lower than es2020.
            if (typeof target === 'string' && !skipTargets.includes(target.toLowerCase())) {
                json.modify(targetJsonPath, 'es2020');
            }
        }
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXRzY29uZmlnLXRhcmdldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9taWdyYXRpb25zL3VwZGF0ZS0xNC91cGRhdGUtdHNjb25maWctdGFyZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBR0gsdURBQW1EO0FBQ25ELHVEQUF1RDtBQUN2RCxxRUFBMEQ7QUFFMUQsd0VBQXdFO0FBQ3hFO0lBQ0UsT0FBTyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7O1FBQ3BCLGlEQUFpRDtRQUNqRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsMkJBQVEsQ0FBQyxLQUFLLEVBQUUsMkJBQVEsQ0FBQyxTQUFTLEVBQUUsMkJBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRiw2REFBNkQ7UUFDN0QsTUFBTSxXQUFXLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUU3RCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUVwRCwrREFBK0Q7UUFDL0QsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLHdCQUFZLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBbUIsQ0FBQyxFQUFFO29CQUMzRCxtQkFBbUI7b0JBQ25CLFNBQVM7aUJBQ1Y7Z0JBRUQsMkRBQTJEO2dCQUMzRCxNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQUEsTUFBTSxDQUFDLE9BQU8sbUNBQUksRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFBLE1BQU0sQ0FBQyxjQUFjLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pGLEtBQUssTUFBTSxHQUFHLElBQUksVUFBVSxFQUFFO29CQUM1QixJQUFJLE9BQU8sQ0FBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsUUFBUSxDQUFBLEtBQUssUUFBUSxFQUFFO3dCQUNyQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDbkM7aUJBQ0Y7YUFDRjtTQUNGO1FBRUQsd0JBQXdCO1FBQ3hCLE1BQU0sY0FBYyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDckQsS0FBSyxNQUFNLFlBQVksSUFBSSxlQUFlLEVBQUU7WUFDMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRXhDLHFFQUFxRTtZQUNyRSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUU7Z0JBQzdFLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3ZDO1NBQ0Y7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBekNELDRCQXlDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgSlNPTkZpbGUgfSBmcm9tICcuLi8uLi91dGlsaXR5L2pzb24tZmlsZSc7XG5pbXBvcnQgeyBnZXRXb3Jrc3BhY2UgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVycyB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlLW1vZGVscyc7XG5cbi8qKiBNaWdyYXRpb24gdG8gdXBkYXRlIHRzY29uZmlnIGNvbXBpbGF0aW9uIHRhcmdldCBvcHRpb24gdG8gZXMyMDIwLiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QpID0+IHtcbiAgICAvKiogQnVpbGRlcnMgZm9yIHdoaWNoIHRoZSBtaWdyYXRpb24gd2lsbCBydW4uICovXG4gICAgY29uc3Qgc3VwcG9ydGVkQnVpbGRlcnMgPSBbQnVpbGRlcnMuS2FybWEsIEJ1aWxkZXJzLk5nUGFja2FnciwgQnVpbGRlcnMuQnJvd3Nlcl07XG5cbiAgICAvKiogQ29tcGlsYXRpb24gdGFyZ2V0cyB2YWx1ZXMgdGhhdCBzaG91bGQgbm90IGJlIGFtZW5kZWQuICovXG4gICAgY29uc3Qgc2tpcFRhcmdldHMgPSBbJ2VzMjAyMCcsICdlczIwMjEnLCAnZXMyMDIyJywgJ2VzbmV4dCddO1xuXG4gICAgY29uc3QgdW5pcXVlVHNDb25maWdzID0gbmV3IFNldChbJy90c2NvbmZpZy5qc29uJ10pO1xuXG4gICAgLy8gRmluZCBhbGwgdHNjb25maWcgZmlsZXMgd2hpY2ggYXJlIHJlZmVyZWNlZCBieSB0aGUgYnVpbGRlcnMuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiB3b3Jrc3BhY2UucHJvamVjdHMudmFsdWVzKCkpIHtcbiAgICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIHByb2plY3QudGFyZ2V0cy52YWx1ZXMoKSkge1xuICAgICAgICBpZiAoIXN1cHBvcnRlZEJ1aWxkZXJzLmluY2x1ZGVzKHRhcmdldC5idWlsZGVyIGFzIEJ1aWxkZXJzKSkge1xuICAgICAgICAgIC8vIFVua25vd24gYnVpbGRlci5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgb3RoZXIga25vd24gQ0xJIGJ1aWxkZXJzIHRoYXQgdXNlIGEgdHNjb25maWcuXG4gICAgICAgIGNvbnN0IGFsbE9wdGlvbnMgPSBbdGFyZ2V0Lm9wdGlvbnMgPz8ge30sIC4uLk9iamVjdC52YWx1ZXModGFyZ2V0LmNvbmZpZ3VyYXRpb25zID8/IHt9KV07XG4gICAgICAgIGZvciAoY29uc3Qgb3B0IG9mIGFsbE9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG9wdD8udHNDb25maWcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB1bmlxdWVUc0NvbmZpZ3MuYWRkKG9wdC50c0NvbmZpZyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTW9kaWZ5IHRzY29uZmlnIGZpbGVzXG4gICAgY29uc3QgdGFyZ2V0SnNvblBhdGggPSBbJ2NvbXBpbGVyT3B0aW9ucycsICd0YXJnZXQnXTtcbiAgICBmb3IgKGNvbnN0IHRzQ29uZmlnUGF0aCBvZiB1bmlxdWVUc0NvbmZpZ3MpIHtcbiAgICAgIGNvbnN0IGpzb24gPSBuZXcgSlNPTkZpbGUoaG9zdCwgdHNDb25maWdQYXRoKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGpzb24uZ2V0KHRhcmdldEpzb25QYXRoKTtcblxuICAgICAgLy8gVXBkYXRlIGNvbXBpbGF0aW9uIHRhcmdldCB3aGVuIGl0J3MgY3VycmVudCBzZXQgbG93ZXIgdGhhbiBlczIwMjAuXG4gICAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycgJiYgIXNraXBUYXJnZXRzLmluY2x1ZGVzKHRhcmdldC50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICBqc29uLm1vZGlmeSh0YXJnZXRKc29uUGF0aCwgJ2VzMjAyMCcpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cbiJdfQ==