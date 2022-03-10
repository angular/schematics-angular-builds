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
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvc2NoZW1hdGljcy9hbmd1bGFyL3V0aWxpdHkvYXN0LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0NBQTRDO0FBQzVDLGtHQUFvRjtBQUNwRixxQ0FBNEQ7QUFFNUQ7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFnQixZQUFZLENBQzFCLE1BQXFCLEVBQ3JCLFVBQWtCLEVBQ2xCLFVBQWtCLEVBQ2xCLFFBQWdCLEVBQ2hCLFNBQVMsR0FBRyxLQUFLO0lBRWpCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQztJQUN4QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUV4RSxpRUFBaUU7SUFDakUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ2pELHFGQUFxRjtRQUNyRixNQUFNLFdBQVcsR0FBRyxJQUFJO2FBQ3JCLFdBQVcsRUFBRTthQUNiLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDO2FBQzFCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzlCLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztRQUM1QiwyQkFBMkI7UUFDM0IsTUFBTSxPQUFP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QUMsVUFBVSxDQUFDLElBQUksQ0FDOUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNKLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDdkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTTtnQkFDdEIsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO2dCQUNqQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxJQUFJLENBQzlCLENBQUM7UUFFSixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFNBQVMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFFNUQsOENBQThDO1FBQzlDLHdEQUF3RDtRQUN4RCxJQUFJLG1CQUFtQixFQUFFO1lBQ3ZCLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7WUFDakMsS0FBSyxHQUFHLEdBQUcsU0FBUyxHQUFHLENBQUM7U0FDekI7YUFBTTtZQUNMLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7WUFDakMsS0FBSyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7U0FDekI7S0FDRjtJQUVELE9BQU8sSUFBSSxxQkFBWSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDdkQsQ0FBQztBQWxGRCxrRUFrRkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgdGFncyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJy4uL3RoaXJkX3BhcnR5L2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvbGliL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgQ2hhbmdlLCBJbnNlcnRDaGFuZ2UsIE5vb3BDaGFuZ2UgfSBmcm9tICcuL2NoYW5nZSc7XG5cbi8qKlxuICogQWRkIEltcG9ydCBgaW1wb3J0IHsgc3ltYm9sTmFtZSB9IGZyb20gZmlsZU5hbWVgIGlmIHRoZSBpbXBvcnQgZG9lc24ndCBleGl0XG4gKiBhbHJlYWR5LiBBc3N1bWVzIGZpbGVUb0VkaXQgY2FuIGJlIHJlc29sdmVkIGFuZCBhY2Nlc3NlZC5cbiAqIEBwYXJhbSBmaWxlVG9FZGl0IChmaWxlIHdlIHdhbnQgdG8gYWRkIGltcG9ydCB0bylcbiAqIEBwYXJhbSBzeW1ib2xOYW1lIChpdGVtIHRvIGltcG9ydClcbiAqIEBwYXJhbSBmaWxlTmFtZSAocGF0aCB0byB0aGUgZmlsZSlcbiAqIEBwYXJhbSBpc0RlZmF1bHQgKGlmIHRydWUsIGltcG9ydCBmb2xsb3dzIHN0eWxlIGZvciBpbXBvcnRpbmcgZGVmYXVsdCBleHBvcnRzKVxuICogQHJldHVybiBDaGFuZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEltcG9ydChcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBmaWxlVG9FZGl0OiBzdHJpbmcsXG4gIHN5bWJvbE5hbWU6IHN0cmluZyxcbiAgZmlsZU5hbWU6IHN0cmluZyxcbiAgaXNEZWZhdWx0ID0gZmFsc2UsXG4pOiBDaGFuZ2Uge1xuICBjb25zdCByb290Tm9kZSA9IHNvdXJjZTtcbiAgY29uc3QgYWxsSW1wb3J0cyA9IGZpbmROb2Rlcyhyb290Tm9kZSwgdHMuU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbik7XG5cbiAgLy8gZ2V0IG5vZGVzIHRoYXQgbWFwIHRvIGltcG9ydCBzdGF0ZW1lbnRzIGZyb20gdGhlIGZpbGUgZmlsZU5hbWVcbiAgY29uc3QgcmVsZXZhbnRJbXBvcnRzID0gYWxsSW1wb3J0cy5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAvLyBTdHJpbmdMaXRlcmFsIG9mIHRoZSBJbXBvcnREZWNsYXJhdGlvbiBpcyB0aGUgaW1wb3J0IGZpbGUgKGZpbGVOYW1lIGluIHRoaXMgY2FzZSkuXG4gICAgY29uc3QgaW1wb3J0RmlsZXMgPSBub2RlXG4gICAgICAuZ2V0Q2hpbGRyZW4oKVxuICAgICAgLmZpbHRlcih0cy5pc1N0cmluZ0xpdGVyYWwpXG4gICAgICAubWFwKChuKSA9PiBuLnRleHQpO1xuXG4gICAgcmV0dXJuIGltcG9ydEZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZSA9PT0gZmlsZU5hbWUpLmxlbmd0aCA9PT0gMTtcbiAgfSk7XG5cbiAgaWYgKHJlbGV2YW50SW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IGltcG9ydHNBc3RlcmlzayA9IGZhbHNlO1xuICAgIC8vIGltcG9ydHMgZnJvbSBpbXBvcnQgZmlsZVxuICAgIGNvbnN0IGltcG9ydHM6IHRzLk5vZGVbXSA9IFtdO1xuICAgIHJlbGV2YW50SW1wb3J0cy5mb3JFYWNoKChuKSA9PiB7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShpbXBvcnRzLCBmaW5kTm9kZXMobiwgdHMuU3ludGF4S2luZC5JZGVudGlmaWVyKSk7XG4gICAgICBpZiAoZmluZE5vZGVzKG4sIHRzLlN5bnRheEtpbmQuQXN0ZXJpc2tUb2tlbikubGVuZ3RoID4gMCkge1xuICAgICAgICBpbXBvcnRzQXN0ZXJpc2sgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gaWYgaW1wb3J0cyAqIGZyb20gZmlsZU5hbWUsIGRvbid0IGFkZCBzeW1ib2xOYW1lXG4gICAgaWYgKGltcG9ydHNBc3Rlcmlzaykge1xuICAgICAgcmV0dXJuIG5ldyBOb29wQ2hhbmdlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0VGV4dE5vZGVzID0gaW1wb3J0cy5maWx0ZXIoKG4pID0+IChuIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09IHN5bWJvbE5hbWUpO1xuXG4gICAgLy8gaW5zZXJ0IGltcG9ydCBpZiBpdCdzIG5vdCB0aGVyZVxuICAgIGlmIChpbXBvcnRUZXh0Tm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zdCBmYWxsYmFja1BvcyA9XG4gICAgICAgIGZpbmROb2RlcyhyZWxldmFudEltcG9ydHNbMF0sIHRzLlN5bnRheEtpbmQuQ2xvc2VCcmFjZVRva2VuKVswXS5nZXRTdGFydCgpIHx8XG4gICAgICAgIGZpbmROb2RlcyhyZWxldmFudEltcG9ydHNbMF0sIHRzLlN5bnRheEtpbmQuRnJvbUtleXdvcmQpWzBdLmdldFN0YXJ0KCk7XG5cbiAgICAgIHJldHVybiBpbnNlcnRBZnRlckxhc3RPY2N1cnJlbmNlKGltcG9ydHMsIGAsICR7c3ltYm9sTmFtZX1gLCBmaWxlVG9FZGl0LCBmYWxsYmFja1Bvcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBOb29wQ2hhbmdlKCk7XG4gIH1cblxuICAvLyBubyBzdWNoIGltcG9ydCBkZWNsYXJhdGlvbiBleGlzdHNcbiAgY29uc3QgdXNlU3RyaWN0ID0gZmluZE5vZGVzKHJvb3ROb2RlLCB0cy5pc1N0cmluZ0xpdGVyYWwpLmZpbHRlcigobikgPT4gbi50ZXh0ID09PSAndXNlIHN0cmljdCcpO1xuICBsZXQgZmFsbGJhY2tQb3MgPSAwO1xuICBpZiAodXNlU3RyaWN0Lmxlbmd0aCA+IDApIHtcbiAgICBmYWxsYmFja1BvcyA9IHVzZVN0cmljdFswXS5lbmQ7XG4gIH1cbiAgY29uc3Qgb3BlbiA9IGlzRGVmYXVsdCA/ICcnIDogJ3sgJztcbiAgY29uc3QgY2xvc2UgPSBpc0RlZmF1bHQgPyAnJyA6ICcgfSc7XG4gIC8vIGlmIHRoZXJlIGFyZSBubyBpbXBvcnRzIG9yICd1c2Ugc3RyaWN0JyBzdGF0ZW1lbnQsIGluc2VydCBpbXBvcnQgYXQgYmVnaW5uaW5nIG9mIGZpbGVcbiAgY29uc3QgaW5zZXJ0QXRCZWdpbm5pbmcgPSBhbGxJbXBvcnRzLmxlbmd0aCA9PT0gMCAmJiB1c2VTdHJpY3QubGVuZ3RoID09PSAwO1xuICBjb25zdCBzZXBhcmF0b3IgPSBpbnNlcnRBdEJlZ2lubmluZyA/ICcnIDogJztcXG4nO1xuICBjb25zdCB0b0luc2VydCA9XG4gICAgYCR7c2VwYXJhdG9yfWltcG9ydCAke29wZW59JHtzeW1ib2xOYW1lfSR7Y2xvc2V9YCArXG4gICAgYCBmcm9tICcke2ZpbGVOYW1lfScke2luc2VydEF0QmVnaW5uaW5nID8gJztcXG4nIDogJyd9YDtcblxuICByZXR1cm4gaW5zZXJ0QWZ0ZXJMYXN0T2NjdXJyZW5jZShcbiAgICBhbGxJbXBvcnRzLFxuICAgIHRvSW5zZXJ0LFxuICAgIGZpbGVUb0VkaXQsXG4gICAgZmFsbGJhY2tQb3MsXG4gICAgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsLFxuICApO1xufVxuXG4vKipcbiAqIEZpbmQgYWxsIG5vZGVzIGZyb20gdGhlIEFTVCBpbiB0aGUgc3VidHJlZSBvZiBub2RlIG9mIFN5bnRheEtpbmQga2luZC5cbiAqIEBwYXJhbSBub2RlXG4gKiBAcGFyYW0ga2luZFxuICogQHBhcmFtIG1heCBUaGUgbWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gcmV0dXJuLlxuICogQHBhcmFtIHJlY3Vyc2l2ZSBDb250aW51ZSBsb29raW5nIGZvciBub2RlcyBvZiBraW5kIHJlY3Vyc2l2ZSB1bnRpbCBlbmRcbiAqIHRoZSBsYXN0IGNoaWxkIGV2ZW4gd2hlbiBub2RlIG9mIGtpbmQgaGFzIGJlZW4gZm91bmQuXG4gKiBAcmV0dXJuIGFsbCBub2RlcyBvZiBraW5kLCBvciBbXSBpZiBub25lIGlzIGZvdW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTm9kZXMoXG4gIG5vZGU6IHRzLk5vZGUsXG4gIGtpbmQ6IHRzLlN5bnRheEtpbmQsXG4gIG1heD86IG51bWJlcixcbiAgcmVjdXJzaXZlPzogYm9vbGVhbixcbik6IHRzLk5vZGVbXTtcblxuLyoqXG4gKiBGaW5kIGFsbCBub2RlcyBmcm9tIHRoZSBBU1QgaW4gdGhlIHN1YnRyZWUgdGhhdCBzYXRpc2Z5IGEgdHlwZSBndWFyZC5cbiAqIEBwYXJhbSBub2RlXG4gKiBAcGFyYW0gZ3VhcmRcbiAqIEBwYXJhbSBtYXggVGhlIG1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIHJldHVybi5cbiAqIEBwYXJhbSByZWN1cnNpdmUgQ29udGludWUgbG9va2luZyBmb3Igbm9kZXMgb2Yga2luZCByZWN1cnNpdmUgdW50aWwgZW5kXG4gKiB0aGUgbGFzdCBjaGlsZCBldmVuIHdoZW4gbm9kZSBvZiBraW5kIGhhcyBiZWVuIGZvdW5kLlxuICogQHJldHVybiBhbGwgbm9kZXMgdGhhdCBzYXRpc2Z5IHRoZSB0eXBlIGd1YXJkLCBvciBbXSBpZiBub25lIGlzIGZvdW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTm9kZXM8VCBleHRlbmRzIHRzLk5vZGU+KFxuICBub2RlOiB0cy5Ob2RlLFxuICBndWFyZDogKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgVCxcbiAgbWF4PzogbnVtYmVyLFxuICByZWN1cnNpdmU/OiBib29sZWFuLFxuKTogVFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZE5vZGVzPFQgZXh0ZW5kcyB0cy5Ob2RlPihcbiAgbm9kZTogdHMuTm9kZSxcbiAga2luZE9yR3VhcmQ6IHRzLlN5bnRheEtpbmQgfCAoKG5vZGU6IHRzLk5vZGUpID0+IG5vZGUgaXMgVCksXG4gIG1heCA9IEluZmluaXR5LFxuICByZWN1cnNpdmUgPSBmYWxzZSxcbik6IFRbXSB7XG4gIGlmICghbm9kZSB8fCBtYXggPT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGNvbnN0IHRlc3QgPVxuICAgIHR5cGVvZiBraW5kT3JHdWFyZCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgPyBraW5kT3JHdWFyZFxuICAgICAgOiAobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgVCA9PiBub2RlLmtpbmQgPT09IGtpbmRPckd1YXJkO1xuXG4gIGNvbnN0IGFycjogVFtdID0gW107XG4gIGlmICh0ZXN0KG5vZGUpKSB7XG4gICAgYXJyLnB1c2gobm9kZSk7XG4gICAgbWF4LS07XG4gIH1cbiAgaWYgKG1heCA+IDAgJiYgKHJlY3Vyc2l2ZSB8fCAhdGVzdChub2RlKSkpIHtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuZ2V0Q2hpbGRyZW4oKSkge1xuICAgICAgZmluZE5vZGVzKGNoaWxkLCB0ZXN0LCBtYXgsIHJlY3Vyc2l2ZSkuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgICBpZiAobWF4ID4gMCkge1xuICAgICAgICAgIGFyci5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIG1heC0tO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChtYXggPD0gMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYXJyO1xufVxuXG4vKipcbiAqIEdldCBhbGwgdGhlIG5vZGVzIGZyb20gYSBzb3VyY2UuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgb2JqZWN0LlxuICogQHJldHVybnMge0FycmF5PHRzLk5vZGU+fSBBbiBhcnJheSBvZiBhbGwgdGhlIG5vZGVzIGluIHRoZSBzb3VyY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VOb2Rlcyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuTm9kZVtdIHtcbiAgY29uc3Qgbm9kZXM6IHRzLk5vZGVbXSA9IFtzb3VyY2VGaWxlXTtcbiAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgd2hpbGUgKG5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBub2RlID0gbm9kZXMuc2hpZnQoKTtcblxuICAgIGlmIChub2RlKSB7XG4gICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgIGlmIChub2RlLmdldENoaWxkQ291bnQoc291cmNlRmlsZSkgPj0gMCkge1xuICAgICAgICBub2Rlcy51bnNoaWZ0KC4uLm5vZGUuZ2V0Q2hpbGRyZW4oKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmROb2RlKG5vZGU6IHRzLk5vZGUsIGtpbmQ6IHRzLlN5bnRheEtpbmQsIHRleHQ6IHN0cmluZyk6IHRzLk5vZGUgfCBudWxsIHtcbiAgaWYgKG5vZGUua2luZCA9PT0ga2luZCAmJiBub2RlLmdldFRleHQoKSA9PT0gdGV4dCkge1xuICAgIC8vIHRocm93IG5ldyBFcnJvcihub2RlLmdldFRleHQoKSk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBsZXQgZm91bmROb2RlOiB0cy5Ob2RlIHwgbnVsbCA9IG51bGw7XG4gIHRzLmZvckVhY2hDaGlsZChub2RlLCAoY2hpbGROb2RlKSA9PiB7XG4gICAgZm91bmROb2RlID0gZm91bmROb2RlIHx8IGZpbmROb2RlKGNoaWxkTm9kZSwga2luZCwgdGV4dCk7XG4gIH0pO1xuXG4gIHJldHVybiBmb3VuZE5vZGU7XG59XG5cbi8qKlxuICogSGVscGVyIGZvciBzb3J0aW5nIG5vZGVzLlxuICogQHJldHVybiBmdW5jdGlvbiB0byBzb3J0IG5vZGVzIGluIGluY3JlYXNpbmcgb3JkZXIgb2YgcG9zaXRpb24gaW4gc291cmNlRmlsZVxuICovXG5mdW5jdGlvbiBub2Rlc0J5UG9zaXRpb24oZmlyc3Q6IHRzLk5vZGUsIHNlY29uZDogdHMuTm9kZSk6IG51bWJlciB7XG4gIHJldHVybiBmaXJzdC5nZXRTdGFydCgpIC0gc2Vjb25kLmdldFN0YXJ0KCk7XG59XG5cbi8qKlxuICogSW5zZXJ0IGB0b0luc2VydGAgYWZ0ZXIgdGhlIGxhc3Qgb2NjdXJlbmNlIG9mIGB0cy5TeW50YXhLaW5kW25vZGVzW2ldLmtpbmRdYFxuICogb3IgYWZ0ZXIgdGhlIGxhc3Qgb2Ygb2NjdXJlbmNlIG9mIGBzeW50YXhLaW5kYCBpZiB0aGUgbGFzdCBvY2N1cmVuY2UgaXMgYSBzdWIgY2hpbGRcbiAqIG9mIHRzLlN5bnRheEtpbmRbbm9kZXNbaV0ua2luZF0gYW5kIHNhdmUgdGhlIGNoYW5nZXMgaW4gZmlsZS5cbiAqXG4gKiBAcGFyYW0gbm9kZXMgaW5zZXJ0IGFmdGVyIHRoZSBsYXN0IG9jY3VyZW5jZSBvZiBub2Rlc1xuICogQHBhcmFtIHRvSW5zZXJ0IHN0cmluZyB0byBpbnNlcnRcbiAqIEBwYXJhbSBmaWxlIGZpbGUgdG8gaW5zZXJ0IGNoYW5nZXMgaW50b1xuICogQHBhcmFtIGZhbGxiYWNrUG9zIHBvc2l0aW9uIHRvIGluc2VydCBpZiB0b0luc2VydCBoYXBwZW5zIHRvIGJlIHRoZSBmaXJzdCBvY2N1cmVuY2VcbiAqIEBwYXJhbSBzeW50YXhLaW5kIHRoZSB0cy5TeW50YXhLaW5kIG9mIHRoZSBzdWJjaGlsZHJlbiB0byBpbnNlcnQgYWZ0ZXJcbiAqIEByZXR1cm4gQ2hhbmdlIGluc3RhbmNlXG4gKiBAdGhyb3cgRXJyb3IgaWYgdG9JbnNlcnQgaXMgZmlyc3Qgb2NjdXJlbmNlIGJ1dCBmYWxsIGJhY2sgaXMgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0QWZ0ZXJMYXN0T2NjdXJyZW5jZShcbiAgbm9kZXM6IHRzLk5vZGVbXSxcbiAgdG9JbnNlcnQ6IHN0cmluZyxcbiAgZmlsZTogc3RyaW5nLFxuICBmYWxsYmFja1BvczogbnVtYmVyLFxuICBzeW50YXhLaW5kPzogdHMuU3ludGF4S2luZCxcbik6IENoYW5nZSB7XG4gIGxldCBsYXN0SXRlbTogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgaWYgKCFsYXN0SXRlbSB8fCBsYXN0SXRlbS5nZXRTdGFydCgpIDwgbm9kZS5nZXRTdGFydCgpKSB7XG4gICAgICBsYXN0SXRlbSA9IG5vZGU7XG4gICAgfVxuICB9XG4gIGlmIChzeW50YXhLaW5kICYmIGxhc3RJdGVtKSB7XG4gICAgbGFzdEl0ZW0gPSBmaW5kTm9kZXMobGFzdEl0ZW0sIHN5bnRheEtpbmQpLnNvcnQobm9kZXNCeVBvc2l0aW9uKS5wb3AoKTtcbiAgfVxuICBpZiAoIWxhc3RJdGVtICYmIGZhbGxiYWNrUG9zID09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgdHJpZWQgdG8gaW5zZXJ0ICR7dG9JbnNlcnR9IGFzIGZpcnN0IG9jY3VyZW5jZSB3aXRoIG5vIGZhbGxiYWNrIHBvc2l0aW9uYCk7XG4gIH1cbiAgY29uc3QgbGFzdEl0ZW1Qb3NpdGlvbjogbnVtYmVyID0gbGFzdEl0ZW0gPyBsYXN0SXRlbS5nZXRFbmQoKSA6IGZhbGxiYWNrUG9zO1xuXG4gIHJldHVybiBuZXcgSW5zZXJ0Q2hhbmdlKGZpbGUsIGxhc3RJdGVtUG9zaXRpb24sIHRvSW5zZXJ0KTtcbn1cblxuZnVuY3Rpb24gX2FuZ3VsYXJJbXBvcnRzRnJvbU5vZGUobm9kZTogdHMuSW1wb3J0RGVjbGFyYXRpb24pOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfSB7XG4gIGNvbnN0IG1zID0gbm9kZS5tb2R1bGVTcGVjaWZpZXI7XG4gIGxldCBtb2R1bGVQYXRoOiBzdHJpbmc7XG4gIHN3aXRjaCAobXMua2luZCkge1xuICAgIGNhc2UgdHMuU3ludGF4S2luZC5TdHJpbmdMaXRlcmFsOlxuICAgICAgbW9kdWxlUGF0aCA9IChtcyBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGlmICghbW9kdWxlUGF0aC5zdGFydHNXaXRoKCdAYW5ndWxhci8nKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGlmIChub2RlLmltcG9ydENsYXVzZSkge1xuICAgIGlmIChub2RlLmltcG9ydENsYXVzZS5uYW1lKSB7XG4gICAgICAvLyBUaGlzIGlzIG9mIHRoZSBmb3JtIGBpbXBvcnQgTmFtZSBmcm9tICdwYXRoJ2AuIElnbm9yZS5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9IGVsc2UgaWYgKG5vZGUuaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MpIHtcbiAgICAgIGNvbnN0IG5iID0gbm9kZS5pbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncztcbiAgICAgIGlmIChuYi5raW5kID09IHRzLlN5bnRheEtpbmQuTmFtZXNwYWNlSW1wb3J0KSB7XG4gICAgICAgIC8vIFRoaXMgaXMgb2YgdGhlIGZvcm0gYGltcG9ydCAqIGFzIG5hbWUgZnJvbSAncGF0aCdgLiBSZXR1cm4gYG5hbWUuYC5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBbbmIubmFtZS50ZXh0ICsgJy4nXTogbW9kdWxlUGF0aCxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgaXMgb2YgdGhlIGZvcm0gYGltcG9ydCB7YSxiLGN9IGZyb20gJ3BhdGgnYFxuICAgICAgICBjb25zdCBuYW1lZEltcG9ydHMgPSBuYjtcblxuICAgICAgICByZXR1cm4gbmFtZWRJbXBvcnRzLmVsZW1lbnRzXG4gICAgICAgICAgLm1hcCgoaXM6IHRzLkltcG9ydFNwZWNpZmllcikgPT4gKGlzLnByb3BlcnR5TmFtZSA/IGlzLnByb3BlcnR5TmFtZS50ZXh0IDogaXMubmFtZS50ZXh0KSlcbiAgICAgICAgICAucmVkdWNlKChhY2M6IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB9LCBjdXJyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGFjY1tjdXJyXSA9IG1vZHVsZVBhdGg7XG5cbiAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgfSwge30pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7fTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIG9mIHRoZSBmb3JtIGBpbXBvcnQgJ3BhdGgnO2AuIE5vdGhpbmcgdG8gZG8uXG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWNvcmF0b3JNZXRhZGF0YShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBpZGVudGlmaWVyOiBzdHJpbmcsXG4gIG1vZHVsZTogc3RyaW5nLFxuKTogdHMuTm9kZVtdIHtcbiAgY29uc3QgYW5ndWxhckltcG9ydHMgPSBmaW5kTm9kZXMoc291cmNlLCB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5tYXAoKG5vZGUpID0+IF9hbmd1bGFySW1wb3J0c0Zyb21Ob2RlKG5vZGUpKVxuICAgIC5yZWR1Y2UoKGFjYywgY3VycmVudCkgPT4ge1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY3VycmVudCkpIHtcbiAgICAgICAgYWNjW2tleV0gPSBjdXJyZW50W2tleV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuXG4gIHJldHVybiBnZXRTb3VyY2VOb2Rlcyhzb3VyY2UpXG4gICAgLmZpbHRlcigobm9kZSkgPT4ge1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgbm9kZS5raW5kID09IHRzLlN5bnRheEtpbmQuRGVjb3JhdG9yICYmXG4gICAgICAgIChub2RlIGFzIHRzLkRlY29yYXRvcikuZXhwcmVzc2lvbi5raW5kID09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb25cbiAgICAgICk7XG4gICAgfSlcbiAgICAubWFwKChub2RlKSA9PiAobm9kZSBhcyB0cy5EZWNvcmF0b3IpLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb24pXG4gICAgLmZpbHRlcigoZXhwcikgPT4ge1xuICAgICAgaWYgKGV4cHIuZXhwcmVzc2lvbi5raW5kID09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICBjb25zdCBpZCA9IGV4cHIuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyO1xuXG4gICAgICAgIHJldHVybiBpZC50ZXh0ID09IGlkZW50aWZpZXIgJiYgYW5ndWxhckltcG9ydHNbaWQudGV4dF0gPT09IG1vZHVsZTtcbiAgICAgIH0gZWxzZSBpZiAoZXhwci5leHByZXNzaW9uLmtpbmQgPT0gdHMuU3ludGF4S2luZC5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pIHtcbiAgICAgICAgLy8gVGhpcyBjb3ZlcnMgZm9vLk5nTW9kdWxlIHdoZW4gaW1wb3J0aW5nICogYXMgZm9vLlxuICAgICAgICBjb25zdCBwYUV4cHIgPSBleHByLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uO1xuICAgICAgICAvLyBJZiB0aGUgbGVmdCBleHByZXNzaW9uIGlzIG5vdCBhbiBpZGVudGlmaWVyLCBqdXN0IGdpdmUgdXAgYXQgdGhhdCBwb2ludC5cbiAgICAgICAgaWYgKHBhRXhwci5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlkID0gcGFFeHByLm5hbWUudGV4dDtcbiAgICAgICAgY29uc3QgbW9kdWxlSWQgPSAocGFFeHByLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dDtcblxuICAgICAgICByZXR1cm4gaWQgPT09IGlkZW50aWZpZXIgJiYgYW5ndWxhckltcG9ydHNbbW9kdWxlSWQgKyAnLiddID09PSBtb2R1bGU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KVxuICAgIC5maWx0ZXIoXG4gICAgICAoZXhwcikgPT5cbiAgICAgICAgZXhwci5hcmd1bWVudHNbMF0gJiYgZXhwci5hcmd1bWVudHNbMF0ua2luZCA9PSB0cy5TeW50YXhLaW5kLk9iamVjdExpdGVyYWxFeHByZXNzaW9uLFxuICAgIClcbiAgICAubWFwKChleHByKSA9PiBleHByLmFyZ3VtZW50c1swXSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRhZGF0YUZpZWxkKFxuICBub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbixcbiAgbWV0YWRhdGFGaWVsZDogc3RyaW5nLFxuKTogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRbXSB7XG4gIHJldHVybiAoXG4gICAgbm9kZS5wcm9wZXJ0aWVzXG4gICAgICAuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgICAgLy8gRmlsdGVyIG91dCBldmVyeSBmaWVsZHMgdGhhdCdzIG5vdCBcIm1ldGFkYXRhRmllbGRcIi4gQWxzbyBoYW5kbGVzIHN0cmluZyBsaXRlcmFsc1xuICAgICAgLy8gKGJ1dCBub3QgZXhwcmVzc2lvbnMpLlxuICAgICAgLmZpbHRlcigoeyBuYW1lIH0pID0+IHtcbiAgICAgICAgcmV0dXJuICh0cy5pc0lkZW50aWZpZXIobmFtZSkgfHwgdHMuaXNTdHJpbmdMaXRlcmFsKG5hbWUpKSAmJiBuYW1lLnRleHQgPT09IG1ldGFkYXRhRmllbGQ7XG4gICAgICB9KVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIG5nTW9kdWxlUGF0aDogc3RyaW5nLFxuICBtZXRhZGF0YUZpZWxkOiBzdHJpbmcsXG4gIHN5bWJvbE5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGwsXG4pOiBDaGFuZ2VbXSB7XG4gIGNvbnN0IG5vZGVzID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEoc291cmNlLCAnTmdNb2R1bGUnLCAnQGFuZ3VsYXIvY29yZScpO1xuICBsZXQgbm9kZTogYW55ID0gbm9kZXNbMF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gIC8vIEZpbmQgdGhlIGRlY29yYXRvciBkZWNsYXJhdGlvbi5cbiAgaWYgKCFub2RlKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLy8gR2V0IGFsbCB0aGUgY2hpbGRyZW4gcHJvcGVydHkgYXNzaWdubWVudCBvZiBvYmplY3QgbGl0ZXJhbHMuXG4gIGNvbnN0IG1hdGNoaW5nUHJvcGVydGllcyA9IGdldE1ldGFkYXRhRmllbGQobm9kZSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiwgbWV0YWRhdGFGaWVsZCk7XG5cbiAgaWYgKG1hdGNoaW5nUHJvcGVydGllcy5sZW5ndGggPT0gMCkge1xuICAgIC8vIFdlIGhhdmVuJ3QgZm91bmQgdGhlIGZpZWxkIGluIHRoZSBtZXRhZGF0YSBkZWNsYXJhdGlvbi4gSW5zZXJ0IGEgbmV3IGZpZWxkLlxuICAgIGNvbnN0IGV4cHIgPSBub2RlIGFzIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uO1xuICAgIGxldCBwb3NpdGlvbjogbnVtYmVyO1xuICAgIGxldCB0b0luc2VydDogc3RyaW5nO1xuICAgIGlmIChleHByLnByb3BlcnRpZXMubGVuZ3RoID09IDApIHtcbiAgICAgIHBvc2l0aW9uID0gZXhwci5nZXRFbmQoKSAtIDE7XG4gICAgICB0b0luc2VydCA9IGBcXG4gICR7bWV0YWRhdGFGaWVsZH06IFtcXG4ke3RhZ3MuaW5kZW50QnkoNClgJHtzeW1ib2xOYW1lfWB9XFxuICBdXFxuYDtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IGV4cHIucHJvcGVydGllc1tleHByLnByb3BlcnRpZXMubGVuZ3RoIC0gMV07XG4gICAgICBwb3NpdGlvbiA9IG5vZGUuZ2V0RW5kKCk7XG4gICAgICAvLyBHZXQgdGhlIGluZGVudGF0aW9uIG9mIHRoZSBsYXN0IGVsZW1lbnQsIGlmIGFueS5cbiAgICAgIGNvbnN0IHRleHQgPSBub2RlLmdldEZ1bGxUZXh0KHNvdXJjZSk7XG4gICAgICBjb25zdCBtYXRjaGVzID0gdGV4dC5tYXRjaCgvXihcXHI/XFxuKShcXHMqKS8pO1xuICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgdG9JbnNlcnQgPVxuICAgICAgICAgIGAsJHttYXRjaGVzWzBdfSR7bWV0YWRhdGFGaWVsZH06IFske21hdGNoZXNbMV19YCArXG4gICAgICAgICAgYCR7dGFncy5pbmRlbnRCeShtYXRjaGVzWzJdLmxlbmd0aCArIDIpYCR7c3ltYm9sTmFtZX1gfSR7bWF0Y2hlc1swXX1dYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvSW5zZXJ0ID0gYCwgJHttZXRhZGF0YUZpZWxkfTogWyR7c3ltYm9sTmFtZX1dYDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGltcG9ydFBhdGggIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIG5ldyBJbnNlcnRDaGFuZ2UobmdNb2R1bGVQYXRoLCBwb3NpdGlvbiwgdG9JbnNlcnQpLFxuICAgICAgICBpbnNlcnRJbXBvcnQoc291cmNlLCBuZ01vZHVsZVBhdGgsIHN5bWJvbE5hbWUucmVwbGFjZSgvXFwuLiokLywgJycpLCBpbXBvcnRQYXRoKSxcbiAgICAgIF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbbmV3IEluc2VydENoYW5nZShuZ01vZHVsZVBhdGgsIHBvc2l0aW9uLCB0b0luc2VydCldO1xuICAgIH1cbiAgfVxuICBjb25zdCBhc3NpZ25tZW50ID0gbWF0Y2hpbmdQcm9wZXJ0aWVzWzBdIGFzIHRzLlByb3BlcnR5QXNzaWdubWVudDtcblxuICAvLyBJZiBpdCdzIG5vdCBhbiBhcnJheSwgbm90aGluZyB3ZSBjYW4gZG8gcmVhbGx5LlxuICBpZiAoYXNzaWdubWVudC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24pIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBhcnJMaXRlcmFsID0gYXNzaWdubWVudC5pbml0aWFsaXplciBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uO1xuICBpZiAoYXJyTGl0ZXJhbC5lbGVtZW50cy5sZW5ndGggPT0gMCkge1xuICAgIC8vIEZvcndhcmQgdGhlIHByb3BlcnR5LlxuICAgIG5vZGUgPSBhcnJMaXRlcmFsO1xuICB9IGVsc2Uge1xuICAgIG5vZGUgPSBhcnJMaXRlcmFsLmVsZW1lbnRzO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkobm9kZSkpIHtcbiAgICBjb25zdCBub2RlQXJyYXkgPSAobm9kZSBhcyB7fSkgYXMgQXJyYXk8dHMuTm9kZT47XG4gICAgY29uc3Qgc3ltYm9sc0FycmF5ID0gbm9kZUFycmF5Lm1hcCgobm9kZSkgPT4gdGFncy5vbmVMaW5lYCR7bm9kZS5nZXRUZXh0KCl9YCk7XG4gICAgaWYgKHN5bWJvbHNBcnJheS5pbmNsdWRlcyh0YWdzLm9uZUxpbmVgJHtzeW1ib2xOYW1lfWApKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgbm9kZSA9IG5vZGVbbm9kZS5sZW5ndGggLSAxXTtcbiAgfVxuXG4gIGxldCB0b0luc2VydDogc3RyaW5nO1xuICBsZXQgcG9zaXRpb24gPSBub2RlLmdldEVuZCgpO1xuICBpZiAobm9kZS5raW5kID09IHRzLlN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuICAgIC8vIFdlIGZvdW5kIHRoZSBmaWVsZCBidXQgaXQncyBlbXB0eS4gSW5zZXJ0IGl0IGp1c3QgYmVmb3JlIHRoZSBgXWAuXG4gICAgcG9zaXRpb24tLTtcbiAgICB0b0luc2VydCA9IGBcXG4ke3RhZ3MuaW5kZW50QnkoNClgJHtzeW1ib2xOYW1lfWB9XFxuICBgO1xuICB9IGVsc2Uge1xuICAgIC8vIEdldCB0aGUgaW5kZW50YXRpb24gb2YgdGhlIGxhc3QgZWxlbWVudCwgaWYgYW55LlxuICAgIGNvbnN0IHRleHQgPSBub2RlLmdldEZ1bGxUZXh0KHNvdXJjZSk7XG4gICAgY29uc3QgbWF0Y2hlcyA9IHRleHQubWF0Y2goL14oXFxyP1xcbikoXFxzKikvKTtcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgdG9JbnNlcnQgPSBgLCR7bWF0Y2hlc1sxXX0ke3RhZ3MuaW5kZW50QnkobWF0Y2hlc1syXS5sZW5ndGgpYCR7c3ltYm9sTmFtZX1gfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvSW5zZXJ0ID0gYCwgJHtzeW1ib2xOYW1lfWA7XG4gICAgfVxuICB9XG4gIGlmIChpbXBvcnRQYXRoICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIG5ldyBJbnNlcnRDaGFuZ2UobmdNb2R1bGVQYXRoLCBwb3NpdGlvbiwgdG9JbnNlcnQpLFxuICAgICAgaW5zZXJ0SW1wb3J0KHNvdXJjZSwgbmdNb2R1bGVQYXRoLCBzeW1ib2xOYW1lLnJlcGxhY2UoL1xcLi4qJC8sICcnKSwgaW1wb3J0UGF0aCksXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiBbbmV3IEluc2VydENoYW5nZShuZ01vZHVsZVBhdGgsIHBvc2l0aW9uLCB0b0luc2VydCldO1xufVxuXG4vKipcbiAqIEN1c3RvbSBmdW5jdGlvbiB0byBpbnNlcnQgYSBkZWNsYXJhdGlvbiAoY29tcG9uZW50LCBwaXBlLCBkaXJlY3RpdmUpXG4gKiBpbnRvIE5nTW9kdWxlIGRlY2xhcmF0aW9ucy4gSXQgYWxzbyBpbXBvcnRzIHRoZSBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGREZWNsYXJhdGlvblRvTW9kdWxlKFxuICBzb3VyY2U6IHRzLlNvdXJjZUZpbGUsXG4gIG1vZHVsZVBhdGg6IHN0cmluZyxcbiAgY2xhc3NpZmllZE5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nLFxuKTogQ2hhbmdlW10ge1xuICByZXR1cm4gYWRkU3ltYm9sVG9OZ01vZHVsZU1ldGFkYXRhKFxuICAgIHNvdXJjZSxcbiAgICBtb2R1bGVQYXRoLFxuICAgICdkZWNsYXJhdGlvbnMnLFxuICAgIGNsYXNzaWZpZWROYW1lLFxuICAgIGltcG9ydFBhdGgsXG4gICk7XG59XG5cbi8qKlxuICogQ3VzdG9tIGZ1bmN0aW9uIHRvIGluc2VydCBhbiBOZ01vZHVsZSBpbnRvIE5nTW9kdWxlIGltcG9ydHMuIEl0IGFsc28gaW1wb3J0cyB0aGUgbW9kdWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkSW1wb3J0VG9Nb2R1bGUoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlUGF0aDogc3RyaW5nLFxuICBjbGFzc2lmaWVkTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcsXG4pOiBDaGFuZ2VbXSB7XG4gIHJldHVybiBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoc291cmNlLCBtb2R1bGVQYXRoLCAnaW1wb3J0cycsIGNsYXNzaWZpZWROYW1lLCBpbXBvcnRQYXRoKTtcbn1cblxuLyoqXG4gKiBDdXN0b20gZnVuY3Rpb24gdG8gaW5zZXJ0IGEgcHJvdmlkZXIgaW50byBOZ01vZHVsZS4gSXQgYWxzbyBpbXBvcnRzIGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkUHJvdmlkZXJUb01vZHVsZShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4gIGNsYXNzaWZpZWROYW1lOiBzdHJpbmcsXG4gIGltcG9ydFBhdGg6IHN0cmluZyxcbik6IENoYW5nZVtdIHtcbiAgcmV0dXJuIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShzb3VyY2UsIG1vZHVsZVBhdGgsICdwcm92aWRlcnMnLCBjbGFzc2lmaWVkTmFtZSwgaW1wb3J0UGF0aCk7XG59XG5cbi8qKlxuICogQ3VzdG9tIGZ1bmN0aW9uIHRvIGluc2VydCBhbiBleHBvcnQgaW50byBOZ01vZHVsZS4gSXQgYWxzbyBpbXBvcnRzIGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkRXhwb3J0VG9Nb2R1bGUoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgbW9kdWxlUGF0aDogc3RyaW5nLFxuICBjbGFzc2lmaWVkTmFtZTogc3RyaW5nLFxuICBpbXBvcnRQYXRoOiBzdHJpbmcsXG4pOiBDaGFuZ2VbXSB7XG4gIHJldHVybiBhZGRTeW1ib2xUb05nTW9kdWxlTWV0YWRhdGEoc291cmNlLCBtb2R1bGVQYXRoLCAnZXhwb3J0cycsIGNsYXNzaWZpZWROYW1lLCBpbXBvcnRQYXRoKTtcbn1cblxuLyoqXG4gKiBDdXN0b20gZnVuY3Rpb24gdG8gaW5zZXJ0IGFuIGV4cG9ydCBpbnRvIE5nTW9kdWxlLiBJdCBhbHNvIGltcG9ydHMgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRCb290c3RyYXBUb01vZHVsZShcbiAgc291cmNlOiB0cy5Tb3VyY2VGaWxlLFxuICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4gIGNsYXNzaWZpZWROYW1lOiBzdHJpbmcsXG4gIGltcG9ydFBhdGg6IHN0cmluZyxcbik6IENoYW5nZVtdIHtcbiAgcmV0dXJuIGFkZFN5bWJvbFRvTmdNb2R1bGVNZXRhZGF0YShzb3VyY2UsIG1vZHVsZVBhdGgsICdib290c3RyYXAnLCBjbGFzc2lmaWVkTmFtZSwgaW1wb3J0UGF0aCk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGFuIGltcG9ydCBhbHJlYWR5IGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW1wb3J0ZWQoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgY2xhc3NpZmllZE5hbWU6IHN0cmluZyxcbiAgaW1wb3J0UGF0aDogc3RyaW5nLFxuKTogYm9vbGVhbiB7XG4gIGNvbnN0IGFsbE5vZGVzID0gZ2V0U291cmNlTm9kZXMoc291cmNlKTtcbiAgY29uc3QgbWF0Y2hpbmdOb2RlcyA9IGFsbE5vZGVzXG4gICAgLmZpbHRlcih0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5maWx0ZXIoXG4gICAgICAoaW1wKSA9PiB0cy5pc1N0cmluZ0xpdGVyYWwoaW1wLm1vZHVsZVNwZWNpZmllcikgJiYgaW1wLm1vZHVsZVNwZWNpZmllci50ZXh0ID09PSBpbXBvcnRQYXRoLFxuICAgIClcbiAgICAuZmlsdGVyKChpbXApID0+IHtcbiAgICAgIGlmICghaW1wLmltcG9ydENsYXVzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBub2RlcyA9IGZpbmROb2RlcyhpbXAuaW1wb3J0Q2xhdXNlLCB0cy5pc0ltcG9ydFNwZWNpZmllcikuZmlsdGVyKFxuICAgICAgICAobikgPT4gbi5nZXRUZXh0KCkgPT09IGNsYXNzaWZpZWROYW1lLFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIG5vZGVzLmxlbmd0aCA+IDA7XG4gICAgfSk7XG5cbiAgcmV0dXJuIG1hdGNoaW5nTm9kZXMubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIG5hbWUgb2YgdGhlIGVudmlyb25tZW50IGV4cG9ydFxuICogd2hldGhlciB0aGlzIGV4cG9ydCBpcyBhbGlhc2VkIG9yIG5vdC4gSWYgdGhlIGVudmlyb25tZW50IGZpbGVcbiAqIGlzIG5vdCBpbXBvcnRlZCwgdGhlbiBpdCB3aWxsIHJldHVybiBgbnVsbGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudEV4cG9ydE5hbWUoc291cmNlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nIHwgbnVsbCB7XG4gIC8vIEluaXRpYWwgdmFsdWUgaXMgYG51bGxgIGFzIHdlIGRvbid0IGtub3cgeWV0IGlmIHRoZSB1c2VyXG4gIC8vIGhhcyBpbXBvcnRlZCBgZW52aXJvbm1lbnRgIGludG8gdGhlIHJvb3QgbW9kdWxlIG9yIG5vdC5cbiAgbGV0IGVudmlyb25tZW50RXhwb3J0TmFtZTogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgY29uc3QgYWxsTm9kZXMgPSBnZXRTb3VyY2VOb2Rlcyhzb3VyY2UpO1xuXG4gIGFsbE5vZGVzXG4gICAgLmZpbHRlcih0cy5pc0ltcG9ydERlY2xhcmF0aW9uKVxuICAgIC5maWx0ZXIoXG4gICAgICAoZGVjbGFyYXRpb24pID0+XG4gICAgICAgIGRlY2xhcmF0aW9uLm1vZHVsZVNwZWNpZmllci5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwgJiZcbiAgICAgICAgZGVjbGFyYXRpb24uaW1wb3J0Q2xhdXNlICE9PSB1bmRlZmluZWQsXG4gICAgKVxuICAgIC5tYXAoKGRlY2xhcmF0aW9uKSA9PlxuICAgICAgLy8gSWYgYGltcG9ydENsYXVzZWAgcHJvcGVydHkgaXMgZGVmaW5lZCB0aGVuIHRoZSBmaXJzdFxuICAgICAgLy8gY2hpbGQgd2lsbCBiZSBgTmFtZWRJbXBvcnRzYCBvYmplY3QgKG9yIGBuYW1lZEJpbmRpbmdzYCkuXG4gICAgICAoZGVjbGFyYXRpb24uaW1wb3J0Q2xhdXNlIGFzIHRzLkltcG9ydENsYXVzZSkuZ2V0Q2hpbGRBdCgwKSxcbiAgICApXG4gICAgLy8gRmluZCB0aG9zZSBgTmFtZWRJbXBvcnRzYCBvYmplY3QgdGhhdCBjb250YWlucyBgZW52aXJvbm1lbnRgIGtleXdvcmRcbiAgICAvLyBpbiBpdHMgdGV4dC4gRS5nLiBgeyBlbnZpcm9ubWVudCBhcyBlbnYgfWAuXG4gICAgLmZpbHRlcih0cy5pc05hbWVkSW1wb3J0cylcbiAgICAuZmlsdGVyKChuYW1lZEltcG9ydHMpID0+IG5hbWVkSW1wb3J0cy5nZXRUZXh0KCkuaW5jbHVkZXMoJ2Vudmlyb25tZW50JykpXG4gICAgLmZvckVhY2goKG5hbWVkSW1wb3J0cykgPT4ge1xuICAgICAgZm9yIChjb25zdCBzcGVjaWZpZXIgb2YgbmFtZWRJbXBvcnRzLmVsZW1lbnRzKSB7XG4gICAgICAgIC8vIGBwcm9wZXJ0eU5hbWVgIGlzIGRlZmluZWQgaWYgdGhlIHNwZWNpZmllclxuICAgICAgICAvLyBoYXMgYW4gYWxpYXNlZCBpbXBvcnQuXG4gICAgICAgIGNvbnN0IG5hbWUgPSBzcGVjaWZpZXIucHJvcGVydHlOYW1lIHx8IHNwZWNpZmllci5uYW1lO1xuXG4gICAgICAgIC8vIEZpbmQgc3BlY2lmaWVyIHRoYXQgY29udGFpbnMgYGVudmlyb25tZW50YCBrZXl3b3JkIGluIGl0cyB0ZXh0LlxuICAgICAgICAvLyBXaGV0aGVyIGl0J3MgYGVudmlyb25tZW50YCBvciBgZW52aXJvbm1lbnQgYXMgZW52YC5cbiAgICAgICAgaWYgKG5hbWUudGV4dC5pbmNsdWRlcygnZW52aXJvbm1lbnQnKSkge1xuICAgICAgICAgIGVudmlyb25tZW50RXhwb3J0TmFtZSA9IHNwZWNpZmllci5uYW1lLnRleHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICByZXR1cm4gZW52aXJvbm1lbnRFeHBvcnROYW1lO1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIFJvdXRlck1vZHVsZSBkZWNsYXJhdGlvbiBmcm9tIE5nTW9kdWxlIG1ldGFkYXRhLCBpZiBhbnkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb3V0ZXJNb2R1bGVEZWNsYXJhdGlvbihzb3VyY2U6IHRzLlNvdXJjZUZpbGUpOiB0cy5FeHByZXNzaW9uIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgcmVzdWx0ID0gZ2V0RGVjb3JhdG9yTWV0YWRhdGEoc291cmNlLCAnTmdNb2R1bGUnLCAnQGFuZ3VsYXIvY29yZScpO1xuICBjb25zdCBub2RlID0gcmVzdWx0WzBdIGFzIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uO1xuICBjb25zdCBtYXRjaGluZ1Byb3BlcnRpZXMgPSBnZXRNZXRhZGF0YUZpZWxkKG5vZGUsICdpbXBvcnRzJyk7XG5cbiAgaWYgKCFtYXRjaGluZ1Byb3BlcnRpZXMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBhc3NpZ25tZW50ID0gbWF0Y2hpbmdQcm9wZXJ0aWVzWzBdIGFzIHRzLlByb3BlcnR5QXNzaWdubWVudDtcblxuICBpZiAoYXNzaWdubWVudC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24pIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBhcnJMaXRlcmFsID0gYXNzaWdubWVudC5pbml0aWFsaXplciBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uO1xuXG4gIHJldHVybiBhcnJMaXRlcmFsLmVsZW1lbnRzXG4gICAgLmZpbHRlcigoZWwpID0+IGVsLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pXG4gICAgLmZpbmQoKGVsKSA9PiAoZWwgYXMgdHMuSWRlbnRpZmllcikuZ2V0VGV4dCgpLnN0YXJ0c1dpdGgoJ1JvdXRlck1vZHVsZScpKTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgbmV3IHJvdXRlIGRlY2xhcmF0aW9uIHRvIGEgcm91dGVyIG1vZHVsZSAoaS5lLiBoYXMgYSBSb3V0ZXJNb2R1bGUgZGVjbGFyYXRpb24pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRSb3V0ZURlY2xhcmF0aW9uVG9Nb2R1bGUoXG4gIHNvdXJjZTogdHMuU291cmNlRmlsZSxcbiAgZmlsZVRvQWRkOiBzdHJpbmcsXG4gIHJvdXRlTGl0ZXJhbDogc3RyaW5nLFxuKTogQ2hhbmdlIHtcbiAgY29uc3Qgcm91dGVyTW9kdWxlRXhwciA9IGdldFJvdXRlck1vZHVsZURlY2xhcmF0aW9uKHNvdXJjZSk7XG4gIGlmICghcm91dGVyTW9kdWxlRXhwcikge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGRuJ3QgZmluZCBhIHJvdXRlIGRlY2xhcmF0aW9uIGluICR7ZmlsZVRvQWRkfS5gKTtcbiAgfVxuICBjb25zdCBzY29wZUNvbmZpZ01ldGhvZEFyZ3MgPSAocm91dGVyTW9kdWxlRXhwciBhcyB0cy5DYWxsRXhwcmVzc2lvbikuYXJndW1lbnRzO1xuICBpZiAoIXNjb3BlQ29uZmlnTWV0aG9kQXJncy5sZW5ndGgpIHtcbiAgICBjb25zdCB7IGxpbmUgfSA9IHNvdXJjZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihyb3V0ZXJNb2R1bGVFeHByLmdldFN0YXJ0KCkpO1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgcm91dGVyIG1vZHVsZSBtZXRob2QgZG9lc24ndCBoYXZlIGFyZ3VtZW50cyBgICsgYGF0IGxpbmUgJHtsaW5lfSBpbiAke2ZpbGVUb0FkZH1gLFxuICAgICk7XG4gIH1cblxuICBsZXQgcm91dGVzQXJyOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uIHwgdW5kZWZpbmVkO1xuICBjb25zdCByb3V0ZXNBcmcgPSBzY29wZUNvbmZpZ01ldGhvZEFyZ3NbMF07XG5cbiAgLy8gQ2hlY2sgaWYgdGhlIHJvdXRlIGRlY2xhcmF0aW9ucyBhcnJheSBpc1xuICAvLyBhbiBpbmxpbmVkIGFyZ3VtZW50IG9mIFJvdXRlck1vZHVsZSBvciBhIHN0YW5kYWxvbmUgdmFyaWFibGVcbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihyb3V0ZXNBcmcpKSB7XG4gICAgcm91dGVzQXJyID0gcm91dGVzQXJnO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJvdXRlc1Zhck5hbWUgPSByb3V0ZXNBcmcuZ2V0VGV4dCgpO1xuICAgIGxldCByb3V0ZXNWYXI7XG4gICAgaWYgKHJvdXRlc0FyZy5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgIHJvdXRlc1ZhciA9IHNvdXJjZS5zdGF0ZW1lbnRzLmZpbHRlcih0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KS5maW5kKCh2KSA9PiB7XG4gICAgICAgIHJldHVybiB2LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF0ubmFtZS5nZXRUZXh0KCkgPT09IHJvdXRlc1Zhck5hbWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXJvdXRlc1Zhcikge1xuICAgICAgY29uc3QgeyBsaW5lIH0gPSBzb3VyY2UuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24ocm91dGVzQXJnLmdldFN0YXJ0KCkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gcm91dGUgZGVjbGFyYXRpb24gYXJyYXkgd2FzIGZvdW5kIHRoYXQgY29ycmVzcG9uZHMgYCArXG4gICAgICAgICAgYHRvIHJvdXRlciBtb2R1bGUgYXQgbGluZSAke2xpbmV9IGluICR7ZmlsZVRvQWRkfWAsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJvdXRlc0FyciA9IGZpbmROb2RlcyhcbiAgICAgIHJvdXRlc1ZhcixcbiAgICAgIHRzLlN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbixcbiAgICAgIDEsXG4gICAgKVswXSBhcyB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uO1xuICB9XG5cbiAgY29uc3Qgb2NjdXJyZW5jZXNDb3VudCA9IHJvdXRlc0Fyci5lbGVtZW50cy5sZW5ndGg7XG4gIGNvbnN0IHRleHQgPSByb3V0ZXNBcnIuZ2V0RnVsbFRleHQoc291cmNlKTtcblxuICBsZXQgcm91dGU6IHN0cmluZyA9IHJvdXRlTGl0ZXJhbDtcbiAgbGV0IGluc2VydFBvcyA9IHJvdXRlc0Fyci5lbGVtZW50cy5wb3M7XG5cbiAgaWYgKG9jY3VycmVuY2VzQ291bnQgPiAwKSB7XG4gICAgY29uc3QgbGFzdFJvdXRlTGl0ZXJhbCA9IFsuLi5yb3V0ZXNBcnIuZWxlbWVudHNdLnBvcCgpIGFzIHRzLkV4cHJlc3Npb247XG4gICAgY29uc3QgbGFzdFJvdXRlSXNXaWxkY2FyZCA9XG4gICAgICB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGxhc3RSb3V0ZUxpdGVyYWwpICYmXG4gICAgICBsYXN0Um91dGVMaXRlcmFsLnByb3BlcnRpZXMuc29tZShcbiAgICAgICAgKG4pID0+XG4gICAgICAgICAgdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobikgJiZcbiAgICAgICAgICB0cy5pc0lkZW50aWZpZXIobi5uYW1lKSAmJlxuICAgICAgICAgIG4ubmFtZS50ZXh0ID09PSAncGF0aCcgJiZcbiAgICAgICAgICB0cy5pc1N0cmluZ0xpdGVyYWwobi5pbml0aWFsaXplcikgJiZcbiAgICAgICAgICBuLmluaXRpYWxpemVyLnRleHQgPT09ICcqKicsXG4gICAgICApO1xuXG4gICAgY29uc3QgaW5kZW50YXRpb24gPSB0ZXh0Lm1hdGNoKC9cXHI/XFxuKFxccj8pXFxzKi8pIHx8IFtdO1xuICAgIGNvbnN0IHJvdXRlVGV4dCA9IGAke2luZGVudGF0aW9uWzBdIHx8ICcgJ30ke3JvdXRlTGl0ZXJhbH1gO1xuXG4gICAgLy8gQWRkIHRoZSBuZXcgcm91dGUgYmVmb3JlIHRoZSB3aWxkY2FyZCByb3V0ZVxuICAgIC8vIG90aGVyd2lzZSB3ZSdsbCBhbHdheXMgcmVkaXJlY3QgdG8gdGhlIHdpbGRjYXJkIHJvdXRlXG4gICAgaWYgKGxhc3RSb3V0ZUlzV2lsZGNhcmQpIHtcbiAgICAgIGluc2VydFBvcyA9IGxhc3RSb3V0ZUxpdGVyYWwucG9zO1xuICAgICAgcm91dGUgPSBgJHtyb3V0ZVRleHR9LGA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGluc2VydFBvcyA9IGxhc3RSb3V0ZUxpdGVyYWwuZW5kO1xuICAgICAgcm91dGUgPSBgLCR7cm91dGVUZXh0fWA7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBJbnNlcnRDaGFuZ2UoZmlsZVRvQWRkLCBpbnNlcnRQb3MsIHJvdXRlKTtcbn1cbiJdfQ==