"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const config_1 = require("../utility/config");
const json_utils_1 = require("../utility/json-utils");
const parse_name_1 = require("../utility/parse-name");
const project_1 = require("../utility/project");
const project_targets_1 = require("../utility/project-targets");
function getProjectConfiguration(workspace, options) {
    if (!options.target) {
        throw new schematics_1.SchematicsException('Option (target) is required.');
    }
    const projectTargets = project_targets_1.getProjectTargets(workspace, options.project);
    if (!projectTargets[options.target]) {
        throw new Error(`Target is not defined for this project.`);
    }
    const target = projectTargets[options.target];
    return target.options;
}
function addConfig(options, root) {
    return (host, context) => {
        context.logger.debug('updating project configuration.');
        const workspace = config_1.getWorkspace(host);
        const config = getProjectConfiguration(workspace, options);
        if (config.webWorkerTsConfig) {
            // Don't do anything if the configuration is already there.
            return;
        }
        const tsConfigRules = [];
        // Add tsconfig.worker.json.
        const relativePathToWorkspaceRoot = root.split('/').map(x => '..').join('/');
        tsConfigRules.push(schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/worker-tsconfig'), [
            schematics_1.applyTemplates(Object.assign({}, options, { relativePathToWorkspaceRoot })),
            schematics_1.move(root),
        ])));
        // Add build-angular config flag.
        config.webWorkerTsConfig = `${root.endsWith('/') ? root : root + '/'}tsconfig.worker.json`;
        // Add project tsconfig.json.
        // The project level tsconfig.json with webworker lib is for editor support since
        // the dom and webworker libs are mutually exclusive.
        // Note: this schematic does not change other tsconfigs to use the project-level tsconfig.
        const projectTsConfigPath = `${root}/tsconfig.json`;
        if (host.exists(projectTsConfigPath)) {
            // If the file already exists, alter it.
            const buffer = host.read(projectTsConfigPath);
            if (buffer) {
                const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
                if (tsCfgAst.kind != 'object') {
                    throw new schematics_1.SchematicsException('Invalid tsconfig. Was expecting an object');
                }
                const optsAstNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'compilerOptions');
                if (optsAstNode && optsAstNode.kind != 'object') {
                    throw new schematics_1.SchematicsException('Invalid tsconfig "compilerOptions" property; Was expecting an object.');
                }
                const libAstNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'lib');
                if (libAstNode && libAstNode.kind != 'array') {
                    throw new schematics_1.SchematicsException('Invalid tsconfig "lib" property; expected an array.');
                }
                const newLibProp = 'webworker';
                if (libAstNode && !libAstNode.value.includes(newLibProp)) {
                    const recorder = host.beginUpdate(projectTsConfigPath);
                    json_utils_1.appendValueInAstArray(recorder, libAstNode, newLibProp);
                    host.commitUpdate(recorder);
                }
            }
        }
        else {
            // Otherwise create it.
            tsConfigRules.push(schematics_1.mergeWith(schematics_1.apply(schematics_1.url('./files/project-tsconfig'), [
                schematics_1.applyTemplates(Object.assign({}, options, { relativePathToWorkspaceRoot })),
                schematics_1.move(root),
            ])));
        }
        // Add worker glob exclusion to tsconfig.app.json.
        const workerGlob = '**/*.worker.ts';
        const tsConfigPath = config.tsConfig;
        const buffer = host.read(tsConfigPath);
        if (buffer) {
            const tsCfgAst = core_1.parseJsonAst(buffer.toString(), core_1.JsonParseMode.Loose);
            if (tsCfgAst.kind != 'object') {
                throw new schematics_1.SchematicsException('Invalid tsconfig. Was expecting an object');
            }
            const filesAstNode = json_utils_1.findPropertyInAstObject(tsCfgAst, 'exclude');
            if (filesAstNode && filesAstNode.kind != 'array') {
                throw new schematics_1.SchematicsException('Invalid tsconfig "exclude" property; expected an array.');
            }
            if (filesAstNode && filesAstNode.value.indexOf(workerGlob) == -1) {
                const recorder = host.beginUpdate(tsConfigPath);
                json_utils_1.appendValueInAstArray(recorder, filesAstNode, workerGlob);
                host.commitUpdate(recorder);
            }
        }
        return schematics_1.chain([
            // Add tsconfigs.
            ...tsConfigRules,
            // Add workspace configuration.
            config_1.updateWorkspace(workspace),
        ]);
    };
}
function addSnippet(options) {
    return (host, context) => {
        context.logger.debug('Updating appmodule');
        if (options.path === undefined) {
            return;
        }
        const siblingModules = host.getDir(options.path).subfiles
            // Find all files that start with the same name, are ts files, and aren't spec files.
            .filter(f => f.startsWith(options.name) && f.endsWith('.ts') && !f.endsWith('spec.ts'))
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
        const worker = new Worker('./${options.name}.worker', { type: 'module' });
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
    return (host, context) => {
        const project = project_1.getProject(host, options.project);
        if (!options.project) {
            throw new schematics_1.SchematicsException('Option "project" is required.');
        }
        if (!project) {
            throw new schematics_1.SchematicsException(`Invalid project name (${options.project})`);
        }
        if (project.projectType !== 'application') {
            throw new schematics_1.SchematicsException(`Web Worker requires a project type of "application".`);
        }
        if (options.path === undefined) {
            options.path = project_1.buildDefaultPath(project);
        }
        const parsedPath = parse_name_1.parseName(options.path, options.name);
        options.name = parsedPath.name;
        options.path = parsedPath.path;
        const root = project.root || project.sourceRoot || '';
        const templateSource = schematics_1.apply(schematics_1.url('./files/worker'), [
            schematics_1.applyTemplates(Object.assign({}, options, core_1.strings)),
            schematics_1.move(parsedPath.path),
        ]);
        return schematics_1.chain([
            // Add project configuration.
            addConfig(options, root),
            // Create the worker in a sibling module.
            options.snippet ? addSnippet(options) : schematics_1.noop(),
            // Add the worker.
            schematics_1.mergeWith(templateSource),
        ]);
    };
}
exports.default = default_1;
