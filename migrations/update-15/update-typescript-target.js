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
    return async (host, context) => {
        // Workspace level tsconfig
        updateTarget(host, 'tsconfig.json');
        const workspace = await (0, workspace_1.getWorkspace)(host);
        // Find all tsconfig which are refereces used by builders
        for (const [, project] of workspace.projects) {
            for (const [targetName, target] of project.targets) {
                // Update all other known CLI builders that use a tsconfig
                const tsConfigs = [target.options || {}, ...Object.values(target.configurations || {})]
                    .filter((opt) => typeof opt?.tsConfig === 'string')
                    .map((opt) => opt.tsConfig);
                const uniqueTsConfigs = new Set(tsConfigs);
                for (const tsConfig of uniqueTsConfigs) {
                    if (host.exists(tsConfig)) {
                        continue;
                    }
                    uniqueTsConfigs.delete(tsConfig);
                    context.logger.warn(`'${tsConfig}' referenced in the '${targetName}' target does not exist.`);
                }
                if (!uniqueTsConfigs.size) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXR5cGVzY3JpcHQtdGFyZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL21pZ3JhdGlvbnMvdXBkYXRlLTE1L3VwZGF0ZS10eXBlc2NyaXB0LXRhcmdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUlILHVEQUFtRDtBQUNuRCx1REFBdUQ7QUFDdkQscUVBQTBEO0FBRTFEO0lBQ0UsT0FBTyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzdCLDJCQUEyQjtRQUMzQixZQUFZLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSx3QkFBWSxFQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNDLHlEQUF5RDtRQUN6RCxLQUFLLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUU7WUFDNUMsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ2xELDBEQUEwRDtnQkFDMUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsSUFBSSxFQUFFLENBQUMsQ0FBQztxQkFDcEYsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDO3FCQUNsRCxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFFLEdBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRXhELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMzQyxLQUFLLE1BQU0sUUFBUSxJQUFJLGVBQWUsRUFBRTtvQkFDdEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO3dCQUN6QixTQUFTO3FCQUNWO29CQUVELGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNqQixJQUFJLFFBQVEsd0JBQXdCLFVBQVUsMEJBQTBCLENBQ3pFLENBQUM7aUJBQ0g7Z0JBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUU7b0JBQ3pCLFNBQVM7aUJBQ1Y7Z0JBRUQsUUFBUSxNQUFNLENBQUMsT0FBbUIsRUFBRTtvQkFDbEMsS0FBSywyQkFBUSxDQUFDLE1BQU0sQ0FBQztvQkFDckIsS0FBSywyQkFBUSxDQUFDLEtBQUssQ0FBQztvQkFDcEIsS0FBSywyQkFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDdEIsS0FBSywyQkFBUSxDQUFDLFNBQVM7d0JBQ3JCLEtBQUssTUFBTSxRQUFRLElBQUksZUFBZSxFQUFFOzRCQUN0QyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7eUJBQ3RDO3dCQUNELE1BQU07aUJBQ1Q7YUFDRjtTQUNGO0lBQ0gsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVDRCw0QkE0Q0M7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQVUsRUFBRSxZQUFvQjtJQUM1RCxNQUFNLElBQUksR0FBRyxJQUFJLG9CQUFRLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzlDLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDNUM7U0FBTTtRQUNMLFlBQVksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDbEM7QUFDSCxDQUFDO0FBRUQsTUFBTSxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQztBQUNsRCxTQUFTLFlBQVksQ0FBQyxJQUFVLEVBQUUsWUFBb0I7SUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUM5QyxNQUFNLFFBQVEsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDckMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUUzQyxJQUFJLGVBQWUsSUFBSSxPQUFPLGVBQWUsS0FBSyxRQUFRLEVBQUU7UUFDMUQsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLGVBQTZCLENBQUM7UUFFakQsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3BCLEdBQUcsZUFBZTtnQkFDbEIsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLHlCQUF5QixFQUFFLEtBQUs7YUFDakMsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgSnNvbk9iamVjdCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCB7IFJ1bGUsIFRyZWUgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvc2NoZW1hdGljcyc7XG5pbXBvcnQgeyBKU09ORmlsZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvanNvbi1maWxlJztcbmltcG9ydCB7IGdldFdvcmtzcGFjZSB9IGZyb20gJy4uLy4uL3V0aWxpdHkvd29ya3NwYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbGl0eS93b3Jrc3BhY2UtbW9kZWxzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKCk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3QsIGNvbnRleHQpID0+IHtcbiAgICAvLyBXb3Jrc3BhY2UgbGV2ZWwgdHNjb25maWdcbiAgICB1cGRhdGVUYXJnZXQoaG9zdCwgJ3RzY29uZmlnLmpzb24nKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcblxuICAgIC8vIEZpbmQgYWxsIHRzY29uZmlnIHdoaWNoIGFyZSByZWZlcmVjZXMgdXNlZCBieSBidWlsZGVyc1xuICAgIGZvciAoY29uc3QgWywgcHJvamVjdF0gb2Ygd29ya3NwYWNlLnByb2plY3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IFt0YXJnZXROYW1lLCB0YXJnZXRdIG9mIHByb2plY3QudGFyZ2V0cykge1xuICAgICAgICAvLyBVcGRhdGUgYWxsIG90aGVyIGtub3duIENMSSBidWlsZGVycyB0aGF0IHVzZSBhIHRzY29uZmlnXG4gICAgICAgIGNvbnN0IHRzQ29uZmlncyA9IFt0YXJnZXQub3B0aW9ucyB8fCB7fSwgLi4uT2JqZWN0LnZhbHVlcyh0YXJnZXQuY29uZmlndXJhdGlvbnMgfHwge30pXVxuICAgICAgICAgIC5maWx0ZXIoKG9wdCkgPT4gdHlwZW9mIG9wdD8udHNDb25maWcgPT09ICdzdHJpbmcnKVxuICAgICAgICAgIC5tYXAoKG9wdCkgPT4gKG9wdCBhcyB7IHRzQ29uZmlnOiBzdHJpbmcgfSkudHNDb25maWcpO1xuXG4gICAgICAgIGNvbnN0IHVuaXF1ZVRzQ29uZmlncyA9IG5ldyBTZXQodHNDb25maWdzKTtcbiAgICAgICAgZm9yIChjb25zdCB0c0NvbmZpZyBvZiB1bmlxdWVUc0NvbmZpZ3MpIHtcbiAgICAgICAgICBpZiAoaG9zdC5leGlzdHModHNDb25maWcpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB1bmlxdWVUc0NvbmZpZ3MuZGVsZXRlKHRzQ29uZmlnKTtcbiAgICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYCcke3RzQ29uZmlnfScgcmVmZXJlbmNlZCBpbiB0aGUgJyR7dGFyZ2V0TmFtZX0nIHRhcmdldCBkb2VzIG5vdCBleGlzdC5gLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXVuaXF1ZVRzQ29uZmlncy5zaXplKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKHRhcmdldC5idWlsZGVyIGFzIEJ1aWxkZXJzKSB7XG4gICAgICAgICAgY2FzZSBCdWlsZGVycy5TZXJ2ZXI6XG4gICAgICAgICAgY2FzZSBCdWlsZGVycy5LYXJtYTpcbiAgICAgICAgICBjYXNlIEJ1aWxkZXJzLkJyb3dzZXI6XG4gICAgICAgICAgY2FzZSBCdWlsZGVycy5OZ1BhY2thZ3I6XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRzQ29uZmlnIG9mIHVuaXF1ZVRzQ29uZmlncykge1xuICAgICAgICAgICAgICByZW1vdmVPclVwZGF0ZVRhcmdldChob3N0LCB0c0NvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlT3JVcGRhdGVUYXJnZXQoaG9zdDogVHJlZSwgdHNDb25maWdQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QganNvbiA9IG5ldyBKU09ORmlsZShob3N0LCB0c0NvbmZpZ1BhdGgpO1xuICBpZiAodHlwZW9mIGpzb24uZ2V0KFsnZXh0ZW5kcyddKSA9PT0gJ3N0cmluZycpIHtcbiAgICBqc29uLnJlbW92ZShbJ2NvbXBpbGVyT3B0aW9ucycsICd0YXJnZXQnXSk7XG4gIH0gZWxzZSB7XG4gICAgdXBkYXRlVGFyZ2V0KGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gIH1cbn1cblxuY29uc3QgRVNORVhUX0VTMjAyMl9SRUdFWFAgPSAvXmVzKD86bmV4dHwyMDIyKSQvaTtcbmZ1bmN0aW9uIHVwZGF0ZVRhcmdldChob3N0OiBUcmVlLCB0c0NvbmZpZ1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBqc29uID0gbmV3IEpTT05GaWxlKGhvc3QsIHRzQ29uZmlnUGF0aCk7XG4gIGNvbnN0IGpzb25QYXRoID0gWydjb21waWxlck9wdGlvbnMnXTtcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0ganNvbi5nZXQoanNvblBhdGgpO1xuXG4gIGlmIChjb21waWxlck9wdGlvbnMgJiYgdHlwZW9mIGNvbXBpbGVyT3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCB7IHRhcmdldCB9ID0gY29tcGlsZXJPcHRpb25zIGFzIEpzb25PYmplY3Q7XG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycgJiYgIUVTTkVYVF9FUzIwMjJfUkVHRVhQLnRlc3QodGFyZ2V0KSkge1xuICAgICAganNvbi5tb2RpZnkoanNvblBhdGgsIHtcbiAgICAgICAgLi4uY29tcGlsZXJPcHRpb25zLFxuICAgICAgICAndGFyZ2V0JzogJ0VTMjAyMicsXG4gICAgICAgICd1c2VEZWZpbmVGb3JDbGFzc0ZpZWxkcyc6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iXX0=