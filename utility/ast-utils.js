"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRouteDeclarationToModule = exports.getRouterModuleDeclaration = exports.getEnvironmentExportName = exports.isImported = exports.addBootstrapToModule = exports.addExportToModule = exports.addProviderToModule = exports.addImportToModule = exports.addDeclarationToModule = exports.addSymbolToNgModuleMetadata = exports.getMetadataField = exports.getDecoratorMetadata = exports.insertAfterLastOccurrence = exports.findNode = exports.getSourceNodes = exports.findNodes = exports.insertImport = void 0;
const core_1 = require("@angular-devkit/core");
const ts = __importStar(require("../third_party/github.com/Microsoft/TypeScript/lib/typescript"));
const change_1 = require("./change");
/**
 * Add Import `import { symbolName } from fileName` if the import doesn't exit
 * already. Assumes fileToEdit can be resolved and accessed.
 * @param fileToEdit (file we want to add import to)
 * @param symbolName (item to import)
 * @param fileName (path to the file)
 * @param isDefault (if true, import follows style for importing default exports)
 * @return Change
 */
function insertImport(source, fileToEdit, symbolName, fileName, isDefault = false) {
    const rootNode = source;
    const allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
    // get nodes that map to import statements from the file fileName
    const relevantImports = allImports.filter((node) => {
        // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
        const importFiles = node
            .getChildren()
            .filter(ts.isStringLiteral)
            .map((n) => n.text);
        return importFiles.filter((file) => file === fileName).length === 1;
    });
    if (relevantImports.length > 0) {
        let importsAsterisk = false;
        // imports from import file
        const imports = [];
        relevantImports.forEach((n) => {
            Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
            if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
                importsAsterisk = true;
            }
        });
        // if imports * from fileName, don't add symbolName
        if (importsAsterisk) {
            return new change_1.NoopChange();
        }
        const importTextNodes = imports.filter((n) => n.text === symbolName);
        // insert import if it's not there
        if (importTextNodes.length === 0) {
            const fallbackPos = findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].getStart() ||
                findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].getStart();
            return insertAfterLastOccurrence(imports, `, ${symbolName}`, fileToEdit, fallbackPos);
        }
        return new change_1.NoopChange();
    }
    // no such import declaration exists
    const useStrict = findNodes(rootNode, ts.isStringLiteral).filter((n) => n.text === 'use strict');
    let fallbackPos = 0;
    if (useStrict.length > 0) {
        fallbackPos = useStrict[0].end;
    }
    const open = isDefault ? '' : '{ ';
    const close = isDefault ? '' : ' }';
    // if there are no imports or 'use strict' statement, insert import at beginning of file
    const insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
    const separator = insertAtBeginning ? '' : ';\n';
    const toInsert = `${separator}import ${open}${symbolName}${close}` +
        ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
    return insertAfterLastOccurrence(allImports, toInsert, fileToEdit, fallbackPos, ts.SyntaxKind.StringLiteral);
}
exports.insertImport = insertImport;
function findNodes(node, kindOrGuard, max = Infinity, recursive = false) {
    if (!node || max == 0) {
        return [];
    }
    const test = typeof kindOrGuard === 'function'
        ? kindOrGuard
        : (node) => node.kind === kindOrGuard;
    const arr = [];
    if (test(node)) {
        arr.push(node);
        max--;
    }
    if (max > 0 && (recursive || !test(node))) {
        for (const child of node.getChildren()) {
            findNodes(child, test, max, recursive).forEach((node) => {
                if (max > 0) {
                    arr.push(node);
                }
                max--;
            });
            if (max <= 0) {
                break;
            }
        }
    }
    return arr;
}
exports.findNodes = findNodes;
/**
 * Get all the nodes from a source.
 * @param sourceFile The source file object.
 * @returns {Array<ts.Node>} An array of all the nodes in the source.
 */
function getSourceNodes(sourceFile) {
    const nodes = [sourceFile];
    const result = [];
    while (nodes.length > 0) {
        const node = nodes.shift();
        if (node) {
            result.push(node);
            if (node.getChildCount(sourceFile) >= 0) {
                nodes.unshift(...node.getChildren());
            }
        }
    }
    return result;
}
exports.getSourceNodes = getSourceNodes;
function findNode(node, kind, text) {
    if (node.kind === kind && node.getText() === text) {
        // throw new Error(node.getText());
        return node;
    }
    let foundNode = null;
    ts.forEachChild(node, (childNode) => {
        foundNode = foundNode || findNode(childNode, kind, text);
    });
    return foundNode;
}
exports.findNode = findNode;
/**
 * Helper for sorting nodes.
 * @return function to sort nodes in increasing order of position in sourceFile
 */
function nodesByPosition(first, second) {
    return first.getStart() - second.getStart();
}
/**
 * Insert `toInsert` after the last occurence of `ts.SyntaxKind[nodes[i].kind]`
 * or after the last of occurence of `syntaxKind` if the last occurence is a sub child
 * of ts.SyntaxKind[nodes[i].kind] and save the changes in file.
 *
 * @param nodes insert after the last occurence of nodes
 * @param toInsert string to insert
 * @param file file to insert changes into
 * @param fallbackPos position to insert if toInsert happens to be the first occurence
 * @param syntaxKind the ts.SyntaxKind of the subchildren to insert after
 * @return Change instance
 * @throw Error if toInsert is first occurence but fall back is not set
 */
function insertAfterLastOccurrence(nodes, toInsert, file, fallbackPos, syntaxKind) {
    let lastItem;
    for (const node of nodes) {
        if (!lastItem || lastItem.getStart() < node.getStart()) {
            lastItem = node;
        }
    }
    if (syntaxKind && lastItem) {
        lastItem = findNodes(lastItem, syntaxKind).sort(nodesByPosition).pop();
    }
    if (!lastItem && fallbackPos == undefined) {
        throw new Error(`tried to insert ${toInsert} as first occurence with no fallback position`);
    }
    const lastItemPosition = lastItem ? lastItem.getEnd() : fallbackPos;
    return new change_1.InsertChange(file, lastItemPosition, toInsert);
}
exports.insertAfterLastOccurrence = insertAfterLastOccurrence;
function _angularImportsFromNode(node) {
    const ms = node.moduleSpecifier;
    let modulePath;
    switch (ms.kind) {
        case ts.SyntaxKind.StringLiteral:
            modulePath = ms.text;
            break;
        default:
            return {};
    }
    if (!modulePath.startsWith('@angular/')) {
        return {};
    }
    if (node.importClause) {
        if (node.importClause.name) {
            // This is of the form `import Name from 'path'`. Ignore.
            return {};
        }
        else if (node.importClause.namedBindings) {
            const nb = node.importClause.namedBindings;
            if (nb.kind == ts.SyntaxKind.NamespaceImport) {
                // This is of the form `import * as name from 'path'`. Return `name.`.
                return {
                    [nb.name.text + '.']: modulePath,
                };
            }
            else {
                // This is of the form `import {a,b,c} from 'path'`
                const namedImports = nb;
                return namedImports.elements
                    .map((is) => (is.propertyName ? is.propertyName.text : is.name.text))
                    .reduce((acc, curr) => {
                    acc[curr] = modulePath;
                    return acc;
                }, {});
            }
        }
        return {};
    }
    else {
        // This is of the form `import 'path';`. Nothing to do.
        return {};
    }
}
function getDecoratorMetadata(source, identifier, module) {
    const angularImports = findNodes(source, ts.isImportDeclaration)
        .map((node) => _angularImportsFromNode(node))
        .reduce((acc, current) => {
        for (const key of Object.keys(current)) {
            acc[key] = current[key];
        }
        return acc;
    }, {});
    return getSourceNodes(source)
        .filter((node) => {
        return (node.kind == ts.SyntaxKind.Decorator &&
            node.expression.kind == ts.SyntaxKind.CallExpression);
    })
        .map((node) => node.expression)
        .filter((expr) => {
        if (expr.expression.kind == ts.SyntaxKind.Identifier) {
            const id = expr.expression;
            return id.text == identifier && angularImports[id.text] === module;
        }
        else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
            // This covers foo.NgModule when importing * as foo.
            const paExpr = expr.expression;
            // If the left expression is not an identifier, just give up at that point.
            if (paExpr.expression.kind !== ts.SyntaxKind.Identifier) {
                return false;
            }
            const id = paExpr.name.text;
            const moduleId = paExpr.expression.text;
            return id === identifier && angularImports[moduleId + '.'] === module;
        }
        return false;
    })
        .filter((expr) => expr.arguments[0] && expr.arguments[0].kind == ts.SyntaxKind.ObjectLiteralExpression)
        .map((expr) => expr.arguments[0]);
}
exports.getDecoratorMetadata = getDecoratorMetadata;
function getMetadataField(node, metadataField) {
    return (node.properties
        .filter(ts.isPropertyAssignment)
        // Filter out every fields that's not "metadataField". Also handles string literals
        // (but not expressions).
        .filter(({ name }) => {
        return (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === metadataField;
    }));
}
exports.getMetadataField = getMetadataField;
function addSymbolToNgModuleMetadata(source, ngModulePath, metadataField, symbolName, importPath = null) {
    const nodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
    let node = nodes[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
    // Find the decorator declaration.
    if (!node) {
        return [];
    }
    // Get all the children property assignment of object literals.
    const matchingProperties = getMetadataField(node, metadataField);
    if (matchingProperties.length == 0) {
        // We haven't found the field in the metadata declaration. Insert a new field.
        const expr = node;
        let position;
        let toInsert;
        if (expr.properties.length == 0) {
            position = expr.getEnd() - 1;
            toInsert = `\n  ${metadataField}: [\n${core_1.tags.indentBy(4) `${symbolName}`}\n  ]\n`;
        }
        else {
            node = expr.properties[expr.properties.length - 1];
            position = node.getEnd();
            // Get the indentation of the last element, if any.
            const text = node.getFullText(source);
            const matches = text.match(/^(\r?\n)(\s*)/);
            if (matches) {
                toInsert =
                    `,${matches[0]}${metadataField}: [${matches[1]}` +
                        `${core_1.tags.indentBy(matches[2].length + 2) `${symbolName}`}${matches[0]}]`;
            }
            else {
                toInsert = `, ${metadataField}: [${symbolName}]`;
            }
        }
        if (importPath !== null) {
            return [
                new change_1.InsertChange(ngModulePath, position, toInsert),
                insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
            ];
        }
        else {
            return [new change_1.InsertChange(ngModulePath, position, toInsert)];
        }
    }
    const assignment = matchingProperties[0];
    // If it's not an array, nothing we can do really.
    if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return [];
    }
    const arrLiteral = assignment.initializer;
    if (arrLiteral.elements.length == 0) {
        // Forward the property.
        node = arrLiteral;
    }
    else {
        node = arrLiteral.elements;
    }
    if (Array.isArray(node)) {
        const nodeArray = node;
        const symbolsArray = nodeArray.map((node) => core_1.tags.oneLine `${node.getText()}`);
        if (symbolsArray.includes(core_1.tags.oneLine `${symbolName}`)) {
            return [];
        }
        node = node[node.length - 1];
    }
    let toInsert;
    let position = node.getEnd();
    if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
        // We found the field but it's empty. Insert it just before the `]`.
        position--;
        toInsert = `\n${core_1.tags.indentBy(4) `${symbolName}`}\n  `;
    }
    else {
        // Get the indentation of the last element, if any.
        const text = node.getFullText(source);
        const matches = text.match(/^(\r?\n)(\s*)/);
        if (matches) {
            toInsert = `,${matches[1]}${core_1.tags.indentBy(matches[2].length) `${symbolName}`}`;
        }
        else {
            toInsert = `, ${symbolName}`;
        }
    }
    if (importPath !== null) {
        return [
            new change_1.InsertChange(ngModulePath, position, toInsert),
            insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
        ];
    }
    return [new change_1.InsertChange(ngModulePath, position, toInsert)];
}
exports.addSymbolToNgModuleMetadata = addSymbolToNgModuleMetadata;
/**
 * Custom function to insert a declaration (component, pipe, directive)
 * into NgModule declarations. It also imports the component.
 */
function addDeclarationToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'declarations', classifiedName, importPath);
}
exports.addDeclarationToModule = addDeclarationToModule;
/**
 * Custom function to insert an NgModule into NgModule imports. It also imports the module.
 */
function addImportToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'imports', classifiedName, importPath);
}
exports.addImportToModule = addImportToModule;
/**
 * Custom function to insert a provider into NgModule. It also imports it.
 */
function addProviderToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'providers', classifiedName, importPath);
}
exports.addProviderToModule = addProviderToModule;
/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
function addExportToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'exports', classifiedName, importPath);
}
exports.addExportToModule = addExportToModule;
/**
 * Custom function to insert an export into NgModule. It also imports it.
 */
function addBootstrapToModule(source, modulePath, classifiedName, importPath) {
    return addSymbolToNgModuleMetadata(source, modulePath, 'bootstrap', classifiedName, importPath);
}
exports.addBootstrapToModule = addBootstrapToModule;
/**
 * Determine if an import already exists.
 */
function isImported(source, classifiedName, importPath) {
    const allNodes = getSourceNodes(source);
    const matchingNodes = allNodes
        .filter(ts.isImportDeclaration)
        .filter((imp) => ts.isStringLiteral(imp.moduleSpecifier) && imp.moduleSpecifier.text === importPath)
        .filter((imp) => {
        if (!imp.importClause) {
            return false;
        }
        const nodes = findNodes(imp.importClause, ts.isImportSpecifier).filter((n) => n.getText() === classifiedName);
        return nodes.length > 0;
    });
    return matchingNodes.length > 0;
}
exports.isImported = isImported;
/**
 * This function returns the name of the environment export
 * whether this export is aliased or not. If the environment file
 * is not imported, then it will return `null`.
 */
function getEnvironmentExportName(source) {
    // Initial value is `null` as we don't know yet if the user
    // has imported `environment` into the root module or not.
    let environmentExportName = null;
    const allNodes = getSourceNodes(source);
    allNodes
        .filter(ts.isImportDeclaration)
        .filter((declaration) => declaration.moduleSpecifier.kind === ts.SyntaxKind.StringLiteral &&
        declaration.importClause !== undefined)
        .map((declaration) => 
    // If `importClause` property is defined then the first
    // child will be `NamedImports` object (or `namedBindings`).
    declaration.importClause.getChildAt(0))
        // Find those `NamedImports` object that contains `environment` keyword
        // in its text. E.g. `{ environment as env }`.
        .filter(ts.isNamedImports)
        .filter((namedImports) => namedImports.getText().includes('environment'))
        .forEach((namedImports) => {
        for (const specifier of namedImports.elements) {
            // `propertyName` is defined if the specifier
            // has an aliased import.
            const name = specifier.propertyName || specifier.name;
            // Find specifier that contains `environment` keyword in its text.
            // Whether it's `environment` or `environment as env`.
            if (name.text.includes('environment')) {
                environmentExportName = specifier.name.text;
            }
        }
    });
    return environmentExportName;
}
exports.getEnvironmentExportName = getEnvironmentExportName;
/**
 * Returns the RouterModule declaration from NgModule metadata, if any.
 */
function getRouterModuleDeclaration(source) {
    const result = getDecoratorMetadata(source, 'NgModule', '@angular/core');
    const node = result[0];
    const matchingProperties = getMetadataField(node, 'imports');
    if (!matchingProperties) {
        return;
    }
    const assignment = matchingProperties[0];
    if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return;
    }
    const arrLiteral = assignment.initializer;
    return arrLiteral.elements
        .filter((el) => el.kind === ts.SyntaxKind.CallExpression)
        .find((el) => el.getText().startsWith('RouterModule'));
}
exports.getRouterModuleDeclaration = getRouterModuleDeclaration;
/**
 * Adds a new route declaration to a router module (i.e. has a RouterModule declaration)
 */
function addRouteDeclarationToModule(source, fileToAdd, routeLiteral) {
    const routerModuleExpr = getRouterModuleDeclaration(source);
    if (!routerModuleExpr) {
        throw new Error(`Couldn't find a route declaration in ${fileToAdd}.`);
    }
    const scopeConfigMethodArgs = routerModuleExpr.arguments;
    if (!scopeConfigMethodArgs.length) {
        const { line } = source.getLineAndCharacterOfPosition(routerModuleExpr.getStart());
        throw new Error(`The router module method doesn't have arguments ` + `at line ${line} in ${fileToAdd}`);
    }
    let routesArr;
    const routesArg = scopeConfigMethodArgs[0];
    // Check if the route declarations array is
    // an inlined argument of RouterModule or a standalone variable
    if (ts.isArrayLiteralExpression(routesArg)) {
        routesArr = routesArg;
    }
    else {
        const routesVarName = routesArg.getText();
        let routesVar;
        if (routesArg.kind === ts.SyntaxKind.Identifier) {
            routesVar = source.statements.filter(ts.isVariableStatement).find((v) => {
                return v.declarationList.declarations[0].name.getText() === routesVarName;
            });
        }
        if (!routesVar) {
            const { line } = source.getLineAndCharacterOfPosition(routesArg.getStart());
            throw new Error(`No route declaration array was found that corresponds ` +
                `to router module at line ${line} in ${fileToAdd}`);
        }
        routesArr = findNodes(routesVar, ts.SyntaxKind.ArrayLiteralExpression, 1)[0];
    }
    const occurrencesCount = routesArr.elements.length;
    const text = routesArr.getFullText(source);
    let route = routeLiteral;
    let insertPos = routesArr.elements.pos;
    if (occurrencesCount > 0) {
        const lastRouteLiteral = [...routesArr.elements].pop();
        const lastRouteIsWildcard = ts.isObjectLiteralExpression(lastRouteLiteral) &&
            lastRouteLiteral.properties.some((n) => ts.isPropertyAssignment(n) &&
                ts.isIdentifier(n.name) &&
                n.name.text === 'path' &&
                ts.isStringLiteral(n.initializer) &&
                n.initializer.text === '**');
        const indentation = text.match(/\r?\n(\r?)\s*/) || [];
        const routeText = `${indentation[0] || ' '}${routeLiteral}`;
        // Add the new route before the wildcard route
        // otherwise we'll always redirect to the wildcard route
        if (lastRouteIsWildcard) {
            insertPos = lastRouteLiteral.pos;
            route = `${routeText},`;
        }
        else {
            insertPos = lastRouteLiteral.end;
            route = `,${routeText}`;
        }
    }
    return new change_1.InsertChange(fileToAdd, insertPos, route);
}
exports.addRouteDeclarationToModule = addRouteDeclarationToModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvYXN0LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCwrQ0FBNEM7QUFDNUMsa0dBQW9GO0FBQ3BGLHFDQUE0RDtBQUU1RDs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLFlBQVksQ0FDMUIsTUFBcUIsRUFDckIsVUFBa0IsRUFDbEIsVUFBa0IsRUFDbEIsUUFBZ0IsRUFDaEIsU0FBUyxHQUFHLEtBQUs7SUFFakIsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDO0lBQ3hCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRXhFLGlFQUFpRTtJQUNqRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDakQscUZBQXFGO1FBQ3JGLE1BQU0sV0FBVyxHQUFHLElBQUk7YUFDckIsV0FBVyxFQUFFO2FBQ2IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUM7YUFDMUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEIsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDOUIsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBQzVCLDJCQUEyQjtRQUMzQixNQUFNLE9BQU8sR0FB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QUFVLENBQUMsSUFBSSxDQUM5QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0osRUFBRSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztnQkFDMUIsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUN2QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNO2dCQUN0QixFQUFFLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLElBQUksQ0FDOUIsQ0FBQztRQUVKLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RELE1BQU0sU0FBUyxHQUFHLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUU1RCw4Q0FBOEM7UUFDOUMsd0RBQXdEO1FBQ3hELElBQUksbUJBQW1CLEVBQUU7WUFDdkIsU0FBUyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztZQUNqQyxLQUFLLEdBQUcsR0FBRyxTQUFTLEdBQUcsQ0FBQztTQUN6QjthQUFNO1lBQ0wsU0FBUyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztZQUNqQyxLQUFLLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztTQUN6QjtLQUNGO0lBRUQsT0FBTyxJQUFJLHFCQUFZLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBbEZELGtFQWtGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyB0YWdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAnLi4vdGhpcmRfcGFydHkvZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9saWIvdHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBDaGFuZ2UsIEluc2VydENoYW5nZSwgTm9vcENoYW5nZSB9IGZyb20gJy4vY2hhbmdlJztcblxuLyoqXG4gKiBBZGQgSW1wb3J0IGBpbXBvcnQgeyBzeW1ib2xOYW1lIH0gZnJvbSBmaWxlTmFtZWAgaWYgdGhlIGltcG9ydCBkb2Vzbid0IGV4aXRcbiAqIGFscmVhZHkuIEFzc3VtZXMgZmlsZVRvRWRpdCBjYW4gYmUgcmVzb2x2ZWQgYW5kIGFjY2Vzc2VkLlxuICogQHBhcmFtIGZpbGVUb0VkaXQgKGZpbGUgd2Ugd2FudCB0byBhZGQgaW1wb3J0IHRvKVxuICogQHBhcmFtIHN5bWJvbE5hbWUgKGl0ZW0gdG8gaW1wb3J0KVxuICogQHBhcmFtIGZpbGVOYW1lIChwYXRoIHRvIHRoZSBmaWxlKVxuICogQHBhcmFtIGlzRGVmYXVsdCAoaWYgdHJ1ZSwgaW1wb3J0IGZvbGxvd3Mgc3R5bGUgZm9yIGltcG9ydGluZyBkZWZhdWx0IGV4cG9ydHMpXG4gKiBAcmV0dXJuIENoYW5nZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0SW1wb3J0KFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIGZpbGVUb0VkaXQ6IHN0cmluZyxcbiAgc3ltYm9sTmFtZTogc3RyaW5nLFxuICBmaWxlTmFtZTogc3RyaW5nLFxuICBpc0RlZmF1bHQgPSBmYWxzZSxcbik6IENoYW5nZSB7XG4gIGNvbnN0IHJvb3ROb2RlID0gc291cmNlO1xuICBjb25zdCBhbGxJbXBvcnRzID0gZmluZE5vZGVzKHJvb3ROb2RlLCB0cy5TeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uKTtcblxuICAvLyBnZXQgbm9kZXMgdGhhdCBtYXAgdG8gaW1wb3J0IHN0YXRlbWVudHMgZnJvbSB0aGUgZmlsZSBmaWxlTmFtZVxuICBjb25zdCByZWxldmFudEltcG9ydHMgPSBhbGxJbXBvcnRzLmZpbHRlcigobm9kZSkgPT4ge1xuICAgIC8vIFN0cmluZ0xpdGVyYWwgb2YgdGhlIEltcG9ydERlY2xhcmF0aW9uIGlzIHRoZSBpbXBvcnQgZmlsZSAoZmlsZU5hbWUgaW4gdGhpcyBjYXNlKS5cbiAgICBjb25zdCBpbXBvcnRGaWxlcyA9IG5vZGVcbiAgICAgIC5nZXRDaGlsZHJlbigpXG4gICAgICAuZmlsdGVyKHRzLmlzU3RyaW5nTGl0ZXJhbClcbiAgICAgIC5tYXAoKG4pID0+IG4udGV4dCk7XG5cbiAgICByZXR1cm4gaW1wb3J0RmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlID09PSBmaWxlTmFtZSkubGVuZ3RoID09PSAxO1xuICB9KTtcblxuICBpZiAocmVsZXZhbnRJbXBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgaW1wb3J0c0FzdGVyaXNrID0gZmFsc2U7XG4gICAgLy8gaW1wb3J0cyBmcm9tIGltcG9ydCBmaWxlXG4gICAgY29uc3QgaW1wb3J0czogdHMuTm9kZVtdID0gW107XG4gICAgcmVsZXZhbnRJbXBvcnRzLmZvckVhY2goKG4pID0+IHtcbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGltcG9ydHMsIGZpbmROb2RlcyhuLCB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpKTtcbiAgICAgIGlmIChmaW5kTm9kZXMobiwgdHMuU3ludGF4S2luZC5Bc3Rlcmlza1Rva2VuKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGltcG9ydHNBc3RlcmlzayA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBpZiBpbXBvcnRzICogZnJvbSBmaWxlTmFtZSwgZG9uJ3QgYWRkIHN5bWJvbE5hbWVcbiAgICBpZiAoaW1wb3J0c0FzdGVyaXNrKSB7XG4gICAgICByZXR1cm4gbmV3IE5vb3BDaGFuZ2UoKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRUZXh0Tm9kZXMgPSBpbXBvcnRzLmZpbHRlcigobikgPT4gKG4gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gc3ltYm9sTmFtZSk7XG5cbiAgICAvLyBpbnNlcnQgaW1wb3J0IGlmIGl0J3Mgbm90IHRoZXJlXG4gICAgaWYgKGltcG9ydFRleHROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IGZhbGxiYWNrUG9zID1cbiAgICAgICAgZmluZE5vZGVzKHJlbGV2YW50SW1wb3J0c1swXSwgdHMuU3ludGF4S2luZC5DbG9zZUJyYWNlVG9rZW4pWzBdLmdldFN0YXJ0KCkgfHxcbiAgICAgICAgZmluZE5vZGVzKHJlbGV2YW50SW1wb3J0c1swXSwgdHMuU3ludGF4S2luZC5Gcm9tS2V5d29yZClbMF0uZ2V0U3RhcnQoKTtcblxuICAgICAgcmV0dXJuIGluc2VydEFmdGVyTGFzdE9jY3VycmVuY2UoaW1wb3J0cywgYCwgJHtzeW1ib2xOYW1lfWAsIGZpbGVUb0VkaXQsIGZhbGxiYWNrUG9zKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IE5vb3BDaGFuZ2UoKTtcbiAgfVxuXG4gIC8vIG5vIHN1Y2ggaW1wb3J0IGRlY2xhcmF0aW9uIGV4aXN0c1xuICBjb25zdCB1c2VTdHJpY3QgPSBmaW5kTm9kZXMocm9vdE5vZGUsIHRzLmlzU3RyaW5nTGl0ZXJhbCkuZmlsdGVyKChuKSA9PiBuLnRleHQgPT09ICd1c2Ugc3RyaWN0Jyk7XG4gIGxldCBmYWxsYmFja1BvcyA9IDA7XG4gIGlmICh1c2VTdHJpY3QubGVuZ3RoID4gMCkge1xuICAgIGZhbGxiYWNrUG9zID0gdXNlU3RyaWN0WzBdLmVuZDtcbiAgfVxuICBjb25zdCBvcGVuID0gaXNEZWZhdWx0ID8gJycgOiAneyAnO1xuICBjb25zdCBjbG9zZSA9IGlzRGVmYXVsdCA/ICcnIDogJyB9JztcbiAgLy8gaWYgdGhlcmUgYXJlIG5vIGltcG9ydHMgb3IgJ3VzZSBzdHJpY3QnIHN0YXRlbWVudCwgaW5zZXJ0IGltcG9ydCBhdCBiZWdpbm5pbmcgb2YgZmlsZVxuICBjb25zdCBpbnNlcnRBdEJlZ2lubmluZyA9IGFsbEltcG9ydHMubGVuZ3RoID09PSAwICYmIHVzZVN0cmljdC5sZW5ndGggPT09IDA7XG4gIGNvbnN0IHNlcGFyYXRvciA9IGluc2VydEF0QmVnaW5uaW5nID8gJycgOiAnO1xcbic7XG4gIGNvbnN0IHRvSW5zZXJ0ID1cbiAgICBgJHtzZXBhcmF0b3J9aW1wb3J0ICR7b3Blbn0ke3N5bWJvbE5hbWV9JHtjbG9zZX1gICtcbiAgICBgIGZyb20gJyR7ZmlsZU5hbWV9JyR7aW5zZXJ0QXRCZWdpbm5pbmcgPyAnO1xcbicgOiAnJ31gO1xuXG4gIHJldHVybiBpbnNlcnRBZnRlckxhc3RPY2N1cnJlbmNlKFxuICAgIGFsbEltcG9ydHMsXG4gICAgdG9JbnNlcnQsXG4gICAgZmlsZVRvRWRpdCxcbiAgICBmYWxsYmFja1BvcyxcbiAgICB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwsXG4gICk7XG59XG5cbi8qKlxuICogRmluZCBhbGwgbm9kZXMgZnJvbSB0aGUgQVNUIGluIHRoZSBzdWJ0cmVlIG9mIG5vZGUgb2YgU3ludGF4S2luZCBraW5kLlxuICogQHBhcmFtIG5vZGVcbiAqIEBwYXJhbSBraW5kXG4gKiBAcGFyYW0gbWF4IFRoZSBtYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0byByZXR1cm4uXG4gKiBAcGFyYW0gcmVjdXJzaXZlIENvbnRpbnVlIGxvb2tpbmcgZm9yIG5vZGVzIG9mIGtpbmQgcmVjdXJzaXZlIHVudGlsIGVuZFxuICogdGhlIGxhc3QgY2hpbGQgZXZlbiB3aGVuIG5vZGUgb2Yga2luZCBoYXMgYmVlbiBmb3VuZC5cbiAqIEByZXR1cm4gYWxsIG5vZGVzIG9mIGtpbmQsIG9yIFtdIGlmIG5vbmUgaXMgZm91bmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmROb2RlcyhcbiAgbm9kZTogdHMuTm9kZSxcbiAga2luZDogdHMuU3ludGF4S2luZCxcbiAgbWF4PzogbnVtYmVyLFxuICByZWN1cnNpdmU/OiBib29sZWFuLFxuKTogdHMuTm9kZVtdO1xuXG4vKipcbiAqIEZpbmQgYWxsIG5vZGVzIGZyb20gdGhlIEFTVCBpbiB0aGUgc3VidHJlZSB0aGF0IHNhdGlzZnkgYSB0eXBlIGd1YXJkLlxuICogQHBhcmFtIG5vZGVcbiAqIEBwYXJhbSBndWFyZFxuICogQHBhcmFtIG1heCBUaGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gcmV0dXJuLlxuICogQHBhcmFtIHJlY3Vyc2l2ZSBDb250aW51ZSBsb29raW5nIGZvciBub2RlcyBvZiBraW5kIHJlY3Vyc2l2ZSB1bnRpbCBlbmRcbiAqIHRoZSBsYXN0IGNoaWxkIGV2ZW4gd2hlbiBub2RlIG9mIGtpbmQgaGFzIGJlZW4gZm91bmQuXG4gKiBAcmV0dXJuIGFsbCBub2RlcyB0aGF0IHNhdGlzZnkgdGhlIHR5cGUgZ3VhcmQsIG9yIFtdIGlmIG5vbmUgaXMgZm91bmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmROb2RlczxUIGV4dGVuZHMgdHMuTm9kZT4oXG4gIG5vZGU6IHRzLk5vZGUsXG4gIGd1YXJkOiAobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyBULFxuICBtYXg/OiBudW1iZXIsXG4gIHJlY3Vyc2l2ZT86IGJvb2xlYW4sXG4pOiBUW107XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTm9kZXM8VCBleHRlbmRzIHRzLk5vZGU+KFxuICBub2RlOiB0cy5Ob2RlLFxuICBraW5kT3JHdWFyZDogdHMuU3ludGF4S2luZCB8ICgobm9kZTogdHMuTm9kZSkgPT4gbm9kZSBpcyBUKSxcbiAgbWF4ID0gSW5maW5pdHksXG4gIHJlY3Vyc2l2ZSA9IGZhbHNlLFxuKTogVFtdIHtcbiAgaWYgKCFub2RlIHx8IG1heCA9PSAwKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgdGVzdCA9XG4gICAgdHlwZW9mIGtpbmRPckd1YXJkID09PSAnZnVuY3Rpb24nXG4gICAgICA/IGtpbmRPckd1YXJkXG4gICAgICA6IChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBUID0+IG5vZGUua2luZCA9PT0ga2luZE9yR3VhcmQ7XG5cbiAgY29uc3QgYXJyOiBUW10gPSBbXTtcbiAgaWYgKHRlc3Qobm9kZSkpIHtcbiAgICBhcnIucHVzaChub2RlKTtcbiAgICBtYXgtLTtcbiAgfVxuICBpZiAobWF4ID4gMCAmJiAocmVjdXJzaXZlIHx8ICF0ZXN0KG5vZGUpKSkge1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5nZXRDaGlsZHJlbigpKSB7XG4gICAgICBmaW5kTm9kZXMoY2hpbGQsIHRlc3QsIG1heCwgcmVjdXJzaXZlKS5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChtYXggPiAwKSB7XG4gICAgICAgICAgYXJyLnB1c2gobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgbWF4LS07XG4gICAgICB9KTtcblxuICAgICAgaWYgKG1heCA8PSAwKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhcnI7XG59XG5cbi8qKlxuICogR2V0IGFsbCB0aGUgbm9kZXMgZnJvbSBhIHNvdXJjZS5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXk8dHMuTm9kZT59IEFuIGFycmF5IG9mIGFsbCB0aGUgbm9kZXMgaW4gdGhlIHNvdXJjZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZU5vZGVzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Ob2RlW10ge1xuICBjb25zdCBub2RlczogdHMuTm9kZVtdID0gW3NvdXJjZUZpbGVdO1xuICBjb25zdCByZXN1bHQgPSBbXTtcblxuICB3aGlsZSAobm9kZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG5vZGUgPSBub2Rlcy5zaGlmdCgpO1xuXG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgaWYgKG5vZGUuZ2V0Q2hpbGRDb3VudChzb3VyY2VGaWxlKSA+PSAwKSB7XG4gICAgICAgIG5vZGVzLnVuc2hpZnQoLi4ubm9kZS5nZXRDaGlsZHJlbigpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZE5vZGUobm9kZTogdHMuTm9kZSwga2luZDogdHMuU3ludGF4S2luZCwgdGV4dDogc3RyaW5nKTogdHMuTm9kZSB8IG51bGwge1xuICBpZiAobm9kZS5raW5kID09PSBraW5kICYmIG5vZGUuZ2V0VGV4dCgpID09PSB0ZXh0KSB7XG4gICAgLy8gdGhyb3cgbmV3IEVycm9yKG5vZGUuZ2V0VGV4dCgpKTtcbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG4gIGxldCBmb3VuZE5vZGU6IHRzLk5vZGUgfCBudWxsID0gbnVsbDtcbiAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIChjaGlsZE5vZGUpID0+IHtcbiAgICBmb3VuZE5vZGUgPSBmb3VuZE5vZGUgfHwgZmluZE5vZGUoY2hpbGROb2RlLCBraW5kLCB0ZXh0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGZvdW5kTm9kZTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgZm9yIHNvcnRpbmcgbm9kZXMuXG4gKiBAcmV0dXJuIGZ1bmN0aW9uIHRvIHNvcnQgbm9kZXMgaW4gaW5jcmVhc2luZyBvcmRlciBvZiBwb3NpdGlvbiBpbiBzb3VyY2VGaWxlXG4gKi9cbmZ1bmN0aW9uIG5vZGVzQnlQb3NpdGlvbihmaXJzdDogdHMuTm9kZSwgc2Vjb25kOiB0cy5Ob2RlKTogbnVtYmVyIHtcbiAgcmV0dXJuIGZpcnN0LmdldFN0YXJ0KCkgLSBzZWNvbmQuZ2V0U3RhcnQoKTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgYHRvSW5zZXJ0YCBhZnRlciB0aGUgbGFzdCBvY2N1cmVuY2Ugb2YgYHRzLlN5bnRheEtpbmRbbm9kZXNbaV0ua2luZF1gXG4gKiBvciBhZnRlciB0aGUgbGFzdCBvZiBvY2N1cmVuY2Ugb2YgYHN5bnRheEtpbmRgIGlmIHRoZSBsYXN0IG9jY3VyZW5jZSBpcyBhIHN1YiBjaGlsZFxuICogb2YgdHMuU3ludGF4S2luZFtub2Rlc1tpXS5raW5kXSBhbmQgc2F2ZSB0aGUgY2hhbmdlcyBpbiBmaWxlLlxuICpcbiAqIEBwYXJhbSBub2RlcyBpbnNlcnQgYWZ0ZXIgdGhlIGxhc3Qgb2NjdXJlbmNlIG9mIG5vZGVzXG4gKiBAcGFyYW0gdG9JbnNlcnQgc3RyaW5nIHRvIGluc2VydFxuICogQHBhcmFtIGZpbGUgZmlsZSB0byBpbnNlcnQgY2hhbmdlcyBpbnRvXG4gKiBAcGFyYW0gZmFsbGJhY2tQb3MgcG9zaXRpb24gdG8gaW5zZXJ0IGlmIHRvSW5zZXJ0IGhhcHBlbnMgdG8gYmUgdGhlIGZpcnN0IG9jY3VyZW5jZVxuICogQHBhcmFtIHN5bnRheEtpbmQgdGhlIHRzLlN5bnRheEtpbmQgb2YgdGhlIHN1YmNoaWxkcmVuIHRvIGluc2VydCBhZnRlclxuICogQHJldHVybiBDaGFuZ2UgaW5zdGFuY2VcbiAqIEB0aHJvdyBFcnJvciBpZiB0b0luc2VydCBpcyBmaXJzdCBvY2N1cmVuY2UgYnV0IGZhbGwgYmFjayBpcyBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRBZnRlckxhc3RPY2N1cnJlbmNlKFxuICBub2RlczogdHMuTm9kZVtdLFxuICB0b0luc2VydDogc3RyaW5nLFxuICBmaWxlOiBzdHJpbmcsXG4gIGZhbGxiYWNrUG9zOiBudW1iZXIsXG4gIHN5bnRheEtpbmQ/OiB0cy5TeW50YXhLaW5kLFxuKTogQ2hhbmdlIHtcbiAgbGV0IGxhc3RJdGVtOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICBpZiAoIWxhc3RJdGVtIHx8IGxhc3RJdGVtLmdldFN0YXJ0KCkgPCBub2RlLmdldFN0YXJ0KCkpIHtcbiAgICAgIGxhc3RJdGVtID0gbm9kZTtcbiAgICB9XG4gIH1cbiAgaWYgKHN5bnRheEtpbmQgJiYgbGFzdEl0ZW0pIHtcbiAgICBsYXN0SXRlbSA9IGZpbmROb2RlcyhsYXN0SXRlbSwgc3ludGF4S2luZCkuc29ydChub2Rlc0J5UG9zaXRpb24pLnBvcCgpO1xuICB9XG4gIGlmICghbGFzdEl0ZW0gJiYgZmFsbGJhY2tQb3MgPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGB0cmllZCB0byBpbnNlcnQgJHt0b0luc2VydH0gYXMgZmlyc3Qgb2NjdXJlbmNlIHdpdGggbm8gZmFsbGJhY2sgcG9zaXRpb25gKTtcbiAgfVxuICBjb25zdCBsYXN0SXRlbVBvc2l0aW9uOiBudW1iZXIgPSBsYXN0SXRlbSA/IGxhc3RJdGVtLmdldEVuZCgpIDogZmFsbGJhY2tQb3M7XG5cbiAgcmV0dXJuIG5ldyBJbnNlcnRDaGFuZ2UoZmlsZSwgbGFzdEl0ZW1Qb3NpdGlvbiwgdG9JbnNlcnQpO1xufVxuXG5mdW5jdGlvbiBfYW5ndWxhckltcG9ydHNGcm9tTm9kZShub2RlOiB0cy5JbXBvcnREZWNsYXJhdGlvbik6IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB9IHtcbiAgY29uc3QgbXMgPSBub2RlLm1vZHVsZVNwZWNpZmllcjtcbiAgbGV0IG1vZHVsZVBhdGg6IHN0cmluZztcbiAgc3dpdGNoIChtcy5raW5kKSB7XG4gICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICBtb2R1bGVQYXRoID0gKG1zIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgaWYgKCFtb2R1bGVQYXRoLnN0YXJ0c1dpdGgoJ0Bhbmd1bGFyLycpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgaWYgKG5vZGUuaW1wb3J0Q2xhdXNlKSB7XG4gICAgaWYgKG5vZGUuaW1wb3J0Q2xhdXNlLm5hbWUpIHtcbiAgICAgIC8vIFRoaXMgaXMgb2YgdGhlIGZvcm0gYGltcG9ydCBOYW1lIGZyb20gJ3BhdGgnYC4gSWdub3JlLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH0gZWxzZSBpZiAobm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncykge1xuICAgICAgY29uc3QgbmIgPSBub2RlLmltcG9ydENsYXVzZS5uYW1lZEJpbmRpbmdzO1xuICAgICAgaWYgKG5iLmtpbmQgPT0gdHMuU3ludGF4S2luZC5OYW1lc3BhY2VJbXBvcnQpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBvZiB0aGUgZm9ybSBgaW1wb3J0ICogYXMgbmFtZSBmcm9tICdwYXRoJ2AuIFJldHVybiBgbmFtZS5gLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIFtuYi5uYW1lLnRleHQgKyAnLiddOiBtb2R1bGVQYXRoLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBvZiB0aGUgZm9ybSBgaW1wb3J0IHthLGIsY30gZnJvbSAncGF0aCdgXG4gICAgICAgIGNvbnN0IG5hbWVkSW1wb3J0cyA9IG5iO1xuXG4gICAgICAgIHJldHVybiBuYW1lZEltcG9ydHMuZWxlbWVudHNcbiAgICAgICAgICAubWFwKChpczogdHMuSW1wb3J0U3BlY2lmaWVyKSA9PiAoaXMucHJvcGVydHlOYW1lID8gaXMucHJvcGVydHlOYW1lLnRleHQgOiBpcy5uYW1lLnRleHQpKVxuICAgICAgICAgIC5yZWR1Y2UoKGFjYzogeyBbbmFtZTogc3RyaW5nXTogc3RyaW5nIH0sIGN1cnI6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgYWNjW2N1cnJdID0gbW9kdWxlUGF0aDtcblxuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICB9LCB7fSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaXMgb2YgdGhlIGZvcm0gYGltcG9ydCAncGF0aCc7YC4gTm90aGluZyB0byBkby5cbiAgICByZXR1cm4ge307XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlY29yYXRvck1ldGFkYXRhKFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIGlkZW50aWZpZXI6IHN0cmluZyxcbiAgbW9kdWxlOiBzdHJpbmcsXG4pOiB0cy5Ob2RlW10ge1xuICBjb25zdCBhbmd1bGFySW1wb3J0cyA9IGZpbmROb2Rlcyhzb3VyY2UsIHRzLmlzSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgLm1hcCgobm9kZSkgPT4gX2FuZ3VsYXJJbXBvcnRzRnJvbU5vZGUobm9kZSkpXG4gICAgLnJlZHVjZSgoYWNjLCBjdXJyZW50KSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjdXJyZW50KSkge1xuICAgICAgICBhY2Nba2V5XSA9IGN1cnJlbnRba2V5XTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG5cbiAgcmV0dXJuIGdldFNvdXJjZU5vZGVzKHNvdXJjZSlcbiAgICAuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICBub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5EZWNvcmF0b3IgJiZcbiAgICAgICAgKG5vZGUgYXMgdHMuRGVjb3JhdG9yKS5leHByZXNzaW9uLmtpbmQgPT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvblxuICAgICAgKTtcbiAgICB9KVxuICAgIC5tYXAoKG5vZGUpID0+IChub2RlIGFzIHRzLkRlY29yYXRvcikuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbilcbiAgICAuZmlsdGVyKChleHByKSA9PiB7XG4gICAgICBpZiAoZXhwci5leHByZXNzaW9uLmtpbmQgPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgIGNvbnN0IGlkID0gZXhwci5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXI7XG5cbiAgICAgICAgcmV0dXJuIGlkLnRleHQgPT0gaWRlbnRpZmllciAmJiBhbmd1bGFySW1wb3J0c1tpZC50ZXh0XSA9PT0gbW9kdWxlO1xuICAgICAgfSBlbHNlIGlmIChleHByLmV4cHJlc3Npb24ua2luZCA9PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikge1xuICAgICAgICAvLyBUaGlzIGNvdmVycyBmb28uTmdNb2R1bGUgd2hlbiBpbXBvcnRpbmcgKiBhcyBmb28uXG4gICAgICAgIGNvbnN0IHBhRXhwciA9IGV4cHIuZXhwcmVzc2lvbiBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb247XG4gICAgICAgIC8vIElmIHRoZSBsZWZ0IGV4cHJlc3Npb24gaXMgbm90IGFuIGlkZW50aWZpZXIsIGp1c3QgZ2l2ZSB1cCBhdCB0aGF0IHBvaW50LlxuICAgICAgICBpZiAocGFFeHByLmV4cHJlc3Npb24ua2luZCAhPT0gdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaWQgPSBwYUV4cHIubmFtZS50ZXh0O1xuICAgICAgICBjb25zdCBtb2R1bGVJZCA9IChwYUV4cHIuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuXG4gICAgICAgIHJldHVybiBpZCA9PT0gaWRlbnRpZmllciAmJiBhbmd1bGFySW1wb3J0c1ttb2R1bGVJZCArICcuJ10gPT09IG1vZHVsZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pXG4gICAgLmZpbHRlcihcbiAgICAgIChleHByKSA9PlxuICAgICAgICBleHByLmFyZ3VtZW50c1swXSAmJiBleHByLmFyZ3VtZW50c1swXS5raW5kID09IHRzLlN5bnRheEtpbmQuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24sXG4gICAgKVxuICAgIC5tYXAoKGV4cHIpID0+IGV4cHIuYXJndW1lbnRzWzBdIGFzIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldGFkYXRhRmllbGQoXG4gIG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLFxuICBtZXRhZGF0YUZpZWxkOiBzdHJpbmcsXG4pOiB0cy5PYmplY3RMaXRlcmFsRWxlbWVudFtdIHtcbiAgcmV0dXJuIChcbiAgICBub2RlLnByb3BlcnRpZXNcbiAgICAgIC5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpXG4gICAgICAvLyBGaWx0ZXIgb3V0IGV2ZXJ5IGZpZWxkcyB0aGF0J3Mgbm90IFwibWV0YWRhdGFGaWVsZFwiLiBBbHNvIGhhbmRsZXMgc3RyaW5nIGxpdGVyYWxzXG4gICAgICAvLyAoYnV0IG5vdCBleHByZXNzaW9ucykuXG4gICAgICAuZmlsdGVyKCh7IG5hbWUgfSkgPT4ge1xuICAgICAgICByZXR1cm4gKHRzLmlzSWRlbnRpZmllcihuYW1lKSB8fCB0cy5pc1N0cmluZ0xpdGVyYWwobmFtZSkpICYmIG5hbWUudGV4dCA9PT0gbWV0YWRhdGFGaWVsZDtcbiAgICAgIH0pXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgbmdNb2R1bGVQYXRoOiBzdHJpbmcsXG4gIG1ldGFkYXRhRmllbGQ6IHN0cmluZyxcbiAgc3ltYm9sTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbCxcbik6IENoYW5nZVtdIHtcbiAgY29uc3Qgbm9kZXMgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShzb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJyk7XG4gIGxldCBub2RlOiBhbnkgPSBub2Rlc1swXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgLy8gRmluZCB0aGUgZGVjb3JhdG9yIGRlY2xhcmF0aW9uLlxuICBpZiAoIW5vZGUpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvLyBHZXQgYWxsIHRoZSBjaGlsZHJlbiBwcm9wZXJ0eSBhc3NpZ25tZW50IG9mIG9iamVjdCBsaXRlcmFscy5cbiAgY29uc3QgbWF0Y2hpbmdQcm9wZXJ0aWVzID0gZ2V0TWV0YWRhdGFGaWVsZChub2RlIGFzIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLCBtZXRhZGF0YUZpZWxkKTtcblxuICBpZiAobWF0Y2hpbmdQcm9wZXJ0aWVzLmxlbmd0aCA9PSAwKSB7XG4gICAgLy8gV2UgaGF2ZW4ndCBmb3VuZCB0aGUgZmllbGQgaW4gdGhlIG1ldGFkYXRhIGRlY2xhcmF0aW9uLiBJbnNlcnQgYSBuZXcgZmllbGQuXG4gICAgY29uc3QgZXhwciA9IG5vZGUgYXMgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb247XG4gICAgbGV0IHBvc2l0aW9uOiBudW1iZXI7XG4gICAgbGV0IHRvSW5zZXJ0OiBzdHJpbmc7XG4gICAgaWYgKGV4cHIucHJvcGVydGllcy5sZW5ndGggPT0gMCkge1xuICAgICAgcG9zaXRpb24gPSBleHByLmdldEVuZCgpIC0gMTtcbiAgICAgIHRvSW5zZXJ0ID0gYFxcbiAgJHttZXRhZGF0YUZpZWxkfTogW1xcbiR7dGFncy5pbmRlbnRCeSg0KWAke3N5bWJvbE5hbWV9YH1cXG4gIF1cXG5gO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gZXhwci5wcm9wZXJ0aWVzW2V4cHIucHJvcGVydGllcy5sZW5ndGggLSAxXTtcbiAgICAgIHBvc2l0aW9uID0gbm9kZS5nZXRFbmQoKTtcbiAgICAgIC8vIEdldCB0aGUgaW5kZW50YXRpb24gb2YgdGhlIGxhc3QgZWxlbWVudCwgaWYgYW55LlxuICAgICAgY29uc3QgdGV4dCA9IG5vZGUuZ2V0RnVsbFRleHQoc291cmNlKTtcbiAgICAgIGNvbnN0IG1hdGNoZXMgPSB0ZXh0Lm1hdGNoKC9eKFxccj9cXG4pKFxccyopLyk7XG4gICAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB0b0luc2VydCA9XG4gICAgICAgICAgYCwke21hdGNoZXNbMF19JHttZXRhZGF0YUZpZWxkfTogWyR7bWF0Y2hlc1sxXX1gICtcbiAgICAgICAgICBgJHt0YWdzLmluZGVudEJ5KG1hdGNoZXNbMl0ubGVuZ3RoICsgMilgJHtzeW1ib2xOYW1lfWB9JHttYXRjaGVzWzBdfV1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9JbnNlcnQgPSBgLCAke21ldGFkYXRhRmllbGR9OiBbJHtzeW1ib2xOYW1lfV1gO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaW1wb3J0UGF0aCAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgbmV3IEluc2VydENoYW5nZShuZ01vZHVsZVBhdGgsIHBvc2l0aW9uLCB0b0luc2VydCksXG4gICAgICAgIGluc2VydEltcG9ydChzb3VyY2UsIG5nTW9kdWxlUGF0aCwgc3ltYm9sTmFtZS5yZXBsYWNlKC9cXC4uKiQvLCAnJyksIGltcG9ydFBhdGgpLFxuICAgICAgXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtuZXcgSW5zZXJ0Q2hhbmdlKG5nTW9kdWxlUGF0aCwgcG9zaXRpb24sIHRvSW5zZXJ0KV07XG4gICAgfVxuICB9XG4gIGNvbnN0IGFzc2lnbm1lbnQgPSBtYXRjaGluZ1Byb3BlcnRpZXNbMF0gYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuXG4gIC8vIElmIGl0J3Mgbm90IGFuIGFycmF5LCBub3RoaW5nIHdlIGNhbiBkbyByZWFsbHkuXG4gIGlmIChhc3NpZ25tZW50LmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IGFyckxpdGVyYWwgPSBhc3NpZ25tZW50LmluaXRpYWxpemVyIGFzIHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb247XG4gIGlmIChhcnJMaXRlcmFsLmVsZW1lbnRzLmxlbmd0aCA9PSAwKSB7XG4gICAgLy8gRm9yd2FyZCB0aGUgcHJvcGVydHkuXG4gICAgbm9kZSA9IGFyckxpdGVyYWw7XG4gIH0gZWxzZSB7XG4gICAgbm9kZSA9IGFyckxpdGVyYWwuZWxlbWVudHM7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgIGNvbnN0IG5vZGVBcnJheSA9IChub2RlIGFzIHt9KSBhcyBBcnJheTx0cy5Ob2RlPjtcbiAgICBjb25zdCBzeW1ib2xzQXJyYXkgPSBub2RlQXJyYXkubWFwKChub2RlKSA9PiB0YWdzLm9uZUxpbmVgJHtub2RlLmdldFRleHQoKX1gKTtcbiAgICBpZiAoc3ltYm9sc0FycmF5LmluY2x1ZGVzKHRhZ3Mub25lTGluZWAke3N5bWJvbE5hbWV9YCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBub2RlID0gbm9kZVtub2RlLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgbGV0IHRvSW5zZXJ0OiBzdHJpbmc7XG4gIGxldCBwb3NpdGlvbiA9IG5vZGUuZ2V0RW5kKCk7XG4gIGlmIChub2RlLmtpbmQgPT0gdHMuU3ludGF4S2luZC5BcnJheUxpdGVyYWxFeHByZXNzaW9uKSB7XG4gICAgLy8gV2UgZm91bmQgdGhlIGZpZWxkIGJ1dCBpdCdzIGVtcHR5LiBJbnNlcnQgaXQganVzdCBiZWZvcmUgdGhlIGBdYC5cbiAgICBwb3NpdGlvbi0tO1xuICAgIHRvSW5zZXJ0ID0gYFxcbiR7dGFncy5pbmRlbnRCeSg0KWAke3N5bWJvbE5hbWV9YH1cXG4gIGA7XG4gIH0gZWxzZSB7XG4gICAgLy8gR2V0IHRoZSBpbmRlbnRhdGlvbiBvZiB0aGUgbGFzdCBlbGVtZW50LCBpZiBhbnkuXG4gICAgY29uc3QgdGV4dCA9IG5vZGUuZ2V0RnVsbFRleHQoc291cmNlKTtcbiAgICBjb25zdCBtYXRjaGVzID0gdGV4dC5tYXRjaCgvXihcXHI/XFxuKShcXHMqKS8pO1xuICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICB0b0luc2VydCA9IGAsJHttYXRjaGVzWzFdfSR7dGFncy5pbmRlbnRCeShtYXRjaGVzWzJdLmxlbmd0aClgJHtzeW1ib2xOYW1lfWB9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9JbnNlcnQgPSBgLCAke3N5bWJvbE5hbWV9YDtcbiAgICB9XG4gIH1cbiAgaWYgKGltcG9ydFBhdGggIT09IG51bGwpIHtcbiAgICByZXR1cm4gW1xuICAgICAgbmV3IEluc2VydENoYW5nZShuZ01vZHVsZVBhdGgsIHBvc2l0aW9uLCB0b0luc2VydCksXG4gICAgICBpbnNlcnRJbXBvcnQoc291cmNlLCBuZ01vZHVsZVBhdGgsIHN5bWJvbE5hbWUucmVwbGFjZSgvXFwuLiokLywgJycpLCBpbXBvcnRQYXRoKSxcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIFtuZXcgSW5zZXJ0Q2hhbmdlKG5nTW9kdWxlUGF0aCwgcG9zaXRpb24sIHRvSW5zZXJ0KV07XG59XG5cbi8qKlxuICogQ3VzdG9tIGZ1bmN0aW9uIHRvIGluc2VydCBhIGRlY2xhcmF0aW9uIChjb21wb25lbnQsIHBpcGUsIGRpcmVjdGl2ZSlcbiAqIGludG8gTmdNb2R1bGUgZGVjbGFyYXRpb25zLiBJdCBhbHNvIGltcG9ydHMgdGhlIGNvbXBvbmVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZERlY2xhcmF0aW9uVG9Nb2R1bGUoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlUGF0aDogc3RyaW5nLFxuICBjbGFzc2lmaWVkTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcsXG4pOiBDaGFuZ2VbXSB7XG4gIHJldHVybiBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoXG4gICAgc291cmNlLFxuICAgIG1vZHVsZVBhdGgsXG4gICAgJ2RlY2xhcmF0aW9ucycsXG4gICAgY2xhc3NpZmllZE5hbWUsXG4gICAgaW1wb3J0UGF0aCxcbiAgKTtcbn1cblxuLyoqXG4gKiBDdXN0b20gZnVuY3Rpb24gdG8gaW5zZXJ0IGFuIE5nTW9kdWxlIGludG8gTmdNb2R1bGUgaW1wb3J0cy4gSXQgYWxzbyBpbXBvcnRzIHRoZSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRJbXBvcnRUb01vZHVsZShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4gIGNsYXNzaWZpZWROYW1lOiBzdHJpbmcsXG4gIGltcG9ydFBhdGg6IHN0cmluZyxcbik6IENoYW5nZVtdIHtcbiAgcmV0dXJuIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShzb3VyY2UsIG1vZHVsZVBhdGgsICdpbXBvcnRzJywgY2xhc3NpZmllZE5hbWUsIGltcG9ydFBhdGgpO1xufVxuXG4vKipcbiAqIEN1c3RvbSBmdW5jdGlvbiB0byBpbnNlcnQgYSBwcm92aWRlciBpbnRvIE5nTW9kdWxlLiBJdCBhbHNvIGltcG9ydHMgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRQcm92aWRlclRvTW9kdWxlKFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIG1vZHVsZVBhdGg6IHN0cmluZyxcbiAgY2xhc3NpZmllZE5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nLFxuKTogQ2hhbmdlW10ge1xuICByZXR1cm4gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKHNvdXJjZSwgbW9kdWxlUGF0aCwgJ3Byb3ZpZGVycycsIGNsYXNzaWZpZWROYW1lLCBpbXBvcnRQYXRoKTtcbn1cblxuLyoqXG4gKiBDdXN0b20gZnVuY3Rpb24gdG8gaW5zZXJ0IGFuIGV4cG9ydCBpbnRvIE5nTW9kdWxlLiBJdCBhbHNvIGltcG9ydHMgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRFeHBvcnRUb01vZHVsZShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4gIGNsYXNzaWZpZWROYW1lOiBzdHJpbmcsXG4gIGltcG9ydFBhdGg6IHN0cmluZyxcbik6IENoYW5nZVtdIHtcbiAgcmV0dXJuIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShzb3VyY2UsIG1vZHVsZVBhdGgsICdleHBvcnRzJywgY2xhc3NpZmllZE5hbWUsIGltcG9ydFBhdGgpO1xufVxuXG4vKipcbiAqIEN1c3RvbSBmdW5jdGlvbiB0byBpbnNlcnQgYW4gZXhwb3J0IGludG8gTmdNb2R1bGUuIEl0IGFsc28gaW1wb3J0cyBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEJvb3RzdHJhcFRvTW9kdWxlKFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIG1vZHVsZVBhdGg6IHN0cmluZyxcbiAgY2xhc3NpZmllZE5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nLFxuKTogQ2hhbmdlW10ge1xuICByZXR1cm4gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKHNvdXJjZSwgbW9kdWxlUGF0aCwgJ2Jvb3RzdHJhcCcsIGNsYXNzaWZpZWROYW1lLCBpbXBvcnRQYXRoKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYW4gaW1wb3J0IGFscmVhZHkgZXhpc3RzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJbXBvcnRlZChcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBjbGFzc2lmaWVkTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcsXG4pOiBib29sZWFuIHtcbiAgY29uc3QgYWxsTm9kZXMgPSBnZXRTb3VyY2VOb2Rlcyhzb3VyY2UpO1xuICBjb25zdCBtYXRjaGluZ05vZGVzID0gYWxsTm9kZXNcbiAgICAuZmlsdGVyKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgLmZpbHRlcihcbiAgICAgIChpbXApID0+IHRzLmlzU3RyaW5nTGl0ZXJhbChpbXAubW9kdWxlU3BlY2lmaWVyKSAmJiBpbXAubW9kdWxlU3BlY2lmaWVyLnRleHQgPT09IGltcG9ydFBhdGgsXG4gICAgKVxuICAgIC5maWx0ZXIoKGltcCkgPT4ge1xuICAgICAgaWYgKCFpbXAuaW1wb3J0Q2xhdXNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5vZGVzID0gZmluZE5vZGVzKGltcC5pbXBvcnRDbGF1c2UsIHRzLmlzSW1wb3J0U3BlY2lmaWVyKS5maWx0ZXIoXG4gICAgICAgIChuKSA9PiBuLmdldFRleHQoKSA9PT0gY2xhc3NpZmllZE5hbWUsXG4gICAgICApO1xuXG4gICAgICByZXR1cm4gbm9kZXMubGVuZ3RoID4gMDtcbiAgICB9KTtcblxuICByZXR1cm4gbWF0Y2hpbmdOb2Rlcy5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgZW52aXJvbm1lbnQgZXhwb3J0XG4gKiB3aGV0aGVyIHRoaXMgZXhwb3J0IGlzIGFsaWFzZWQgb3Igbm90LiBJZiB0aGUgZW52aXJvbm1lbnQgZmlsZVxuICogaXMgbm90IGltcG9ydGVkLCB0aGVuIGl0IHdpbGwgcmV0dXJuIGBudWxsYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50RXhwb3J0TmFtZShzb3VyY2U6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgLy8gSW5pdGlhbCB2YWx1ZSBpcyBgbnVsbGAgYXMgd2UgZG9uJ3Qga25vdyB5ZXQgaWYgdGhlIHVzZXJcbiAgLy8gaGFzIGltcG9ydGVkIGBlbnZpcm9ubWVudGAgaW50byB0aGUgcm9vdCBtb2R1bGUgb3Igbm90LlxuICBsZXQgZW52aXJvbm1lbnRFeHBvcnROYW1lOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICBjb25zdCBhbGxOb2RlcyA9IGdldFNvdXJjZU5vZGVzKHNvdXJjZSk7XG5cbiAgYWxsTm9kZXNcbiAgICAuZmlsdGVyKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24pXG4gICAgLmZpbHRlcihcbiAgICAgIChkZWNsYXJhdGlvbikgPT5cbiAgICAgICAgZGVjbGFyYXRpb24ubW9kdWxlU3BlY2lmaWVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCAmJlxuICAgICAgICBkZWNsYXJhdGlvbi5pbXBvcnRDbGF1c2UgIT09IHVuZGVmaW5lZCxcbiAgICApXG4gICAgLm1hcCgoZGVjbGFyYXRpb24pID0+XG4gICAgICAvLyBJZiBgaW1wb3J0Q2xhdXNlYCBwcm9wZXJ0eSBpcyBkZWZpbmVkIHRoZW4gdGhlIGZpcnN0XG4gICAgICAvLyBjaGlsZCB3aWxsIGJlIGBOYW1lZEltcG9ydHNgIG9iamVjdCAob3IgYG5hbWVkQmluZGluZ3NgKS5cbiAgICAgIChkZWNsYXJhdGlvbi5pbXBvcnRDbGF1c2UgYXMgdHMuSW1wb3J0Q2xhdXNlKS5nZXRDaGlsZEF0KDApLFxuICAgIClcbiAgICAvLyBGaW5kIHRob3NlIGBOYW1lZEltcG9ydHNgIG9iamVjdCB0aGF0IGNvbnRhaW5zIGBlbnZpcm9ubWVudGAga2V5d29yZFxuICAgIC8vIGluIGl0cyB0ZXh0LiBFLmcuIGB7IGVudmlyb25tZW50IGFzIGVudiB9YC5cbiAgICAuZmlsdGVyKHRzLmlzTmFtZWRJbXBvcnRzKVxuICAgIC5maWx0ZXIoKG5hbWVkSW1wb3J0cykgPT4gbmFtZWRJbXBvcnRzLmdldFRleHQoKS5pbmNsdWRlcygnZW52aXJvbm1lbnQnKSlcbiAgICAuZm9yRWFjaCgobmFtZWRJbXBvcnRzKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IHNwZWNpZmllciBvZiBuYW1lZEltcG9ydHMuZWxlbWVudHMpIHtcbiAgICAgICAgLy8gYHByb3BlcnR5TmFtZWAgaXMgZGVmaW5lZCBpZiB0aGUgc3BlY2lmaWVyXG4gICAgICAgIC8vIGhhcyBhbiBhbGlhc2VkIGltcG9ydC5cbiAgICAgICAgY29uc3QgbmFtZSA9IHNwZWNpZmllci5wcm9wZXJ0eU5hbWUgfHwgc3BlY2lmaWVyLm5hbWU7XG5cbiAgICAgICAgLy8gRmluZCBzcGVjaWZpZXIgdGhhdCBjb250YWlucyBgZW52aXJvbm1lbnRgIGtleXdvcmQgaW4gaXRzIHRleHQuXG4gICAgICAgIC8vIFdoZXRoZXIgaXQncyBgZW52aXJvbm1lbnRgIG9yIGBlbnZpcm9ubWVudCBhcyBlbnZgLlxuICAgICAgICBpZiAobmFtZS50ZXh0LmluY2x1ZGVzKCdlbnZpcm9ubWVudCcpKSB7XG4gICAgICAgICAgZW52aXJvbm1lbnRFeHBvcnROYW1lID0gc3BlY2lmaWVyLm5hbWUudGV4dDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gIHJldHVybiBlbnZpcm9ubWVudEV4cG9ydE5hbWU7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgUm91dGVyTW9kdWxlIGRlY2xhcmF0aW9uIGZyb20gTmdNb2R1bGUgbWV0YWRhdGEsIGlmIGFueS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJvdXRlck1vZHVsZURlY2xhcmF0aW9uKHNvdXJjZTogdHMuU291cmNlRmlsZSk6IHRzLkV4cHJlc3Npb24gfCB1bmRlZmluZWQge1xuICBjb25zdCByZXN1bHQgPSBnZXREZWNvcmF0b3JNZXRhZGF0YShzb3VyY2UsICdOZ01vZHVsZScsICdAYW5ndWxhci9jb3JlJyk7XG4gIGNvbnN0IG5vZGUgPSByZXN1bHRbMF0gYXMgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb247XG4gIGNvbnN0IG1hdGNoaW5nUHJvcGVydGllcyA9IGdldE1ldGFkYXRhRmllbGQobm9kZSwgJ2ltcG9ydHMnKTtcblxuICBpZiAoIW1hdGNoaW5nUHJvcGVydGllcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGFzc2lnbm1lbnQgPSBtYXRjaGluZ1Byb3BlcnRpZXNbMF0gYXMgdHMuUHJvcGVydHlBc3NpZ25tZW50O1xuXG4gIGlmIChhc3NpZ25tZW50LmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGFyckxpdGVyYWwgPSBhc3NpZ25tZW50LmluaXRpYWxpemVyIGFzIHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb247XG5cbiAgcmV0dXJuIGFyckxpdGVyYWwuZWxlbWVudHNcbiAgICAuZmlsdGVyKChlbCkgPT4gZWwua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbilcbiAgICAuZmluZCgoZWwpID0+IChlbCBhcyB0cy5JZGVudGlmaWVyKS5nZXRUZXh0KCkuc3RhcnRzV2l0aCgnUm91dGVyTW9kdWxlJykpO1xufVxuXG4vKipcbiAqIEFkZHMgYSBuZXcgcm91dGUgZGVjbGFyYXRpb24gdG8gYSByb3V0ZXIgbW9kdWxlIChpLmUuIGhhcyBhIFJvdXRlck1vZHVsZSBkZWNsYXJhdGlvbilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZFJvdXRlRGVjbGFyYXRpb25Ub01vZHVsZShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBmaWxlVG9BZGQ6IHN0cmluZyxcbiAgcm91dGVMaXRlcmFsOiBzdHJpbmcsXG4pOiBDaGFuZ2Uge1xuICBjb25zdCByb3V0ZXJNb2R1bGVFeHByID0gZ2V0Um91dGVyTW9kdWxlRGVjbGFyYXRpb24oc291cmNlKTtcbiAgaWYgKCFyb3V0ZXJNb2R1bGVFeHByKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZG4ndCBmaW5kIGEgcm91dGUgZGVjbGFyYXRpb24gaW4gJHtmaWxlVG9BZGR9LmApO1xuICB9XG4gIGNvbnN0IHNjb3BlQ29uZmlnTWV0aG9kQXJncyA9IChyb3V0ZXJNb2R1bGVFeHByIGFzIHRzLkNhbGxFeHByZXNzaW9uKS5hcmd1bWVudHM7XG4gIGlmICghc2NvcGVDb25maWdNZXRob2RBcmdzLmxlbmd0aCkge1xuICAgIGNvbnN0IHsgbGluZSB9ID0gc291cmNlLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHJvdXRlck1vZHVsZUV4cHIuZ2V0U3RhcnQoKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSByb3V0ZXIgbW9kdWxlIG1ldGhvZCBkb2Vzbid0IGhhdmUgYXJndW1lbnRzIGAgKyBgYXQgbGluZSAke2xpbmV9IGluICR7ZmlsZVRvQWRkfWAsXG4gICAgKTtcbiAgfVxuXG4gIGxldCByb3V0ZXNBcnI6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHJvdXRlc0FyZyA9IHNjb3BlQ29uZmlnTWV0aG9kQXJnc1swXTtcblxuICAvLyBDaGVjayBpZiB0aGUgcm91dGUgZGVjbGFyYXRpb25zIGFycmF5IGlzXG4gIC8vIGFuIGlubGluZWQgYXJndW1lbnQgb2YgUm91dGVyTW9kdWxlIG9yIGEgc3RhbmRhbG9uZSB2YXJpYWJsZVxuICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHJvdXRlc0FyZykpIHtcbiAgICByb3V0ZXNBcnIgPSByb3V0ZXNBcmc7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgcm91dGVzVmFyTmFtZSA9IHJvdXRlc0FyZy5nZXRUZXh0KCk7XG4gICAgbGV0IHJvdXRlc1ZhcjtcbiAgICBpZiAocm91dGVzQXJnLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgcm91dGVzVmFyID0gc291cmNlLnN0YXRlbWVudHMuZmlsdGVyKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQpLmZpbmQoKHYpID0+IHtcbiAgICAgICAgcmV0dXJuIHYuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1swXS5uYW1lLmdldFRleHQoKSA9PT0gcm91dGVzVmFyTmFtZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghcm91dGVzVmFyKSB7XG4gICAgICBjb25zdCB7IGxpbmUgfSA9IHNvdXJjZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihyb3V0ZXNBcmcuZ2V0U3RhcnQoKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyByb3V0ZSBkZWNsYXJhdGlvbiBhcnJheSB3YXMgZm91bmQgdGhhdCBjb3JyZXNwb25kcyBgICtcbiAgICAgICAgICBgdG8gcm91dGVyIG1vZHVsZSBhdCBsaW5lICR7bGluZX0gaW4gJHtmaWxlVG9BZGR9YCxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcm91dGVzQXJyID0gZmluZE5vZGVzKFxuICAgICAgcm91dGVzVmFyLFxuICAgICAgdHMuU3ludGF4S2luZC5BcnJheUxpdGVyYWxFeHByZXNzaW9uLFxuICAgICAgMSxcbiAgICApWzBdIGFzIHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb247XG4gIH1cblxuICBjb25zdCBvY2N1cnJlbmNlc0NvdW50ID0gcm91dGVzQXJyLmVsZW1lbnRzLmxlbmd0aDtcbiAgY29uc3QgdGV4dCA9IHJvdXRlc0Fyci5nZXRGdWxsVGV4dChzb3VyY2UpO1xuXG4gIGxldCByb3V0ZTogc3RyaW5nID0gcm91dGVMaXRlcmFsO1xuICBsZXQgaW5zZXJ0UG9zID0gcm91dGVzQXJyLmVsZW1lbnRzLnBvcztcblxuICBpZiAob2NjdXJyZW5jZXNDb3VudCA+IDApIHtcbiAgICBjb25zdCBsYXN0Um91dGVMaXRlcmFsID0gWy4uLnJvdXRlc0Fyci5lbGVtZW50c10ucG9wKCkgYXMgdHMuRXhwcmVzc2lvbjtcbiAgICBjb25zdCBsYXN0Um91dGVJc1dpbGRjYXJkID1cbiAgICAgIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obGFzdFJvdXRlTGl0ZXJhbCkgJiZcbiAgICAgIGxhc3RSb3V0ZUxpdGVyYWwucHJvcGVydGllcy5zb21lKFxuICAgICAgICAobikgPT5cbiAgICAgICAgICB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChuKSAmJlxuICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihuLm5hbWUpICYmXG4gICAgICAgICAgbi5uYW1lLnRleHQgPT09ICdwYXRoJyAmJlxuICAgICAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChuLmluaXRpYWxpemVyKSAmJlxuICAgICAgICAgIG4uaW5pdGlhbGl6ZXIudGV4dCA9PT0gJyoqJyxcbiAgICAgICk7XG5cbiAgICBjb25zdCBpbmRlbnRhdGlvbiA9IHRleHQubWF0Y2goL1xccj9cXG4oXFxyPylcXHMqLykgfHwgW107XG4gICAgY29uc3Qgcm91dGVUZXh0ID0gYCR7aW5kZW50YXRpb25bMF0gfHwgJyAnfSR7cm91dGVMaXRlcmFsfWA7XG5cbiAgICAvLyBBZGQgdGhlIG5ldyByb3V0ZSBiZWZvcmUgdGhlIHdpbGRjYXJkIHJvdXRlXG4gICAgLy8gb3RoZXJ3aXNlIHdlJ2xsIGFsd2F5cyByZWRpcmVjdCB0byB0aGUgd2lsZGNhcmQgcm91dGVcbiAgICBpZiAobGFzdFJvdXRlSXNXaWxkY2FyZCkge1xuICAgICAgaW5zZXJ0UG9zID0gbGFzdFJvdXRlTGl0ZXJhbC5wb3M7XG4gICAgICByb3V0ZSA9IGAke3JvdXRlVGV4dH0sYDtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5zZXJ0UG9zID0gbGFzdFJvdXRlTGl0ZXJhbC5lbmQ7XG4gICAgICByb3V0ZSA9IGAsJHtyb3V0ZVRleHR9YDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IEluc2VydENoYW5nZShmaWxlVG9BZGQsIGluc2VydFBvcywgcm91dGUpO1xufVxuIl19