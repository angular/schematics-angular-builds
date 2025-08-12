/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { KarmaConfigAnalysis, KarmaConfigValue } from './karma-config-analyzer';
export interface KarmaConfigDiff {
    added: Map<string, KarmaConfigValue>;
    removed: Map<string, KarmaConfigValue>;
    modified: Map<string, {
        projectValue: KarmaConfigValue;
        defaultValue: KarmaConfigValue;
    }>;
    isReliable: boolean;
}
/**
 * Generates the default Karma configuration file content as a string.
 * @param relativePathToWorkspaceRoot The relative path from the project root to the workspace root.
 * @param folderName The name of the project folder.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed.
 * @returns The content of the default `karma.conf.js` file.
 */
export declare function generateDefaultKarmaConfig(relativePathToWorkspaceRoot: string, folderName: string, needDevkitPlugin: boolean): Promise<string>;
/**
 * Compares two Karma configuration analyses and returns the difference.
 * @param projectAnalysis The analysis of the project's configuration.
 * @param defaultAnalysis The analysis of the default configuration.
 * @returns A diff object representing the changes.
 */
export declare function compareKarmaConfigs(projectAnalysis: KarmaConfigAnalysis, defaultAnalysis: KarmaConfigAnalysis): KarmaConfigDiff;
/**
 * Checks if there are any differences in the provided Karma configuration diff.
 * @param diff The Karma configuration diff object.
 * @returns True if there are any differences, false otherwise.
 */
export declare function hasDifferences(diff: KarmaConfigDiff): boolean;
/**
 * Compares a project's Karma configuration with the default configuration.
 * @param projectConfigContent The content of the project's `karma.conf.js` file.
 * @param projectRoot The root of the project's project.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed.
 * @returns A diff object representing the changes.
 */
export declare function compareKarmaConfigToDefault(projectConfigContent: string, projectRoot: string, needDevkitPlugin: boolean): Promise<KarmaConfigDiff>;
/**
 * Compares a project's Karma configuration with the default configuration.
 * @param projectAnalysis The analysis of the project's configuration.
 * @param projectRoot The root of the project's project.
 * @param needDevkitPlugin A boolean indicating if the devkit plugin is needed.
 * @returns A diff object representing the changes.
 */
export declare function compareKarmaConfigToDefault(projectAnalysis: KarmaConfigAnalysis, projectRoot: string, needDevkitPlugin: boolean): Promise<KarmaConfigDiff>;
