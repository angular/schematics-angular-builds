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
            (0, schematics_1.applyTemplates)({ ...options, ...core_1.strings }),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvd2ViLXdvcmtlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQUVILCtDQUFzRTtBQUN0RSwyREFZb0M7QUFDcEMsc0RBQWtEO0FBQ2xELDRDQUErRDtBQUMvRCxvREFBdUY7QUFHdkYsU0FBUyxVQUFVLENBQUMsT0FBeUI7SUFDM0MsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUF5QixFQUFFLEVBQUU7UUFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUzQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzlCLE9BQU87U0FDUjtRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUM7UUFDekQsTUFBTSxjQUFjLEdBQUcsSUFBSTthQUN4QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzthQUNwQixRQUFRLENBQUMsOERBQThEO1lBQ3hFLG1DQUFtQzthQUNsQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkUsdUNBQXVDO2FBQ3RDLElBQUksRUFBRSxDQUFDO1FBRVYsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvQix1QkFBdUI7WUFDdkIsT0FBTztTQUNSO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakUsTUFBTSxVQUFVLEdBQUcs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TyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLElBQUksQ0FBQyxXQUFXLEVBQUU7b0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztpQkFDbEU7Z0JBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLFdBQUksRUFBQyxJQUFBLGdCQUFTLEVBQUMsSUFBSSxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztnQkFDdkUsWUFBQSxPQUFDLFdBQVcsQ0FBQyxPQUFPLG9DQUFuQixXQUFXLENBQUMsT0FBTyxHQUFLLEVBQUUsRUFBQyxFQUFDLGlCQUFpQix1Q0FBakIsaUJBQWlCLEdBQUssZ0JBQWdCLEVBQUM7Z0JBQ3BFLElBQUksVUFBVSxFQUFFO29CQUNkLFlBQUEsT0FBQyxVQUFVLENBQUMsT0FBTyxvQ0FBbEIsVUFBVSxDQUFDLE9BQU8sR0FBSyxFQUFFLEVBQUMsRUFBQyxpQkFBaUIsdUNBQWpCLGlCQUFpQixHQUFLLGdCQUFnQixFQUFDO2lCQUNwRTtZQUNILENBQUMsQ0FBQztZQUNGLHlDQUF5QztZQUN6QyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQUksR0FBRTtZQUM5QyxrQkFBa0I7WUFDbEIsSUFBQSxzQkFBUyxFQUFDLHdCQUF3QixDQUFDO1lBQ25DLElBQUEsc0JBQVMsRUFBQywwQkFBMEIsQ0FBQztTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7QUFDSixDQUFDO0FBL0RELDRCQStEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBqb2luLCBub3JtYWxpemUsIHN0cmluZ3MsIHRhZ3MgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQge1xuICBSdWxlLFxuICBTY2hlbWF0aWNDb250ZXh0LFxuICBTY2hlbWF0aWNzRXhjZXB0aW9uLFxuICBUcmVlLFxuICBhcHBseSxcbiAgYXBwbHlUZW1wbGF0ZXMsXG4gIGNoYWluLFxuICBtZXJnZVdpdGgsXG4gIG1vdmUsXG4gIG5vb3AsXG4gIHVybCxcbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgcGFyc2VOYW1lIH0gZnJvbSAnLi4vdXRpbGl0eS9wYXJzZS1uYW1lJztcbmltcG9ydCB7IHJlbGF0aXZlUGF0aFRvV29ya3NwYWNlUm9vdCB9IGZyb20gJy4uL3V0aWxpdHkvcGF0aHMnO1xuaW1wb3J0IHsgYnVpbGREZWZhdWx0UGF0aCwgZ2V0V29ya3NwYWNlLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICcuLi91dGlsaXR5L3dvcmtzcGFjZSc7XG5pbXBvcnQgeyBTY2hlbWEgYXMgV2ViV29ya2VyT3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuZnVuY3Rpb24gYWRkU25pcHBldChvcHRpb25zOiBXZWJXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiAoaG9zdDogVHJlZSwgY29udGV4dDogU2NoZW1hdGljQ29udGV4dCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKCdVcGRhdGluZyBhcHBtb2R1bGUnKTtcblxuICAgIGlmIChvcHRpb25zLnBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVSZWdFeHAgPSBuZXcgUmVnRXhwKGBeJHtvcHRpb25zLm5hbWV9LipcXFxcLnRzYCk7XG4gICAgY29uc3Qgc2libGluZ01vZHVsZXMgPSBob3N0XG4gICAgICAuZ2V0RGlyKG9wdGlvbnMucGF0aClcbiAgICAgIC5zdWJmaWxlcyAvLyBGaW5kIGFsbCBmaWxlcyB0aGF0IHN0YXJ0IHdpdGggdGhlIHNhbWUgbmFtZSwgYXJlIHRzIGZpbGVzLFxuICAgICAgLy8gYW5kIGFyZW4ndCBzcGVjIG9yIG1vZHVsZSBmaWxlcy5cbiAgICAgIC5maWx0ZXIoKGYpID0+IGZpbGVSZWdFeHAudGVzdChmKSAmJiAhLyhtb2R1bGV8c3BlYylcXC50cyQvLnRlc3QoZikpXG4gICAgICAvLyBTb3J0IGFscGhhYmV0aWNhbGx5IGZvciBjb25zaXN0ZW5jeS5cbiAgICAgIC5zb3J0KCk7XG5cbiAgICBpZiAoc2libGluZ01vZHVsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBObyBtb2R1bGUgdG8gYWRkIGluLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNpYmxpbmdNb2R1bGVQYXRoID0gYCR7b3B0aW9ucy5wYXRofS8ke3NpYmxpbmdNb2R1bGVzWzBdfWA7XG4gICAgY29uc3QgbG9nTWVzc2FnZSA9ICdjb25zb2xlLmxvZyhgcGFnZSBnb3QgbWVzc2FnZTogJHtkYXRhfWApOyc7XG4gICAgY29uc3Qgd29ya2VyQ3JlYXRpb25TbmlwcGV0ID0gdGFncy5zdHJpcEluZGVudGBcbiAgICAgIGlmICh0eXBlb2YgV29ya2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXdcbiAgICAgICAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihuZXcgVVJMKCcuLyR7b3B0aW9ucy5uYW1lfS53b3JrZXInLCBpbXBvcnQubWV0YS51cmwpKTtcbiAgICAgICAgd29ya2VyLm9ubWVzc2FnZSA9ICh7IGRhdGEgfSkgPT4ge1xuICAgICAgICAgICR7bG9nTWVzc2FnZX1cbiAgICAgICAgfTtcbiAgICAgICAgd29ya2VyLnBvc3RNZXNzYWdlKCdoZWxsbycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gV2ViIFdvcmtlcnMgYXJlIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBlbnZpcm9ubWVudC5cbiAgICAgICAgLy8gWW91IHNob3VsZCBhZGQgYSBmYWxsYmFjayBzbyB0aGF0IHlvdXIgcHJvZ3JhbSBzdGlsbCBleGVjdXRlcyBjb3JyZWN0bHkuXG4gICAgICB9XG4gICAgYDtcblxuICAgIC8vIEFwcGVuZCB0aGUgd29ya2VyIGNyZWF0aW9uIHNuaXBwZXQuXG4gICAgY29uc3Qgb3JpZ2luYWxDb250ZW50ID0gaG9zdC5yZWFkKHNpYmxpbmdNb2R1bGVQYXRoKTtcbiAgICBob3N0Lm92ZXJ3cml0ZShzaWJsaW5nTW9kdWxlUGF0aCwgb3JpZ2luYWxDb250ZW50ICsgJ1xcbicgKyB3b3JrZXJDcmVhdGlvblNuaXBwZXQpO1xuXG4gICAgcmV0dXJuIGhvc3Q7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBXZWJXb3JrZXJPcHRpb25zKTogUnVsZSB7XG4gIHJldHVybiBhc3luYyAoaG9zdDogVHJlZSkgPT4ge1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IGdldFdvcmtzcGFjZShob3N0KTtcblxuICAgIGlmICghb3B0aW9ucy5wcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbignT3B0aW9uIFwicHJvamVjdFwiIGlzIHJlcXVpcmVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCk7XG4gICAgaWYgKCFwcm9qZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgSW52YWxpZCBwcm9qZWN0IG5hbWUgKCR7b3B0aW9ucy5wcm9qZWN0fSlgKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0VHlwZSA9IHByb2plY3QuZXh0ZW5zaW9uc1sncHJvamVjdFR5cGUnXTtcbiAgICBpZiAocHJvamVjdFR5cGUgIT09ICdhcHBsaWNhdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBXZWIgV29ya2VyIHJlcXVpcmVzIGEgcHJvamVjdCB0eXBlIG9mIFwiYXBwbGljYXRpb25cIi5gKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5wYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG9wdGlvbnMucGF0aCA9IGJ1aWxkRGVmYXVsdFBhdGgocHJvamVjdCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZFBhdGggPSBwYXJzZU5hbWUob3B0aW9ucy5wYXRoLCBvcHRpb25zLm5hbWUpO1xuICAgIG9wdGlvbnMubmFtZSA9IHBhcnNlZFBhdGgubmFtZTtcbiAgICBvcHRpb25zLnBhdGggPSBwYXJzZWRQYXRoLnBhdGg7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZVdvcmtlckNvZGUgPSBhcHBseSh1cmwoJy4vZmlsZXMvd29ya2VyJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHsgLi4ub3B0aW9ucywgLi4uc3RyaW5ncyB9KSxcbiAgICAgIG1vdmUocGFyc2VkUGF0aC5wYXRoKSxcbiAgICBdKTtcblxuICAgIGNvbnN0IHJvb3QgPSBwcm9qZWN0LnJvb3QgfHwgJyc7XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2VXb3JrZXJDb25maWcgPSBhcHBseSh1cmwoJy4vZmlsZXMvd29ya2VyLXRzY29uZmlnJyksIFtcbiAgICAgIGFwcGx5VGVtcGxhdGVzKHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgcmVsYXRpdmVQYXRoVG9Xb3Jrc3BhY2VSb290OiByZWxhdGl2ZVBhdGhUb1dvcmtzcGFjZVJvb3Qocm9vdCksXG4gICAgICB9KSxcbiAgICAgIG1vdmUocm9vdCksXG4gICAgXSk7XG5cbiAgICByZXR1cm4gY2hhaW4oW1xuICAgICAgLy8gQWRkIHByb2plY3QgY29uZmlndXJhdGlvbi5cbiAgICAgIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIGNvbnN0IHByb2plY3QgPSB3b3Jrc3BhY2UucHJvamVjdHMuZ2V0KG9wdGlvbnMucHJvamVjdCkhO1xuICAgICAgICBjb25zdCBidWlsZFRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ2J1aWxkJyk7XG4gICAgICAgIGNvbnN0IHRlc3RUYXJnZXQgPSBwcm9qZWN0LnRhcmdldHMuZ2V0KCd0ZXN0Jyk7XG4gICAgICAgIGlmICghYnVpbGRUYXJnZXQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJ1aWxkIHRhcmdldCBpcyBub3QgZGVmaW5lZCBmb3IgdGhpcyBwcm9qZWN0LmApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgd29ya2VyQ29uZmlnUGF0aCA9IGpvaW4obm9ybWFsaXplKHJvb3QpLCAndHNjb25maWcud29ya2VyLmpzb24nKTtcbiAgICAgICAgKGJ1aWxkVGFyZ2V0Lm9wdGlvbnMgPz89IHt9KS53ZWJXb3JrZXJUc0NvbmZpZyA/Pz0gd29ya2VyQ29uZmlnUGF0aDtcbiAgICAgICAgaWYgKHRlc3RUYXJnZXQpIHtcbiAgICAgICAgICAodGVzdFRhcmdldC5vcHRpb25zID8/PSB7fSkud2ViV29ya2VyVHNDb25maWcgPz89IHdvcmtlckNvbmZpZ1BhdGg7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgLy8gQ3JlYXRlIHRoZSB3b3JrZXIgaW4gYSBzaWJsaW5nIG1vZHVsZS5cbiAgICAgIG9wdGlvbnMuc25pcHBldCA/IGFkZFNuaXBwZXQob3B0aW9ucykgOiBub29wKCksXG4gICAgICAvLyBBZGQgdGhlIHdvcmtlci5cbiAgICAgIG1lcmdlV2l0aCh0ZW1wbGF0ZVNvdXJjZVdvcmtlckNvZGUpLFxuICAgICAgbWVyZ2VXaXRoKHRlbXBsYXRlU291cmNlV29ya2VyQ29uZmlnKSxcbiAgICBdKTtcbiAgfTtcbn1cbiJdfQ==