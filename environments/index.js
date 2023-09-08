"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("@schematics/angular/utility");
const path_1 = require("path");
const ENVIRONMENTS_DIRECTORY = 'environments';
const ENVIRONMENT_FILE_CONTENT = 'export const environment = {};\n';
function default_1(options) {
    return (0, utility_1.updateWorkspace)((workspace) => {
        const project = workspace.projects.get(options.project);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project name "${options.project}" doesn't not exist.`);
        }
        const type = project.extensions['projectType'];
        if (type !== 'application') {
            return log('error', 'Only application project types are support by this schematic.' + type
                ? ` Project "${options.project}" has a "projectType" of "${type}".`
                : ` Project "${options.project}" has no "projectType" defined.`);
        }
        const buildTarget = project.targets.get('build');
        if (!buildTarget) {
            return log('error', `No "build" target found for project "${options.project}".` +
                ' A "build" target is required to generate environment files.');
        }
        const serverTarget = project.targets.get('server');
        const sourceRoot = project.sourceRoot ?? path_1.posix.join(project.root, 'src');
        // The generator needs to be iterated prior to returning to ensure all workspace changes that occur
        // within the generator are present for `updateWorkspace` when it writes the workspace file.
        return (0, schematics_1.chain)([
            ...generateConfigurationEnvironments(buildTarget, serverTarget, sourceRoot, options.project),
        ]);
    });
}
exports.default = default_1;
function createIfMissing(path) {
    return (tree, context) => {
        if (tree.exists(path)) {
            context.logger.info(`Skipping creation of already existing environment file "${path}".`);
        }
        else {
            tree.create(path, ENVIRONMENT_FILE_CONTENT);
        }
    };
}
function log(type, text) {
    return (_, context) => context.logger[type](text);
}
function* generateConfigurationEnvironments(buildTarget, serverTarget, sourceRoot, projectName) {
    if (!buildTarget.builder.startsWith(utility_1.AngularBuilder.Browser)) {
        yield log('warn', `"build" target found for project "${projectName}" has a third-party builder "${buildTarget.builder}".` +
            ' The generated project options may not be compatible with this builder.');
    }
    if (serverTarget && !serverTarget.builder.startsWith(utility_1.AngularBuilder.Server)) {
        yield log('warn', `"server" target found for project "${projectName}" has a third-party builder "${buildTarget.builder}".` +
            ' The generated project options may not be compatible with this builder.');
    }
    // Create default environment file
    const defaultFilePath = path_1.posix.join(sourceRoot, ENVIRONMENTS_DIRECTORY, 'environment.ts');
    yield createIfMissing(defaultFilePath);
    const configurationEntries = [
        ...Object.entries(buildTarget.configurations ?? {}),
        ...Object.entries(serverTarget?.configurations ?? {}),
    ];
    const addedFiles = new Set();
    for (const [name, configurationOptions] of configurationEntries) {
        if (!configurationOptions) {
            // Invalid configuration
            continue;
        }
        // Default configuration will use the default environment file
        if (name === buildTarget.defaultConfiguration) {
            continue;
        }
        const configurationFilePath = path_1.posix.join(sourceRoot, ENVIRONMENTS_DIRECTORY, `environment.${name}.ts`);
        // Add file replacement option entry for the configuration environment file
        const replacements = (configurationOptions['fileReplacements'] ??= []);
        const existing = replacements.find((value) => value.replace === defaultFilePath);
        if (existing) {
            if (existing.with === configurationFilePath) {
                yield log('info', `Skipping addition of already existing file replacements option for "${defaultFilePath}" to "${configurationFilePath}".`);
            }
            else {
                yield log('warn', `Configuration "${name}" has a file replacements option for "${defaultFilePath}" but with a different replacement.` +
                    ` Expected "${configurationFilePath}" but found "${existing.with}". This may result in unexpected build behavior.`);
            }
        }
        else {
            replacements.push({ replace: defaultFilePath, with: configurationFilePath });
        }
        // Create configuration specific environment file if not already added
        if (!addedFiles.has(configurationFilePath)) {
            addedFiles.add(configurationFilePath);
            yield createIfMissing(configurationFilePath);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9zY2hlbWF0aWNzL2FuZ3VsYXIvZW52aXJvbm1lbnRzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7O0FBRUgsMkRBQThFO0FBQzlFLHlEQUFnRztBQUNoRywrQkFBcUM7QUFHckMsTUFBTSxzQkFBc0IsR0FBRyxjQUFjLENBQUM7QUFDOUMsTUFBTSx3QkFBd0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUVwRSxtQkFBeUIsT0FBMkI7SUFDbEQsT0FBTyxJQUFBLHlCQUFlLEVBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQyxpQkFBaUIsT0FBTyxDQUFDLE9BQU8sc0JBQXNCLENBQUMsQ0FBQztTQUN2RjtRQUVELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDL0MsSUFBSSxJQUFJLEtBQUssYUFBYSxFQUFFO1lBQzFCLE9BQU8sR0FBRyxDQUNSLE9BQU8sRUFDUCwrREFBK0QsR0FBRyxJQUFJO2dCQUNwRSxDQUFDLENBQUMsYUFBYSxPQUFPLENBQUMsT0FBTyw2QkFBNkIsSUFBSSxJQUFJO2dCQUNuRSxDQUFDLENBQUMsYUFBYSxPQUFPLENBQUMsT0FBTyxpQ0FBaUMsQ0FDbEUsQ0FBQztTQUNIO1FBRUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixPQUFPLEdBQUcsQ0FDUixPQUFPLEVBQ1Asd0NBQXdDLE9BQU8s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RUFDdEIsZUFBZSxJQUFJLEtBQUssQ0FDekIsQ0FBQztRQUVGLDJFQUEyRTtRQUMzRSxNQUFNLFlBQVksR0FBRyxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUdsRSxDQUFDO1FBQ0osTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxlQUFlLENBQUMsQ0FBQztRQUNqRixJQUFJLFFBQVEsRUFBRTtZQUNaLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxxQkFBcUIsRUFBRTtnQkFDM0MsTUFBTSxHQUFHLENBQ1AsTUFBTSxFQUNOLHVFQUF1RSxlQUFlLFNBQVMscUJBQXFCLElBQUksQ0FDekgsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLE1BQU0sR0FBRyxDQUNQLE1BQU0sRUFDTixrQkFBa0IsSUFBSSx5Q0FBeUMsZUFBZSxxQ0FBcUM7b0JBQ2pILGNBQWMscUJBQXFCLGdCQUFnQixRQUFRLENBQUMsSUFBSSxrREFBa0QsQ0FDckgsQ0FBQzthQUNIO1NBQ0Y7YUFBTTtZQUNMLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7U0FDOUU7UUFFRCxzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRTtZQUMxQyxVQUFVLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDdEMsTUFBTSxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztTQUM5QztLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBSdWxlLCBTY2hlbWF0aWNzRXhjZXB0aW9uLCBjaGFpbiB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyLCBUYXJnZXREZWZpbml0aW9uLCB1cGRhdGVXb3Jrc3BhY2UgfSBmcm9tICdAc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHknO1xuaW1wb3J0IHsgcG9zaXggYXMgcGF0aCB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEVudmlyb25tZW50T3B0aW9ucyB9IGZyb20gJy4vc2NoZW1hJztcblxuY29uc3QgRU5WSVJPTk1FTlRTX0RJUkVDVE9SWSA9ICdlbnZpcm9ubWVudHMnO1xuY29uc3QgRU5WSVJPTk1FTlRfRklMRV9DT05URU5UID0gJ2V4cG9ydCBjb25zdCBlbnZpcm9ubWVudCA9IHt9O1xcbic7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHRpb25zOiBFbnZpcm9ubWVudE9wdGlvbnMpOiBSdWxlIHtcbiAgcmV0dXJuIHVwZGF0ZVdvcmtzcGFjZSgod29ya3NwYWNlKSA9PiB7XG4gICAgY29uc3QgcHJvamVjdCA9IHdvcmtzcGFjZS5wcm9qZWN0cy5nZXQob3B0aW9ucy5wcm9qZWN0KTtcbiAgICBpZiAoIXByb2plY3QpIHtcbiAgICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBQcm9qZWN0IG5hbWUgXCIke29wdGlvbnMucHJvamVjdH1cIiBkb2Vzbid0IG5vdCBleGlzdC5gKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gcHJvamVjdC5leHRlbnNpb25zWydwcm9qZWN0VHlwZSddO1xuICAgIGlmICh0eXBlICE9PSAnYXBwbGljYXRpb24nKSB7XG4gICAgICByZXR1cm4gbG9nKFxuICAgICAgICAnZXJyb3InLFxuICAgICAgICAnT25seSBhcHBsaWNhdGlvbiBwcm9qZWN0IHR5cGVzIGFyZSBzdXBwb3J0IGJ5IHRoaXMgc2NoZW1hdGljLicgKyB0eXBlXG4gICAgICAgICAgPyBgIFByb2plY3QgXCIke29wdGlvbnMucHJvamVjdH1cIiBoYXMgYSBcInByb2plY3RUeXBlXCIgb2YgXCIke3R5cGV9XCIuYFxuICAgICAgICAgIDogYCBQcm9qZWN0IFwiJHtvcHRpb25zLnByb2plY3R9XCIgaGFzIG5vIFwicHJvamVjdFR5cGVcIiBkZWZpbmVkLmAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkVGFyZ2V0ID0gcHJvamVjdC50YXJnZXRzLmdldCgnYnVpbGQnKTtcbiAgICBpZiAoIWJ1aWxkVGFyZ2V0KSB7XG4gICAgICByZXR1cm4gbG9nKFxuICAgICAgICAnZXJyb3InLFxuICAgICAgICBgTm8gXCJidWlsZFwiIHRhcmdldCBmb3VuZCBmb3IgcHJvamVjdCBcIiR7b3B0aW9ucy5wcm9qZWN0fVwiLmAgK1xuICAgICAgICAgICcgQSBcImJ1aWxkXCIgdGFyZ2V0IGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIGVudmlyb25tZW50IGZpbGVzLicsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlclRhcmdldCA9IHByb2plY3QudGFyZ2V0cy5nZXQoJ3NlcnZlcicpO1xuXG4gICAgY29uc3Qgc291cmNlUm9vdCA9IHByb2plY3Quc291cmNlUm9vdCA/PyBwYXRoLmpvaW4ocHJvamVjdC5yb290LCAnc3JjJyk7XG5cbiAgICAvLyBUaGUgZ2VuZXJhdG9yIG5lZWRzIHRvIGJlIGl0ZXJhdGVkIHByaW9yIHRvIHJldHVybmluZyB0byBlbnN1cmUgYWxsIHdvcmtzcGFjZSBjaGFuZ2VzIHRoYXQgb2NjdXJcbiAgICAvLyB3aXRoaW4gdGhlIGdlbmVyYXRvciBhcmUgcHJlc2VudCBmb3IgYHVwZGF0ZVdvcmtzcGFjZWAgd2hlbiBpdCB3cml0ZXMgdGhlIHdvcmtzcGFjZSBmaWxlLlxuICAgIHJldHVybiBjaGFpbihbXG4gICAgICAuLi5nZW5lcmF0ZUNvbmZpZ3VyYXRpb25FbnZpcm9ubWVudHMoYnVpbGRUYXJnZXQsIHNlcnZlclRhcmdldCwgc291cmNlUm9vdCwgb3B0aW9ucy5wcm9qZWN0KSxcbiAgICBdKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUlmTWlzc2luZyhwYXRoOiBzdHJpbmcpOiBSdWxlIHtcbiAgcmV0dXJuICh0cmVlLCBjb250ZXh0KSA9PiB7XG4gICAgaWYgKHRyZWUuZXhpc3RzKHBhdGgpKSB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGBTa2lwcGluZyBjcmVhdGlvbiBvZiBhbHJlYWR5IGV4aXN0aW5nIGVudmlyb25tZW50IGZpbGUgXCIke3BhdGh9XCIuYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyZWUuY3JlYXRlKHBhdGgsIEVOVklST05NRU5UX0ZJTEVfQ09OVEVOVCk7XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBsb2codHlwZTogJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJywgdGV4dDogc3RyaW5nKTogUnVsZSB7XG4gIHJldHVybiAoXywgY29udGV4dCkgPT4gY29udGV4dC5sb2dnZXJbdHlwZV0odGV4dCk7XG59XG5cbmZ1bmN0aW9uKiBnZW5lcmF0ZUNvbmZpZ3VyYXRpb25FbnZpcm9ubWVudHMoXG4gIGJ1aWxkVGFyZ2V0OiBUYXJnZXREZWZpbml0aW9uLFxuICBzZXJ2ZXJUYXJnZXQ6IFRhcmdldERlZmluaXRpb24gfCB1bmRlZmluZWQsXG4gIHNvdXJjZVJvb3Q6IHN0cmluZyxcbiAgcHJvamVjdE5hbWU6IHN0cmluZyxcbik6IEl0ZXJhYmxlPFJ1bGU+IHtcbiAgaWYgKCFidWlsZFRhcmdldC5idWlsZGVyLnN0YXJ0c1dpdGgoQW5ndWxhckJ1aWxkZXIuQnJvd3NlcikpIHtcbiAgICB5aWVsZCBsb2coXG4gICAgICAnd2FybicsXG4gICAgICBgXCJidWlsZFwiIHRhcmdldCBmb3VuZCBmb3IgcHJvamVjdCBcIiR7cHJvamVjdE5hbWV9XCIgaGFzIGEgdGhpcmQtcGFydHkgYnVpbGRlciBcIiR7YnVpbGRUYXJnZXQuYnVpbGRlcn1cIi5gICtcbiAgICAgICAgJyBUaGUgZ2VuZXJhdGVkIHByb2plY3Qgb3B0aW9ucyBtYXkgbm90IGJlIGNvbXBhdGlibGUgd2l0aCB0aGlzIGJ1aWxkZXIuJyxcbiAgICApO1xuICB9XG5cbiAgaWYgKHNlcnZlclRhcmdldCAmJiAhc2VydmVyVGFyZ2V0LmJ1aWxkZXIuc3RhcnRzV2l0aChBbmd1bGFyQnVpbGRlci5TZXJ2ZXIpKSB7XG4gICAgeWllbGQgbG9nKFxuICAgICAgJ3dhcm4nLFxuICAgICAgYFwic2VydmVyXCIgdGFyZ2V0IGZvdW5kIGZvciBwcm9qZWN0IFwiJHtwcm9qZWN0TmFtZX1cIiBoYXMgYSB0aGlyZC1wYXJ0eSBidWlsZGVyIFwiJHtidWlsZFRhcmdldC5idWlsZGVyfVwiLmAgK1xuICAgICAgICAnIFRoZSBnZW5lcmF0ZWQgcHJvamVjdCBvcHRpb25zIG1heSBub3QgYmUgY29tcGF0aWJsZSB3aXRoIHRoaXMgYnVpbGRlci4nLFxuICAgICk7XG4gIH1cblxuICAvLyBDcmVhdGUgZGVmYXVsdCBlbnZpcm9ubWVudCBmaWxlXG4gIGNvbnN0IGRlZmF1bHRGaWxlUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBFTlZJUk9OTUVOVFNfRElSRUNUT1JZLCAnZW52aXJvbm1lbnQudHMnKTtcbiAgeWllbGQgY3JlYXRlSWZNaXNzaW5nKGRlZmF1bHRGaWxlUGF0aCk7XG5cbiAgY29uc3QgY29uZmlndXJhdGlvbkVudHJpZXMgPSBbXG4gICAgLi4uT2JqZWN0LmVudHJpZXMoYnVpbGRUYXJnZXQuY29uZmlndXJhdGlvbnMgPz8ge30pLFxuICAgIC4uLk9iamVjdC5lbnRyaWVzKHNlcnZlclRhcmdldD8uY29uZmlndXJhdGlvbnMgPz8ge30pLFxuICBdO1xuXG4gIGNvbnN0IGFkZGVkRmlsZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBbbmFtZSwgY29uZmlndXJhdGlvbk9wdGlvbnNdIG9mIGNvbmZpZ3VyYXRpb25FbnRyaWVzKSB7XG4gICAgaWYgKCFjb25maWd1cmF0aW9uT3B0aW9ucykge1xuICAgICAgLy8gSW52YWxpZCBjb25maWd1cmF0aW9uXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCB1c2UgdGhlIGRlZmF1bHQgZW52aXJvbm1lbnQgZmlsZVxuICAgIGlmIChuYW1lID09PSBidWlsZFRhcmdldC5kZWZhdWx0Q29uZmlndXJhdGlvbikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgY29uZmlndXJhdGlvbkZpbGVQYXRoID0gcGF0aC5qb2luKFxuICAgICAgc291cmNlUm9vdCxcbiAgICAgIEVOVklST05NRU5UU19ESVJFQ1RPUlksXG4gICAgICBgZW52aXJvbm1lbnQuJHtuYW1lfS50c2AsXG4gICAgKTtcblxuICAgIC8vIEFkZCBmaWxlIHJlcGxhY2VtZW50IG9wdGlvbiBlbnRyeSBmb3IgdGhlIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgZmlsZVxuICAgIGNvbnN0IHJlcGxhY2VtZW50cyA9IChjb25maWd1cmF0aW9uT3B0aW9uc1snZmlsZVJlcGxhY2VtZW50cyddID8/PSBbXSkgYXMge1xuICAgICAgcmVwbGFjZTogc3RyaW5nO1xuICAgICAgd2l0aDogc3RyaW5nO1xuICAgIH1bXTtcbiAgICBjb25zdCBleGlzdGluZyA9IHJlcGxhY2VtZW50cy5maW5kKCh2YWx1ZSkgPT4gdmFsdWUucmVwbGFjZSA9PT0gZGVmYXVsdEZpbGVQYXRoKTtcbiAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgIGlmIChleGlzdGluZy53aXRoID09PSBjb25maWd1cmF0aW9uRmlsZVBhdGgpIHtcbiAgICAgICAgeWllbGQgbG9nKFxuICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICBgU2tpcHBpbmcgYWRkaXRpb24gb2YgYWxyZWFkeSBleGlzdGluZyBmaWxlIHJlcGxhY2VtZW50cyBvcHRpb24gZm9yIFwiJHtkZWZhdWx0RmlsZVBhdGh9XCIgdG8gXCIke2NvbmZpZ3VyYXRpb25GaWxlUGF0aH1cIi5gLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgeWllbGQgbG9nKFxuICAgICAgICAgICd3YXJuJyxcbiAgICAgICAgICBgQ29uZmlndXJhdGlvbiBcIiR7bmFtZX1cIiBoYXMgYSBmaWxlIHJlcGxhY2VtZW50cyBvcHRpb24gZm9yIFwiJHtkZWZhdWx0RmlsZVBhdGh9XCIgYnV0IHdpdGggYSBkaWZmZXJlbnQgcmVwbGFjZW1lbnQuYCArXG4gICAgICAgICAgICBgIEV4cGVjdGVkIFwiJHtjb25maWd1cmF0aW9uRmlsZVBhdGh9XCIgYnV0IGZvdW5kIFwiJHtleGlzdGluZy53aXRofVwiLiBUaGlzIG1heSByZXN1bHQgaW4gdW5leHBlY3RlZCBidWlsZCBiZWhhdmlvci5gLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXBsYWNlbWVudHMucHVzaCh7IHJlcGxhY2U6IGRlZmF1bHRGaWxlUGF0aCwgd2l0aDogY29uZmlndXJhdGlvbkZpbGVQYXRoIH0pO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBjb25maWd1cmF0aW9uIHNwZWNpZmljIGVudmlyb25tZW50IGZpbGUgaWYgbm90IGFscmVhZHkgYWRkZWRcbiAgICBpZiAoIWFkZGVkRmlsZXMuaGFzKGNvbmZpZ3VyYXRpb25GaWxlUGF0aCkpIHtcbiAgICAgIGFkZGVkRmlsZXMuYWRkKGNvbmZpZ3VyYXRpb25GaWxlUGF0aCk7XG4gICAgICB5aWVsZCBjcmVhdGVJZk1pc3NpbmcoY29uZmlndXJhdGlvbkZpbGVQYXRoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==