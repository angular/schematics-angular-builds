"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const posix_1 = require("node:path/posix");
const json_file_1 = require("../utility/json-file");
const project_1 = require("../utility/project");
const workspace_models_1 = require("../utility/workspace-models");
function updateTsConfig(packageName, ...paths) {
    return (host) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        const file = new json_file_1.JSONFile(host, 'tsconfig.json');
        const jsonPath = ['compilerOptions', 'paths', packageName];
        const value = file.get(jsonPath);
        file.modify(jsonPath, Array.isArray(value) ? Array.from(new Set([...value, ...paths])) : paths);
    };
}
exports.default = (0, project_1.createProjectSchematic)((options, { project, tree }) => {
    if (project.extensions['projectType'] !== workspace_models_1.ProjectType.Library) {
        throw new schematics_1.SchematicsException(`Project "${options.project}" is not a library project.`);
    }
    for (const target of project.targets.values()) {
        if (target.builder === workspace_models_1.Builders.NgPackagr || target.builder === workspace_models_1.Builders.BuildNgPackagr) {
            throw new schematics_1.SchematicsException(`Project "${options.project}" is using the "${target.builder}" builder, which is not supported by the entry-point schematic. ` +
                `Please migrate to "${workspace_models_1.Builders.BuildLibrary}" before generating entry points.`);
        }
    }
    if (options.name === 'package.json') {
        throw new schematics_1.SchematicsException('Entry point name "package.json" is reserved.');
    }
    const libDir = project.root;
    const packageJsonPath = (0, posix_1.join)(libDir, 'package.json');
    if (!tree.exists(packageJsonPath)) {
        throw new schematics_1.SchematicsException(`Could not find package.json at "${packageJsonPath}".`);
    }
    const packageJson = new json_file_1.JSONFile(tree, packageJsonPath);
    const rawPackageName = packageJson.get(['name']);
    const packageName = typeof rawPackageName === 'string' && rawPackageName
        ? rawPackageName
        : schematics_1.strings.dasherize(options.project);
    const isPrimary = options.name === '.';
    const entryFile = (options.entryFile ?? 'public-api').replace(/\.ts$/i, '');
    const entryPointDir = (0, posix_1.join)(libDir, options.name, 'src');
    const exportKey = isPrimary ? '.' : `./${options.name}`;
    const exportTarget = `./${(0, posix_1.relative)(libDir, (0, posix_1.join)(entryPointDir, `${entryFile}.ts`))}`;
    const existingExports = packageJson.get(['exports']) ?? null;
    let exportsObject = {};
    if (typeof existingExports === 'string' || Array.isArray(existingExports)) {
        exportsObject = { '.': existingExports };
    }
    else if ((0, core_1.isJsonObject)(existingExports)) {
        const keys = Object.keys(existingExports);
        if (keys.some((k) => k.startsWith('.'))) {
            exportsObject = { ...existingExports };
        }
        else if (keys.length > 0) {
            exportsObject = { '.': existingExports };
        }
    }
    if (Object.prototype.hasOwnProperty.call(exportsObject, exportKey)) {
        throw new schematics_1.SchematicsException(`Entry point "${exportKey}" already exists in "${packageJsonPath}".`);
    }
    if ((0, core_1.isJsonObject)(existingExports) &&
        Object.keys(existingExports).some((k) => k.startsWith('.'))) {
        packageJson.modify(['exports', exportKey], exportTarget, false);
    }
    else {
        packageJson.modify(['exports'], {
            ...exportsObject,
            [exportKey]: exportTarget,
        }, false);
    }
    const prefix = (options.prefix ?? project.prefix) || 'lib';
    const sourceDir = isPrimary ? (0, posix_1.join)(entryPointDir, 'lib') : entryPointDir;
    const artifactName = isPrimary
        ? /^@.*\/.*/.test(options.project)
            ? options.project.split('/')[1]
            : options.project
        : (0, posix_1.basename)(options.name);
    const buildOptions = project.targets.get('build')?.options;
    const distRoot = typeof buildOptions?.['outputPath'] === 'string'
        ? buildOptions['outputPath']
        : (0, posix_1.join)('dist', options.project);
    const tsConfigPathKey = isPrimary ? packageName : `${packageName}/*`;
    const tsConfigPathTarget = `./${(0, posix_1.join)(distRoot, isPrimary ? '.' : '*')}`;
    const standalone = options.standalone ?? true;
    const templateSource = (0, schematics_1.apply)((0, schematics_1.url)('../entry-point/files'), [
        (0, schematics_1.applyTemplates)({
            ...schematics_1.strings,
            ...options,
            isPrimary,
            standalone,
            name: artifactName,
            entryFile,
        }),
        (0, schematics_1.move)(entryPointDir),
    ]);
    return (0, schematics_1.chain)([
        (0, schematics_1.mergeWith)(templateSource),
        options.skipTsConfig ? (0, schematics_1.noop)() : updateTsConfig(tsConfigPathKey, tsConfigPathTarget),
        standalone
            ? (0, schematics_1.noop)()
            : (0, schematics_1.schematic)('module', {
                name: artifactName,
                commonModule: false,
                flat: true,
                path: sourceDir,
                project: options.project,
                // Explicitly set the `typeSeparator` this also ensures that the generated files are valid even if the `module` schematic
                // inherits its `typeSeparator` from the workspace.
                typeSeparator: '-',
            }),
        (0, schematics_1.schematic)('component', {
            name: artifactName,
            selector: `${prefix}-${schematics_1.strings.dasherize(artifactName)}`,
            inlineStyle: true,
            inlineTemplate: true,
            flat: true,
            path: sourceDir,
            export: true,
            standalone,
            skipTests: options.skipTests,
            project: options.project,
            // Explicitly set an empty `type` and `exportDefault: false` since they don't necessarily make
            // sense in a library and ensure that the generated files match the entry-point exports even
            // if the `component` schematic inherits options from the workspace.
            type: '',
            exportDefault: false,
        }),
    ]);
});
//# sourceMappingURL=index.js.map