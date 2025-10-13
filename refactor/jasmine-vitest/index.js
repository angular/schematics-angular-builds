"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const schematics_1 = require("@angular-devkit/schematics");
const workspace_1 = require("../../utility/workspace");
const test_file_transformer_1 = require("./test-file-transformer");
const refactor_reporter_1 = require("./utils/refactor-reporter");
async function getProjectRoot(tree, projectName) {
    const workspace = await (0, workspace_1.getWorkspace)(tree);
    let project;
    if (projectName) {
        project = workspace.projects.get(projectName);
        if (!project) {
            throw new schematics_1.SchematicsException(`Project "${projectName}" not found.`);
        }
    }
    else {
        if (workspace.projects.size === 1) {
            project = workspace.projects.values().next().value;
        }
        else {
            const projectNames = Array.from(workspace.projects.keys());
            throw new schematics_1.SchematicsException(`Multiple projects found: [${projectNames.join(', ')}]. Please specify a project name.`);
        }
    }
    if (!project) {
        // This case should theoretically not be hit due to the checks above, but it's good for type safety.
        throw new schematics_1.SchematicsException('Could not determine a project.');
    }
    return project.root;
}
const DIRECTORIES_TO_SKIP = new Set(['node_modules', '.git', 'dist', '.angular']);
function findTestFiles(directory, fileSuffix) {
    const files = [];
    const stack = [directory];
    let current;
    while ((current = stack.pop())) {
        for (const path of current.subfiles) {
            if (path.endsWith(fileSuffix)) {
                files.push(current.path + '/' + path);
            }
        }
        for (const path of current.subdirs) {
            if (DIRECTORIES_TO_SKIP.has(path)) {
                continue;
            }
            stack.push(current.dir(path));
        }
    }
    return files;
}
function default_1(options) {
    return async (tree, context) => {
        const reporter = new refactor_reporter_1.RefactorReporter(context.logger);
        const projectRoot = await getProjectRoot(tree, options.project);
        const fileSuffix = options.fileSuffix ?? '.spec.ts';
        const files = findTestFiles(tree.getDir(projectRoot), fileSuffix);
        if (files.length === 0) {
            throw new schematics_1.SchematicsException(`No files ending with '${fileSuffix}' found in project '${options.project}'.`);
        }
        for (const file of files) {
            reporter.incrementScannedFiles();
            const content = tree.readText(file);
            const newContent = (0, test_file_transformer_1.transformJasmineToVitest)(file, content, reporter);
            if (content !== newContent) {
                tree.overwrite(file, newContent);
                reporter.incrementTransformedFiles();
            }
        }
        reporter.printSummary(options.verbose);
    };
}
//# sourceMappingURL=index.js.map