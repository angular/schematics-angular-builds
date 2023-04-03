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
        return;
    }
    // If the config is a `mergeApplicationProviders` call, add another config to it.
    if (isMergeAppConfigCall(bootstrapCall.arguments[1])) {
        const recorder = tree.beginUpdate(filePath);
        addNewAppConfigToCall(bootstrapCall.arguments[1], providersCall, recorder);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9wcml2YXRlL3N0YW5kYWxvbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7Ozs7O0FBRUgsMkRBQXVGO0FBQ3ZGLCtCQUFxQztBQUNyQywrR0FBK0U7QUFDL0Usb0RBQW9EO0FBQ3BELDhDQUFpRDtBQVdqRDs7Ozs7R0FLRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLElBQVUsRUFBRSxRQUFnQixFQUFFLFNBQWlCO0lBQ2xGLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNwRCxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMvRCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDdEYsTUFBTSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBRS9GLE9BQU8sQ0FBQyxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQzlDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxvQkFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FDeEQsQ0FBQztBQUNKLENBQUM7QUFURCxvREFTQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBZ0Isc0JBQXNCLENBQ3BDLElBQVUsRUFDVixRQUFnQixFQUNoQixZQUFvQjtJQUVwQixNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDcEQsTUFBTSxhQUFhLEdBQUcsNEJBQTRCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0QsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3RGLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUVqRixPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUN0QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQ0wsb0JBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFDdkIsb0JBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQztRQUM5QixFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxZQUFZLENBQ3RDLENBQUM7QUFDSixDQUFDO0FBaEJELHdEQWdCQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLG9DQUFvQyxDQUNsRCxJQUFVLEVBQ1YsUUFBZ0IsRUFDaEIsVUFBa0IsRUFDbEIsVUFBa0I7SUFFbEIsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sYUFBYSxHQUFHLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBbUIsRUFBRSxRQUF3QixFQUFFLEVBQUU7UUFDbkUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWxDO1lBQ0UsSUFBQSx3QkFBWSxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQztZQUN0RCxJQUFBLHdCQUFZLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxlQUFlLENBQUM7U0FDdkUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNuQixJQUFJLE1BQU0sWUFBWSxxQkFBWSxFQUFFO2dCQUNsQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUM7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ2xCLE1BQU0sSUFBSSxnQ0FBbUIsQ0FBQywrQ0FBK0MsUUFBUSxFQUFFLENBQUMsQ0FBQztLQUMxRjtJQUVELE1BQU0sbUJBQW1CLEdBQUcsb0JBQUUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQ3pELG9CQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLEVBQ2xELEVBQUUsRUFDRixDQUFDLG9CQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQzFDLENBQUM7SUFFRix3RUFBd0U7SUFDeEUsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEUsVUFBVSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVCLE9BQU87S0FDUjtJQUVELGlGQUFpRjtJQUNqRixJQUFJLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNwRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakYsVUFBVSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTVCLE9BQU87S0FDUjtJQUVELHNEQUFzRDtJQUN0RCxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUUvRCxJQUFJLENBQUMsU0FBUyxFQUFFO1FBQ2QsTUFBTSxJQUFJLGdDQUFtQixDQUMzQix1RUFBdUUsUUFBUSxFQUFFLENBQ2xGLENBQUM7S0FDSDtJQUVELE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFDN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNsRCxNQUFNLFVBQVUsR0FBRywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV2RCxVQUFVLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRTdDLElBQUksVUFBVSxFQUFFO1FBQ2QsMEVBQTBFO1FBQzFFLFFBQVEsQ0FBQyxXQUFXLENBQ2xCLFVBQVUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQzlELEtBQUssVUFBVSxFQUFFLENBQ2xCLENBQUM7S0FDSDtTQUFNO1FBQ0wsTUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0RCxJQUFJLGdCQUFnQixFQUFFO1lBQ3BCLHdEQUF3RDtZQUN4RCxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNwRTthQUFNO1lBQ0wsb0VBQW9FO1lBQ3BFLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNwRTtLQUNGO0lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBckZELG9GQXFGQztBQUVEOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQiwyQ0FBMkMsQ0FDekQsSUFBVSxFQUNWLFFBQWdCLEVBQ2hCLFlBQW9CLEVBQ3BCLFVBQWtCLEVBQ2xCLE9BQXdCLEVBQUU7SUFFMUIsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sYUFBYSxHQUFHLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sVUFBVSxHQUFHLENBQUMsSUFBbUIsRUFBRSxRQUF3QixFQUFFLEVBQUU7UUFDbkUsTUFBTSxNQUFNLEdBQUcsSUFBQSx3QkFBWSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTVFLElBQUksTUFBTSxZQUFZLHFCQUFZLEVBQUU7WUFDbEMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUMvQztJQUNILENBQUMsQ0FBQztJQUVGLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDbEIsTUFBTSxJQUFJLGdDQUFtQixDQUFDLCtDQUErQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzFGO0lBRUQsTUFBTSxhQUFhLEdBQUcsb0JBQUUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQ25ELG9CQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUN6QyxTQUFTLEVBQ1QsSUFBSSxDQUNMLENBQUM7SUFFRix3RUFBd0U7SUFDeEUsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzlELFVBQVUsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU1QixPQUFPO0tBQ1I7SUFFRCxpRkFBaUY7SUFDakYsSUFBSSxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMzRSxVQUFVLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUIsT0FBTztLQUNSO0lBRUQsc0RBQXNEO0lBQ3RELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRS9ELElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDZCxNQUFNLElBQUksZ0NBQW1CLENBQzNCLHVFQUF1RSxRQUFRLEVBQUUsQ0FDbEYsQ0FBQztLQUNIO0lBRUQsTUFBTSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQztJQUM3RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFdEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUU3QyxJQUFJLGdCQUFnQixFQUFFO1FBQ3BCLHdEQUF3RDtRQUN4RCxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDOUQ7U0FBTTtRQUNMLG9FQUFvRTtRQUNwRSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQzlEO0lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBdkVELGtHQXVFQztBQUVELDhEQUE4RDtBQUM5RCxTQUFnQiw0QkFBNEIsQ0FBQyxVQUF5QjtJQUNwRSxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FDbkMsVUFBVSxFQUNWLHNCQUFzQixFQUN0QiwyQkFBMkIsQ0FDNUIsQ0FBQztJQUVGLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDZCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsSUFBSSxNQUFNLEdBQTZCLElBQUksQ0FBQztJQUU1QyxVQUFVLENBQUMsWUFBWSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUk7UUFDeEMsSUFDRSxvQkFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztZQUN6QixvQkFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFDbEM7WUFDQSxNQUFNLEdBQUcsSUFBSSxDQUFDO1NBQ2Y7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6QjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQTVCRCxvRUE0QkM7QUFFRCx5RUFBeUU7QUFDekUsU0FBUywyQkFBMkIsQ0FBQyxNQUFrQztJQUNyRSxNQUFNLG1CQUFtQixHQUFHLG1CQUFtQixDQUM3QyxNQUFNLENBQUMsYUFBYSxFQUFFLEVBQ3RCLHFCQUFxQixFQUNyQixlQUFlLENBQ2hCLENBQUM7SUFDRixNQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXRELElBQUksZ0JBQWdCLElBQUksbUJBQW1CLEVBQUU7UUFDM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUU7WUFDL0MsMkVBQTJFO1lBQzNFLElBQ0Usb0JBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7Z0JBQzVCLG9CQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLG1CQUFtQixFQUMvQztnQkFDQSxPQUFPLE9BQU8sQ0FBQzthQUNoQjtTQUNGO0tBQ0Y7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCx3RUFBd0U7QUFDeEUsU0FBUyxvQkFBb0IsQ0FDM0IsTUFBa0M7SUFFbEMsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFO1FBQ3BDLElBQ0Usb0JBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7WUFDN0Isb0JBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXO1lBQzlCLG9CQUFFLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUM3QztZQUNBLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztTQUN6QjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsYUFBZ0MsRUFDaEMsSUFBVSxFQUNWLFFBQWdCO0lBRWhCLElBQUksYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUMsSUFBSSxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1NBQ25DO1FBRUQsSUFBSSxvQkFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMzQixPQUFPLDhCQUE4QixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDL0Q7S0FDRjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyw4QkFBOEIsQ0FDckMsVUFBeUIsRUFDekIsSUFBVSxFQUNWLGdCQUF3QjtJQUV4QixNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUM7SUFFOUMsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFO1FBQ3hDLHdFQUF3RTtRQUN4RSwwRUFBMEU7UUFDMUUsMkNBQTJDO1FBQzNDLElBQ0UsQ0FBQyxvQkFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUM3QixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsYUFBYTtZQUNqQyxDQUFDLG9CQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDO1lBQ25ELENBQUMsb0JBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQzdDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUMxQztZQUNBLFNBQVM7U0FDVjtRQUVELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFO1lBQ2hFLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLElBQUksRUFBRTtnQkFDM0MsU0FBUzthQUNWO1lBRUQseUZBQXlGO1lBQ3pGLHVGQUF1RjtZQUN2Rix1REFBdUQ7WUFDdkQsTUFBTSxRQUFRLEdBQUcsSUFBQSxXQUFJLEVBQUMsSUFBQSxjQUFPLEVBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQztZQUNwRixNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1RCxNQUFNLGdCQUFnQixHQUFHLDZCQUE2QixDQUNwRCxrQkFBa0IsRUFDbEIsQ0FBQyxTQUFTLENBQUMsWUFBWSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2hELENBQUM7WUFFRixJQUFJLGdCQUFnQixFQUFFO2dCQUNwQixPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2FBQzdDO1NBQ0Y7S0FDRjtJQUVELE1BQU0sa0JBQWtCLEdBQUcsNkJBQTZCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0RixPQUFPLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzlGLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyw2QkFBNkIsQ0FDcEMsVUFBeUIsRUFDekIsWUFBb0I7SUFFcEIsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsVUFBVSxFQUFFO1FBQ3hDLElBQUksb0JBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoQyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFO2dCQUNwRCxJQUNFLG9CQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFlBQVk7b0JBQy9CLElBQUksQ0FBQyxXQUFXO29CQUNoQixvQkFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFDOUM7b0JBQ0EsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUN6QjthQUNGO1NBQ0Y7S0FDRjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyxtQkFBbUIsQ0FDMUIsVUFBeUIsRUFDekIsSUFBWSxFQUNaLFVBQWtCO0lBRWxCLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLFVBQVUsRUFBRTtRQUN4QyxtQ0FBbUM7UUFDbkMsSUFDRSxDQUFDLG9CQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQzdCLENBQUMsb0JBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUN6QyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQ3hDO1lBQ0EsU0FBUztTQUNWO1FBRUQsc0RBQXNEO1FBQ3RELElBQ0UsQ0FBQyxJQUFJLENBQUMsWUFBWTtZQUNsQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYTtZQUNoQyxDQUFDLG9CQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEVBQ25EO1lBQ0EsU0FBUztTQUNWO1FBRUQsd0VBQXdFO1FBQ3hFLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFO1lBQzlELElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO2dCQUN4RCxzQ0FBc0M7Z0JBQ3RDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7YUFDMUI7U0FDRjtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsK0RBQStEO0FBQy9ELFNBQVMsZ0JBQWdCLENBQUMsSUFBVSxFQUFFLFFBQWdCO0lBQ3BELE9BQU8sb0JBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxvQkFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyxxQkFBcUIsQ0FDNUIsSUFBdUIsRUFDdkIsVUFBeUIsRUFDekIsUUFBd0I7SUFFeEIsTUFBTSxPQUFPLEdBQUcsb0JBQUUsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUN6RixHQUFHLElBQUksQ0FBQyxTQUFTO1FBQ2pCLG9CQUFFLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUN0QztZQUNFLG9CQUFFLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUNqQyxXQUFXLEVBQ1gsb0JBQUUsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUN0RDtTQUNGLEVBQ0QsSUFBSSxDQUNMO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsUUFBUSxDQUFDLFdBQVcsQ0FDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUNmLG9CQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsU0FBUyxDQUFDLG9CQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQ3JGLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFTLGlCQUFpQixDQUN4QixJQUErQixFQUMvQixPQUFzQixFQUN0QixRQUF3QjtJQUV4QixNQUFNLFVBQVUsR0FBRyxvQkFBRSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM5RixRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUNsRCxRQUFRLENBQUMsV0FBVyxDQUNsQixJQUFJLENBQUMsUUFBUSxFQUFFLEVBQ2Ysb0JBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxTQUFTLENBQUMsb0JBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FDeEYsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsMkJBQTJCLENBQ2xDLElBQWdDLEVBQ2hDLFVBQXlCLEVBQ3pCLFFBQXdCO0lBRXhCLE1BQU0saUJBQWlCLEdBQUcsb0JBQUUsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsSUFBSSxFQUFFO1FBQ3ZFLEdBQUcsSUFBSSxDQUFDLFVBQVU7UUFDbEIsb0JBQUUsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQ2pDLFdBQVcsRUFDWCxvQkFBRSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQ3REO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEQsUUFBUSxDQUFDLFdBQVcsQ0FDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUNmLG9CQUFFLENBQUMsYUFBYSxFQUFFLENBQUMsU0FBUyxDQUFDLG9CQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FDL0YsQ0FBQztBQUNKLENBQUM7QUFFRCxtRUFBbUU7QUFDbkUsU0FBUyxvQkFBb0IsQ0FBQyxJQUFhO0lBQ3pDLElBQUksQ0FBQyxvQkFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzlCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FDbkMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUNwQix3QkFBd0IsRUFDeEIsZUFBZSxDQUNoQixDQUFDO0lBRUYsT0FBTyxDQUFDLENBQUMsU0FBUyxJQUFJLG9CQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUM7QUFDL0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBTY2hlbWF0aWNzRXhjZXB0aW9uLCBUcmVlLCBVcGRhdGVSZWNvcmRlciB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9zY2hlbWF0aWNzJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICcuLi90aGlyZF9wYXJ0eS9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2xpYi90eXBlc2NyaXB0JztcbmltcG9ydCB7IGluc2VydEltcG9ydCB9IGZyb20gJy4uL3V0aWxpdHkvYXN0LXV0aWxzJztcbmltcG9ydCB7IEluc2VydENoYW5nZSB9IGZyb20gJy4uL3V0aWxpdHkvY2hhbmdlJztcblxuLyoqIEFwcCBjb25maWcgdGhhdCB3YXMgcmVzb2x2ZWQgdG8gaXRzIHNvdXJjZSBub2RlLiAqL1xuaW50ZXJmYWNlIFJlc29sdmVkQXBwQ29uZmlnIHtcbiAgLyoqIFRyZWUtcmVsYXRpdmUgcGF0aCBvZiB0aGUgZmlsZSBjb250YWluaW5nIHRoZSBhcHAgY29uZmlnLiAqL1xuICBmaWxlUGF0aDogc3RyaW5nO1xuXG4gIC8qKiBOb2RlIGRlZmluaW5nIHRoZSBhcHAgY29uZmlnLiAqL1xuICBub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciB0aGUgcHJvdmlkZXJzIGZyb20gYSBtb2R1bGUgYXJlIGJlaW5nIGltcG9ydGVkIGluIGEgYGJvb3RzdHJhcEFwcGxpY2F0aW9uYCBjYWxsLlxuICogQHBhcmFtIHRyZWUgRmlsZSB0cmVlIG9mIHRoZSBwcm9qZWN0LlxuICogQHBhcmFtIGZpbGVQYXRoIFBhdGggb2YgdGhlIGZpbGUgaW4gd2hpY2ggdG8gY2hlY2suXG4gKiBAcGFyYW0gY2xhc3NOYW1lIENsYXNzIG5hbWUgb2YgdGhlIG1vZHVsZSB0byBzZWFyY2ggZm9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW1wb3J0c1Byb3ZpZGVyc0Zyb20odHJlZTogVHJlZSwgZmlsZVBhdGg6IHN0cmluZywgY2xhc3NOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IGNyZWF0ZVNvdXJjZUZpbGUodHJlZSwgZmlsZVBhdGgpO1xuICBjb25zdCBib290c3RyYXBDYWxsID0gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbChzb3VyY2VGaWxlKTtcbiAgY29uc3QgYXBwQ29uZmlnID0gYm9vdHN0cmFwQ2FsbCA/IGZpbmRBcHBDb25maWcoYm9vdHN0cmFwQ2FsbCwgdHJlZSwgZmlsZVBhdGgpIDogbnVsbDtcbiAgY29uc3QgaW1wb3J0UHJvdmlkZXJzRnJvbUNhbGwgPSBhcHBDb25maWcgPyBmaW5kSW1wb3J0UHJvdmlkZXJzRnJvbUNhbGwoYXBwQ29uZmlnLm5vZGUpIDogbnVsbDtcblxuICByZXR1cm4gISFpbXBvcnRQcm92aWRlcnNGcm9tQ2FsbD8uYXJndW1lbnRzLnNvbWUoXG4gICAgKGFyZykgPT4gdHMuaXNJZGVudGlmaWVyKGFyZykgJiYgYXJnLnRleHQgPT09IGNsYXNzTmFtZSxcbiAgKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHByb3ZpZGVycyBmdW5jdGlvbiBpcyBiZWluZyBjYWxsZWQgaW4gYSBgYm9vdHN0cmFwQXBwbGljYXRpb25gIGNhbGwuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gZmlsZVBhdGggUGF0aCBvZiB0aGUgZmlsZSBpbiB3aGljaCB0byBjaGVjay5cbiAqIEBwYXJhbSBmdW5jdGlvbk5hbWUgTmFtZSBvZiB0aGUgZnVuY3Rpb24gdG8gc2VhcmNoIGZvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGxzUHJvdmlkZXJzRnVuY3Rpb24oXG4gIHRyZWU6IFRyZWUsXG4gIGZpbGVQYXRoOiBzdHJpbmcsXG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nLFxuKTogYm9vbGVhbiB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBjcmVhdGVTb3VyY2VGaWxlKHRyZWUsIGZpbGVQYXRoKTtcbiAgY29uc3QgYm9vdHN0cmFwQ2FsbCA9IGZpbmRCb290c3RyYXBBcHBsaWNhdGlvbkNhbGwoc291cmNlRmlsZSk7XG4gIGNvbnN0IGFwcENvbmZpZyA9IGJvb3RzdHJhcENhbGwgPyBmaW5kQXBwQ29uZmlnKGJvb3RzdHJhcENhbGwsIHRyZWUsIGZpbGVQYXRoKSA6IG51bGw7XG4gIGNvbnN0IHByb3ZpZGVyc0xpdGVyYWwgPSBhcHBDb25maWcgPyBmaW5kUHJvdmlkZXJzTGl0ZXJhbChhcHBDb25maWcubm9kZSkgOiBudWxsO1xuXG4gIHJldHVybiAhIXByb3ZpZGVyc0xpdGVyYWw/LmVsZW1lbnRzLnNvbWUoXG4gICAgKGVsKSA9PlxuICAgICAgdHMuaXNDYWxsRXhwcmVzc2lvbihlbCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihlbC5leHByZXNzaW9uKSAmJlxuICAgICAgZWwuZXhwcmVzc2lvbi50ZXh0ID09PSBmdW5jdGlvbk5hbWUsXG4gICk7XG59XG5cbi8qKlxuICogQWRkcyBhbiBgaW1wb3J0UHJvdmlkZXJzRnJvbWAgY2FsbCB0byB0aGUgYGJvb3RzdHJhcEFwcGxpY2F0aW9uYCBjYWxsLlxuICogQHBhcmFtIHRyZWUgRmlsZSB0cmVlIG9mIHRoZSBwcm9qZWN0LlxuICogQHBhcmFtIGZpbGVQYXRoIFBhdGggdG8gdGhlIGZpbGUgdGhhdCBzaG91bGQgYmUgdXBkYXRlZC5cbiAqIEBwYXJhbSBtb2R1bGVOYW1lIE5hbWUgb2YgdGhlIG1vZHVsZSB0aGF0IHNob3VsZCBiZSBpbXBvcnRlZC5cbiAqIEBwYXJhbSBtb2R1bGVQYXRoIFBhdGggZnJvbSB3aGljaCB0byBpbXBvcnQgdGhlIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZE1vZHVsZUltcG9ydFRvU3RhbmRhbG9uZUJvb3RzdHJhcChcbiAgdHJlZTogVHJlZSxcbiAgZmlsZVBhdGg6IHN0cmluZyxcbiAgbW9kdWxlTmFtZTogc3RyaW5nLFxuICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4pIHtcbiAgY29uc3Qgc291cmNlRmlsZSA9IGNyZWF0ZVNvdXJjZUZpbGUodHJlZSwgZmlsZVBhdGgpO1xuICBjb25zdCBib290c3RyYXBDYWxsID0gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbChzb3VyY2VGaWxlKTtcbiAgY29uc3QgYWRkSW1wb3J0cyA9IChmaWxlOiB0cy5Tb3VyY2VGaWxlLCByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIpID0+IHtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gZmlsZS5nZXRUZXh0KCk7XG5cbiAgICBbXG4gICAgICBpbnNlcnRJbXBvcnQoZmlsZSwgc291cmNlVGV4dCwgbW9kdWxlTmFtZSwgbW9kdWxlUGF0aCksXG4gICAgICBpbnNlcnRJbXBvcnQoZmlsZSwgc291cmNlVGV4dCwgJ2ltcG9ydFByb3ZpZGVyc0Zyb20nLCAnQGFuZ3VsYXIvY29yZScpLFxuICAgIF0uZm9yRWFjaCgoY2hhbmdlKSA9PiB7XG4gICAgICBpZiAoY2hhbmdlIGluc3RhbmNlb2YgSW5zZXJ0Q2hhbmdlKSB7XG4gICAgICAgIHJlY29yZGVyLmluc2VydExlZnQoY2hhbmdlLnBvcywgY2hhbmdlLnRvQWRkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBpZiAoIWJvb3RzdHJhcENhbGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgYm9vdHN0cmFwQXBwbGljYXRpb24gY2FsbCBpbiAke2ZpbGVQYXRofWApO1xuICB9XG5cbiAgY29uc3QgaW1wb3J0UHJvdmlkZXJzQ2FsbCA9IHRzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKCdpbXBvcnRQcm92aWRlcnNGcm9tJyksXG4gICAgW10sXG4gICAgW3RzLmZhY3RvcnkuY3JlYXRlSWRlbnRpZmllcihtb2R1bGVOYW1lKV0sXG4gICk7XG5cbiAgLy8gSWYgdGhlcmUncyBvbmx5IG9uZSBhcmd1bWVudCwgd2UgaGF2ZSB0byBjcmVhdGUgYSBuZXcgb2JqZWN0IGxpdGVyYWwuXG4gIGlmIChib290c3RyYXBDYWxsLmFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLCBpbXBvcnRQcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gICAgYWRkSW1wb3J0cyhzb3VyY2VGaWxlLCByZWNvcmRlcik7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSWYgdGhlIGNvbmZpZyBpcyBhIGBtZXJnZUFwcGxpY2F0aW9uUHJvdmlkZXJzYCBjYWxsLCBhZGQgYW5vdGhlciBjb25maWcgdG8gaXQuXG4gIGlmIChpc01lcmdlQXBwQ29uZmlnQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSkpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSwgaW1wb3J0UHJvdmlkZXJzQ2FsbCwgcmVjb3JkZXIpO1xuICAgIGFkZEltcG9ydHMoc291cmNlRmlsZSwgcmVjb3JkZXIpO1xuICAgIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIE90aGVyd2lzZSBhdHRlbXB0IHRvIG1lcmdlIGludG8gdGhlIGN1cnJlbnQgY29uZmlnLlxuICBjb25zdCBhcHBDb25maWcgPSBmaW5kQXBwQ29uZmlnKGJvb3RzdHJhcENhbGwsIHRyZWUsIGZpbGVQYXRoKTtcblxuICBpZiAoIWFwcENvbmZpZykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYENvdWxkIG5vdCBzdGF0aWNhbGx5IGFuYWx5emUgY29uZmlnIGluIGJvb3RzdHJhcEFwcGxpY2F0aW9uIGNhbGwgaW4gJHtmaWxlUGF0aH1gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7IGZpbGVQYXRoOiBjb25maWdGaWxlUGF0aCwgbm9kZTogY29uZmlnIH0gPSBhcHBDb25maWc7XG4gIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShjb25maWdGaWxlUGF0aCk7XG4gIGNvbnN0IGltcG9ydENhbGwgPSBmaW5kSW1wb3J0UHJvdmlkZXJzRnJvbUNhbGwoY29uZmlnKTtcblxuICBhZGRJbXBvcnRzKGNvbmZpZy5nZXRTb3VyY2VGaWxlKCksIHJlY29yZGVyKTtcblxuICBpZiAoaW1wb3J0Q2FsbCkge1xuICAgIC8vIElmIHRoZXJlJ3MgYW4gYGltcG9ydFByb3ZpZGVyc0Zyb21gIGNhbGwgYWxyZWFkeSwgYWRkIHRoZSBtb2R1bGUgdG8gaXQuXG4gICAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoXG4gICAgICBpbXBvcnRDYWxsLmFyZ3VtZW50c1tpbXBvcnRDYWxsLmFyZ3VtZW50cy5sZW5ndGggLSAxXS5nZXRFbmQoKSxcbiAgICAgIGAsICR7bW9kdWxlTmFtZX1gLFxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcHJvdmlkZXJzTGl0ZXJhbCA9IGZpbmRQcm92aWRlcnNMaXRlcmFsKGNvbmZpZyk7XG5cbiAgICBpZiAocHJvdmlkZXJzTGl0ZXJhbCkge1xuICAgICAgLy8gSWYgdGhlcmUncyBhIGBwcm92aWRlcnNgIGFycmF5LCBhZGQgdGhlIGltcG9ydCB0byBpdC5cbiAgICAgIGFkZEVsZW1lbnRUb0FycmF5KHByb3ZpZGVyc0xpdGVyYWwsIGltcG9ydFByb3ZpZGVyc0NhbGwsIHJlY29yZGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gT3RoZXJ3aXNlIGFkZCBhIGBwcm92aWRlcnNgIGFycmF5IHRvIHRoZSBleGlzdGluZyBvYmplY3QgbGl0ZXJhbC5cbiAgICAgIGFkZFByb3ZpZGVyc1RvT2JqZWN0TGl0ZXJhbChjb25maWcsIGltcG9ydFByb3ZpZGVyc0NhbGwsIHJlY29yZGVyKTtcbiAgICB9XG4gIH1cblxuICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG59XG5cbi8qKlxuICogQWRkcyBhIHByb3ZpZGVycyBmdW5jdGlvbiBjYWxsIHRvIHRoZSBgYm9vdHN0cmFwQXBwbGljYXRpb25gIGNhbGwuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gZmlsZVBhdGggUGF0aCB0byB0aGUgZmlsZSB0aGF0IHNob3VsZCBiZSB1cGRhdGVkLlxuICogQHBhcmFtIGZ1bmN0aW9uTmFtZSBOYW1lIG9mIHRoZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQuXG4gKiBAcGFyYW0gaW1wb3J0UGF0aCBQYXRoIGZyb20gd2hpY2ggdG8gaW1wb3J0IHRoZSBmdW5jdGlvbi5cbiAqIEBwYXJhbSBhcmdzIEFyZ3VtZW50cyB0byB1c2Ugd2hlbiBjYWxsaW5nIHRoZSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEZ1bmN0aW9uYWxQcm92aWRlcnNUb1N0YW5kYWxvbmVCb290c3RyYXAoXG4gIHRyZWU6IFRyZWUsXG4gIGZpbGVQYXRoOiBzdHJpbmcsXG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcsXG4gIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSA9IFtdLFxuKSB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPSBjcmVhdGVTb3VyY2VGaWxlKHRyZWUsIGZpbGVQYXRoKTtcbiAgY29uc3QgYm9vdHN0cmFwQ2FsbCA9IGZpbmRCb290c3RyYXBBcHBsaWNhdGlvbkNhbGwoc291cmNlRmlsZSk7XG4gIGNvbnN0IGFkZEltcG9ydHMgPSAoZmlsZTogdHMuU291cmNlRmlsZSwgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gaW5zZXJ0SW1wb3J0KGZpbGUsIGZpbGUuZ2V0VGV4dCgpLCBmdW5jdGlvbk5hbWUsIGltcG9ydFBhdGgpO1xuXG4gICAgaWYgKGNoYW5nZSBpbnN0YW5jZW9mIEluc2VydENoYW5nZSkge1xuICAgICAgcmVjb3JkZXIuaW5zZXJ0TGVmdChjaGFuZ2UucG9zLCBjaGFuZ2UudG9BZGQpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoIWJvb3RzdHJhcENhbGwpIHtcbiAgICB0aHJvdyBuZXcgU2NoZW1hdGljc0V4Y2VwdGlvbihgQ291bGQgbm90IGZpbmQgYm9vdHN0cmFwQXBwbGljYXRpb24gY2FsbCBpbiAke2ZpbGVQYXRofWApO1xuICB9XG5cbiAgY29uc3QgcHJvdmlkZXJzQ2FsbCA9IHRzLmZhY3RvcnkuY3JlYXRlQ2FsbEV4cHJlc3Npb24oXG4gICAgdHMuZmFjdG9yeS5jcmVhdGVJZGVudGlmaWVyKGZ1bmN0aW9uTmFtZSksXG4gICAgdW5kZWZpbmVkLFxuICAgIGFyZ3MsXG4gICk7XG5cbiAgLy8gSWYgdGhlcmUncyBvbmx5IG9uZSBhcmd1bWVudCwgd2UgaGF2ZSB0byBjcmVhdGUgYSBuZXcgb2JqZWN0IGxpdGVyYWwuXG4gIGlmIChib290c3RyYXBDYWxsLmFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gICAgYWRkSW1wb3J0cyhzb3VyY2VGaWxlLCByZWNvcmRlcik7XG4gICAgdHJlZS5jb21taXRVcGRhdGUocmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSWYgdGhlIGNvbmZpZyBpcyBhIGBtZXJnZUFwcGxpY2F0aW9uUHJvdmlkZXJzYCBjYWxsLCBhZGQgYW5vdGhlciBjb25maWcgdG8gaXQuXG4gIGlmIChpc01lcmdlQXBwQ29uZmlnQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSkpIHtcbiAgICBjb25zdCByZWNvcmRlciA9IHRyZWUuYmVnaW5VcGRhdGUoZmlsZVBhdGgpO1xuICAgIGFkZE5ld0FwcENvbmZpZ1RvQ2FsbChib290c3RyYXBDYWxsLmFyZ3VtZW50c1sxXSwgcHJvdmlkZXJzQ2FsbCwgcmVjb3JkZXIpO1xuICAgIGFkZEltcG9ydHMoc291cmNlRmlsZSwgcmVjb3JkZXIpO1xuICAgIHRyZWUuY29tbWl0VXBkYXRlKHJlY29yZGVyKTtcblxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIE90aGVyd2lzZSBhdHRlbXB0IHRvIG1lcmdlIGludG8gdGhlIGN1cnJlbnQgY29uZmlnLlxuICBjb25zdCBhcHBDb25maWcgPSBmaW5kQXBwQ29uZmlnKGJvb3RzdHJhcENhbGwsIHRyZWUsIGZpbGVQYXRoKTtcblxuICBpZiAoIWFwcENvbmZpZykge1xuICAgIHRocm93IG5ldyBTY2hlbWF0aWNzRXhjZXB0aW9uKFxuICAgICAgYENvdWxkIG5vdCBzdGF0aWNhbGx5IGFuYWx5emUgY29uZmlnIGluIGJvb3RzdHJhcEFwcGxpY2F0aW9uIGNhbGwgaW4gJHtmaWxlUGF0aH1gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7IGZpbGVQYXRoOiBjb25maWdGaWxlUGF0aCwgbm9kZTogY29uZmlnIH0gPSBhcHBDb25maWc7XG4gIGNvbnN0IHJlY29yZGVyID0gdHJlZS5iZWdpblVwZGF0ZShjb25maWdGaWxlUGF0aCk7XG4gIGNvbnN0IHByb3ZpZGVyc0xpdGVyYWwgPSBmaW5kUHJvdmlkZXJzTGl0ZXJhbChjb25maWcpO1xuXG4gIGFkZEltcG9ydHMoY29uZmlnLmdldFNvdXJjZUZpbGUoKSwgcmVjb3JkZXIpO1xuXG4gIGlmIChwcm92aWRlcnNMaXRlcmFsKSB7XG4gICAgLy8gSWYgdGhlcmUncyBhIGBwcm92aWRlcnNgIGFycmF5LCBhZGQgdGhlIGltcG9ydCB0byBpdC5cbiAgICBhZGRFbGVtZW50VG9BcnJheShwcm92aWRlcnNMaXRlcmFsLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gIH0gZWxzZSB7XG4gICAgLy8gT3RoZXJ3aXNlIGFkZCBhIGBwcm92aWRlcnNgIGFycmF5IHRvIHRoZSBleGlzdGluZyBvYmplY3QgbGl0ZXJhbC5cbiAgICBhZGRQcm92aWRlcnNUb09iamVjdExpdGVyYWwoY29uZmlnLCBwcm92aWRlcnNDYWxsLCByZWNvcmRlcik7XG4gIH1cblxuICB0cmVlLmNvbW1pdFVwZGF0ZShyZWNvcmRlcik7XG59XG5cbi8qKiBGaW5kcyB0aGUgY2FsbCB0byBgYm9vdHN0cmFwQXBwbGljYXRpb25gIHdpdGhpbiBhIGZpbGUuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEJvb3RzdHJhcEFwcGxpY2F0aW9uQ2FsbChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuQ2FsbEV4cHJlc3Npb24gfCBudWxsIHtcbiAgY29uc3QgbG9jYWxOYW1lID0gZmluZEltcG9ydExvY2FsTmFtZShcbiAgICBzb3VyY2VGaWxlLFxuICAgICdib290c3RyYXBBcHBsaWNhdGlvbicsXG4gICAgJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXInLFxuICApO1xuXG4gIGlmICghbG9jYWxOYW1lKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBsZXQgcmVzdWx0OiB0cy5DYWxsRXhwcmVzc2lvbiB8IG51bGwgPSBudWxsO1xuXG4gIHNvdXJjZUZpbGUuZm9yRWFjaENoaWxkKGZ1bmN0aW9uIHdhbGsobm9kZSkge1xuICAgIGlmIChcbiAgICAgIHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gbG9jYWxOYW1lXG4gICAgKSB7XG4gICAgICByZXN1bHQgPSBub2RlO1xuICAgIH1cblxuICAgIGlmICghcmVzdWx0KSB7XG4gICAgICBub2RlLmZvckVhY2hDaGlsZCh3YWxrKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKiBGaW5kIGEgY2FsbCB0byBgaW1wb3J0UHJvdmlkZXJzRnJvbWAgd2l0aGluIGFuIGFwcGxpY2F0aW9uIGNvbmZpZy4gKi9cbmZ1bmN0aW9uIGZpbmRJbXBvcnRQcm92aWRlcnNGcm9tQ2FsbChjb25maWc6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogdHMuQ2FsbEV4cHJlc3Npb24gfCBudWxsIHtcbiAgY29uc3QgaW1wb3J0UHJvdmlkZXJzTmFtZSA9IGZpbmRJbXBvcnRMb2NhbE5hbWUoXG4gICAgY29uZmlnLmdldFNvdXJjZUZpbGUoKSxcbiAgICAnaW1wb3J0UHJvdmlkZXJzRnJvbScsXG4gICAgJ0Bhbmd1bGFyL2NvcmUnLFxuICApO1xuICBjb25zdCBwcm92aWRlcnNMaXRlcmFsID0gZmluZFByb3ZpZGVyc0xpdGVyYWwoY29uZmlnKTtcblxuICBpZiAocHJvdmlkZXJzTGl0ZXJhbCAmJiBpbXBvcnRQcm92aWRlcnNOYW1lKSB7XG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHByb3ZpZGVyc0xpdGVyYWwuZWxlbWVudHMpIHtcbiAgICAgIC8vIExvb2sgZm9yIGFuIGFycmF5IGVsZW1lbnQgdGhhdCBjYWxscyB0aGUgYGltcG9ydFByb3ZpZGVyc0Zyb21gIGZ1bmN0aW9uLlxuICAgICAgaWYgKFxuICAgICAgICB0cy5pc0NhbGxFeHByZXNzaW9uKGVsZW1lbnQpICYmXG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihlbGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICAgIGVsZW1lbnQuZXhwcmVzc2lvbi50ZXh0ID09PSBpbXBvcnRQcm92aWRlcnNOYW1lXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKiBGaW5kcyB0aGUgYHByb3ZpZGVyc2AgYXJyYXkgbGl0ZXJhbCB3aXRoaW4gYW4gYXBwbGljYXRpb24gY29uZmlnLiAqL1xuZnVuY3Rpb24gZmluZFByb3ZpZGVyc0xpdGVyYWwoXG4gIGNvbmZpZzogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sXG4pOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uIHwgbnVsbCB7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBjb25maWcucHJvcGVydGllcykge1xuICAgIGlmIChcbiAgICAgIHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHByb3ApICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIocHJvcC5uYW1lKSAmJlxuICAgICAgcHJvcC5uYW1lLnRleHQgPT09ICdwcm92aWRlcnMnICYmXG4gICAgICB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24ocHJvcC5pbml0aWFsaXplcilcbiAgICApIHtcbiAgICAgIHJldHVybiBwcm9wLmluaXRpYWxpemVyO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBub2RlIHRoYXQgZGVmaW5lcyB0aGUgYXBwIGNvbmZpZyBmcm9tIGEgYm9vdHN0cmFwIGNhbGwuXG4gKiBAcGFyYW0gYm9vdHN0cmFwQ2FsbCBDYWxsIGZvciB3aGljaCB0byByZXNvbHZlIHRoZSBjb25maWcuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gZmlsZVBhdGggRmlsZSBwYXRoIG9mIHRoZSBib290c3RyYXAgY2FsbC5cbiAqL1xuZnVuY3Rpb24gZmluZEFwcENvbmZpZyhcbiAgYm9vdHN0cmFwQ2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sXG4gIHRyZWU6IFRyZWUsXG4gIGZpbGVQYXRoOiBzdHJpbmcsXG4pOiBSZXNvbHZlZEFwcENvbmZpZyB8IG51bGwge1xuICBpZiAoYm9vdHN0cmFwQ2FsbC5hcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIGNvbnN0IGNvbmZpZyA9IGJvb3RzdHJhcENhbGwuYXJndW1lbnRzWzFdO1xuXG4gICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oY29uZmlnKSkge1xuICAgICAgcmV0dXJuIHsgZmlsZVBhdGgsIG5vZGU6IGNvbmZpZyB9O1xuICAgIH1cblxuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoY29uZmlnKSkge1xuICAgICAgcmV0dXJuIHJlc29sdmVBcHBDb25maWdGcm9tSWRlbnRpZmllcihjb25maWcsIHRyZWUsIGZpbGVQYXRoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgYXBwIGNvbmZpZyBmcm9tIGFuIGlkZW50aWZpZXIgcmVmZXJyaW5nIHRvIGl0LlxuICogQHBhcmFtIGlkZW50aWZpZXIgSWRlbnRpZmllciByZWZlcnJpbmcgdG8gdGhlIGFwcCBjb25maWcuXG4gKiBAcGFyYW0gdHJlZSBGaWxlIHRyZWUgb2YgdGhlIHByb2plY3QuXG4gKiBAcGFyYW0gYm9vdHN0YXBGaWxlUGF0aCBQYXRoIG9mIHRoZSBib290c3RyYXAgY2FsbC5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZUFwcENvbmZpZ0Zyb21JZGVudGlmaWVyKFxuICBpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyLFxuICB0cmVlOiBUcmVlLFxuICBib290c3RhcEZpbGVQYXRoOiBzdHJpbmcsXG4pOiBSZXNvbHZlZEFwcENvbmZpZyB8IG51bGwge1xuICBjb25zdCBzb3VyY2VGaWxlID0gaWRlbnRpZmllci5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIHNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgIC8vIE9ubHkgbG9vayBhdCByZWxhdGl2ZSBpbXBvcnRzLiBUaGlzIHdpbGwgYnJlYWsgaWYgdGhlIGFwcCB1c2VzIGEgcGF0aFxuICAgIC8vIG1hcHBpbmcgdG8gcmVmZXIgdG8gdGhlIGltcG9ydCwgYnV0IGluIG9yZGVyIHRvIHJlc29sdmUgdGhvc2UsIHdlIHdvdWxkXG4gICAgLy8gbmVlZCBrbm93bGVkZ2UgYWJvdXQgdGhlIGVudGlyZSBwcm9ncmFtLlxuICAgIGlmIChcbiAgICAgICF0cy5pc0ltcG9ydERlY2xhcmF0aW9uKG5vZGUpIHx8XG4gICAgICAhbm9kZS5pbXBvcnRDbGF1c2U/Lm5hbWVkQmluZGluZ3MgfHxcbiAgICAgICF0cy5pc05hbWVkSW1wb3J0cyhub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzKSB8fFxuICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbExpa2Uobm9kZS5tb2R1bGVTcGVjaWZpZXIpIHx8XG4gICAgICAhbm9kZS5tb2R1bGVTcGVjaWZpZXIudGV4dC5zdGFydHNXaXRoKCcuJylcbiAgICApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3Qgc3BlY2lmaWVyIG9mIG5vZGUuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MuZWxlbWVudHMpIHtcbiAgICAgIGlmIChzcGVjaWZpZXIubmFtZS50ZXh0ICE9PSBpZGVudGlmaWVyLnRleHQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIExvb2sgZm9yIGEgdmFyaWFibGUgd2l0aCB0aGUgaW1wb3J0ZWQgbmFtZSBpbiB0aGUgZmlsZS4gTm90ZSB0aGF0IGlkZWFsbHkgd2Ugd291bGQgdXNlXG4gICAgICAvLyB0aGUgdHlwZSBjaGVja2VyIHRvIHJlc29sdmUgdGhpcywgYnV0IHdlIGNhbid0IGJlY2F1c2UgdGhlc2UgdXRpbGl0aWVzIGFyZSBzZXQgdXAgdG9cbiAgICAgIC8vIG9wZXJhdGUgb24gaW5kaXZpZHVhbCBmaWxlcywgbm90IHRoZSBlbnRpcmUgcHJvZ3JhbS5cbiAgICAgIGNvbnN0IGZpbGVQYXRoID0gam9pbihkaXJuYW1lKGJvb3RzdGFwRmlsZVBhdGgpLCBub2RlLm1vZHVsZVNwZWNpZmllci50ZXh0ICsgJy50cycpO1xuICAgICAgY29uc3QgaW1wb3J0ZWRTb3VyY2VGaWxlID0gY3JlYXRlU291cmNlRmlsZSh0cmVlLCBmaWxlUGF0aCk7XG4gICAgICBjb25zdCByZXNvbHZlZFZhcmlhYmxlID0gZmluZEFwcENvbmZpZ0Zyb21WYXJpYWJsZU5hbWUoXG4gICAgICAgIGltcG9ydGVkU291cmNlRmlsZSxcbiAgICAgICAgKHNwZWNpZmllci5wcm9wZXJ0eU5hbWUgfHwgc3BlY2lmaWVyLm5hbWUpLnRleHQsXG4gICAgICApO1xuXG4gICAgICBpZiAocmVzb2x2ZWRWYXJpYWJsZSkge1xuICAgICAgICByZXR1cm4geyBmaWxlUGF0aCwgbm9kZTogcmVzb2x2ZWRWYXJpYWJsZSB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHZhcmlhYmxlSW5TYW1lRmlsZSA9IGZpbmRBcHBDb25maWdGcm9tVmFyaWFibGVOYW1lKHNvdXJjZUZpbGUsIGlkZW50aWZpZXIudGV4dCk7XG5cbiAgcmV0dXJuIHZhcmlhYmxlSW5TYW1lRmlsZSA/IHsgZmlsZVBhdGg6IGJvb3RzdGFwRmlsZVBhdGgsIG5vZGU6IHZhcmlhYmxlSW5TYW1lRmlsZSB9IDogbnVsbDtcbn1cblxuLyoqXG4gKiBGaW5kcyBhbiBhcHAgY29uZmlnIHdpdGhpbiB0aGUgdG9wLWxldmVsIHZhcmlhYmxlcyBvZiBhIGZpbGUuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBGaWxlIGluIHdoaWNoIHRvIHNlYXJjaCBmb3IgdGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB2YXJpYWJsZU5hbWUgTmFtZSBvZiB0aGUgdmFyaWFibGUgY29udGFpbmluZyB0aGUgY29uZmlnLlxuICovXG5mdW5jdGlvbiBmaW5kQXBwQ29uZmlnRnJvbVZhcmlhYmxlTmFtZShcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgdmFyaWFibGVOYW1lOiBzdHJpbmcsXG4pOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB8IG51bGwge1xuICBmb3IgKGNvbnN0IG5vZGUgb2Ygc291cmNlRmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQobm9kZSkpIHtcbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpICYmXG4gICAgICAgICAgZGVjbC5uYW1lLnRleHQgPT09IHZhcmlhYmxlTmFtZSAmJlxuICAgICAgICAgIGRlY2wuaW5pdGlhbGl6ZXIgJiZcbiAgICAgICAgICB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGRlY2wuaW5pdGlhbGl6ZXIpXG4gICAgICAgICkge1xuICAgICAgICAgIHJldHVybiBkZWNsLmluaXRpYWxpemVyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRmluZHMgdGhlIGxvY2FsIG5hbWUgb2YgYW4gaW1wb3J0ZWQgc3ltYm9sLiBDb3VsZCBiZSB0aGUgc3ltYm9sIG5hbWUgaXRzZWxmIG9yIGl0cyBhbGlhcy5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIEZpbGUgd2l0aGluIHdoaWNoIHRvIHNlYXJjaCBmb3IgdGhlIGltcG9ydC5cbiAqIEBwYXJhbSBuYW1lIEFjdHVhbCBuYW1lIG9mIHRoZSBpbXBvcnQsIG5vdCBpdHMgbG9jYWwgYWxpYXMuXG4gKiBAcGFyYW0gbW9kdWxlTmFtZSBOYW1lIG9mIHRoZSBtb2R1bGUgZnJvbSB3aGljaCB0aGUgc3ltYm9sIGlzIGltcG9ydGVkLlxuICovXG5mdW5jdGlvbiBmaW5kSW1wb3J0TG9jYWxOYW1lKFxuICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICBuYW1lOiBzdHJpbmcsXG4gIG1vZHVsZU5hbWU6IHN0cmluZyxcbik6IHN0cmluZyB8IG51bGwge1xuICBmb3IgKGNvbnN0IG5vZGUgb2Ygc291cmNlRmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgLy8gT25seSBsb29rIGZvciB0b3AtbGV2ZWwgaW1wb3J0cy5cbiAgICBpZiAoXG4gICAgICAhdHMuaXNJbXBvcnREZWNsYXJhdGlvbihub2RlKSB8fFxuICAgICAgIXRzLmlzU3RyaW5nTGl0ZXJhbChub2RlLm1vZHVsZVNwZWNpZmllcikgfHxcbiAgICAgIG5vZGUubW9kdWxlU3BlY2lmaWVyLnRleHQgIT09IG1vZHVsZU5hbWVcbiAgICApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEZpbHRlciBvdXQgaW1wb3J0cyB0aGF0IGRvbid0IGhhdmUgdGhlIHJpZ2h0IHNoYXBlLlxuICAgIGlmIChcbiAgICAgICFub2RlLmltcG9ydENsYXVzZSB8fFxuICAgICAgIW5vZGUuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MgfHxcbiAgICAgICF0cy5pc05hbWVkSW1wb3J0cyhub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzKVxuICAgICkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gTG9vayB0aHJvdWdoIHRoZSBlbGVtZW50cyBvZiB0aGUgZGVjbGFyYXRpb24gZm9yIHRoZSBzcGVjaWZpYyBpbXBvcnQuXG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIG5vZGUuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MuZWxlbWVudHMpIHtcbiAgICAgIGlmICgoZWxlbWVudC5wcm9wZXJ0eU5hbWUgfHwgZWxlbWVudC5uYW1lKS50ZXh0ID09PSBuYW1lKSB7XG4gICAgICAgIC8vIFRoZSBsb2NhbCBuYW1lIGlzIGFsd2F5cyBpbiBgbmFtZWAuXG4gICAgICAgIHJldHVybiBlbGVtZW50Lm5hbWUudGV4dDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIENyZWF0ZXMgYSBzb3VyY2UgZmlsZSBmcm9tIGEgZmlsZSBwYXRoIHdpdGhpbiBhIHByb2plY3QuICovXG5mdW5jdGlvbiBjcmVhdGVTb3VyY2VGaWxlKHRyZWU6IFRyZWUsIGZpbGVQYXRoOiBzdHJpbmcpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZVBhdGgsIHRyZWUucmVhZFRleHQoZmlsZVBhdGgpLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGFwcCBjb25maWcgb2JqZWN0IGxpdGVyYWwgYW5kIGFkZHMgaXQgdG8gYSBjYWxsIGV4cHJlc3Npb24gYXMgYW4gYXJndW1lbnQuXG4gKiBAcGFyYW0gY2FsbCBDYWxsIHRvIHdoaWNoIHRvIGFkZCB0aGUgY29uZmlnLlxuICogQHBhcmFtIGV4cHJlc3Npb24gRXhwcmVzc2lvbiB0aGF0IHNob3VsZCBpbnNlcnRlZCBpbnRvIHRoZSBuZXcgY29uZmlnLlxuICogQHBhcmFtIHJlY29yZGVyIFJlY29yZGVyIHRvIHdoaWNoIHRvIGxvZyB0aGUgY2hhbmdlLlxuICovXG5mdW5jdGlvbiBhZGROZXdBcHBDb25maWdUb0NhbGwoXG4gIGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLFxuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uLFxuICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4pOiB2b2lkIHtcbiAgY29uc3QgbmV3Q2FsbCA9IHRzLmZhY3RvcnkudXBkYXRlQ2FsbEV4cHJlc3Npb24oY2FsbCwgY2FsbC5leHByZXNzaW9uLCBjYWxsLnR5cGVBcmd1bWVudHMsIFtcbiAgICAuLi5jYWxsLmFyZ3VtZW50cyxcbiAgICB0cy5mYWN0b3J5LmNyZWF0ZU9iamVjdExpdGVyYWxFeHByZXNzaW9uKFxuICAgICAgW1xuICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgICAncHJvdmlkZXJzJyxcbiAgICAgICAgICB0cy5mYWN0b3J5LmNyZWF0ZUFycmF5TGl0ZXJhbEV4cHJlc3Npb24oW2V4cHJlc3Npb25dKSxcbiAgICAgICAgKSxcbiAgICAgIF0sXG4gICAgICB0cnVlLFxuICAgICksXG4gIF0pO1xuXG4gIHJlY29yZGVyLnJlbW92ZShjYWxsLmdldFN0YXJ0KCksIGNhbGwuZ2V0V2lkdGgoKSk7XG4gIHJlY29yZGVyLmluc2VydFJpZ2h0KFxuICAgIGNhbGwuZ2V0U3RhcnQoKSxcbiAgICB0cy5jcmVhdGVQcmludGVyKCkucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBuZXdDYWxsLCBjYWxsLmdldFNvdXJjZUZpbGUoKSksXG4gICk7XG59XG5cbi8qKlxuICogQWRkcyBhbiBlbGVtZW50IHRvIGFuIGFycmF5IGxpdGVyYWwgZXhwcmVzc2lvbi5cbiAqIEBwYXJhbSBub2RlIEFycmF5IHRvIHdoaWNoIHRvIGFkZCB0aGUgZWxlbWVudC5cbiAqIEBwYXJhbSBlbGVtZW50IEVsZW1lbnQgdG8gYmUgYWRkZWQuXG4gKiBAcGFyYW0gcmVjb3JkZXIgUmVjb3JkZXIgdG8gd2hpY2ggdG8gbG9nIHRoZSBjaGFuZ2UuXG4gKi9cbmZ1bmN0aW9uIGFkZEVsZW1lbnRUb0FycmF5KFxuICBub2RlOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLFxuICBlbGVtZW50OiB0cy5FeHByZXNzaW9uLFxuICByZWNvcmRlcjogVXBkYXRlUmVjb3JkZXIsXG4pOiB2b2lkIHtcbiAgY29uc3QgbmV3TGl0ZXJhbCA9IHRzLmZhY3RvcnkudXBkYXRlQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihub2RlLCBbLi4ubm9kZS5lbGVtZW50cywgZWxlbWVudF0pO1xuICByZWNvcmRlci5yZW1vdmUobm9kZS5nZXRTdGFydCgpLCBub2RlLmdldFdpZHRoKCkpO1xuICByZWNvcmRlci5pbnNlcnRSaWdodChcbiAgICBub2RlLmdldFN0YXJ0KCksXG4gICAgdHMuY3JlYXRlUHJpbnRlcigpLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgbmV3TGl0ZXJhbCwgbm9kZS5nZXRTb3VyY2VGaWxlKCkpLFxuICApO1xufVxuXG4vKipcbiAqIEFkZHMgYSBgcHJvdmlkZXJzYCBwcm9wZXJ0eSB0byBhbiBvYmplY3QgbGl0ZXJhbC5cbiAqIEBwYXJhbSBub2RlIExpdGVyYWwgdG8gd2hpY2ggdG8gYWRkIHRoZSBgcHJvdmlkZXJzYC5cbiAqIEBwYXJhbSBleHByZXNzaW9uIFByb3ZpZGVyIHRoYXQgc2hvdWxkIGJlIHBhcnQgb2YgdGhlIGdlbmVyYXRlZCBgcHJvdmlkZXJzYCBhcnJheS5cbiAqIEBwYXJhbSByZWNvcmRlciBSZWNvcmRlciB0byB3aGljaCB0byBsb2cgdGhlIGNoYW5nZS5cbiAqL1xuZnVuY3Rpb24gYWRkUHJvdmlkZXJzVG9PYmplY3RMaXRlcmFsKFxuICBub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbixcbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbixcbiAgcmVjb3JkZXI6IFVwZGF0ZVJlY29yZGVyLFxuKSB7XG4gIGNvbnN0IG5ld09wdGlvbnNMaXRlcmFsID0gdHMuZmFjdG9yeS51cGRhdGVPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlLCBbXG4gICAgLi4ubm9kZS5wcm9wZXJ0aWVzLFxuICAgIHRzLmZhY3RvcnkuY3JlYXRlUHJvcGVydHlBc3NpZ25tZW50KFxuICAgICAgJ3Byb3ZpZGVycycsXG4gICAgICB0cy5mYWN0b3J5LmNyZWF0ZUFycmF5TGl0ZXJhbEV4cHJlc3Npb24oW2V4cHJlc3Npb25dKSxcbiAgICApLFxuICBdKTtcbiAgcmVjb3JkZXIucmVtb3ZlKG5vZGUuZ2V0U3RhcnQoKSwgbm9kZS5nZXRXaWR0aCgpKTtcbiAgcmVjb3JkZXIuaW5zZXJ0UmlnaHQoXG4gICAgbm9kZS5nZXRTdGFydCgpLFxuICAgIHRzLmNyZWF0ZVByaW50ZXIoKS5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIG5ld09wdGlvbnNMaXRlcmFsLCBub2RlLmdldFNvdXJjZUZpbGUoKSksXG4gICk7XG59XG5cbi8qKiBDaGVja3Mgd2hldGhlciBhIG5vZGUgaXMgYSBjYWxsIHRvIGBtZXJnZUFwcGxpY2F0aW9uQ29uZmlnYC4gKi9cbmZ1bmN0aW9uIGlzTWVyZ2VBcHBDb25maWdDYWxsKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkNhbGxFeHByZXNzaW9uIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgbG9jYWxOYW1lID0gZmluZEltcG9ydExvY2FsTmFtZShcbiAgICBub2RlLmdldFNvdXJjZUZpbGUoKSxcbiAgICAnbWVyZ2VBcHBsaWNhdGlvbkNvbmZpZycsXG4gICAgJ0Bhbmd1bGFyL2NvcmUnLFxuICApO1xuXG4gIHJldHVybiAhIWxvY2FsTmFtZSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5leHByZXNzaW9uKSAmJiBub2RlLmV4cHJlc3Npb24udGV4dCA9PT0gbG9jYWxOYW1lO1xufVxuIl19