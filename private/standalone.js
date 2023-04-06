"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBootstrapApplicationCall = exports.addFunctionalProvidersToStandaloneBootstrap = exports.addModuleImportToStandaloneBootstrap = exports.callsProvidersFunction = exports.importsProvidersFrom = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const path_1 = require("path");
const typescript_1 = __importDefault(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const ast_utils_1 = require("../utility/ast-utils");
const change_1 = require("../utility/change");
/**
 * Checks whether the providers from a module are being imported in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param className Class name of the module to search for.
 */
function importsProvidersFrom(tree, filePath, className) {
    const sourceFile = createSourceFile(tree, filePath);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    const appConfig = bootstrapCall ? findAppConfig(bootstrapCall, tree, filePath) : null;
    const importProvidersFromCall = appConfig ? findImportProvidersFromCall(appConfig.node) : null;
    return !!importProvidersFromCall?.arguments.some((arg) => typescript_1.default.isIdentifier(arg) && arg.text === className);
}
exports.importsProvidersFrom = importsProvidersFrom;
/**
 * Checks whether a providers function is being called in a `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path of the file in which to check.
 * @param functionName Name of the function to search for.
 */
function callsProvidersFunction(tree, filePath, functionName) {
    const sourceFile = createSourceFile(tree, filePath);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    const appConfig = bootstrapCall ? findAppConfig(bootstrapCall, tree, filePath) : null;
    const providersLiteral = appConfig ? findProvidersLiteral(appConfig.node) : null;
    return !!providersLiteral?.elements.some((el) => typescript_1.default.isCallExpression(el) &&
        typescript_1.default.isIdentifier(el.expression) &&
        el.expression.text === functionName);
}
exports.callsProvidersFunction = callsProvidersFunction;
/**
 * Adds an `importProvidersFrom` call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param moduleName Name of the module that should be imported.
 * @param modulePath Path from which to import the module.
 */
function addModuleImportToStandaloneBootstrap(tree, filePath, moduleName, modulePath) {
    const sourceFile = createSourceFile(tree, filePath);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    const addImports = (file, recorder) => {
        const sourceText = file.getText();
        [
            (0, ast_utils_1.insertImport)(file, sourceText, moduleName, modulePath),
            (0, ast_utils_1.insertImport)(file, sourceText, 'importProvidersFrom', '@angular/core'),
        ].forEach((change) => {
            if (change instanceof change_1.InsertChange) {
                recorder.insertLeft(change.pos, change.toAdd);
            }
        });
    };
    if (!bootstrapCall) {
        throw new schematics_1.SchematicsException(`Could not find bootstrapApplication call in ${filePath}`);
    }
    const importProvidersCall = typescript_1.default.factory.createCallExpression(typescript_1.default.factory.createIdentifier('importProvidersFrom'), [], [typescript_1.default.factory.createIdentifier(moduleName)]);
    // If there's only one argument, we have to create a new object literal.
    if (bootstrapCall.arguments.length === 1) {
        const recorder = tree.beginUpdate(filePath);
        addNewAppConfigToCall(bootstrapCall, importProvidersCall, recorder);
        addImports(sourceFile, recorder);
        tree.commitUpdate(recorder);
        return;
    }
    // If the config is a `mergeApplicationProviders` call, add another config to it.
    if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
        const recorder = tree.beginUpdate(filePath);
        addNewAppConfigToCall(bootstrapCall.arguments[1], importProvidersCall, recorder);
        addImports(sourceFile, recorder);
        tree.commitUpdate(recorder);
        return;
    }
    // Otherwise attempt to merge into the current config.
    const appConfig = findAppConfig(bootstrapCall, tree, filePath);
    if (!appConfig) {
        throw new schematics_1.SchematicsException(`Could not statically analyze config in bootstrapApplication call in ${filePath}`);
    }
    const { filePath: configFilePath, node: config } = appConfig;
    const recorder = tree.beginUpdate(configFilePath);
    const importCall = findImportProvidersFromCall(config);
    addImports(config.getSourceFile(), recorder);
    if (importCall) {
        // If there's an `importProvidersFrom` call already, add the module to it.
        recorder.insertRight(importCall.arguments[importCall.arguments.length - 1].getEnd(), `, ${moduleName}`);
    }
    else {
        const providersLiteral = findProvidersLiteral(config);
        if (providersLiteral) {
            // If there's a `providers` array, add the import to it.
            addElementToArray(providersLiteral, importProvidersCall, recorder);
        }
        else {
            // Otherwise add a `providers` array to the existing object literal.
            addProvidersToObjectLiteral(config, importProvidersCall, recorder);
        }
    }
    tree.commitUpdate(recorder);
}
exports.addModuleImportToStandaloneBootstrap = addModuleImportToStandaloneBootstrap;
/**
 * Adds a providers function call to the `bootstrapApplication` call.
 * @param tree File tree of the project.
 * @param filePath Path to the file that should be updated.
 * @param functionName Name of the function that should be called.
 * @param importPath Path from which to import the function.
 * @param args Arguments to use when calling the function.
 * @returns The file path that the provider was added to.
 */
function addFunctionalProvidersToStandaloneBootstrap(tree, filePath, functionName, importPath, args = []) {
    const sourceFile = createSourceFile(tree, filePath);
    const bootstrapCall = findBootstrapApplicationCall(sourceFile);
    const addImports = (file, recorder) => {
        const change = (0, ast_utils_1.insertImport)(file, file.getText(), functionName, importPath);
        if (change instanceof change_1.InsertChange) {
            recorder.insertLeft(change.pos, change.toAdd);
        }
    };
    if (!bootstrapCall) {
        throw new schematics_1.SchematicsException(`Could not find bootstrapApplication call in ${filePath}`);
    }
    const providersCall = typescript_1.default.factory.createCallExpression(typescript_1.default.factory.createIdentifier(functionName), undefined, args);
    // If there's only one argument, we have to create a new object literal.
    if (bootstrapCall.arguments.length === 1) {
        const recorder = tree.beginUpdate(filePath);
        addNewAppConfigToCall(bootstrapCall, providersCall, recorder);
        addImports(sourceFile, recorder);
        tree.commitUpdate(recorder);
        return filePath;
    }
    // If the config is a `mergeApplicationProviders` call, add another config to it.
    if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
        const recorder = tree.beginUpdate(filePath);
        addNewAppConfigToCall(bootstrapCall.arguments[1], providersCall, recorder);
        addImports(sourceFile, recorder);
        tree.commitUpdate(recorder);
        return filePath;
    }
    // Otherwise attempt to merge into the current config.
    const appConfig = findAppConfig(bootstrapCall, tree, filePath);
    if (!appConfig) {
        throw new schematics_1.SchematicsException(`Could not statically analyze config in bootstrapApplication call in ${filePath}`);
    }
    const { filePath: configFilePath, node: config } = appConfig;
    const recorder = tree.beginUpdate(configFilePath);
    const providersLiteral = findProvidersLiteral(config);
    addImports(config.getSourceFile(), recorder);
    if (providersLiteral) {
        // If there's a `providers` array, add the import to it.
        addElementToArray(providersLiteral, providersCall, recorder);
    }
    else {
        // Otherwise add a `providers` array to the existing object literal.
        addProvidersToObjectLiteral(config, providersCall, recorder);
    }
    tree.commitUpdate(recorder);
    return configFilePath;
}
exports.addFunctionalProvidersToStandaloneBootstrap = addFunctionalProvidersToStandaloneBootstrap;
/** Finds the call to `bootstrapApplication` within a file. */
function findBootstrapApplicationCall(sourceFile) {
    const localName = findImportLocalName(sourceFile, 'bootstrapApplication', '@angular/platform-browser');
    if (!localName) {
        return null;
    }
    let result = null;
    sourceFile.forEachChild(function walk(node) {
        if (typescript_1.default.isCallExpression(node) &&
            typescript_1.default.isIdentifier(node.expression) &&
            node.expression.text === localName) {
            result = node;
        }
        if (!result) {
            node.forEachChild(walk);
        }
    });
    return result;
}
exports.findBootstrapApplicationCall = findBootstrapApplicationCall;
/** Find a call to `importProvidersFrom` within an application config. */
function findImportProvidersFromCall(config) {
    const importProvidersName = findImportLocalName(config.getSourceFile(), 'importProvidersFrom', '@angular/core');
    const providersLiteral = findProvidersLiteral(config);
    if (providersLiteral && importProvidersName) {
        for (const element of providersLiteral.elements) {
            // Look for an array element that calls the `importProvidersFrom` function.
            if (typescript_1.default.isCallExpression(element) &&
                typescript_1.default.isIdentifier(element.expression) &&
                element.expression.text === importProvidersName) {
                return element;
            }
        }
    }
    return null;
}
/** Finds the `providers` array literal within an application config. */
function findProvidersLiteral(config) {
    for (const prop of config.properties) {
        if (typescript_1.default.isPropertyAssignment(prop) &&
            typescript_1.default.isIdentifier(prop.name) &&
            prop.name.text === 'providers' &&
            typescript_1.default.isArrayLiteralExpression(prop.initializer)) {
            return prop.initializer;
        }
    }
    return null;
}
/**
 * Resolves the node that defines the app config from a bootstrap call.
 * @param bootstrapCall Call for which to resolve the config.
 * @param tree File tree of the project.
 * @param filePath File path of the bootstrap call.
 */
function findAppConfig(bootstrapCall, tree, filePath) {
    if (bootstrapCall.arguments.length > 1) {
        const config = bootstrapCall.arguments[1];
        if (typescript_1.default.isObjectLiteralExpression(config)) {
            return { filePath, node: config };
        }
        if (typescript_1.default.isIdentifier(config)) {
            return resolveAppConfigFromIdentifier(config, tree, filePath);
        }
    }
    return null;
}
/**
 * Resolves the app config from an identifier referring to it.
 * @param identifier Identifier referring to the app config.
 * @param tree File tree of the project.
 * @param bootstapFilePath Path of the bootstrap call.
 */
function resolveAppConfigFromIdentifier(identifier, tree, bootstapFilePath) {
    const sourceFile = identifier.getSourceFile();
    for (const node of sourceFile.statements) {
        // Only look at relative imports. This will break if the app uses a path
        // mapping to refer to the import, but in order to resolve those, we would
        // need knowledge about the entire program.
        if (!typescript_1.default.isImportDeclaration(node) ||
            !node.importClause?.namedBindings ||
            !typescript_1.default.isNamedImports(node.importClause.namedBindings) ||
            !typescript_1.default.isStringLiteralLike(node.moduleSpecifier) ||
            !node.moduleSpecifier.text.startsWith('.')) {
            continue;
        }
        for (const specifier of node.importClause.namedBindings.elements) {
            if (specifier.name.text !== identifier.text) {
                continue;
            }
            // Look for a variable with the imported name in the file. Note that ideally we would use
            // the type checker to resolve this, but we can't because these utilities are set up to
            // operate on individual files, not the entire program.
            const filePath = (0, path_1.join)((0, path_1.dirname)(bootstapFilePath), node.moduleSpecifier.text + '.ts');
            const importedSourceFile = createSourceFile(tree, filePath);
            const resolvedVariable = findAppConfigFromVariableName(importedSourceFile, (specifier.propertyName || specifier.name).text);
            if (resolvedVariable) {
                return { filePath, node: resolvedVariable };
            }
        }
    }
    const variableInSameFile = findAppConfigFromVariableName(sourceFile, identifier.text);
    return variableInSameFile ? { filePath: bootstapFilePath, node: variableInSameFile } : null;
}
/**
 * Finds an app config within the top-level variables of a file.
 * @param sourceFile File in which to search for the config.
 * @param variableName Name of the variable containing the config.
 */
function findAppConfigFromVariableName(sourceFile, variableName) {
    for (const node of sourceFile.statements) {
        if (typescript_1.default.isVariableStatement(node)) {
            for (const decl of node.declarationList.declarations) {
                if (typescript_1.default.isIdentifier(decl.name) &&
                    decl.name.text === variableName &&
                    decl.initializer &&
                    typescript_1.default.isObjectLiteralExpression(decl.initializer)) {
                    return decl.initializer;
                }
            }
        }
    }
    return null;
}
/**
 * Finds the local name of an imported symbol. Could be the symbol name itself or its alias.
 * @param sourceFile File within which to search for the import.
 * @param name Actual name of the import, not its local alias.
 * @param moduleName Name of the module from which the symbol is imported.
 */
function findImportLocalName(sourceFile, name, moduleName) {
    for (const node of sourceFile.statements) {
        // Only look for top-level imports.
        if (!typescript_1.default.isImportDeclaration(node) ||
            !typescript_1.default.isStringLiteral(node.moduleSpecifier) ||
            node.moduleSpecifier.text !== moduleName) {
            continue;
        }
        // Filter out imports that don't have the right shape.
        if (!node.importClause ||
            !node.importClause.namedBindings ||
            !typescript_1.default.isNamedImports(node.importClause.namedBindings)) {
            continue;
        }
        // Look through the elements of the declaration for the specific import.
        for (const element of node.importClause.namedBindings.elements) {
            if ((element.propertyName || element.name).text === name) {
                // The local name is always in `name`.
                return element.name.text;
            }
        }
    }
    return null;
}
/** Creates a source file from a file path within a project. */
function createSourceFile(tree, filePath) {
    return typescript_1.default.createSourceFile(filePath, tree.readText(filePath), typescript_1.default.ScriptTarget.Latest, true);
}
/**
 * Creates a new app config object literal and adds it to a call expression as an argument.
 * @param call Call to which to add the config.
 * @param expression Expression that should inserted into the new config.
 * @param recorder Recorder to which to log the change.
 */
function addNewAppConfigToCall(call, expression, recorder) {
    const newCall = typescript_1.default.factory.updateCallExpression(call, call.expression, call.typeArguments, [
        ...call.arguments,
        typescript_1.default.factory.createObjectLiteralExpression([
            typescript_1.default.factory.createPropertyAssignment('providers', typescript_1.default.factory.createArrayLiteralExpression([expression])),
        ], true),
    ]);
    recorder.remove(call.getStart(), call.getWidth());
    recorder.insertRight(call.getStart(), typescript_1.default.createPrinter().printNode(typescript_1.default.EmitHint.Unspecified, newCall, call.getSourceFile()));
}
/**
 * Adds an element to an array literal expression.
 * @param node Array to which to add the element.
 * @param element Element to be added.
 * @param recorder Recorder to which to log the change.
 */
function addElementToArray(node, element, recorder) {
    const newLiteral = typescript_1.default.factory.updateArrayLiteralExpression(node, [...node.elements, element]);
    recorder.remove(node.getStart(), node.getWidth());
    recorder.insertRight(node.getStart(), typescript_1.default.createPrinter().printNode(typescript_1.default.EmitHint.Unspecified, newLiteral, node.getSourceFile()));
}
/**
 * Adds a `providers` property to an object literal.
 * @param node Literal to which to add the `providers`.
 * @param expression Provider that should be part of the generated `providers` array.
 * @param recorder Recorder to which to log the change.
 */
function addProvidersToObjectLiteral(node, expression, recorder) {
    const newOptionsLiteral = typescript_1.default.factory.updateObjectLiteralExpression(node, [
        ...node.properties,
        typescript_1.default.factory.createPropertyAssignment('providers', typescript_1.default.factory.createArrayLiteralExpression([expression])),
    ]);
    recorder.remove(node.getStart(), node.getWidth());
    recorder.insertRight(node.getStart(), typescript_1.default.createPrinter().printNode(typescript_1.default.EmitHint.Unspecified, newOptionsLiteral, node.getSourceFile()));
}
/** Checks whether a node is a call to `mergeApplicationConfig`. */
function isMergeAppConfigCall(node) {
    if (!typescript_1.default.isCallExpression(node)) {
        return false;
    }
    const localName = findImportLocalName(node.getSourceFile(), 'mergeApplicationConfig', '@angular/core');
    return !!localName && typescript_1.default.isIdentifier(node.expression) && node.expression.text === localName;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9wcml2YXRlL3N0YW5kYWxvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsMkRBQXVGO0FBQ3ZGLCtCQUFxQztBQUNyQywrR0FBK0U7QUFDL0Usb0RBQW9EO0FBQ3BELDhDQUFpRDtBQVdqRDs7Ozs7R0FLRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLElBQVUsRUFBRSxRQUFnQixFQUFFLFNBQWlCO0lBQ2xGLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNwRCxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvRCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDdEYsTUFBTSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLE9BQU8sQ0FBQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQzlDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxvQkFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FDeEQsQ0FBQztBQUNKLENBQUM7QUFURCxvREFTQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBZ0Isc0JBQXNCLENBQ3BDLElBQVUsRUFDVixRQUFnQixFQUNoQixZQUFvQjtJQUVwQixNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVB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LElBQWE7SUFDekMsSUFBSSxDQUFDLG9CQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDOUIsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUNuQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQ3BCLHdCQUF3QixFQUN4QixlQUFlLENBQ2hCLENBQUM7SUFFRixPQUFPLENBQUMsQ0FBQyxTQUFTLElBQUksb0JBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztBQUMvRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IFNjaGVtYXRpY3NFeGNlcHRpb24sIFRyZWUsIFVwZGF0ZVJlY29yZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L3NjaGVtYXRpY3MnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgaW5zZXJ0SW1wb3J0IH0gZnJvbSAnLi4vdXRpbGl0eS9hc3QtdXRpbHMnO1xuaW1wb3J0IHsgSW5zZXJ0Q2hhbmdlIH0gZnJvbSAnLi4vdXRpbGl0eS9jaGFuZ2UnO1xuXG4vKiogQXBwIGNvbmZpZyB0aGF0IHdhcyByZXNvbHZlZCB0byBpdHMgc291cmNlIG5vZGUuICovXG5pbnRlcmZhY2UgUmVzb2x2ZWRBcHBDb25maWcge1xuICAvKiogVHJlZS1yZWxhdGl2ZSBwYXRoIG9mIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGFwcCBjb25maWcuICovXG4gIGZpbGVQYXRoOiBzdHJpbmc7XG5cbiAgLyoqIE5vZGUgZGVmaW5pbmcgdGhlIGFwcCBjb25maWcuICovXG4gIG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIHRoZSBwcm92aWRlcnMgZnJvbSBhIG1vZHVsZSBhcmUgYmVpbmcgaW1wb3J0ZWQgaW4gYSBgYm9vdHN0cmFwQXBwbGljYXRpb25gIGNhbGwuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiB0aGUgZmlsZSBpbiB3aGljaCB0byBjaGVjay5cbiAqIEBwYXJhbSBjbGFzc05hbWUgQ2xhc3MgbmFtZSBvZiB0aGUgbW9kdWxlIHRvIHNlYXJjaCBmb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnRzUHJvdmlkZXJzRnJvbSh0cmVlOiBUcmVlLCBmaWxlUGF0aDogc3RyaW5nLCBjbGFzc05hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBzb3VyY2VGaWxlID0gY3JlYXRlU291cmNlRmlsZSh0cmVlLCBmaWxlUGF0aCk7XG4gIGNvbnN0IGJvb3RzdHJhcENhbGwgPSBmaW5kQm9vdHN0cmFwQXBwbGljYXRpb25DYWxsKHNvdXJjZUZpbGUpO1xuICBjb25zdCBhcHBDb25maWcgPSBib290c3RyYXBDYWxsID8gZmluZEFwcENvbmZpZyhib290c3RyYXBDYWxsLCB0cmVlLCBmaWxlUGF0aCkgOiBudWxsO1xuICBjb25zdCBpbXBvcnRQcm92aWRlcnNGcm9tQ2FsbCA9IGFwcENvbmZpZyA/IGZpbmRJbXBvcnRQcm92aWRlcnNGcm9tQ2FsbChhcHBDb25maWcubm9kZSkgOiBudWxsO1xuXG4gIHJldHVybiAhIWltcG9ydFByb3ZpZGVyc0Zyb21DYWxsPy5hcmd1bWVudHMuc29tZShcbiAgICAoYXJnKSA9PiB0cy5pc0lkZW50aWZpZXIoYXJnKSAmJiBhcmcudGV4dCA9PT0gY2xhc3NOYW1lLFxuICApO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgcHJvdmlkZXJzIGZ1bmN0aW9uIGlzIGJlaW5nIGNhbGxlZCBpbiBhIGBib290c3RyYXBBcHBsaWNhdGlvbmAgY2FsbC5cbiAqIEBwYXJhbSB0cmVlIEZpbGUgdHJlZSBvZiB0aGUgcHJvamVjdC5cbiAqIEBwYXJhbSBmaWxlUGF0aCBQYXRoIG9mIHRoZSBmaWxlIGluIHdoaWNoIHRvIGNoZWNrLlxuICogQHBhcmFtIGZ1bmN0aW9uTmFtZSBOYW1lIG9mIHRoZSBmdW5jdGlvbiB0byBzZWFyY2ggZm9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsbHNQcm92aWRlcnNGdW5jdGlvbihcbiAgdHJlZTogVHJlZSxcbiAgZmlsZVBhdGg6IHN0cmluZyxcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmcsXG4pOiBib29sZWFuIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IGNyZWF0ZVNvdXJjZUZpbGUodHJlZSwgZmlsZVBhdGgpO1xuICBjb25zdCBib290c3RyYXBDYWxsID0gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbChzb3VyY2VGaWxlKTtcbiAgY29uc3QgYXBwQ29uZmlnID0gYm9vdHN0cmFwQ2FsbCA/IGZpbmRBcHBDb25maWcoYm9vdHN0cmFwQ2FsbCwgdHJlZSwgZmlsZVBhdGgpIDogbnVsbDtcbiAgY29uc3QgcHJvdmlkZXJzTGl0ZXJhbCA9IGFwcENvbmZpZyA/IGZpbmRQcm92aWRlcnNMaXRlcmFsKGFwcENvbmZpZy5ub2RlKSA6IG51bGw7XG5cbiAgcmV0dXJuICEhcHJvdmlkZXJzTGl0ZXJhbD8uZWxlbWVudHMuc29tZShcbiAgICAoZWwpID0+XG4gICAgICB0cy5pc0NhbGxFeHByZXNzaW9uKGVsKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKGVsLmV4cHJlc3Npb24pICYmXG4gICAgICBlbC5leHByZXNzaW9uLnRleHQgPT09IGZ1bmN0aW9uTmFtZSxcbiAgKTtcbn1cblxuLyoqXG4gKiBBZGRzIGFuIGBpbXBvcnRQcm92aWRlcnNGcm9tYCBjYWxsIHRvIHRoZSBgYm9vdHN0cmFwQXBwbGljYXRpb25gIGNhbGwuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gZmlsZVBhdGggUGF0aCB0byB0aGUgZmlsZSB0aGF0IHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIG1vZHVsZU5hbWUgTmFtZSBvZiB0aGUgbW9kdWxlIHRoYXQgc2hvdWxkIGJlIGltcG9ydGVkLlxuICogQHBhcmFtIG1vZHVsZVBhdGggUGF0aCBmcm9tIHdoaWNoIHRvIGltcG9ydCB0aGUgbW9kdWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkTW9kdWxlSW1wb3J0VG9TdGFuZGFsb25lQm9vdHN0cmFwKFxuICB0cmVlOiBUcmVlLFxuICBmaWxlUGF0aDogc3RyaW5nLFxuICBtb2R1bGVOYW1lOiBzdHJpbmcsXG4gIG1vZHVsZVBhdGg6IHN0cmluZyxcbikge1xuICBjb25zdCBzb3VyY2VGaWxlID0gY3JlYXRlU291cmNlRmlsZSh0cmVlLCBmaWxlUGF0aCk7XG4gIGNvbnN0IGJvb3RzdHJhcENhbGwgPSBmaW5kQm9vdHN0cmFwQXBwbGljYXRpb25DYWxsKHNvdXJjZUZpbGUpO1xuICBjb25zdCBhZGRJbXBvcnRzID0gKGZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcikgPT4ge1xuICAgIGNvbnN0IHNvdXJjZVRleHQgPSBmaWxlLmdldFRleHQoKTtcblxuICAgIFtcbiAgICAgIGluc2VydEltcG9ydChmaWxlLCBzb3VyY2VUZXh0LCBtb2R1bGVOYW1lLCBtb2R1bGVQYXRoKSxcbiAgICAgIGluc2VydEltcG9ydChmaWxlLCBzb3VyY2VUZXh0LCAnaW1wb3J0UHJvdmlkZXJzRnJvbScsICdAYW5ndWxhci9jb3JlJyksXG4gICAgXS5mb3JFYWNoKChjaGFuZ2UpID0+IHtcbiAgICAgIGlmIChjaGFuZ2UgaW5zdGFuY2VvZiBJbnNlcnRDaGFuZ2UpIHtcbiAgICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGlmICghYm9vdHN0cmFwQ2FsbCkge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKGBDb3VsZCBub3QgZmluZCBib290c3RyYXBBcHBsaWNhdGlvbiBjYWxsIGluICR7ZmlsZVBhdGh9YCk7XG4gIH1cblxuICBjb25zdCBpbXBvcnRQcm92aWRlcnNDYWxsID0gdHMuZmFjdG9yeS5jcmVhdGVDYWxsRXhwcmVzc2lvbihcbiAgICB0cy5mYWN0b3J5LmNyZWF0ZUlkZW50aWZpZXIoJ2ltcG9ydFByb3ZpZGVyc0Zyb20nKSxcbiAgICBbXSxcbiAgICBbdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKG1vZHVsZU5hbWUpXSxcbiAgKTtcblxuICAvLyBJZiB0aGVyZSdzIG9ubHkgb25lIGFyZ3VtZW50LCB3ZSBoYXZlIHRvIGNyZWF0ZSBhIG5ldyBvYmplY3QgbGl0ZXJhbC5cbiAgaWYgKGJvb3RzdHJhcENhbGwuYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShmaWxlUGF0aCk7XG4gICAgYWRkTmV3QXBwQ29uZmlnVG9DYWxsKGJvb3RzdHJhcENhbGwsIGltcG9ydFByb3ZpZGVyc0NhbGwsIHJlY29yZGVyKTtcbiAgICBhZGRJbXBvcnRzKHNvdXJjZUZpbGUsIHJlY29yZGVyKTtcbiAgICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiB0aGUgY29uZmlnIGlzIGEgYG1lcmdlQXBwbGljYXRpb25Qcm92aWRlcnNgIGNhbGwsIGFkZCBhbm90aGVyIGNvbmZpZyB0byBpdC5cbiAgaWYgKGlzTWVyZ2VBcHBDb25maWdDYWxsKGJvb3RzdHJhcENhbGwuYXJndW1lbnRzWzFdKSkge1xuICAgIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShmaWxlUGF0aCk7XG4gICAgYWRkTmV3QXBwQ29uZmlnVG9DYWxsKGJvb3RzdHJhcENhbGwuYXJndW1lbnRzWzFdLCBpbXBvcnRQcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gICAgYWRkSW1wb3J0cyhzb3VyY2VGaWxlLCByZWNvcmRlcik7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gT3RoZXJ3aXNlIGF0dGVtcHQgdG8gbWVyZ2UgaW50byB0aGUgY3VycmVudCBjb25maWcuXG4gIGNvbnN0IGFwcENvbmZpZyA9IGZpbmRBcHBDb25maWcoYm9vdHN0cmFwQ2FsbCwgdHJlZSwgZmlsZVBhdGgpO1xuXG4gIGlmICghYXBwQ29uZmlnKSB7XG4gICAgdGhyb3cgbmV3IFNjaGVtYXRpY3NFeGNlcHRpb24oXG4gICAgICBgQ291bGQgbm90IHN0YXRpY2FsbHkgYW5hbHl6ZSBjb25maWcgaW4gYm9vdHN0cmFwQXBwbGljYXRpb24gY2FsbCBpbiAke2ZpbGVQYXRofWAsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHsgZmlsZVBhdGg6IGNvbmZpZ0ZpbGVQYXRoLCBub2RlOiBjb25maWcgfSA9IGFwcENvbmZpZztcbiAgY29uc3QgcmVjb3JkZXIgPSB0cmVlLmJlZ2luVXBkYXRlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgY29uc3QgaW1wb3J0Q2FsbCA9IGZpbmRJbXBvcnRQcm92aWRlcnNGcm9tQ2FsbChjb25maWcpO1xuXG4gIGFkZEltcG9ydHMoY29uZmlnLmdldFNvdXJjZUZpbGUoKSwgcmVjb3JkZXIpO1xuXG4gIGlmIChpbXBvcnRDYWxsKSB7XG4gICAgLy8gSWYgdGhlcmUncyBhbiBgaW1wb3J0UHJvdmlkZXJzRnJvbWAgY2FsbCBhbHJlYWR5LCBhZGQgdGhlIG1vZHVsZSB0byBpdC5cbiAgICByZWNvcmRlci5pbnNlcnRSaWdodChcbiAgICAgIGltcG9ydENhbGwuYXJndW1lbnRzW2ltcG9ydENhbGwuYXJndW1lbnRzLmxlbmd0aCAtIDFdLmdldEVuZCgpLFxuICAgICAgYCwgJHttb2R1bGVOYW1lfWAsXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcm92aWRlcnNMaXRlcmFsID0gZmluZFByb3ZpZGVyc0xpdGVyYWwoY29uZmlnKTtcblxuICAgIGlmIChwcm92aWRlcnNMaXRlcmFsKSB7XG4gICAgICAvLyBJZiB0aGVyZSdzIGEgYHByb3ZpZGVyc2AgYXJyYXksIGFkZCB0aGUgaW1wb3J0IHRvIGl0LlxuICAgICAgYWRkRWxlbWVudFRvQXJyYXkocHJvdmlkZXJzTGl0ZXJhbCwgaW1wb3J0UHJvdmlkZXJzQ2FsbCwgcmVjb3JkZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBPdGhlcndpc2UgYWRkIGEgYHByb3ZpZGVyc2AgYXJyYXkgdG8gdGhlIGV4aXN0aW5nIG9iamVjdCBsaXRlcmFsLlxuICAgICAgYWRkUHJvdmlkZXJzVG9PYmplY3RMaXRlcmFsKGNvbmZpZywgaW1wb3J0UHJvdmlkZXJzQ2FsbCwgcmVjb3JkZXIpO1xuICAgIH1cbiAgfVxuXG4gIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgcHJvdmlkZXJzIGZ1bmN0aW9uIGNhbGwgdG8gdGhlIGBib290c3RyYXBBcHBsaWNhdGlvbmAgY2FsbC5cbiAqIEBwYXJhbSB0cmVlIEZpbGUgdHJlZSBvZiB0aGUgcHJvamVjdC5cbiAqIEBwYXJhbSBmaWxlUGF0aCBQYXRoIHRvIHRoZSBmaWxlIHRoYXQgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gKiBAcGFyYW0gZnVuY3Rpb25OYW1lIE5hbWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZC5cbiAqIEBwYXJhbSBpbXBvcnRQYXRoIFBhdGggZnJvbSB3aGljaCB0byBpbXBvcnQgdGhlIGZ1bmN0aW9uLlxuICogQHBhcmFtIGFyZ3MgQXJndW1lbnRzIHRvIHVzZSB3aGVuIGNhbGxpbmcgdGhlIGZ1bmN0aW9uLlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCB0aGF0IHRoZSBwcm92aWRlciB3YXMgYWRkZWQgdG8uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRGdW5jdGlvbmFsUHJvdmlkZXJzVG9TdGFuZGFsb25lQm9vdHN0cmFwKFxuICB0cmVlOiBUcmVlLFxuICBmaWxlUGF0aDogc3RyaW5nLFxuICBmdW5jdGlvbk5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nLFxuICBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXSxcbik6IHN0cmluZyB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBjcmVhdGVTb3VyY2VGaWxlKHRyZWUsIGZpbGVQYXRoKTtcbiAgY29uc3QgYm9vdHN0cmFwQ2FsbCA9IGZpbmRCb290c3RyYXBBcHBsaWNhdGlvbkNhbGwoc291cmNlRmlsZSk7XG4gIGNvbnN0IGFkZEltcG9ydHMgPSAoZmlsZTogdHMuU291cmNlRmlsZSwgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0KGZpbGUsIGZpbGUuZ2V0VGV4dCgpLCBmdW5jdGlvbk5hbWUsIGltcG9ydFBhdGgpO1xuXG4gICAgaWYgKGNoYW5nZSBpbnN0YW5jZW9mIEluc2VydENoYW5nZSkge1xuICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoIWJvb3RzdHJhcENhbGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgYm9vdHN0cmFwQXBwbGljYXRpb24gY2FsbCBpbiAke2ZpbGVQYXRofWApO1xuICB9XG5cbiAgY29uc3QgcHJvdmlkZXJzQ2FsbCA9IHRzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKGZ1bmN0aW9uTmFtZSksXG4gICAgdW5kZWZpbmVkLFxuICAgIGFyZ3MsXG4gICk7XG5cbiAgLy8gSWYgdGhlcmUncyBvbmx5IG9uZSBhcmd1bWVudCwgd2UgaGF2ZSB0byBjcmVhdGUgYSBuZXcgb2JqZWN0IGxpdGVyYWwuXG4gIGlmIChib290c3RyYXBDYWxsLmFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gICAgYWRkSW1wb3J0cyhzb3VyY2VGaWxlLCByZWNvcmRlcik7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIGZpbGVQYXRoO1xuICB9XG5cbiAgLy8gSWYgdGhlIGNvbmZpZyBpcyBhIGBtZXJnZUFwcGxpY2F0aW9uUHJvdmlkZXJzYCBjYWxsLCBhZGQgYW5vdGhlciBjb25maWcgdG8gaXQuXG4gIGlmIChpc01lcmdlQXBwQ29uZmlnQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSkpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSwgcHJvdmlkZXJzQ2FsbCwgcmVjb3JkZXIpO1xuICAgIGFkZEltcG9ydHMoc291cmNlRmlsZSwgcmVjb3JkZXIpO1xuICAgIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybiBmaWxlUGF0aDtcbiAgfVxuXG4gIC8vIE90aGVyd2lzZSBhdHRlbXB0IHRvIG1lcmdlIGludG8gdGhlIGN1cnJlbnQgY29uZmlnLlxuICBjb25zdCBhcHBDb25maWcgPSBmaW5kQXBwQ29uZmlnKGJvb3RzdHJhcENhbGwsIHRyZWUsIGZpbGVQYXRoKTtcblxuICBpZiAoIWFwcENvbmZpZykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYENvdWxkIG5vdCBzdGF0aWNhbGx5IGFuYWx5emUgY29uZmlnIGluIGJvb3RzdHJhcEFwcGxpY2F0aW9uIGNhbGwgaW4gJHtmaWxlUGF0aH1gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7IGZpbGVQYXRoOiBjb25maWdGaWxlUGF0aCwgbm9kZTogY29uZmlnIH0gPSBhcHBDb25maWc7XG4gIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShjb25maWdGaWxlUGF0aCk7XG4gIGNvbnN0IHByb3ZpZGVyc0xpdGVyYWwgPSBmaW5kUHJvdmlkZXJzTGl0ZXJhbChjb25maWcpO1xuXG4gIGFkZEltcG9ydHMoY29uZmlnLmdldFNvdXJjZUZpbGUoKSwgcmVjb3JkZXIpO1xuXG4gIGlmIChwcm92aWRlcnNMaXRlcmFsKSB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGBwcm92aWRlcnNgIGFycmF5LCBhZGQgdGhlIGltcG9ydCB0byBpdC5cbiAgICBhZGRFbGVtZW50VG9BcnJheShwcm92aWRlcnNMaXRlcmFsLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlIGFkZCBhIGBwcm92aWRlcnNgIGFycmF5IHRvIHRoZSBleGlzdGluZyBvYmplY3QgbGl0ZXJhbC5cbiAgICBhZGRQcm92aWRlcnNUb09iamVjdExpdGVyYWwoY29uZmlnLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gIH1cblxuICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG5cbiAgcmV0dXJuIGNvbmZpZ0ZpbGVQYXRoO1xufVxuXG4vKiogRmluZHMgdGhlIGNhbGwgdG8gYGJvb3RzdHJhcEFwcGxpY2F0aW9uYCB3aXRoaW4gYSBmaWxlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRCb290c3RyYXBBcHBsaWNhdGlvbkNhbGwoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLkNhbGxFeHByZXNzaW9uIHwgbnVsbCB7XG4gIGNvbnN0IGxvY2FsTmFtZSA9IGZpbmRJbXBvcnRMb2NhbE5hbWUoXG4gICAgc291cmNlRmlsZSxcbiAgICAnYm9vdHN0cmFwQXBwbGljYXRpb24nLFxuICAgICdAYW5ndWxhci9wbGF0Zm9ybS1icm93c2VyJyxcbiAgKTtcblxuICBpZiAoIWxvY2FsTmFtZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IHJlc3VsdDogdHMuQ2FsbEV4cHJlc3Npb24gfCBudWxsID0gbnVsbDtcblxuICBzb3VyY2VGaWxlLmZvckVhY2hDaGlsZChmdW5jdGlvbiB3YWxrKG5vZGUpIHtcbiAgICBpZiAoXG4gICAgICB0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJlxuICAgICAgbm9kZS5leHByZXNzaW9uLnRleHQgPT09IGxvY2FsTmFtZVxuICAgICkge1xuICAgICAgcmVzdWx0ID0gbm9kZTtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgbm9kZS5mb3JFYWNoQ2hpbGQod2Fsayk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKiogRmluZCBhIGNhbGwgdG8gYGltcG9ydFByb3ZpZGVyc0Zyb21gIHdpdGhpbiBhbiBhcHBsaWNhdGlvbiBjb25maWcuICovXG5mdW5jdGlvbiBmaW5kSW1wb3J0UHJvdmlkZXJzRnJvbUNhbGwoY29uZmlnOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IHRzLkNhbGxFeHByZXNzaW9uIHwgbnVsbCB7XG4gIGNvbnN0IGltcG9ydFByb3ZpZGVyc05hbWUgPSBmaW5kSW1wb3J0TG9jYWxOYW1lKFxuICAgIGNvbmZpZy5nZXRTb3VyY2VGaWxlKCksXG4gICAgJ2ltcG9ydFByb3ZpZGVyc0Zyb20nLFxuICAgICdAYW5ndWxhci9jb3JlJyxcbiAgKTtcbiAgY29uc3QgcHJvdmlkZXJzTGl0ZXJhbCA9IGZpbmRQcm92aWRlcnNMaXRlcmFsKGNvbmZpZyk7XG5cbiAgaWYgKHByb3ZpZGVyc0xpdGVyYWwgJiYgaW1wb3J0UHJvdmlkZXJzTmFtZSkge1xuICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBwcm92aWRlcnNMaXRlcmFsLmVsZW1lbnRzKSB7XG4gICAgICAvLyBMb29rIGZvciBhbiBhcnJheSBlbGVtZW50IHRoYXQgY2FsbHMgdGhlIGBpbXBvcnRQcm92aWRlcnNGcm9tYCBmdW5jdGlvbi5cbiAgICAgIGlmIChcbiAgICAgICAgdHMuaXNDYWxsRXhwcmVzc2lvbihlbGVtZW50KSAmJlxuICAgICAgICB0cy5pc0lkZW50aWZpZXIoZWxlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgICBlbGVtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gaW1wb3J0UHJvdmlkZXJzTmFtZVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKiogRmluZHMgdGhlIGBwcm92aWRlcnNgIGFycmF5IGxpdGVyYWwgd2l0aGluIGFuIGFwcGxpY2F0aW9uIGNvbmZpZy4gKi9cbmZ1bmN0aW9uIGZpbmRQcm92aWRlcnNMaXRlcmFsKFxuICBjb25maWc6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLFxuKTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiB8IG51bGwge1xuICBmb3IgKGNvbnN0IHByb3Agb2YgY29uZmlnLnByb3BlcnRpZXMpIHtcbiAgICBpZiAoXG4gICAgICB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChwcm9wKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHByb3AubmFtZSkgJiZcbiAgICAgIHByb3AubmFtZS50ZXh0ID09PSAncHJvdmlkZXJzJyAmJlxuICAgICAgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHByb3AuaW5pdGlhbGl6ZXIpXG4gICAgKSB7XG4gICAgICByZXR1cm4gcHJvcC5pbml0aWFsaXplcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgbm9kZSB0aGF0IGRlZmluZXMgdGhlIGFwcCBjb25maWcgZnJvbSBhIGJvb3RzdHJhcCBjYWxsLlxuICogQHBhcmFtIGJvb3RzdHJhcENhbGwgQ2FsbCBmb3Igd2hpY2ggdG8gcmVzb2x2ZSB0aGUgY29uZmlnLlxuICogQHBhcmFtIHRyZWUgRmlsZSB0cmVlIG9mIHRoZSBwcm9qZWN0LlxuICogQHBhcmFtIGZpbGVQYXRoIEZpbGUgcGF0aCBvZiB0aGUgYm9vdHN0cmFwIGNhbGwuXG4gKi9cbmZ1bmN0aW9uIGZpbmRBcHBDb25maWcoXG4gIGJvb3RzdHJhcENhbGw6IHRzLkNhbGxFeHByZXNzaW9uLFxuICB0cmVlOiBUcmVlLFxuICBmaWxlUGF0aDogc3RyaW5nLFxuKTogUmVzb2x2ZWRBcHBDb25maWcgfCBudWxsIHtcbiAgaWYgKGJvb3RzdHJhcENhbGwuYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICBjb25zdCBjb25maWcgPSBib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXTtcblxuICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGNvbmZpZykpIHtcbiAgICAgIHJldHVybiB7IGZpbGVQYXRoLCBub2RlOiBjb25maWcgfTtcbiAgICB9XG5cbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGNvbmZpZykpIHtcbiAgICAgIHJldHVybiByZXNvbHZlQXBwQ29uZmlnRnJvbUlkZW50aWZpZXIoY29uZmlnLCB0cmVlLCBmaWxlUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGFwcCBjb25maWcgZnJvbSBhbiBpZGVudGlmaWVyIHJlZmVycmluZyB0byBpdC5cbiAqIEBwYXJhbSBpZGVudGlmaWVyIElkZW50aWZpZXIgcmVmZXJyaW5nIHRvIHRoZSBhcHAgY29uZmlnLlxuICogQHBhcmFtIHRyZWUgRmlsZSB0cmVlIG9mIHRoZSBwcm9qZWN0LlxuICogQHBhcmFtIGJvb3RzdGFwRmlsZVBhdGggUGF0aCBvZiB0aGUgYm9vdHN0cmFwIGNhbGwuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVBcHBDb25maWdGcm9tSWRlbnRpZmllcihcbiAgaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcixcbiAgdHJlZTogVHJlZSxcbiAgYm9vdHN0YXBGaWxlUGF0aDogc3RyaW5nLFxuKTogUmVzb2x2ZWRBcHBDb25maWcgfCBudWxsIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IGlkZW50aWZpZXIuZ2V0U291cmNlRmlsZSgpO1xuXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBzb3VyY2VGaWxlLnN0YXRlbWVudHMpIHtcbiAgICAvLyBPbmx5IGxvb2sgYXQgcmVsYXRpdmUgaW1wb3J0cy4gVGhpcyB3aWxsIGJyZWFrIGlmIHRoZSBhcHAgdXNlcyBhIHBhdGhcbiAgICAvLyBtYXBwaW5nIHRvIHJlZmVyIHRvIHRoZSBpbXBvcnQsIGJ1dCBpbiBvcmRlciB0byByZXNvbHZlIHRob3NlLCB3ZSB3b3VsZFxuICAgIC8vIG5lZWQga25vd2xlZGdlIGFib3V0IHRoZSBlbnRpcmUgcHJvZ3JhbS5cbiAgICBpZiAoXG4gICAgICAhdHMuaXNJbXBvcnREZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgIW5vZGUuaW1wb3J0Q2xhdXNlPy5uYW1lZEJpbmRpbmdzIHx8XG4gICAgICAhdHMuaXNOYW1lZEltcG9ydHMobm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncykgfHxcbiAgICAgICF0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKG5vZGUubW9kdWxlU3BlY2lmaWVyKSB8fFxuICAgICAgIW5vZGUubW9kdWxlU3BlY2lmaWVyLnRleHQuc3RhcnRzV2l0aCgnLicpXG4gICAgKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHNwZWNpZmllciBvZiBub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzLmVsZW1lbnRzKSB7XG4gICAgICBpZiAoc3BlY2lmaWVyLm5hbWUudGV4dCAhPT0gaWRlbnRpZmllci50ZXh0KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBMb29rIGZvciBhIHZhcmlhYmxlIHdpdGggdGhlIGltcG9ydGVkIG5hbWUgaW4gdGhlIGZpbGUuIE5vdGUgdGhhdCBpZGVhbGx5IHdlIHdvdWxkIHVzZVxuICAgICAgLy8gdGhlIHR5cGUgY2hlY2tlciB0byByZXNvbHZlIHRoaXMsIGJ1dCB3ZSBjYW4ndCBiZWNhdXNlIHRoZXNlIHV0aWxpdGllcyBhcmUgc2V0IHVwIHRvXG4gICAgICAvLyBvcGVyYXRlIG9uIGluZGl2aWR1YWwgZmlsZXMsIG5vdCB0aGUgZW50aXJlIHByb2dyYW0uXG4gICAgICBjb25zdCBmaWxlUGF0aCA9IGpvaW4oZGlybmFtZShib290c3RhcEZpbGVQYXRoKSwgbm9kZS5tb2R1bGVTcGVjaWZpZXIudGV4dCArICcudHMnKTtcbiAgICAgIGNvbnN0IGltcG9ydGVkU291cmNlRmlsZSA9IGNyZWF0ZVNvdXJjZUZpbGUodHJlZSwgZmlsZVBhdGgpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRWYXJpYWJsZSA9IGZpbmRBcHBDb25maWdGcm9tVmFyaWFibGVOYW1lKFxuICAgICAgICBpbXBvcnRlZFNvdXJjZUZpbGUsXG4gICAgICAgIChzcGVjaWZpZXIucHJvcGVydHlOYW1lIHx8IHNwZWNpZmllci5uYW1lKS50ZXh0LFxuICAgICAgKTtcblxuICAgICAgaWYgKHJlc29sdmVkVmFyaWFibGUpIHtcbiAgICAgICAgcmV0dXJuIHsgZmlsZVBhdGgsIG5vZGU6IHJlc29sdmVkVmFyaWFibGUgfTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCB2YXJpYWJsZUluU2FtZUZpbGUgPSBmaW5kQXBwQ29uZmlnRnJvbVZhcmlhYmxlTmFtZShzb3VyY2VGaWxlLCBpZGVudGlmaWVyLnRleHQpO1xuXG4gIHJldHVybiB2YXJpYWJsZUluU2FtZUZpbGUgPyB7IGZpbGVQYXRoOiBib290c3RhcEZpbGVQYXRoLCBub2RlOiB2YXJpYWJsZUluU2FtZUZpbGUgfSA6IG51bGw7XG59XG5cbi8qKlxuICogRmluZHMgYW4gYXBwIGNvbmZpZyB3aXRoaW4gdGhlIHRvcC1sZXZlbCB2YXJpYWJsZXMgb2YgYSBmaWxlLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgRmlsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHRoZSBjb25maWcuXG4gKiBAcGFyYW0gdmFyaWFibGVOYW1lIE5hbWUgb2YgdGhlIHZhcmlhYmxlIGNvbnRhaW5pbmcgdGhlIGNvbmZpZy5cbiAqL1xuZnVuY3Rpb24gZmluZEFwcENvbmZpZ0Zyb21WYXJpYWJsZU5hbWUoXG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gIHZhcmlhYmxlTmFtZTogc3RyaW5nLFxuKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24gfCBudWxsIHtcbiAgZm9yIChjb25zdCBub2RlIG9mIHNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlY2wgb2Ygbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSAmJlxuICAgICAgICAgIGRlY2wubmFtZS50ZXh0ID09PSB2YXJpYWJsZU5hbWUgJiZcbiAgICAgICAgICBkZWNsLmluaXRpYWxpemVyICYmXG4gICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihkZWNsLmluaXRpYWxpemVyKVxuICAgICAgICApIHtcbiAgICAgICAgICByZXR1cm4gZGVjbC5pbml0aWFsaXplcjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBsb2NhbCBuYW1lIG9mIGFuIGltcG9ydGVkIHN5bWJvbC4gQ291bGQgYmUgdGhlIHN5bWJvbCBuYW1lIGl0c2VsZiBvciBpdHMgYWxpYXMuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBGaWxlIHdpdGhpbiB3aGljaCB0byBzZWFyY2ggZm9yIHRoZSBpbXBvcnQuXG4gKiBAcGFyYW0gbmFtZSBBY3R1YWwgbmFtZSBvZiB0aGUgaW1wb3J0LCBub3QgaXRzIGxvY2FsIGFsaWFzLlxuICogQHBhcmFtIG1vZHVsZU5hbWUgTmFtZSBvZiB0aGUgbW9kdWxlIGZyb20gd2hpY2ggdGhlIHN5bWJvbCBpcyBpbXBvcnRlZC5cbiAqL1xuZnVuY3Rpb24gZmluZEltcG9ydExvY2FsTmFtZShcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgbmFtZTogc3RyaW5nLFxuICBtb2R1bGVOYW1lOiBzdHJpbmcsXG4pOiBzdHJpbmcgfCBudWxsIHtcbiAgZm9yIChjb25zdCBub2RlIG9mIHNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgIC8vIE9ubHkgbG9vayBmb3IgdG9wLWxldmVsIGltcG9ydHMuXG4gICAgaWYgKFxuICAgICAgIXRzLmlzSW1wb3J0RGVjbGFyYXRpb24obm9kZSkgfHxcbiAgICAgICF0cy5pc1N0cmluZ0xpdGVyYWwobm9kZS5tb2R1bGVTcGVjaWZpZXIpIHx8XG4gICAgICBub2RlLm1vZHVsZVNwZWNpZmllci50ZXh0ICE9PSBtb2R1bGVOYW1lXG4gICAgKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBGaWx0ZXIgb3V0IGltcG9ydHMgdGhhdCBkb24ndCBoYXZlIHRoZSByaWdodCBzaGFwZS5cbiAgICBpZiAoXG4gICAgICAhbm9kZS5pbXBvcnRDbGF1c2UgfHxcbiAgICAgICFub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzIHx8XG4gICAgICAhdHMuaXNOYW1lZEltcG9ydHMobm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncylcbiAgICApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgZWxlbWVudHMgb2YgdGhlIGRlY2xhcmF0aW9uIGZvciB0aGUgc3BlY2lmaWMgaW1wb3J0LlxuICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzLmVsZW1lbnRzKSB7XG4gICAgICBpZiAoKGVsZW1lbnQucHJvcGVydHlOYW1lIHx8IGVsZW1lbnQubmFtZSkudGV4dCA9PT0gbmFtZSkge1xuICAgICAgICAvLyBUaGUgbG9jYWwgbmFtZSBpcyBhbHdheXMgaW4gYG5hbWVgLlxuICAgICAgICByZXR1cm4gZWxlbWVudC5uYW1lLnRleHQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKiBDcmVhdGVzIGEgc291cmNlIGZpbGUgZnJvbSBhIGZpbGUgcGF0aCB3aXRoaW4gYSBwcm9qZWN0LiAqL1xuZnVuY3Rpb24gY3JlYXRlU291cmNlRmlsZSh0cmVlOiBUcmVlLCBmaWxlUGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVQYXRoLCB0cmVlLnJlYWRUZXh0KGZpbGVQYXRoKSwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBhcHAgY29uZmlnIG9iamVjdCBsaXRlcmFsIGFuZCBhZGRzIGl0IHRvIGEgY2FsbCBleHByZXNzaW9uIGFzIGFuIGFyZ3VtZW50LlxuICogQHBhcmFtIGNhbGwgQ2FsbCB0byB3aGljaCB0byBhZGQgdGhlIGNvbmZpZy5cbiAqIEBwYXJhbSBleHByZXNzaW9uIEV4cHJlc3Npb24gdGhhdCBzaG91bGQgaW5zZXJ0ZWQgaW50byB0aGUgbmV3IGNvbmZpZy5cbiAqIEBwYXJhbSByZWNvcmRlciBSZWNvcmRlciB0byB3aGljaCB0byBsb2cgdGhlIGNoYW5nZS5cbiAqL1xuZnVuY3Rpb24gYWRkTmV3QXBwQ29uZmlnVG9DYWxsKFxuICBjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbixcbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbixcbiAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuKTogdm9pZCB7XG4gIGNvbnN0IG5ld0NhbGwgPSB0cy5mYWN0b3J5LnVwZGF0ZUNhbGxFeHByZXNzaW9uKGNhbGwsIGNhbGwuZXhwcmVzc2lvbiwgY2FsbC50eXBlQXJndW1lbnRzLCBbXG4gICAgLi4uY2FsbC5hcmd1bWVudHMsXG4gICAgdHMuZmFjdG9yeS5jcmVhdGVPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihcbiAgICAgIFtcbiAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVQcm9wZXJ0eUFzc2lnbm1lbnQoXG4gICAgICAgICAgJ3Byb3ZpZGVycycsXG4gICAgICAgICAgdHMuZmFjdG9yeS5jcmVhdGVBcnJheUxpdGVyYWxFeHByZXNzaW9uKFtleHByZXNzaW9uXSksXG4gICAgICAgICksXG4gICAgICBdLFxuICAgICAgdHJ1ZSxcbiAgICApLFxuICBdKTtcblxuICByZWNvcmRlci5yZW1vdmUoY2FsbC5nZXRTdGFydCgpLCBjYWxsLmdldFdpZHRoKCkpO1xuICByZWNvcmRlci5pbnNlcnRSaWdodChcbiAgICBjYWxsLmdldFN0YXJ0KCksXG4gICAgdHMuY3JlYXRlUHJpbnRlcigpLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgbmV3Q2FsbCwgY2FsbC5nZXRTb3VyY2VGaWxlKCkpLFxuICApO1xufVxuXG4vKipcbiAqIEFkZHMgYW4gZWxlbWVudCB0byBhbiBhcnJheSBsaXRlcmFsIGV4cHJlc3Npb24uXG4gKiBAcGFyYW0gbm9kZSBBcnJheSB0byB3aGljaCB0byBhZGQgdGhlIGVsZW1lbnQuXG4gKiBAcGFyYW0gZWxlbWVudCBFbGVtZW50IHRvIGJlIGFkZGVkLlxuICogQHBhcmFtIHJlY29yZGVyIFJlY29yZGVyIHRvIHdoaWNoIHRvIGxvZyB0aGUgY2hhbmdlLlxuICovXG5mdW5jdGlvbiBhZGRFbGVtZW50VG9BcnJheShcbiAgbm9kZTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbixcbiAgZWxlbWVudDogdHMuRXhwcmVzc2lvbixcbiAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuKTogdm9pZCB7XG4gIGNvbnN0IG5ld0xpdGVyYWwgPSB0cy5mYWN0b3J5LnVwZGF0ZUFycmF5TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgWy4uLm5vZGUuZWxlbWVudHMsIGVsZW1lbnRdKTtcbiAgcmVjb3JkZXIucmVtb3ZlKG5vZGUuZ2V0U3RhcnQoKSwgbm9kZS5nZXRXaWR0aCgpKTtcbiAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoXG4gICAgbm9kZS5nZXRTdGFydCgpLFxuICAgIHRzLmNyZWF0ZVByaW50ZXIoKS5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIG5ld0xpdGVyYWwsIG5vZGUuZ2V0U291cmNlRmlsZSgpKSxcbiAgKTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgYHByb3ZpZGVyc2AgcHJvcGVydHkgdG8gYW4gb2JqZWN0IGxpdGVyYWwuXG4gKiBAcGFyYW0gbm9kZSBMaXRlcmFsIHRvIHdoaWNoIHRvIGFkZCB0aGUgYHByb3ZpZGVyc2AuXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBQcm92aWRlciB0aGF0IHNob3VsZCBiZSBwYXJ0IG9mIHRoZSBnZW5lcmF0ZWQgYHByb3ZpZGVyc2AgYXJyYXkuXG4gKiBAcGFyYW0gcmVjb3JkZXIgUmVjb3JkZXIgdG8gd2hpY2ggdG8gbG9nIHRoZSBjaGFuZ2UuXG4gKi9cbmZ1bmN0aW9uIGFkZFByb3ZpZGVyc1RvT2JqZWN0TGl0ZXJhbChcbiAgbm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sXG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24sXG4gIHJlY29yZGVyOiBVcGRhdGVSZWNvcmRlcixcbikge1xuICBjb25zdCBuZXdPcHRpb25zTGl0ZXJhbCA9IHRzLmZhY3RvcnkudXBkYXRlT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSwgW1xuICAgIC4uLm5vZGUucHJvcGVydGllcyxcbiAgICB0cy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICdwcm92aWRlcnMnLFxuICAgICAgdHMuZmFjdG9yeS5jcmVhdGVBcnJheUxpdGVyYWxFeHByZXNzaW9uKFtleHByZXNzaW9uXSksXG4gICAgKSxcbiAgXSk7XG4gIHJlY29yZGVyLnJlbW92ZShub2RlLmdldFN0YXJ0KCksIG5vZGUuZ2V0V2lkdGgoKSk7XG4gIHJlY29yZGVyLmluc2VydFJpZ2h0KFxuICAgIG5vZGUuZ2V0U3RhcnQoKSxcbiAgICB0cy5jcmVhdGVQcmludGVyKCkucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBuZXdPcHRpb25zTGl0ZXJhbCwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpLFxuICApO1xufVxuXG4vKiogQ2hlY2tzIHdoZXRoZXIgYSBub2RlIGlzIGEgY2FsbCB0byBgbWVyZ2VBcHBsaWNhdGlvbkNvbmZpZ2AuICovXG5mdW5jdGlvbiBpc01lcmdlQXBwQ29uZmlnQ2FsbChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5DYWxsRXhwcmVzc2lvbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihub2RlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGxvY2FsTmFtZSA9IGZpbmRJbXBvcnRMb2NhbE5hbWUoXG4gICAgbm9kZS5nZXRTb3VyY2VGaWxlKCksXG4gICAgJ21lcmdlQXBwbGljYXRpb25Db25maWcnLFxuICAgICdAYW5ndWxhci9jb3JlJyxcbiAgKTtcblxuICByZXR1cm4gISFsb2NhbE5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUuZXhwcmVzc2lvbikgJiYgbm9kZS5leHByZXNzaW9uLnRleHQgPT09IGxvY2FsTmFtZTtcbn1cbiJdfQ==