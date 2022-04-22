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
const schematics_1 = require("@angular-devkit/schematics");
const parse_name_1 = require("../utility/parse-name");
const paths_1 = require("../utility/paths");
const workspace_1 = require("../utility/workspace");
function addSnippet(options) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        if (options.path === undefined) {
            return;
        }
        const fileRegExp = new RegExp(`^${options.name}.*\\.ts`);
        const siblingModules = host
            .getDir(options.path)
            .subfiles // Find all files that start with the same name, are ts files,
            // and aren't spec or module files.
            .filter((f) => fileRegExp.test(f) && !/(module|spec)\.ts$/.test(f))
            // Sort alphabetically for consistency.
            .sort();
        if (siblingModules.length === 0) {
            // No module to add in.
            return;
        }
        const siblingModulePath = `${options.path}/${siblingModules[0]}`;
        const logMessage = 'console.log(`page got message: ${data}`);';
        const workerCreationSnippet = core_1.tags.stripIndent `
      if (typeof Worker !== 'undefined') {
        // Create a new
        const worker = new Worker(new URL('./${options.name}.worker', import.meta.url));
        worker.onmessage = ({ data }) => {
          ${logMessage}
        };
        worker.postMessage('hello');
      } else {
        // Web Workers are not supported in this environment.
        // You should add a fallback so that your program still executes correctly.
      }
    `;
        // Append the worker creation snippet.
        const originalContent = host.read(siblingModulePath);
        host.overwrite(siblingModulePath, originalContent + '\n' + workerCreationSnippet);
        return host;
    };
}
function default_1(options) {
    return async (host) => {
        const workspace = await (0, workspace_1.getWorkspace)(host);
        if (!options.project) {
            throw new schematics_1.SchematicsException('Option "project" is required.');
        }
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        const projectType = project.extensions['projectType'];
        if (projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Web Worker requires a project type of "application".`);
        }
        if (options.path === undefined) {
            options.path = (0, workspace_1.buildDefaultPath)(project);
        }
        const parsedPath = (0, parse_name_1.parseName)(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        const templateSourceWorkerCode = (0, schematics_1.apply)((0, schematics_1.url)('./files/worker'), [
            (0, schematics_1.applyTemplates)({ ...options, ...schematics_1.strings }),
            (0, schematics_1.move)(parsedPath.path),
        ]);
        const root = project.root || '';
        const templateSourceWorkerConfig = (0, schematics_1.apply)((0, schematics_1.url)('./files/worker-tsconfig'), [
            (0, schematics_1.applyTemplates)({
                ...options,
                relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(root),
            }),
            (0, schematics_1.move)(root),
        ]);
        return (0, schematics_1.chain)([
            // Add project configuration.
            (0, workspace_1.updateWorkspace)((workspace) => {
                var _a, _b, _c, _d;
                var _e, _f;
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const project = workspace.projects.get(options.project);
                const buildTarget = project.targets.get('build');
                const testTarget = project.targets.get('test');
                if (!buildTarget) {
                    throw new Error(`Build target is not defined for this project.`);
                }
                const workerConfigPath = (0, core_1.join)((0, core_1.normalize)(root), 'tsconfig.worker.json');
                (_b = (_e = ((_a = buildTarget.options) !== null && _a !== void 0 ? _a : (buildTarget.options = {}))).webWorkerTsConfig) !== null && _b !== void 0 ? _b : (_e.webWorkerTsConfig = workerConfigPath);
                if (testTarget) {
                    (_d = (_f = ((_c = testTarget.options) !== null && _c !== void 0 ? _c : (testTarget.options = {}))).webWorkerTsConfig) !== null && _d !== void 0 ? _d : (_f.webWorkerTsConfig = workerConfigPath);
                }
            }),
            // Create the worker in a sibling module.
            options.snippet ? addSnippet(options) : (0, schematics_1.noop)(),
            // Add the worker.
            (0, schematics_1.mergeWith)(templateSourceWorkerCode),
            (0, schematics_1.mergeWith)(templateSourceWorkerConfig),
        ]);
    };
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvd2ViLXdvcmtlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUE2RDtBQUM3RCwyREFhb0M7QUFDcEMsc0RBQWtEO0FBQ2xELDRDQUErRDtBQUMvRCxvREFBdUY7QUFHdkYsU0FBUyxVQUFVLENBQUMsT0FBeUI7SUFDM0MsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUzQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzlCLE9BQU87U0FDUjtRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxjQUFjLEdBQUcsSUFBSTthQUN4QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzthQUNwQixRQUFRLENBQUMsOERBQThEO1lBQ3hFLG1DQUFtQzthQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsdUNBQXVDO2FBQ3RDLElBQUksRUFBRSxDQUFDO1FBRVYsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvQix1QkFBdUI7WUFDdkIsT0FBTztTQUNSO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakUsTUFBTSxVQUFVLEdBQUcs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QU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLENBQUMsV0FBVyxFQUFFO29CQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7aUJBQ2xFO2dCQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBQSxXQUFJLEVBQUMsSUFBQSxnQkFBUyxFQUFDLElBQUksQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUM7Z0JBQ3ZFLFlBQUEsT0FBQyxXQUFXLENBQUMsT0FBTyxvQ0FBbkIsV0FBVyxDQUFDLE9BQU8sR0FBSyxFQUFFLEVBQUMsRUFBQyxpQkFBaUIsdUNBQWpCLGlCQUFpQixHQUFLLGdCQUFnQixFQUFDO2dCQUNwRSxJQUFJLFVBQVUsRUFBRTtvQkFDZCxZQUFBLE9BQUMsVUFBVSxDQUFDLE9BQU8sb0NBQWxCLFVBQVUsQ0FBQyxPQUFPLEdBQUssRUFBRSxFQUFDLEVBQUMsaUJBQWlCLHVDQUFqQixpQkFBaUIsR0FBSyxnQkFBZ0IsRUFBQztpQkFDcEU7WUFDSCxDQUFDLENBQUM7WUFDRix5Q0FBeUM7WUFDekMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGlCQUFJLEdBQUU7WUFDOUMsa0JBQWtCO1lBQ2xCLElBQUEsc0JBQVMsRUFBQyx3QkFBd0IsQ0FBQztZQUNuQyxJQUFBLHNCQUFTLEVBQUMsMEJBQTBCLENBQUM7U0FDdEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQS9ERCw0QkErREMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgam9pbiwgbm9ybWFsaXplLCB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHtcbiAgUnVsZSxcbiAgU2NoZW1hdGljQ29udGV4dCxcbiAgU2NoZW1hdGljc0V4Y2VwdGlvbixcbiAgVHJlZSxcbiAgYXBwbHksXG4gIGFwcGx5VGVtcGxhdGVzLFxuICBjaGFpbixcbiAgbWVyZ2VXaXRoLFxuICBtb3ZlLFxuICBub29wLFxuICBzdHJpbmdzLFxuICB1cmwsXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IHBhcnNlTmFtZSB9IGZyb20gJy4uL3V0aWxpdHkvcGFyc2UtbmFtZSc7XG5pbXBvcnQgeyByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3QgfSBmcm9tICcuLi91dGlsaXR5L3BhdGhzJztcbmltcG9ydCB7IGJ1aWxkRGVmYXVsdFBhdGgsIGdldFdvcmtzcGFjZSwgdXBkYXRlV29ya3NwYWNlIH0gZnJvbSAnLi4vdXRpbGl0eS93b3Jrc3BhY2UnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFdlYldvcmtlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmZ1bmN0aW9uIGFkZFNuaXBwZXQob3B0aW9uczogV2ViV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gKGhvc3Q6IFRyZWUsIGNvbnRleHQ6IFNjaGVtYXRpY0NvbnRleHQpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnVXBkYXRpbmcgYXBwbW9kdWxlJyk7XG5cbiAgICBpZiAob3B0aW9ucy5wYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlUmVnRXhwID0gbmV3IFJlZ0V4cChgXiR7b3B0aW9ucy5uYW1lfS4qXFxcXC50c2ApO1xuICAgIGNvbnN0IHNpYmxpbmdNb2R1bGVzID0gaG9zdFxuICAgICAgLmdldERpcihvcHRpb25zLnBhdGgpXG4gICAgICAuc3ViZmlsZXMgLy8gRmluZCBhbGwgZmlsZXMgdGhhdCBzdGFydCB3aXRoIHRoZSBzYW1lIG5hbWUsIGFyZSB0cyBmaWxlcyxcbiAgICAgIC8vIGFuZCBhcmVuJ3Qgc3BlYyBvciBtb2R1bGUgZmlsZXMuXG4gICAgICAuZmlsdGVyKChmKSA9PiBmaWxlUmVnRXhwLnRlc3QoZikgJiYgIS8obW9kdWxlfHNwZWMpXFwudHMkLy50ZXN0KGYpKVxuICAgICAgLy8gU29ydCBhbHBoYWJldGljYWxseSBmb3IgY29uc2lzdGVuY3kuXG4gICAgICAuc29ydCgpO1xuXG4gICAgaWYgKHNpYmxpbmdNb2R1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gTm8gbW9kdWxlIHRvIGFkZCBpbi5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzaWJsaW5nTW9kdWxlUGF0aCA9IGAke29wdGlvbnMucGF0aH0vJHtzaWJsaW5nTW9kdWxlc1swXX1gO1xuICAgIGNvbnN0IGxvZ01lc3NhZ2UgPSAnY29uc29sZS5sb2coYHBhZ2UgZ290IG1lc3NhZ2U6ICR7ZGF0YX1gKTsnO1xuICAgIGNvbnN0IHdvcmtlckNyZWF0aW9uU25pcHBldCA9IHRhZ3Muc3RyaXBJbmRlbnRgXG4gICAgICBpZiAodHlwZW9mIFdvcmtlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3XG4gICAgICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIobmV3IFVSTCgnLi8ke29wdGlvbnMubmFtZX0ud29ya2VyJywgaW1wb3J0Lm1ldGEudXJsKSk7XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSAoeyBkYXRhIH0pID0+IHtcbiAgICAgICAgICAke2xvZ01lc3NhZ2V9XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5wb3N0TWVzc2FnZSgnaGVsbG8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlYiBXb3JrZXJzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgZW52aXJvbm1lbnQuXG4gICAgICAgIC8vIFlvdSBzaG91bGQgYWRkIGEgZmFsbGJhY2sgc28gdGhhdCB5b3VyIHByb2dyYW0gc3RpbGwgZXhlY3V0ZXMgY29ycmVjdGx5LlxuICAgICAgfVxuICAgIGA7XG5cbiAgICAvLyBBcHBlbmQgdGhlIHdvcmtlciBjcmVhdGlvbiBzbmlwcGV0LlxuICAgIGNvbnN0IG9yaWdpbmFsQ29udGVudCA9IGhvc3QucmVhZChzaWJsaW5nTW9kdWxlUGF0aCk7XG4gICAgaG9zdC5vdmVyd3JpdGUoc2libGluZ01vZHVsZVBhdGgsIG9yaWdpbmFsQ29udGVudCArICdcXG4nICsgd29ya2VyQ3JlYXRpb25TbmlwcGV0KTtcblxuICAgIHJldHVybiBob3N0O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0aW9uczogV2ViV29ya2VyT3B0aW9ucyk6IFJ1bGUge1xuICByZXR1cm4gYXN5bmMgKGhvc3Q6IFRyZWUpID0+IHtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCBnZXRXb3Jrc3BhY2UoaG9zdCk7XG5cbiAgICBpZiAoIW9wdGlvbnMucHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oJ09wdGlvbiBcInByb2plY3RcIiBpcyByZXF1aXJlZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpO1xuICAgIGlmICghcHJvamVjdCkge1xuICAgICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oYEludmFsaWQgcHJvamVjdCBuYW1lICgke29wdGlvbnMucHJvamVjdH0pYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdFR5cGUgPSBwcm9qZWN0LmV4dGVuc2lvbnNbJ3Byb2plY3RUeXBlJ107XG4gICAgaWYgKHByb2plY3RUeXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgV2ViIFdvcmtlciByZXF1aXJlcyBhIHByb2plY3QgdHlwZSBvZiBcImFwcGxpY2F0aW9uXCIuYCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMucGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvcHRpb25zLnBhdGggPSBidWlsZERlZmF1bHRQYXRoKHByb2plY3QpO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZWRQYXRoID0gcGFyc2VOYW1lKG9wdGlvbnMucGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICBvcHRpb25zLm5hbWUgPSBwYXJzZWRQYXRoLm5hbWU7XG4gICAgb3B0aW9ucy5wYXRoID0gcGFyc2VkUGF0aC5wYXRoO1xuXG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2VXb3JrZXJDb2RlID0gYXBwbHkodXJsKCcuL2ZpbGVzL3dvcmtlcicpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7IC4uLm9wdGlvbnMsIC4uLnN0cmluZ3MgfSksXG4gICAgICBtb3ZlKHBhcnNlZFBhdGgucGF0aCksXG4gICAgXSk7XG5cbiAgICBjb25zdCByb290ID0gcHJvamVjdC5yb290IHx8ICcnO1xuICAgIGNvbnN0IHRlbXBsYXRlU291cmNlV29ya2VyQ29uZmlnID0gYXBwbHkodXJsKCcuL2ZpbGVzL3dvcmtlci10c2NvbmZpZycpLCBbXG4gICAgICBhcHBseVRlbXBsYXRlcyh7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdDogcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290KHJvb3QpLFxuICAgICAgfSksXG4gICAgICBtb3ZlKHJvb3QpLFxuICAgIF0pO1xuXG4gICAgcmV0dXJuIGNoYWluKFtcbiAgICAgIC8vIEFkZCBwcm9qZWN0IGNvbmZpZ3VyYXRpb24uXG4gICAgICB1cGRhdGVXb3Jrc3BhY2UoKHdvcmtzcGFjZSkgPT4ge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICBjb25zdCBwcm9qZWN0ID0gd29ya3NwYWNlLnByb2plY3RzLmdldChvcHRpb25zLnByb2plY3QpITtcbiAgICAgICAgY29uc3QgYnVpbGRUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCdidWlsZCcpO1xuICAgICAgICBjb25zdCB0ZXN0VGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgndGVzdCcpO1xuICAgICAgICBpZiAoIWJ1aWxkVGFyZ2V0KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBCdWlsZCB0YXJnZXQgaXMgbm90IGRlZmluZWQgZm9yIHRoaXMgcHJvamVjdC5gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdvcmtlckNvbmZpZ1BhdGggPSBqb2luKG5vcm1hbGl6ZShyb290KSwgJ3RzY29uZmlnLndvcmtlci5qc29uJyk7XG4gICAgICAgIChidWlsZFRhcmdldC5vcHRpb25zID8/PSB7fSkud2ViV29ya2VyVHNDb25maWcgPz89IHdvcmtlckNvbmZpZ1BhdGg7XG4gICAgICAgIGlmICh0ZXN0VGFyZ2V0KSB7XG4gICAgICAgICAgKHRlc3RUYXJnZXQub3B0aW9ucyA/Pz0ge30pLndlYldvcmtlclRzQ29uZmlnID8/PSB3b3JrZXJDb25maWdQYXRoO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIC8vIENyZWF0ZSB0aGUgd29ya2VyIGluIGEgc2libGluZyBtb2R1bGUuXG4gICAgICBvcHRpb25zLnNuaXBwZXQgPyBhZGRTbmlwcGV0KG9wdGlvbnMpIDogbm9vcCgpLFxuICAgICAgLy8gQWRkIHRoZSB3b3JrZXIuXG4gICAgICBtZXJnZVdpdGgodGVtcGxhdGVTb3VyY2VXb3JrZXJDb2RlKSxcbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZVdvcmtlckNvbmZpZyksXG4gICAgXSk7XG4gIH07XG59XG4iXX0=