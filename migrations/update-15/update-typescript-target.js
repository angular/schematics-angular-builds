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
function default_1() {
    return async (host) => {
        // Workspace level tsconfig
        updateTarget(host, 'tsconfig.json');
        const workspace = await (0, workspace_1.getWorkspace)(host);
        // Find all tsconfig which are refereces used by builders
        for (const [, project] of workspace.projects) {
            for (const [, target] of project.targets) {
                // Update all other known CLI builders that use a tsconfig
                const tsConfigs = [target.options || {}, ...Object.values(target.configurations || {})]
                    .filter((opt) => typeof (opt === null || opt === void 0 ? void 0 : opt.tsConfig) === 'string')
                    .map((opt) => opt.tsConfig);
                const uniqueTsConfigs = [...new Set(tsConfigs)];
                if (uniqueTsConfigs.length < 1) {
                    continue;
                }
                switch (target.builder) {
                    case workspace_models_1.Builders.Server:
                    case workspace_models_1.Builders.Karma:
                    case workspace_models_1.Builders.Browser:
                    case workspace_models_1.Builders.NgPackagr:
                        for (const tsConfig of uniqueTsConfigs) {
                            removeOrUpdateTarget(host, tsConfig);
                        }
                        break;
                }
            }
        }
    };
}
exports.default = default_1;
function removeOrUpdateTarget(host, tsConfigPath) {
    const json = new json_file_1.JSONFile(host, tsConfigPath);
    if (typeof json.get(['extends']) === 'string') {
        json.remove(['compilerOptions', 'target']);
    }
    else {
        updateTarget(host, tsConfigPath);
    }
}
const ESNEXT_ES2022_REGEXP = /^es(?:next|2022)$/i;
function updateTarget(host, tsConfigPath) {
    const json = new json_file_1.JSONFile(host, tsConfigPath);
    const jsonPath = ['compilerOptions'];
    const compilerOptions = json.get(jsonPath);
    if (compilerOptions && typeof compilerOptions === 'object') {
        const { target } = compilerOptions;
        if (typeof target === 'string' && !ESNEXT_ES2022_REGEXP.test(target)) {
            json.modify(jsonPath, {
                ...compilerOptions,
                'target': 'ES2022',
                'useDefineForClassFields': false,
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXR5cGVzY3JpcHQtdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE1L3VwZGF0ZS10eXBlc2NyaXB0LXRhcmdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUlILHVEQUFtRDtBQUNuRCx1REFBdUQ7QUFDdkQscUVBQTBEO0FBRTFEO0lBQ0UsT0FBTyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDcEIsMkJBQTJCO1FBQzNCLFlBQVksQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFcEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLHdCQUFZLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFFM0MseURBQXlEO1FBQ3pELEtBQUssTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksU0FBUyxDQUFDLFFBQVEsRUFBRTtZQUM1QyxLQUFLLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hDLDBEQUEwRDtnQkFDMUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsQ0FBQztxQkFDcEYsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLFFBQVEsQ0FBQSxLQUFLLFFBQVEsQ0FBQztxQkFDbEQsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBRSxHQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUV4RCxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFFaEQsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtvQkFDOUIsU0FBUztpQkFDVjtnQkFFRCxRQUFRLE1BQU0sQ0FBQyxPQUFtQixFQUFFO29CQUNsQyxLQUFLLDJCQUFRLENBQUMsTUFBTSxDQUFDO29CQUNyQixLQUFLLDJCQUFRLENBQUMsS0FBSyxDQUFDO29CQUNwQixLQUFLLDJCQUFRLENBQUMsT0FBTyxDQUFDO29CQUN0QixLQUFLLDJCQUFRLENBQUMsU0FBUzt3QkFDckIsS0FBSyxNQUFNLFFBQVEsSUFBSSxlQUFlLEVBQUU7NEJBQ3RDLG9CQUFvQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzt5QkFDdEM7d0JBQ0QsTUFBTTtpQkFDVDthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBbENELDRCQWtDQztBQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBVSxFQUFFLFlBQW9CO0lBQzVELE1BQU0sSUFBSSxHQUFHLElBQUksb0JBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDOUMsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRTtRQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztLQUM1QztTQUFNO1FBQ0wsWUFBWSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztLQUNsQztBQUNILENBQUM7QUFFRCxNQUFNLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0FBQ2xELFNBQVMsWUFBWSxDQUFDLElBQVUsRUFBRSxZQUFvQjtJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzlDLE1BQU0sUUFBUSxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNyQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRTNDLElBQUksZUFBZSxJQUFJLE9BQU8sZUFBZSxLQUFLLFFBQVEsRUFBRTtRQUMxRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsZUFBNkIsQ0FBQztRQUVqRCxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNwRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRTtnQkFDcEIsR0FBRyxlQUFlO2dCQUNsQixRQUFRLEVBQUUsUUFBUTtnQkFDbEIseUJBQXlCLEVBQUUsS0FBSzthQUNqQyxDQUFDLENBQUM7U0FDSjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBKc29uT2JqZWN0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgUnVsZSwgVHJlZSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEpTT05GaWxlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS9qc29uLWZpbGUnO1xuaW1wb3J0IHsgZ2V0V29ya3NwYWNlIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgQnVpbGRlcnMgfSBmcm9tICcuLi8uLi91dGlsaXR5L3dvcmtzcGFjZS1tb2RlbHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdCkgPT4ge1xuICAgIC8vIFdvcmtzcGFjZSBsZXZlbCB0c2NvbmZpZ1xuICAgIHVwZGF0ZVRhcmdldChob3N0LCAndHNjb25maWcuanNvbicpO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgZ2V0V29ya3NwYWNlKGhvc3QpO1xuXG4gICAgLy8gRmluZCBhbGwgdHNjb25maWcgd2hpY2ggYXJlIHJlZmVyZWNlcyB1c2VkIGJ5IGJ1aWxkZXJzXG4gICAgZm9yIChjb25zdCBbLCBwcm9qZWN0XSBvZiB3b3Jrc3BhY2UucHJvamVjdHMpIHtcbiAgICAgIGZvciAoY29uc3QgWywgdGFyZ2V0XSBvZiBwcm9qZWN0LnRhcmdldHMpIHtcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBvdGhlciBrbm93biBDTEkgYnVpbGRlcnMgdGhhdCB1c2UgYSB0c2NvbmZpZ1xuICAgICAgICBjb25zdCB0c0NvbmZpZ3MgPSBbdGFyZ2V0Lm9wdGlvbnMgfHwge30sIC4uLk9iamVjdC52YWx1ZXModGFyZ2V0LmNvbmZpZ3VyYXRpb25zIHx8IHt9KV1cbiAgICAgICAgICAuZmlsdGVyKChvcHQpID0+IHR5cGVvZiBvcHQ/LnRzQ29uZmlnID09PSAnc3RyaW5nJylcbiAgICAgICAgICAubWFwKChvcHQpID0+IChvcHQgYXMgeyB0c0NvbmZpZzogc3RyaW5nIH0pLnRzQ29uZmlnKTtcblxuICAgICAgICBjb25zdCB1bmlxdWVUc0NvbmZpZ3MgPSBbLi4ubmV3IFNldCh0c0NvbmZpZ3MpXTtcblxuICAgICAgICBpZiAodW5pcXVlVHNDb25maWdzLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAodGFyZ2V0LmJ1aWxkZXIgYXMgQnVpbGRlcnMpIHtcbiAgICAgICAgICBjYXNlIEJ1aWxkZXJzLlNlcnZlcjpcbiAgICAgICAgICBjYXNlIEJ1aWxkZXJzLkthcm1hOlxuICAgICAgICAgIGNhc2UgQnVpbGRlcnMuQnJvd3NlcjpcbiAgICAgICAgICBjYXNlIEJ1aWxkZXJzLk5nUGFja2FncjpcbiAgICAgICAgICAgIGZvciAoY29uc3QgdHNDb25maWcgb2YgdW5pcXVlVHNDb25maWdzKSB7XG4gICAgICAgICAgICAgIHJlbW92ZU9yVXBkYXRlVGFyZ2V0KGhvc3QsIHRzQ29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiByZW1vdmVPclVwZGF0ZVRhcmdldChob3N0OiBUcmVlLCB0c0NvbmZpZ1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBqc29uID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gIGlmICh0eXBlb2YganNvbi5nZXQoWydleHRlbmRzJ10pID09PSAnc3RyaW5nJykge1xuICAgIGpzb24ucmVtb3ZlKFsnY29tcGlsZXJPcHRpb25zJywgJ3RhcmdldCddKTtcbiAgfSBlbHNlIHtcbiAgICB1cGRhdGVUYXJnZXQoaG9zdCwgdHNDb25maWdQYXRoKTtcbiAgfVxufVxuXG5jb25zdCBFU05FWFRfRVMyMDIyX1JFR0VYUCA9IC9eZXMoPzpuZXh0fDIwMjIpJC9pO1xuZnVuY3Rpb24gdXBkYXRlVGFyZ2V0KGhvc3Q6IFRyZWUsIHRzQ29uZmlnUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGpzb24gPSBuZXcgSlNPTkZpbGUoaG9zdCwgdHNDb25maWdQYXRoKTtcbiAgY29uc3QganNvblBhdGggPSBbJ2NvbXBpbGVyT3B0aW9ucyddO1xuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSBqc29uLmdldChqc29uUGF0aCk7XG5cbiAgaWYgKGNvbXBpbGVyT3B0aW9ucyAmJiB0eXBlb2YgY29tcGlsZXJPcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgIGNvbnN0IHsgdGFyZ2V0IH0gPSBjb21waWxlck9wdGlvbnMgYXMgSnNvbk9iamVjdDtcblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJyAmJiAhRVNORVhUX0VTMjAyMl9SRUdFWFAudGVzdCh0YXJnZXQpKSB7XG4gICAgICBqc29uLm1vZGlmeShqc29uUGF0aCwge1xuICAgICAgICAuLi5jb21waWxlck9wdGlvbnMsXG4gICAgICAgICd0YXJnZXQnOiAnRVMyMDIyJyxcbiAgICAgICAgJ3VzZURlZmluZUZvckNsYXNzRmllbGRzJzogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==