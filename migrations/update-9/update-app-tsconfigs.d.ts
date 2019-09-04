import { Rule } from '@angular-devkit/schematics';
/**
 * Update the tsconfig files for applications
 * - Removes enableIvy: true
 * - Sets stricter file inclusions
 */
export declare function updateApplicationTsConfigs(): Rule;
