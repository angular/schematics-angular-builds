"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const schematics_1 = require("@angular-devkit/schematics");
const utility_1 = require("../utility");
const latest_versions_1 = require("../utility/latest-versions");
const project_1 = require("../utility/project");
const TAILWIND_DEPENDENCIES = ['tailwindcss', '@tailwindcss/postcss', 'postcss'];
function addTailwindImport(stylesheetPath) {
    return (tree) => {
        let stylesheetText = '';
        if (tree.exists(stylesheetPath)) {
            stylesheetText = tree.readText(stylesheetPath);
            stylesheetText += '\n';
        }
        stylesheetText += '@import "tailwindcss";\n';
        tree.overwrite(stylesheetPath, stylesheetText);
    };
}
exports.default = (0, project_1.createProjectSchematic)((options, { project }) => {
    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
        throw new schematics_1.SchematicsException(`Project "${options.project}" does not have a build target.`);
    }
    const styles = buildTarget.options?.['styles'];
    if (!styles || styles.length === 0) {
        throw new schematics_1.SchematicsException(`Project "${options.project}" does not have any global styles.`);
    }
    const stylesheetPath = styles[0];
    const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
        (0, schematics_1.applyTemplates)({
            ...schematics_1.strings,
            ...options,
        }),
        (0, schematics_1.move)(project.root),
    ]);
    return (0, schematics_1.chain)([
        addTailwindImport(stylesheetPath),
        (0, schematics_1.mergeWith)(templateSource),
        ...TAILWIND_DEPENDENCIES.map((name) => (0, utility_1.addDependency)(name, latest_versions_1.latestVersions[name], {
            type: utility_1.DependencyType.Dev,
            existing: utility_1.ExistingBehavior.Skip,
        })),
    ]);
});
